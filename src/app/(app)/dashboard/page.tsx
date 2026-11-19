import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, Dumbbell } from "lucide-react";
import { Card, CardHeader, PageHeader, Stat } from "@/components/ui/card";
import { ProgressBar, Ring } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/states";
import { buttonClass } from "@/components/ui/button";
import { HabitItem } from "@/components/habits/habit-item";
import { TrendChart } from "@/components/charts/line-chart";
import { QuickWeight, WaterQuickAdd } from "@/components/dashboard/quick-actions";
import { dailyCompletion } from "@/features/habits/queries";
import { habitViewForDate, systemHabitDay } from "@/features/habits/view";
import { dailyTotals, goalsFor, totalsForDate } from "@/features/nutrition/queries";
import { activeSession, finishedSessionsBetween, listTemplates, templateForDate } from "@/features/training/queries";
import { getMeasurementOn, latestValue, series } from "@/features/body/queries";
import { addDays, formatLong, formatShort, lastNDays, startOfWeek, today } from "@/lib/dates";
import { all } from "@/lib/db";
import { fixed, nf, signed } from "@/lib/format";

export const metadata: Metadata = { title: "Panel" };

export default function DashboardPage() {
  const t = today();
  const habits = habitViewForDate(t);
  const done = habits.filter((h) => h.done).length;
  const pct = habits.length ? Math.round((done / habits.length) * 100) : 0;

  const goals = goalsFor(t);
  const eaten = totalsForDate(t);
  const water = systemHabitDay("water", t);
  const steps = systemHabitDay("steps", t);
  const sleep = systemHabitDay("sleep", t);
  const weight = latestValue("weight_kg");
  const weightToday = getMeasurementOn(t)?.weight_kg ?? null;

  const tpl = templateForDate(t);
  const active = activeSession();
  const finishedToday =
    (all<{ n: number }>(
      "SELECT COUNT(*) AS n FROM workout_sessions WHERE session_date = ? AND ended_at IS NOT NULL",
      t,
    )[0]?.n ?? 0) > 0;

  // resumen semanal
  const weekStart = startOfWeek(t);
  const weekEnd = addDays(weekStart, 6);
  const workoutsDone = finishedSessionsBetween(weekStart, weekEnd);
  const workoutsPlanned = listTemplates().filter((x) => x.day_of_week != null).length;
  const week = dailyCompletion(lastNDays(7, t)).filter((d) => d.scheduled > 0);
  const weekAvg = week.length ? Math.round(week.reduce((s, d) => s + d.pct, 0) / week.length) : null;
  const protein7 = dailyTotals(addDays(t, -6), t);
  const proteinAvg = protein7.length ? protein7.reduce((s, d) => s + d.protein_g, 0) / protein7.length : null;
  const weightSeries = series("weight_kg", addDays(t, -60)).map((p) => ({ label: formatShort(p.date), value: p.value }));
  const weightChange = weightSeries.length >= 2 ? weightSeries[weightSeries.length - 1].value - weightSeries[0].value : null;

  const calStatus =
    eaten.calories === 0
      ? "Todavía no registraste comidas"
      : eaten.calories > goals.calories * 1.1
        ? "Por encima del objetivo"
        : eaten.calories >= goals.calories * 0.9
          ? "Objetivo cumplido"
          : `Faltan ${nf(goals.calories - eaten.calories)} kcal`;

  const macroRows = [
    { label: "Calorías", v: eaten.calories, g: goals.calories, unit: "kcal" },
    { label: "Proteínas", v: eaten.protein_g, g: goals.protein_g, unit: "g" },
    { label: "Carbohidratos", v: eaten.carbs_g, g: goals.carbs_g, unit: "g" },
    { label: "Grasas", v: eaten.fat_g, g: goals.fat_g, unit: "g" },
  ];

  return (
    <>
      <PageHeader title="Panel" subtitle={formatLong(t)} />

      {/* Resumen del día */}
      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="flex items-center gap-4">
          <Ring value={pct} label={`${pct}% de los hábitos completados`} />
          <div>
            <p className="text-xs text-muted">Hábitos</p>
            <p className="text-sm font-medium tabular-nums">
              {done} de {habits.length}
            </p>
            <Link href="/habits" className="mt-1 inline-flex items-center gap-1 text-xs text-muted hover:text-fg">
              Abrir <ArrowRight className="h-3 w-3" aria-hidden />
            </Link>
          </div>
        </Card>

        <Card>
          <p className="text-xs text-muted">Entrenamiento</p>
          {active ? (
            <>
              <p className="mt-2 text-sm font-medium">{active.name} en curso</p>
              <Link href={`/training/session/${active.id}`} className={buttonClass("primary", "sm", "mt-3")}>
                Retomar
              </Link>
            </>
          ) : finishedToday ? (
            <p className="mt-2 flex items-center gap-2 text-sm font-medium">
              <Check className="h-4 w-4 text-accent-strong" aria-hidden /> Entrenamiento completado
            </p>
          ) : tpl ? (
            <>
              <p className="mt-2 text-sm font-medium">{tpl.name}</p>
              <p className="text-[11px] text-muted">{tpl.exercises.length} ejercicios</p>
              <Link href="/training" className={buttonClass("secondary", "sm", "mt-3")}>
                <Dumbbell className="h-3.5 w-3.5" aria-hidden /> Iniciar
              </Link>
            </>
          ) : (
            <p className="mt-2 text-sm font-medium text-muted">Día de descanso</p>
          )}
        </Card>

        <Card>
          <p className="text-xs text-muted">Alimentación</p>
          <p className="mt-2 text-sm font-medium">{calStatus}</p>
          <p className="text-[11px] tabular-nums text-muted">
            {nf(eaten.calories)} / {nf(goals.calories)} kcal
          </p>
          <ProgressBar className="mt-3" value={eaten.calories} max={goals.calories} label="Calorías" />
        </Card>

        <Card>
          <p className="text-xs text-muted">Hidratación</p>
          {water ? (
            <>
              <p className="mt-2 text-sm font-medium tabular-nums">
                {nf(water.value ?? 0)} / {nf(water.habit.target_value ?? 0)} ml
              </p>
              <ProgressBar className="mt-2 mb-3" value={water.value ?? 0} max={water.habit.target_value ?? 1} label="Agua" />
              <WaterQuickAdd habitId={water.habit.id} date={t} current={water.value ?? 0} />
            </>
          ) : (
            <p className="mt-2 text-xs text-muted">Se quitó el hábito de hidratación. Creá un hábito numérico para seguirla.</p>
          )}
        </Card>
      </div>

      {/* Métricas del día */}
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat
          label="Peso"
          value={weight ? fixed(weight.value) : "—"}
          unit={weight ? "kg" : undefined}
          sub={weight ? (weightToday ? "Registrado hoy" : `Último: ${formatShort(weight.date)}`) : "Todavía sin registrar"}
        />
        <Stat label="Calorías" value={nf(eaten.calories)} unit="kcal" sub={`Objetivo ${nf(goals.calories)}`} />
        <Stat label="Proteínas" value={nf(eaten.protein_g)} unit="g" sub={`Objetivo ${nf(goals.protein_g)}`} />
        <Stat
          label="Pasos"
          value={steps?.value != null ? nf(steps.value) : "—"}
          sub={steps?.habit.target_value ? `Objetivo ${nf(steps.habit.target_value)}` : undefined}
        />
        <Stat
          label="Sueño"
          value={sleep?.value != null ? nf(sleep.value, 1) : "—"}
          unit={sleep?.value != null ? "h" : undefined}
          sub={sleep?.habit.target_value ? `Objetivo ${sleep.habit.target_value}–${sleep.habit.target_max ?? ""} h` : undefined}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        <div className="min-w-0 space-y-5 lg:col-span-3">
          <Card>
            <CardHeader title="Hábitos de hoy" hint="Marcalos o ingresá cantidades" action={<Link href="/habits" className="text-xs text-muted hover:text-fg">Todos los hábitos</Link>} />
            {habits.length === 0 ? (
              <EmptyState title="No hay hábitos programados para hoy" />
            ) : (
              <ul className="divide-y divide-line">
                {habits.map((h) => (
                  <HabitItem key={`${h.id}-${t}`} habit={h} date={t} />
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader
              title="Evolución del peso"
              hint="Últimos 60 días"
              action={<QuickWeight latest={weight?.value ?? null} />}
            />
            {weightSeries.length < 2 ? (
              <EmptyState title="Registrá tu peso en al menos dos días" description="La línea de tendencia aparece cuando hay dos mediciones." />
            ) : (
              <TrendChart data={weightSeries} unit="kg" ariaLabel="Peso corporal de los últimos 60 días" />
            )}
          </Card>
        </div>

        <div className="min-w-0 space-y-5 lg:col-span-2">
          <Card>
            <CardHeader title="Alimentación de hoy" action={<Link href="/nutrition" className="text-xs text-muted hover:text-fg">Registrar comida</Link>} />
            <div className="space-y-4">
              {macroRows.map((m) => (
                <div key={m.label}>
                  <div className="mb-1.5 flex justify-between text-xs">
                    <span>{m.label}</span>
                    <span className="tabular-nums text-muted">
                      {nf(m.v)} / {nf(m.g)} {m.unit}
                    </span>
                  </div>
                  <ProgressBar value={m.v} max={m.g} label={m.label} />
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="Esta semana" hint={`${formatShort(weekStart)} – ${formatShort(weekEnd)}`} />
            <dl className="divide-y divide-line text-sm">
              <div className="flex justify-between py-2.5">
                <dt className="text-muted">Entrenamientos</dt>
                <dd className="tabular-nums">
                  {workoutsDone}
                  {workoutsPlanned > 0 && <span className="text-muted"> / {workoutsPlanned}</span>}
                </dd>
              </div>
              <div className="flex justify-between py-2.5">
                <dt className="text-muted">Cumplimiento de hábitos (7 días)</dt>
                <dd className="tabular-nums">{weekAvg == null ? "—" : `${weekAvg}%`}</dd>
              </div>
              <div className="flex justify-between py-2.5">
                <dt className="text-muted">Proteínas promedio (7 días)</dt>
                <dd className="tabular-nums">{proteinAvg == null ? "—" : `${nf(proteinAvg)} g`}</dd>
              </div>
              <div className="flex justify-between py-2.5">
                <dt className="text-muted">Cambio de peso (60 días)</dt>
                <dd className="tabular-nums">{weightChange == null ? "—" : `${signed(weightChange)} kg`}</dd>
              </div>
            </dl>
          </Card>
        </div>
      </div>
    </>
  );
}
