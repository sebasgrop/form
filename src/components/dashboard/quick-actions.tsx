"use client";

import { useState, useTransition } from "react";
import { Droplets, Plus } from "lucide-react";
import { ActionForm } from "@/components/ui/action-form";
import { buttonClass, inputClass } from "@/components/ui/button";
import { saveMeasurement } from "@/features/body/actions";
import { setHabitValue } from "@/features/habits/actions";

export function QuickWeight({ latest }: { latest: number | null }) {
  return (
    <ActionForm action={saveMeasurement} hideSubmit className="flex items-center gap-2">
      <label className="sr-only" htmlFor="qw">
        Peso en kilogramos
      </label>
      <input
        id="qw"
        name="weight_kg"
        type="number"
        step="0.1"
        min={20}
        max={400}
        required
        inputMode="decimal"
        placeholder={latest ? String(latest).replace(".", ",") : "kg"}
        className={`${inputClass} !h-9 w-24`}
      />
      <button type="submit" className={buttonClass("secondary", "sm")}>
        Anotar peso
      </button>
    </ActionForm>
  );
}

export function WaterQuickAdd({ habitId, date, current }: { habitId: number; date: string; current: number }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const add = (ml: number) =>
    start(async () => {
      const r = await setHabitValue(habitId, date, Math.max(0, current + ml));
      setError(r.ok ? null : r.error);
    });
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {[250, 500].map((ml) => (
          <button key={ml} type="button" disabled={pending} onClick={() => add(ml)} className={buttonClass("secondary", "sm")}>
            <Plus className="h-3 w-3" aria-hidden />
            {ml} ml
          </button>
        ))}
        <button type="button" disabled={pending || current <= 0} onClick={() => add(-250)} className={buttonClass("ghost", "sm")}>
          <Droplets className="h-3 w-3" aria-hidden />
          Quitar 250
        </button>
      </div>
      {error && <p role="alert" className="mt-1 text-[11px] text-danger">{error}</p>}
    </div>
  );
}
