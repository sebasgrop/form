"use client";

import { useMemo, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { ActionForm } from "@/components/ui/action-form";
import { buttonClass, Field, inputClass } from "@/components/ui/button";
import { addDishEntry, createDish, updateDish } from "@/features/nutrition/dish-actions";
import { nf } from "@/lib/format";

export type FoodLite = {
  id: number;
  name: string;
  serving_size: number;
  serving_unit: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  archived?: boolean;
};

export type DishLite = {
  id: number;
  name: string;
  servings: number;
  items: { food_id: number; quantity: number }[];
};

type Row = { key: number; foodId: string; qty: string };

const MEALS = [
  ["breakfast", "Desayuno"],
  ["lunch", "Almuerzo"],
  ["snack", "Merienda"],
  ["dinner", "Cena"],
] as const;

type Macros = { calories: number; protein_g: number; carbs_g: number; fat_g: number };

export function MacroLine({ m, className }: { m: Macros; className?: string }) {
  return (
    <p className={`tabular-nums ${className ?? ""}`}>
      <span className="font-medium text-fg">{nf(m.calories)} kcal</span> · P {nf(m.protein_g, 1)} g · C {nf(m.carbs_g, 1)} g · G {nf(m.fat_g, 1)} g
    </p>
  );
}

export function DishForm({ foods, dish }: { foods: FoodLite[]; dish?: DishLite }) {
  const action = dish ? updateDish.bind(null, dish.id) : createDish;
  const byId = useMemo(() => new Map(foods.map((f) => [String(f.id), f])), [foods]);
  // las claves de las filas son su índice inicial; las nuevas siguen desde ahí (solo se incrementa en eventos)
  const nextKey = useRef(dish?.items.length || 1);
  const [rows, setRows] = useState<Row[]>(() =>
    dish?.items.length
      ? dish.items.map((i, idx) => ({ key: idx, foodId: String(i.food_id), qty: String(i.quantity) }))
      : [{ key: 0, foodId: "", qty: "" }],
  );
  const [servings, setServings] = useState(String(dish?.servings ?? 1));

  const total = useMemo<Macros>(() => {
    const t = { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
    for (const r of rows) {
      const f = byId.get(r.foodId);
      const q = Number(r.qty);
      if (!f || !(q > 0)) continue;
      const k = q / f.serving_size;
      t.calories += f.calories * k;
      t.protein_g += f.protein_g * k;
      t.carbs_g += f.carbs_g * k;
      t.fat_g += f.fat_g * k;
    }
    return t;
  }, [rows, byId]);
  const n = Number(servings);
  const per: Macros = n > 0 ? { calories: total.calories / n, protein_g: total.protein_g / n, carbs_g: total.carbs_g / n, fat_g: total.fat_g / n } : total;

  const update = (key: number, patch: Partial<Row>) => setRows((p) => p.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const usable = (f: FoodLite, selected: string) => !f.archived || String(f.id) === selected;

  return (
    <ActionForm action={action} submitLabel={dish ? "Guardar cambios" : "Crear plato"} reset={!dish} className="space-y-4">
      <div className="grid grid-cols-[1fr_7rem] gap-3">
        <Field label="Nombre del plato">
          <input name="name" required maxLength={120} defaultValue={dish?.name} className={inputClass} placeholder="Ej.: Pollo con arroz" data-autofocus="" />
        </Field>
        <Field label="Porciones" hint="Cuántas rinde">
          <input
            name="servings"
            type="number"
            step="any"
            min={0.25}
            required
            value={servings}
            onChange={(e) => setServings(e.target.value)}
            className={inputClass}
            inputMode="decimal"
          />
        </Field>
      </div>

      <fieldset>
        <legend className="mb-1.5 text-xs text-muted">Ingredientes</legend>
        <ul className="space-y-2">
          {rows.map((r, i) => {
            const f = byId.get(r.foodId);
            return (
              <li key={r.key} className="grid grid-cols-[1fr_6.5rem_auto] items-center gap-2">
                <select
                  name="food_id"
                  required
                  value={r.foodId}
                  onChange={(e) => update(r.key, { foodId: e.target.value })}
                  aria-label={`Alimento del ingrediente ${i + 1}`}
                  className={inputClass}
                >
                  <option value="" disabled>
                    Elegí un alimento
                  </option>
                  {foods
                    .filter((x) => usable(x, r.foodId))
                    .map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.name}
                      </option>
                    ))}
                </select>
                <div className="relative">
                  <input
                    name="quantity"
                    type="number"
                    step="any"
                    min={0.1}
                    required
                    value={r.qty}
                    onChange={(e) => update(r.key, { qty: e.target.value })}
                    aria-label={`Cantidad del ingrediente ${i + 1}${f ? ` en ${f.serving_unit}` : ""}`}
                    placeholder={f ? f.serving_unit : "cant."}
                    className={`${inputClass} pr-8`}
                    inputMode="decimal"
                  />
                  {f && <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-muted">{f.serving_unit}</span>}
                </div>
                <button
                  type="button"
                  onClick={() => setRows((p) => (p.length > 1 ? p.filter((x) => x.key !== r.key) : p))}
                  disabled={rows.length === 1}
                  className={buttonClass("ghost", "sm", "w-8 px-0")}
                  aria-label={`Quitar ingrediente ${i + 1}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
        <button
          type="button"
          onClick={() => setRows((p) => [...p, { key: nextKey.current++, foodId: "", qty: "" }])}
          className={buttonClass("secondary", "sm", "mt-2")}
        >
          <Plus className="h-3.5 w-3.5" aria-hidden /> Agregar ingrediente
        </button>
      </fieldset>

      <div className="rounded-control bg-surface-2 p-3 text-xs text-muted" aria-live="polite">
        <p className="mb-1 font-medium text-fg">Macronutrientes</p>
        <MacroLine m={total} />
        {n > 0 && n !== 1 && (
          <p className="mt-1">
            Por porción: <span className="tabular-nums text-fg">{nf(per.calories)} kcal · P {nf(per.protein_g, 1)} g · C {nf(per.carbs_g, 1)} g · G {nf(per.fat_g, 1)} g</span>
          </p>
        )}
      </div>
    </ActionForm>
  );
}

/** Registrar porciones de un plato en una comida. */
export function LogDishForm({ dish, perServing, date, defaultMeal = "lunch" }: { dish: { id: number; name: string }; perServing: Macros; date: string; defaultMeal?: string }) {
  const [portions, setPortions] = useState("1");
  const p = Number(portions) > 0 ? Number(portions) : 0;
  return (
    <ActionForm action={addDishEntry} submitLabel="Agregar al registro" className="space-y-4">
      <input type="hidden" name="dish_id" value={dish.id} />
      <p className="text-sm">{dish.name}</p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Comida">
          <select name="meal" defaultValue={defaultMeal} className={inputClass}>
            {MEALS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Porciones">
          <input name="portions" type="number" step="any" min={0.25} required value={portions} onChange={(e) => setPortions(e.target.value)} className={inputClass} inputMode="decimal" data-autofocus="" />
        </Field>
      </div>
      <Field label="Fecha">
        <input name="date" type="date" required defaultValue={date} max={date} className={inputClass} />
      </Field>
      {p > 0 && (
        <MacroLine
          className="rounded-control bg-surface-2 px-3 py-2 text-xs text-muted"
          m={{ calories: perServing.calories * p, protein_g: perServing.protein_g * p, carbs_g: perServing.carbs_g * p, fat_g: perServing.fat_g * p }}
        />
      )}
    </ActionForm>
  );
}
