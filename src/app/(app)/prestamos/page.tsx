import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Plus, Wallet } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const ESTADO_BADGES: Record<string, string> = {
  activo: "bg-success-100 text-success-600",
  pagado: "bg-info-100 text-info-500",
  cancelado: "bg-gray-100 text-gray-600",
};

export default async function PrestamosPage() {
  const supabase = await createClient();

  const { data: prestamos } = await supabase
    .from("prestamos")
    .select("*, empleado:empleados(nombre, apellido, numero_empleado)")
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Préstamos</h1>
          <p className="text-gray-500 text-sm mt-1">
            Gestión de préstamos a empleados
          </p>
        </div>
        <Link
          href="/prestamos/nuevo"
          className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-4 py-2.5 rounded-lg transition-colors shadow-sm"
        >
          <Plus className="h-5 w-5" />
          Nuevo Préstamo
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-500">Empleado</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Monto Total</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Cuota Quinc.</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Pagado</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Saldo Pend.</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Cuotas</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Fecha Inicio</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(!prestamos || prestamos.length === 0) ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-gray-400">
                    <Wallet className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>No hay préstamos registrados</p>
                  </td>
                </tr>
              ) : (
                prestamos.map((p) => {
                  const emp = p.empleado as { nombre: string; apellido: string; numero_empleado: string } | null;
                  return (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {emp ? `${emp.apellido}, ${emp.nombre}` : "—"}
                        <span className="block text-xs text-gray-400">{emp?.numero_empleado}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono">{formatCurrency(p.monto_total)}</td>
                      <td className="px-4 py-3 text-right font-mono">{formatCurrency(p.cuota_quincenal)}</td>
                      <td className="px-4 py-3 text-right font-mono text-success-600">{formatCurrency(p.monto_total - p.saldo_pendiente)}</td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-danger-600">{formatCurrency(p.saldo_pendiente)}</td>
                      <td className="px-4 py-3 text-center text-gray-600">
                        {p.numero_cuotas_pagadas}/{p.numero_cuotas_estimado || "—"}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600">{p.fecha_inicio}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${ESTADO_BADGES[p.estado] || ""}`}>
                          {p.estado.charAt(0).toUpperCase() + p.estado.slice(1)}
                        </span>
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
