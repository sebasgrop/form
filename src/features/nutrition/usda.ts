import "server-only";

/**
 * Cliente de USDA FoodData Central (https://fdc.nal.usda.gov).
 * La clave se lee de la variable de entorno USDA_API_KEY (archivo .env.local) y solo la usa el
 * servidor: nunca llega al navegador ni se incluye en mensajes de error.
 * Los valores nutricionales de la búsqueda son por 100 g.
 */

export type UsdaScope = "generic" | "branded";

export type UsdaFood = {
  fdcId: number;
  name: string;
  dataType: string;
  brand: string | null;
  // null = USDA no informa ese valor (no se inventa)
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
};

export type UsdaSearchResult = { ok: true; foods: UsdaFood[]; total: number } | { ok: false; error: string };

const ENDPOINT = "https://api.nal.usda.gov/fdc/v1/foods/search";

const DATA_TYPES: Record<UsdaScope, string[]> = {
  generic: ["Foundation", "SR Legacy", "Survey (FNDDS)"],
  branded: ["Branded"],
};

export const usdaConfigured = (): boolean => Boolean(process.env.USDA_API_KEY?.trim());

type RawNutrient = { nutrientId?: number; unitName?: string; value?: number };
type RawFood = {
  fdcId: number;
  description?: string;
  dataType?: string;
  brandOwner?: string;
  brandName?: string;
  foodNutrients?: RawNutrient[];
};

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Primer nutriente disponible entre los ids indicados (en orden de preferencia). */
function pick(nutrients: RawNutrient[], ids: number[], unit?: string): number | null {
  for (const id of ids) {
    const n = nutrients.find((x) => x.nutrientId === id && typeof x.value === "number");
    if (n && (!unit || n.unitName?.toUpperCase() === unit)) return round1(n.value as number);
  }
  return null;
}

export function normalizeFood(f: RawFood): UsdaFood {
  const n = f.foodNutrients ?? [];
  return {
    fdcId: f.fdcId,
    name: (f.description ?? "").trim() || `Alimento ${f.fdcId}`,
    dataType: f.dataType ?? "",
    brand: (f.brandName || f.brandOwner || "").trim() || null,
    // 1008 = energía (kcal); 2047/2048 = energía con factores Atwater (alimentos de Foundation)
    calories: pick(n, [1008, 2047, 2048], "KCAL"),
    protein_g: pick(n, [1003], "G"),
    carbs_g: pick(n, [1005], "G"),
    fat_g: pick(n, [1004], "G"),
  };
}

export async function searchUsda(query: string, scope: UsdaScope): Promise<UsdaSearchResult> {
  const key = process.env.USDA_API_KEY?.trim();
  if (!key) {
    return {
      ok: false,
      error: "Falta configurar la clave de USDA. Creá el archivo .env.local con USDA_API_KEY=tu_clave y reiniciá la app (ver README).",
    };
  }
  const q = query.trim();
  if (q.length < 2) return { ok: false, error: "Escribí al menos 2 letras para buscar." };
  if (q.length > 80) return { ok: false, error: "La búsqueda es demasiado larga." };

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Api-Key": key },
      body: JSON.stringify({ query: q, dataType: DATA_TYPES[scope], pageSize: 25 }),
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    });
    if (res.status === 401 || res.status === 403) {
      return { ok: false, error: "USDA rechazó la clave. Revisá que esté bien copiada en .env.local." };
    }
    if (res.status === 429) {
      return { ok: false, error: "Llegaste al límite de consultas de USDA (por hora). Probá de nuevo en un rato." };
    }
    if (!res.ok) return { ok: false, error: `USDA no pudo responder (código ${res.status}). Probá de nuevo más tarde.` };

    const json = (await res.json()) as { foods?: RawFood[]; totalHits?: number };
    const foods = (json.foods ?? []).filter((f) => typeof f.fdcId === "number").map(normalizeFood);
    return { ok: true, foods, total: json.totalHits ?? foods.length };
  } catch {
    return { ok: false, error: "No se pudo conectar con USDA. Revisá tu conexión a internet." };
  }
}
