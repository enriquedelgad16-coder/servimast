import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NominaGrid } from "./nomina-grid";

interface PageProps {
  params: Promise<{ quincenaId: string }>;
}

export default async function QuincenaDetallePage({ params }: PageProps) {
  const { quincenaId } = await params;
  const supabase = await createClient();

  const { data: quincena, error: qError } = await supabase
    .from("quincenas")
    .select("*")
    .eq("id", quincenaId)
    .single();

  if (qError || !quincena) notFound();

  // Get nomina items with empleado info
  const { data: nominaItems } = await supabase
    .from("nomina_items")
    .select("*, empleado:empleados(*)")
    .eq("quincena_id", quincenaId)
    .order("created_at", { ascending: true });

  // Get all active employees
  const { data: empleados } = await supabase
    .from("empleados")
    .select("*")
    .eq("estado", "activo")
    .order("apellido", { ascending: true });

  return (
    <NominaGrid
      quincena={quincena}
      nominaItems={nominaItems || []}
      empleados={empleados || []}
    />
  );
}
