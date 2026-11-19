import { all } from "@/lib/db";

export const dynamic = "force-dynamic";

const TABLES = [
  "profile", "user_goals", "habits", "habit_logs", "workout_templates", "workout_exercises",
  "workout_sessions", "exercise_sets", "foods", "meal_entries", "body_measurements", "progress_photos",
];

// Full JSON export of every table (photo files live in data/photos).
export function GET() {
  const out: Record<string, unknown[]> = {};
  for (const t of TABLES) out[t] = all(`SELECT * FROM ${t}`);
  return new Response(JSON.stringify({ exported_at: new Date().toISOString(), ...out }, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="form-export-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
