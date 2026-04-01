import { createClient } from "@/lib/supabase/server";
import { History, Calendar } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";

const ESTADO_BADGES: Record<string, string> = {
  borrador: "bg-gray-100 text-gray-600",
  procesando: "bg-amber-100 text-amber-600",
  aprobada: "bg-cyan-100 text-cyan-600",
  pagada: "bg-green-100 text-green-600",
};

export default async function HistorialPage() {
  const supabase = await createClient();

  const { data: quincenas } = await supabase
    .from("quincenas")
    .select("*")
    .order("periodo_inicio", { ascending: false })
    .limit(50);

  // Get totals for each quincena
  const quincenaIds = (quincenas || []).map((q) => q.id);
  let totalesByQuincena: Record<
    string,
    { devengado: number; deducciones: number; neto: number; count: number }
  > = {};

  if (quincenaIds.length > 0) {
    const { data: items } = await supabase
      .from("nomina_items")
      .select("quincena_id, subtotal_devengado, total_deducciones, total_neto")
      .in("quincena_id", quincenaIds);

    if (items) {
      for (const item of items) {
        if (!totalesByQuincena[item.quincena_id]) {
          totalesByQuincena[item.quincena_id] = {
            devengado: 0,
            deducciones: 0,
            neto: 0,
            count: 0,
          };
        }
        totalesByQuincena[item.quincena_id].devengado +=
          item.subtotal_devengado;
        totalesByQuincena[item.quincena_id].deducciones +=
          item.total_deducciones;
        totalesByQuincena[item.quincena_id].neto += item.total_neto;
        totalesByQuincena[item.quincena_id].count += 1;
      }
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <History className="h-7 w-7 text-cyan-500" />
          Historial de Nóminas
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Registro histórico de todas las quincenas procesadas
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-500">
                  Período
                </th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">
                  Empleados
                </th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">
                  Total Devengado
                </th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">
                  Total Deducciones
                </th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">
                  Total Neto
                </th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">
                  Estado
                </th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">
                  Fecha Pago
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(!quincenas || quincenas.length === 0) ? (
                <tr>
                  <td
                    colSpan={7}
                    className="text-center py-12 text-gray-400"
                  >
                    <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>No hay quincenas registradas</p>
                  </td>
                </tr>
              ) : (
                quincenas.map((q) => {
                  const totals = totalesByQuincena[q.id];
                  return (
                    <tr
                      key={q.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/nomina/${q.id}`}
                          className="font-medium text-cyan-600 hover:text-cyan-700"
                        >
                          {q.periodo_inicio} — {q.periodo_fin}
                        </Link>
                        {q.descripcion && (
                          <span className="block text-xs text-gray-400">
                            {q.descripcion}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600">
                        {totals?.count || 0}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        {totals
                          ? formatCurrency(totals.devengado)
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-red-500">
                        {totals
                          ? formatCurrency(totals.deducciones)
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold">
                        {totals ? formatCurrency(totals.neto) : "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${ESTADO_BADGES[q.estado] || ""}`}
                        >
                          {q.estado.charAt(0).toUpperCase() +
                            q.estado.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600">
                        {q.fecha_pago || "—"}
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
