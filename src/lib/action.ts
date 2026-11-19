export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

export const ok = (message?: string): ActionResult => ({ ok: true, message });
export const fail = (error: string): ActionResult => ({ ok: false, error });

/** Envuelve el cuerpo de una server action: los errores (zod, restricciones SQLite) pasan a mensajes claros. */
export async function guard(fn: () => ActionResult | Promise<ActionResult>): Promise<ActionResult> {
  try {
    return await fn();
  } catch (e) {
    if (e && typeof e === "object" && "issues" in e && Array.isArray((e as { issues: unknown[] }).issues)) {
      const first = (e as { issues: { message: string }[] }).issues[0];
      return fail(first.message);
    }
    const msg = e instanceof Error ? e.message : "Algo salió mal";
    if (msg.includes("UNIQUE")) return fail("Ese registro ya existe.");
    if (msg.includes("CHECK")) return fail("Alguno de los valores está fuera del rango permitido.");
    if (msg.includes("FOREIGN KEY")) return fail("Este elemento todavía está en uso por otros registros.");
    return fail(msg);
  }
}
