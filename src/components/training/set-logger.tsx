"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { ActionForm } from "@/components/ui/action-form";
import { buttonClass, Field, inputClass } from "@/components/ui/button";
import { addExtraExercise, deleteSet, logSet, updateSet } from "@/features/training/actions";
import type { CatalogExercise, Muscle } from "@/features/training/types";
import { formatShort } from "@/lib/dates";
import { nf } from "@/lib/format";
import { ExercisePicker } from "./exercise-picker";
import { MuscleChips } from "./muscle-chips";

type SetData = {
  id: number;
  set_number: number;
  weight_kg: number;
  reps: number;
  kind: "normal" | "warmup" | "failure" | "drop";
  duration_seconds: number | null;
};

const KIND_LABEL = { normal: "", warmup: "Calentamiento", failure: "Al fallo", drop: "Descendente" } as const;
const KIND_TAG = { normal: "", warmup: "C", failure: "F", drop: "D" } as const;

export type ExerciseBlock = {
  position: number;
  name: string;
  workoutExerciseId: number | null;
  catalogId: number | null;
  muscles: { primary: { id: number; name: string }[]; secondary: { id: number; name: string }[] };
  targetSets: number | null;
  repRange: string | null;
  sets: SetData[];
  last: { session_date: string; sets: { weight_kg: number; reps: number }[] } | null;
};

