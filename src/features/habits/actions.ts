"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { run } from "@/lib/db";
import { fail, guard, ok, type ActionResult } from "@/lib/action";
import { dateSchema, optionalNumber } from "@/lib/schemas";
import { getHabit, hasLogs, saveLog } from "./queries";

const refresh = () => revalidatePath("/", "layout");

export async function toggleHabit(habitId: number, date: string, done: boolean): Promise<ActionResult> {
  return guard(() => {
    const d = dateSchema.parse(date);
    const h = getHabit(habitId);
    if (!h || h.type !== "boolean") return fail("No se encontró el hábito.");
    saveLog(h, d, { completed: done });
    refresh();
    return ok();
  });
}

export async function setHabitValue(habitId: number, date: string, value: number | null): Promise<ActionResult> {
  return guard(() => {
    const d = dateSchema.parse(date);
    const h = getHabit(habitId);
    if (!h || h.type !== "numeric") return fail("No se encontró el hábito.");
    if (value != null && (!Number.isFinite(value) || value < 0)) return fail("Ingresá una cantidad válida.");
    saveLog(h, d, { value });
    refresh();
    return ok();
  });
}

const habitSchema = z
  .object({
    name: z.string().trim().min(1, "El nombre es obligatorio").max(120),
    category: z.enum(["nutrition", "activity", "recovery", "wellbeing", "custom"]),
    type: z.enum(["boolean", "numeric"]),
    target_value: optionalNumber,
    target_max: optionalNumber,
    unit: z.string().trim().max(20).optional(),
    days: z.array(z.coerce.number().int().min(1).max(7)).min(1, "Elegí al menos un día"),
  })
  .superRefine((v, ctx) => {
    if (v.type === "numeric" && (v.target_value == null || v.target_value <= 0)) {
      ctx.addIssue({ code: "custom", path: ["target_value"], message: "Los hábitos numéricos necesitan un objetivo mayor a 0" });
    }
    if (v.target_max != null && v.target_value != null && v.target_max < v.target_value) {
      ctx.addIssue({ code: "custom", path: ["target_max"], message: "El máximo debe ser mayor o igual al objetivo" });
    }
  });

function parseHabit(fd: FormData) {
  return habitSchema.parse({
    name: fd.get("name"),
    category: fd.get("category") ?? "custom",
    type: fd.get("type") ?? "boolean",
    target_value: fd.get("target_value"),
    target_max: fd.get("target_max"),
    unit: fd.get("unit") ?? undefined,
    days: fd.getAll("days"),
  });
}

export async function createHabit(fd: FormData): Promise<ActionResult> {
  return guard(() => {
    const v = parseHabit(fd);
    run(
      `INSERT INTO habits (name, category, type, target_value, target_max, unit, days_of_week, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM habits))`,
      v.name,
      v.category,
      v.type,
      v.type === "numeric" ? v.target_value! : null,
      v.type === "numeric" ? (v.target_max ?? null) : null,
      v.type === "numeric" ? v.unit || null : null,
      [...new Set(v.days)].sort().join(","),
    );
    refresh();
    return ok("Hábito creado");
  });
}

/** Editing never touches past logs: each log carries its own target snapshot. */
export async function updateHabit(id: number, fd: FormData): Promise<ActionResult> {
  return guard(() => {
    const existing = getHabit(id);
    if (!existing) return fail("No se encontró el hábito.");
    const v = parseHabit(fd);
    const type = existing.system_key ? existing.type : v.type; // linked habits keep their type
    run(
      `UPDATE habits SET name = ?, category = ?, type = ?, target_value = ?, target_max = ?, unit = ?, days_of_week = ?
       WHERE id = ?`,
      v.name,
      v.category,
      type,
      type === "numeric" ? v.target_value! : null,
      type === "numeric" ? (v.target_max ?? null) : null,
      type === "numeric" ? v.unit || null : null,
      [...new Set(v.days)].sort().join(","),
      id,
    );
    refresh();
    return ok("Hábito actualizado");
  });
}

/** Habits with history are archived (history is kept); unused ones are removed. */
export async function deleteHabit(id: number): Promise<ActionResult> {
  return guard(() => {
    const h = getHabit(id);
    if (!h) return fail("No se encontró el hábito.");
    if (hasLogs(id) || h.system_key) {
      run("UPDATE habits SET archived_at = datetime('now') WHERE id = ?", id);
    } else {
      run("DELETE FROM habits WHERE id = ?", id);
    }
    refresh();
    return ok();
  });
}
