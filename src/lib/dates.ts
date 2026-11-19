// Los días calendario son strings 'YYYY-MM-DD' en la zona horaria local de la máquina.

const pad = (n: number) => String(n).padStart(2, "0");
const LOCALE = "es-AR";

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function today(): string {
  return toISODate(new Date());
}

/** SQLite guarda datetime('now') en UTC 'YYYY-MM-DD HH:MM:SS'; lo convierte al día local. */
export function utcToLocalDate(s: string): string {
  return toISODate(new Date(s.replace(" ", "T") + "Z"));
}

export function parseISODate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(s: string, n: number): string {
  const d = parseISODate(s);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

/** Día ISO: 1 = lunes ... 7 = domingo */
export function isoWeekday(s: string): number {
  const d = parseISODate(s).getDay();
  return d === 0 ? 7 : d;
}

export function startOfWeek(s: string): string {
  return addDays(s, -(isoWeekday(s) - 1));
}

export function lastNDays(n: number, end = today()): string[] {
  return Array.from({ length: n }, (_, i) => addDays(end, i - (n - 1)));
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "Miércoles 18 de noviembre" */
export function formatLong(s: string): string {
  return cap(parseISODate(s).toLocaleDateString(LOCALE, { weekday: "long", day: "numeric", month: "long" }).replace(",", ""));
}

/** "18 nov" */
export function formatShort(s: string): string {
  return parseISODate(s).toLocaleDateString(LOCALE, { day: "numeric", month: "short" }).replace(".", "");
}

export const WEEKDAYS_SHORT = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
export const WEEKDAYS_LONG = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
