"use server";

import { revalidatePath } from "next/cache";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { z } from "zod";
import { get, run, PHOTOS_DIR } from "@/lib/db";
import { fail, guard, ok, type ActionResult } from "@/lib/action";
import { dateSchema, optionalNumber } from "@/lib/schemas";
import { today } from "@/lib/dates";
import { getPhotoByFile } from "./queries";

const refresh = () => revalidatePath("/", "layout");

const num = (min: number, max: number, label: string) =>
  optionalNumber.pipe(z.number().min(min, `${label}: valor demasiado bajo`).max(max, `${label}: valor demasiado alto`).optional());

const measurementSchema = z.object({
  measured_on: dateSchema,
  weight_kg: num(20, 400, "Peso"),
  waist_cm: num(20, 300, "Cintura"),
  chest_cm: num(20, 300, "Pecho"),
  arm_cm: num(5, 100, "Brazos"),
  hip_cm: num(20, 300, "Cadera"),
  thigh_cm: num(10, 150, "Muslos"),
  body_fat_pct: num(2, 70, "Grasa corporal"),
});

const KEYS = ["weight_kg", "waist_cm", "chest_cm", "arm_cm", "hip_cm", "thigh_cm", "body_fat_pct"] as const;

/** One row per date: saving again for the same date updates only the fields you filled in. */
export async function saveMeasurement(fd: FormData): Promise<ActionResult> {
  return guard(() => {
    const v = measurementSchema.parse({
      measured_on: fd.get("measured_on") || today(),
      ...Object.fromEntries(KEYS.map((k) => [k, fd.get(k)])),
    });
    if (KEYS.every((k) => v[k] == null)) return fail("Ingresá al menos una medición.");
    run(
      `INSERT INTO body_measurements (measured_on, ${KEYS.join(", ")}) VALUES (?, ${KEYS.map(() => "?").join(", ")})
       ON CONFLICT (measured_on) DO UPDATE SET ${KEYS.map((k) => `${k} = COALESCE(excluded.${k}, ${k})`).join(", ")}`,
      v.measured_on,
      ...KEYS.map((k) => v[k] ?? null),
    );
    refresh();
    return ok("Medición guardada");
  });
}

/** Replace all fields of an existing record (lets you clear a value you entered by mistake). */
export async function updateMeasurement(id: number, fd: FormData): Promise<ActionResult> {
  return guard(() => {
    const v = measurementSchema.parse({
      measured_on: fd.get("measured_on") || today(),
      ...Object.fromEntries(KEYS.map((k) => [k, fd.get(k)])),
    });
    if (KEYS.every((k) => v[k] == null)) return fail("Ingresá al menos una medición o eliminá el registro.");
    run(
      `UPDATE body_measurements SET measured_on = ?, ${KEYS.map((k) => `${k} = ?`).join(", ")} WHERE id = ?`,
      v.measured_on,
      ...KEYS.map((k) => v[k] ?? null),
      id,
    );
    refresh();
    return ok("Medición actualizada");
  });
}

export async function deleteMeasurement(id: number): Promise<ActionResult> {
  return guard(() => {
    run("DELETE FROM body_measurements WHERE id = ?", id);
    refresh();
    return ok();
  });
}

const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const MAX_BYTES = 10 * 1024 * 1024;

export async function uploadPhoto(fd: FormData): Promise<ActionResult> {
  return guard(async () => {
    const file = fd.get("photo");
    if (!(file instanceof File) || file.size === 0) return fail("Elegí una imagen.");
    const ext = EXT[file.type];
    if (!ext) return fail("Solo se permiten imágenes JPEG, PNG o WebP.");
    if (file.size > MAX_BYTES) return fail("La imagen supera los 10 MB.");
    const v = z
      .object({ taken_on: dateSchema, pose: z.enum(["front", "side", "back", "other"]), note: z.string().trim().max(200).optional() })
      .parse({ taken_on: fd.get("taken_on") || today(), pose: fd.get("pose") ?? "front", note: fd.get("note") || undefined });

    const fileName = `${crypto.randomUUID()}.${ext}`;
    await fs.mkdir(PHOTOS_DIR, { recursive: true });
    await fs.writeFile(path.join(/*turbopackIgnore: true*/ PHOTOS_DIR, fileName), Buffer.from(await file.arrayBuffer()));
    run("INSERT INTO progress_photos (taken_on, pose, file_name, note) VALUES (?, ?, ?, ?)", v.taken_on, v.pose, fileName, v.note ?? null);
    refresh();
    return ok("Foto guardada");
  });
}

export async function deletePhoto(id: number): Promise<ActionResult> {
  return guard(async () => {
    const p = get<{ file_name: string }>("SELECT file_name FROM progress_photos WHERE id = ?", id);
    if (!p || !getPhotoByFile(p.file_name)) return fail("No se encontró la foto.");
    run("DELETE FROM progress_photos WHERE id = ?", id);
    await fs.rm(path.join(/*turbopackIgnore: true*/ PHOTOS_DIR, path.basename(p.file_name)), { force: true });
    refresh();
    return ok();
  });
}

export async function saveProfile(fd: FormData): Promise<ActionResult> {
  return guard(() => {
    const v = z
      .object({
        display_name: z.string().trim().max(60).optional(),
        age_years: optionalNumber.pipe(z.number().int().min(10).max(120).optional()),
        sex: z.enum(["male", "female", "other"]).optional(),
        height_cm: optionalNumber.pipe(z.number().min(80).max(250).optional()),
        start_weight_kg: optionalNumber.pipe(z.number().min(20).max(400).optional()),
        goal: z.string().trim().max(200).optional(),
      })
      .parse({
        display_name: fd.get("display_name") || undefined,
        age_years: fd.get("age_years"),
        sex: fd.get("sex") || undefined,
        height_cm: fd.get("height_cm"),
        start_weight_kg: fd.get("start_weight_kg"),
        goal: fd.get("goal") || undefined,
      });
    run(
      "UPDATE profile SET display_name = ?, age_years = ?, sex = ?, height_cm = ?, start_weight_kg = ?, goal = ? WHERE id = 1",
      v.display_name ?? null, v.age_years ?? null, v.sex ?? null, v.height_cm ?? null, v.start_weight_kg ?? null, v.goal ?? null,
    );
    refresh();
    return ok("Perfil guardado");
  });
}
