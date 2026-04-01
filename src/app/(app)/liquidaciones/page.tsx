import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Plus, FileText, Eye } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

const MOTIVO_LABELS: Record<string, string> = {
  despido_sin_causa: "Despido sin causa",
  renuncia: "Renuncia",
  mutuo_acuerdo: "Mutuo acuerdo",
  fin_contrato: "Fin de contrato",
};

export default async function LiquidacionesPage() {
  const supabase = await createClient();

  const { data: liquidaciones, error } = await supabase
    .from("liquidaciones")
    .select("*, empleado:empleados(nombre, apellido, numero_empleado)")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="text-danger-600 p-4">
        Error al cargar liquidaciones: {error.message}
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Liquidaciones</h1>
          <p className="text-gray-500 text-sm mt-1">
            Calculo de liquidaciones y prestaciones laborales segun Ley 16-92
          </p>
        </div>
        <Link
          href="/liquidaciones/nueva"
          className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-4 py-2.5 rounded-lg transition-colors shadow-sm"
        >
          <Plus className="h-5 w-5" />
          Nueva Liquidacion
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-500">Empleado</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Fecha Ingreso</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Fecha Salida</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Motivo</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Total Liquidacion</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Estado</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(!liquidaciones || liquidaciones.length === 0) ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400">
                    <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>No hay liquidaciones registradas</p>
                    <p className="text-sm mt-1">Crea una nueva liquidacion para comenzar</p>
                  </td>
                </tr>
              ) : (
                liquidaciones.map((liq) => {
                  const emp = liq.empleado as { nombre: string; apellido: string; numero_empleado: string } | null;
                  const aprobada = !!liq.fecha_aprobacion;
                  return (
                    <tr key={liq.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {emp ? `${emp.apellido}, ${emp.nombre}` : "—"}
                        <span className="block text-xs text-gray-400">{emp?.numero_empleado}</span>
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600">{formatDate(liq.fecha_ingreso)}</td>
                      <td className="px-4 py-3 text-center text-gray-600">{formatDate(liq.fecha_salida)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                          {MOTIVO_LABELS[liq.motivo] || liq.motivo}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-gray-900">
                        {formatCurrency(liq.total_liquidacion)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          aprobada
                            ? "bg-success-100 text-success-600"
                            : "bg-warning-100 text-warning-500"
                        }`}>
                          {aprobada ? "Aprobada" : "Pendiente"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Link
                          href={`/liquidaciones/${liq.id}`}
                          className="inline-flex items-center gap-1 text-cyan-600 hover:text-cyan-700 font-medium text-xs"
                        >
                          <Eye className="h-4 w-4" />
                          Ver
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
