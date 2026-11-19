import { BottomNav, MobileHeader, Sidebar } from "@/components/layout/nav";

// Everything here reads live data from the local SQLite file.
export const dynamic = "force-dynamic";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <Sidebar />
      <MobileHeader />
      <main className="pb-28 lg:pb-12 lg:pl-60">
        <div className="rise mx-auto w-full max-w-6xl px-4 pt-6 lg:px-10 lg:pt-10">{children}</div>
      </main>
      <BottomNav />
    </div>
  );
}
