import { createClient } from "@/lib/supabase/server";
import VacacionesClient from "./vacaciones-client";

export default async function VacacionesPage() {
  const supabase = await createClient();

  const [{ data: empleados }, { data: vacaciones }] = await Promise.all([
    supabase
      .from("empleados")
      .select("*")
      .in("estado", ["activo", "periodo_prueba"])
      .order("apellido"),
    supabase
      .from("vacaciones")
      .select("*, empleado:empleados(nombre, apellido)")
      .order("fecha_inicio", { ascending: false }),
  ]);

  return (
    <VacacionesClient
      empleados={empleados ?? []}
      vacaciones={vacaciones ?? []}
    />
  );
}
