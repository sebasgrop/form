"use client";

import { useState, useTransition } from "react";
import { ChevronLeft, Loader2, Search } from "lucide-react";
import { buttonClass, inputClass } from "@/components/ui/button";
import { searchUsdaFoods } from "@/features/nutrition/usda-actions";
import type { UsdaFood, UsdaScope, UsdaSearchResult } from "@/features/nutrition/usda";
import { nf } from "@/lib/format";
import { FoodForm } from "./forms";

const val = (n: number | null, digits = 1) => (n == null ? "—" : nf(n, digits));

export function UsdaSearch({ configured }: { configured: boolean }) {
  const [q, setQ] = useState("");
  const [scope, setScope] = useState<UsdaScope>("generic");
  const [result, setResult] = useState<UsdaSearchResult | null>(null);
  const [selected, setSelected] = useState<UsdaFood | null>(null);
  const [pending, start] = useTransition();

  if (!configured) {
    return (
      <div className="space-y-3 text-sm">
        <p>Para buscar en USDA FoodData Central falta configurar tu clave de API:</p>
        <ol className="list-decimal space-y-1 pl-5 text-muted">
          <li>
            En la carpeta del proyecto creá (o abrí) el archivo <code className="rounded bg-surface-2 px-1 py-0.5 text-xs text-fg">.env.local</code>.
          </li>
          <li>
            Agregá la línea <code className="rounded bg-surface-2 px-1 py-0.5 text-xs text-fg">USDA_API_KEY=tu_clave</code>.
          </li>
          <li>Guardá y reiniciá la app.</li>
        </ol>
        <p className="text-xs text-muted">La clave se queda solo en tu computadora y la usa únicamente el servidor.</p>
      </div>
    );
  }

  if (selected) {
    return (
      <div className="space-y-4">
        <button type="button" onClick={() => setSelected(null)} className={buttonClass("ghost", "sm")}>
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden /> Volver a los resultados
        </button>
        <FoodForm
          prefill={{
            fdcId: selected.fdcId,
            name: selected.name,
            calories: selected.calories,
            protein_g: selected.protein_g,
            carbs_g: selected.carbs_g,
            fat_g: selected.fat_g,
          }}
        />
      </div>
    );
  }

  function search(e: React.FormEvent) {
    e.preventDefault();
    start(async () => setResult(await searchUsdaFoods(q, scope)));
  }

  return (
    <div className="space-y-4">
      <form onSubmit={search} className="space-y-3" role="search">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Ej.: chicken breast, banana, oats"
              aria-label="Buscar alimento en USDA"
              maxLength={80}
              className={`${inputClass} pl-9`}
              data-autofocus=""
            />
          </div>
          <button type="submit" disabled={pending || q.trim().length < 2} className={buttonClass("primary")}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            Buscar
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
          <label className="flex items-center gap-1.5">
            Tipo
            <select value={scope} onChange={(e) => setScope(e.target.value as UsdaScope)} className="rounded-control border border-line-strong bg-surface px-2 py-1 text-xs text-fg">
              <option value="generic">Alimentos genéricos (recomendado)</option>
              <option value="branded">Productos de marca (EE. UU.)</option>
            </select>
          </label>
          <span>La base de USDA está en inglés: buscá en inglés.</span>
        </div>
      </form>

      {result && !result.ok && (
        <p role="alert" className="rounded-control border border-danger/30 bg-danger/5 px-3 py-2 text-sm">
          {result.error}
        </p>
      )}

      {result?.ok && (
        <div aria-live="polite">
          {result.foods.length === 0 ? (
            <p className="rounded-control bg-surface-2 px-3 py-6 text-center text-sm text-muted">Sin resultados. Probá con otro término, en inglés.</p>
          ) : (
            <>
              <p className="mb-2 text-xs text-muted">
                Mostrando {result.foods.length} de {nf(result.total)} resultados · valores por 100 g
              </p>
              <ul className="max-h-[22rem] divide-y divide-line overflow-y-auto rounded-control border border-line">
                {result.foods.map((f) => (
                  <li key={f.fdcId} className="flex items-center gap-2 p-3">
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm">{f.name}</p>
                      <p className="text-[11px] text-muted">
                        {f.dataType}
                        {f.brand ? ` · ${f.brand}` : ""}
                      </p>
                      <p className="text-[11px] tabular-nums text-muted">
                        {val(f.calories, 0)} kcal · P {val(f.protein_g)} · C {val(f.carbs_g)} · G {val(f.fat_g)}
                      </p>
                    </div>
                    <button type="button" onClick={() => setSelected(f)} className={buttonClass("secondary", "sm")}>
                      Usar
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
