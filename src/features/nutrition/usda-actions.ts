"use server";

import { searchUsda, type UsdaScope, type UsdaSearchResult } from "./usda";

/** Búsqueda en USDA FoodData Central (la clave vive solo en el servidor). */
export async function searchUsdaFoods(query: string, scope: UsdaScope): Promise<UsdaSearchResult> {
  return searchUsda(String(query ?? ""), scope === "branded" ? "branded" : "generic");
}
