"use client";

import { useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatCedula } from "@/lib/utils";
import type { Empleado, NominaItem } from "@/types";
import {
  FileSpreadsheet,
  Download,
  Loader2,
  ShieldCheck,
  Building2,
  Users,
} from "lucide-react";

// TSS contribution rates (Dominican Republic)
const TSS_RATES = {
  AFP_EMPLEADO: 2.87,
  SFS_EMPLEADO: 3.04,
  AFP_PATRONAL: 7.1,
  SFS_PATRONAL: 7.09,
  SRL_PATRONAL: 1.2,
};

interface TssRow {
  empleado_id: string;
  nombre: string;
  apellido: string;
  cedula: string;
  salario_cotizable: number;
  afp_empleado: number;
  sfs_empleado: number;
  afp_patronal: number;
  sfs_patronal: number;
  srl_patronal: number;
}

const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

export default function TssClient() {
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1); // 1-12
  const [ano, setAno] = useState(now.getFullYear());
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [nominaItems, setNominaItems] = useState<
    (NominaItem & { empleado?: Empleado })[]
  >([]);
  const [loaded, setLoaded] = useState(false);

  // Generate the report
  async function loadReport() {
    setLoading(true);
    try {
      const supabase = createClient();

      // Find quincenas that fall within the selected month
      // A quincena belongs to month M if its periodo_inicio is within that month
      const startOfMonth = `${ano}-${String(mes).padStart(2, "0")}-01`;
      const endOfMonth = new Date(ano, mes, 0); // last day
      const endStr = `${ano}-${String(mes).padStart(2, "0")}-${String(
        endOfMonth.getDate()
      ).padStart(2, "0")}`;

      // Get quincenas for this month
      const { data: quincenas } = await supabase
        .from("quincenas")
        .select("id")
        .gte("periodo_inicio", startOfMonth)
        .lte("periodo_inicio", endStr);

      if (!quincenas || quincenas.length === 0) {
        setNominaItems([]);
        setLoaded(true);
        return;
      }

      const quincenaIds = quincenas.map((q) => q.id);

      // Get all nomina_items for those quincenas
      const { data: items } = await supabase
        .from("nomina_items")
        .select(
          "*, empleado:empleados(id, nombre, apellido, cedula, numero_empleado)"
        )
        .in("quincena_id", quincenaIds);

      setNominaItems(items ?? []);
      setLoaded(true);
    } catch {
      setNominaItems([]);
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  }

  // Aggregate by empleado
  const rows: TssRow[] = useMemo(() => {
    const map: Record<string, TssRow> = {};

    for (const item of nominaItems) {
      const emp = item.empleado as unknown as {
        id: string;
        nombre: string;
        apellido: string;
        cedula: string;
      } | null;
      if (!emp) continue;

      if (!map[emp.id]) {
        map[emp.id] = {
          empleado_id: emp.id,
          nombre: emp.nombre,
          apellido: emp.apellido,
          cedula: emp.cedula,
          salario_cotizable: 0,
          afp_empleado: 0,
          sfs_empleado: 0,
          afp_patronal: 0,
          sfs_patronal: 0,
          srl_patronal: 0,
        };
      }

      // Sum from actual nomina calculations
      map[emp.id].salario_cotizable += item.subtotal_devengado;
      map[emp.id].afp_empleado += item.afp_monto;
      map[emp.id].sfs_empleado += item.sfs_monto;
      map[emp.id].afp_patronal += item.afp_patronal_monto;
      map[emp.id].sfs_patronal += item.sfs_patronal_monto;
      map[emp.id].srl_patronal += item.srl_patronal_monto;
    }

    return Object.values(map).sort((a, b) =>
      a.apellido.localeCompare(b.apellido)
    );
  }, [nominaItems]);

  // Totals
  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => ({
        salario: acc.salario + r.salario_cotizable,
        afpEmp: acc.afpEmp + r.afp_empleado,
        sfsEmp: acc.sfsEmp + r.sfs_empleado,
        afpPat: acc.afpPat + r.afp_patronal,
        sfsPat: acc.sfsPat + r.sfs_patronal,
        srlPat: acc.srlPat + r.srl_patronal,
      }),
      {
        salario: 0,
        afpEmp: 0,
        sfsEmp: 0,
        afpPat: 0,
        sfsPat: 0,
        srlPat: 0,
      }
    );
  }, [rows]);

  // Export to Excel
  async function handleExport() {
    setExporting(true);
    try {
      const XLSX = await import("xlsx");

      const wsData = [
        [
          "Empleado",
          "Cedula",
          "Salario Cotizable",
          `AFP Empleado (${TSS_RATES.AFP_EMPLEADO}%)`,
          `SFS Empleado (${TSS_RATES.SFS_EMPLEADO}%)`,
          `AFP Patronal (${TSS_RATES.AFP_PATRONAL}%)`,
          `SFS Patronal (${TSS_RATES.SFS_PATRONAL}%)`,
          `SRL Patronal (${TSS_RATES.SRL_PATRONAL}%)`,
        ],
        ...rows.map((r) => [
          `${r.apellido}, ${r.nombre}`,
          formatCedula(r.cedula),
          r.salario_cotizable,
          r.afp_empleado,
          r.sfs_empleado,
          r.afp_patronal,
          r.sfs_patronal,
          r.srl_patronal,
        ]),
        [],
        [
          "TOTALES",
          "",
          totals.salario,
          totals.afpEmp,
          totals.sfsEmp,
          totals.afpPat,
          totals.sfsPat,
          totals.srlPat,
        ],
      ];

      const ws = XLSX.utils.aoa_to_sheet(wsData);

      // Format currency columns
      const currCols = [2, 3, 4, 5, 6, 7];
      for (let row = 1; row <= rows.length + 2; row++) {
        for (const col of currCols) {
          const cell =
            ws[XLSX.utils.encode_cell({ r: row, c: col })];
          if (cell && typeof cell.v === "number") {
            cell.z = "#,##0.00";
          }
        }
      }

      // Column widths
      ws["!cols"] = [
        { wch: 30 },
        { wch: 15 },
        { wch: 18 },
        { wch: 16 },
        { wch: 16 },
        { wch: 16 },
        { wch: 16 },
        { wch: 16 },
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "TSS");
      XLSX.writeFile(
        wb,
        `TSS_${MESES[mes - 1]}_${ano}.xlsx`
      );
    } catch (err) {
      console.error("Error exporting:", err);
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reportes TSS</h1>
          <p className="text-gray-500 text-sm mt-1">
            Generacion de reportes para la Tesoreria de la Seguridad Social
          </p>
        </div>
      </div>

      {/* Month/Year selector */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm mb-6">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mes
            </label>
            <select
              value={mes}
              onChange={(e) => setMes(parseInt(e.target.value))}
              className="px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
            >
              {MESES.map((m, i) => (
                <option key={i} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ano
            </label>
            <select
              value={ano}
              onChange={(e) => setAno(parseInt(e.target.value))}
              className="px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
            >
              {Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i).map(
                (y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                )
              )}
            </select>
          </div>
          <button
            onClick={loadReport}
            disabled={loading}
            className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-5 py-2 rounded-lg transition-colors disabled:opacity-50 shadow-sm"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="h-4 w-4" />
            )}
            {loading ? "Generando..." : "Generar Reporte"}
          </button>
          {loaded && rows.length > 0 && (
            <button
              onClick={handleExport}
              disabled={exporting}
              className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-5 py-2 rounded-lg transition-colors disabled:opacity-50 shadow-sm"
            >
              {exporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Exportar Excel
            </button>
          )}
        </div>
      </div>

      {/* Summary cards */}
      {loaded && rows.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="bg-cyan-50 rounded-lg p-2">
                <ShieldCheck className="h-5 w-5 text-cyan-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total AFP</p>
                <p className="text-lg font-bold text-gray-900">
                  {formatCurrency(totals.afpEmp + totals.afpPat)}
                </p>
                <p className="text-xs text-gray-400">
                  Emp: {formatCurrency(totals.afpEmp)} | Pat:{" "}
                  {formatCurrency(totals.afpPat)}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="bg-orange-50 rounded-lg p-2">
                <Users className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total SFS</p>
                <p className="text-lg font-bold text-gray-900">
                  {formatCurrency(totals.sfsEmp + totals.sfsPat)}
                </p>
                <p className="text-xs text-gray-400">
                  Emp: {formatCurrency(totals.sfsEmp)} | Pat:{" "}
                  {formatCurrency(totals.sfsPat)}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="bg-green-50 rounded-lg p-2">
                <Building2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total SRL</p>
                <p className="text-lg font-bold text-gray-900">
                  {formatCurrency(totals.srlPat)}
                </p>
                <p className="text-xs text-gray-400">Solo patronal</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Data table */}
      {loaded && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-500">
                    Empleado
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">
                    Cedula
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">
                    Salario Cotizable
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">
                    AFP Emp.
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">
                    SFS Emp.
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">
                    AFP Pat.
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">
                    SFS Pat.
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">
                    SRL Pat.
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="text-center py-12 text-gray-400"
                    >
                      <FileSpreadsheet className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      <p>
                        No se encontraron datos de nomina para{" "}
                        {MESES[mes - 1]} {ano}
                      </p>
                    </td>
                  </tr>
                ) : (
                  <>
                    {rows.map((r) => (
                      <tr
                        key={r.empleado_id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {r.apellido}, {r.nombre}
                        </td>
                        <td className="px-4 py-3 text-gray-600 font-mono text-xs">
                          {formatCedula(r.cedula)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono">
                          {formatCurrency(r.salario_cotizable)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-gray-600">
                          {formatCurrency(r.afp_empleado)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-gray-600">
                          {formatCurrency(r.sfs_empleado)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-cyan-700">
                          {formatCurrency(r.afp_patronal)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-cyan-700">
                          {formatCurrency(r.sfs_patronal)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-cyan-700">
                          {formatCurrency(r.srl_patronal)}
                        </td>
                      </tr>
                    ))}
                    {/* Totals row */}
                    <tr className="bg-gray-50 border-t-2 border-gray-300 font-semibold">
                      <td className="px-4 py-3 text-gray-900">TOTALES</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {rows.length} empleados
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-gray-900">
                        {formatCurrency(totals.salario)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-gray-900">
                        {formatCurrency(totals.afpEmp)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-gray-900">
                        {formatCurrency(totals.sfsEmp)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-cyan-800">
                        {formatCurrency(totals.afpPat)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-cyan-800">
                        {formatCurrency(totals.sfsPat)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-cyan-800">
                        {formatCurrency(totals.srlPat)}
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Not loaded yet */}
      {!loaded && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
          <FileSpreadsheet className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-400">
            Seleccione un mes y presione &quot;Generar Reporte&quot;
          </p>
        </div>
      )}
    </>
  );
}
