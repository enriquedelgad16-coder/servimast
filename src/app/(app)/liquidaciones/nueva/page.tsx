import { createClient } from "@/lib/supabase/server";
import { LiquidacionForm } from "../liquidacion-form";

export default async function NuevaLiquidacionPage() {
  const supabase = await createClient();

  const { data: empleados } = await supabase
    .from("empleados")
    .select("id, nombre, apellido, numero_empleado, fecha_ingreso, sueldo_quincenal, estado")
    .in("estado", ["activo", "periodo_prueba"])
    .order("apellido", { ascending: true });

  return <LiquidacionForm empleados={empleados || []} />;
}
