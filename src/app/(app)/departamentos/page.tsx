import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DepartamentosClient } from "./departamentos-client";

export default async function DepartamentosPage() {
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

  const { data: departamentos } = await supabase
    .from("departamentos")
    .select("*")
    .order("nombre", { ascending: true });

  // Count employees per department
  const { data: empleados } = await supabase
    .from("empleados")
    .select("departamento")
    .eq("estado", "activo");

  const countMap: Record<string, number> = {};
  (empleados || []).forEach((e) => {
    const dept = e.departamento || "Sin departamento";
    countMap[dept] = (countMap[dept] || 0) + 1;
  });

  return (
    <DepartamentosClient
      departamentos={departamentos || []}
      employeeCounts={countMap}
    />
  );
}
