"use client";

import { useRef, useState, useTransition } from "react";
import { Check, Loader2 } from "lucide-react";
import type { ActionResult } from "@/lib/action";
import { cn } from "@/lib/cn";
import { buttonClass } from "./button";
import { useModalClose } from "./modal";

/** Form bound to a server action with pending / success / error states. */
export function ActionForm({
  action,
  children,
  submitLabel = "Guardar",
  className,
  reset = true,
  hideSubmit = false,
  submitVariant = "primary",
  onSuccess,
}: {
  action: (fd: FormData) => Promise<ActionResult>;
  children: React.ReactNode;
  submitLabel?: string;
  className?: string;
  reset?: boolean;
  hideSubmit?: boolean;
  submitVariant?: "primary" | "secondary";
  onSuccess?: () => void;
}) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const closeModal = useModalClose();

  return (
    <form
      ref={formRef}
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          const r = await action(fd);
          setResult(r);
          if (r.ok) {
            if (reset) formRef.current?.reset();
            onSuccess?.();
            closeModal?.();
          }
        });
      }}
    >
      {children}
      {!hideSubmit && (
        <div className="mt-4 flex items-center gap-3">
          <button type="submit" disabled={pending} className={buttonClass(submitVariant)}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {submitLabel}
          </button>
          {result && !pending && (
            <p
              role={result.ok ? "status" : "alert"}
              className={cn("flex items-center gap-1.5 text-xs", result.ok ? "text-ok" : "text-danger")}
            >
              {result.ok && <Check className="h-3.5 w-3.5" aria-hidden />}
              {result.ok ? (result.message ?? "Guardado") : result.error}
            </p>
          )}
        </div>
      )}
    </form>
  );
}

/** Button that fires a server action (delete, finish...) with optional confirmation. */
export function ActionButton({
  action,
  children,
  confirm,
  variant = "ghost",
  size = "sm",
  className,
  ariaLabel,
}: {
  action: () => Promise<ActionResult>;
  children: React.ReactNode;
  confirm?: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
  className?: string;
  ariaLabel?: string;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <button
        type="button"
        disabled={pending}
        aria-label={ariaLabel}
        className={buttonClass(variant, size, className)}
        onClick={() => {
          if (confirm && !window.confirm(confirm)) return;
          start(async () => {
            const r = await action();
            setError(r.ok ? null : r.error);
          });
        }}
      >
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : children}
      </button>
      {error && (
        <span role="alert" className="text-xs text-danger">
          {error}
        </span>
      )}
    </>
  );
}
