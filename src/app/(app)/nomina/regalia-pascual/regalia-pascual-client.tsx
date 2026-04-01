"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatCedula } from "@/lib/utils";
import { generatePDFReport, generatePayslipPDF } from "@/lib/pdf-utils";
import {
  ArrowLeft,
  Gift,
  Calculator,
  Loader2,
  FileText,
  FileSpreadsheet,
  Printer,
  Receipt,
  Download,
  AlertTriangle,
} from "lucide-react";
import * as XLSX from "xlsx";

interface Empleado {
  id: string;
  numero_empleado: string;
  cedula: string;
  nombre: string;
  apellido: string;
  cargo: string | null;
  departamento: string | null;
  fecha_ingreso: string;
  sueldo_quincenal: number;
  tarifa_hora: number;
  banco: string | null;
  numero_cuenta: string | null;
  nss: string | null;
  estado: string;
}

interface Quincena {
  id: string;
  periodo_inicio: string;
  periodo_fin: string;
  estado: string;
  descripcion: string | null;
}

interface RegaliaItem {
  empleadoId: string;
  empleado: Empleado;
  totalDevengadoAnual: number;
  mesesTrabajados: number;
  montoRegalia: number;
  quincenasProcesadas: number;
}

interface Props {
  empleados: Empleado[];
  quincenas: Quincena[];
}

/**
 * Regalía Pascual — Art. 219 Código de Trabajo RD
 * El empleador pagará al trabajador un salario de Navidad equivalente a
 * la doceava parte (1/12) del salario ordinario devengado durante el año.
 * Debe pagarse a más tardar el 20 de diciembre de cada año.
 */
