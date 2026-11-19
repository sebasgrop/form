import "server-only";
import { all, get } from "@/lib/db";
import type { Macros } from "./queries";

/**
 * Platos: conjuntos de alimentos con cantidades. Los macros del plato se calculan a partir de los
 * alimentos actuales de la biblioteca (si editás un alimento, el plato se actualiza). Las comidas ya
 * registradas guardan su propia copia de los macros, así que el historial no cambia.
 */

export type DishItem = {
  id: number;
  food_id: number;
  food_name: string;
  quantity: number;
  serving_unit: string;
  macros: Macros;
};

export type Dish = {
  id: number;
  name: string;
  servings: number;
  items: DishItem[];
  total: Macros;
  perServing: Macros;
};

type Row = {
  dish_id: number;
  dish_name: string;
  servings: number;
  item_id: number | null;
  food_id: number | null;
  food_name: string | null;
  quantity: number | null;
  serving_unit: string | null;
  serving_size: number | null;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
};

const r1 = (n: number) => Math.round(n * 10) / 10;
const zero = (): Macros => ({ calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 });
const round = (m: Macros): Macros => ({ calories: r1(m.calories), protein_g: r1(m.protein_g), carbs_g: r1(m.carbs_g), fat_g: r1(m.fat_g) });
const scale = (m: Macros, k: number): Macros => ({ calories: m.calories * k, protein_g: m.protein_g * k, carbs_g: m.carbs_g * k, fat_g: m.fat_g * k });

export function listDishes(): Dish[] {
  const rows = all<Row>(
    `SELECT d.id AS dish_id, d.name AS dish_name, d.servings,
            i.id AS item_id, i.food_id, f.name AS food_name, i.quantity, f.serving_unit, f.serving_size,
            f.calories, f.protein_g, f.carbs_g, f.fat_g
     FROM dishes d
     LEFT JOIN dish_items i ON i.dish_id = d.id
     LEFT JOIN foods f ON f.id = i.food_id
     ORDER BY d.name COLLATE NOCASE, i.position, i.id`,
  );
  const dishes = new Map<number, { dish: Dish; sum: Macros }>();
  for (const r of rows) {
    let entry = dishes.get(r.dish_id);
    if (!entry) {
      entry = { dish: { id: r.dish_id, name: r.dish_name, servings: r.servings, items: [], total: zero(), perServing: zero() }, sum: zero() };
      dishes.set(r.dish_id, entry);
    }
    if (r.item_id == null || r.quantity == null || r.serving_size == null) continue;
    const k = r.quantity / r.serving_size;
    const m: Macros = { calories: (r.calories ?? 0) * k, protein_g: (r.protein_g ?? 0) * k, carbs_g: (r.carbs_g ?? 0) * k, fat_g: (r.fat_g ?? 0) * k };
    entry.sum = { calories: entry.sum.calories + m.calories, protein_g: entry.sum.protein_g + m.protein_g, carbs_g: entry.sum.carbs_g + m.carbs_g, fat_g: entry.sum.fat_g + m.fat_g };
    entry.dish.items.push({
      id: r.item_id,
      food_id: r.food_id as number,
      food_name: r.food_name ?? "Alimento eliminado",
      quantity: r.quantity,
      serving_unit: r.serving_unit ?? "g",
      macros: round(m),
    });
  }
  return [...dishes.values()].map(({ dish, sum }) => ({
    ...dish,
    total: round(sum),
    perServing: round(scale(sum, 1 / dish.servings)),
  }));
}

export function getDish(id: number): Dish | undefined {
  return listDishes().find((d) => d.id === id);
}

export function dishExists(id: number): boolean {
  return !!get("SELECT 1 AS x FROM dishes WHERE id = ?", id);
}
