"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import type { Muscle } from "@/features/training/types";

type Role = "primary" | "secondary";

const NEXT: Record<string, Role | undefined> = { none: "primary", primary: "secondary", secondary: undefined };
const STATE_LABEL: Record<string, string> = { none: "sin asignar", primary: "principal", secondary: "accesorio" };

/**
 * Selector de músculos: tocá un músculo para marcarlo como principal, otra vez como accesorio,
 * y una tercera vez para quitarlo. Envía los ids en los campos `primary` y `secondary`.
 */
export function MusclePicker({
  muscles,
  initialPrimary = [],
  initialSecondary = [],
}: {
  muscles: Muscle[];
  initialPrimary?: number[];
  initialSecondary?: number[];
}) {
  const [roles, setRoles] = useState<Record<number, Role | undefined>>(() => {
    const r: Record<number, Role | undefined> = {};
    initialSecondary.forEach((id) => (r[id] = "secondary"));
    initialPrimary.forEach((id) => (r[id] = "primary"));
    return r;
  });

  const groups = [...new Set(muscles.map((m) => m.muscle_group))];
  const cycle = (id: number) => setRoles((p) => ({ ...p, [id]: NEXT[p[id] ?? "none"] }));
  const ids = (role: Role) => Object.entries(roles).filter(([, r]) => r === role).map(([id]) => id);

  return (
    <fieldset>
      <legend className="mb-1 text-xs text-muted">Músculos involucrados</legend>
      <p className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
        Tocá para alternar:
        <span className="rounded-full bg-accent-strong px-2 py-0.5 text-[10px] font-medium text-white">1 vez: principal</span>
        <span className="rounded-full border border-accent/40 bg-accent-soft px-2 py-0.5 text-[10px] text-accent-strong">2 veces: accesorio</span>
        <span>3 veces: quitar</span>
      </p>
      <div className="space-y-3">
        {groups.map((g) => (
          <div key={g}>
            <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted">{g}</p>
            <div className="flex flex-wrap gap-1.5">
              {muscles
                .filter((m) => m.muscle_group === g)
                .map((m) => {
                  const state = roles[m.id] ?? "none";
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => cycle(m.id)}
                      aria-label={`${m.name}: ${STATE_LABEL[state]}`}
                      className={cn(
                        "select-none rounded-full border px-2.5 py-1 text-xs transition-colors",
                        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                        state === "primary" && "border-accent-strong bg-accent-strong font-medium text-white",
                        state === "secondary" && "border-accent/40 bg-accent-soft text-accent-strong",
                        state === "none" && "border-line-strong text-muted hover:bg-surface-2 hover:text-fg",
                      )}
                    >
                      {m.name}
                    </button>
                  );
                })}
            </div>
          </div>
        ))}
      </div>
      {ids("primary").map((id) => (
        <input key={`p${id}`} type="hidden" name="primary" value={id} />
      ))}
      {ids("secondary").map((id) => (
        <input key={`s${id}`} type="hidden" name="secondary" value={id} />
      ))}
    </fieldset>
  );
}