function SetRow({ set, index }: { set: SetData; index: number }) {
  const [weight, setWeight] = useState(String(set.weight_kg));
  const [reps, setReps] = useState(String(set.reps));
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const dirty = Number(weight) !== set.weight_kg || Number(reps) !== set.reps;

  const save = () =>
    start(async () => {
      const fd = new FormData();
      fd.set("weight_kg", weight);
      fd.set("reps", reps);
      const r = await updateSet(set.id, fd);
      setError(r.ok ? null : r.error);
    });

  const numCls =
    "h-9 w-full rounded-control border border-line-strong bg-surface px-2 text-center text-sm tabular-nums focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25";

  return (
    <div>
      <div className="grid grid-cols-[2rem_1fr_1fr_auto] items-center gap-2">
        <span
          className="text-center text-xs text-muted tabular-nums"
          title={KIND_LABEL[set.kind] || undefined}
          aria-label={KIND_LABEL[set.kind] ? `Serie ${index + 1}: ${KIND_LABEL[set.kind].toLowerCase()}` : undefined}
        >
          {set.kind === "normal" ? (
            index + 1
          ) : (
            <span className="rounded bg-surface-2 px-1 py-0.5 text-[10px] font-medium">{KIND_TAG[set.kind]}</span>
          )}
        </span>
        <input
          aria-label={`Peso de la serie ${index + 1} en kg`}
          type="number"
          step="any"
          min={0}
          inputMode="decimal"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && dirty && save()}
          className={numCls}
        />
        {set.duration_seconds != null && set.duration_seconds > 0 ? (
          <span className="grid h-9 place-items-center rounded-control bg-surface-2 text-sm tabular-nums text-muted" title="Serie medida por tiempo">
            {set.duration_seconds} s
          </span>
        ) : (
          <input
            aria-label={`Repeticiones de la serie ${index + 1}`}
            type="number"
            min={0}
            inputMode="numeric"
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && dirty && save()}
            className={numCls}
          />
        )}
        <div className="flex w-[4.5rem] justify-end gap-1">
          {dirty ? (
            <button type="button" onClick={save} disabled={pending} className={buttonClass("primary", "sm")}>
              Guardar
            </button>
          ) : (
            <button
              type="button"
              disabled={pending}
              onClick={() => start(async () => void (await deleteSet(set.id)))}
              className={buttonClass("ghost", "sm", "w-8 px-0")}
              aria-label={`Eliminar serie ${index + 1}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
      {error && <p role="alert" className="pl-10 text-[11px] text-danger">{error}</p>}
    </div>
  );
}

export function ExerciseCard({ sessionId, block }: { sessionId: number; block: ExerciseBlock }) {
  // los calentamientos se muestran pero no cuentan como series de trabajo
  const working = block.sets.filter((s) => s.kind !== "warmup");
  const lastSet = working[working.length - 1] ?? null;
  const hint = lastSet ?? block.last?.sets[working.length] ?? block.last?.sets[block.last.sets.length - 1] ?? null;
  const done = block.targetSets != null && working.length >= block.targetSets;
  let workNumber = 0;

  return (
    <section className="rounded-card border border-line bg-surface p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <header className="mb-3">
        <h3 className="text-sm font-medium">{block.name}</h3>
        {block.targetSets != null && (
          <p className="text-[11px] text-muted">
            Objetivo {block.targetSets} × {block.repRange} · {working.length} registradas{done ? " · completo" : ""}
          </p>
        )}
        <MuscleChips primary={block.muscles.primary} secondary={block.muscles.secondary} className="mt-2" />
      </header>

      {block.last && (
        <p className="mb-3 rounded-control bg-surface-2 px-3 py-2 text-[11px] tabular-nums text-muted">
          Última vez ({formatShort(block.last.session_date)}):{" "}
          {block.last.sets.map((s) => `${nf(s.weight_kg, 1)} kg × ${s.reps}`).join(" · ")}
        </p>
      )}

      <div className="mb-1 grid grid-cols-[2rem_1fr_1fr_auto] gap-2 text-center text-[10px] uppercase tracking-wider text-muted">
        <span>Serie</span>
        <span>kg</span>
        <span>Reps</span>
        <span className="w-[4.5rem]" />
      </div>
      <div className="space-y-2">
        {block.sets.map((s) => {
          if (s.kind !== "warmup") workNumber++;
          return <SetRow key={`${s.id}-${s.weight_kg}-${s.reps}`} set={s} index={workNumber - 1} />;
        })}
      </div>

      <ActionForm
        key={block.sets.length}
        action={logSet.bind(null, sessionId, {
          position: block.position,
          name: block.name,
          workoutExerciseId: block.workoutExerciseId,
          catalogId: block.catalogId,
        })}
        hideSubmit
        reset={false}
        className="mt-2"
      >
        <div className="grid grid-cols-[2rem_1fr_1fr_auto] items-center gap-2">
          <span className="text-center text-xs text-muted tabular-nums">{working.length + 1}</span>
          <input
            name="weight_kg"
            aria-label="Peso en kg de la próxima serie"
            type="number"
            step="any"
            min={0}
            required
            inputMode="decimal"
            defaultValue={hint ? hint.weight_kg : ""}
            placeholder="kg"
            className={`${inputClass} !h-9 text-center tabular-nums`}
          />
          <input
            name="reps"
            aria-label="Repeticiones de la próxima serie"
            type="number"
            min={0}
            required
            inputMode="numeric"
            defaultValue={hint ? hint.reps : ""}
            placeholder="reps"
            className={`${inputClass} !h-9 text-center tabular-nums`}
          />
          <button type="submit" className={buttonClass("secondary", "sm", "w-[4.5rem]")}>
            <Plus className="h-3.5 w-3.5" aria-hidden /> Anotar
          </button>
        </div>
      </ActionForm>
    </section>
  );
}

export function AddExerciseForm({
  sessionId,
  catalog,
  muscles,
}: {
  sessionId: number;
  catalog: CatalogExercise[];
  muscles: Muscle[];
}) {
  return (
    <ActionForm action={addExtraExercise.bind(null, sessionId)} submitLabel="Agregar ejercicio" className="space-y-4">
      <ExercisePicker catalog={catalog} muscles={muscles} autoFocus />
      <p className="text-xs text-muted">Anotá la primera serie ahora; después podés agregar más desde la tarjeta.</p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Peso (kg)">
          <input name="weight_kg" type="number" step="any" min={0} required defaultValue={0} className={inputClass} />
        </Field>
        <Field label="Repeticiones">
          <input name="reps" type="number" min={0} required className={inputClass} />
        </Field>
      </div>
    </ActionForm>
  );
}
