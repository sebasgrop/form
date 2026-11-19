import "server-only";
import { all, get, run, transaction } from "@/lib/db";

import type { CatalogExercise, Muscle } from "./types";
export type { CatalogExercise, Muscle };

export function listMuscles(): Muscle[] {
  return all<Muscle>("SELECT id, key, name, muscle_group FROM muscles ORDER BY sort_order");
}

export function listCatalog(): CatalogExercise[] {
  const exercises = all<{ id: number; name: string; source: "seed" | "custom" }>(
    "SELECT id, name, source FROM exercise_catalog ORDER BY name COLLATE NOCASE",
  );
  const links = all<Muscle & { exercise_id: number; role: "primary" | "secondary" }>(
    `SELECT em.exercise_id, em.role, m.id, m.key, m.name, m.muscle_group
     FROM exercise_muscles em JOIN muscles m ON m.id = em.muscle_id ORDER BY m.sort_order`,
  );
  const byEx = new Map<number, typeof links>();
  for (const l of links) byEx.set(l.exercise_id, [...(byEx.get(l.exercise_id) ?? []), l]);
  const toMuscle = ({ id, key, name, muscle_group }: Muscle): Muscle => ({ id, key, name, muscle_group });
  return exercises.map((e) => {
    const l = byEx.get(e.id) ?? [];
    return {
      ...e,
      primary: l.filter((x) => x.role === "primary").map(toMuscle),
      secondary: l.filter((x) => x.role === "secondary").map(toMuscle),
    };
  });
}

export function getCatalogExercise(id: number): CatalogExercise | undefined {
  return listCatalog().find((e) => e.id === id);
}

export function findCatalogByName(name: string): { id: number } | undefined {
  return get<{ id: number }>("SELECT id FROM exercise_catalog WHERE name = ? COLLATE NOCASE", name.trim());
}

/** Reemplaza los músculos de un ejercicio. Un músculo no puede ser principal y accesorio a la vez. */
export function setExerciseMuscles(exerciseId: number, primary: number[], secondary: number[]): void {
  const prim = [...new Set(primary)];
  const sec = [...new Set(secondary)].filter((m) => !prim.includes(m));
  if (prim.length === 0) throw new Error("Elegí al menos un músculo principal.");
  transaction(() => {
    run("DELETE FROM exercise_muscles WHERE exercise_id = ?", exerciseId);
    for (const m of prim) run("INSERT INTO exercise_muscles (exercise_id, muscle_id, role) VALUES (?, ?, 'primary')", exerciseId, m);
    for (const m of sec) run("INSERT INTO exercise_muscles (exercise_id, muscle_id, role) VALUES (?, ?, 'secondary')", exerciseId, m);
  });
}

export function createCatalogExercise(name: string, primary: number[], secondary: number[]): number {
  return transaction(() => {
    const { id } = run("INSERT INTO exercise_catalog (name, source) VALUES (?, 'custom')", name.trim());
    setExerciseMuscles(id, primary, secondary);
    return id;
  });
}

/**
 * Devuelve el ejercicio de catálogo para un formulario: usa `catalogId` si existe, luego una
 * coincidencia por nombre, y si no hay ninguna crea uno nuevo con los músculos indicados.
 */
export function resolveCatalogId(input: {
  name: string;
  catalogId?: number | null;
  primary: number[];
  secondary: number[];
}): number {
  if (input.catalogId && get("SELECT 1 AS x FROM exercise_catalog WHERE id = ?", input.catalogId)) return input.catalogId;
  const byName = findCatalogByName(input.name);
  if (byName) return byName.id;
  return createCatalogExercise(input.name, input.primary, input.secondary);
}

export const parseIds = (values: FormDataEntryValue[]): number[] =>
  values.map((v) => Number(v)).filter((n) => Number.isInteger(n) && n > 0);
