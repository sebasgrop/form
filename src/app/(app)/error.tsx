"use client";

import { ErrorState } from "@/components/ui/states";
import { buttonClass } from "@/components/ui/button";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="space-y-4">
      <ErrorState message={error.message || "Algo salió mal al cargar esta página."} />
      <button onClick={reset} className={buttonClass("secondary")}>
        Reintentar
      </button>
    </div>
  );
}
