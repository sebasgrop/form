"use client";

import { useState } from "react";
import { ActionForm } from "@/components/ui/action-form";
import { Field, inputClass } from "@/components/ui/button";
import { createHabit, updateHabit } from "@/features/habits/actions";
import { WEEKDAYS_SHORT } from "@/lib/dates";
import { cn } from "@/lib/cn";

const CATEGORIES = [
  ["nutrition", "Nutrición"],
  ["activity", "Actividad física"],
  ["recovery", "Recuperación"],
  ["wellbeing", "Bienestar"],
  ["custom", "Personalizado"],
] as const;

export type HabitFormValues = {
  id?: number;
  name: string;
  category: string;
  type: "boolean" | "numeric";
  target_value: number | null;
  target_max: number | null;
  unit: string | null;
  days: number[];
  linked?: boolean;
};

export function HabitForm({ habit }: { habit?: HabitFormValues }) {
  const [type, setType] = useState<"boolean" | "numeric">(habit?.type ?? "boolean");
  const [days, setDays] = useState<number[]>(habit?.days ?? [1, 2, 3, 4, 5, 6, 7]);
  const action = habit?.id ? updateHabit.bind(null, habit.id) : createHabit;

  return (
    <ActionForm action={action} submitLabel={habit?.id ? "Guardar cambios" : "Crear hábito"} reset={!habit?.id} className="space-y-4">
      <Field label="Nombre">
        <input name="name" required maxLength={120} defaultValue={habit?.name} className={inputClass} placeholder="Ej.: Leer 20 minutos" />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Categoría">
          <select name="category" defaultValue={habit?.category ?? "custom"} className={inputClass}>
            {CATEGORIES.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Tipo" hint={habit?.linked ? "Los hábitos vinculados mantienen su tipo" : undefined}>
          <select
            name="type"
            value={type}
            disabled={habit?.linked}
            onChange={(e) => setType(e.target.value as "boolean" | "numeric")}
            className={inputClass}
          >
            <option value="boolean">Sí / no</option>
            <option value="numeric">Cantidad numérica</option>
          </select>
          {habit?.linked && <input type="hidden" name="type" value={type} />}
        </Field>
      </div>

      {type === "numeric" && (
        <div className="grid grid-cols-3 gap-3">
          <Field label="Objetivo (mín.)">
            <input name="target_value" type="number" step="any" min={0} required defaultValue={habit?.target_value ?? ""} className={inputClass} />
          </Field>
          <Field label="Máx. (opcional)">
            <input name="target_max" type="number" step="any" min={0} defaultValue={habit?.target_max ?? ""} className={inputClass} />
          </Field>
          <Field label="Unidad">
            <input name="unit" maxLength={20} defaultValue={habit?.unit ?? ""} className={inputClass} placeholder="ml, pasos..." />
          </Field>
        </div>
      )}

      <fieldset>
        <legend className="mb-1.5 text-xs text-muted">Frecuencia</legend>
        <div className="flex flex-wrap gap-1.5">
          {WEEKDAYS_SHORT.map((label, i) => {
            const d = i + 1;
            const on = days.includes(d);
            return (
              <label
                key={d}
                className={cn(
                  "cursor-pointer select-none rounded-control border px-3 py-1.5 text-xs transition-colors",
                  on ? "border-accent bg-accent-soft font-medium text-accent-strong" : "border-line-strong text-muted hover:text-fg",
                )}
              >
                <input
                  type="checkbox"
                  name="days"
                  value={d}
                  checked={on}
                  onChange={() => setDays((p) => (on ? p.filter((x) => x !== d) : [...p, d]))}
                  className="sr-only"
                />
                {label}
              </label>
            );
          })}
        </div>
      </fieldset>
    </ActionForm>
  );
}
