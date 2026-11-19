"use client";

import { ActionForm } from "@/components/ui/action-form";
import { Field, inputClass } from "@/components/ui/button";
import { saveMeasurement, saveProfile, updateMeasurement, uploadPhoto } from "@/features/body/actions";

const FIELDS: { key: string; label: string; step: string }[] = [
  { key: "weight_kg", label: "Peso (kg)", step: "0.1" },
  { key: "waist_cm", label: "Cintura (cm)", step: "0.1" },
  { key: "chest_cm", label: "Pecho (cm)", step: "0.1" },
  { key: "arm_cm", label: "Brazos (cm)", step: "0.1" },
  { key: "hip_cm", label: "Cadera (cm)", step: "0.1" },
  { key: "thigh_cm", label: "Muslos (cm)", step: "0.1" },
  { key: "body_fat_pct", label: "Grasa corporal (%) opcional", step: "0.1" },
];

export function MeasurementForm({
  today,
  record,
}: {
  today: string;
  record?: { id: number; measured_on: string } & Record<string, number | string | null>;
}) {
  const action = record ? updateMeasurement.bind(null, record.id) : saveMeasurement;
  return (
    <ActionForm action={action} submitLabel={record ? "Guardar cambios" : "Guardar medición"} reset={!record} className="space-y-4">
      <Field label="Fecha">
        <input name="measured_on" type="date" required max={today} defaultValue={record?.measured_on ?? today} className={inputClass} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        {FIELDS.map((f) => (
          <Field key={f.key} label={f.label}>
            <input
              name={f.key}
              data-autofocus={f.key === "weight_kg" && !record ? "" : undefined}
              type="number"
              step={f.step}
              min={0}
              inputMode="decimal"
              defaultValue={(record?.[f.key] as number | null | undefined) ?? ""}
              className={inputClass}
            />
          </Field>
        ))}
      </div>
      <p className="text-[11px] text-muted">
        {record
          ? "Si vaciás un campo, se quita ese valor de esta fecha."
          : "Completá solo lo que mediste. Si guardás de nuevo en la misma fecha, se actualizan únicamente los campos que ingreses."}{" "}
        La grasa corporal nunca se estima: cargala solo si la mediste.
      </p>
    </ActionForm>
  );
}

export function PhotoForm({ today }: { today: string }) {
  return (
    <ActionForm action={uploadPhoto} submitLabel="Subir foto" className="space-y-4">
      <Field label="Imagen (JPEG, PNG o WebP, hasta 10 MB)">
        <input
          name="photo"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          required
          className={`${inputClass} !h-auto py-2 file:mr-3 file:rounded-md file:border-0 file:bg-surface-2 file:px-3 file:py-1 file:text-xs file:text-fg`}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Fecha">
          <input name="taken_on" type="date" required max={today} defaultValue={today} className={inputClass} />
        </Field>
        <Field label="Pose">
          <select name="pose" className={inputClass} defaultValue="front">
            <option value="front">Frente</option>
            <option value="side">Perfil</option>
            <option value="back">Espalda</option>
            <option value="other">Otra</option>
          </select>
        </Field>
      </div>
      <Field label="Nota (opcional)">
        <input name="note" maxLength={200} className={inputClass} />
      </Field>
    </ActionForm>
  );
}

export function ProfileForm({
  profile,
}: {
  profile: { display_name: string | null; age_years: number | null; sex: string | null; height_cm: number | null; start_weight_kg: number | null; goal: string | null };
}) {
  return (
    <ActionForm action={saveProfile} submitLabel="Guardar perfil" reset={false} className="space-y-4">
      <Field label="Nombre (opcional)">
        <input name="display_name" maxLength={60} defaultValue={profile.display_name ?? ""} className={inputClass} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Edad">
          <input name="age_years" type="number" min={10} max={120} defaultValue={profile.age_years ?? ""} className={inputClass} />
        </Field>
        <Field label="Sexo">
          <select name="sex" defaultValue={profile.sex ?? ""} className={inputClass}>
            <option value="">Sin indicar</option>
            <option value="male">Masculino</option>
            <option value="female">Femenino</option>
            <option value="other">Otro</option>
          </select>
        </Field>
        <Field label="Altura (cm)">
          <input name="height_cm" type="number" step="0.1" min={80} max={250} defaultValue={profile.height_cm ?? ""} className={inputClass} />
        </Field>
        <Field label="Peso inicial (kg)">
          <input name="start_weight_kg" type="number" step="0.1" min={20} max={400} defaultValue={profile.start_weight_kg ?? ""} className={inputClass} />
        </Field>
      </div>
      <Field label="Objetivo">
        <input name="goal" maxLength={200} defaultValue={profile.goal ?? ""} className={inputClass} />
      </Field>
    </ActionForm>
  );
}
