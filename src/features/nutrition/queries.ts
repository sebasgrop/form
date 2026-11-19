import "server-only";
import { all, get } from "@/lib/db";

export type Goals = { calories: number; protein_g: number; carbs_g: number; fat_g: number; effective_from: string };
export type Macros = { calories: number; protein_g: number; carbs_g: number; fat_g: number };
export type Meal = "breakfast" | "lunch" | "snack" | "dinner";
export const MEALS: { key: Meal; label: string }[] = [
  { key: "breakfast", label: "Desayuno" },
  { key: "lunch", label: "Almuerzo" },
  { key: "snack", label: "Merienda" },
  { key: "dinner", label: "Cena" },
];

export type Food = {
  id: number;
  name: string;
  serving_size: number;
  serving_unit: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  source: "seed_approx" | "custom";
  fdc_id: number | null;
};

export type MealEntry = Macros & {
  id: number;
  entry_date: string;
  meal: Meal;
  food_id: number | null;
  dish_id: number | null;
  food_name: string;
  quantity: number;
  serving_unit: string;
};

/** Goal that applied on a given day (goals are versioned, history is never rewritten). */
export function goalsFor(date: string): Goals {
  return get<Goals>(
    "SELECT calories, protein_g, carbs_g, fat_g, effective_from FROM user_goals WHERE effective_from <= ? ORDER BY effective_from DESC LIMIT 1",
    date,
  )!;
}

export function mealsForDate(date: string): MealEntry[] {
  return all<MealEntry>("SELECT * FROM meal_entries WHERE entry_date = ? ORDER BY id", date);
}

export function totalsForDate(date: string): Macros {
  return (
    get<Macros>(
      `SELECT COALESCE(SUM(calories),0) AS calories, COALESCE(SUM(protein_g),0) AS protein_g,
              COALESCE(SUM(carbs_g),0) AS carbs_g, COALESCE(SUM(fat_g),0) AS fat_g
       FROM meal_entries WHERE entry_date = ?`,
      date,
    ) ?? { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
  );
}

export function dailyTotals(from: string, to: string): (Macros & { entry_date: string })[] {
  return all(
    `SELECT entry_date, SUM(calories) AS calories, SUM(protein_g) AS protein_g, SUM(carbs_g) AS carbs_g, SUM(fat_g) AS fat_g
     FROM meal_entries WHERE entry_date BETWEEN ? AND ? GROUP BY entry_date ORDER BY entry_date`,
    from,
    to,
  );
}

export function listFoods(): Food[] {
  return all<Food>("SELECT * FROM foods WHERE archived_at IS NULL ORDER BY name COLLATE NOCASE");
}

export function getFood(id: number): Food | undefined {
  return get<Food>("SELECT * FROM foods WHERE id = ?", id);
}

/** Macros for `quantity` (in the food's serving unit) of a food defined per `serving_size`. */
export function macrosFor(food: Food, quantity: number): Macros {
  const k = quantity / food.serving_size;
  const r = (n: number) => Math.round(n * k * 10) / 10;
  return { calories: r(food.calories), protein_g: r(food.protein_g), carbs_g: r(food.carbs_g), fat_g: r(food.fat_g) };
}

export const round = (n: number) => Math.round(n);
