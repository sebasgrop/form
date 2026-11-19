"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ActionForm } from "@/components/ui/action-form";
import { Field, inputClass } from "@/components/ui/button";
import { addDishEntry } from "@/features/nutrition/dish-actions";
import { addMealEntry, createFood, saveGoals, updateFood, updateMealEntry } from "@/features/nutrition/actions";
import { nf } from "@/lib/format";
import { matchesSearch } from "@/lib/text";

type FoodOpt = {
  id: number;
  name: string;
  serving_size: number;
  serving_unit: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  source: string;
};

const MEALS = [
  ["breakfast", "Desayuno"],
  ["lunch", "Almuerzo"],
  ["snack", "Merienda"],
  ["dinner", "Cena"],
] as const;

export type DishOpt = {
  id: number;
  name: string;
  servings: number;
  perServing: { calories: number; protein_g: number; carbs_g: number; fat_g: number };
};

export function AddFoodForm({ foods, dishes = [], meal, date }: { foods: FoodOpt[]; dishes?: DishOpt[]; meal: string; date: string }) {
  const [mode, setMode] = useState<"food" | "dish">("food");
  const [q, setQ] = useState("");
  const [foodId, setFoodId] = useState<number | "">("");
  const [qty, setQty] = useState("");
  const [dishId, setDishId] = useState<number | "">("");
  const [portions, setPortions] = useState("1");
  const shown = useMemo(() => foods.filter((f) => matchesSearch(f.name, q)), [foods, q]);
  const food = foods.find((f) => f.id === foodId);
  const amount = Number(qty);
  const k = food && amount > 0 ? amount / food.serving_size : 0;
  const dish = dishes.find((d) => d.id === dishId);
  const p = Number(portions) > 0 ? Number(portions) : 0;

  return (
    <ActionForm action={mode === "dish" ? addDishEntry : addMealEntry} submitLabel="Agregar al registro" className="space-y-4">
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="meal" value={meal} />

      <div role="tablist" aria-label="Qué agregar" className="flex gap-1 rounded-control border border-line bg-surface-2 p-1">
        {(
          [
            ["food", "Alimento"],
            ["dish", "Plato"],
          ] as const
        ).map(([m, label]) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={
              "flex-1 rounded-[10px] px-3 py-1.5 text-xs transition-colors " +
              (mode === m ? "bg-surface font-medium text-fg shadow-sm" : "text-muted hover:text-fg")
            }
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "food" ? (
        <>
          <Field label="Buscar alimento">
            <input value={q} onChange={(e) => setQ(e.target.value)} className={inputClass} placeholder="Escribí para filtrar..." data-autofocus="" />
          </Field>
          <Field label="Alimento">
            <select
              name="food_id"
              required
              size={Math.min(6, Math.max(2, shown.length))}
              value={foodId}
              onChange={(e) => {
                const id = Number(e.target.value);
                setFoodId(id);
                const f = foods.find((x) => x.id === id);
                if (f && !qty) setQty(String(f.serving_size));
              }}
              className="w-full rounded-control border border-line-strong bg-surface p-1 text-sm focus:border-accent focus:outline-none"
            >
              {shown.length === 0 && <option disabled>Sin resultados. Creá primero un alimento propio.</option>}
              {shown.map((f) => (
                <option key={f.id} value={f.id} className="rounded px-2 py-1">
                  {f.name} ({f.calories} kcal / {f.serving_size} {f.serving_unit})
                </option>
              ))}
            </select>
          </Field>
          <Field label={`Cantidad${food ? ` (${food.serving_unit})` : ""}`}>
            <input
              name="quantity"
              type="number"
              step="any"
              min={0.1}
              required
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className={inputClass}
              inputMode="decimal"
            />
          </Field>
          {food && k > 0 && (
            <p className="rounded-control bg-surface-2 px-3 py-2 text-xs tabular-nums text-muted">
              {nf(food.calories * k, 1)} kcal · P {nf(food.protein_g * k, 1)} g · C {nf(food.carbs_g * k, 1)} g · G {nf(food.fat_g * k, 1)} g
            </p>
          )}
        </>
      ) : dishes.length === 0 ? (
        <p className="rounded-control bg-surface-2 px-3 py-4 text-center text-sm text-muted">
          Todavía no creaste platos.{" "}
          <Link href="/nutrition/dishes" className="text-accent-strong underline">
            Crear un plato
          </Link>
        </p>
      ) : (
        <>
          <Field label="Plato">
            <select
              name="dish_id"
              required
              size={Math.min(6, Math.max(2, dishes.length))}
              value={dishId}
              onChange={(e) => setDishId(Number(e.target.value))}
              className="w-full rounded-control border border-line-strong bg-surface p-1 text-sm focus:border-accent focus:outline-none"
            >
              {dishes.map((d) => (
                <option key={d.id} value={d.id} className="rounded px-2 py-1">
                  {d.name} ({nf(d.perServing.calories)} kcal por porción)
                </option>
              ))}
            </select>
          </Field>
          <Field label="Porciones">
            <input
              name="portions"
              type="number"
              step="any"
              min={0.25}
              required
              value={portions}
              onChange={(e) => setPortions(e.target.value)}
              className={inputClass}
              inputMode="decimal"
            />
          </Field>
          {dish && p > 0 && (
            <p className="rounded-control bg-surface-2 px-3 py-2 text-xs tabular-nums text-muted">
              {nf(dish.perServing.calories * p, 1)} kcal · P {nf(dish.perServing.protein_g * p, 1)} g · C {nf(dish.perServing.carbs_g * p, 1)} g · G {nf(dish.perServing.fat_g * p, 1)} g
            </p>
          )}
        </>
      )}
    </ActionForm>
  );
}

export type FoodPrefill = {
  fdcId: number;
  name: string;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
};

export function FoodForm({ food, prefill }: { food?: FoodOpt; prefill?: FoodPrefill }) {
  const action = food ? updateFood.bind(null, food.id) : createFood;
  const missing = prefill
    ? ([
        ["calorías", prefill.calories],
        ["proteínas", prefill.protein_g],
        ["carbohidratos", prefill.carbs_g],
        ["grasas", prefill.fat_g],
      ] as const)
        .filter(([, v]) => v == null)
        .map(([l]) => l)
    : [];
  const v = (edit: number | undefined, pre: number | null | undefined) => edit ?? pre ?? "";
  return (
    <ActionForm
      action={action}
      submitLabel={food ? "Guardar cambios" : prefill ? "Agregar a mi biblioteca" : "Crear alimento"}
      reset={!food}
      className="space-y-4"
    >
      {food?.source === "seed_approx" && (
        <p className="rounded-control bg-surface-2 px-3 py-2 text-xs text-muted">
          Los valores iniciales son datos de referencia aproximados. Comprobalos con tus etiquetas y editalos si hace falta.
        </p>
      )}
      {prefill && (
        <>
          <input type="hidden" name="fdc_id" value={prefill.fdcId} />
          <p className="rounded-control bg-surface-2 px-3 py-2 text-xs text-muted">
            Valores de USDA FoodData Central por 100 g. Revisalos y, si querés, cambiá el nombre (por ejemplo, traducilo).
          </p>
          {missing.length > 0 && (
            <p role="status" className="rounded-control border border-danger/30 bg-danger/5 px-3 py-2 text-xs text-fg">
              USDA no informa: {missing.join(", ")}. Completalo a mano; no se inventan valores.
            </p>
          )}
        </>
      )}
      <Field label="Nombre">
        <input name="name" required maxLength={120} defaultValue={food?.name ?? prefill?.name.slice(0, 120)} className={inputClass} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Tamaño de porción">
          <input name="serving_size" type="number" step="any" min={0.1} required defaultValue={food?.serving_size ?? 100} className={inputClass} />
        </Field>
        <Field label="Unidad">
          <input name="serving_unit" required maxLength={12} defaultValue={food?.serving_unit ?? "g"} className={inputClass} placeholder="g, ml, unidad" />
        </Field>
      </div>
      <p className="text-[11px] text-muted">Los valores de abajo corresponden a una porción de ese tamaño.</p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Calorías (kcal)">
          <input name="calories" type="number" step="any" min={0} required defaultValue={v(food?.calories, prefill?.calories)} className={inputClass} />
        </Field>
        <Field label="Proteínas (g)">
          <input name="protein_g" type="number" step="any" min={0} required defaultValue={v(food?.protein_g, prefill?.protein_g)} className={inputClass} />
        </Field>
        <Field label="Carbohidratos (g)">
          <input name="carbs_g" type="number" step="any" min={0} required defaultValue={v(food?.carbs_g, prefill?.carbs_g)} className={inputClass} />
        </Field>
        <Field label="Grasas (g)">
          <input name="fat_g" type="number" step="any" min={0} required defaultValue={v(food?.fat_g, prefill?.fat_g)} className={inputClass} />
        </Field>
      </div>
    </ActionForm>
  );
}

export function EntryEditForm({ id, quantity, unit, meal }: { id: number; quantity: number; unit: string; meal: string }) {
  return (
    <ActionForm action={updateMealEntry.bind(null, id)} submitLabel="Guardar" reset={false} className="space-y-4">
      <Field label={`Cantidad (${unit})`} hint="Los macros se reescalan proporcionalmente.">
        <input name="quantity" type="number" step="any" min={0.1} required defaultValue={quantity} className={inputClass} />
      </Field>
      <Field label="Comida">
        <select name="meal" defaultValue={meal} className={inputClass}>
          {MEALS.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </Field>
    </ActionForm>
  );
}

export function GoalsForm({ goals }: { goals: { calories: number; protein_g: number; carbs_g: number; fat_g: number } }) {
  return (
    <ActionForm action={saveGoals} submitLabel="Guardar objetivos" reset={false} className="space-y-4">
      <p className="text-xs text-muted">Los nuevos objetivos rigen desde hoy. Los días anteriores conservan los objetivos con los que se midieron.</p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Calorías (kcal)">
          <input name="calories" type="number" min={500} max={10000} required defaultValue={goals.calories} className={inputClass} />
        </Field>
        <Field label="Proteínas (g)">
          <input name="protein_g" type="number" min={0} max={600} required defaultValue={goals.protein_g} className={inputClass} />
        </Field>
        <Field label="Carbohidratos (g)">
          <input name="carbs_g" type="number" min={0} max={1500} required defaultValue={goals.carbs_g} className={inputClass} />
        </Field>
        <Field label="Grasas (g)">
          <input name="fat_g" type="number" min={0} max={500} required defaultValue={goals.fat_g} className={inputClass} />
        </Field>
      </div>
    </ActionForm>
  );
}