export function RegaliaPascualClient({ empleados, quincenas }: Props) {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<RegaliaItem[]>([]);
  const [calculated, setCalculated] = useState(false);

  // Available years from quincenas
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    for (const q of quincenas) {
      years.add(new Date(q.periodo_inicio).getFullYear());
    }
    // Always include current year
    years.add(currentYear);
    return [...years].sort((a, b) => b - a);
  }, [quincenas, currentYear]);

  // Quincenas for selected year
  const yearQuincenas = useMemo(() => {
    return quincenas.filter((q) => {
      const y = new Date(q.periodo_inicio).getFullYear();
      return y === selectedYear;
    });
  }, [quincenas, selectedYear]);

  async function calcularRegalia() {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const yearStart = `${selectedYear}-01-01`;
      const yearEnd = `${selectedYear}-12-31`;

      // Get all quincenas for the year
      const { data: qYear } = await supabase
        .from("quincenas")
        .select("id, periodo_inicio, periodo_fin")
        .gte("periodo_inicio", yearStart)
        .lte("periodo_fin", yearEnd)
        .order("periodo_inicio");

      if (!qYear || qYear.length === 0) {
        setError("No hay quincenas registradas para el año seleccionado");
        setLoading(false);
        return;
      }

      const qIds = qYear.map((q) => q.id);

      // Get all nomina_items for those quincenas
      const { data: nominaItems } = await supabase
        .from("nomina_items")
        .select("empleado_id, subtotal_devengado, quincena_id")
        .in("quincena_id", qIds);

      // Aggregate total devengado per employee for the year
      const empTotals = new Map<string, { total: number; quincenas: number }>();
      for (const ni of nominaItems || []) {
        const prev = empTotals.get(ni.empleado_id) || { total: 0, quincenas: 0 };
        prev.total += ni.subtotal_devengado || 0;
        prev.quincenas += 1;
        empTotals.set(ni.empleado_id, prev);
      }

      // Calculate regalía for each employee
      const results: RegaliaItem[] = [];
      for (const emp of empleados) {
        const data = empTotals.get(emp.id);
        if (!data) continue; // Employee not in any quincena this year

        // Art. 219: 1/12 del salario ordinario devengado en el año
        const totalDevengadoAnual = data.total;
        const montoRegalia = Math.round((totalDevengadoAnual / 12) * 100) / 100;

        // Calculate months worked based on fecha_ingreso
        const fechaIngreso = new Date(emp.fecha_ingreso);
        const yearStartDate = new Date(yearStart);
        const effectiveStart = fechaIngreso > yearStartDate ? fechaIngreso : yearStartDate;
        const yearEndDate = new Date(yearEnd);
        const monthsDiff =
          (yearEndDate.getFullYear() - effectiveStart.getFullYear()) * 12 +
          (yearEndDate.getMonth() - effectiveStart.getMonth()) + 1;
        const mesesTrabajados = Math.min(12, Math.max(1, monthsDiff));

        results.push({
          empleadoId: emp.id,
          empleado: emp,
          totalDevengadoAnual,
          mesesTrabajados,
          montoRegalia,
          quincenasProcesadas: data.quincenas,
        });
      }

      results.sort((a, b) => a.empleado.apellido.localeCompare(b.empleado.apellido));
      setItems(results);
      setCalculated(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al calcular");
    } finally {
      setLoading(false);
    }
  }

  const totalRegalia = items.reduce((s, i) => s + i.montoRegalia, 0);
  const totalDevengado = items.reduce((s, i) => s + i.totalDevengadoAnual, 0);

  function handleExportPDF() {
    const columns = [
      "No. Emp", "Cédula", "Nombre", "Depto.", "Meses Trab.",
      "Quinc. Proc.", "Total Devengado Anual", "Regalía Pascual"
    ];
    const data = items.map((i) => [
      i.empleado.numero_empleado,
      i.empleado.cedula,
      `${i.empleado.nombre} ${i.empleado.apellido}`,
      i.empleado.departamento || "—",
      String(i.mesesTrabajados),
      String(i.quincenasProcesadas),
      formatCurrency(i.totalDevengadoAnual),
      formatCurrency(i.montoRegalia),
    ]);
    const totals = [
      "TOTALES", "", `${items.length} empleados`, "", "", "",
      formatCurrency(totalDevengado), formatCurrency(totalRegalia),
    ];
    generatePDFReport({
      title: "Nómina de Regalía Pascual",
      subtitle: `Año ${selectedYear} — Art. 219 Código de Trabajo RD`,
      periodo: `Enero - Diciembre ${selectedYear}`,
      columns, data, totals,
      orientation: "landscape",
      fileName: `Regalia_Pascual_${selectedYear}.pdf`,
    });
  }

  function handleExportExcel() {
    const excelData = items.map((i) => ({
      "No. Empleado": i.empleado.numero_empleado,
      "Cédula": i.empleado.cedula,
      "Nombre": `${i.empleado.nombre} ${i.empleado.apellido}`,
      "Departamento": i.empleado.departamento || "",
      "Cargo": i.empleado.cargo || "",
      "Meses Trabajados": i.mesesTrabajados,
      "Quincenas Procesadas": i.quincenasProcesadas,
      "Total Devengado Anual": formatCurrency(i.totalDevengadoAnual),
      "Regalía Pascual": formatCurrency(i.montoRegalia),
    }));
    excelData.push({
      "No. Empleado": "TOTALES",
      "Cédula": "",
      "Nombre": `${items.length} empleados`,
      "Departamento": "",
      "Cargo": "",
      "Meses Trabajados": 0,
      "Quincenas Procesadas": 0,
      "Total Devengado Anual": formatCurrency(totalDevengado),
      "Regalía Pascual": formatCurrency(totalRegalia),
    });
    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Regalía Pascual");
    XLSX.writeFile(wb, `Regalia_Pascual_${selectedYear}.xlsx`);
  }

  async function handlePayslip(item: RegaliaItem) {
    const emp = item.empleado;
    await generatePayslipPDF({
      empleadoNombre: `${emp.nombre} ${emp.apellido}`,
      empleadoCedula: formatCedula(emp.cedula),
      empleadoCargo: emp.cargo || "—",
      empleadoDepartamento: emp.departamento || "—",
      empleadoNumero: emp.numero_empleado,
      empleadoBanco: emp.banco || undefined,
      empleadoCuenta: emp.numero_cuenta || undefined,
      periodoInicio: `${selectedYear}-01-01`,
      periodoFin: `${selectedYear}-12-31`,
      periodoDescripcion: `Regalía Pascual ${selectedYear} — Art. 219 CT`,
      salarioBase: item.totalDevengadoAnual,
      horasBase: 0,
      tarifaHora: 0,
      horasExtrasDiurnas: 0,
      montoExtrasDiurnas: 0,
      horasExtrasNocturnas: 0,
      montoExtrasNocturnas: 0,
      horasExtrasFeriados: 0,
      montoExtrasFeriados: 0,
      instalacionesGpon: 0,
      montoInstalacionesGpon: 0,
      instalacionesRed: 0,
      montoInstalacionesRed: 0,
      metasCumplimiento: 0,
      otrosIngresos: 0,
      subtotalDevengado: item.montoRegalia,
      faltasDias: 0,
      deduccionFaltas: 0,
      afpPorcentaje: 0,
      afpMonto: 0,
      sfsPorcentaje: 0,
      sfsMonto: 0,
      isrMonto: 0,
      deduccionPrestamos: 0,
      otrosDescuentos: 0,
      totalDeducciones: 0,
      totalNeto: item.montoRegalia,
      afpPatronal: 0,
      sfsPatronal: 0,
      srlPatronal: 0,
      tipo: "regalia",
    });
  }

  async function handleAllPayslips() {
    for (const item of items) {
      await handlePayslip(item);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Link href="/nomina" className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Gift className="h-6 w-6 text-amber-500" />
              Regalía Pascual
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Art. 219 Código de Trabajo RD — 1/12 del salario ordinario devengado en el año
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {calculated && items.length > 0 && (
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
              <button onClick={handleAllPayslips} className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-50 text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-100 transition-colors">
                <Download className="h-4 w-4" /> Todos los Recibos
              </button>
            </>
          )}
        </div>
      </div>

      {/* Year selector + Calculate */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Año</label>
            <select
              value={selectedYear}
              onChange={(e) => { setSelectedYear(Number(e.target.value)); setCalculated(false); setItems([]); }}
              className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            >
              {availableYears.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div className="text-xs text-gray-500">
            <p>{yearQuincenas.length} quincenas registradas en {selectedYear}</p>
            <p>{empleados.length} empleados activos</p>
          </div>
          <button
            onClick={calcularRegalia}
            disabled={loading}
            className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors disabled:opacity-50 text-sm"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />}
            Calcular Regalía Pascual {selectedYear}
          </button>
        </div>

        {error && (
          <div className="mt-4 bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-200 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Info box */}
        <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
          <p className="font-semibold mb-1">Base Legal — Art. 219 Código de Trabajo</p>
          <p>El empleador está obligado a pagar al trabajador, en el mes de diciembre de cada año, el salario de Navidad consistente en la doceava parte (1/12) del salario ordinario devengado por el trabajador en el transcurso del año calendario.</p>
          <p className="mt-1 text-amber-600 text-xs">Fecha límite de pago: 20 de diciembre de cada año.</p>
        </div>
      </div>

      {/* Results */}
      {calculated && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <p className="text-xs text-gray-500">Empleados</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{items.length}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <p className="text-xs text-gray-500">Total Devengado Anual</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(totalDevengado)}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <p className="text-xs text-gray-500">Total Regalía Pascual</p>
              <p className="text-xl font-bold text-amber-600 mt-1">{formatCurrency(totalRegalia)}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <p className="text-xs text-gray-500">Promedio por Empleado</p>
              <p className="text-xl font-bold text-gray-900 mt-1">
                {items.length > 0 ? formatCurrency(totalRegalia / items.length) : "—"}
              </p>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Print header */}
            <div className="hidden print:block px-6 pt-6 pb-4 border-b-2 border-gray-800">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/logo-servimast.jpg" alt="SERVIMAST JPM" className="w-14 h-14 rounded-lg" />
                  <div>
                    <h1 className="text-xl font-bold text-gray-900">SERVIMAST JPM</h1>
                    <p className="text-xs text-gray-600">Sistema de Seguridad y Redes</p>
                    <p className="text-[10px] text-gray-500">RNC: 000-00000-0 | Tel: (809) 000-0000</p>
                  </div>
                </div>
                <div className="text-right">
                  <h2 className="text-base font-bold text-gray-900">Nómina de Regalía Pascual</h2>
                  <p className="text-xs text-gray-600">Art. 219 Código de Trabajo RD</p>
                  <p className="text-xs text-gray-500">Año: {selectedYear}</p>
                  <p className="text-[10px] text-gray-400 mt-1">Fecha: {new Date().toLocaleDateString("es-DO")}</p>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 print:bg-[#0f1e32] print:text-white">
                    <th className="text-left px-4 py-3 font-medium text-gray-500 print:text-white">Empleado</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500 print:text-white">Depto.</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500 print:text-white">Meses Trab.</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500 print:text-white">Quinc.</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500 print:text-white">Total Devengado Anual</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500 print:text-white bg-amber-50 print:bg-[#0f1e32]">Regalía Pascual</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-500 print:hidden">Recibo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-gray-400">
                        <Gift className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                        <p>No hay datos para mostrar. Verifique que existan quincenas procesadas en el año seleccionado.</p>
                      </td>
                    </tr>
                  ) : (
                    items.map((item) => (
                      <tr key={item.empleadoId} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-2.5 font-medium text-gray-900">
                          <Link href={`/empleados/${item.empleadoId}`} className="text-cyan-600 hover:text-cyan-700 hover:underline">
                            {item.empleado.apellido}, {item.empleado.nombre}
                          </Link>
                          <span className="block text-xs text-gray-400">{item.empleado.numero_empleado} — {item.empleado.cedula}</span>
                        </td>
                        <td className="px-4 py-2.5 text-gray-600">{item.empleado.departamento || "—"}</td>
                        <td className="px-4 py-2.5 text-right text-gray-700">{item.mesesTrabajados}</td>
                        <td className="px-4 py-2.5 text-right text-gray-700">{item.quincenasProcesadas}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-gray-900">{formatCurrency(item.totalDevengadoAnual)}</td>
                        <td className="px-4 py-2.5 text-right font-mono font-bold text-amber-600 bg-amber-50/50">{formatCurrency(item.montoRegalia)}</td>
                        <td className="px-4 py-2.5 text-center print:hidden">
                          <button
                            onClick={() => handlePayslip(item)}
                            className="p-1.5 text-amber-500 hover:text-amber-700 hover:bg-amber-50 rounded transition-colors"
                            title="Descargar Recibo"
                          >
                            <Receipt className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {items.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-gray-300 bg-navy-900 text-white font-semibold print:bg-[#0f1e32]">
                      <td className="px-4 py-3">TOTALES ({items.length} empleados)</td>
                      <td className="px-4 py-3"></td>
                      <td className="px-4 py-3"></td>
                      <td className="px-4 py-3"></td>
                      <td className="px-4 py-3 text-right font-mono">{formatCurrency(totalDevengado)}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold">{formatCurrency(totalRegalia)}</td>
                      <td className="print:hidden"></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {/* Print footer */}
            <div className="hidden print:block px-6 py-3 text-center text-[10px] text-gray-400 border-t border-gray-200">
              SERVIMAST JPM - Nómina de Regalía Pascual {selectedYear} | Impreso: {new Date().toLocaleString("es-DO")}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
