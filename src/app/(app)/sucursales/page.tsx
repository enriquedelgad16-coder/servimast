import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SucursalesClient } from "./sucursales-client";

export default async function SucursalesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("rol")
    .eq("id", user.id)
    .single();
  if (profile?.rol !== "admin") redirect("/dashboard");

  const { data: sucursales } = await supabase
    .from("sucursales")
    .select("*")
    .order("nombre", { ascending: true });

  // Count employees per sucursal
  const { data: empleados } = await supabase
    .from("empleados")
    .select("sucursal_id")
    .eq("estado", "activo");

  const countMap: Record<string, number> = {};
  (empleados || []).forEach((e) => {
    const sid = e.sucursal_id || "sin_sucursal";
    countMap[sid] = (countMap[sid] || 0) + 1;
  });

  return (
    <SucursalesClient
      sucursales={sucursales || []}
      employeeCounts={countMap}
    />
  );
}
