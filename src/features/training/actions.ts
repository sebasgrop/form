"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { get, run } from "@/lib/db";
import { fail, guard, ok, type ActionResult } from "@/lib/action";
import { optionalNumber, requiredNumber } from "@/lib/schemas";
import { today } from "@/lib/dates";
import { syncSystemHabit } from "@/features/habits/queries";
import { parseIds, resolveCatalogId } from "./catalog";
import { getSession, getTemplate } from "./queries";

const refresh = () => revalidatePath("/", "layout");

/** Ejercicio de catálogo para un formulario: id explícito, coincidencia por nombre o uno nuevo con sus músculos. */
function catalogFor(name: string, fd: FormData): number {
  return resolveCatalogId({
    name,
    catalogId: Number(fd.get("catalog_id")) || null,
    primary: parseIds(fd.getAll("primary")),
    secondary: parseIds(fd.getAll("secondary")),
  });
}

/* ------------------------------ sesiones ------------------------------ */

/** Inicia un entrenamiento desde una rutina (o vacío) y abre el registro. */
export async function startWorkout(templateId: number | null): Promise<ActionResult> {
  const existing = get<{ id: number }>("SELECT id FROM workout_sessions WHERE ended_at IS NULL ORDER BY id DESC LIMIT 1");
  if (existing) redirect(`/training/session/${existing.id}`);

  let name = "Entrenamiento libre";
  if (templateId != null) {
    const t = getTemplate(templateId);
    if (!t) return fail("No se encontró la rutina.");
    name = t.name;
  }
  const { id } = run(
    "INSERT INTO workout_sessions (template_id, name, session_date) VALUES (?, ?, ?)",
    templateId,
    name,
    today(),
  );
  refresh();
  redirect(`/training/session/${id}`);
}

const setSchema = z.object({
  weight_kg: requiredNumber("Peso").pipe(z.number().min(0, "El peso no puede ser negativo").max(1000, "Peso demasiado alto")),
  reps: requiredNumber("Repeticiones").pipe(z.number().int("Las repeticiones deben ser un número entero").min(0).max(200)),
});

