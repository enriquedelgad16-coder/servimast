import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Plus, Calendar, Eye } from "lucide-react";
import { NuevaQuincenaDialog } from "./nueva-quincena-dialog";

const ESTADO_BADGES: Record<string, string> = {
  borrador: "bg-gray-100 text-gray-600",
  procesando: "bg-warning-100 text-warning-500",
  aprobada: "bg-info-100 text-info-500",
  pagada: "bg-success-100 text-success-600",
};

export default async function NominaPage() {
  const supabase = await createClient();

  const { data: quincenas } = await supabase
    .from("quincenas")
    .select("*, nomina_items(count)")
    .order("periodo_fin", { ascending: false });

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nómina</h1>
          <p className="text-gray-500 text-sm mt-1">
            Gestión de nómina quincenal
          </p>
        </div>
        <NuevaQuincenaDialog />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-500">
                  Período
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">
                  Descripción
                </th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">
                  Días Hábiles
                </th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">
                  Empleados
                </th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">
                  Estado
                </th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(!quincenas || quincenas.length === 0) ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400">
                    <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>No hay quincenas registradas</p>
                    <p className="text-xs mt-1">Cree una nueva quincena para comenzar</p>
                  </td>
                </tr>
              ) : (
                quincenas.map((q) => (
                  <tr key={q.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-gray-900">
                      {q.periodo_inicio} — {q.periodo_fin}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {q.descripcion || "—"}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">
                      {q.dias_habiles || "—"}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">
                      {(q.nomina_items as { count: number }[])?.[0]?.count || 0}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${ESTADO_BADGES[q.estado] || ""}`}>
                        {q.estado.charAt(0).toUpperCase() + q.estado.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Link
                        href={`/nomina/${q.id}`}
                        className="inline-flex items-center gap-1.5 text-cyan-500 hover:text-cyan-600 font-medium text-sm"
                      >
                        <Eye className="h-4 w-4" />
                        Ver
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
