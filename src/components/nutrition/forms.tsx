"use client";

import { useMemo, useState } from "react";
import { ActionForm } from "@/components/ui/action-form";
import { Field, inputClass } from "@/components/ui/button";
import { addMealEntry, createFood, saveGoals, updateFood, updateMealEntry } from "@/features/nutrition/actions";
import { nf } from "@/lib/format";

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

export function AddFoodForm({ foods, meal, date }: { foods: FoodOpt[]; meal: string; date: string }) {
  const [q, setQ] = useState("");
  const [foodId, setFoodId] = useState<number | "">("");
  const [qty, setQty] = useState("");
  const shown = useMemo(() => foods.filter((f) => f.name.toLowerCase().includes(q.toLowerCase())), [foods, q]);
  const food = foods.find((f) => f.id === foodId);
  const amount = Number(qty);
  const k = food && amount > 0 ? amount / food.serving_size : 0;

  return (
    <ActionForm action={addMealEntry} submitLabel="Agregar al registro" className="space-y-4">
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="meal" value={meal} />
      <Field label="Buscar alimento">
        <input value={q} onChange={(e) => setQ(e.target.value)} className={inputClass} placeholder="Escribí para filtrar..." autoFocus />
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
    </ActionForm>
  );
}

export function FoodForm({ food }: { food?: FoodOpt }) {
  const action = food ? updateFood.bind(null, food.id) : createFood;
  return (
    <ActionForm action={action} submitLabel={food ? "Guardar cambios" : "Crear alimento"} reset={!food} className="space-y-4">
      {food?.source === "seed_approx" && (
        <p className="rounded-control bg-surface-2 px-3 py-2 text-xs text-muted">
          Los valores iniciales son datos de referencia aproximados. Comprobalos con tus etiquetas y editalos si hace falta.
        </p>
      )}
      <Field label="Nombre">
        <input name="name" required maxLength={120} defaultValue={food?.name} className={inputClass} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Tamaño de porción">
          <input name="serving_size" type="number" step="any" min={0.1} required defaultValue={food?.serving_size ?? 100} className={inputClass} />
        </Field>
        <Field label="Unidad">
          <input name="serving_unit" required maxLength={12} defaultValue={food?.serving_unit ?? "g"} className={inputClass} placeholder="g, ml, unidad" />
        </Field>
      </div>
      <p className="-mb-2 text-[11px] text-muted">Los valores de abajo corresponden a una porción de ese tamaño.</p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Calorías (kcal)">
          <input name="calories" type="number" step="any" min={0} required defaultValue={food?.calories} className={inputClass} />
        </Field>
        <Field label="Proteínas (g)">
          <input name="protein_g" type="number" step="any" min={0} required defaultValue={food?.protein_g} className={inputClass} />
        </Field>
        <Field label="Carbohidratos (g)">
          <input name="carbs_g" type="number" step="any" min={0} required defaultValue={food?.carbs_g} className={inputClass} />
        </Field>
        <Field label="Grasas (g)">
          <input name="fat_g" type="number" step="any" min={0} required defaultValue={food?.fat_g} className={inputClass} />
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
