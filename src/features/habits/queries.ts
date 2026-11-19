import "server-only";
import { all, get, run } from "@/lib/db";
import { addDays, isoWeekday, lastNDays, today, utcToLocalDate } from "@/lib/dates";

export type HabitCategory = "nutrition" | "activity" | "recovery" | "wellbeing" | "custom";
export type SystemKey = "protein_goal" | "workout_completed" | "water" | "steps" | "sleep";

type HabitRow = {
  id: number;
  name: string;
  category: HabitCategory;
  type: "boolean" | "numeric";
  target_value: number | null;
  target_max: number | null;
  unit: string | null;
  days_of_week: string;
  system_key: SystemKey | null;
  sort_order: number;
  archived_at: string | null;
  created_at: string;
};

export type Habit = Omit<HabitRow, "days_of_week"> & { days: number[] };

export type HabitLog = {
  habit_id: number;
  log_date: string;
  value: number | null;
  completed: number;
};

const toHabit = (r: HabitRow): Habit => {
  const { days_of_week, ...rest } = r;
  return { ...rest, days: days_of_week.split(",").map(Number) };
};

export function listHabits(opts: { includeArchived?: boolean } = {}): Habit[] {
  const rows = all<HabitRow>(
    `SELECT * FROM habits ${opts.includeArchived ? "" : "WHERE archived_at IS NULL"} ORDER BY sort_order, id`,
  );
  return rows.map(toHabit);
}

export function getHabit(id: number): Habit | undefined {
  const r = get<HabitRow>("SELECT * FROM habits WHERE id = ?", id);
  return r && toHabit(r);
}

export function getHabitByKey(key: SystemKey): Habit | undefined {
  const r = get<HabitRow>("SELECT * FROM habits WHERE system_key = ? AND archived_at IS NULL", key);
  return r && toHabit(r);
}

/** Is this habit expected on this date? Respects weekday schedule and the habit's lifetime. */
export function isScheduled(h: Habit, date: string): boolean {
  if (!h.days.includes(isoWeekday(date))) return false;
  if (date < utcToLocalDate(h.created_at)) return false;
  if (h.archived_at && date >= utcToLocalDate(h.archived_at)) return false;
  return true;
}

export function isComplete(h: Pick<Habit, "type" | "target_value" | "target_max">, value: number | null, completed: boolean): boolean {
  if (h.type === "boolean") return completed;
  if (value == null || h.target_value == null) return false;
  return value >= h.target_value && (h.target_max == null || value <= h.target_max);
}

export function logsInRange(from: string, to: string): HabitLog[] {
  return all<HabitLog>("SELECT habit_id, log_date, value, completed FROM habit_logs WHERE log_date BETWEEN ? AND ?", from, to);
}

export type HabitDay = Habit & { value: number | null; done: boolean };

export function habitsForDate(date: string): HabitDay[] {
  const habits = listHabits({ includeArchived: true }).filter((h) => isScheduled(h, date));
  const logs = new Map(logsInRange(date, date).map((l) => [l.habit_id, l]));
  return habits.map((h) => {
    const l = logs.get(h.id);
    return { ...h, value: l?.value ?? null, done: !!l?.completed };
  });
}

/** Upsert a day's log. Completion is derived from the habit's rules and the target is snapshotted. */
export function saveLog(habit: Habit, date: string, input: { value?: number | null; completed?: boolean }): boolean {
  const value = habit.type === "numeric" ? (input.value ?? null) : null;
  const completed = habit.type === "numeric" ? isComplete(habit, value, false) : !!input.completed;
  if (habit.type === "numeric" && value == null) {
    run("DELETE FROM habit_logs WHERE habit_id = ? AND log_date = ?", habit.id, date);
    return false;
  }
  run(
    `INSERT INTO habit_logs (habit_id, log_date, value, target_snapshot, target_max_snapshot, completed)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT (habit_id, log_date) DO UPDATE SET
       value = excluded.value, target_snapshot = excluded.target_snapshot,
       target_max_snapshot = excluded.target_max_snapshot, completed = excluded.completed`,
    habit.id,
    date,
    value,
    habit.target_value,
    habit.target_max,
    completed ? 1 : 0,
  );
  return completed;
}

/** Used by nutrition / training actions to keep linked habits in sync. */
export function syncSystemHabit(key: SystemKey, date: string, completed: boolean): void {
  const h = getHabitByKey(key);
  if (!h || h.type !== "boolean") return;
  saveLog(h, date, { completed });
}

export type HabitStats = {
  streak: number;
  best: number;
  rate30: number | null;
};

/** Pure computation over scheduled days; today only counts against the streak once done. */
export function computeStats(h: Habit, logs: HabitLog[], end = today(), span = 120): HabitStats {
  const byDate = new Map(logs.filter((l) => l.habit_id === h.id).map((l) => [l.log_date, !!l.completed]));
  const days = lastNDays(span, end).filter((d) => isScheduled(h, d));

  let streak = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    const d = days[i];
    if (byDate.get(d)) streak++;
    else if (d === end) continue; // today not done yet: does not break the streak
    else break;
  }
  let best = 0;
  let cur = 0;
  for (const d of days) {
    if (byDate.get(d)) best = Math.max(best, ++cur);
    else cur = 0;
  }
  const last30 = days.filter((d) => d > addDays(end, -30) && d <= end);
  const rate30 = last30.length ? Math.round((last30.filter((d) => byDate.get(d)).length / last30.length) * 100) : null;
  return { streak, best, rate30 };
}

/** Completion percentage per day across all habits scheduled that day. */
export function dailyCompletion(dates: string[]): { date: string; scheduled: number; done: number; pct: number }[] {
  const habits = listHabits({ includeArchived: true });
  const logs = logsInRange(dates[0], dates[dates.length - 1]);
  const doneSet = new Set(logs.filter((l) => l.completed).map((l) => `${l.habit_id}|${l.log_date}`));
  return dates.map((date) => {
    const sched = habits.filter((h) => isScheduled(h, date));
    const done = sched.filter((h) => doneSet.has(`${h.id}|${date}`)).length;
    return { date, scheduled: sched.length, done, pct: sched.length ? Math.round((done / sched.length) * 100) : 0 };
  });
}

export function hasLogs(habitId: number): boolean {
  return !!get("SELECT 1 AS x FROM habit_logs WHERE habit_id = ? LIMIT 1", habitId);
}
