"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { get, run, transaction } from "@/lib/db";
import { fail, guard, ok, type ActionResult } from "@/lib/action";
import { dateSchema, requiredNumber } from "@/lib/schemas";
import { today } from "@/lib/dates";
import { syncSystemHabit } from "@/features/habits/queries";
import { getDish } from "./dishes";
import { goalsFor, totalsForDate } from "./queries";

const refresh = () => revalidatePath("/", "layout");

const dishSchema = z.object({
  name: z.string().trim().min(1, "El nombre del plato es obligatorio").max(120, "El nombre es demasiado largo"),
  servings: requiredNumber("Porciones").pipe(z.number().positive("Las porciones deben ser mayores a 0").max(100)),
  items: z
    .array(
      z.object({
        food_id: z.number().int().positive("Elegí un alimento en cada ingrediente"),
        quantity: z.number().positive("Las cantidades deben ser mayores a 0").max(20000),
      }),
    )
    .min(1, "Agregá al menos un ingrediente"),
});

function parseDish(fd: FormData) {
  const foodIds = fd.getAll("food_id").map((v) => Number(v));
  const quantities = fd.getAll("quantity").map((v) => (v === "" ? NaN : Number(v)));
  if (foodIds.length !== quantities.length) throw new Error("Los ingredientes están incompletos.");
  const v = dishSchema.parse({
    name: fd.get("name"),
    servings: fd.get("servings"),
    items: foodIds.map((food_id, i) => ({ food_id, quantity: quantities[i] })),
  });
  return v;
}

function saveItems(dishId: number, items: { food_id: number; quantity: number }[]) {
  run("DELETE FROM dish_items WHERE dish_id = ?", dishId);
  items.forEach((it, i) =>
    run("INSERT INTO dish_items (dish_id, food_id, quantity, position) VALUES (?, ?, ?, ?)", dishId, it.food_id, it.quantity, i + 1),
  );
}

function duplicateName(name: string, exceptId?: number): boolean {
  return !!get("SELECT 1 AS x FROM dishes WHERE name = ? COLLATE NOCASE AND id <> ?", name, exceptId ?? -1);
}

export async function createDish(fd: FormData): Promise<ActionResult> {
  return guard(() => {
    const v = parseDish(fd);
    if (duplicateName(v.name)) return fail(`Ya tenés un plato llamado «${v.name}».`);
    transaction(() => {
      const { id } = run("INSERT INTO dishes (name, servings) VALUES (?, ?)", v.name, v.servings);
      saveItems(id, v.items);
    });
    refresh();
    return ok("Plato creado");
  });
}

/** Editar un plato no cambia las comidas ya registradas: guardan su propia copia de los macros. */
export async function updateDish(id: number, fd: FormData): Promise<ActionResult> {
  return guard(() => {
    const v = parseDish(fd);
    if (!get("SELECT 1 AS x FROM dishes WHERE id = ?", id)) return fail("No se encontró el plato.");
    if (duplicateName(v.name, id)) return fail(`Ya tenés otro plato llamado «${v.name}».`);
    transaction(() => {
      run("UPDATE dishes SET name = ?, servings = ? WHERE id = ?", v.name, v.servings, id);
      saveItems(id, v.items);
    });
    refresh();
    return ok("Plato actualizado");
  });
}

export async function deleteDish(id: number): Promise<ActionResult> {
  return guard(() => {
    run("DELETE FROM dishes WHERE id = ?", id); // las comidas registradas conservan sus valores
    refresh();
    return ok();
  });
}

/** Registra porciones de un plato en una comida como una sola entrada con los macros copiados. */
export async function addDishEntry(fd: FormData): Promise<ActionResult> {
  return guard(() => {
    const v = z
      .object({
        dish_id: z.coerce.number().int().positive("Elegí un plato"),
        meal: z.enum(["breakfast", "lunch", "snack", "dinner"]),
        portions: requiredNumber("Porciones").pipe(z.number().positive("Las porciones deben ser mayores a 0").max(50)),
        date: dateSchema,
      })
      .parse({
        dish_id: fd.get("dish_id"),
        meal: fd.get("meal"),
        portions: fd.get("portions"),
        date: fd.get("date") || today(),
      });
    const dish = getDish(v.dish_id);
    if (!dish) return fail("No se encontró el plato.");
    const r1 = (n: number) => Math.round(n * v.portions * 10) / 10;
    run(
      `INSERT INTO meal_entries (entry_date, meal, food_id, dish_id, food_name, quantity, serving_unit, calories, protein_g, carbs_g, fat_g)
       VALUES (?, ?, NULL, ?, ?, ?, 'porción', ?, ?, ?, ?)`,
      v.date, v.meal, dish.id, dish.name, v.portions,
      r1(dish.perServing.calories), r1(dish.perServing.protein_g), r1(dish.perServing.carbs_g), r1(dish.perServing.fat_g),
    );
    // mantiene sincronizado el hábito «alcanzar objetivo de proteínas»
    syncSystemHabit("protein_goal", v.date, totalsForDate(v.date).protein_g >= goalsFor(v.date).protein_g);
    refresh();
    return ok("Plato agregado");
  });
}
