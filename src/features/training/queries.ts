import "server-only";
import { all, get } from "@/lib/db";
import { isoWeekday } from "@/lib/dates";

export type Exercise = {
  id: number;
  template_id: number;
  catalog_id: number | null;
  name: string;
  target_sets: number;
  rep_min: number;
  rep_max: number;
  position: number;
};

export type Template = {
  id: number;
  name: string;
  day_of_week: number | null;
  sort_order: number;
  exercises: Exercise[];
};

export type Session = {
  id: number;
  template_id: number | null;
  name: string;
  session_date: string;
  started_at: string;
  ended_at: string | null;
  notes: string | null;
};

export type SetRow = {
  id: number;
  session_id: number;
  workout_exercise_id: number | null;
  catalog_id: number | null;
  exercise_name: string;
  exercise_position: number;
  set_number: number;
  weight_kg: number;
  reps: number;
  kind: "normal" | "warmup" | "failure" | "drop";
  duration_seconds: number | null;
};

export function listTemplates(): Template[] {
  const templates = all<Omit<Template, "exercises">>(
    "SELECT id, name, day_of_week, sort_order FROM workout_templates WHERE archived_at IS NULL ORDER BY COALESCE(day_of_week, 8), sort_order, id",
  );
  const exercises = all<Exercise>(
    "SELECT * FROM workout_exercises WHERE template_id IN (SELECT id FROM workout_templates WHERE archived_at IS NULL) ORDER BY position, id",
  );
  return templates.map((t) => ({ ...t, exercises: exercises.filter((e) => e.template_id === t.id) }));
}

export function getTemplate(id: number): Template | undefined {
  return listTemplates().find((t) => t.id === id);
}

export function templateForDate(date: string): Template | undefined {
  const dow = isoWeekday(date);
  return listTemplates().find((t) => t.day_of_week === dow);
}

export function activeSession(): Session | undefined {
  return get<Session>("SELECT * FROM workout_sessions WHERE ended_at IS NULL ORDER BY id DESC LIMIT 1");
}

export function getSession(id: number): Session | undefined {
  return get<Session>("SELECT * FROM workout_sessions WHERE id = ?", id);
}

export function setsForSession(sessionId: number): SetRow[] {
  return all<SetRow>(
    "SELECT * FROM exercise_sets WHERE session_id = ? ORDER BY exercise_position, set_number",
    sessionId,
  );
}

export type SessionSummary = Session & { set_count: number; volume: number; exercise_count: number };

export function recentSessions(limit = 12): SessionSummary[] {
  return all<SessionSummary>(
    `SELECT s.*, COUNT(CASE WHEN e.kind <> 'warmup' THEN 1 END) AS set_count,
            COALESCE(SUM(CASE WHEN e.kind <> 'warmup' THEN e.weight_kg * e.reps END), 0) AS volume,
            COUNT(DISTINCT e.exercise_position) AS exercise_count
     FROM workout_sessions s LEFT JOIN exercise_sets e ON e.session_id = s.id
     WHERE s.ended_at IS NOT NULL
     GROUP BY s.id ORDER BY s.session_date DESC, s.id DESC LIMIT ?`,
    limit,
  );
}

export type LastPerformance = { session_date: string; sets: { weight_kg: number; reps: number }[] };

/** Sets from the most recent finished session *before* `session` that included this exercise. */
export function lastPerformance(exerciseName: string, session: { id: number; session_date: string }): LastPerformance | undefined {
  const row = get<{ id: number; session_date: string }>(
    `SELECT s.id, s.session_date FROM workout_sessions s
     JOIN exercise_sets e ON e.session_id = s.id
     WHERE e.exercise_name = ? AND e.kind <> 'warmup' AND s.ended_at IS NOT NULL
       AND (s.session_date < ? OR (s.session_date = ? AND s.id < ?))
     ORDER BY s.session_date DESC, s.id DESC LIMIT 1`,
    exerciseName,
    session.session_date,
    session.session_date,
    session.id,
  );
  if (!row) return undefined;
  const sets = all<{ weight_kg: number; reps: number }>(
    "SELECT weight_kg, reps FROM exercise_sets WHERE session_id = ? AND exercise_name = ? AND kind <> 'warmup' ORDER BY set_number",
    row.id,
    exerciseName,
  );
  return { session_date: row.session_date, sets };
}

export function finishedSessionsBetween(from: string, to: string): number {
  return (
    get<{ n: number }>(
      `SELECT COUNT(DISTINCT s.id) AS n FROM workout_sessions s JOIN exercise_sets e ON e.session_id = s.id
       WHERE s.ended_at IS NOT NULL AND s.session_date BETWEEN ? AND ?`,
      from,
      to,
    )?.n ?? 0
  );
}

/** Historial completo de entrenamientos terminados, paginado y filtrable por nombre o ejercicio. */
export function listSessions(opts: { limit: number; offset: number; q?: string }): { rows: SessionSummary[]; total: number } {
  const term = opts.q?.trim();
  // '!' hace de carácter de escape para que % y _ del texto buscado no actúen como comodines
  const like = term ? `%${term.replace(/[%_!]/g, (c) => `!${c}`)}%` : null;
  const where = `s.ended_at IS NOT NULL${
    like
      ? ` AND (s.name LIKE ? ESCAPE '!' OR EXISTS (SELECT 1 FROM exercise_sets x WHERE x.session_id = s.id AND x.exercise_name LIKE ? ESCAPE '!'))`
      : ""
  }`;
  const params = like ? [like, like] : [];
  const total = get<{ n: number }>(`SELECT COUNT(*) AS n FROM workout_sessions s WHERE ${where}`, ...params)?.n ?? 0;
  const rows = all<SessionSummary>(
    `SELECT s.*, COUNT(CASE WHEN e.kind <> 'warmup' THEN 1 END) AS set_count,
            COALESCE(SUM(CASE WHEN e.kind <> 'warmup' THEN e.weight_kg * e.reps END), 0) AS volume,
            COUNT(DISTINCT e.exercise_position) AS exercise_count
     FROM workout_sessions s LEFT JOIN exercise_sets e ON e.session_id = s.id
     WHERE ${where}
     GROUP BY s.id ORDER BY s.session_date DESC, s.started_at DESC, s.id DESC LIMIT ? OFFSET ?`,
    ...params,
    opts.limit,
    opts.offset,
  );
  return { rows, total };
}
