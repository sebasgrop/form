import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Pencil, Plus, Target } from "lucide-react";
import { Card, CardHeader, PageHeader } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress";
import { ModalButton } from "@/components/ui/modal";
import { ActionButton } from "@/components/ui/action-form";
import { EmptyState } from "@/components/ui/states";
import { buttonClass } from "@/components/ui/button";
import { DailyBars } from "@/components/charts/bar-chart";
import { AddFoodForm, EntryEditForm, FoodForm, GoalsForm } from "@/components/nutrition/forms";
import { deleteFood, deleteMealEntry } from "@/features/nutrition/actions";
import { MEALS, dailyTotals, goalsFor, listFoods, mealsForDate, round, totalsForDate } from "@/features/nutrition/queries";
import { addDays, formatLong, formatShort, lastNDays, today } from "@/lib/dates";
import { nf } from "@/lib/format";
import { cn } from "@/lib/cn";
import { dateSchema } from "@/lib/schemas";

export const metadata: Metadata = { title: "Nutrición" };

export default async function NutritionPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const sp = await searchParams;
  const parsed = dateSchema.safeParse(sp.date);
  const t = today();
  const date = parsed.success && parsed.data <= t ? parsed.data : t;

  const goals = goalsFor(date);
  const totals = totalsForDate(date);
  const entries = mealsForDate(date);
  const foods = listFoods();

  const days = lastNDays(7, date);
  const byDay = new Map(dailyTotals(days[0], date).map((d) => [d.entry_date, d.calories]));
  const chart = days.map((d) => ({ label: formatShort(d), value: round(byDay.get(d) ?? 0) }));

  const bars = [
    { label: "Calorías", v: totals.calories, g: goals.calories, unit: "kcal" },
    { label: "Proteínas", v: totals.protein_g, g: goals.protein_g, unit: "g" },
    { label: "Carbohidratos", v: totals.carbs_g, g: goals.carbs_g, unit: "g" },
    { label: "Grasas", v: totals.fat_g, g: goals.fat_g, unit: "g" },
  ];

  return (
    <>
      <PageHeader
        title="Nutrición"
        subtitle={formatLong(date)}
        action={
          <ModalButton title="Objetivos diarios" label="Objetivos" icon={<Target className="h-4 w-4" />}>
            <GoalsForm goals={goals} />
          </ModalButton>
        }
      />

      <div className="mb-5 flex items-center gap-2">
        <Link href={`/nutrition?date=${addDays(date, -1)}`} className={buttonClass("secondary", "sm", "w-8 px-0")} aria-label="Día anterior">
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <Link
          href={`/nutrition?date=${addDays(date, 1)}`}
          aria-disabled={date >= t}
          className={buttonClass("secondary", "sm", cn("w-8 px-0", date >= t && "pointer-events-none opacity-40"))}
          aria-label="Día siguiente"
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
        {date !== t && (
          <Link href="/nutrition" className={buttonClass("ghost", "sm")}>
            Volver a hoy
          </Link>
        )}
      </div>

      <div className="mb-5 grid gap-5 lg:grid-cols-5">
        <Card className="min-w-0 lg:col-span-2">
          <CardHeader title="Totales del día" hint="Consumido frente al objetivo" />
          <div className="space-y-4">
            {bars.map((b) => (
              <div key={b.label}>
                <div className="mb-1.5 flex items-baseline justify-between text-sm">
                  <span>{b.label}</span>
                  <span className="tabular-nums text-muted">
                    <span className="text-fg">{nf(round(b.v))}</span> / {nf(b.g)} {b.unit}
                  </span>
                </div>
                <ProgressBar value={b.v} max={b.g} label={b.label} />
              </div>
            ))}
          </div>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader title="Calorías, últimos 7 días" hint="La línea punteada es el objetivo de calorías" />
          <DailyBars data={chart} target={goals.calories} unit="kcal" ariaLabel="Calorías por día en los últimos 7 días" />
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        <div className="min-w-0 space-y-5 lg:col-span-3">
          {MEALS.map((m) => {
            const rows = entries.filter((e) => e.meal === m.key);
            const kcal = rows.reduce((s, e) => s + e.calories, 0);
            return (
              <Card key={m.key}>
                <CardHeader
                  title={m.label}
                  hint={rows.length ? `${nf(round(kcal))} kcal` : undefined}
                  action={
                    <ModalButton title={`Agregar a ${m.label.toLowerCase()}`} label="Agregar alimento" size="sm" icon={<Plus className="h-3.5 w-3.5" />}>
                      <AddFoodForm foods={foods} meal={m.key} date={date} />
                    </ModalButton>
                  }
                />
                {rows.length === 0 ? (
                  <p className="text-xs text-muted">Nada registrado.</p>
                ) : (
                  <ul className="divide-y divide-line">
                    {rows.map((e) => (
                      <li key={e.id} className="flex items-center gap-2 py-2.5">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm">{e.food_name}</p>
                          <p className="text-[11px] tabular-nums text-muted">
                            {nf(e.quantity, 1)} {e.serving_unit} · {nf(round(e.calories))} kcal · P {round(e.protein_g)} · C {round(e.carbs_g)} · G {round(e.fat_g)}
                          </p>
                        </div>
                        <ModalButton
                          title="Editar registro"
                          variant="ghost"
                          size="sm"
                          ariaLabel={`Editar ${e.food_name}`}
                          icon={<Pencil className="h-3.5 w-3.5" />}
                        >
                          <EntryEditForm id={e.id} quantity={e.quantity} unit={e.serving_unit} meal={e.meal} />
                        </ModalButton>
                        <ActionButton action={deleteMealEntry.bind(null, e.id)} ariaLabel={`Eliminar ${e.food_name}`}>
                          Eliminar
                        </ActionButton>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            );
          })}
        </div>

        <Card className="h-fit lg:col-span-2">
          <CardHeader
            title="Biblioteca de alimentos"
            hint="Por porción. Los alimentos iniciales son aproximados: editalos para que coincidan con tus etiquetas."
            action={
              <ModalButton title="Nuevo alimento" label="Nuevo" size="sm" icon={<Plus className="h-3.5 w-3.5" />}>
                <FoodForm />
              </ModalButton>
            }
          />
          {foods.length === 0 ? (
            <EmptyState title="No hay alimentos" description="Creá un alimento propio para empezar a registrar." />
          ) : (
            <ul className="max-h-[32rem] divide-y divide-line overflow-y-auto">
              {foods.map((f) => (
                <li key={f.id} className="flex items-center gap-2 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">
                      {f.name}
                      {f.source === "seed_approx" && (
                        <span className="ml-2 rounded-full border border-line-strong px-1.5 py-px text-[10px] text-muted">aprox.</span>
                      )}
                    </p>
                    <p className="text-[11px] tabular-nums text-muted">
                      {f.serving_size} {f.serving_unit}: {f.calories} kcal · P {f.protein_g} · C {f.carbs_g} · G {f.fat_g}
                    </p>
                  </div>
                  <ModalButton
                    title="Editar alimento"
                    variant="ghost"
                    size="sm"
                    ariaLabel={`Editar ${f.name}`}
                    icon={<Pencil className="h-3.5 w-3.5" />}
                  >
                    <FoodForm food={f} />
                  </ModalButton>
                  <ActionButton action={deleteFood.bind(null, f.id)} confirm={`¿Quitar «${f.name}» de la biblioteca? Las comidas registradas conservan sus valores.`} ariaLabel={`Quitar ${f.name}`}>
                    Quitar
                  </ActionButton>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
