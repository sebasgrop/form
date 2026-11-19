import "server-only";
import { all, get } from "@/lib/db";

export const FIELDS = [
  { key: "weight_kg", label: "Peso", unit: "kg" },
  { key: "waist_cm", label: "Cintura", unit: "cm" },
  { key: "chest_cm", label: "Pecho", unit: "cm" },
  { key: "arm_cm", label: "Brazos", unit: "cm" },
  { key: "hip_cm", label: "Cadera", unit: "cm" },
  { key: "thigh_cm", label: "Muslos", unit: "cm" },
  { key: "body_fat_pct", label: "Grasa corporal", unit: "%" },
] as const;

export type FieldKey = (typeof FIELDS)[number]["key"];

export type Measurement = {
  id: number;
  measured_on: string;
} & Record<FieldKey, number | null>;

export type Photo = { id: number; taken_on: string; pose: "front" | "side" | "back" | "other"; file_name: string; note: string | null };

export function listMeasurements(): Measurement[] {
  return all<Measurement>("SELECT * FROM body_measurements ORDER BY measured_on DESC");
}

export function getMeasurementOn(date: string): Measurement | undefined {
  return get<Measurement>("SELECT * FROM body_measurements WHERE measured_on = ?", date);
}

/** Most recent non-empty value for one field (a day may log only some measurements). */
export function latestValue(field: FieldKey): { value: number; date: string } | undefined {
  const r = get<{ v: number; d: string }>(
    `SELECT ${field} AS v, measured_on AS d FROM body_measurements WHERE ${field} IS NOT NULL ORDER BY measured_on DESC LIMIT 1`,
  );
  return r ? { value: r.v, date: r.d } : undefined;
}

export function series(field: FieldKey, from?: string): { date: string; value: number }[] {
  return all<{ date: string; value: number }>(
    `SELECT measured_on AS date, ${field} AS value FROM body_measurements
     WHERE ${field} IS NOT NULL ${from ? "AND measured_on >= ?" : ""} ORDER BY measured_on`,
    ...(from ? [from] : []),
  );
}

export function listPhotos(): Photo[] {
  return all<Photo>("SELECT id, taken_on, pose, file_name, note FROM progress_photos ORDER BY taken_on DESC, id DESC");
}

export function getPhotoByFile(fileName: string): Photo | undefined {
  return get<Photo>("SELECT id, taken_on, pose, file_name, note FROM progress_photos WHERE file_name = ?", fileName);
}

export function getProfile() {
  return get<{
    display_name: string | null;
    age_years: number | null;
    sex: string | null;
    height_cm: number | null;
    start_weight_kg: number | null;
    goal: string | null;
  }>("SELECT display_name, age_years, sex, height_cm, start_weight_kg, goal FROM profile WHERE id = 1");
}
