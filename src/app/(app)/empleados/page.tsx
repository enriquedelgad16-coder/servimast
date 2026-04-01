import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { EmpleadosTable } from "./empleados-table";

export default async function EmpleadosPage() {
  const supabase = await createClient();

  const { data: empleados, error } = await supabase
    .from("empleados")
    .select("*")
    .order("apellido", { ascending: true });

  if (error) {
    return (
      <div className="text-danger-600 p-4">
        Error al cargar empleados: {error.message}
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Empleados</h1>
          <p className="text-gray-500 text-sm mt-1">
            {empleados?.length || 0} empleados registrados
          </p>
        </div>
        <Link
          href="/empleados/nuevo"
          className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-4 py-2.5 rounded-lg transition-colors shadow-sm"
        >
          <Plus className="h-5 w-5" />
          Nuevo Empleado
        </Link>
      </div>

      <EmpleadosTable empleados={empleados || []} />
    </div>
  );
}
