import "server-only";
import { all } from "@/lib/db";
import { addDays, startOfWeek, today } from "@/lib/dates";

/**
 * Progreso por músculo y por grupo muscular a partir de las series de entrenamientos terminados
 * (las series de calentamiento no se cuentan).
 *
 * - Una serie cuenta como "principal" para un músculo si el ejercicio lo trabaja como principal,
 *   y como "accesoria" si lo trabaja como accesorio.
 * - Volumen = peso × repeticiones, solo de series donde el músculo es principal (las series
 *   accesorias se cuentan aparte para no inflar la carga real del músculo).
 * - Para un grupo, cada serie se cuenta una sola vez: principal si alguno de sus músculos del
 *   grupo es principal en ese ejercicio, y accesoria si no.
 */

export type Bucket = {
  primarySets: number;
  secondarySets: number;
  volume: number;
  maxWeight: number | null;
  lastDate: string | null;
};

export type WeekPoint = { weekStart: string; primary: number; secondary: number; volume: number; maxWeight: number | null };

export type ProgressEntry = {
  key: string;
  name: string;
  group: string;
  cur: Bucket;
  prev: Bucket;
  weekly: WeekPoint[];
};

export type Progress = {
  weekStarts: string[];
  from: string;
  to: string;
  muscles: ProgressEntry[];
  groups: ProgressEntry[];
  hasData: boolean;
};

type Row = {
  set_id: number;
  session_date: string;
  role: "primary" | "secondary";
  muscle_key: string;
  muscle_name: string;
  muscle_group: string;
  weight_kg: number;
  reps: number;
};

const emptyBucket = (): Bucket => ({ primarySets: 0, secondarySets: 0, volume: 0, maxWeight: null, lastDate: null });

function add(b: Bucket, role: Row["role"], weight: number, reps: number, date: string) {
  if (role === "primary") {
    b.primarySets++;
    b.volume += weight * reps;
    b.maxWeight = Math.max(b.maxWeight ?? 0, weight);
  } else {
    b.secondarySets++;
  }
  if (!b.lastDate || date > b.lastDate) b.lastDate = date;
}

export function weekStartsFor(weeks: number, end = today()): string[] {
  const last = startOfWeek(end);
  return Array.from({ length: weeks }, (_, i) => addDays(last, -7 * (weeks - 1 - i)));
}

export function muscleProgress(weeks: number): Progress {
  const weekStarts = weekStartsFor(weeks);
  const from = weekStarts[0];
  const to = today();
  const prevFrom = addDays(from, -7 * weeks);

  const rows = all<Row>(
    `SELECT es.id AS set_id, s.session_date, em.role, m.key AS muscle_key, m.name AS muscle_name,
            m.muscle_group, es.weight_kg, es.reps
     FROM exercise_sets es
     JOIN workout_sessions s ON s.id = es.session_id
     JOIN exercise_muscles em ON em.exercise_id = es.catalog_id
     JOIN muscles m ON m.id = em.muscle_id
     WHERE s.ended_at IS NOT NULL AND es.kind <> 'warmup' AND s.session_date BETWEEN ? AND ?`,
    prevFrom,
    to,
  );
  const muscleList = all<{ key: string; name: string; muscle_group: string }>(
    "SELECT key, name, muscle_group FROM muscles ORDER BY sort_order",
  );

  const weekIndex = new Map(weekStarts.map((w, i) => [w, i]));
  const mk = (key: string, name: string, group: string): ProgressEntry => ({
    key,
    name,
    group,
    cur: emptyBucket(),
    prev: emptyBucket(),
    weekly: weekStarts.map((weekStart) => ({ weekStart, primary: 0, secondary: 0, volume: 0, maxWeight: null })),
  });
  const muscles = new Map(muscleList.map((m) => [m.key, mk(m.key, m.name, m.muscle_group)]));
  const groups = new Map<string, ProgressEntry>();
  for (const m of muscleList) if (!groups.has(m.muscle_group)) groups.set(m.muscle_group, mk(m.muscle_group, m.muscle_group, m.muscle_group));

  function apply(entry: ProgressEntry, row: { date: string; role: Row["role"]; w: number; r: number }) {
    if (row.date >= from) {
      add(entry.cur, row.role, row.w, row.r, row.date);
      const wp = entry.weekly[weekIndex.get(startOfWeek(row.date)) ?? -1];
      if (wp) {
        if (row.role === "primary") {
          wp.primary++;
          wp.volume += row.w * row.r;
          wp.maxWeight = Math.max(wp.maxWeight ?? 0, row.w);
        } else wp.secondary++;
      }
    } else {
      add(entry.prev, row.role, row.w, row.r, row.date);
    }
  }

  // un grupo cuenta cada serie una vez, con el mejor rol entre sus músculos
  const groupBest = new Map<string, { group: string; date: string; role: Row["role"]; w: number; r: number }>();
  for (const r of rows) {
    const m = muscles.get(r.muscle_key);
    if (m) apply(m, { date: r.session_date, role: r.role, w: r.weight_kg, r: r.reps });
    const gk = `${r.set_id}|${r.muscle_group}`;
    const cur = groupBest.get(gk);
    if (!cur || (cur.role === "secondary" && r.role === "primary")) {
      groupBest.set(gk, { group: r.muscle_group, date: r.session_date, role: r.role, w: r.weight_kg, r: r.reps });
    }
  }
  for (const g of groupBest.values()) {
    const entry = groups.get(g.group);
    if (entry) apply(entry, g);
  }

  return {
    weekStarts,
    from,
    to,
    muscles: [...muscles.values()],
    groups: [...groups.values()],
    hasData: rows.some((r) => r.session_date >= from),
  };
}
