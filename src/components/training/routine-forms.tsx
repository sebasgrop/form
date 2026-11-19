"use client";

import { ActionForm } from "@/components/ui/action-form";
import { Field, inputClass } from "@/components/ui/button";
import { addExercise, createTemplate, updateExercise, updateTemplate } from "@/features/training/actions";
import type { CatalogExercise, Muscle } from "@/features/training/types";
import { WEEKDAYS_LONG } from "@/lib/dates";
import { ExercisePicker } from "./exercise-picker";

export function TemplateForm({ template }: { template?: { id: number; name: string; day_of_week: number | null } }) {
  const action = template ? updateTemplate.bind(null, template.id) : createTemplate;
  return (
    <ActionForm action={action} submitLabel={template ? "Guardar cambios" : "Crear rutina"} reset={!template} className="space-y-4">
      <Field label="Nombre">
        <input name="name" required maxLength={80} defaultValue={template?.name} className={inputClass} placeholder="Ej.: Empuje" />
      </Field>
      <Field label="Día programado">
        <select name="day_of_week" defaultValue={template?.day_of_week ?? ""} className={inputClass}>
          <option value="">Sin programar</option>
          {WEEKDAYS_LONG.map((d, i) => (
            <option key={d} value={i + 1}>
              {d}
            </option>
          ))}
        </select>
      </Field>
    </ActionForm>
  );
}

export function ExerciseForm({
  templateId,
  exercise,
  catalog,
  muscles,
}: {
  templateId?: number;
  exercise?: { id: number; name: string; catalog_id: number | null; target_sets: number; rep_min: number; rep_max: number };
  catalog: CatalogExercise[];
  muscles: Muscle[];
}) {
  const action = exercise ? updateExercise.bind(null, exercise.id) : addExercise.bind(null, templateId!);
  return (
    <ActionForm action={action} submitLabel={exercise ? "Guardar cambios" : "Agregar ejercicio"} reset={!exercise} className="space-y-4">
      <ExercisePicker
        catalog={catalog}
        muscles={muscles}
        initialName={exercise?.name ?? ""}
        initialCatalogId={exercise?.catalog_id ?? null}
        autoFocus={!exercise}
      />
      <div className="grid grid-cols-3 gap-3">
        <Field label="Series">
          <input name="target_sets" type="number" min={1} max={20} required defaultValue={exercise?.target_sets ?? 3} className={inputClass} />
        </Field>
        <Field label="Reps mín.">
          <input name="rep_min" type="number" min={1} max={200} required defaultValue={exercise?.rep_min ?? 8} className={inputClass} />
        </Field>
        <Field label="Reps máx.">
          <input name="rep_max" type="number" min={1} max={200} required defaultValue={exercise?.rep_max ?? 12} className={inputClass} />
        </Field>
      </div>
    </ActionForm>
  );
}
