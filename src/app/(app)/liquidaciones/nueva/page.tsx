import { createClient } from "@/lib/supabase/server";
import { LiquidacionForm } from "../liquidacion-form";

interface PageProps {
  searchParams: Promise<{ empleado_id?: string }>;
}

export default async function NuevaLiquidacionPage({ searchParams }: PageProps) {
  const { empleado_id } = await searchParams;
  const supabase = await createClient();

  const { data: empleados } = await supabase
    .from("empleados")
    .select("id, nombre, apellido, numero_empleado, fecha_ingreso, sueldo_quincenal, estado")
    .in("estado", ["activo", "periodo_prueba"])
    .order("apellido", { ascending: true });

  return <LiquidacionForm empleados={empleados || []} preselectedEmpleadoId={empleado_id} />;
}
