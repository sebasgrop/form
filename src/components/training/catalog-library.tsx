"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus, Search } from "lucide-react";
import { ActionButton, ActionForm } from "@/components/ui/action-form";
import { Field, inputClass } from "@/components/ui/button";
import { ModalButton } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/states";
import { removeExercise, saveExercise, saveNewExercise } from "@/features/training/catalog-actions";
import type { CatalogExercise, Muscle } from "@/features/training/types";
import { MuscleChips } from "./muscle-chips";
import { MusclePicker } from "./muscle-picker";

export function CatalogForm({ muscles, exercise }: { muscles: Muscle[]; exercise?: CatalogExercise }) {
  const action = exercise ? saveExercise.bind(null, exercise.id) : saveNewExercise;
  return (
    <ActionForm action={action} submitLabel={exercise ? "Guardar cambios" : "Crear ejercicio"} reset={!exercise} className="space-y-4">
      <Field label="Nombre">
        <input name="name" required maxLength={80} defaultValue={exercise?.name} className={inputClass} placeholder="Ej.: Press de banca" />
      </Field>
      <MusclePicker
        muscles={muscles}
        initialPrimary={exercise?.primary.map((m) => m.id)}
        initialSecondary={exercise?.secondary.map((m) => m.id)}
      />
    </ActionForm>
  );
}

export function CatalogLibrary({ catalog, muscles }: { catalog: CatalogExercise[]; muscles: Muscle[] }) {
  const [q, setQ] = useState("");
  const [group, setGroup] = useState("");
  const groups = useMemo(() => [...new Set(muscles.map((m) => m.muscle_group))], [muscles]);

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return catalog.filter(
      (e) =>
        (!term || e.name.toLowerCase().includes(term) || [...e.primary, ...e.secondary].some((m) => m.name.toLowerCase().includes(term))) &&
        (!group || e.primary.some((m) => m.muscle_group === group)),
    );
  }, [catalog, q, group]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-48 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar ejercicio o músculo"
            aria-label="Buscar ejercicio o músculo"
            className={`${inputClass} pl-9`}
          />
        </div>
        <select value={group} onChange={(e) => setGroup(e.target.value)} aria-label="Filtrar por grupo muscular" className={`${inputClass} !w-auto`}>
          <option value="">Todos los grupos</option>
          {groups.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
        <ModalButton title="Nuevo ejercicio" label="Nuevo ejercicio" variant="primary" icon={<Plus className="h-4 w-4" />} wide>
          <CatalogForm muscles={muscles} />
        </ModalButton>
      </div>

      <p className="mb-3 text-xs text-muted" aria-live="polite">
        {shown.length} de {catalog.length} ejercicios
      </p>

      {shown.length === 0 ? (
        <EmptyState title="Sin resultados" description="Probá con otra búsqueda o creá un ejercicio nuevo." />
      ) : (
        <ul className="divide-y divide-line">
          {shown.map((e) => (
            <li key={e.id} className="flex items-start gap-2 py-3">
              <div className="min-w-0 flex-1">
                <p className="mb-1.5 text-sm font-medium">{e.name}</p>
                <MuscleChips primary={e.primary} secondary={e.secondary} />
              </div>
              <ModalButton
                title="Editar ejercicio"
                variant="ghost"
                size="sm"
                ariaLabel={`Editar ${e.name}`}
                icon={<Pencil className="h-3.5 w-3.5" />}
                wide
              >
                <CatalogForm muscles={muscles} exercise={e} />
              </ModalButton>
              <ActionButton
                action={removeExercise.bind(null, e.id)}
                confirm={`¿Eliminar «${e.name}» del catálogo? Las rutinas y series existentes conservan su nombre.`}
                ariaLabel={`Eliminar ${e.name}`}
              >
                Eliminar
              </ActionButton>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
