"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { get, run } from "@/lib/db";
import { fail, guard, ok, type ActionResult } from "@/lib/action";
import { dateSchema, requiredNumber } from "@/lib/schemas";
import { today } from "@/lib/dates";
import { syncSystemHabit } from "@/features/habits/queries";
import { getFood, goalsFor, macrosFor, totalsForDate, type MealEntry } from "./queries";

const refresh = () => revalidatePath("/", "layout");

/** Keep the "reach protein goal" habit in step with what was actually eaten that day. */
function syncProtein(date: string) {
  const goal = goalsFor(date);
  syncSystemHabit("protein_goal", date, totalsForDate(date).protein_g >= goal.protein_g);
}

const mealEnum = z.enum(["breakfast", "lunch", "snack", "dinner"]);
const qty = requiredNumber("Cantidad").pipe(z.number().positive("La cantidad debe ser mayor a 0").max(20000));

export async function addMealEntry(fd: FormData): Promise<ActionResult> {
  return guard(() => {
    const v = z
      .object({
        food_id: z.coerce.number().int().positive("Elegí un alimento"),
        meal: mealEnum,
        quantity: qty,
        date: dateSchema,
      })
      .parse({
        food_id: fd.get("food_id"),
        meal: fd.get("meal"),
        quantity: fd.get("quantity"),
        date: fd.get("date") ?? today(),
      });
    const food = getFood(v.food_id);
    if (!food) return fail("No se encontró el alimento.");
    const m = macrosFor(food, v.quantity);
    run(
      `INSERT INTO meal_entries (entry_date, meal, food_id, food_name, quantity, serving_unit, calories, protein_g, carbs_g, fat_g)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      v.date, v.meal, food.id, food.name, v.quantity, food.serving_unit, m.calories, m.protein_g, m.carbs_g, m.fat_g,
    );
    syncProtein(v.date);
    refresh();
    return ok("Agregado");
  });
}

/** Changing the amount rescales the stored snapshot, so it works even if the food was edited or removed. */
export async function updateMealEntry(id: number, fd: FormData): Promise<ActionResult> {
  return guard(() => {
    const v = z.object({ quantity: qty, meal: mealEnum }).parse({ quantity: fd.get("quantity"), meal: fd.get("meal") });
    const e = get<MealEntry>("SELECT * FROM meal_entries WHERE id = ?", id);
    if (!e) return fail("No se encontró el registro.");
    const k = v.quantity / e.quantity;
    const r = (n: number) => Math.round(n * k * 10) / 10;
    run(
      "UPDATE meal_entries SET meal = ?, quantity = ?, calories = ?, protein_g = ?, carbs_g = ?, fat_g = ? WHERE id = ?",
      v.meal, v.quantity, r(e.calories), r(e.protein_g), r(e.carbs_g), r(e.fat_g), id,
    );
    syncProtein(e.entry_date);
    refresh();
    return ok("Actualizado");
  });
}

export async function deleteMealEntry(id: number): Promise<ActionResult> {
  return guard(() => {
    const e = get<MealEntry>("SELECT * FROM meal_entries WHERE id = ?", id);
    if (!e) return fail("No se encontró el registro.");
    run("DELETE FROM meal_entries WHERE id = ?", id);
    syncProtein(e.entry_date);
    refresh();
    return ok();
  });
}

const foodSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio").max(120),
  serving_size: requiredNumber("Tamaño de porción").pipe(z.number().positive("El tamaño de porción debe ser mayor a 0")),
  serving_unit: z.string().trim().min(1, "La unidad es obligatoria").max(12),
  calories: requiredNumber("Calorías").pipe(z.number().min(0).max(10000)),
  protein_g: requiredNumber("Proteínas").pipe(z.number().min(0).max(1000)),
  carbs_g: requiredNumber("Carbohidratos").pipe(z.number().min(0).max(1000)),
  fat_g: requiredNumber("Grasas").pipe(z.number().min(0).max(1000)),
});

const parseFood = (fd: FormData) =>
  foodSchema.parse(Object.fromEntries(["name", "serving_size", "serving_unit", "calories", "protein_g", "carbs_g", "fat_g"].map((k) => [k, fd.get(k)])));

export async function createFood(fd: FormData): Promise<ActionResult> {
  return guard(() => {
    const v = parseFood(fd);
    run(
      "INSERT INTO foods (name, serving_size, serving_unit, calories, protein_g, carbs_g, fat_g, source) VALUES (?, ?, ?, ?, ?, ?, ?, 'custom')",
      v.name, v.serving_size, v.serving_unit, v.calories, v.protein_g, v.carbs_g, v.fat_g,
    );
    refresh();
    return ok("Alimento creado");
  });
}

/** Editing a food only affects future entries; logged meals keep their own macro totals. */
export async function updateFood(id: number, fd: FormData): Promise<ActionResult> {
  return guard(() => {
    const v = parseFood(fd);
    run(
      "UPDATE foods SET name = ?, serving_size = ?, serving_unit = ?, calories = ?, protein_g = ?, carbs_g = ?, fat_g = ?, source = 'custom' WHERE id = ?",
      v.name, v.serving_size, v.serving_unit, v.calories, v.protein_g, v.carbs_g, v.fat_g, id,
    );
    refresh();
    return ok("Alimento actualizado");
  });
}

export async function deleteFood(id: number): Promise<ActionResult> {
  return guard(() => {
    run("UPDATE foods SET archived_at = datetime('now') WHERE id = ?", id);
    refresh();
    return ok();
  });
}

export async function saveGoals(fd: FormData): Promise<ActionResult> {
  return guard(() => {
    const v = z
      .object({
        calories: requiredNumber("Calorías").pipe(z.number().int().min(500).max(10000)),
        protein_g: requiredNumber("Proteínas").pipe(z.number().int().min(0).max(600)),
        carbs_g: requiredNumber("Carbohidratos").pipe(z.number().int().min(0).max(1500)),
        fat_g: requiredNumber("Grasas").pipe(z.number().int().min(0).max(500)),
      })
      .parse(Object.fromEntries(["calories", "protein_g", "carbs_g", "fat_g"].map((k) => [k, fd.get(k)])));
    // New version effective today; previous days keep the goal they were measured against.
    run(
      `INSERT INTO user_goals (effective_from, calories, protein_g, carbs_g, fat_g) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (effective_from) DO UPDATE SET calories = excluded.calories, protein_g = excluded.protein_g,
         carbs_g = excluded.carbs_g, fat_g = excluded.fat_g`,
      today(), v.calories, v.protein_g, v.carbs_g, v.fat_g,
    );
    syncProtein(today());
    refresh();
    return ok("Objetivos guardados");
  });
}
