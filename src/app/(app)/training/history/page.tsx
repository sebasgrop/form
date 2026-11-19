import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Card, PageHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import { ActionButton } from "@/components/ui/action-form";
import { buttonClass, inputClass } from "@/components/ui/button";
import { deleteSession } from "@/features/training/actions";
import { listSessions } from "@/features/training/queries";
import { formatShort, parseISODate } from "@/lib/dates";
import { nf } from "@/lib/format";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Historial de entrenamientos" };

const PAGE_SIZE = 30;

export default async function HistoryPage({ searchParams }: { searchParams: Promise<{ page?: string; q?: string }> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").slice(0, 80);
  const requested = Math.max(1, Math.floor(Number(sp.page)) || 1);
  const first = listSessions({ limit: PAGE_SIZE, offset: 0, q });
  const pages = Math.max(1, Math.ceil(first.total / PAGE_SIZE));
  const page = Math.min(requested, pages);
  const { rows, total } = page === 1 ? first : listSessions({ limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE, q });

  const href = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (p > 1) params.set("page", String(p));
    const s = params.toString();
    return `/training/history${s ? `?${s}` : ""}`;
  };

  // agrupar por mes para leer mejor un historial largo
  const monthOf = (d: string) => {
    const label = parseISODate(d).toLocaleDateString("es-AR", { month: "long", year: "numeric" });
    return label.charAt(0).toUpperCase() + label.slice(1);
  };
  const groups: { month: string; items: typeof rows }[] = [];
  for (const r of rows) {
    const m = monthOf(r.session_date);
    const last = groups[groups.length - 1];
    if (last?.month === m) last.items.push(r);
    else groups.push({ month: m, items: [r] });
  }

  return (
    <>
      <Link href="/training" className="mb-3 inline-flex items-center gap-1 text-xs text-muted hover:text-fg">
        <ChevronLeft className="h-3.5 w-3.5" aria-hidden /> Entrenamiento
      </Link>
      <PageHeader title="Historial de entrenamientos" subtitle={`${nf(total)} ${total === 1 ? "entrenamiento" : "entrenamientos"}${q ? ` que coinciden con «${q}»` : ""}`} />

      <form method="get" className="mb-5 flex max-w-xl gap-2" role="search">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
          <input
            name="q"
            defaultValue={q}
            placeholder="Buscar por nombre o ejercicio"
            aria-label="Buscar por nombre o ejercicio"
            className={`${inputClass} pl-9`}
          />
        </div>
        <button className={buttonClass("secondary")}>Buscar</button>
        {q && (
          <Link href="/training/history" className={buttonClass("ghost")}>
            Limpiar
          </Link>
        )}
      </form>

      {rows.length === 0 ? (
        <EmptyState title="No hay entrenamientos" description={q ? "Probá con otra búsqueda." : "Los entrenamientos terminados aparecen acá."} />
      ) : (
        <div className="space-y-5">
          {groups.map((g) => (
            <Card key={g.month}>
              <h2 className="mb-2 text-sm font-medium">{g.month}</h2>
              <ul className="divide-y divide-line">
                {g.items.map((s) => (
                  <li key={s.id} className="flex items-center gap-2 py-2.5">
                    <Link href={`/training/session/${s.id}`} className="group min-w-0 flex-1">
                      <p className="flex items-center gap-1 truncate text-sm group-hover:text-accent-strong">
                        {s.name}
                        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted" aria-hidden />
                      </p>
                      <p className="text-[11px] tabular-nums text-muted">
                        {formatShort(s.session_date)} · {s.exercise_count} ejercicios · {s.set_count} series · {nf(s.volume)} kg de volumen
                      </p>
                    </Link>
                    <ActionButton
                      action={deleteSession.bind(null, s.id)}
                      confirm={`¿Eliminar el entrenamiento «${s.name}» del ${s.session_date} y todas sus series?`}
                      ariaLabel={`Eliminar entrenamiento ${s.name} ${s.session_date}`}
                    >
                      Eliminar
                    </ActionButton>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}

      {pages > 1 && (
        <nav aria-label="Paginación" className="mt-5 flex items-center justify-between">
          <Link
            href={href(page - 1)}
            aria-disabled={page === 1}
            className={cn(buttonClass("secondary", "sm"), page === 1 && "pointer-events-none opacity-40")}
          >
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden /> Más recientes
          </Link>
          <span className="text-xs tabular-nums text-muted">
            Página {page} de {pages}
          </span>
          <Link
            href={href(page + 1)}
            aria-disabled={page === pages}
            className={cn(buttonClass("secondary", "sm"), page === pages && "pointer-events-none opacity-40")}
          >
            Más antiguos <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </nav>
      )}
    </>
  );
}
