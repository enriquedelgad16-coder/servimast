import { createClient } from "@/lib/supabase/server";
import { RegaliaPascualClient } from "./regalia-pascual-client";

export default async function RegaliaPascualPage() {
  const supabase = await createClient();

  // Fetch active employees
  const { data: empleados } = await supabase
    .from("empleados")
    .select("id, numero_empleado, cedula, nombre, apellido, cargo, departamento, fecha_ingreso, sueldo_quincenal, tarifa_hora, banco, numero_cuenta, nss, estado")
    .in("estado", ["activo", "periodo_prueba"])
    .order("apellido");

  // Fetch all quincenas with nomina items for calculation
  const { data: quincenas } = await supabase
    .from("quincenas")
    .select("id, periodo_inicio, periodo_fin, estado, descripcion")
    .order("periodo_inicio", { ascending: false });

  return (
    <RegaliaPascualClient
      empleados={empleados || []}
      quincenas={quincenas || []}
    />
  );
}
