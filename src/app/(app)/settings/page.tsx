import type { Metadata } from "next";
import { Download } from "lucide-react";
import { Card, CardHeader, PageHeader } from "@/components/ui/card";
import { buttonClass } from "@/components/ui/button";
import { ProfileForm } from "@/components/body/forms";
import { ModalButton } from "@/components/ui/modal";
import { GoalsForm } from "@/components/nutrition/forms";
import { getProfile } from "@/features/body/queries";
import { goalsFor } from "@/features/nutrition/queries";
import { DATA_DIR } from "@/lib/db";
import { today } from "@/lib/dates";

export const metadata: Metadata = { title: "Ajustes" };

export default function SettingsPage() {
  const profile = getProfile()!;
  const goals = goalsFor(today());
  return (
    <>
      <PageHeader title="Ajustes" subtitle="Perfil, objetivos y tus datos" />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Perfil" />
          <ProfileForm profile={profile} />
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader
              title="Objetivos de nutrición"
              hint={`${goals.calories} kcal · ${goals.protein_g} g de proteínas · ${goals.carbs_g} g de carbohidratos · ${goals.fat_g} g de grasas`}
            />
            <ModalButton title="Objetivos diarios" label="Editar objetivos">
              <GoalsForm goals={goals} />
            </ModalButton>
          </Card>

          <Card>
            <CardHeader title="Tus datos" hint="Todo se guarda en esta computadora. No se envía nada a ningún servidor." />
            <dl className="mb-4 space-y-1 text-xs">
              <div className="flex gap-2">
                <dt className="text-muted">Carpeta</dt>
                <dd className="break-all font-mono">{DATA_DIR}</dd>
              </div>
            </dl>
            <p className="mb-4 text-xs text-muted">
              Para hacer una copia de seguridad, copiá esa carpeta (base de datos y fotos). Editar hábitos, rutinas u objetivos nunca cambia los registros pasados.
            </p>
            <a href="/api/export" className={buttonClass("secondary")} download>
              <Download className="h-4 w-4" aria-hidden /> Exportar todos los datos (JSON)
            </a>
          </Card>
        </div>
      </div>
    </>
  );
}
