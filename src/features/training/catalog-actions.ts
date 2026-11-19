"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { run } from "@/lib/db";
import { fail, guard, ok, type ActionResult } from "@/lib/action";
import { createCatalogExercise, parseIds, setExerciseMuscles } from "./catalog";

const refresh = () => revalidatePath("/", "layout");

const nameSchema = z.string().trim().min(1, "El nombre es obligatorio").max(80, "El nombre es demasiado largo");

export async function saveNewExercise(fd: FormData): Promise<ActionResult> {
  return guard(() => {
    const name = nameSchema.parse(fd.get("name"));
    createCatalogExercise(name, parseIds(fd.getAll("primary")), parseIds(fd.getAll("secondary")));
    refresh();
    return ok("Ejercicio creado");
  });
}

export async function saveExercise(id: number, fd: FormData): Promise<ActionResult> {
  return guard(() => {
    const name = nameSchema.parse(fd.get("name"));
    // Los músculos se validan primero: si faltan, no se cambia nada.
    const primary = parseIds(fd.getAll("primary"));
    if (primary.length === 0) return fail("Elegí al menos un músculo principal.");
    run("UPDATE exercise_catalog SET name = ? WHERE id = ?", name, id);
    setExerciseMuscles(id, primary, parseIds(fd.getAll("secondary")));
    refresh();
    return ok("Ejercicio actualizado");
  });
}

/** Las rutinas y series que lo usan conservan su nombre; solo pierden el vínculo con los músculos. */
export async function removeExercise(id: number): Promise<ActionResult> {
  return guard(() => {
    run("DELETE FROM exercise_catalog WHERE id = ?", id);
    refresh();
    return ok();
  });
}