export async function logSet(
  sessionId: number,
  ex: { position: number; name: string; workoutExerciseId: number | null; catalogId: number | null },
  fd: FormData,
): Promise<ActionResult> {
  return guard(() => {
    const v = setSchema.parse({ weight_kg: fd.get("weight_kg"), reps: fd.get("reps") });
    if (!getSession(sessionId)) return fail("No se encontró el entrenamiento.");
    const next =
      (get<{ m: number | null }>(
        "SELECT MAX(set_number) AS m FROM exercise_sets WHERE session_id = ? AND exercise_position = ?",
        sessionId,
        ex.position,
      )?.m ?? 0) + 1;
    run(
      `INSERT INTO exercise_sets (session_id, workout_exercise_id, catalog_id, exercise_name, exercise_position, set_number, weight_kg, reps)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      sessionId, ex.workoutExerciseId, ex.catalogId, ex.name, ex.position, next, v.weight_kg, v.reps,
    );
    refresh();
    return ok();
  });
}

/** Agrega a la sesión un ejercicio que no está en la rutina (existente en el catálogo o nuevo). */
export async function addExtraExercise(sessionId: number, fd: FormData): Promise<ActionResult> {
  return guard(() => {
    const name = z.string().trim().min(1, "El nombre del ejercicio es obligatorio").max(80).parse(fd.get("name"));
    const v = setSchema.parse({ weight_kg: fd.get("weight_kg"), reps: fd.get("reps") });
    if (!getSession(sessionId)) return fail("No se encontró el entrenamiento.");
    const catalogId = catalogFor(name, fd);
    const pos =
      (get<{ m: number | null }>("SELECT MAX(exercise_position) AS m FROM exercise_sets WHERE session_id = ?", sessionId)?.m ?? 0) + 1;
    // los extras viven por encima de las posiciones de la rutina para no chocar
    const position = Math.max(pos, 100);
    run(
      "INSERT INTO exercise_sets (session_id, catalog_id, exercise_name, exercise_position, set_number, weight_kg, reps) VALUES (?, ?, ?, ?, 1, ?, ?)",
      sessionId, catalogId, name, position, v.weight_kg, v.reps,
    );
    refresh();
    return ok("Ejercicio agregado");
  });
}

export async function updateSet(setId: number, fd: FormData): Promise<ActionResult> {
  return guard(() => {
    const v = setSchema.parse({ weight_kg: fd.get("weight_kg"), reps: fd.get("reps") });
    const r = run("UPDATE exercise_sets SET weight_kg = ?, reps = ? WHERE id = ?", v.weight_kg, v.reps, setId);
    if (!r.changes) return fail("No se encontró la serie.");
    refresh();
    return ok();
  });
}

export async function deleteSet(setId: number): Promise<ActionResult> {
  return guard(() => {
    run("DELETE FROM exercise_sets WHERE id = ?", setId);
    refresh();
    return ok();
  });
}

export async function finishWorkout(sessionId: number): Promise<ActionResult> {
  const s = getSession(sessionId);
  if (!s) return fail("No se encontró el entrenamiento.");
  const sets = get<{ n: number }>("SELECT COUNT(*) AS n FROM exercise_sets WHERE session_id = ?", sessionId)?.n ?? 0;
  if (sets === 0) {
    run("DELETE FROM workout_sessions WHERE id = ?", sessionId);
  } else {
    run("UPDATE workout_sessions SET ended_at = datetime('now') WHERE id = ? AND ended_at IS NULL", sessionId);
    syncSystemHabit("workout_completed", s.session_date, true);
  }
  refresh();
  redirect("/training");
}

export async function discardWorkout(sessionId: number): Promise<ActionResult> {
  run("DELETE FROM workout_sessions WHERE id = ? AND ended_at IS NULL", sessionId);
  refresh();
  redirect("/training");
}

export async function deleteSession(sessionId: number): Promise<ActionResult> {
  return guard(() => {
    const s = getSession(sessionId);
    run("DELETE FROM workout_sessions WHERE id = ?", sessionId);
    if (s) {
      const left = get<{ n: number }>(
        "SELECT COUNT(*) AS n FROM workout_sessions WHERE session_date = ? AND ended_at IS NOT NULL",
        s.session_date,
      )?.n;
      if (!left) syncSystemHabit("workout_completed", s.session_date, false);
    }
    refresh();
    return ok();
  });
}

/* ------------------------------ rutinas ------------------------------ */

const templateSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio").max(80),
  day_of_week: optionalNumber,
});

export async function createTemplate(fd: FormData): Promise<ActionResult> {
  return guard(() => {
    const v = templateSchema.parse({ name: fd.get("name"), day_of_week: fd.get("day_of_week") });
    run(
      "INSERT INTO workout_templates (name, day_of_week, sort_order) VALUES (?, ?, (SELECT COALESCE(MAX(sort_order),0)+1 FROM workout_templates))",
      v.name,
      v.day_of_week ?? null,
    );
    refresh();
    return ok("Rutina creada");
  });
}

export async function updateTemplate(id: number, fd: FormData): Promise<ActionResult> {
  return guard(() => {
    const v = templateSchema.parse({ name: fd.get("name"), day_of_week: fd.get("day_of_week") });
    run("UPDATE workout_templates SET name = ?, day_of_week = ? WHERE id = ?", v.name, v.day_of_week ?? null, id);
    refresh();
    return ok("Rutina actualizada");
  });
}

/** Las sesiones pasadas guardan el nombre de la rutina, así que borrarla no altera el historial. */
export async function deleteTemplate(id: number): Promise<ActionResult> {
  return guard(() => {
    run("DELETE FROM workout_templates WHERE id = ?", id);
    refresh();
    return ok();
  });
}

const exerciseSchema = z
  .object({
    name: z.string().trim().min(1, "El nombre es obligatorio").max(80),
    target_sets: requiredNumber("Series").pipe(z.number().int().min(1).max(20)),
    rep_min: requiredNumber("Repeticiones mínimas").pipe(z.number().int().min(1).max(200)),
    rep_max: requiredNumber("Repeticiones máximas").pipe(z.number().int().min(1).max(200)),
  })
  .refine((v) => v.rep_max >= v.rep_min, { path: ["rep_max"], message: "El máximo de repeticiones debe ser mayor o igual al mínimo" });

const parseExercise = (fd: FormData) =>
  exerciseSchema.parse(Object.fromEntries(["name", "target_sets", "rep_min", "rep_max"].map((k) => [k, fd.get(k)])));

export async function addExercise(templateId: number, fd: FormData): Promise<ActionResult> {
  return guard(() => {
    const v = parseExercise(fd);
    const catalogId = catalogFor(v.name, fd);
    run(
      `INSERT INTO workout_exercises (template_id, catalog_id, name, target_sets, rep_min, rep_max, position)
       VALUES (?, ?, ?, ?, ?, ?, (SELECT COALESCE(MAX(position),0)+1 FROM workout_exercises WHERE template_id = ?))`,
      templateId, catalogId, v.name, v.target_sets, v.rep_min, v.rep_max, templateId,
    );
    refresh();
    return ok("Ejercicio agregado");
  });
}

export async function updateExercise(id: number, fd: FormData): Promise<ActionResult> {
  return guard(() => {
    const v = parseExercise(fd);
    const catalogId = catalogFor(v.name, fd);
    run(
      "UPDATE workout_exercises SET catalog_id = ?, name = ?, target_sets = ?, rep_min = ?, rep_max = ? WHERE id = ?",
      catalogId, v.name, v.target_sets, v.rep_min, v.rep_max, id,
    );
    refresh();
    return ok("Ejercicio actualizado");
  });
}

export async function deleteExercise(id: number): Promise<ActionResult> {
  return guard(() => {
    run("DELETE FROM workout_exercises WHERE id = ?", id);
    refresh();
    return ok();
  });
}

export async function moveExercise(id: number, dir: -1 | 1): Promise<ActionResult> {
  return guard(() => {
    const e = get<{ id: number; template_id: number; position: number }>("SELECT id, template_id, position FROM workout_exercises WHERE id = ?", id);
    if (!e) return fail("No se encontró el ejercicio.");
    const other = get<{ id: number; position: number }>(
      dir === -1
        ? "SELECT id, position FROM workout_exercises WHERE template_id = ? AND position < ? ORDER BY position DESC LIMIT 1"
        : "SELECT id, position FROM workout_exercises WHERE template_id = ? AND position > ? ORDER BY position ASC LIMIT 1",
      e.template_id,
      e.position,
    );
    if (!other) return ok();
    run("UPDATE workout_exercises SET position = ? WHERE id = ?", other.position, e.id);
    run("UPDATE workout_exercises SET position = ? WHERE id = ?", e.position, other.id);
    refresh();
    return ok();
  });
}
