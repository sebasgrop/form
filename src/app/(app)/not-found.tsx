import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";

export default function NotFound() {
  return (
    <EmptyState
      title="No encontramos lo que buscabas"
      description="Puede haberse eliminado."
      action={
        <Link href="/dashboard" className={buttonClass("secondary")}>
          Ir al panel
        </Link>
      }
    />
  );
}
