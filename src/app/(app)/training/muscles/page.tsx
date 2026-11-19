import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Card, CardHeader, PageHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import { ProgressBar } from "@/components/ui/progress";
import { buttonClass } from "@/components/ui/button";
import { StackedSetsChart } from "@/components/charts/stacked-bars";
import { TrendChart } from "@/components/charts/line-chart";
import { muscleProgress, type Bucket, type ProgressEntry } from "@/features/training/progress";
import { formatShort } from "@/lib/dates";
import { nf } from "@/lib/format";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Progreso por músculo" };

const PERIODS = [4, 8, 12, 26, 52] as const;

function delta(cur: number, prev: number): string {
  if (prev === 0) return cur > 0 ? "nuevo" : "—";
  const p = Math.round(((cur - prev) / prev) * 100);
  return `${p > 0 ? "+" : ""}${p}%`;
}

const total = (b: Bucket) => b.primarySets + b.secondarySets;

export default async function MusclesPage({ searchParams }: { searchParams: Promise<{ w?: string; g?: string; m?: string }> }) {
  const sp = await searchParams;
  const weeks = PERIODS.find((p) => String(p) === sp.w) ?? 8;
  const data = muscleProgress(weeks);

  const href = (params: { g?: string; m?: string }) => {
    const q = new URLSearchParams({ w: String(weeks) });
    if (params.g) q.set("g", params.g);
    if (params.m) q.set("m", params.m);
    return `/training/muscles?${q}`;
  };

  // selección: músculo (?m) o grupo (?g); por defecto el grupo con más series principales
  const byKey = new Map(data.muscles.map((m) => [m.key, m]));
  const byGroup = new Map(data.groups.map((g) => [g.key, g]));
  let selected: ProgressEntry | undefined = sp.m ? byKey.get(sp.m) : sp.g ? byGroup.get(sp.g) : undefined;
  selected ??= [...data.groups].sort((a, b) => b.cur.primarySets - a.cur.primarySets)[0];
  const isGroup = selected ? byGroup.has(selected.key) && !byKey.has(selected.key) : false;

  const maxMuscleSets = Math.max(1, ...data.muscles.map((m) => total(m.cur)));
  const groupNames = data.groups.map((g) => g.key);

  return (
    <>
      <Link href="/training" className="mb-3 inline-flex items-center gap-1 text-xs text-muted hover:text-fg">
        <ChevronLeft className="h-3.5 w-3.5" aria-hidden /> Entrenamiento
      </Link>
      <PageHeader
        title="Progreso por músculo"
        subtitle="Series, volumen y carga de tus entrenamientos terminados, según los músculos de cada ejercicio."
        action={
          <nav aria-label="Período" className="flex gap-1 rounded-control border border-line bg-surface p-1">
            {PERIODS.map((p) => (
              <Link
                key={p}
                href={`/training/muscles?w=${p}`}
                aria-current={p === weeks ? "page" : undefined}
                className={cn(
                  "rounded-[10px] px-3 py-1.5 text-xs transition-colors",
                  p === weeks ? "bg-accent-strong font-medium text-white" : "text-muted hover:bg-surface-2 hover:text-fg",
                )}
              >
                {p} semanas
              </Link>
            ))}
          </nav>
        }
      />

      {!data.hasData ? (
        <EmptyState
          title="Todavía no hay series en este período"
          description="Terminá un entrenamiento con ejercicios del catálogo y acá vas a ver cuánto trabajaste cada músculo."
          action={
            <Link href="/training" className={buttonClass("secondary")}>
              Ir a entrenamiento
            </Link>
          }
        />
      ) : (
        <>
          {/* Grupos musculares */}
          <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            {data.groups.map((g) => {
              const active = isGroup && selected?.key === g.key;
              return (
                <Link
                  key={g.key}
                  href={href({ g: g.key })}
                  aria-current={active ? "true" : undefined}
                  className={cn(
                    "min-w-0 rounded-card border bg-surface p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors hover:border-accent",
                    active ? "border-accent ring-2 ring-accent/25" : "border-line",
                  )}
                >
                  <p className="text-xs text-muted">{g.name}</p>
                  <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight">
                    {g.cur.primarySets}
                    <span className="ml-1 text-sm font-normal text-muted">series</span>
                  </p>
                  <p className="mt-1 text-[11px] tabular-nums text-muted">
                    +{g.cur.secondarySets} acces. · {delta(g.cur.primarySets, g.prev.primarySets)}
                  </p>
                </Link>
              );
            })}
          </div>

          <div className="grid gap-5 lg:grid-cols-5">
            {/* Detalle */}
            <div className="min-w-0 space-y-5 lg:col-span-3">
              {selected && (
                <Card>
                  <CardHeader
                    title={selected.name}
                    hint={isGroup ? "Grupo muscular" : `Músculo · ${selected.group}`}
                  />
                  <dl className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div>
                      <dt className="text-[11px] text-muted">Series principales</dt>
                      <dd className="text-xl font-semibold tabular-nums">{selected.cur.primarySets}</dd>
                      <dd className="text-[11px] tabular-nums text-muted">{delta(selected.cur.primarySets, selected.prev.primarySets)} vs. anterior</dd>
                    </div>
                    <div>
                      <dt className="text-[11px] text-muted">Series accesorias</dt>
                      <dd className="text-xl font-semibold tabular-nums">{selected.cur.secondarySets}</dd>
                      <dd className="text-[11px] tabular-nums text-muted">{delta(selected.cur.secondarySets, selected.prev.secondarySets)} vs. anterior</dd>
                    </div>
                    <div>
                      <dt className="text-[11px] text-muted">Volumen (kg)</dt>
                      <dd className="text-xl font-semibold tabular-nums">{nf(selected.cur.volume)}</dd>
                      <dd className="text-[11px] tabular-nums text-muted">{delta(selected.cur.volume, selected.prev.volume)} vs. anterior</dd>
                    </div>
                    <div>
                      <dt className="text-[11px] text-muted">Carga máxima</dt>
                      <dd className="text-xl font-semibold tabular-nums">
                        {selected.cur.maxWeight != null ? `${nf(selected.cur.maxWeight, 1)} kg` : "—"}
                      </dd>
                      <dd className="text-[11px] text-muted">
                        {selected.cur.lastDate ? `Último: ${formatShort(selected.cur.lastDate)}` : "Sin entrenar"}
                      </dd>
                    </div>
                  </dl>

                  <h3 className="mb-2 text-xs font-medium text-muted">Series por semana</h3>
                  <StackedSetsChart
                    data={selected.weekly.map((w) => ({ label: formatShort(w.weekStart), principal: w.primary, accesorio: w.secondary }))}
                    ariaLabel={`Series por semana de ${selected.name}`}
                  />

                  <h3 className="mb-2 mt-6 text-xs font-medium text-muted">Carga máxima semanal (series principales)</h3>
                  {selected.weekly.filter((w) => w.maxWeight != null).length < 2 ? (
                    <p className="rounded-control bg-surface-2 px-3 py-4 text-center text-xs text-muted">
                      Hacen falta series principales en al menos dos semanas para mostrar la evolución de la carga.
                    </p>
                  ) : (
                    <TrendChart
                      data={selected.weekly.filter((w) => w.maxWeight != null).map((w) => ({ label: formatShort(w.weekStart), value: w.maxWeight as number }))}
                      unit="kg"
                      domainPad={2}
                      ariaLabel={`Carga máxima semanal de ${selected.name}`}
                    />
                  )}
                </Card>
              )}
            </div>

            {/* Lista por músculo */}
            <Card className="h-fit lg:col-span-2">
              <CardHeader title="Por músculo" hint={`Últimas ${weeks} semanas · vs. las ${weeks} anteriores`} />
              <div className="space-y-5">
                {groupNames.map((g) => (
                  <section key={g} aria-label={g}>
                    <h3 className="mb-1 text-[11px] font-medium uppercase tracking-wider text-muted">{g}</h3>
                    <ul className="divide-y divide-line">
                      {data.muscles
                        .filter((m) => m.group === g)
                        .map((m) => {
                          const active = !isGroup && selected?.key === m.key;
                          const idle = total(m.cur) === 0;
                          return (
                            <li key={m.key}>
                              <Link
                                href={href({ m: m.key })}
                                aria-current={active ? "true" : undefined}
                                className={cn(
                                  "-mx-2 block rounded-control px-2 py-2 transition-colors hover:bg-surface-2",
                                  active && "bg-accent-soft",
                                )}
                              >
                                <div className="flex items-baseline justify-between gap-2">
                                  <span className={cn("truncate text-sm", idle && "text-muted")}>{m.name}</span>
                                  <span className="shrink-0 text-[11px] tabular-nums text-muted">
                                    {idle ? "sin series" : delta(m.cur.primarySets, m.prev.primarySets)}
                                  </span>
                                </div>
                                <ProgressBar className="mt-1.5" value={total(m.cur)} max={maxMuscleSets} label={`${m.name}: ${total(m.cur)} series`} />
                                {!idle && (
                                  <p className="mt-1 text-[11px] tabular-nums text-muted">
                                    {m.cur.primarySets} principales · {m.cur.secondarySets} accesorias
                                  </p>
                                )}
                              </Link>
                            </li>
                          );
                        })}
                    </ul>
                  </section>
                ))}
              </div>
            </Card>
          </div>

          <p className="mt-5 text-[11px] text-muted">
            El volumen y la carga máxima cuentan solo las series donde el músculo es principal. Las series accesorias se muestran aparte. Un grupo cuenta cada serie una sola vez.
          </p>
        </>
      )}
    </>
  );
}
