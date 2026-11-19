"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Apple, Dumbbell, LayoutDashboard, ListChecks, Ruler, Settings } from "lucide-react";
import { cn } from "@/lib/cn";

const MAIN = [
  { href: "/dashboard", label: "Panel", icon: LayoutDashboard },
  { href: "/habits", label: "Hábitos", icon: ListChecks },
  { href: "/training", label: "Entrenamiento", short: "Entreno", icon: Dumbbell },
  { href: "/nutrition", label: "Nutrición", icon: Apple },
  { href: "/body", label: "Cuerpo", icon: Ruler },
] as const;

const SETTINGS = { href: "/settings", label: "Ajustes", icon: Settings } as const;

function useActive() {
  const pathname = usePathname();
  return (href: string) => pathname === href || pathname.startsWith(href + "/");
}

export function Sidebar() {
  const isActive = useActive();
  const item = (n: { href: string; label: string; icon: typeof Activity }) => {
    const Icon = n.icon;
    const active = isActive(n.href);
    return (
      <Link
        key={n.href}
        href={n.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex items-center gap-3 rounded-control px-3 py-2 text-sm transition-colors",
          active ? "bg-accent-soft font-medium text-accent-strong" : "text-muted hover:bg-surface-2 hover:text-fg",
        )}
      >
        <Icon className="h-4 w-4" aria-hidden />
        {n.label}
      </Link>
    );
  };
  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col border-r border-line bg-surface px-4 py-6 lg:flex">
      <Link href="/dashboard" className="mb-8 flex items-center gap-2 px-3 text-lg font-semibold tracking-[0.2em]">
        <span className="h-2.5 w-2.5 rounded-full bg-accent" aria-hidden />
        FORM
      </Link>
      <nav aria-label="Principal" className="flex flex-1 flex-col gap-1">
        {MAIN.map(item)}
      </nav>
      <nav aria-label="Secundaria">{item(SETTINGS)}</nav>
    </aside>
  );
}

export function MobileHeader() {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-surface/90 px-4 py-3 backdrop-blur lg:hidden">
      <Link href="/dashboard" className="flex items-center gap-2 font-semibold tracking-[0.2em]">
        <span className="h-2.5 w-2.5 rounded-full bg-accent" aria-hidden />
        FORM
      </Link>
      <Link href="/settings" aria-label="Ajustes" className="rounded-control p-2 text-muted hover:text-fg">
        <Settings className="h-5 w-5" />
      </Link>
    </header>
  );
}

export function BottomNav() {
  const isActive = useActive();
  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      {MAIN.map((n) => {
        const Icon = n.icon;
        const active = isActive(n.href);
        return (
          <Link
            key={n.href}
            href={n.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex flex-col items-center gap-1 py-2.5 text-[11px] transition-colors",
              active ? "font-medium text-accent-strong" : "text-muted",
            )}
          >
            <Icon className="h-5 w-5" aria-hidden />
            {"short" in n ? n.short : n.label}
          </Link>
        );
      })}
    </nav>
  );
}
