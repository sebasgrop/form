"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { buttonClass } from "./button";

const ModalCtx = createContext<(() => void) | null>(null);
export const useModalClose = () => useContext(ModalCtx);

export function ModalButton({
  label,
  title,
  icon,
  variant = "secondary",
  size = "md",
  children,
  ariaLabel,
  wide = false,
}: {
  label?: string;
  title: string;
  icon?: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
  children: React.ReactNode;
  ariaLabel?: string;
  wide?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDialogElement>(null);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      // foco en el primer campo (autoFocus se dispara antes de abrir el diálogo)
      (
        d.querySelector<HTMLElement>("[data-autofocus]") ??
        d.querySelector<HTMLElement>("input:not([type=hidden]), select, textarea")
      )?.focus();
    }
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <>
      <button type="button" className={buttonClass(variant, size)} onClick={() => setOpen(true)} aria-label={ariaLabel}>
        {icon}
        {label}
      </button>
      <dialog
        ref={ref}
        onClose={() => setOpen(false)}
        onClick={(e) => e.target === ref.current && setOpen(false)}
        className={`m-auto rounded-card border border-line-strong bg-surface p-0 text-left text-fg shadow-2xl backdrop:bg-slate-900/40 backdrop:backdrop-blur-sm ${
          wide ? "w-[min(92vw,42rem)]" : "w-[min(92vw,30rem)]"
        }`}
      >
        {open && (
          <ModalCtx.Provider value={close}>
            <div className="max-h-[85dvh] overflow-y-auto p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-semibold">{title}</h2>
                <button type="button" onClick={close} className={buttonClass("ghost", "sm", "w-8 px-0")} aria-label="Cerrar">
                  <X className="h-4 w-4" />
                </button>
              </div>
              {children}
            </div>
          </ModalCtx.Provider>
        )}
      </dialog>
    </>
  );
}
