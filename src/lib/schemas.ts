import { z } from "zod";

export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida");

/** Vacío / null / ausente -> undefined; en otro caso, un número finito. */
export const optionalNumber = z.preprocess(
  (v) => (v === "" || v == null ? undefined : Number(v)),
  z.number({ error: "Ingresá un número válido" }).finite("Ingresá un número válido").optional(),
);

export const requiredNumber = (label: string) =>
  z.preprocess(
    (v) => (v === "" || v == null ? undefined : Number(v)),
    z.number({ error: `${label}: ingresá un número` }).finite(`${label}: ingresá un número válido`),
  );
