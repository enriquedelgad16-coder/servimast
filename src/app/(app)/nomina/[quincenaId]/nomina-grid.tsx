"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { calcularNomina } from "@/lib/calculations/nomina";
import { formatCurrency } from "@/lib/utils";
import { generatePDFReport } from "@/lib/pdf-utils";
import {
  ArrowLeft,
  UserPlus,
  Calculator,
  Loader2,
  AlertTriangle,
  Printer,
  FileText,
  FileSpreadsheet,
  CheckCircle,
  DollarSign,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import * as XLSX from "xlsx";
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

const ESTADO_FLOW: Record<string, { next: string; label: string; color: string }> = {
  borrador: { next: "aprobada", label: "Aprobar Nómina", color: "bg-info-500 hover:bg-blue-600" },
  aprobada: { next: "pagada", label: "Marcar como Pagada", color: "bg-success-600 hover:bg-green-700" },
};

export function NominaGrid({
  quincena,
  nominaItems,
  empleados,
}: NominaGridProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

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
          horas_base: 88, tarifa_hora: emp.tarifa_hora,
          horas_extras_diurnas: 0, horas_extras_nocturnas: 0, horas_extras_feriados: 0,
          instalaciones_gpon: 0, instalaciones_red: 0, tarifa_gpon: 0, tarifa_red: 0,
          metas_cumplimiento: 0, otros_ingresos: 0, faltas_dias: 0,
          dias_habiles_quincena: quincena.dias_habiles || 11,
          otros_descuentos: 0, prestamos_activos: [],
        });
        return {
          quincena_id: quincena.id, empleado_id: emp.id, horas_base: 88,
          tarifa_hora: emp.tarifa_hora, salario_base_calc: calc.salario_base,
          subtotal_devengado: calc.subtotal_devengado, afp_monto: calc.afp_monto,
          sfs_monto: calc.sfs_monto, isr_monto: calc.isr_monto,
          total_deducciones: calc.total_deducciones, total_neto: calc.total_neto,
          afp_patronal_monto: calc.afp_patronal, sfs_patronal_monto: calc.sfs_patronal,
          srl_patronal_monto: calc.srl_patronal, alerta_neto_negativo: calc.alerta_neto_negativo,
          alerta_limite_descuentos: calc.alerta_limite_descuentos,
        };
      });
      if (items.length > 0) {
        const { error: insertError } = await supabase.from("nomina_items").insert(items);
        if (insertError) throw insertError;
      }
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al agregar empleados");
    } finally { setLoading(false); }
  }

  async function recalcularTodos() {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      for (const item of nominaItems) {
        const { data: prestamos } = await supabase
          .from("prestamos").select("cuota_quincenal, saldo_pendiente")
          .eq("empleado_id", item.empleado_id).eq("estado", "activo");
        const calc = calcularNomina({
          horas_base: item.horas_base, tarifa_hora: item.tarifa_hora,
          horas_extras_diurnas: item.horas_extras_diurnas,
          horas_extras_nocturnas: item.horas_extras_nocturnas,
          horas_extras_feriados: item.horas_extras_feriados,
          instalaciones_gpon: item.instalaciones_gpon, instalaciones_red: item.instalaciones_red,
          tarifa_gpon: item.tarifa_instalacion_gpon, tarifa_red: item.tarifa_instalacion_red,
          metas_cumplimiento: item.metas_cumplimiento, otros_ingresos: item.otros_ingresos,
          faltas_dias: item.faltas_dias, dias_habiles_quincena: quincena.dias_habiles || 11,
          otros_descuentos: item.otros_descuentos, prestamos_activos: prestamos || [],
        });
        await supabase.from("nomina_items").update({
          salario_base_calc: calc.salario_base, monto_extras_diurnas: calc.monto_extras_diurnas,
          monto_extras_nocturnas: calc.monto_extras_nocturnas, monto_extras_feriados: calc.monto_extras_feriados,
          monto_instalaciones_gpon: calc.monto_gpon, monto_instalaciones_red: calc.monto_red,
          subtotal_devengado: calc.subtotal_devengado, deduccion_por_faltas: calc.deduccion_faltas,
          afp_monto: calc.afp_monto, sfs_monto: calc.sfs_monto, isr_monto: calc.isr_monto,
          deduccion_prestamos: calc.deduccion_prestamos, total_deducciones: calc.total_deducciones,
          total_neto: calc.total_neto, afp_patronal_monto: calc.afp_patronal,
          sfs_patronal_monto: calc.sfs_patronal, srl_patronal_monto: calc.srl_patronal,
          alerta_neto_negativo: calc.alerta_neto_negativo, alerta_limite_descuentos: calc.alerta_limite_descuentos,
        }).eq("id", item.id);
      }
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al recalcular");
    } finally { setLoading(false); }
  }

  async function cambiarEstado(nuevoEstado: string) {
    setLoading(true);
    try {
      const supabase = createClient();
      const updateData: Record<string, unknown> = { estado: nuevoEstado };
      if (nuevoEstado === "pagada") {
        updateData.fecha_pago = new Date().toISOString().split("T")[0];
      }
      const { error } = await supabase.from("quincenas").update(updateData).eq("id", quincena.id);
      if (error) throw error;

      // When marking as paid, update loan balances
      if (nuevoEstado === "pagada") {
        for (const item of nominaItems) {
          if (Number(item.deduccion_prestamos) > 0) {
            // Get active loans for this employee
            const { data: prestamos } = await supabase
              .from("prestamos")
              .select("id, cuota_quincenal, saldo_pendiente, numero_cuotas_pagadas")
              .eq("empleado_id", item.empleado_id)
              .eq("estado", "activo")
              .order("fecha_inicio", { ascending: true });

            if (prestamos) {
              for (const p of prestamos) {
                const cuota = Math.min(p.cuota_quincenal, p.saldo_pendiente);
                if (cuota <= 0) continue;
                const nuevoSaldo = Math.max(0, p.saldo_pendiente - cuota);
                const nuevasCuotas = (p.numero_cuotas_pagadas || 0) + 1;
                await supabase.from("prestamos").update({
                  saldo_pendiente: nuevoSaldo,
                  numero_cuotas_pagadas: nuevasCuotas,
                  ...(nuevoSaldo <= 0 ? { estado: "pagado", fecha_cierre: new Date().toISOString().split("T")[0] } : {}),
                }).eq("id", p.id);

                // Record payment in pagos_prestamos if table exists
                try {
                  await supabase.from("pagos_prestamos").insert({
                    prestamo_id: p.id,
                    nomina_item_id: item.id,
                    quincena_id: quincena.id,
                    monto_pagado: cuota,
                    saldo_antes: p.saldo_pendiente,
                    saldo_despues: nuevoSaldo,
                    numero_cuota: nuevasCuotas,
                    fecha_pago: new Date().toISOString().split("T")[0],
                  });
                } catch {
                  // pagos_prestamos table may not exist yet
                }
              }
            }
          }
        }
      }

      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al cambiar estado");
    } finally { setLoading(false); }
  }

  function handleExportPDF() {
    const columns = ["Empleado", "No.", "Salario Base", "H.E. Diur.", "H.E. Noct.", "H.E. Fer.", "Devengado", "AFP", "SFS", "ISR", "Préstamos", "Deducciones", "NETO", "AFP Pat.", "SFS Pat.", "SRL Pat."];
    const data = nominaItems.map((item) => [
      item.empleado ? `${item.empleado.apellido}, ${item.empleado.nombre}` : "—",
      item.empleado?.numero_empleado || "",
      formatCurrency(item.salario_base_calc),
      formatCurrency(item.monto_extras_diurnas),
      formatCurrency(item.monto_extras_nocturnas),
      formatCurrency(item.monto_extras_feriados),
      formatCurrency(item.subtotal_devengado),
      formatCurrency(item.afp_monto),
      formatCurrency(item.sfs_monto),
      formatCurrency(item.isr_monto),
      formatCurrency(item.deduccion_prestamos),
      formatCurrency(item.total_deducciones),
      formatCurrency(item.total_neto),
      formatCurrency(item.afp_patronal_monto),
      formatCurrency(item.sfs_patronal_monto),
      formatCurrency(item.srl_patronal_monto),
    ]);
    const totals = [
      "TOTALES", `${nominaItems.length} emp.`,
      formatCurrency(totalSalarioBase), formatCurrency(totalExtDiur), formatCurrency(totalExtNoct), formatCurrency(totalExtFer),
      formatCurrency(totalDevengado), formatCurrency(totalAFP), formatCurrency(totalSFS), formatCurrency(totalISR),
      formatCurrency(totalPrestamos), formatCurrency(totalDeducciones), formatCurrency(totalNeto),
      formatCurrency(totalAFPPat), formatCurrency(totalSFSPat), formatCurrency(totalSRLPat),
    ];
    generatePDFReport({
      title: "Nómina Quincenal",
      subtitle: quincena.descripcion || undefined,
      periodo: `${quincena.periodo_inicio} — ${quincena.periodo_fin}`,
      columns, data, totals, orientation: "landscape",
      fileName: `Nomina_${quincena.periodo_inicio}_${quincena.periodo_fin}.pdf`,
    });
  }

  function handleExportExcel() {
    const excelData = nominaItems.map((item) => ({
      "Empleado": item.empleado ? `${item.empleado.apellido}, ${item.empleado.nombre}` : "",
      "No. Empleado": item.empleado?.numero_empleado || "",
      "Salario Base": formatCurrency(item.salario_base_calc),
      "H.E. Diurnas": formatCurrency(item.monto_extras_diurnas),
      "H.E. Nocturnas": formatCurrency(item.monto_extras_nocturnas),
      "H.E. Feriados": formatCurrency(item.monto_extras_feriados),
      "Devengado": formatCurrency(item.subtotal_devengado),
      "AFP (2.87%)": formatCurrency(item.afp_monto),
      "SFS (3.04%)": formatCurrency(item.sfs_monto),
      "ISR": formatCurrency(item.isr_monto),
      "Préstamos": formatCurrency(item.deduccion_prestamos),
      "Total Deducciones": formatCurrency(item.total_deducciones),
      "Total Neto": formatCurrency(item.total_neto),
      "AFP Patronal (7.10%)": formatCurrency(item.afp_patronal_monto),
      "SFS Patronal (7.09%)": formatCurrency(item.sfs_patronal_monto),
      "SRL Patronal (1.20%)": formatCurrency(item.srl_patronal_monto),
    }));
    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Nómina");
    XLSX.writeFile(wb, `Nomina_${quincena.periodo_inicio}_${quincena.periodo_fin}.xlsx`);
  }

  const totalSalarioBase = nominaItems.reduce((s, i) => s + Number(i.salario_base_calc), 0);
  const totalExtDiur = nominaItems.reduce((s, i) => s + Number(i.monto_extras_diurnas), 0);
  const totalExtNoct = nominaItems.reduce((s, i) => s + Number(i.monto_extras_nocturnas), 0);
  const totalExtFer = nominaItems.reduce((s, i) => s + Number(i.monto_extras_feriados), 0);
  const totalDevengado = nominaItems.reduce((s, i) => s + Number(i.subtotal_devengado), 0);
  const totalAFP = nominaItems.reduce((s, i) => s + Number(i.afp_monto), 0);
  const totalSFS = nominaItems.reduce((s, i) => s + Number(i.sfs_monto), 0);
  const totalISR = nominaItems.reduce((s, i) => s + Number(i.isr_monto), 0);
  const totalPrestamos = nominaItems.reduce((s, i) => s + Number(i.deduccion_prestamos), 0);
  const totalDeducciones = nominaItems.reduce((s, i) => s + Number(i.total_deducciones), 0);
  const totalNeto = nominaItems.reduce((s, i) => s + Number(i.total_neto), 0);
  const totalAFPPat = nominaItems.reduce((s, i) => s + Number(i.afp_patronal_monto), 0);
  const totalSFSPat = nominaItems.reduce((s, i) => s + Number(i.sfs_patronal_monto), 0);
  const totalSRLPat = nominaItems.reduce((s, i) => s + Number(i.srl_patronal_monto), 0);
  const estadoAction = ESTADO_FLOW[quincena.estado];

  return (
    <div>
      {/* Print header - only visible when printing */}
      <div className="hidden print:block mb-6 border-b-2 border-gray-800 pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-servimast.jpg" alt="SERVIMAST" className="w-16 h-16 rounded-lg" />
            <div>
              <h1 className="text-2xl font-bold">SERVIMAST</h1>
              <p className="text-sm text-gray-600">Sistema de Seguridad y Redes</p>
              <p className="text-xs text-gray-500">RNC: 000-00000-0 | Tel: (809) 000-0000</p>
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-lg font-bold">Nómina Quincenal</h2>
            {quincena.descripcion && <p className="text-sm text-gray-600">{quincena.descripcion}</p>}
            <p className="text-sm text-gray-500">Período: {quincena.periodo_inicio} — {quincena.periodo_fin}</p>
            <p className="text-xs text-gray-400 mt-1">Fecha: {new Date().toLocaleDateString("es-DO")}</p>
          </div>
        </div>
      </div>

      {/* Screen header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 print:hidden">
        <div className="flex items-center gap-4">
          <Link href="/nomina" className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Quincena: {quincena.periodo_inicio} — {quincena.periodo_fin}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${ESTADO_BADGES[quincena.estado]}`}>
                {quincena.estado.charAt(0).toUpperCase() + quincena.estado.slice(1)}
              </span>
              {quincena.descripcion && <span className="text-gray-500 text-sm">{quincena.descripcion}</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Export buttons */}
          {nominaItems.length > 0 && (
            <>
              <button onClick={handleExportPDF} className="inline-flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors">
                <FileText className="h-4 w-4" /> PDF
              </button>
              <button onClick={handleExportExcel} className="inline-flex items-center gap-1.5 px-3 py-2 bg-green-50 text-green-600 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors">
                <FileSpreadsheet className="h-4 w-4" /> Excel
              </button>
              <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
                <Printer className="h-4 w-4" /> Imprimir
              </button>
            </>
          )}

          {/* Action buttons */}
          {availableEmployees.length > 0 && quincena.estado === "borrador" && (
            <button onClick={addAllEmployees} disabled={loading} className="inline-flex items-center gap-2 bg-cyan-500 hover:bg-cyan-600 text-white font-medium px-4 py-2 rounded-lg transition-colors text-sm disabled:opacity-50">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              Agregar Empleados ({availableEmployees.length})
            </button>
          )}
          {nominaItems.length > 0 && quincena.estado === "borrador" && (
            <button onClick={recalcularTodos} disabled={loading} className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-medium px-4 py-2 rounded-lg transition-colors text-sm disabled:opacity-50">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />}
              Recalcular Todo
            </button>
          )}
          {estadoAction && nominaItems.length > 0 && (
            <button onClick={() => cambiarEstado(estadoAction.next)} disabled={loading} className={`inline-flex items-center gap-2 ${estadoAction.color} text-white font-medium px-4 py-2 rounded-lg transition-colors text-sm disabled:opacity-50`}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : quincena.estado === "aprobada" ? <DollarSign className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
              {estadoAction.label}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-danger-100 text-danger-600 text-sm p-3 rounded-lg print:hidden">{error}</div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <p className="text-xs text-gray-500">Empleados</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{nominaItems.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <p className="text-xs text-gray-500">Total Devengado</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(totalDevengado)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <p className="text-xs text-gray-500">Total Deducciones</p>
          <p className="text-xl font-bold text-danger-600 mt-1">{formatCurrency(totalDeducciones)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <p className="text-xs text-gray-500">Total Neto</p>
          <p className="text-xl font-bold text-success-600 mt-1">{formatCurrency(totalNeto)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <p className="text-xs text-gray-500">Costo Patronal</p>
          <p className="text-xl font-bold text-orange-500 mt-1">{formatCurrency(totalAFPPat + totalSFSPat + totalSRLPat)}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">AFP: {formatCurrency(totalAFPPat)} | SFS: {formatCurrency(totalSFSPat)} | SRL: {formatCurrency(totalSRLPat)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <p className="text-xs text-gray-500">Costo Total Empresa</p>
          <p className="text-xl font-bold text-navy-900 mt-1">{formatCurrency(totalDevengado + totalAFPPat + totalSFSPat + totalSRLPat)}</p>
        </div>
      </div>

      {/* Payroll grid */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 print:bg-[#0f1e32] print:text-white">
                <th className="text-left px-3 py-3 font-medium text-gray-500 print:text-white sticky left-0 bg-gray-50 print:bg-[#0f1e32]">Empleado</th>
                <th className="text-right px-3 py-3 font-medium text-gray-500 print:text-white">Salario Base</th>
                <th className="text-right px-3 py-3 font-medium text-gray-500 print:text-white">H.E. Diur.</th>
                <th className="text-right px-3 py-3 font-medium text-gray-500 print:text-white">H.E. Noct.</th>
                <th className="text-right px-3 py-3 font-medium text-gray-500 print:text-white">H.E. Fer.</th>
                <th className="text-right px-3 py-3 font-medium text-gray-500 print:text-white">Devengado</th>
                <th className="text-right px-3 py-3 font-medium text-gray-500 print:text-white">AFP</th>
                <th className="text-right px-3 py-3 font-medium text-gray-500 print:text-white">SFS</th>
                <th className="text-right px-3 py-3 font-medium text-gray-500 print:text-white">ISR</th>
                <th className="text-right px-3 py-3 font-medium text-gray-500 print:text-white">Préstamos</th>
                <th className="text-right px-3 py-3 font-medium text-gray-500 print:text-white">Deducciones</th>
                <th className="text-right px-3 py-3 font-medium text-gray-500 print:text-white bg-gray-100 print:bg-[#0f1e32]">NETO</th>
                <th className="text-center px-3 py-3 font-medium text-gray-500 print:hidden">...</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {nominaItems.length === 0 ? (
                <tr>
                  <td colSpan={13} className="text-center py-12 text-gray-400">
                    No hay empleados en esta quincena. Use el botón &quot;Agregar Empleados&quot; para comenzar.
                  </td>
                </tr>
              ) : (
                nominaItems.map((item) => (
                  <>
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setExpandedRow(expandedRow === item.id ? null : item.id)}>
                      <td className="px-3 py-2.5 font-medium text-gray-900 sticky left-0 bg-white whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Link href={`/empleados/${item.empleado_id}`} onClick={(e) => e.stopPropagation()} className="text-cyan-600 hover:text-cyan-700 hover:underline">
                            {item.empleado ? `${item.empleado.apellido}, ${item.empleado.nombre}` : "—"}
                          </Link>
                          <span className="text-xs text-gray-400">{item.empleado?.numero_empleado}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-gray-700">{formatCurrency(item.salario_base_calc)}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-gray-700">{formatCurrency(item.monto_extras_diurnas)}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-gray-700">{formatCurrency(item.monto_extras_nocturnas)}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-gray-700">{formatCurrency(item.monto_extras_feriados)}</td>
                      <td className="px-3 py-2.5 text-right font-mono font-semibold text-gray-900">{formatCurrency(item.subtotal_devengado)}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-danger-600">{formatCurrency(item.afp_monto)}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-danger-600">{formatCurrency(item.sfs_monto)}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-danger-600">{formatCurrency(item.isr_monto)}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-danger-600">{formatCurrency(item.deduccion_prestamos)}</td>
                      <td className="px-3 py-2.5 text-right font-mono font-semibold text-danger-600">{formatCurrency(item.total_deducciones)}</td>
                      <td className="px-3 py-2.5 text-right font-mono font-bold text-success-600 bg-gray-50">{formatCurrency(item.total_neto)}</td>
                      <td className="px-3 py-2.5 text-center print:hidden">
                        <div className="flex items-center justify-center gap-1">
                          {(item.alerta_neto_negativo || item.alerta_limite_descuentos) && (
                            <AlertTriangle className="h-4 w-4 text-warning-500" />
                          )}
                          {expandedRow === item.id ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                        </div>
                      </td>
                    </tr>
                    {expandedRow === item.id && (
                      <tr key={`${item.id}-detail`} className="bg-cyan-50/30">
                        <td colSpan={13} className="px-6 py-4 print:hidden">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                            <div>
                              <p className="font-semibold text-gray-700 mb-2">Ingresos</p>
                              <div className="space-y-1">
                                <p>Horas base: {item.horas_base}h × {formatCurrency(item.tarifa_hora)}</p>
                                {Number(item.horas_extras_diurnas) > 0 && <p>H.E. Diurnas: {item.horas_extras_diurnas}h</p>}
                                {Number(item.horas_extras_nocturnas) > 0 && <p>H.E. Nocturnas: {item.horas_extras_nocturnas}h</p>}
                                {Number(item.horas_extras_feriados) > 0 && <p>H.E. Feriados: {item.horas_extras_feriados}h</p>}
                                {Number(item.instalaciones_gpon) > 0 && <p>Inst. GPON: {item.instalaciones_gpon}</p>}
                                {Number(item.instalaciones_red) > 0 && <p>Inst. Red: {item.instalaciones_red}</p>}
                                {Number(item.metas_cumplimiento) > 0 && <p>Metas: {formatCurrency(item.metas_cumplimiento)}</p>}
                                {Number(item.otros_ingresos) > 0 && <p>Otros: {formatCurrency(item.otros_ingresos)}</p>}
                              </div>
                            </div>
                            <div>
                              <p className="font-semibold text-gray-700 mb-2">Deducciones Empleado</p>
                              <div className="space-y-1">
                                <p>AFP (2.87%): {formatCurrency(item.afp_monto)}</p>
                                <p>SFS (3.04%): {formatCurrency(item.sfs_monto)}</p>
                                <p>ISR: {formatCurrency(item.isr_monto)}</p>
                                {Number(item.deduccion_prestamos) > 0 && <p>Préstamos: {formatCurrency(item.deduccion_prestamos)}</p>}
                                {Number(item.faltas_dias) > 0 && <p>Faltas ({item.faltas_dias} días): {formatCurrency(item.deduccion_por_faltas)}</p>}
                              </div>
                            </div>
                            <div>
                              <p className="font-semibold text-gray-700 mb-2">Aportes Patronales</p>
                              <div className="space-y-1">
                                <p>AFP (7.10%): {formatCurrency(item.afp_patronal_monto)}</p>
                                <p>SFS (7.09%): {formatCurrency(item.sfs_patronal_monto)}</p>
                                <p>SRL (1.20%): {formatCurrency(item.srl_patronal_monto)}</p>
                                <p className="font-semibold mt-1">Total: {formatCurrency(Number(item.afp_patronal_monto) + Number(item.sfs_patronal_monto) + Number(item.srl_patronal_monto))}</p>
                              </div>
                            </div>
                            <div>
                              <p className="font-semibold text-gray-700 mb-2">Resumen</p>
                              <div className="space-y-1">
                                <p>Devengado: {formatCurrency(item.subtotal_devengado)}</p>
                                <p>Deducciones: {formatCurrency(item.total_deducciones)}</p>
                                <p className="text-lg font-bold text-success-600 mt-1">Neto: {formatCurrency(item.total_neto)}</p>
                              </div>
                              {item.notas && <p className="mt-2 text-gray-500 italic">Nota: {item.notas}</p>}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))
              )}
            </tbody>
            {nominaItems.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-gray-300 bg-navy-900 text-white font-semibold print:bg-[#0f1e32]">
                  <td className="px-3 py-3 sticky left-0 bg-navy-900 print:bg-[#0f1e32]">TOTALES</td>
                  <td className="px-3 py-3 text-right font-mono">{formatCurrency(totalSalarioBase)}</td>
                  <td className="px-3 py-3 text-right font-mono">{formatCurrency(totalExtDiur)}</td>
                  <td className="px-3 py-3 text-right font-mono">{formatCurrency(totalExtNoct)}</td>
                  <td className="px-3 py-3 text-right font-mono">{formatCurrency(totalExtFer)}</td>
                  <td className="px-3 py-3 text-right font-mono">{formatCurrency(totalDevengado)}</td>
                  <td className="px-3 py-3 text-right font-mono">{formatCurrency(totalAFP)}</td>
                  <td className="px-3 py-3 text-right font-mono">{formatCurrency(totalSFS)}</td>
                  <td className="px-3 py-3 text-right font-mono">{formatCurrency(totalISR)}</td>
                  <td className="px-3 py-3 text-right font-mono">{formatCurrency(totalPrestamos)}</td>
                  <td className="px-3 py-3 text-right font-mono">{formatCurrency(totalDeducciones)}</td>
                  <td className="px-3 py-3 text-right font-mono font-bold">{formatCurrency(totalNeto)}</td>
                  <td className="print:hidden" />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Print footer */}
      <div className="hidden print:block mt-6 text-center text-xs text-gray-400 border-t border-gray-200 pt-3">
        SERVIMAST - Sistema de Gestión de Nómina | Impreso: {new Date().toLocaleString("es-DO")}
      </div>
    </div>
  );
}
