import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, Pencil, Plus, UtensilsCrossed } from "lucide-react";
import { Card, PageHeader } from "@/components/ui/card";
import { ModalButton } from "@/components/ui/modal";
import { ActionButton } from "@/components/ui/action-form";
import { EmptyState } from "@/components/ui/states";
import { DishForm, LogDishForm, MacroLine } from "@/components/nutrition/dish-forms";
import { deleteDish } from "@/features/nutrition/dish-actions";
import { listDishes } from "@/features/nutrition/dishes";
import { listAllFoods } from "@/features/nutrition/queries";
import { today } from "@/lib/dates";
import { nf } from "@/lib/format";

export const metadata: Metadata = { title: "Platos" };

export default function DishesPage() {
  const dishes = listDishes();
  const foods = listAllFoods();
  const t = today();

  return (
    <>
      <Link href="/nutrition" className="mb-3 inline-flex items-center gap-1 text-xs text-muted hover:text-fg">
        <ChevronLeft className="h-3.5 w-3.5" aria-hidden /> Nutrición
      </Link>
      <PageHeader
        title="Platos"
        subtitle="Combiná alimentos de tu biblioteca en platos y registralos en una comida con un solo toque."
        action={
          <ModalButton title="Nuevo plato" label="Nuevo plato" variant="primary" icon={<Plus className="h-4 w-4" />} wide>
            <DishForm foods={foods} />
          </ModalButton>
        }
      />

      {dishes.length === 0 ? (
        <EmptyState
          title="Todavía no creaste platos"
          description="Un plato es un conjunto de alimentos con sus cantidades, por ejemplo «pollo con arroz». Se calcula solo cuántas calorías y macros tiene."
          action={
            <ModalButton title="Nuevo plato" label="Crear mi primer plato" variant="primary" icon={<Plus className="h-4 w-4" />} wide>
              <DishForm foods={foods} />
            </ModalButton>
          }
        />
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {dishes.map((d) => (
            <li key={d.id} className="min-w-0">
              <Card>
                <header className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-semibold">{d.name}</h2>
                    <p className="text-[11px] text-muted">
                      {d.items.length} {d.items.length === 1 ? "ingrediente" : "ingredientes"} · rinde {nf(d.servings, 2)} {d.servings === 1 ? "porción" : "porciones"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <ModalButton title="Agregar a una comida" label="Registrar" size="sm" variant="secondary" icon={<UtensilsCrossed className="h-3.5 w-3.5" />}>
                      <LogDishForm dish={{ id: d.id, name: d.name }} perServing={d.perServing} date={t} />
                    </ModalButton>
                    <ModalButton title="Editar plato" variant="ghost" size="sm" ariaLabel={`Editar ${d.name}`} icon={<Pencil className="h-3.5 w-3.5" />} wide>
                      <DishForm foods={foods} dish={{ id: d.id, name: d.name, servings: d.servings, items: d.items.map((i) => ({ food_id: i.food_id, quantity: i.quantity })) }} />
                    </ModalButton>
                    <ActionButton action={deleteDish.bind(null, d.id)} confirm={`¿Eliminar el plato «${d.name}»? Las comidas ya registradas conservan sus valores.`} ariaLabel={`Eliminar ${d.name}`}>
                      Eliminar
                    </ActionButton>
                  </div>
                </header>

                <div className="mb-3 space-y-1 rounded-control bg-surface-2 p-3 text-xs text-muted">
                  <div className="flex items-baseline justify-between gap-2">
                    <span>{d.servings === 1 ? "Plato completo" : "Total del plato"}</span>
                    <MacroLine m={d.total} />
                  </div>
                  {d.servings !== 1 && (
                    <div className="flex items-baseline justify-between gap-2">
                      <span>Por porción</span>
                      <MacroLine m={d.perServing} />
                    </div>
                  )}
                </div>

                <ul className="divide-y divide-line text-sm">
                  {d.items.map((i) => (
                    <li key={i.id} className="flex items-baseline justify-between gap-3 py-1.5">
                      <span className="min-w-0 truncate">{i.food_name}</span>
                      <span className="shrink-0 text-[11px] tabular-nums text-muted">
                        {nf(i.quantity, 1)} {i.serving_unit} · {nf(i.macros.calories)} kcal
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
