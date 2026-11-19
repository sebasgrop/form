import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Card, PageHeader } from "@/components/ui/card";
import { CatalogLibrary } from "@/components/training/catalog-library";
import { listCatalog, listMuscles } from "@/features/training/catalog";

export const metadata: Metadata = { title: "Biblioteca de ejercicios" };

export default function LibraryPage() {
  const catalog = listCatalog();
  const muscles = listMuscles();
  return (
    <>
      <Link href="/training" className="mb-3 inline-flex items-center gap-1 text-xs text-muted hover:text-fg">
        <ChevronLeft className="h-3.5 w-3.5" aria-hidden /> Entrenamiento
      </Link>
      <PageHeader
        title="Biblioteca de ejercicios"
        subtitle="Cada ejercicio indica sus músculos principales y accesorios. Esa información permitirá medir tu progreso por músculo."
      />
      <Card>
        <CatalogLibrary catalog={catalog} muscles={muscles} />
      </Card>
    </>
  );
}
