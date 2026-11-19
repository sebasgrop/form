import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/card";
import { ModalButton } from "@/components/ui/modal";
import { ActionButton } from "@/components/ui/action-form";
import { buttonClass } from "@/components/ui/button";
import { AddExerciseForm, ExerciseCard, type ExerciseBlock } from "@/components/training/set-logger";
import { discardWorkout, finishWorkout } from "@/features/training/actions";
import { listCatalog, listMuscles } from "@/features/training/catalog";
import { getSession, getTemplate, lastPerformance, setsForSession } from "@/features/training/queries";
import { formatLong } from "@/lib/dates";
import { nf } from "@/lib/format";

export const metadata: Metadata = { title: "Entrenamiento" };

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sessionId = Number(id);
  const session = Number.isInteger(sessionId) ? getSession(sessionId) : undefined;
  if (!session) notFound();

  const sets = setsForSession(sessionId);
  const tpl = session.template_id ? getTemplate(session.template_id) : undefined;
  const finished = !!session.ended_at;
  const catalog = listCatalog();
  const muscles = listMuscles();
  const catalogById = new Map(catalog.map((c) => [c.id, c]));
  const musclesOf = (catalogId: number | null) => {
    const c = catalogId ? catalogById.get(catalogId) : undefined;
    return { primary: c?.primary ?? [], secondary: c?.secondary ?? [] };
  };

  const blocks: ExerciseBlock[] = [];
  const seen = new Set<number>();

  for (const e of tpl?.exercises ?? []) {
    seen.add(e.position);
    blocks.push({
      position: e.position,
      name: e.name,
      workoutExerciseId: e.id,
      catalogId: e.catalog_id,
      muscles: musclesOf(e.catalog_id),
      targetSets: e.target_sets,
      repRange: e.rep_min === e.rep_max ? `${e.rep_min}` : `${e.rep_min}-${e.rep_max}`,
      sets: sets.filter((s) => s.exercise_position === e.position),
      last: lastPerformance(e.name, sessionId) ?? null,
    });
  }
  // ejercicios anotados en esta sesión que no son de la rutina (extras, o rutina editada después)
  const extraPositions = [...new Set(sets.map((s) => s.exercise_position))].filter((p) => !seen.has(p)).sort((a, b) => a - b);
  for (const p of extraPositions) {
    const rows = sets.filter((s) => s.exercise_position === p);
    blocks.push({
      position: p,
      name: rows[0].exercise_name,
      workoutExerciseId: null,
      catalogId: rows[0].catalog_id,
      muscles: musclesOf(rows[0].catalog_id),
      targetSets: null,
      repRange: null,
      sets: rows,
      last: lastPerformance(rows[0].exercise_name, sessionId) ?? null,
    });
  }

  const totalSets = sets.length;
  const volume = sets.reduce((s, x) => s + x.weight_kg * x.reps, 0);

  return (
    <>
      <Link href="/training" className="mb-3 inline-flex items-center gap-1 text-xs text-muted hover:text-fg">
        <ChevronLeft className="h-3.5 w-3.5" aria-hidden /> Entrenamiento
      </Link>
      <PageHeader
        title={session.name}
        subtitle={`${formatLong(session.session_date)} · ${totalSets} series · ${nf(volume)} kg de volumen${finished ? " · terminado" : ""}`}
        action={
          !finished ? (
            <div className="flex items-center gap-2">
              <ActionButton action={discardWorkout.bind(null, sessionId)} confirm="¿Descartar este entrenamiento y todo lo anotado?" variant="ghost" size="md">
                Descartar
              </ActionButton>
              <ActionButton action={finishWorkout.bind(null, sessionId)} variant="primary" size="md">
                Terminar entrenamiento
              </ActionButton>
            </div>
          ) : (
            <Link href="/training" className={buttonClass("secondary")}>
              Listo
            </Link>
          )
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        {blocks.map((b) => (
          <ExerciseCard key={b.position} sessionId={sessionId} block={b} />
        ))}
      </div>

      <div className="mt-4">
        <ModalButton title="Agregar ejercicio" label="Agregar ejercicio" icon={<Plus className="h-4 w-4" />} wide>
          <AddExerciseForm sessionId={sessionId} catalog={catalog} muscles={muscles} />
        </ModalButton>
      </div>
    </>
  );
}
