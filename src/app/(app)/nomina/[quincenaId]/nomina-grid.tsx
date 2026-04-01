"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { calcularNomina } from "@/lib/calculations/nomina";
import { formatCurrency } from "@/lib/utils";
import {
  ArrowLeft,
  UserPlus,
  Calculator,
  CheckCircle,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import type { Quincena, NominaItem, Empleado } from "@/types";

interface NominaGridProps {
  quincena: Quincena;
  nominaItems: NominaItem[];
  empleados: Empleado[];
}

const ESTADO_BADGES: Record<string, string> = {
  borrador: "bg-gray-100 text-gray-600",
  procesando: "bg-warning-100 text-warning-500",
  aprobada: "bg-info-100 text-info-500",
  pagada: "bg-success-100 text-success-600",
};

export function NominaGrid({
  quincena,
  nominaItems,
  empleados,
}: NominaGridProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Employees not yet in this quincena
  const employeesInNomina = new Set(nominaItems.map((ni) => ni.empleado_id));
  const availableEmployees = empleados.filter(
    (e) => !employeesInNomina.has(e.id)
  );

  async function addAllEmployees() {
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      const items = availableEmployees.map((emp) => {
        const calc = calcularNomina({
          horas_base: 88,
          tarifa_hora: emp.tarifa_hora,
          horas_extras_diurnas: 0,
          horas_extras_nocturnas: 0,
          horas_extras_feriados: 0,
          instalaciones_gpon: 0,
          instalaciones_red: 0,
          tarifa_gpon: 0,
          tarifa_red: 0,
          metas_cumplimiento: 0,
          otros_ingresos: 0,
          faltas_dias: 0,
          dias_habiles_quincena: quincena.dias_habiles || 11,
          otros_descuentos: 0,
          prestamos_activos: [],
        });

        return {
          quincena_id: quincena.id,
          empleado_id: emp.id,
          horas_base: 88,
          tarifa_hora: emp.tarifa_hora,
          salario_base_calc: calc.salario_base,
          subtotal_devengado: calc.subtotal_devengado,
          afp_monto: calc.afp_monto,
          sfs_monto: calc.sfs_monto,
          isr_monto: calc.isr_monto,
          total_deducciones: calc.total_deducciones,
          total_neto: calc.total_neto,
          afp_patronal_monto: calc.afp_patronal,
          sfs_patronal_monto: calc.sfs_patronal,
          srl_patronal_monto: calc.srl_patronal,
          alerta_neto_negativo: calc.alerta_neto_negativo,
          alerta_limite_descuentos: calc.alerta_limite_descuentos,
        };
      });

      if (items.length > 0) {
        const { error: insertError } = await supabase
          .from("nomina_items")
          .insert(items);

        if (insertError) throw insertError;
      }

      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al agregar empleados");
    } finally {
      setLoading(false);
    }
  }

  async function recalcularTodos() {
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      for (const item of nominaItems) {
        // Get active loans for this employee
        const { data: prestamos } = await supabase
          .from("prestamos")
          .select("cuota_quincenal, saldo_pendiente")
          .eq("empleado_id", item.empleado_id)
          .eq("estado", "activo");

        const calc = calcularNomina({
          horas_base: item.horas_base,
          tarifa_hora: item.tarifa_hora,
          horas_extras_diurnas: item.horas_extras_diurnas,
          horas_extras_nocturnas: item.horas_extras_nocturnas,
          horas_extras_feriados: item.horas_extras_feriados,
          instalaciones_gpon: item.instalaciones_gpon,
          instalaciones_red: item.instalaciones_red,
          tarifa_gpon: item.tarifa_instalacion_gpon,
          tarifa_red: item.tarifa_instalacion_red,
          metas_cumplimiento: item.metas_cumplimiento,
          otros_ingresos: item.otros_ingresos,
          faltas_dias: item.faltas_dias,
          dias_habiles_quincena: quincena.dias_habiles || 11,
          otros_descuentos: item.otros_descuentos,
          prestamos_activos: prestamos || [],
        });

        await supabase
          .from("nomina_items")
          .update({
            salario_base_calc: calc.salario_base,
            monto_extras_diurnas: calc.monto_extras_diurnas,
            monto_extras_nocturnas: calc.monto_extras_nocturnas,
            monto_extras_feriados: calc.monto_extras_feriados,
            monto_instalaciones_gpon: calc.monto_gpon,
            monto_instalaciones_red: calc.monto_red,
            subtotal_devengado: calc.subtotal_devengado,
            deduccion_por_faltas: calc.deduccion_faltas,
            afp_monto: calc.afp_monto,
            sfs_monto: calc.sfs_monto,
            isr_monto: calc.isr_monto,
            deduccion_prestamos: calc.deduccion_prestamos,
            total_deducciones: calc.total_deducciones,
            total_neto: calc.total_neto,
            afp_patronal_monto: calc.afp_patronal,
            sfs_patronal_monto: calc.sfs_patronal,
            srl_patronal_monto: calc.srl_patronal,
            alerta_neto_negativo: calc.alerta_neto_negativo,
            alerta_limite_descuentos: calc.alerta_limite_descuentos,
          })
          .eq("id", item.id);
      }

      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al recalcular");
    } finally {
      setLoading(false);
    }
  }

  const totalDevengado = nominaItems.reduce(
    (sum, i) => sum + Number(i.subtotal_devengado),
    0
  );
  const totalDeducciones = nominaItems.reduce(
    (sum, i) => sum + Number(i.total_deducciones),
    0
  );
  const totalNeto = nominaItems.reduce(
    (sum, i) => sum + Number(i.total_neto),
    0
  );

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Link
            href="/nomina"
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Quincena: {quincena.periodo_inicio} — {quincena.periodo_fin}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${ESTADO_BADGES[quincena.estado]}`}
              >
                {quincena.estado.charAt(0).toUpperCase() +
                  quincena.estado.slice(1)}
              </span>
              {quincena.descripcion && (
                <span className="text-gray-500 text-sm">
                  {quincena.descripcion}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {availableEmployees.length > 0 &&
            quincena.estado === "borrador" && (
              <button
                onClick={addAllEmployees}
                disabled={loading}
                className="inline-flex items-center gap-2 bg-cyan-500 hover:bg-cyan-600 text-white font-medium px-4 py-2 rounded-lg transition-colors text-sm disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
                Agregar Empleados ({availableEmployees.length})
              </button>
            )}
          {nominaItems.length > 0 && quincena.estado === "borrador" && (
            <button
              onClick={recalcularTodos}
              disabled={loading}
              className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-medium px-4 py-2 rounded-lg transition-colors text-sm disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Calculator className="h-4 w-4" />
              )}
              Recalcular Todo
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-danger-100 text-danger-600 text-sm p-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <p className="text-sm text-gray-500">Empleados</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {nominaItems.length}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <p className="text-sm text-gray-500">Total Devengado</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {formatCurrency(totalDevengado)}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <p className="text-sm text-gray-500">Total Deducciones</p>
          <p className="text-2xl font-bold text-danger-600 mt-1">
            {formatCurrency(totalDeducciones)}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <p className="text-sm text-gray-500">Total Neto</p>
          <p className="text-2xl font-bold text-success-600 mt-1">
            {formatCurrency(totalNeto)}
          </p>
        </div>
      </div>

      {/* Payroll grid */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-3 py-3 font-medium text-gray-500 sticky left-0 bg-gray-50">
                  Empleado
                </th>
                <th className="text-right px-3 py-3 font-medium text-gray-500">
                  Salario Base
                </th>
                <th className="text-right px-3 py-3 font-medium text-gray-500">
                  H.E. Diur.
                </th>
                <th className="text-right px-3 py-3 font-medium text-gray-500">
                  H.E. Noct.
                </th>
                <th className="text-right px-3 py-3 font-medium text-gray-500">
                  H.E. Fer.
                </th>
                <th className="text-right px-3 py-3 font-medium text-gray-500">
                  Devengado
                </th>
                <th className="text-right px-3 py-3 font-medium text-gray-500">
                  AFP
                </th>
                <th className="text-right px-3 py-3 font-medium text-gray-500">
                  SFS
                </th>
                <th className="text-right px-3 py-3 font-medium text-gray-500">
                  ISR
                </th>
                <th className="text-right px-3 py-3 font-medium text-gray-500">
                  Préstamos
                </th>
                <th className="text-right px-3 py-3 font-medium text-gray-500">
                  Deducciones
                </th>
                <th className="text-right px-3 py-3 font-medium text-gray-500 bg-gray-100">
                  NETO
                </th>
                <th className="text-center px-3 py-3 font-medium text-gray-500">
                  Alertas
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {nominaItems.length === 0 ? (
                <tr>
                  <td colSpan={13} className="text-center py-12 text-gray-400">
                    No hay empleados en esta quincena. Use el botón
                    &quot;Agregar Empleados&quot; para comenzar.
                  </td>
                </tr>
              ) : (
                nominaItems.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-3 py-2.5 font-medium text-gray-900 sticky left-0 bg-white whitespace-nowrap">
                      {item.empleado
                        ? `${item.empleado.apellido}, ${item.empleado.nombre}`
                        : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-gray-700">
                      {formatCurrency(item.salario_base_calc)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-gray-700">
                      {formatCurrency(item.monto_extras_diurnas)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-gray-700">
                      {formatCurrency(item.monto_extras_nocturnas)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-gray-700">
                      {formatCurrency(item.monto_extras_feriados)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono font-semibold text-gray-900">
                      {formatCurrency(item.subtotal_devengado)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-danger-600">
                      {formatCurrency(item.afp_monto)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-danger-600">
                      {formatCurrency(item.sfs_monto)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-danger-600">
                      {formatCurrency(item.isr_monto)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-danger-600">
                      {formatCurrency(item.deduccion_prestamos)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono font-semibold text-danger-600">
                      {formatCurrency(item.total_deducciones)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono font-bold text-success-600 bg-gray-50">
                      {formatCurrency(item.total_neto)}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {(item.alerta_neto_negativo ||
                        item.alerta_limite_descuentos) && (
                        <AlertTriangle className="h-4 w-4 text-warning-500 mx-auto" />
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {nominaItems.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-gray-300 bg-gray-50 font-semibold">
                  <td className="px-3 py-3 sticky left-0 bg-gray-50">
                    TOTALES
                  </td>
                  <td className="px-3 py-3 text-right font-mono">
                    {formatCurrency(
                      nominaItems.reduce(
                        (s, i) => s + Number(i.salario_base_calc),
                        0
                      )
                    )}
                  </td>
                  <td className="px-3 py-3 text-right font-mono">
                    {formatCurrency(
                      nominaItems.reduce(
                        (s, i) => s + Number(i.monto_extras_diurnas),
                        0
                      )
                    )}
                  </td>
                  <td className="px-3 py-3 text-right font-mono">
                    {formatCurrency(
                      nominaItems.reduce(
                        (s, i) => s + Number(i.monto_extras_nocturnas),
                        0
                      )
                    )}
                  </td>
                  <td className="px-3 py-3 text-right font-mono">
                    {formatCurrency(
                      nominaItems.reduce(
                        (s, i) => s + Number(i.monto_extras_feriados),
                        0
                      )
                    )}
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-gray-900">
                    {formatCurrency(totalDevengado)}
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-danger-600">
                    {formatCurrency(
                      nominaItems.reduce(
                        (s, i) => s + Number(i.afp_monto),
                        0
                      )
                    )}
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-danger-600">
                    {formatCurrency(
                      nominaItems.reduce(
                        (s, i) => s + Number(i.sfs_monto),
                        0
                      )
                    )}
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-danger-600">
                    {formatCurrency(
                      nominaItems.reduce(
                        (s, i) => s + Number(i.isr_monto),
                        0
                      )
                    )}
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-danger-600">
                    {formatCurrency(
                      nominaItems.reduce(
                        (s, i) => s + Number(i.deduccion_prestamos),
                        0
                      )
                    )}
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-danger-600">
                    {formatCurrency(totalDeducciones)}
                  </td>
                  <td className="px-3 py-3 text-right font-mono font-bold text-success-600 bg-gray-100">
                    {formatCurrency(totalNeto)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
