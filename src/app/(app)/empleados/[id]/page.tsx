import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EmpleadoForm } from "../empleado-form";
import { EmpleadoDetailClient } from "./empleado-detail-client";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string }>;
}

export default async function EmpleadoPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { edit } = await searchParams;

  const supabase = await createClient();

  // Fetch empleado
  const { data: empleado, error } = await supabase
    .from("empleados")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !empleado) {
    notFound();
  }

  if (edit === "true") {
    return <EmpleadoForm empleado={empleado} />;
  }

  // Fetch nomina items with quincena info
  const { data: nominaItems } = await supabase
    .from("nomina_items")
    .select("*, quincena:quincenas(*)")
    .eq("empleado_id", id)
    .order("created_at", { ascending: false });

  // Fetch prestamos
  const { data: prestamos } = await supabase
    .from("prestamos")
    .select("*")
    .eq("empleado_id", id)
    .order("fecha_inicio", { ascending: false });

  // Fetch vacaciones
  const { data: vacaciones } = await supabase
    .from("vacaciones")
    .select("*")
    .eq("empleado_id", id)
    .order("fecha_inicio", { ascending: false });

  // Fetch liquidaciones
  const { data: liquidaciones } = await supabase
    .from("liquidaciones")
    .select("*")
    .eq("empleado_id", id)
    .order("created_at", { ascending: false });

  return (
    <EmpleadoDetailClient
      empleado={empleado}
      nominaItems={nominaItems || []}
      prestamos={prestamos || []}
      vacaciones={vacaciones || []}
      liquidaciones={liquidaciones || []}
    />
  );
}
