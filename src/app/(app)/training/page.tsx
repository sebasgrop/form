import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDown, ArrowUp, BookOpen, ChevronRight, Dumbbell, Pencil, Play, Plus } from "lucide-react";
import { Card, CardHeader, PageHeader } from "@/components/ui/card";
import { ModalButton } from "@/components/ui/modal";
import { ActionButton } from "@/components/ui/action-form";
import { EmptyState } from "@/components/ui/states";
import { buttonClass } from "@/components/ui/button";
import { ExerciseForm, TemplateForm } from "@/components/training/routine-forms";
import { deleteExercise, deleteSession, deleteTemplate, moveExercise, startWorkout } from "@/features/training/actions";
import { listCatalog, listMuscles } from "@/features/training/catalog";
import { activeSession, listTemplates, recentSessions, templateForDate } from "@/features/training/queries";
import { WEEKDAYS_LONG, formatShort, today } from "@/lib/dates";
import { nf } from "@/lib/format";

export const metadata: Metadata = { title: "Entrenamiento" };

const reps = (e: { rep_min: number; rep_max: number }) => (e.rep_min === e.rep_max ? `${e.rep_min}` : `${e.rep_min}-${e.rep_max}`);

export default function TrainingPage() {
  const t = today();
  const templates = listTemplates();
  const todays = templateForDate(t);
  const active = activeSession();
  const history = recentSessions(12);
  const catalog = listCatalog();
  const muscles = listMuscles();
  const catalogById = new Map(catalog.map((c) => [c.id, c]));

  return (
    <>
      <PageHeader
        title="Entrenamiento"
        subtitle="Tus rutinas e historial de entrenamientos"
        action={
          <div className="flex flex-wrap gap-2">
            <Link href="/training/library" className={buttonClass("secondary")}>
              <BookOpen className="h-4 w-4" aria-hidden /> Biblioteca de ejercicios
            </Link>
            <ModalButton title="Nueva rutina" label="Nueva rutina" icon={<Plus className="h-4 w-4" />}>
              <TemplateForm />
            </ModalButton>
          </div>
        }
      />

      <Card className="mb-5">
        {active ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs text-muted">Entrenamiento en curso</p>
              <p className="mt-1 text-lg font-semibold">{active.name}</p>
              <p className="text-xs text-muted">Iniciado el {formatShort(active.session_date)}</p>
            </div>
            <Link href={`/training/session/${active.id}`} className={buttonClass("primary")}>
              <Play className="h-4 w-4" aria-hidden /> Retomar entrenamiento
            </Link>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs text-muted">Hoy</p>
              <p className="mt-1 text-lg font-semibold">{todays ? todays.name : "Día de descanso"}</p>
              <p className="text-xs text-muted">
                {todays
                  ? `${todays.exercises.length} ejercicios programados`
                  : "No hay rutina programada. Igual podés iniciar un entrenamiento libre."}
              </p>
            </div>
            <div className="flex gap-2">
              {todays && (
                <ActionButton action={startWorkout.bind(null, todays.id)} variant="primary" size="md">
                  <Dumbbell className="h-4 w-4" aria-hidden /> Iniciar {todays.name}
                </ActionButton>
              )}
              <ActionButton action={startWorkout.bind(null, null)} variant="secondary" size="md">
                Entrenamiento libre
              </ActionButton>
            </div>
          </div>
        )}
      </Card>

      <div className="grid gap-5 lg:grid-cols-5">
        <div className="min-w-0 space-y-5 lg:col-span-3">
          <h2 className="text-sm font-medium text-muted">Rutinas</h2>
          {templates.length === 0 && <EmptyState title="Todavía no hay rutinas" description="Creá una rutina y agregale ejercicios." />}
          {templates.map((tpl) => (
            <Card key={tpl.id}>
              <CardHeader
                title={tpl.name}
                hint={tpl.day_of_week ? WEEKDAYS_LONG[tpl.day_of_week - 1] : "Sin programar"}
                action={
                  <div className="flex items-center gap-1">
                    <ActionButton action={startWorkout.bind(null, tpl.id)} variant="secondary">
                      Iniciar
                    </ActionButton>
                    <ModalButton title="Editar rutina" variant="ghost" size="sm" ariaLabel={`Editar ${tpl.name}`} icon={<Pencil className="h-3.5 w-3.5" />}>
                      <TemplateForm template={tpl} />
                    </ModalButton>
                  </div>
                }
              />
              {tpl.exercises.length === 0 ? (
                <p className="text-xs text-muted">Todavía no hay ejercicios.</p>
              ) : (
                <ol className="divide-y divide-line">
                  {tpl.exercises.map((e, i) => {
                    const cat = e.catalog_id ? catalogById.get(e.catalog_id) : undefined;
                    return (
                      <li key={e.id} className="flex items-center gap-2 py-2.5">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm">{e.name}</p>
                          <p className="text-[11px] tabular-nums text-muted">
                            {e.target_sets} × {reps(e)}
                            {cat && cat.primary.length > 0 && <span> · {cat.primary.map((m) => m.name).join(", ")}</span>}
                          </p>
                        </div>
                        <ActionButton action={moveExercise.bind(null, e.id, -1)} ariaLabel={`Subir ${e.name}`} className={i === 0 ? "pointer-events-none opacity-30" : ""}>
                          <ArrowUp className="h-3.5 w-3.5" />
                        </ActionButton>
                        <ActionButton action={moveExercise.bind(null, e.id, 1)} ariaLabel={`Bajar ${e.name}`} className={i === tpl.exercises.length - 1 ? "pointer-events-none opacity-30" : ""}>
                          <ArrowDown className="h-3.5 w-3.5" />
                        </ActionButton>
                        <ModalButton title="Editar ejercicio" variant="ghost" size="sm" ariaLabel={`Editar ${e.name}`} icon={<Pencil className="h-3.5 w-3.5" />}>
                          <ExerciseForm exercise={e} catalog={catalog} muscles={muscles} />
                        </ModalButton>
                        <ActionButton action={deleteExercise.bind(null, e.id)} confirm={`¿Quitar ${e.name} de ${tpl.name}?`} ariaLabel={`Quitar ${e.name}`}>
                          Quitar
                        </ActionButton>
                      </li>
                    );
                  })}
                </ol>
              )}
              <div className="mt-3 flex items-center gap-2 border-t border-line pt-3">
                <ModalButton title={`Agregar ejercicio a ${tpl.name}`} label="Agregar ejercicio" size="sm" icon={<Plus className="h-3.5 w-3.5" />} wide>
                  <ExerciseForm templateId={tpl.id} catalog={catalog} muscles={muscles} />
                </ModalButton>
                <ActionButton
                  action={deleteTemplate.bind(null, tpl.id)}
                  variant="ghost"
                  confirm={`¿Eliminar la rutina «${tpl.name}»? Los entrenamientos pasados se conservan.`}
                  className="ml-auto"
                >
                  Eliminar rutina
                </ActionButton>
              </div>
            </Card>
          ))}
        </div>

        <div className="min-w-0 lg:col-span-2">
          <Card>
            <CardHeader title="Historial" hint="Entrenamientos más recientes" />
            {history.length === 0 ? (
              <EmptyState title="Todavía no hay entrenamientos" description="Los entrenamientos terminados aparecen acá." />
            ) : (
              <ul className="divide-y divide-line">
                {history.map((s) => (
                  <li key={s.id} className="flex items-center gap-2 py-3">
                    <Link href={`/training/session/${s.id}`} className="group min-w-0 flex-1">
                      <p className="flex items-center gap-1 truncate text-sm group-hover:text-accent-strong">
                        {s.name}
                        <ChevronRight className="h-3.5 w-3.5 text-muted" aria-hidden />
                      </p>
                      <p className="text-[11px] tabular-nums text-muted">
                        {formatShort(s.session_date)} · {s.exercise_count} ejercicios · {s.set_count} series · {nf(s.volume)} kg de volumen
                      </p>
                    </Link>
                    <ActionButton action={deleteSession.bind(null, s.id)} confirm={`¿Eliminar este entrenamiento «${s.name}» y todas sus series?`} ariaLabel={`Eliminar entrenamiento ${s.name} ${s.session_date}`}>
                      Eliminar
                    </ActionButton>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
