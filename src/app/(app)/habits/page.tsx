import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Flame, Pencil, Plus } from "lucide-react";
import { Card, CardHeader, PageHeader, Stat } from "@/components/ui/card";
import { ModalButton } from "@/components/ui/modal";
import { ActionButton } from "@/components/ui/action-form";
import { EmptyState } from "@/components/ui/states";
import { HabitItem } from "@/components/habits/habit-item";
import { HabitForm } from "@/components/habits/habit-form";
import { buttonClass } from "@/components/ui/button";
import { deleteHabit } from "@/features/habits/actions";
import { computeStats, dailyCompletion, listHabits, logsInRange } from "@/features/habits/queries";
import { habitViewForDate } from "@/features/habits/view";
import { WEEKDAYS_SHORT, addDays, formatLong, formatShort, lastNDays, today } from "@/lib/dates";
import { cn } from "@/lib/cn";
import { dateSchema } from "@/lib/schemas";

export const metadata: Metadata = { title: "Hábitos" };

const CATEGORY_LABEL: Record<string, string> = {
  nutrition: "Nutrición",
  activity: "Actividad física",
  recovery: "Recuperación",
  wellbeing: "Bienestar",
  custom: "Personalizados",
};

export default async function HabitsPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const sp = await searchParams;
  const parsed = dateSchema.safeParse(sp.date);
  const t = today();
  const date = parsed.success && parsed.data <= t ? parsed.data : t;

  const items = habitViewForDate(date);
  const doneCount = items.filter((h) => h.done).length;
  const pct = items.length ? Math.round((doneCount / items.length) * 100) : 0;

  const week = dailyCompletion(lastNDays(7, t)).filter((d) => d.scheduled > 0);
  const weekAvg = week.length ? Math.round(week.reduce((s, d) => s + d.pct, 0) / week.length) : 0;
  const history = dailyCompletion(lastNDays(28, t));
  const bestStreak = items.reduce((m, h) => Math.max(m, h.stats.streak), 0);

  const manage = listHabits();
  const logs = logsInRange(addDays(t, -130), t);

  const groups = Object.keys(CATEGORY_LABEL)
    .map((c) => ({ key: c, items: items.filter((h) => h.category === c) }))
    .filter((g) => g.items.length);

  return (
    <>
      <PageHeader
        title="Hábitos"
        subtitle={formatLong(date)}
        action={
          <ModalButton title="Nuevo hábito" label="Nuevo hábito" variant="primary" icon={<Plus className="h-4 w-4" />}>
            <HabitForm />
          </ModalButton>
        }
      />

      <div className="mb-5 flex items-center gap-2">
        <Link href={`/habits?date=${addDays(date, -1)}`} className={buttonClass("secondary", "sm", "w-8 px-0")} aria-label="Día anterior">
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <Link
          href={`/habits?date=${addDays(date, 1)}`}
          aria-disabled={date >= t}
          className={buttonClass("secondary", "sm", cn("w-8 px-0", date >= t && "pointer-events-none opacity-40"))}
          aria-label="Día siguiente"
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
        {date !== t && (
          <Link href="/habits" className={buttonClass("ghost", "sm")}>
            Volver a hoy
          </Link>
        )}
      </div>

      <div className="mb-5 grid grid-cols-3 gap-3">
        <Stat label={date === t ? "Hoy" : formatShort(date)} value={`${pct}%`} sub={`${doneCount} de ${items.length} completados`} />
        <Stat label="Promedio 7 días" value={`${weekAvg}%`} />
        <Stat label="Mejor racha actual" value={String(bestStreak)} unit={bestStreak === 1 ? "día" : "días"} />
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        <div className="min-w-0 space-y-5 lg:col-span-3">
          {groups.length === 0 ? (
            <EmptyState title="No hay hábitos programados para este día" description="Creá un hábito o ajustá la frecuencia de uno existente." />
          ) : (
            groups.map((g) => (
              <Card key={g.key}>
                <CardHeader title={CATEGORY_LABEL[g.key]} hint={`${g.items.filter((h) => h.done).length} de ${g.items.length}`} />
                <ul className="divide-y divide-line">
                  {g.items.map((h) => (
                    <HabitItem key={`${h.id}-${date}`} habit={h} date={date} />
                  ))}
                </ul>
              </Card>
            ))
          )}
        </div>

        <div className="min-w-0 space-y-5 lg:col-span-2">
          <Card>
            <CardHeader title="Últimos 28 días" hint="Porcentaje de hábitos programados completados por día" />
            <div className="grid grid-cols-7 gap-1.5" role="img" aria-label="Historial de cumplimiento de hábitos de los últimos 28 días">
              {history.map((d) => (
                <Link
                  key={d.date}
                  href={`/habits?date=${d.date}`}
                  title={`${formatShort(d.date)}: ${d.scheduled ? `${d.pct}% (${d.done}/${d.scheduled})` : "nada programado"}`}
                  className={cn(
                    "aspect-square rounded-md border border-line transition-transform hover:scale-110",
                    d.date === date && "outline-2 outline-offset-1 outline-accent-strong",
                  )}
                  style={{
                    background: d.scheduled
                      ? `color-mix(in srgb, var(--color-accent) ${Math.max(d.pct, 6)}%, var(--color-surface-2))`
                      : "var(--color-surface-2)",
                  }}
                >
                  <span className="sr-only">{formatShort(d.date)}</span>
                </Link>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-muted">Tocá un día para verlo o editarlo.</p>
          </Card>

          <Card>
            <CardHeader title="Administrar hábitos" hint="Los registros pasados se conservan al editar o quitar un hábito" />
            {manage.length === 0 ? (
              <EmptyState title="Todavía no hay hábitos" />
            ) : (
              <ul className="divide-y divide-line">
                {manage.map((h) => {
                  const s = computeStats(h, logs, t);
                  const sched = h.days.length === 7 ? "Todos los días" : h.days.map((d) => WEEKDAYS_SHORT[d - 1]).join(" ");
                  return (
                    <li key={h.id} className="flex items-center gap-2 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm">{h.name}</p>
                        <p className="flex items-center gap-2 text-[11px] text-muted">
                          <span>{sched}</span>
                          <span>{s.rate30 == null ? "Sin datos" : `${s.rate30}% en 30 d`}</span>
                          {s.streak > 0 && (
                            <span className="flex items-center gap-0.5">
                              <Flame className="h-3 w-3 text-accent" aria-hidden />
                              {s.streak}
                            </span>
                          )}
                        </p>
                      </div>
                      <ModalButton
                        title="Editar hábito"
                        variant="ghost"
                        size="sm"
                        ariaLabel={`Editar ${h.name}`}
                        icon={<Pencil className="h-3.5 w-3.5" />}
                      >
                        <HabitForm
                          habit={{
                            id: h.id,
                            name: h.name,
                            category: h.category,
                            type: h.type,
                            target_value: h.target_value,
                            target_max: h.target_max,
                            unit: h.unit,
                            days: h.days,
                            linked: !!h.system_key,
                          }}
                        />
                      </ModalButton>
                      <ActionButton
                        action={deleteHabit.bind(null, h.id)}
                        confirm={`¿Quitar «${h.name}»? Los registros pasados se conservan.`}
                        ariaLabel={`Quitar ${h.name}`}
                      >
                        Quitar
                      </ActionButton>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
