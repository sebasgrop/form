"use client";

import { useId, useState } from "react";
import { Field, inputClass } from "@/components/ui/button";
import type { CatalogExercise, Muscle } from "@/features/training/types";
import { MuscleChips } from "./muscle-chips";
import { MusclePicker } from "./muscle-picker";

/**
 * Nombre de ejercicio con sugerencias del catálogo.
 * - Si el nombre coincide con un ejercicio del catálogo, se vinculan sus músculos.
 * - Si es nuevo, se piden los músculos (al menos uno principal) y se agrega al catálogo.
 */
export function ExercisePicker({
  catalog,
  muscles,
  initialName = "",
  initialCatalogId = null,
  autoFocus = false,
}: {
  catalog: CatalogExercise[];
  muscles: Muscle[];
  initialName?: string;
  initialCatalogId?: number | null;
  autoFocus?: boolean;
}) {
  const listId = useId();
  const [name, setName] = useState(initialName);

  const byName = catalog.find((c) => c.name.toLowerCase() === name.trim().toLowerCase());
  const initial = initialCatalogId ? catalog.find((c) => c.id === initialCatalogId) : undefined;
  // Un ejercicio de rutina puede tener un nombre propio distinto del catálogo; si no se tocó el nombre, conserva su vínculo.
  const linked = byName ?? (initial && name === initialName ? initial : undefined);
  const isNew = name.trim().length > 0 && !linked;

  return (
    <div className="space-y-3">
      <Field label="Ejercicio">
        <input
          name="name"
          required
          maxLength={80}
          list={listId}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputClass}
          placeholder="Buscá en el catálogo o escribí uno nuevo"
          autoComplete="off"
          data-autofocus={autoFocus ? "" : undefined}
        />
        <datalist id={listId}>
          {catalog.map((c) => (
            <option key={c.id} value={c.name} />
          ))}
        </datalist>
      </Field>

      {linked && (
        <div className="rounded-control bg-surface-2 p-3">
          <input type="hidden" name="catalog_id" value={linked.id} />
          <p className="mb-2 text-[11px] text-muted">
            Músculos de «{linked.name}» (se editan en la biblioteca de ejercicios)
          </p>
          <MuscleChips primary={linked.primary} secondary={linked.secondary} />
        </div>
      )}

      {isNew && (
        <div className="rounded-control border border-line p-3">
          <p className="mb-3 text-xs text-fg">
            Es un ejercicio nuevo: se agregará a tu catálogo. Indicá qué músculos trabaja (al menos uno principal).
          </p>
          <MusclePicker key={name.trim().length > 0 ? "new" : "empty"} muscles={muscles} />
        </div>
      )}
    </div>
  );
}
