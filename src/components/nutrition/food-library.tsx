"use client";

import { useMemo, useState } from "react";
import { Pencil, Search } from "lucide-react";
import { ActionButton } from "@/components/ui/action-form";
import { inputClass } from "@/components/ui/button";
import { ModalButton } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/states";
import { deleteFood } from "@/features/nutrition/actions";
import { matchesSearch } from "@/lib/text";
import { FoodForm } from "./forms";

type Food = {
  id: number;
  name: string;
  serving_size: number;
  serving_unit: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  source: string;
  fdc_id: number | null;
  reference: string | null;
};

export function FoodLibraryList({ foods }: { foods: Food[] }) {
  const [q, setQ] = useState("");
  const shown = useMemo(() => foods.filter((f) => matchesSearch(`${f.name} ${f.reference ?? ""}`, q)), [foods, q]);

  if (foods.length === 0) return <EmptyState title="No hay alimentos" description="Creá un alimento propio para empezar a registrar." />;

  return (
    <div>
      <div className="relative mb-2">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar en mi biblioteca"
          aria-label="Buscar en mi biblioteca de alimentos"
          className={`${inputClass} pl-9`}
        />
      </div>
      <p className="mb-1 text-[11px] text-muted" aria-live="polite">
        {shown.length} de {foods.length} alimentos
      </p>
      {shown.length === 0 ? (
        <p className="rounded-control bg-surface-2 px-3 py-6 text-center text-sm text-muted">Sin resultados para «{q}».</p>
      ) : (
        <ul className="max-h-[32rem] divide-y divide-line overflow-y-auto">
          {shown.map((f) => (
            <li key={f.id} className="flex items-center gap-2 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
                  <span className="min-w-0 break-words">{f.name}</span>
                  {f.fdc_id && (
                    <span className="shrink-0 rounded-full border border-accent/40 bg-accent-soft px-1.5 py-px text-[10px] text-accent-strong">USDA</span>
                  )}
                  {f.reference && (
                    <span className="shrink-0 rounded-full border border-accent/40 bg-accent-soft px-1.5 py-px text-[10px] text-accent-strong">{f.reference}</span>
                  )}
                  {f.source === "seed_approx" && (
                    <span className="shrink-0 rounded-full border border-line-strong px-1.5 py-px text-[10px] text-muted">aprox.</span>
                  )}
                </p>
                <p className="text-[11px] tabular-nums text-muted">
                  {f.serving_size} {f.serving_unit}: {f.calories} kcal · P {f.protein_g} · C {f.carbs_g} · G {f.fat_g}
                </p>
              </div>
              <ModalButton title="Editar alimento" variant="ghost" size="sm" ariaLabel={`Editar ${f.name}`} icon={<Pencil className="h-3.5 w-3.5" />}>
                <FoodForm food={f} />
              </ModalButton>
              <ActionButton
                action={deleteFood.bind(null, f.id)}
                confirm={`¿Quitar «${f.name}» de la biblioteca? Las comidas registradas conservan sus valores.`}
                ariaLabel={`Quitar ${f.name}`}
              >
                Quitar
              </ActionButton>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
