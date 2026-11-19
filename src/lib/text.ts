/** Quita tildes y pasa a minúsculas para comparar textos ("jamon" encuentra "Jamón"). */
export const normalizeText = (s: string): string => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Todos los términos de la búsqueda deben aparecer (en cualquier orden) en el texto. */
export function matchesSearch(text: string, query: string): boolean {
  const terms = normalizeText(query).split(/\s+/).filter(Boolean);
  if (!terms.length) return true;
  const hay = normalizeText(text);
  return terms.every((t) => hay.includes(t));
}
