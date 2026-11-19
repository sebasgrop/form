// Formato numérico en español (coma decimal, punto de miles).
const LOCALE = "es-AR";

export function nf(n: number, maxFraction = 0): string {
  return n.toLocaleString(LOCALE, { maximumFractionDigits: maxFraction, minimumFractionDigits: 0 });
}

/** Siempre con `digits` decimales (ej. 80,5). */
export function fixed(n: number, digits = 1): string {
  return n.toLocaleString(LOCALE, { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

export function signed(n: number, digits = 1): string {
  return `${n > 0 ? "+" : ""}${fixed(n, digits)}`;
}
