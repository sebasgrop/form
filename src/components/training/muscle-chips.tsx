import { cn } from "@/lib/cn";

type M = { id: number; name: string };

/** Músculos principales (relleno) y accesorios (contorno) de un ejercicio. */
export function MuscleChips({ primary, secondary, className }: { primary: M[]; secondary: M[]; className?: string }) {
  if (primary.length === 0 && secondary.length === 0) {
    return <p className={cn("text-[11px] text-muted", className)}>Sin músculos asignados</p>;
  }
  return (
    <ul className={cn("flex flex-wrap gap-1", className)} aria-label="Músculos involucrados">
      {primary.map((m) => (
        <li key={m.id} className="rounded-full bg-accent-strong px-2 py-0.5 text-[10px] font-medium text-white">
          <span className="sr-only">Principal: </span>
          {m.name}
        </li>
      ))}
      {secondary.map((m) => (
        <li key={m.id} className="rounded-full border border-accent/40 bg-accent-soft px-2 py-0.5 text-[10px] text-accent-strong">
          <span className="sr-only">Accesorio: </span>
          {m.name}
        </li>
      ))}
    </ul>
  );
}
