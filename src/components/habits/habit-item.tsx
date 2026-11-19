"use client";

import { useOptimistic, useState, useTransition } from "react";
import { Check, Flame } from "lucide-react";
import { cn } from "@/lib/cn";
import { nf } from "@/lib/format";
import { setHabitValue, toggleHabit } from "@/features/habits/actions";

export type HabitItemData = {
  id: number;
  name: string;
  type: "boolean" | "numeric";
  target_value: number | null;
  target_max: number | null;
  unit: string | null;
  value: number | null;
  done: boolean;
  streak?: number;
  locked?: string; // explica por qué un hábito vinculado es automático
};

export function HabitItem({ habit, date }: { habit: HabitItemData; date: string }) {
  const [, start] = useTransition();
  const [done, setDone] = useOptimistic(habit.done);
  const [error, setError] = useState<string | null>(null);

  const target =
    habit.type === "numeric" && habit.target_value != null
      ? habit.target_max != null
        ? `${nf(habit.target_value, 1)}–${nf(habit.target_max, 1)} ${habit.unit ?? ""}`
        : `${nf(habit.target_value, 1)} ${habit.unit ?? ""}`
      : null;

  function toggle() {
    setError(null);
    start(async () => {
      setDone(!done);
      const r = await toggleHabit(habit.id, date, !done);
      if (!r.ok) setError(r.error);
    });
  }

  function saveValue(raw: string) {
    const v = raw.trim() === "" ? null : Number(raw);
    if (v === habit.value) return;
    setError(null);
    start(async () => {
      const r = await setHabitValue(habit.id, date, v);
      if (!r.ok) setError(r.error);
    });
  }

  const isDone = habit.type === "boolean" ? done : habit.done;

  return (
    <li className="flex items-center gap-3 py-2.5">
      {habit.type === "boolean" ? (
        <button
          type="button"
          role="checkbox"
          aria-checked={done}
          aria-label={`${habit.name}: ${done ? "completado" : "pendiente"}`}
          onClick={toggle}
          className={cn(
            "grid h-6 w-6 shrink-0 place-items-center rounded-full border transition-all duration-200",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
            done
              ? "border-accent-strong bg-accent-strong text-white"
              : "border-line-strong text-transparent hover:border-accent hover:text-accent/40",
          )}
        >
          <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
        </button>
      ) : (
        <span
          aria-hidden
          className={cn(
            "grid h-6 w-6 shrink-0 place-items-center rounded-full border transition-colors",
            habit.done ? "border-accent-strong bg-accent-strong text-white" : "border-line-strong text-transparent",
          )}
        >
          <Check className="h-3.5 w-3.5" strokeWidth={3} />
        </span>
      )}

      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-sm", isDone && "text-muted line-through decoration-line-strong")}>{habit.name}</p>
        {(target || habit.locked) && (
          <p className="text-[11px] text-muted">{habit.locked ? habit.locked : `Objetivo ${target}`}</p>
        )}
        {error && <p role="alert" className="text-[11px] text-danger">{error}</p>}
      </div>

      {habit.type === "numeric" && (
        <label className="flex items-center gap-1.5">
          <span className="sr-only">Cantidad de {habit.name}</span>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            defaultValue={habit.value ?? ""}
            key={habit.value ?? "empty"}
            placeholder="0"
            onBlur={(e) => saveValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            className="h-8 w-20 rounded-control border border-line-strong bg-surface px-2 text-right text-sm tabular-nums focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
          />
          <span className="w-12 text-[11px] text-muted">{habit.unit}</span>
        </label>
      )}

      {habit.streak != null && habit.streak > 1 && (
        <span className="flex items-center gap-1 text-[11px] text-muted tabular-nums" title={`Racha de ${habit.streak} días`}>
          <Flame className="h-3.5 w-3.5 text-accent" aria-hidden />
          {habit.streak}
        </span>
      )}
    </li>
  );
}
