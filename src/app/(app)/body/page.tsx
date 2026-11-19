import type { Metadata } from "next";
import { Camera, Pencil, Plus } from "lucide-react";
import { Card, CardHeader, PageHeader, Stat } from "@/components/ui/card";
import { ModalButton } from "@/components/ui/modal";
import { ActionButton } from "@/components/ui/action-form";
import { EmptyState } from "@/components/ui/states";
import { buttonClass, inputClass } from "@/components/ui/button";
import { TrendChart } from "@/components/charts/line-chart";
import { MeasurementForm, PhotoForm } from "@/components/body/forms";
import { deleteMeasurement, deletePhoto } from "@/features/body/actions";
import { FIELDS, getProfile, latestValue, listMeasurements, listPhotos, series, type Measurement } from "@/features/body/queries";
import { formatShort, today } from "@/lib/dates";
import { fixed, nf, signed } from "@/lib/format";
import { dateSchema } from "@/lib/schemas";

export const metadata: Metadata = { title: "Progreso corporal" };

const POSE: Record<string, string> = { front: "Frente", side: "Perfil", back: "Espalda", other: "Otra" };
const fmt = (v: number | null) => (v == null ? "—" : nf(v, 1));

export default async function BodyPage({ searchParams }: { searchParams: Promise<{ a?: string; b?: string }> }) {
  const sp = await searchParams;
  const t = today();
  const measurements = listMeasurements();
  const photos = listPhotos();
  const profile = getProfile();

  const weight = latestValue("weight_kg");
  const waist = latestValue("waist_cm");
  const weightSeries = series("weight_kg").map((p) => ({ label: formatShort(p.date), value: p.value }));
  const waistSeries = series("waist_cm").map((p) => ({ label: formatShort(p.date), value: p.value }));

  const startW = profile?.start_weight_kg ?? null;
  const diff = weight && startW ? weight.value - startW : null;
  const bmi = weight && profile?.height_cm ? weight.value / (profile.height_cm / 100) ** 2 : null;

  // comparación entre dos fechas
  const dates = measurements.map((m) => m.measured_on);
  const aOk = dateSchema.safeParse(sp.a);
  const bOk = dateSchema.safeParse(sp.b);
  const defA = dates.length > 1 ? dates[dates.length - 1] : dates[0];
  const defB = dates[0];
  const aDate = aOk.success && dates.includes(aOk.data) ? aOk.data : defA;
  const bDate = bOk.success && dates.includes(bOk.data) ? bOk.data : defB;
  const A = measurements.find((m) => m.measured_on === aDate);
  const B = measurements.find((m) => m.measured_on === bDate);

  return (
    <>
      <PageHeader
        title="Progreso corporal"
        subtitle={profile?.goal ?? "Seguí tus medidas y fotos"}
        action={
          <ModalButton title="Nueva medición" label="Agregar medición" variant="primary" icon={<Plus className="h-4 w-4" />}>
            <MeasurementForm today={t} />
          </ModalButton>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Peso actual" value={weight ? fixed(weight.value) : "—"} unit={weight ? "kg" : undefined} sub={weight ? `Registrado el ${formatShort(weight.date)}` : "Todavía sin registrar"} />
        <Stat
          label="Desde el inicio"
          value={diff == null ? "—" : signed(diff)}
          unit={diff == null ? undefined : "kg"}
          sub={startW ? `Empezaste en ${nf(startW, 1)} kg` : "Indicá un peso inicial en Ajustes"}
        />
        <Stat label="Cintura" value={waist ? fixed(waist.value) : "—"} unit={waist ? "cm" : undefined} sub={waist ? `Registrada el ${formatShort(waist.date)}` : "Todavía sin registrar"} />
        <Stat label="IMC" value={bmi ? fixed(bmi) : "—"} sub="Solo como referencia" />
      </div>

      <div className="mb-5 grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Peso" hint="kg a lo largo del tiempo" />
          {weightSeries.length < 2 ? (
            <EmptyState title="Faltan datos" description="Registrá tu peso en al menos dos fechas para ver la tendencia." />
          ) : (
            <TrendChart data={weightSeries} unit="kg" ariaLabel="Peso corporal a lo largo del tiempo" />
          )}
        </Card>
        <Card>
          <CardHeader title="Cintura" hint="cm a lo largo del tiempo" />
          {waistSeries.length < 2 ? (
            <EmptyState title="Faltan datos" description="Registrá la circunferencia de cintura en al menos dos fechas." />
          ) : (
            <TrendChart data={waistSeries} unit="cm" ariaLabel="Circunferencia de cintura a lo largo del tiempo" />
          )}
        </Card>
      </div>

      <div className="mb-5 grid gap-5 lg:grid-cols-5">
        <Card className="lg:col-span-5">
          <CardHeader title="Historial de mediciones" />
          {measurements.length === 0 ? (
            <EmptyState title="Todavía no hay mediciones" description="Agregá tu primera medición para empezar a seguir tu evolución." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[34rem] text-left text-sm">
                <thead className="text-[11px] uppercase tracking-wider text-muted">
                  <tr>
                    <th className="py-2 pr-3 font-normal">Fecha</th>
                    {FIELDS.map((f) => (
                      <th key={f.key} className="px-2 py-2 text-right font-normal">
                        {f.label}
                      </th>
                    ))}
                    <th className="w-20" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-line tabular-nums">
                  {measurements.map((m) => (
                    <tr key={m.id}>
                      <td className="py-2.5 pr-3 whitespace-nowrap">{formatShort(m.measured_on)}</td>
                      {FIELDS.map((f) => (
                        <td key={f.key} className="px-2 py-2.5 text-right text-muted">
                          {fmt(m[f.key])}
                        </td>
                      ))}
                      <td className="py-1 text-right">
                        <div className="flex justify-end gap-1">
                          <ModalButton title="Editar medición" variant="ghost" size="sm" ariaLabel={`Editar medición ${m.measured_on}`} icon={<Pencil className="h-3.5 w-3.5" />}>
                            <MeasurementForm today={t} record={m} />
                          </ModalButton>
                          <ActionButton action={deleteMeasurement.bind(null, m.id)} confirm="¿Eliminar esta medición?" ariaLabel={`Eliminar medición ${m.measured_on}`}>
                            Eliminar
                          </ActionButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card className="lg:col-span-5">
          <CardHeader title="Comparar fechas" hint="Mirá el cambio entre dos registros" />
          {measurements.length < 2 ? (
            <EmptyState title="Hacen falta dos registros" description="Agregá mediciones en dos fechas distintas para compararlas." />
          ) : (
            <>
              <form method="get" className="mb-4 grid max-w-xl grid-cols-[1fr_1fr_auto] items-end gap-2">
                <label className="block text-xs text-muted">
                  Desde
                  <select name="a" defaultValue={aDate} className={`${inputClass} mt-1.5`}>
                    {dates.map((d) => (
                      <option key={d} value={d}>
                        {formatShort(d)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs text-muted">
                  Hasta
                  <select name="b" defaultValue={bDate} className={`${inputClass} mt-1.5`}>
                    {dates.map((d) => (
                      <option key={d} value={d}>
                        {formatShort(d)}
                      </option>
                    ))}
                  </select>
                </label>
                <button className={buttonClass("secondary")}>Comparar</button>
              </form>
              <CompareTable A={A} B={B} />
            </>
          )}
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Fotos de progreso"
          hint="Se guardan de forma privada en esta computadora"
          action={
            <ModalButton title="Subir foto de progreso" label="Agregar foto" size="sm" icon={<Camera className="h-3.5 w-3.5" />}>
              <PhotoForm today={t} />
            </ModalButton>
          }
        />
        {photos.length === 0 ? (
          <EmptyState title="Todavía no hay fotos" description="Subí fotos de frente, perfil y espalda para comparar con el tiempo." />
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {photos.map((p) => (
              <li key={p.id} className="group overflow-hidden rounded-control border border-line bg-surface-2">
                <div className="aspect-[3/4] overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/api/photos/${p.file_name}`} alt={`Foto de ${POSE[p.pose].toLowerCase()} del ${p.taken_on}`} loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                </div>
                <div className="flex items-center justify-between gap-1 p-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs">{formatShort(p.taken_on)}</p>
                    <p className="text-[10px] text-muted">{POSE[p.pose]}</p>
                  </div>
                  <ActionButton action={deletePhoto.bind(null, p.id)} confirm="¿Eliminar esta foto de forma permanente?" ariaLabel={`Eliminar foto ${p.taken_on}`}>
                    Eliminar
                  </ActionButton>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}

function CompareTable({ A, B }: { A?: Measurement; B?: Measurement }) {
  if (!A || !B) return null;
  return (
    <table className="w-full max-w-xl text-sm tabular-nums">
      <thead className="text-[11px] uppercase tracking-wider text-muted">
        <tr>
          <th className="py-2 text-left font-normal" />
          <th className="py-2 text-right font-normal">{formatShort(A.measured_on)}</th>
          <th className="py-2 text-right font-normal">{formatShort(B.measured_on)}</th>
          <th className="py-2 text-right font-normal">Cambio</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-line">
        {FIELDS.map((f) => {
          const a = A[f.key];
          const b = B[f.key];
          const d = a != null && b != null ? Math.round((b - a) * 10) / 10 : null;
          return (
            <tr key={f.key}>
              <td className="py-2 text-muted">{f.label}</td>
              <td className="py-2 text-right">{fmt(a)}</td>
              <td className="py-2 text-right">{fmt(b)}</td>
              <td className="py-2 text-right">{d == null ? "—" : `${signed(d)} ${f.unit}`}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
