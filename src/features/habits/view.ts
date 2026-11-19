import "server-only";
import type { HabitItemData } from "@/components/habits/habit-item";
import { get } from "@/lib/db";
import { computeStats, getHabitByKey, habitsForDate, logsInRange, type HabitDay, type HabitStats, type SystemKey } from "./queries";
import { addDays } from "@/lib/dates";

export function systemHabitDay(key: SystemKey, date: string) {
  const habit = getHabitByKey(key);
  if (!habit) return null;
  const log = get<{ value: number | null; completed: number }>(
    "SELECT value, completed FROM habit_logs WHERE habit_id = ? AND log_date = ?",
    habit.id,
    date,
  );
  return { habit, value: log?.value ?? null, done: !!log?.completed };
}

const LOCKED: Record<string, string> = {
  protein_goal: "Se completa solo desde Nutrición",
  workout_completed: "Se completa solo al terminar un entrenamiento",
};

export type HabitViewItem = HabitItemData & { category: HabitDay["category"]; stats: HabitStats };

export function habitViewForDate(date: string): HabitViewItem[] {
  const day = habitsForDate(date);
  const logs = logsInRange(addDays(date, -130), date);
  return day.map((h) => {
    const stats = computeStats(h, logs, date);
    return {
      id: h.id,
      name: h.name,
      type: h.type,
      target_value: h.target_value,
      target_max: h.target_max,
      unit: h.unit,
      value: h.value,
      done: h.done,
      streak: stats.streak,
      locked: h.system_key ? LOCKED[h.system_key] : undefined,
      category: h.category,
      stats,
    };
  });
}
