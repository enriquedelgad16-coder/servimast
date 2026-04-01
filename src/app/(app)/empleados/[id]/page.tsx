import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EmpleadoForm } from "../empleado-form";
import { EmpleadoDetalle } from "./empleado-detalle";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string }>;
}

export default async function EmpleadoPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { edit } = await searchParams;

  const supabase = await createClient();

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

  return <EmpleadoDetalle empleado={empleado} />;
}
