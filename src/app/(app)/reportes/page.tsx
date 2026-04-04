"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ReportViewer } from "@/components/ui/report-viewer";
import {
  Users,
  Building2,
  Calculator,
  Wallet,
  Shield,
  Calendar,
  Clock,
  FileBarChart,
  TrendingUp,
  ArrowLeft,
  Search,
  Eye,
  Loader2,
  BookOpen,
  DollarSign,
  BarChart3,
  UserCheck,
  Briefcase,
  Phone,
  Scale,
  PieChart,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ReportDef {
  id: string;
  nombre: string;
  descripcion: string;
  icon: React.ReactNode;
  categoria: string;
  filtros: FilterType[];
}

type FilterType =
  | "quincena"
  | "dateRange"
  | "departamento"
  | "sucursal"
  | "empleado"
  | "estado"
  | "quincenaCompare";

interface Quincena {
  id: string;
  periodo_inicio: string;
  periodo_fin: string;
  estado: string;
  descripcion: string | null;
  fecha_pago: string | null;
}

interface Empleado {
  id: string;
  nombre: string;
  apellido: string;
  numero_empleado: string;
}

interface Filters {
  quincenaId: string;
  quincenaCompareId: string;
  fechaDesde: string;
  fechaHasta: string;
  departamento: string;
  sucursalId: string;
  empleadoId: string;
  estado: string;
}

interface ReportResult {
  columns: { key: string; label: string; align?: "left" | "center" | "right" }[];
  data: Record<string, unknown>[];
  totals?: Record<string, unknown>;
  subtitle?: string;
  periodo?: string;
}

// ---------------------------------------------------------------------------
// Helpers — Supabase returns joined relations as arrays; unwrap to single obj
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function unwrap<T>(val: any): T | null {
  if (Array.isArray(val)) return (val[0] as T) ?? null;
  return (val as T) ?? null;
}

// ---------------------------------------------------------------------------
// Report Catalog
// ---------------------------------------------------------------------------

const REPORTES: ReportDef[] = [
  // ---- Empleados ----
  {
    id: "empleados_activos",
    nombre: "Empleados Activos",
    descripcion: "Lista completa de empleados activos con datos personales y laborales",
    icon: <Users className="h-5 w-5" />,
    categoria: "Empleados",
    filtros: ["departamento"],
  },
  {
    id: "empleados_departamento",
    nombre: "Empleados por Departamento",
    descripcion: "Empleados agrupados por departamento con subtotales de sueldo",
    icon: <Building2 className="h-5 w-5" />,
    categoria: "Empleados",
    filtros: ["departamento"],
  },
  {
    id: "directorio_empleados",
    nombre: "Directorio de Empleados",
    descripcion: "Información de contacto: teléfono, email, dirección",
    icon: <Phone className="h-5 w-5" />,
    categoria: "Empleados",
    filtros: ["departamento"],
  },
  {
    id: "empleados_tipo_contrato",
    nombre: "Empleados por Tipo de Contrato",
    descripcion: "Clasificación de empleados según tipo de contrato",
    icon: <Briefcase className="h-5 w-5" />,
    categoria: "Empleados",
    filtros: [],
  },
  // ---- Nómina ----
  {
    id: "nomina_quincena",
    nombre: "Nómina por Quincena",
    descripcion: "Detalle completo de nómina para una quincena seleccionada",
    icon: <Calculator className="h-5 w-5" />,
    categoria: "Nómina",
    filtros: ["quincena", "departamento"],
  },
  {
    id: "resumen_nominas_periodo",
    nombre: "Resumen de Nóminas por Período",
    descripcion: "Totales de devengado, deducciones y neto por cada quincena",
    icon: <FileBarChart className="h-5 w-5" />,
    categoria: "Nómina",
    filtros: ["dateRange"],
  },
  {
    id: "comparativo_nominas",
    nombre: "Comparativo de Nóminas",
    descripcion: "Comparación lado a lado de dos períodos de nómina",
    icon: <BarChart3 className="h-5 w-5" />,
    categoria: "Nómina",
    filtros: ["quincena", "quincenaCompare"],
  },
  {
    id: "horas_extra_periodo",
    nombre: "Detalle de Horas Extra por Período",
    descripcion: "Horas extra diurnas, nocturnas y feriados por empleado",
    icon: <Clock className="h-5 w-5" />,
    categoria: "Nómina",
    filtros: ["quincena", "departamento"],
  },
  {
    id: "historico_sueldos",
    nombre: "Histórico de Sueldos por Empleado",
    descripcion: "Evolución del sueldo neto a lo largo del tiempo",
    icon: <TrendingUp className="h-5 w-5" />,
    categoria: "Nómina",
    filtros: ["empleado", "dateRange"],
  },
  // ---- Préstamos ----
  {
    id: "prestamos_activos",
    nombre: "Préstamos Activos",
    descripcion: "Préstamos vigentes con saldo pendiente y cuotas",
    icon: <Wallet className="h-5 w-5" />,
    categoria: "Préstamos",
    filtros: [],
  },
  {
    id: "historial_prestamos",
    nombre: "Historial de Préstamos",
    descripcion: "Todos los préstamos con estado y pagos realizados",
    icon: <BookOpen className="h-5 w-5" />,
    categoria: "Préstamos",
    filtros: ["estado"],
  },
  {
    id: "prestamos_empleado",
    nombre: "Préstamos por Empleado",
    descripcion: "Detalle de préstamos de un empleado específico",
    icon: <UserCheck className="h-5 w-5" />,
    categoria: "Préstamos",
    filtros: ["empleado"],
  },
  // ---- Deducciones y TSS ----
  {
    id: "tss_mensual",
    nombre: "Reporte TSS Mensual",
    descripcion: "Aportes AFP, SFS y SRL (empleado + patronal) para la TSS",
    icon: <Shield className="h-5 w-5" />,
    categoria: "Deducciones y TSS",
    filtros: ["dateRange"],
  },
  {
    id: "costo_patronal",
    nombre: "Costo Patronal por Período",
    descripcion: "Total de contribuciones patronales AFP, SFS, SRL",
    icon: <DollarSign className="h-5 w-5" />,
    categoria: "Deducciones y TSS",
    filtros: ["dateRange"],
  },
  {
    id: "resumen_deducciones",
    nombre: "Resumen de Deducciones",
    descripcion: "Todas las deducciones por empleado en un período",
    icon: <Scale className="h-5 w-5" />,
    categoria: "Deducciones y TSS",
    filtros: ["quincena"],
  },
  // ---- Vacaciones y Liquidaciones ----
  {
    id: "vacaciones_resumen",
    nombre: "Resumen de Vacaciones",
    descripcion: "Días acumulados, tomados y disponibles por empleado",
    icon: <Calendar className="h-5 w-5" />,
    categoria: "Vacaciones y Liquidaciones",
    filtros: ["departamento"],
  },
  {
    id: "liquidaciones_procesadas",
    nombre: "Liquidaciones Procesadas",
    descripcion: "Liquidaciones realizadas con montos desglosados",
    icon: <FileBarChart className="h-5 w-5" />,
    categoria: "Vacaciones y Liquidaciones",
    filtros: ["dateRange"],
  },
  // ---- Resúmenes Gerenciales ----
  {
    id: "resumen_ejecutivo",
    nombre: "Resumen Ejecutivo de Nómina",
    descripcion: "Vista de alto nivel con totales y métricas clave",
    icon: <PieChart className="h-5 w-5" />,
    categoria: "Resúmenes Gerenciales",
    filtros: ["quincena"],
  },
  {
    id: "costo_total_empleado",
    nombre: "Costo Total por Empleado",
    descripcion: "Sueldo + aportes patronales + prestaciones por empleado",
    icon: <DollarSign className="h-5 w-5" />,
    categoria: "Resúmenes Gerenciales",
    filtros: ["quincena"],
  },
  {
    id: "gastos_departamento",
    nombre: "Análisis de Gastos por Departamento",
    descripcion: "Distribución de costos de nómina por departamento",
    icon: <Building2 className="h-5 w-5" />,
    categoria: "Resúmenes Gerenciales",
    filtros: ["quincena"],
  },
  // ---- Horas Extras ----
  {
    id: "horas_extras_sucursal",
    nombre: "Horas Extras por Sucursal",
    descripcion: "Detalle de horas extras y montos pagados agrupados por sucursal",
    icon: <Clock className="h-5 w-5" />,
    categoria: "Horas Extras",
    filtros: ["dateRange", "sucursal"],
  },
  {
    id: "horas_extras_departamento",
    nombre: "Horas Extras por Departamento",
    descripcion: "Horas extras desglosadas por departamento en un período",
    icon: <Clock className="h-5 w-5" />,
    categoria: "Horas Extras",
    filtros: ["dateRange", "departamento"],
  },
  {
    id: "horas_extras_detalle",
    nombre: "Detalle de Horas Extras Importadas",
    descripcion: "Registro detallado de horas extras calculadas desde Excel por quincena",
    icon: <Clock className="h-5 w-5" />,
    categoria: "Horas Extras",
    filtros: ["quincena", "sucursal"],
  },
  // ---- Sucursales ----
  {
    id: "nomina_sucursal",
    nombre: "Nómina por Sucursal",
    descripcion: "Resumen de nómina desglosado por cada sucursal",
    icon: <Building2 className="h-5 w-5" />,
    categoria: "Sucursales",
    filtros: ["quincena"],
  },
  {
    id: "empleados_sucursal",
    nombre: "Empleados por Sucursal",
    descripcion: "Lista de empleados agrupados por sucursal con subtotales de sueldo",
    icon: <Users className="h-5 w-5" />,
    categoria: "Sucursales",
    filtros: ["sucursal"],
  },
  {
    id: "costo_sucursal_departamento",
    nombre: "Costo por Sucursal y Departamento",
    descripcion: "Análisis cruzado de costos de nómina por sucursal y departamento",
    icon: <DollarSign className="h-5 w-5" />,
    categoria: "Sucursales",
    filtros: ["quincena"],
  },
  // ---- Análisis Especiales ----
  {
    id: "analisis_productividad",
    nombre: "Análisis de Productividad Laboral",
    descripcion: "Relación horas extras vs salario base por empleado — identifica sobrecarga",
    icon: <TrendingUp className="h-5 w-5" />,
    categoria: "Análisis Especiales",
    filtros: ["quincena"],
  },
  {
    id: "analisis_costo_hora_extra",
    nombre: "Impacto Económico de Horas Extras",
    descripcion: "Análisis del costo total de horas extras vs nómina regular por período",
    icon: <DollarSign className="h-5 w-5" />,
    categoria: "Análisis Especiales",
    filtros: ["dateRange"],
  },
  {
    id: "analisis_rotacion_costos",
    nombre: "Dashboard de Costos Laborales",
    descripcion: "Resumen ejecutivo: nómina, patronal, extras, préstamos por sucursal",
    icon: <PieChart className="h-5 w-5" />,
    categoria: "Análisis Especiales",
    filtros: ["quincena"],
  },
];

const CATEGORIAS_ORDER = [
  "Empleados",
  "Nómina",
  "Horas Extras",
  "Sucursales",
  "Préstamos",
  "Deducciones y TSS",
  "Vacaciones y Liquidaciones",
  "Resúmenes Gerenciales",
  "Análisis Especiales",
];

const CATEGORIA_ICONS: Record<string, React.ReactNode> = {
  Empleados: <Users className="h-5 w-5" />,
  "Nómina": <Calculator className="h-5 w-5" />,
  "Horas Extras": <Clock className="h-5 w-5" />,
  "Sucursales": <Building2 className="h-5 w-5" />,
  "Préstamos": <Wallet className="h-5 w-5" />,
  "Deducciones y TSS": <Shield className="h-5 w-5" />,
  "Vacaciones y Liquidaciones": <Calendar className="h-5 w-5" />,
  "Resúmenes Gerenciales": <TrendingUp className="h-5 w-5" />,
  "Análisis Especiales": <BarChart3 className="h-5 w-5" />,
};

// ---------------------------------------------------------------------------
// TSS rates (Dominican Republic 2024)
// ---------------------------------------------------------------------------
const TSS = {
  AFP_EMPLEADO: 0.0287,
  AFP_PATRONAL: 0.0710,
  SFS_EMPLEADO: 0.0304,
  SFS_PATRONAL: 0.0709,
  SRL_PATRONAL: 0.011,
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function ReportesPage() {
  const [view, setView] = useState<"catalog" | "filters" | "preview">("catalog");
  const [selectedReport, setSelectedReport] = useState<ReportDef | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Filter state
  const [filters, setFilters] = useState<Filters>({
    quincenaId: "",
    quincenaCompareId: "",
    fechaDesde: "",
    fechaHasta: "",
    departamento: "",
    sucursalId: "",
    empleadoId: "",
    estado: "",
  });

  // Dropdown data
  const [quincenas, setQuincenas] = useState<Quincena[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [departamentos, setDepartamentos] = useState<string[]>([]);
  const [sucursalesList, setSucursalesList] = useState<{ id: string; nombre: string }[]>([]);

  // Report result
  const [reportResult, setReportResult] = useState<ReportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedQuincenas, setExpandedQuincenas] = useState<Set<string>>(new Set());

  // Load dropdown data when entering filter view
  useEffect(() => {
    if (view === "filters") {
      loadDropdownData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  async function loadDropdownData() {
    const supabase = createClient();

    const [qRes, eRes, dRes, sRes] = await Promise.all([
      supabase
        .from("quincenas")
        .select("id, periodo_inicio, periodo_fin, estado, descripcion, fecha_pago")
        .order("periodo_inicio", { ascending: false }),
      supabase
        .from("empleados")
        .select("id, nombre, apellido, numero_empleado")
        .eq("estado", "activo")
        .order("apellido"),
      supabase
        .from("empleados")
        .select("departamento")
        .eq("estado", "activo")
        .not("departamento", "is", null),
      supabase
        .from("sucursales")
        .select("id, nombre")
        .eq("activo", true)
        .order("nombre"),
    ]);

    if (qRes.data) setQuincenas(qRes.data);
    if (eRes.data) setEmpleados(eRes.data);
    if (dRes.data) {
      const depts = [
        ...new Set(
          dRes.data
            .map((d) => d.departamento as string)
            .filter(Boolean)
        ),
      ].sort();
      setDepartamentos(depts);
    }
    if (sRes.data) setSucursalesList(sRes.data);
  }

  function handleSelectReport(report: ReportDef) {
    setSelectedReport(report);
    setError(null);
    setReportResult(null);
    setFilters({
      quincenaId: "",
      quincenaCompareId: "",
      fechaDesde: "",
      fechaHasta: "",
      departamento: "",
      sucursalId: "",
      empleadoId: "",
      estado: "",
    });
    if (report.filtros.length === 0) {
      // No filters needed, generate immediately
      setView("filters");
    } else {
      setView("filters");
    }
  }

  function handleBack() {
    if (view === "preview") {
      setView("filters");
      setReportResult(null);
    } else {
      setView("catalog");
      setSelectedReport(null);
    }
  }

  // ---------- Report generation ----------

  const generateReport = useCallback(async () => {
    if (!selectedReport) return;
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const result = await buildReport(supabase, selectedReport.id, filters);
      setReportResult(result);
      setView("preview");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al generar el reporte");
    } finally {
      setLoading(false);
    }
  }, [selectedReport, filters]);

  // Filter the catalog by search term
  const filteredReportes = useMemo(() => {
    if (!searchTerm.trim()) return REPORTES;
    const term = searchTerm.toLowerCase();
    return REPORTES.filter(
      (r) =>
        r.nombre.toLowerCase().includes(term) ||
        r.descripcion.toLowerCase().includes(term) ||
        r.categoria.toLowerCase().includes(term)
    );
  }, [searchTerm]);

  // ---------- Render ----------

  if (view === "preview" && reportResult && selectedReport) {
    // Special expandable view for resumen_nominas_periodo
    const hasDetail = selectedReport.id === "resumen_nominas_periodo";

    function toggleQuincena(qId: string) {
      setExpandedQuincenas((prev) => {
        const next = new Set(prev);
        if (next.has(qId)) next.delete(qId);
        else next.add(qId);
        return next;
      });
    }

    return (
      <div>
        <button
          onClick={handleBack}
          className="mb-4 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a filtros
        </button>
        <ReportViewer
          title={selectedReport.nombre}
          subtitle={reportResult.subtitle}
          periodo={reportResult.periodo}
          columns={reportResult.columns}
          data={reportResult.data}
          totals={reportResult.totals}
          onClose={handleBack}
          {...(hasDetail ? {
            onRowClick: (row) => {
              const qId = row.quincena_id as string;
              if (qId) toggleQuincena(qId);
            },
            renderExpandedRow: (row) => {
              const qId = row.quincena_id as string;
              if (!qId || !expandedQuincenas.has(qId)) return null;
              const details = (row._detailRows || []) as Record<string, unknown>[];
              if (details.length === 0) return null;
              return (
                <tr key={`detail-${qId}`} className="bg-cyan-50/30">
                  <td colSpan={reportResult.columns.length} className="px-4 py-3">
                    <div className="text-xs mb-2 font-semibold text-gray-600 flex items-center gap-1">
                      <ChevronUp className="h-3 w-3" />
                      Detalle de empleados — {row.periodo as string}
                    </div>
                    <table className="w-full text-xs border border-gray-200 rounded-lg overflow-hidden">
                      <thead>
                        <tr className="bg-gray-100 border-b border-gray-200">
                          <th className="text-left px-2 py-1.5 font-medium text-gray-500">Empleado</th>
                          <th className="text-left px-2 py-1.5 font-medium text-gray-500">No.</th>
                          <th className="text-left px-2 py-1.5 font-medium text-gray-500">Depto.</th>
                          <th className="text-right px-2 py-1.5 font-medium text-gray-500">Devengado</th>
                          <th className="text-right px-2 py-1.5 font-medium text-gray-500">AFP</th>
                          <th className="text-right px-2 py-1.5 font-medium text-gray-500">SFS</th>
                          <th className="text-right px-2 py-1.5 font-medium text-gray-500">ISR</th>
                          <th className="text-right px-2 py-1.5 font-medium text-gray-500">Prést.</th>
                          <th className="text-right px-2 py-1.5 font-medium text-gray-500">Deducciones</th>
                          <th className="text-right px-2 py-1.5 font-medium text-gray-500 font-bold">Neto</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {details.map((d, i) => (
                          <tr key={i} className="hover:bg-white/50">
                            <td className="px-2 py-1 font-medium">{d.nombre as string}</td>
                            <td className="px-2 py-1 text-gray-500">{d.numero_empleado as string}</td>
                            <td className="px-2 py-1 text-gray-500">{d.departamento as string}</td>
                            <td className="px-2 py-1 text-right font-mono">{formatCurrency(Number(d.devengado))}</td>
                            <td className="px-2 py-1 text-right font-mono text-gray-500">{formatCurrency(Number(d.afp))}</td>
                            <td className="px-2 py-1 text-right font-mono text-gray-500">{formatCurrency(Number(d.sfs))}</td>
                            <td className="px-2 py-1 text-right font-mono text-gray-500">{formatCurrency(Number(d.isr))}</td>
                            <td className="px-2 py-1 text-right font-mono text-gray-500">{formatCurrency(Number(d.prestamos))}</td>
                            <td className="px-2 py-1 text-right font-mono">{formatCurrency(Number(d.deducciones))}</td>
                            <td className="px-2 py-1 text-right font-mono font-bold text-success-600">{formatCurrency(Number(d.neto))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </td>
                </tr>
              );
            },
            rowClickHint: "Haga clic en una quincena para ver el detalle de empleados",
          } : {})}
        />
      </div>
    );
  }

  if (view === "filters" && selectedReport) {
    return (
      <div>
        <button
          onClick={handleBack}
          className="mb-4 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al catálogo
        </button>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 max-w-2xl">
          <div className="flex items-start gap-3 mb-6">
            <div className="p-2.5 bg-cyan-50 rounded-lg text-cyan-600">
              {selectedReport.icon}
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{selectedReport.nombre}</h2>
              <p className="text-sm text-gray-500">{selectedReport.descripcion}</p>
            </div>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-200">
              {error}
            </div>
          )}

          {selectedReport.filtros.length > 0 && (
            <div className="space-y-4 mb-6">
              <h3 className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-2">
                Filtros del Reporte
              </h3>

              {/* Quincena selector */}
              {selectedReport.filtros.includes("quincena") && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quincena {selectedReport.filtros.includes("quincenaCompare") ? "(Período A)" : ""}
                  </label>
                  <select
                    value={filters.quincenaId}
                    onChange={(e) =>
                      setFilters((f) => ({ ...f, quincenaId: e.target.value }))
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  >
                    <option value="">Seleccionar quincena...</option>
                    {quincenas.map((q) => (
                      <option key={q.id} value={q.id}>
                        {q.descripcion || `${formatDate(q.periodo_inicio)} - ${formatDate(q.periodo_fin)}`}
                        {q.estado === "cerrada" ? " (Cerrada)" : q.estado === "pagada" ? " (Pagada)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Quincena compare selector */}
              {selectedReport.filtros.includes("quincenaCompare") && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quincena (Período B)
                  </label>
                  <select
                    value={filters.quincenaCompareId}
                    onChange={(e) =>
                      setFilters((f) => ({ ...f, quincenaCompareId: e.target.value }))
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  >
                    <option value="">Seleccionar quincena para comparar...</option>
                    {quincenas.map((q) => (
                      <option key={q.id} value={q.id}>
                        {q.descripcion || `${formatDate(q.periodo_inicio)} - ${formatDate(q.periodo_fin)}`}
                        {q.estado === "cerrada" ? " (Cerrada)" : q.estado === "pagada" ? " (Pagada)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Date range */}
              {selectedReport.filtros.includes("dateRange") && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Desde
                    </label>
                    <input
                      type="date"
                      value={filters.fechaDesde}
                      onChange={(e) =>
                        setFilters((f) => ({ ...f, fechaDesde: e.target.value }))
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Hasta
                    </label>
                    <input
                      type="date"
                      value={filters.fechaHasta}
                      onChange={(e) =>
                        setFilters((f) => ({ ...f, fechaHasta: e.target.value }))
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    />
                  </div>
                </div>
              )}

              {/* Departamento */}
              {selectedReport.filtros.includes("departamento") && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Departamento
                  </label>
                  <select
                    value={filters.departamento}
                    onChange={(e) =>
                      setFilters((f) => ({ ...f, departamento: e.target.value }))
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  >
                    <option value="">Todos los departamentos</option>
                    {departamentos.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Sucursal */}
              {selectedReport.filtros.includes("sucursal") && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sucursal
                  </label>
                  <select
                    value={filters.sucursalId}
                    onChange={(e) =>
                      setFilters((f) => ({ ...f, sucursalId: e.target.value }))
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  >
                    <option value="">Todas las sucursales</option>
                    {sucursalesList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Empleado */}
              {selectedReport.filtros.includes("empleado") && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Empleado
                  </label>
                  <select
                    value={filters.empleadoId}
                    onChange={(e) =>
                      setFilters((f) => ({ ...f, empleadoId: e.target.value }))
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  >
                    <option value="">Seleccionar empleado...</option>
                    {empleados.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.numero_empleado} - {emp.apellido}, {emp.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Estado (for loans) */}
              {selectedReport.filtros.includes("estado") && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estado
                  </label>
                  <select
                    value={filters.estado}
                    onChange={(e) =>
                      setFilters((f) => ({ ...f, estado: e.target.value }))
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  >
                    <option value="">Todos</option>
                    <option value="activo">Activo</option>
                    <option value="pagado">Pagado</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </div>
              )}
            </div>
          )}

          {selectedReport.filtros.length === 0 && (
            <p className="text-sm text-gray-500 mb-6">
              Este reporte no requiere filtros adicionales.
            </p>
          )}

          <button
            onClick={generateReport}
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors disabled:opacity-50 text-sm"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generando reporte...
              </>
            ) : (
              <>
                <Eye className="h-4 w-4" />
                Vista Previa
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // ---------- Catalog View ----------
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Reportes</h1>
        <p className="text-gray-500 text-sm mt-1">
          Genera reportes con vista previa, exportación a PDF, Excel e impresión
        </p>
      </div>

      {/* Search */}
      <div className="mb-6 relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar reporte..."
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
        />
      </div>

      {CATEGORIAS_ORDER.map((cat) => {
        const reportesInCat = filteredReportes.filter((r) => r.categoria === cat);
        if (reportesInCat.length === 0) return null;

        return (
          <div key={cat} className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-cyan-600">{CATEGORIA_ICONS[cat]}</span>
              <h2 className="text-lg font-semibold text-gray-700">{cat}</h2>
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                {reportesInCat.length}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {reportesInCat.map((reporte) => (
                <button
                  key={reporte.id}
                  onClick={() => handleSelectReport(reporte)}
                  className="text-left bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md hover:border-cyan-200 transition-all group"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="p-2 bg-cyan-50 rounded-lg text-cyan-600 group-hover:bg-cyan-100 transition-colors">
                      {reporte.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 text-sm">
                        {reporte.nombre}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                        {reporte.descripcion}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-orange-500 font-medium group-hover:text-orange-600 transition-colors">
                    <Eye className="h-3.5 w-3.5" />
                    Ver reporte
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
      })}

      {filteredReportes.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <Search className="h-10 w-10 mx-auto mb-3 text-gray-300" />
          <p className="text-sm">No se encontraron reportes que coincidan con la búsqueda.</p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Report Builder
// ---------------------------------------------------------------------------

async function buildReport(
  supabase: ReturnType<typeof createClient>,
  reportId: string,
  filters: Filters
): Promise<ReportResult> {
  switch (reportId) {
    // =====================================================================
    // EMPLEADOS
    // =====================================================================
    case "empleados_activos": {
      let query = supabase
        .from("empleados")
        .select("*")
        .eq("estado", "activo")
        .order("apellido");
      if (filters.departamento)
        query = query.eq("departamento", filters.departamento);

      const { data: emps, error } = await query;
      if (error) throw error;
      const rows = (emps || []).map((e) => ({
        numero_empleado: e.numero_empleado,
        cedula: e.cedula,
        nombre: `${e.nombre} ${e.apellido}`,
        cargo: e.cargo || "",
        departamento: e.departamento || "",
        tipo_contrato: e.tipo_contrato || "",
        fecha_ingreso: e.fecha_ingreso ? formatDate(e.fecha_ingreso) : "",
        sueldo_quincenal: e.sueldo_quincenal,
        banco: e.banco || "",
        numero_cuenta: e.numero_cuenta || "",
        nss: e.nss || "",
      }));
      const totalSueldo = rows.reduce(
        (s, r) => s + ((r.sueldo_quincenal as number) || 0),
        0
      );
      return {
        columns: [
          { key: "numero_empleado", label: "No. Emp" },
          { key: "cedula", label: "Cédula" },
          { key: "nombre", label: "Nombre" },
          { key: "cargo", label: "Cargo" },
          { key: "departamento", label: "Depto." },
          { key: "tipo_contrato", label: "Contrato" },
          { key: "fecha_ingreso", label: "Ingreso" },
          { key: "sueldo_quincenal", label: "Sueldo Quinc.", align: "right" },
          { key: "banco", label: "Banco" },
          { key: "numero_cuenta", label: "No. Cuenta" },
          { key: "nss", label: "NSS" },
        ],
        data: rows,
        totals: {
          nombre: `TOTAL (${rows.length} empleados)`,
          sueldo_quincenal: totalSueldo,
        },
        subtitle: filters.departamento
          ? `Departamento: ${filters.departamento}`
          : "Todos los departamentos",
      };
    }

    case "empleados_departamento": {
      let query = supabase
        .from("empleados")
        .select("*")
        .eq("estado", "activo")
        .order("departamento")
        .order("apellido");
      if (filters.departamento)
        query = query.eq("departamento", filters.departamento);

      const { data: emps, error } = await query;
      if (error) throw error;

      const rows = (emps || []).map((e) => ({
        departamento: e.departamento || "Sin departamento",
        numero_empleado: e.numero_empleado,
        nombre: `${e.nombre} ${e.apellido}`,
        cargo: e.cargo || "",
        sueldo_quincenal: e.sueldo_quincenal,
        fecha_ingreso: e.fecha_ingreso ? formatDate(e.fecha_ingreso) : "",
      }));
      const totalSueldo = rows.reduce(
        (s, r) => s + ((r.sueldo_quincenal as number) || 0),
        0
      );
      return {
        columns: [
          { key: "departamento", label: "Departamento" },
          { key: "numero_empleado", label: "No. Emp" },
          { key: "nombre", label: "Nombre" },
          { key: "cargo", label: "Cargo" },
          { key: "sueldo_quincenal", label: "Sueldo Quinc.", align: "right" },
          { key: "fecha_ingreso", label: "Ingreso" },
        ],
        data: rows,
        totals: {
          departamento: `TOTAL (${rows.length} empleados)`,
          sueldo_quincenal: totalSueldo,
        },
      };
    }

    case "directorio_empleados": {
      let query = supabase
        .from("empleados")
        .select("*")
        .eq("estado", "activo")
        .order("apellido");
      if (filters.departamento)
        query = query.eq("departamento", filters.departamento);

      const { data: emps, error } = await query;
      if (error) throw error;

      const rows = (emps || []).map((e) => ({
        numero_empleado: e.numero_empleado,
        nombre: `${e.nombre} ${e.apellido}`,
        cargo: e.cargo || "",
        departamento: e.departamento || "",
        email: e.email || "",
        telefono_trabajo: e.telefono_trabajo || "",
        telefono_personal: e.telefono_personal || "",
      }));
      return {
        columns: [
          { key: "numero_empleado", label: "No. Emp" },
          { key: "nombre", label: "Nombre" },
          { key: "cargo", label: "Cargo" },
          { key: "departamento", label: "Depto." },
          { key: "email", label: "Email" },
          { key: "telefono_trabajo", label: "Tel. Trabajo" },
          { key: "telefono_personal", label: "Tel. Personal" },
        ],
        data: rows,
        subtitle: "Directorio de Contacto",
      };
    }

    case "empleados_tipo_contrato": {
      const { data: emps, error } = await supabase
        .from("empleados")
        .select("*")
        .eq("estado", "activo")
        .order("tipo_contrato")
        .order("apellido");
      if (error) throw error;

      const rows = (emps || []).map((e) => ({
        tipo_contrato: e.tipo_contrato || "Sin especificar",
        numero_empleado: e.numero_empleado,
        nombre: `${e.nombre} ${e.apellido}`,
        cargo: e.cargo || "",
        departamento: e.departamento || "",
        fecha_ingreso: e.fecha_ingreso ? formatDate(e.fecha_ingreso) : "",
        sueldo_quincenal: e.sueldo_quincenal,
      }));
      const totalSueldo = rows.reduce(
        (s, r) => s + ((r.sueldo_quincenal as number) || 0),
        0
      );
      return {
        columns: [
          { key: "tipo_contrato", label: "Tipo Contrato" },
          { key: "numero_empleado", label: "No. Emp" },
          { key: "nombre", label: "Nombre" },
          { key: "cargo", label: "Cargo" },
          { key: "departamento", label: "Depto." },
          { key: "fecha_ingreso", label: "Ingreso" },
          { key: "sueldo_quincenal", label: "Sueldo Quinc.", align: "right" },
        ],
        data: rows,
        totals: {
          tipo_contrato: `TOTAL (${rows.length})`,
          sueldo_quincenal: totalSueldo,
        },
      };
    }

    // =====================================================================
    // NOMINA
    // =====================================================================
    case "nomina_quincena": {
      if (!filters.quincenaId) throw new Error("Seleccione una quincena");

      const { data: q } = await supabase
        .from("quincenas")
        .select("*")
        .eq("id", filters.quincenaId)
        .single();

      let query = supabase
        .from("nomina_items")
        .select("*, empleado:empleados(nombre, apellido, numero_empleado, departamento, cargo)")
        .eq("quincena_id", filters.quincenaId);

      const { data: items, error } = await query;
      if (error) throw error;

      let rows = (items || []).map((ni) => {
        const emp = unwrap<{
          nombre: string;
          apellido: string;
          numero_empleado: string;
          departamento: string | null;
          cargo: string | null;
        }>(ni.empleado);
        return {
          numero_empleado: emp?.numero_empleado || "",
          nombre: emp ? `${emp.nombre} ${emp.apellido}` : "",
          departamento: emp?.departamento || "",
          subtotal_devengado: ni.subtotal_devengado,
          afp_monto: ni.afp_monto,
          sfs_monto: ni.sfs_monto,
          isr_monto: ni.isr_monto,
          deduccion_prestamos: ni.deduccion_prestamos || 0,
          total_deducciones: ni.total_deducciones,
          total_neto: ni.total_neto,
          afp_patronal: ni.afp_patronal_monto,
          sfs_patronal: ni.sfs_patronal_monto,
          srl_patronal: ni.srl_patronal_monto,
        };
      });

      if (filters.departamento) {
        rows = rows.filter((r) => r.departamento === filters.departamento);
      }

      const sumField = (field: string) =>
        rows.reduce((s, r) => s + (Number((r as Record<string, unknown>)[field]) || 0), 0);

      return {
        columns: [
          { key: "numero_empleado", label: "No. Emp" },
          { key: "nombre", label: "Nombre" },
          { key: "departamento", label: "Depto." },
          { key: "subtotal_devengado", label: "Devengado", align: "right" },
          { key: "afp_monto", label: "AFP Emp.", align: "right" },
          { key: "sfs_monto", label: "SFS Emp.", align: "right" },
          { key: "isr_monto", label: "ISR", align: "right" },
          { key: "deduccion_prestamos", label: "Préstamos", align: "right" },
          { key: "total_deducciones", label: "Deducciones", align: "right" },
          { key: "total_neto", label: "Neto", align: "right" },
          { key: "afp_patronal", label: "AFP Pat.", align: "right" },
          { key: "sfs_patronal", label: "SFS Pat.", align: "right" },
          { key: "srl_patronal", label: "SRL Pat.", align: "right" },
        ],
        data: rows,
        totals: {
          nombre: `TOTAL (${rows.length})`,
          subtotal_devengado: sumField("subtotal_devengado"),
          afp_monto: sumField("afp_monto"),
          sfs_monto: sumField("sfs_monto"),
          isr_monto: sumField("isr_monto"),
          deduccion_prestamos: sumField("deduccion_prestamos"),
          total_deducciones: sumField("total_deducciones"),
          total_neto: sumField("total_neto"),
          afp_patronal: sumField("afp_patronal"),
          sfs_patronal: sumField("sfs_patronal"),
          srl_patronal: sumField("srl_patronal"),
        },
        periodo: q
          ? `${formatDate(q.periodo_inicio)} - ${formatDate(q.periodo_fin)}`
          : "",
        subtitle: q?.descripcion || undefined,
      };
    }

    case "resumen_nominas_periodo": {
      let query = supabase
        .from("quincenas")
        .select("id, periodo_inicio, periodo_fin, estado, descripcion, fecha_pago")
        .order("periodo_inicio", { ascending: true });

      if (filters.fechaDesde) query = query.gte("periodo_inicio", filters.fechaDesde);
      if (filters.fechaHasta) query = query.lte("periodo_fin", filters.fechaHasta);

      const { data: qs, error: qErr } = await query;
      if (qErr) throw qErr;

      if (!qs || qs.length === 0) throw new Error("No hay quincenas en el período seleccionado");

      const results: Record<string, unknown>[] = [];
      for (const q of qs) {
        const { data: items } = await supabase
          .from("nomina_items")
          .select("*, empleado:empleados(nombre, apellido, numero_empleado, departamento)")
          .eq("quincena_id", q.id);

        const totalDev = (items || []).reduce((s, i) => s + (i.subtotal_devengado || 0), 0);
        const totalDed = (items || []).reduce((s, i) => s + (i.total_deducciones || 0), 0);
        const totalNet = (items || []).reduce((s, i) => s + (i.total_neto || 0), 0);
        const totalAFPPat = (items || []).reduce((s, i) => s + (i.afp_patronal_monto || 0), 0);
        const totalSFSPat = (items || []).reduce((s, i) => s + (i.sfs_patronal_monto || 0), 0);
        const totalSRLPat = (items || []).reduce((s, i) => s + (i.srl_patronal_monto || 0), 0);
        const count = (items || []).length;

        // Build detail rows for each employee in this quincena
        const detailRows = (items || []).map((ni) => {
          const emp = unwrap<{ nombre: string; apellido: string; numero_empleado: string; departamento: string | null }>(ni.empleado);
          return {
            nombre: emp ? `${emp.apellido}, ${emp.nombre}` : "—",
            numero_empleado: emp?.numero_empleado || "",
            departamento: emp?.departamento || "",
            devengado: ni.subtotal_devengado,
            afp: ni.afp_monto,
            sfs: ni.sfs_monto,
            isr: ni.isr_monto,
            prestamos: ni.deduccion_prestamos || 0,
            deducciones: ni.total_deducciones,
            neto: ni.total_neto,
          };
        });

        results.push({
          quincena_id: q.id,
          periodo: `${formatDate(q.periodo_inicio)} - ${formatDate(q.periodo_fin)}`,
          descripcion: q.descripcion || "",
          estado: q.estado,
          empleados: count,
          total_devengado: totalDev,
          total_deducciones: totalDed,
          total_neto: totalNet,
          costo_patronal: totalAFPPat + totalSFSPat + totalSRLPat,
          _detailRows: detailRows,
        });
      }

      const grandDev = results.reduce((s, r) => s + (Number(r.total_devengado) || 0), 0);
      const grandDed = results.reduce((s, r) => s + (Number(r.total_deducciones) || 0), 0);
      const grandNet = results.reduce((s, r) => s + (Number(r.total_neto) || 0), 0);
      const grandPat = results.reduce((s, r) => s + (Number(r.costo_patronal) || 0), 0);

      return {
        columns: [
          { key: "periodo", label: "Período" },
          { key: "descripcion", label: "Descripción" },
          { key: "estado", label: "Estado", align: "center" },
          { key: "empleados", label: "Empleados", align: "right" },
          { key: "total_devengado", label: "Devengado", align: "right" },
          { key: "total_deducciones", label: "Deducciones", align: "right" },
          { key: "total_neto", label: "Neto", align: "right" },
          { key: "costo_patronal", label: "Costo Patronal", align: "right" },
        ],
        data: results,
        totals: {
          periodo: `TOTAL (${results.length} quincenas)`,
          total_devengado: grandDev,
          total_deducciones: grandDed,
          total_neto: grandNet,
          costo_patronal: grandPat,
        },
        periodo: filters.fechaDesde && filters.fechaHasta
          ? `${formatDate(filters.fechaDesde)} - ${formatDate(filters.fechaHasta)}`
          : "Todas las quincenas",
      };
    }

    case "comparativo_nominas": {
      if (!filters.quincenaId || !filters.quincenaCompareId)
        throw new Error("Seleccione ambas quincenas para comparar");

      const [qA, qB] = await Promise.all([
        supabase.from("quincenas").select("*").eq("id", filters.quincenaId).single(),
        supabase.from("quincenas").select("*").eq("id", filters.quincenaCompareId).single(),
      ]);

      const [itemsA, itemsB] = await Promise.all([
        supabase
          .from("nomina_items")
          .select("empleado_id, subtotal_devengado, total_deducciones, total_neto, empleado:empleados(nombre, apellido, numero_empleado)")
          .eq("quincena_id", filters.quincenaId),
        supabase
          .from("nomina_items")
          .select("empleado_id, subtotal_devengado, total_deducciones, total_neto, empleado:empleados(nombre, apellido, numero_empleado)")
          .eq("quincena_id", filters.quincenaCompareId),
      ]);

      const mapA = new Map<string, { dev: number; ded: number; net: number }>();
      const mapB = new Map<string, { dev: number; ded: number; net: number }>();
      const empNames = new Map<string, { nombre: string; num: string }>();

      for (const it of itemsA.data || []) {
        mapA.set(it.empleado_id, {
          dev: it.subtotal_devengado || 0,
          ded: it.total_deducciones || 0,
          net: it.total_neto || 0,
        });
        const emp = unwrap<{ nombre: string; apellido: string; numero_empleado: string }>(it.empleado);
        if (emp) empNames.set(it.empleado_id, { nombre: `${emp.nombre} ${emp.apellido}`, num: emp.numero_empleado });
      }
      for (const it of itemsB.data || []) {
        mapB.set(it.empleado_id, {
          dev: it.subtotal_devengado || 0,
          ded: it.total_deducciones || 0,
          net: it.total_neto || 0,
        });
        const emp = unwrap<{ nombre: string; apellido: string; numero_empleado: string }>(it.empleado);
        if (emp && !empNames.has(it.empleado_id))
          empNames.set(it.empleado_id, { nombre: `${emp.nombre} ${emp.apellido}`, num: emp.numero_empleado });
      }

      const allIds = [...new Set([...mapA.keys(), ...mapB.keys()])];
      const rows = allIds.map((id) => {
        const a = mapA.get(id) || { dev: 0, ded: 0, net: 0 };
        const b = mapB.get(id) || { dev: 0, ded: 0, net: 0 };
        const info = empNames.get(id);
        return {
          numero_empleado: info?.num || "",
          nombre: info?.nombre || "",
          dev_a: a.dev,
          dev_b: b.dev,
          diff_dev: a.dev - b.dev,
          net_a: a.net,
          net_b: b.net,
          diff_net: a.net - b.net,
        };
      });

      const labelA = qA.data?.descripcion || "Período A";
      const labelB = qB.data?.descripcion || "Período B";

      return {
        columns: [
          { key: "numero_empleado", label: "No. Emp" },
          { key: "nombre", label: "Nombre" },
          { key: "dev_a", label: `Dev. ${labelA}`, align: "right" },
          { key: "dev_b", label: `Dev. ${labelB}`, align: "right" },
          { key: "diff_dev", label: "Dif. Dev.", align: "right" },
          { key: "net_a", label: `Neto ${labelA}`, align: "right" },
          { key: "net_b", label: `Neto ${labelB}`, align: "right" },
          { key: "diff_net", label: "Dif. Neto", align: "right" },
        ],
        data: rows,
        totals: {
          nombre: "TOTAL",
          dev_a: rows.reduce((s, r) => s + r.dev_a, 0),
          dev_b: rows.reduce((s, r) => s + r.dev_b, 0),
          diff_dev: rows.reduce((s, r) => s + r.diff_dev, 0),
          net_a: rows.reduce((s, r) => s + r.net_a, 0),
          net_b: rows.reduce((s, r) => s + r.net_b, 0),
          diff_net: rows.reduce((s, r) => s + r.diff_net, 0),
        },
        subtitle: `${labelA} vs ${labelB}`,
      };
    }

    case "horas_extra_periodo": {
      if (!filters.quincenaId) throw new Error("Seleccione una quincena");

      const { data: q } = await supabase
        .from("quincenas")
        .select("*")
        .eq("id", filters.quincenaId)
        .single();

      const { data: items, error } = await supabase
        .from("nomina_items")
        .select("*, empleado:empleados(nombre, apellido, numero_empleado, departamento)")
        .eq("quincena_id", filters.quincenaId);
      if (error) throw error;

      let rows = (items || [])
        .filter(
          (ni) =>
            (ni.horas_extras_diurnas || 0) > 0 ||
            (ni.horas_extras_nocturnas || 0) > 0 ||
            (ni.horas_extras_feriados || 0) > 0
        )
        .map((ni) => {
          const emp = unwrap<{
            nombre: string;
            apellido: string;
            numero_empleado: string;
            departamento: string | null;
          }>(ni.empleado);
          const hed = ni.horas_extras_diurnas || 0;
          const hen = ni.horas_extras_nocturnas || 0;
          const hef = ni.horas_extras_feriados || 0;
          return {
            numero_empleado: emp?.numero_empleado || "",
            nombre: emp ? `${emp.nombre} ${emp.apellido}` : "",
            departamento: emp?.departamento || "",
            horas_extras_diurnas: hed,
            horas_extras_nocturnas: hen,
            horas_extras_feriados: hef,
            total_horas_extra: hed + hen + hef,
          };
        });

      if (filters.departamento) {
        rows = rows.filter((r) => r.departamento === filters.departamento);
      }

      return {
        columns: [
          { key: "numero_empleado", label: "No. Emp" },
          { key: "nombre", label: "Nombre" },
          { key: "departamento", label: "Depto." },
          { key: "horas_extras_diurnas", label: "HE Diurnas", align: "right" },
          { key: "horas_extras_nocturnas", label: "HE Nocturnas", align: "right" },
          { key: "horas_extras_feriados", label: "HE Feriados", align: "right" },
          { key: "total_horas_extra", label: "Total HE", align: "right" },
        ],
        data: rows,
        totals: {
          nombre: `TOTAL (${rows.length})`,
          horas_extras_diurnas: rows.reduce((s, r) => s + r.horas_extras_diurnas, 0),
          horas_extras_nocturnas: rows.reduce((s, r) => s + r.horas_extras_nocturnas, 0),
          horas_extras_feriados: rows.reduce((s, r) => s + r.horas_extras_feriados, 0),
          total_horas_extra: rows.reduce((s, r) => s + r.total_horas_extra, 0),
        },
        periodo: q
          ? `${formatDate(q.periodo_inicio)} - ${formatDate(q.periodo_fin)}`
          : "",
      };
    }

    case "historico_sueldos": {
      if (!filters.empleadoId) throw new Error("Seleccione un empleado");

      const { data: emp } = await supabase
        .from("empleados")
        .select("nombre, apellido, numero_empleado")
        .eq("id", filters.empleadoId)
        .single();

      let query = supabase
        .from("nomina_items")
        .select("quincena_id, subtotal_devengado, total_deducciones, total_neto, horas_base, horas_extras_diurnas, horas_extras_nocturnas, horas_extras_feriados, quincena:quincenas(periodo_inicio, periodo_fin, descripcion)")
        .eq("empleado_id", filters.empleadoId)
        .order("created_at", { ascending: true });

      const { data: items, error } = await query;
      if (error) throw error;

      const rows = (items || []).map((ni) => {
        const q = unwrap<{ periodo_inicio: string; periodo_fin: string; descripcion: string | null }>(ni.quincena);
        return {
          periodo: q ? `${formatDate(q.periodo_inicio)} - ${formatDate(q.periodo_fin)}` : "",
          descripcion: q?.descripcion || "",
          horas_base: ni.horas_base,
          subtotal_devengado: ni.subtotal_devengado,
          total_deducciones: ni.total_deducciones,
          total_neto: ni.total_neto,
        };
      });

      return {
        columns: [
          { key: "periodo", label: "Período" },
          { key: "descripcion", label: "Descripción" },
          { key: "horas_base", label: "Hrs Base", align: "right" },
          { key: "subtotal_devengado", label: "Devengado", align: "right" },
          { key: "total_deducciones", label: "Deducciones", align: "right" },
          { key: "total_neto", label: "Neto", align: "right" },
        ],
        data: rows,
        subtitle: emp ? `${emp.numero_empleado} - ${emp.nombre} ${emp.apellido}` : "",
        periodo: filters.fechaDesde && filters.fechaHasta
          ? `${formatDate(filters.fechaDesde)} - ${formatDate(filters.fechaHasta)}`
          : "Todo el historial",
      };
    }

    // =====================================================================
    // PRESTAMOS
    // =====================================================================
    case "prestamos_activos": {
      const { data: prests, error } = await supabase
        .from("prestamos")
        .select("*, empleado:empleados(nombre, apellido, numero_empleado)")
        .eq("estado", "activo")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const rows = (prests || []).map((p) => {
        const emp = unwrap<{ nombre: string; apellido: string; numero_empleado: string }>(p.empleado);
        return {
          numero_empleado: emp?.numero_empleado || "",
          nombre: emp ? `${emp.nombre} ${emp.apellido}` : "",
          monto_total: p.monto_total,
          cuota_quincenal: p.cuota_quincenal,
          saldo_pendiente: p.saldo_pendiente,
          cuotas_pagadas: p.numero_cuotas_pagadas,
          cuotas_estimadas: p.numero_cuotas_estimado || 0,
          fecha_inicio: p.fecha_inicio ? formatDate(p.fecha_inicio) : "",
          notas: p.notas || "",
        };
      });

      const totalMonto = rows.reduce((s, r) => s + (Number(r.monto_total) || 0), 0);
      const totalSaldo = rows.reduce((s, r) => s + (Number(r.saldo_pendiente) || 0), 0);
      const totalCuota = rows.reduce((s, r) => s + (Number(r.cuota_quincenal) || 0), 0);

      return {
        columns: [
          { key: "numero_empleado", label: "No. Emp" },
          { key: "nombre", label: "Nombre" },
          { key: "monto_total", label: "Monto Total", align: "right" },
          { key: "cuota_quincenal", label: "Cuota Quinc.", align: "right" },
          { key: "saldo_pendiente", label: "Saldo Pend.", align: "right" },
          { key: "cuotas_pagadas", label: "Cuotas Pag.", align: "right" },
          { key: "cuotas_estimadas", label: "Cuotas Est.", align: "right" },
          { key: "fecha_inicio", label: "Inicio" },
          { key: "notas", label: "Notas" },
        ],
        data: rows,
        totals: {
          nombre: `TOTAL (${rows.length} préstamos)`,
          monto_total: totalMonto,
          cuota_quincenal: totalCuota,
          saldo_pendiente: totalSaldo,
        },
      };
    }

    case "historial_prestamos": {
      let query = supabase
        .from("prestamos")
        .select("*, empleado:empleados(nombre, apellido, numero_empleado)")
        .order("created_at", { ascending: false });

      if (filters.estado) query = query.eq("estado", filters.estado);

      const { data: prests, error } = await query;
      if (error) throw error;

      const rows = (prests || []).map((p) => {
        const emp = unwrap<{ nombre: string; apellido: string; numero_empleado: string }>(p.empleado);
        return {
          numero_empleado: emp?.numero_empleado || "",
          nombre: emp ? `${emp.nombre} ${emp.apellido}` : "",
          estado: p.estado,
          monto_total: p.monto_total,
          cuota_quincenal: p.cuota_quincenal,
          saldo_pendiente: p.saldo_pendiente,
          cuotas_pagadas: p.numero_cuotas_pagadas,
          cuotas_estimadas: p.numero_cuotas_estimado || 0,
          fecha_inicio: p.fecha_inicio ? formatDate(p.fecha_inicio) : "",
        };
      });

      const totalMonto = rows.reduce((s, r) => s + (Number(r.monto_total) || 0), 0);
      const totalSaldo = rows.reduce((s, r) => s + (Number(r.saldo_pendiente) || 0), 0);

      return {
        columns: [
          { key: "numero_empleado", label: "No. Emp" },
          { key: "nombre", label: "Nombre" },
          { key: "estado", label: "Estado", align: "center" },
          { key: "monto_total", label: "Monto Total", align: "right" },
          { key: "cuota_quincenal", label: "Cuota Quinc.", align: "right" },
          { key: "saldo_pendiente", label: "Saldo Pend.", align: "right" },
          { key: "cuotas_pagadas", label: "Cuotas Pag.", align: "right" },
          { key: "cuotas_estimadas", label: "Cuotas Est.", align: "right" },
          { key: "fecha_inicio", label: "Inicio" },
        ],
        data: rows,
        totals: {
          nombre: `TOTAL (${rows.length})`,
          monto_total: totalMonto,
          saldo_pendiente: totalSaldo,
        },
        subtitle: filters.estado ? `Estado: ${filters.estado}` : "Todos los estados",
      };
    }

    case "prestamos_empleado": {
      if (!filters.empleadoId) throw new Error("Seleccione un empleado");

      const { data: emp } = await supabase
        .from("empleados")
        .select("nombre, apellido, numero_empleado")
        .eq("id", filters.empleadoId)
        .single();

      const { data: prests, error } = await supabase
        .from("prestamos")
        .select("*")
        .eq("empleado_id", filters.empleadoId)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const rows = (prests || []).map((p) => ({
        estado: p.estado,
        monto_total: p.monto_total,
        cuota_quincenal: p.cuota_quincenal,
        saldo_pendiente: p.saldo_pendiente,
        cuotas_pagadas: p.numero_cuotas_pagadas,
        cuotas_estimadas: p.numero_cuotas_estimado || 0,
        fecha_inicio: p.fecha_inicio ? formatDate(p.fecha_inicio) : "",
        notas: p.notas || "",
      }));

      const totalMonto = rows.reduce((s, r) => s + (Number(r.monto_total) || 0), 0);
      const totalSaldo = rows.reduce((s, r) => s + (Number(r.saldo_pendiente) || 0), 0);

      return {
        columns: [
          { key: "estado", label: "Estado", align: "center" },
          { key: "monto_total", label: "Monto Total", align: "right" },
          { key: "cuota_quincenal", label: "Cuota Quinc.", align: "right" },
          { key: "saldo_pendiente", label: "Saldo Pend.", align: "right" },
          { key: "cuotas_pagadas", label: "Cuotas Pag.", align: "right" },
          { key: "cuotas_estimadas", label: "Cuotas Est.", align: "right" },
          { key: "fecha_inicio", label: "Inicio" },
          { key: "notas", label: "Notas" },
        ],
        data: rows,
        totals: {
          estado: `TOTAL (${rows.length})`,
          monto_total: totalMonto,
          saldo_pendiente: totalSaldo,
        },
        subtitle: emp ? `${emp.numero_empleado} - ${emp.nombre} ${emp.apellido}` : "",
      };
    }

    // =====================================================================
    // DEDUCCIONES Y TSS
    // =====================================================================
    case "tss_mensual": {
      let query = supabase
        .from("quincenas")
        .select("id, periodo_inicio, periodo_fin, descripcion")
        .order("periodo_inicio", { ascending: true });

      if (filters.fechaDesde) query = query.gte("periodo_inicio", filters.fechaDesde);
      if (filters.fechaHasta) query = query.lte("periodo_fin", filters.fechaHasta);

      const { data: qs, error: qErr } = await query;
      if (qErr) throw qErr;
      if (!qs || qs.length === 0) throw new Error("No hay quincenas en el período seleccionado");

      const qIds = qs.map((q) => q.id);
      const { data: items, error: iErr } = await supabase
        .from("nomina_items")
        .select("empleado_id, quincena_id, subtotal_devengado, aporte_afp_empleado, aporte_sfs_empleado")
        .in("quincena_id", qIds);
      if (iErr) throw iErr;

      // Also need employee info
      const empIds = [...new Set((items || []).map((i) => i.empleado_id))];
      const { data: emps } = await supabase
        .from("empleados")
        .select("id, nombre, apellido, numero_empleado, cedula")
        .in("id", empIds);

      const empMap = new Map<string, { nombre: string; num: string; cedula: string }>();
      for (const e of emps || []) {
        empMap.set(e.id, {
          nombre: `${e.nombre} ${e.apellido}`,
          num: e.numero_empleado,
          cedula: e.cedula || "",
        });
      }

      // Aggregate per employee
      const aggMap = new Map<
        string,
        { dev: number; afpEmp: number; sfsEmp: number }
      >();
      for (const it of items || []) {
        const prev = aggMap.get(it.empleado_id) || { dev: 0, afpEmp: 0, sfsEmp: 0 };
        prev.dev += it.subtotal_devengado || 0;
        prev.afpEmp += it.aporte_afp_empleado || 0;
        prev.sfsEmp += it.aporte_sfs_empleado || 0;
        aggMap.set(it.empleado_id, prev);
      }

      const rows = [...aggMap.entries()].map(([id, agg]) => {
        const info = empMap.get(id);
        const afpPatronal = agg.dev * TSS.AFP_PATRONAL;
        const sfsPatronal = agg.dev * TSS.SFS_PATRONAL;
        const srlPatronal = agg.dev * TSS.SRL_PATRONAL;
        return {
          numero_empleado: info?.num || "",
          cedula: info?.cedula || "",
          nombre: info?.nombre || "",
          salario_cotizable: agg.dev,
          afp_empleado: agg.afpEmp,
          afp_patronal: afpPatronal,
          sfs_empleado: agg.sfsEmp,
          sfs_patronal: sfsPatronal,
          srl_patronal: srlPatronal,
          total_empleado: agg.afpEmp + agg.sfsEmp,
          total_patronal: afpPatronal + sfsPatronal + srlPatronal,
        };
      });

      const sumF = (f: string) => rows.reduce((s, r) => s + (Number((r as Record<string, unknown>)[f]) || 0), 0);

      return {
        columns: [
          { key: "numero_empleado", label: "No. Emp" },
          { key: "cedula", label: "Cédula" },
          { key: "nombre", label: "Nombre" },
          { key: "salario_cotizable", label: "Sal. Cotizable", align: "right" },
          { key: "afp_empleado", label: "AFP Emp.", align: "right" },
          { key: "afp_patronal", label: "AFP Patr.", align: "right" },
          { key: "sfs_empleado", label: "SFS Emp.", align: "right" },
          { key: "sfs_patronal", label: "SFS Patr.", align: "right" },
          { key: "srl_patronal", label: "SRL Patr.", align: "right" },
          { key: "total_empleado", label: "Total Emp.", align: "right" },
          { key: "total_patronal", label: "Total Patr.", align: "right" },
        ],
        data: rows,
        totals: {
          nombre: `TOTAL (${rows.length})`,
          salario_cotizable: sumF("salario_cotizable"),
          afp_empleado: sumF("afp_empleado"),
          afp_patronal: sumF("afp_patronal"),
          sfs_empleado: sumF("sfs_empleado"),
          sfs_patronal: sumF("sfs_patronal"),
          srl_patronal: sumF("srl_patronal"),
          total_empleado: sumF("total_empleado"),
          total_patronal: sumF("total_patronal"),
        },
        subtitle: "Aportes a la Tesorería de Seguridad Social",
        periodo: filters.fechaDesde && filters.fechaHasta
          ? `${formatDate(filters.fechaDesde)} - ${formatDate(filters.fechaHasta)}`
          : "Período seleccionado",
      };
    }

    case "costo_patronal": {
      let query = supabase
        .from("quincenas")
        .select("id, periodo_inicio, periodo_fin, descripcion")
        .order("periodo_inicio", { ascending: true });

      if (filters.fechaDesde) query = query.gte("periodo_inicio", filters.fechaDesde);
      if (filters.fechaHasta) query = query.lte("periodo_fin", filters.fechaHasta);

      const { data: qs, error: qErr } = await query;
      if (qErr) throw qErr;
      if (!qs || qs.length === 0) throw new Error("No hay quincenas en el período seleccionado");

      const results: Record<string, unknown>[] = [];
      for (const q of qs) {
        const { data: items } = await supabase
          .from("nomina_items")
          .select("subtotal_devengado")
          .eq("quincena_id", q.id);

        const totalDev = (items || []).reduce((s, i) => s + (i.subtotal_devengado || 0), 0);
        const afp = totalDev * TSS.AFP_PATRONAL;
        const sfs = totalDev * TSS.SFS_PATRONAL;
        const srl = totalDev * TSS.SRL_PATRONAL;

        results.push({
          periodo: `${formatDate(q.periodo_inicio)} - ${formatDate(q.periodo_fin)}`,
          descripcion: q.descripcion || "",
          total_devengado: totalDev,
          afp_patronal: afp,
          sfs_patronal: sfs,
          srl_patronal: srl,
          total_patronal: afp + sfs + srl,
          costo_total: totalDev + afp + sfs + srl,
        });
      }

      const sumF = (f: string) => results.reduce((s, r) => s + (Number(r[f]) || 0), 0);

      return {
        columns: [
          { key: "periodo", label: "Período" },
          { key: "descripcion", label: "Descripción" },
          { key: "total_devengado", label: "Devengado", align: "right" },
          { key: "afp_patronal", label: "AFP Patr.", align: "right" },
          { key: "sfs_patronal", label: "SFS Patr.", align: "right" },
          { key: "srl_patronal", label: "SRL Patr.", align: "right" },
          { key: "total_patronal", label: "Total Patr.", align: "right" },
          { key: "costo_total", label: "Costo Total", align: "right" },
        ],
        data: results,
        totals: {
          periodo: `TOTAL (${results.length} quincenas)`,
          total_devengado: sumF("total_devengado"),
          afp_patronal: sumF("afp_patronal"),
          sfs_patronal: sumF("sfs_patronal"),
          srl_patronal: sumF("srl_patronal"),
          total_patronal: sumF("total_patronal"),
          costo_total: sumF("costo_total"),
        },
        subtitle: "Contribuciones Patronales",
        periodo: filters.fechaDesde && filters.fechaHasta
          ? `${formatDate(filters.fechaDesde)} - ${formatDate(filters.fechaHasta)}`
          : "Todas las quincenas",
      };
    }

    case "resumen_deducciones": {
      if (!filters.quincenaId) throw new Error("Seleccione una quincena");

      const { data: q } = await supabase
        .from("quincenas")
        .select("*")
        .eq("id", filters.quincenaId)
        .single();

      const { data: items, error } = await supabase
        .from("nomina_items")
        .select("*, empleado:empleados(nombre, apellido, numero_empleado)")
        .eq("quincena_id", filters.quincenaId);
      if (error) throw error;

      const rows = (items || []).map((ni) => {
        const emp = unwrap<{ nombre: string; apellido: string; numero_empleado: string }>(ni.empleado);
        return {
          numero_empleado: emp?.numero_empleado || "",
          nombre: emp ? `${emp.nombre} ${emp.apellido}` : "",
          subtotal_devengado: ni.subtotal_devengado,
          afp_monto: ni.afp_monto,
          sfs_monto: ni.sfs_monto,
          isr_monto: ni.isr_monto,
          deduccion_prestamos: ni.deduccion_prestamos || 0,
          total_deducciones: ni.total_deducciones,
          total_neto: ni.total_neto,
        };
      });

      const sumF = (f: string) => rows.reduce((s, r) => s + (Number((r as Record<string, unknown>)[f]) || 0), 0);

      return {
        columns: [
          { key: "numero_empleado", label: "No. Emp" },
          { key: "nombre", label: "Nombre" },
          { key: "subtotal_devengado", label: "Devengado", align: "right" },
          { key: "afp_monto", label: "AFP", align: "right" },
          { key: "sfs_monto", label: "SFS", align: "right" },
          { key: "isr_monto", label: "ISR", align: "right" },
          { key: "deduccion_prestamos", label: "Préstamo", align: "right" },
          { key: "total_deducciones", label: "Total Ded.", align: "right" },
          { key: "total_neto", label: "Neto", align: "right" },
        ],
        data: rows,
        totals: {
          nombre: `TOTAL (${rows.length})`,
          subtotal_devengado: sumF("subtotal_devengado"),
          afp_monto: sumF("afp_monto"),
          sfs_monto: sumF("sfs_monto"),
          isr_monto: sumF("isr_monto"),
          deduccion_prestamos: sumF("deduccion_prestamos"),
          total_deducciones: sumF("total_deducciones"),
          total_neto: sumF("total_neto"),
        },
        periodo: q
          ? `${formatDate(q.periodo_inicio)} - ${formatDate(q.periodo_fin)}`
          : "",
        subtitle: q?.descripcion || "Resumen de Deducciones",
      };
    }

    // =====================================================================
    // VACACIONES Y LIQUIDACIONES
    // =====================================================================
    case "vacaciones_resumen": {
      let query = supabase
        .from("empleados")
        .select("*")
        .eq("estado", "activo")
        .order("apellido");
      if (filters.departamento)
        query = query.eq("departamento", filters.departamento);

      const { data: emps, error } = await query;
      if (error) throw error;

      const rows = (emps || []).map((e) => {
        const acum = e.dias_vacaciones_acumulados || 0;
        const tom = e.dias_vacaciones_tomados || 0;
        return {
          numero_empleado: e.numero_empleado,
          nombre: `${e.nombre} ${e.apellido}`,
          departamento: e.departamento || "",
          fecha_ingreso: e.fecha_ingreso ? formatDate(e.fecha_ingreso) : "",
          dias_acumulados: acum,
          dias_tomados: tom,
          dias_disponibles: acum - tom,
        };
      });

      return {
        columns: [
          { key: "numero_empleado", label: "No. Emp" },
          { key: "nombre", label: "Nombre" },
          { key: "departamento", label: "Depto." },
          { key: "fecha_ingreso", label: "Ingreso" },
          { key: "dias_acumulados", label: "Acumulados", align: "right" },
          { key: "dias_tomados", label: "Tomados", align: "right" },
          { key: "dias_disponibles", label: "Disponibles", align: "right" },
        ],
        data: rows,
        totals: {
          nombre: `TOTAL (${rows.length})`,
          dias_acumulados: rows.reduce((s, r) => s + r.dias_acumulados, 0),
          dias_tomados: rows.reduce((s, r) => s + r.dias_tomados, 0),
          dias_disponibles: rows.reduce((s, r) => s + r.dias_disponibles, 0),
        },
        subtitle: filters.departamento
          ? `Departamento: ${filters.departamento}`
          : "Todos los departamentos",
      };
    }

    case "liquidaciones_procesadas": {
      let query = supabase
        .from("liquidaciones")
        .select("*, empleado:empleados(nombre, apellido, numero_empleado)")
        .order("fecha_salida", { ascending: false });

      if (filters.fechaDesde) query = query.gte("fecha_salida", filters.fechaDesde);
      if (filters.fechaHasta) query = query.lte("fecha_salida", filters.fechaHasta);

      const { data: liqs, error } = await query;
      if (error) throw error;

      const rows = (liqs || []).map((l) => {
        const emp = unwrap<{ nombre: string; apellido: string; numero_empleado: string }>(l.empleado);
        return {
          numero_empleado: emp?.numero_empleado || "",
          nombre: emp ? `${emp.nombre} ${emp.apellido}` : "",
          fecha_salida: l.fecha_salida ? formatDate(l.fecha_salida) : "",
          motivo: l.motivo || "",
          estado: l.estado,
          monto_preaviso: l.monto_preaviso || 0,
          monto_cesantia: l.monto_cesantia || 0,
          monto_vacaciones: l.monto_vacaciones || 0,
          monto_regalia: l.monto_regalia || 0,
          monto_salarios_pendientes: l.monto_salarios_pendientes || 0,
          total_liquidacion: l.total_liquidacion || 0,
        };
      });

      const sumF = (f: string) => rows.reduce((s, r) => s + (Number((r as Record<string, unknown>)[f]) || 0), 0);

      return {
        columns: [
          { key: "numero_empleado", label: "No. Emp" },
          { key: "nombre", label: "Nombre" },
          { key: "fecha_salida", label: "Fecha Salida" },
          { key: "motivo", label: "Motivo" },
          { key: "estado", label: "Estado", align: "center" },
          { key: "monto_preaviso", label: "Preaviso", align: "right" },
          { key: "monto_cesantia", label: "Cesantía", align: "right" },
          { key: "monto_vacaciones", label: "Vacaciones", align: "right" },
          { key: "monto_regalia", label: "Regalía", align: "right" },
          { key: "monto_salarios_pendientes", label: "Sal. Pend.", align: "right" },
          { key: "total_liquidacion", label: "Total", align: "right" },
        ],
        data: rows,
        totals: {
          nombre: `TOTAL (${rows.length})`,
          monto_preaviso: sumF("monto_preaviso"),
          monto_cesantia: sumF("monto_cesantia"),
          monto_vacaciones: sumF("monto_vacaciones"),
          monto_regalia: sumF("monto_regalia"),
          monto_salarios_pendientes: sumF("monto_salarios_pendientes"),
          total_liquidacion: sumF("total_liquidacion"),
        },
        subtitle: "Liquidaciones de Personal",
        periodo: filters.fechaDesde && filters.fechaHasta
          ? `${formatDate(filters.fechaDesde)} - ${formatDate(filters.fechaHasta)}`
          : "Todas las liquidaciones",
      };
    }

    // =====================================================================
    // RESUMENES GERENCIALES
    // =====================================================================
    case "resumen_ejecutivo": {
      if (!filters.quincenaId) throw new Error("Seleccione una quincena");

      const { data: q } = await supabase
        .from("quincenas")
        .select("*")
        .eq("id", filters.quincenaId)
        .single();

      const { data: items, error } = await supabase
        .from("nomina_items")
        .select("subtotal_devengado, total_deducciones, total_neto, afp_monto, sfs_monto, isr_monto, deduccion_prestamos, horas_extras_diurnas, horas_extras_nocturnas, horas_extras_feriados")
        .eq("quincena_id", filters.quincenaId);
      if (error) throw error;

      const data = items || [];
      const totalDev = data.reduce((s, i) => s + (i.subtotal_devengado || 0), 0);
      const totalDed = data.reduce((s, i) => s + (i.total_deducciones || 0), 0);
      const totalNet = data.reduce((s, i) => s + (i.total_neto || 0), 0);
      const totalAFP = data.reduce((s, i) => s + (i.afp_monto || 0), 0);
      const totalSFS = data.reduce((s, i) => s + (i.sfs_monto || 0), 0);
      const totalISR = data.reduce((s, i) => s + (i.isr_monto || 0), 0);
      const totalPrest = data.reduce((s, i) => s + (i.deduccion_prestamos || 0), 0);
      const totalHE = data.reduce(
        (s, i) =>
          s +
          (i.horas_extras_diurnas || 0) +
          (i.horas_extras_nocturnas || 0) +
          (i.horas_extras_feriados || 0),
        0
      );

      const afpPatronal = totalDev * TSS.AFP_PATRONAL;
      const sfsPatronal = totalDev * TSS.SFS_PATRONAL;
      const srlPatronal = totalDev * TSS.SRL_PATRONAL;
      const costoPatronal = afpPatronal + sfsPatronal + srlPatronal;

      const rows = [
        { concepto: "Total Empleados en Nómina", valor: data.length },
        { concepto: "Total Devengado", valor: totalDev },
        { concepto: "Total Horas Extra", valor: totalHE },
        { concepto: "AFP Empleados", valor: totalAFP },
        { concepto: "SFS Empleados", valor: totalSFS },
        { concepto: "ISR", valor: totalISR },
        { concepto: "Descuento Préstamos", valor: totalPrest },
        { concepto: "Total Deducciones", valor: totalDed },
        { concepto: "Total Neto a Pagar", valor: totalNet },
        { concepto: "AFP Patronal", valor: afpPatronal },
        { concepto: "SFS Patronal", valor: sfsPatronal },
        { concepto: "SRL Patronal", valor: srlPatronal },
        { concepto: "Total Costo Patronal", valor: costoPatronal },
        { concepto: "COSTO TOTAL EMPRESA", valor: totalDev + costoPatronal },
      ];

      return {
        columns: [
          { key: "concepto", label: "Concepto" },
          { key: "valor", label: "Valor", align: "right" },
        ],
        data: rows,
        periodo: q
          ? `${formatDate(q.periodo_inicio)} - ${formatDate(q.periodo_fin)}`
          : "",
        subtitle: q?.descripcion || "Resumen Ejecutivo",
      };
    }

    case "costo_total_empleado": {
      if (!filters.quincenaId) throw new Error("Seleccione una quincena");

      const { data: q } = await supabase
        .from("quincenas")
        .select("*")
        .eq("id", filters.quincenaId)
        .single();

      const { data: items, error } = await supabase
        .from("nomina_items")
        .select("*, empleado:empleados(nombre, apellido, numero_empleado, departamento)")
        .eq("quincena_id", filters.quincenaId);
      if (error) throw error;

      const rows = (items || []).map((ni) => {
        const emp = unwrap<{
          nombre: string;
          apellido: string;
          numero_empleado: string;
          departamento: string | null;
        }>(ni.empleado);
        const dev = ni.subtotal_devengado || 0;
        const afpP = dev * TSS.AFP_PATRONAL;
        const sfsP = dev * TSS.SFS_PATRONAL;
        const srlP = dev * TSS.SRL_PATRONAL;
        const costoP = afpP + sfsP + srlP;
        return {
          numero_empleado: emp?.numero_empleado || "",
          nombre: emp ? `${emp.nombre} ${emp.apellido}` : "",
          departamento: emp?.departamento || "",
          subtotal_devengado: dev,
          costo_patronal: costoP,
          costo_total: dev + costoP,
        };
      });

      const sumF = (f: string) => rows.reduce((s, r) => s + (Number((r as Record<string, unknown>)[f]) || 0), 0);

      return {
        columns: [
          { key: "numero_empleado", label: "No. Emp" },
          { key: "nombre", label: "Nombre" },
          { key: "departamento", label: "Depto." },
          { key: "subtotal_devengado", label: "Devengado", align: "right" },
          { key: "costo_patronal", label: "Costo Patronal", align: "right" },
          { key: "costo_total", label: "Costo Total", align: "right" },
        ],
        data: rows,
        totals: {
          nombre: `TOTAL (${rows.length})`,
          subtotal_devengado: sumF("subtotal_devengado"),
          costo_patronal: sumF("costo_patronal"),
          costo_total: sumF("costo_total"),
        },
        periodo: q
          ? `${formatDate(q.periodo_inicio)} - ${formatDate(q.periodo_fin)}`
          : "",
        subtitle: q?.descripcion || "Costo Total por Empleado",
      };
    }

    case "gastos_departamento": {
      if (!filters.quincenaId) throw new Error("Seleccione una quincena");

      const { data: q } = await supabase
        .from("quincenas")
        .select("*")
        .eq("id", filters.quincenaId)
        .single();

      const { data: items, error } = await supabase
        .from("nomina_items")
        .select("subtotal_devengado, total_neto, total_deducciones, empleado:empleados(departamento)")
        .eq("quincena_id", filters.quincenaId);
      if (error) throw error;

      // Aggregate by department
      const deptMap = new Map<
        string,
        { empleados: number; devengado: number; deducciones: number; neto: number }
      >();

      for (const ni of items || []) {
        const emp = unwrap<{ departamento: string | null }>(ni.empleado);
        const dept = emp?.departamento || "Sin departamento";
        const prev = deptMap.get(dept) || { empleados: 0, devengado: 0, deducciones: 0, neto: 0 };
        prev.empleados += 1;
        prev.devengado += ni.subtotal_devengado || 0;
        prev.deducciones += ni.total_deducciones || 0;
        prev.neto += ni.total_neto || 0;
        deptMap.set(dept, prev);
      }

      const totalDev = [...deptMap.values()].reduce((s, v) => s + v.devengado, 0);

      const rows = [...deptMap.entries()]
        .sort((a, b) => b[1].devengado - a[1].devengado)
        .map(([dept, v]) => {
          const costoP = v.devengado * (TSS.AFP_PATRONAL + TSS.SFS_PATRONAL + TSS.SRL_PATRONAL);
          return {
            departamento: dept,
            empleados: v.empleados,
            devengado: v.devengado,
            deducciones: v.deducciones,
            neto: v.neto,
            costo_patronal: costoP,
            costo_total: v.devengado + costoP,
            porcentaje: totalDev > 0 ? ((v.devengado / totalDev) * 100) : 0,
          };
        });

      const sumF = (f: string) => rows.reduce((s, r) => s + (Number((r as Record<string, unknown>)[f]) || 0), 0);

      return {
        columns: [
          { key: "departamento", label: "Departamento" },
          { key: "empleados", label: "Empleados", align: "right" },
          { key: "devengado", label: "Devengado", align: "right" },
          { key: "deducciones", label: "Deducciones", align: "right" },
          { key: "neto", label: "Neto", align: "right" },
          { key: "costo_patronal", label: "Costo Patr.", align: "right" },
          { key: "costo_total", label: "Costo Total", align: "right" },
          { key: "porcentaje", label: "% del Total", align: "right" },
        ],
        data: rows,
        totals: {
          departamento: `TOTAL (${rows.length} dptos.)`,
          empleados: rows.reduce((s, r) => s + r.empleados, 0),
          devengado: sumF("devengado"),
          deducciones: sumF("deducciones"),
          neto: sumF("neto"),
          costo_patronal: sumF("costo_patronal"),
          costo_total: sumF("costo_total"),
          porcentaje: 100,
        },
        periodo: q
          ? `${formatDate(q.periodo_inicio)} - ${formatDate(q.periodo_fin)}`
          : "",
        subtitle: q?.descripcion || "Análisis por Departamento",
      };
    }

    // =====================================================================
    // HORAS EXTRAS
    // =====================================================================
    case "horas_extras_sucursal": {
      if (!filters.fechaDesde || !filters.fechaHasta) throw new Error("Seleccione rango de fechas");

      const { data: quincenasInRange } = await supabase
        .from("quincenas")
        .select("id, periodo_inicio, periodo_fin")
        .gte("periodo_inicio", filters.fechaDesde)
        .lte("periodo_inicio", filters.fechaHasta);

      const qIds = (quincenasInRange || []).map((q) => q.id);
      if (qIds.length === 0) throw new Error("No hay quincenas en ese rango");

      let query = supabase
        .from("nomina_items")
        .select("*, empleado:empleados(nombre, apellido, departamento, sucursal_id, sucursal:sucursales(nombre))")
        .in("quincena_id", qIds);

      const { data: items, error } = await query;
      if (error) throw error;

      // Group by sucursal
      const bySucursal: Record<string, { nombre: string; horas_diurnas: number; horas_nocturnas: number; horas_feriados: number; monto_diurnas: number; monto_nocturnas: number; monto_feriados: number; empleados: number }> = {};

      for (const item of items || []) {
        const emp = unwrap<{ nombre: string; apellido: string; departamento: string; sucursal_id: string; sucursal: { nombre: string } | { nombre: string }[] }>(item.empleado);
        const sucName = emp?.sucursal ? (Array.isArray(emp.sucursal) ? emp.sucursal[0]?.nombre : emp.sucursal?.nombre) || "Sin Sucursal" : "Sin Sucursal";

        if (filters.sucursalId && emp?.sucursal_id !== filters.sucursalId) continue;

        if (!bySucursal[sucName]) bySucursal[sucName] = { nombre: sucName, horas_diurnas: 0, horas_nocturnas: 0, horas_feriados: 0, monto_diurnas: 0, monto_nocturnas: 0, monto_feriados: 0, empleados: 0 };
        const g = bySucursal[sucName];
        g.horas_diurnas += Number(item.horas_extras_diurnas);
        g.horas_nocturnas += Number(item.horas_extras_nocturnas);
        g.horas_feriados += Number(item.horas_extras_feriados);
        g.monto_diurnas += Number(item.monto_extras_diurnas);
        g.monto_nocturnas += Number(item.monto_extras_nocturnas);
        g.monto_feriados += Number(item.monto_extras_feriados);
        g.empleados++;
      }

      const rows = Object.values(bySucursal).map((g) => ({
        ...g,
        total_horas: g.horas_diurnas + g.horas_nocturnas + g.horas_feriados,
        total_monto: g.monto_diurnas + g.monto_nocturnas + g.monto_feriados,
      }));

      const sumF = (k: string) => rows.reduce((s, r) => s + (Number((r as Record<string, unknown>)[k]) || 0), 0);
      return {
        columns: [
          { key: "nombre", label: "Sucursal" },
          { key: "empleados", label: "Empleados", align: "right" as const },
          { key: "horas_diurnas", label: "H. al 25%", align: "right" as const },
          { key: "horas_nocturnas", label: "H. al 35%", align: "right" as const },
          { key: "horas_feriados", label: "H. Feriados", align: "right" as const },
          { key: "total_horas", label: "Total Horas", align: "right" as const },
          { key: "monto_diurnas", label: "Monto 25%", align: "right" as const },
          { key: "monto_nocturnas", label: "Monto 35%", align: "right" as const },
          { key: "monto_feriados", label: "Monto Fer.", align: "right" as const },
          { key: "total_monto", label: "Total Extras RD$", align: "right" as const },
        ],
        data: rows,
        totals: {
          nombre: "TOTAL",
          empleados: sumF("empleados"),
          total_horas: sumF("total_horas"),
          total_monto: sumF("total_monto"),
          monto_diurnas: sumF("monto_diurnas"),
          monto_nocturnas: sumF("monto_nocturnas"),
          monto_feriados: sumF("monto_feriados"),
        },
        periodo: `${formatDate(filters.fechaDesde)} - ${formatDate(filters.fechaHasta)}`,
        subtitle: "Horas Extras por Sucursal",
      };
    }

    case "horas_extras_departamento": {
      if (!filters.fechaDesde || !filters.fechaHasta) throw new Error("Seleccione rango de fechas");

      const { data: quincenasInRange } = await supabase
        .from("quincenas")
        .select("id")
        .gte("periodo_inicio", filters.fechaDesde)
        .lte("periodo_inicio", filters.fechaHasta);

      const qIds = (quincenasInRange || []).map((q) => q.id);
      if (qIds.length === 0) throw new Error("No hay quincenas en ese rango");

      const { data: items, error } = await supabase
        .from("nomina_items")
        .select("*, empleado:empleados(nombre, apellido, departamento)")
        .in("quincena_id", qIds);
      if (error) throw error;

      const byDept: Record<string, { departamento: string; horas_diurnas: number; horas_nocturnas: number; horas_feriados: number; monto_total: number; empleados: number }> = {};

      for (const item of items || []) {
        const emp = unwrap<{ nombre: string; apellido: string; departamento: string }>(item.empleado);
        const dept = emp?.departamento || "Sin Departamento";
        if (filters.departamento && dept !== filters.departamento) continue;

        if (!byDept[dept]) byDept[dept] = { departamento: dept, horas_diurnas: 0, horas_nocturnas: 0, horas_feriados: 0, monto_total: 0, empleados: 0 };
        byDept[dept].horas_diurnas += Number(item.horas_extras_diurnas);
        byDept[dept].horas_nocturnas += Number(item.horas_extras_nocturnas);
        byDept[dept].horas_feriados += Number(item.horas_extras_feriados);
        byDept[dept].monto_total += Number(item.monto_extras_diurnas) + Number(item.monto_extras_nocturnas) + Number(item.monto_extras_feriados);
        byDept[dept].empleados++;
      }

      const rows = Object.values(byDept).map((g) => ({
        ...g,
        total_horas: g.horas_diurnas + g.horas_nocturnas + g.horas_feriados,
      }));

      const sumF = (k: string) => rows.reduce((s, r) => s + (Number((r as Record<string, unknown>)[k]) || 0), 0);
      return {
        columns: [
          { key: "departamento", label: "Departamento" },
          { key: "empleados", label: "Empleados", align: "right" as const },
          { key: "horas_diurnas", label: "H. al 25%", align: "right" as const },
          { key: "horas_nocturnas", label: "H. al 35%", align: "right" as const },
          { key: "horas_feriados", label: "H. Feriados", align: "right" as const },
          { key: "total_horas", label: "Total Horas", align: "right" as const },
          { key: "monto_total", label: "Total Extras RD$", align: "right" as const },
        ],
        data: rows,
        totals: { departamento: "TOTAL", total_horas: sumF("total_horas"), monto_total: sumF("monto_total") },
        periodo: `${formatDate(filters.fechaDesde)} - ${formatDate(filters.fechaHasta)}`,
      };
    }

    case "horas_extras_detalle": {
      if (!filters.quincenaId) throw new Error("Seleccione una quincena");

      let query = supabase
        .from("horas_extras_importadas")
        .select("*, empleado:empleados(nombre, apellido, cargo, departamento, sucursal_id, tarifa_hora)")
        .eq("quincena_id", filters.quincenaId);

      const { data: items, error } = await query;
      if (error) throw error;

      const rows = (items || []).map((item) => {
        const emp = unwrap<{ nombre: string; apellido: string; cargo: string; departamento: string; sucursal_id: string; tarifa_hora: number }>(item.empleado);
        return {
          nombre: emp ? `${emp.nombre} ${emp.apellido}` : "—",
          cargo: emp?.cargo || "",
          departamento: emp?.departamento || "",
          tarifa_hora: emp?.tarifa_hora || 0,
          tiempo_trabajado: item.tiempo_trabajado,
          horas_regulares: item.horas_regulares,
          horas_extras_total: item.horas_extras_total,
          horas_extras_25: item.horas_extras_25,
          horas_extras_35: item.horas_extras_35,
          monto_extras_25: item.monto_extras_25,
          monto_extras_35: item.monto_extras_35,
          monto_extras_total: item.monto_extras_total,
        };
      });

      const sumF = (k: string) => rows.reduce((s, r) => s + (Number((r as Record<string, unknown>)[k]) || 0), 0);
      return {
        columns: [
          { key: "nombre", label: "Empleado" },
          { key: "cargo", label: "Cargo" },
          { key: "tarifa_hora", label: "Tarifa/h", align: "right" as const },
          { key: "tiempo_trabajado", label: "Tiempo Trab.", align: "right" as const },
          { key: "horas_regulares", label: "H. Regulares", align: "right" as const },
          { key: "horas_extras_total", label: "H. Extras", align: "right" as const },
          { key: "horas_extras_25", label: "H. al 25%", align: "right" as const },
          { key: "horas_extras_35", label: "H. al 35%", align: "right" as const },
          { key: "monto_extras_25", label: "Monto 25%", align: "right" as const },
          { key: "monto_extras_35", label: "Monto 35%", align: "right" as const },
          { key: "monto_extras_total", label: "Total Extras", align: "right" as const },
        ],
        data: rows,
        totals: {
          nombre: `TOTAL (${rows.length})`,
          horas_extras_total: sumF("horas_extras_total"),
          monto_extras_total: sumF("monto_extras_total"),
        },
        subtitle: "Horas Extras Importadas desde Excel",
      };
    }

    // =====================================================================
    // SUCURSALES
    // =====================================================================
    case "nomina_sucursal": {
      if (!filters.quincenaId) throw new Error("Seleccione una quincena");

      const { data: items, error } = await supabase
        .from("nomina_items")
        .select("*, empleado:empleados(nombre, apellido, sucursal_id, sucursal:sucursales(nombre))")
        .eq("quincena_id", filters.quincenaId);
      if (error) throw error;

      const bySuc: Record<string, { sucursal: string; empleados: number; devengado: number; deducciones: number; neto: number; patronal: number }> = {};

      for (const item of items || []) {
        const emp = unwrap<{ nombre: string; apellido: string; sucursal_id: string; sucursal: { nombre: string } | { nombre: string }[] }>(item.empleado);
        const sucName = emp?.sucursal ? (Array.isArray(emp.sucursal) ? emp.sucursal[0]?.nombre : emp.sucursal?.nombre) || "Sin Sucursal" : "Sin Sucursal";

        if (!bySuc[sucName]) bySuc[sucName] = { sucursal: sucName, empleados: 0, devengado: 0, deducciones: 0, neto: 0, patronal: 0 };
        bySuc[sucName].empleados++;
        bySuc[sucName].devengado += Number(item.subtotal_devengado);
        bySuc[sucName].deducciones += Number(item.total_deducciones);
        bySuc[sucName].neto += Number(item.total_neto);
        bySuc[sucName].patronal += Number(item.afp_patronal_monto) + Number(item.sfs_patronal_monto) + Number(item.srl_patronal_monto);
      }

      const rows = Object.values(bySuc).map((g) => ({ ...g, costo_total: g.devengado + g.patronal }));
      const sumF = (k: string) => rows.reduce((s, r) => s + (Number((r as Record<string, unknown>)[k]) || 0), 0);

      const { data: q } = await supabase.from("quincenas").select("*").eq("id", filters.quincenaId).single();

      return {
        columns: [
          { key: "sucursal", label: "Sucursal" },
          { key: "empleados", label: "Empleados", align: "right" as const },
          { key: "devengado", label: "Devengado", align: "right" as const },
          { key: "deducciones", label: "Deducciones", align: "right" as const },
          { key: "neto", label: "Neto a Pagar", align: "right" as const },
          { key: "patronal", label: "Patronal", align: "right" as const },
          { key: "costo_total", label: "Costo Total", align: "right" as const },
        ],
        data: rows,
        totals: { sucursal: "TOTAL", empleados: sumF("empleados"), devengado: sumF("devengado"), deducciones: sumF("deducciones"), neto: sumF("neto"), patronal: sumF("patronal"), costo_total: sumF("costo_total") },
        periodo: q ? `${formatDate(q.periodo_inicio)} - ${formatDate(q.periodo_fin)}` : "",
        subtitle: "Nómina por Sucursal",
      };
    }

    case "empleados_sucursal": {
      const { data: emps, error } = await supabase
        .from("empleados")
        .select("*, sucursal:sucursales(nombre)")
        .eq("estado", "activo")
        .order("apellido");
      if (error) throw error;

      let filtered = emps || [];
      if (filters.sucursalId) {
        filtered = filtered.filter((e) => e.sucursal_id === filters.sucursalId);
      }

      const rows = filtered.map((e) => {
        const suc = unwrap<{ nombre: string }>(e.sucursal);
        return {
          sucursal: suc?.nombre || "Sin Sucursal",
          numero_empleado: e.numero_empleado,
          nombre: `${e.nombre} ${e.apellido}`,
          cargo: e.cargo || "",
          departamento: e.departamento || "",
          sueldo_quincenal: e.sueldo_quincenal,
        };
      });

      const totalSueldo = rows.reduce((s, r) => s + (r.sueldo_quincenal || 0), 0);
      return {
        columns: [
          { key: "sucursal", label: "Sucursal" },
          { key: "numero_empleado", label: "No. Emp" },
          { key: "nombre", label: "Nombre" },
          { key: "cargo", label: "Cargo" },
          { key: "departamento", label: "Depto." },
          { key: "sueldo_quincenal", label: "Sueldo Quinc.", align: "right" as const },
        ],
        data: rows,
        totals: { sucursal: `TOTAL (${rows.length} empleados)`, sueldo_quincenal: totalSueldo },
      };
    }

    case "costo_sucursal_departamento": {
      if (!filters.quincenaId) throw new Error("Seleccione una quincena");

      const { data: items, error } = await supabase
        .from("nomina_items")
        .select("*, empleado:empleados(departamento, sucursal_id, sucursal:sucursales(nombre))")
        .eq("quincena_id", filters.quincenaId);
      if (error) throw error;

      const matrix: Record<string, { sucursal: string; departamento: string; empleados: number; devengado: number; neto: number; costo_total: number }> = {};

      for (const item of items || []) {
        const emp = unwrap<{ departamento: string; sucursal_id: string; sucursal: { nombre: string } | { nombre: string }[] }>(item.empleado);
        const suc = emp?.sucursal ? (Array.isArray(emp.sucursal) ? emp.sucursal[0]?.nombre : emp.sucursal?.nombre) || "Sin Sucursal" : "Sin Sucursal";
        const dept = emp?.departamento || "Sin Depto.";
        const key = `${suc}||${dept}`;

        if (!matrix[key]) matrix[key] = { sucursal: suc, departamento: dept, empleados: 0, devengado: 0, neto: 0, costo_total: 0 };
        matrix[key].empleados++;
        matrix[key].devengado += Number(item.subtotal_devengado);
        matrix[key].neto += Number(item.total_neto);
        matrix[key].costo_total += Number(item.subtotal_devengado) + Number(item.afp_patronal_monto) + Number(item.sfs_patronal_monto) + Number(item.srl_patronal_monto);
      }

      const rows = Object.values(matrix);
      const sumF = (k: string) => rows.reduce((s, r) => s + (Number((r as Record<string, unknown>)[k]) || 0), 0);

      return {
        columns: [
          { key: "sucursal", label: "Sucursal" },
          { key: "departamento", label: "Departamento" },
          { key: "empleados", label: "Empleados", align: "right" as const },
          { key: "devengado", label: "Devengado", align: "right" as const },
          { key: "neto", label: "Neto", align: "right" as const },
          { key: "costo_total", label: "Costo Total", align: "right" as const },
        ],
        data: rows,
        totals: { sucursal: "TOTAL", empleados: sumF("empleados"), devengado: sumF("devengado"), neto: sumF("neto"), costo_total: sumF("costo_total") },
        subtitle: "Análisis Cruzado Sucursal × Departamento",
      };
    }

    // =====================================================================
    // ANÁLISIS ESPECIALES
    // =====================================================================
    case "analisis_productividad": {
      if (!filters.quincenaId) throw new Error("Seleccione una quincena");

      const { data: items, error } = await supabase
        .from("nomina_items")
        .select("*, empleado:empleados(nombre, apellido, cargo, departamento, sueldo_quincenal)")
        .eq("quincena_id", filters.quincenaId);
      if (error) throw error;

      const rows = (items || []).map((item) => {
        const emp = unwrap<{ nombre: string; apellido: string; cargo: string; departamento: string; sueldo_quincenal: number }>(item.empleado);
        const totalExtras = Number(item.monto_extras_diurnas) + Number(item.monto_extras_nocturnas) + Number(item.monto_extras_feriados);
        const horasExtras = Number(item.horas_extras_diurnas) + Number(item.horas_extras_nocturnas) + Number(item.horas_extras_feriados);
        const salarioBase = Number(item.salario_base_calc);
        const pctExtras = salarioBase > 0 ? Math.round((totalExtras / salarioBase) * 10000) / 100 : 0;

        return {
          nombre: emp ? `${emp.nombre} ${emp.apellido}` : "—",
          cargo: emp?.cargo || "",
          departamento: emp?.departamento || "",
          salario_base: salarioBase,
          horas_extras: horasExtras,
          monto_extras: totalExtras,
          pct_extras: pctExtras,
          devengado: Number(item.subtotal_devengado),
          neto: Number(item.total_neto),
          alerta: pctExtras > 30 ? "ALTA CARGA" : pctExtras > 15 ? "MODERADA" : "",
        };
      }).sort((a, b) => b.pct_extras - a.pct_extras);

      return {
        columns: [
          { key: "nombre", label: "Empleado" },
          { key: "cargo", label: "Cargo" },
          { key: "departamento", label: "Depto." },
          { key: "salario_base", label: "Salario Base", align: "right" as const },
          { key: "horas_extras", label: "H. Extras", align: "right" as const },
          { key: "monto_extras", label: "Monto Extras", align: "right" as const },
          { key: "pct_extras", label: "% Extras/Base", align: "right" as const },
          { key: "devengado", label: "Devengado", align: "right" as const },
          { key: "alerta", label: "Alerta" },
        ],
        data: rows,
        subtitle: "Análisis de Productividad — Empleados ordenados por % de horas extras sobre salario base",
      };
    }

    case "analisis_costo_hora_extra": {
      if (!filters.fechaDesde || !filters.fechaHasta) throw new Error("Seleccione rango de fechas");

      const { data: quincenasInRange } = await supabase
        .from("quincenas")
        .select("id, periodo_inicio, periodo_fin, descripcion")
        .gte("periodo_inicio", filters.fechaDesde)
        .lte("periodo_inicio", filters.fechaHasta)
        .order("periodo_inicio");

      if (!quincenasInRange?.length) throw new Error("No hay quincenas en ese rango");

      const rows: Record<string, unknown>[] = [];
      for (const q of quincenasInRange) {
        const { data: items } = await supabase
          .from("nomina_items")
          .select("salario_base_calc, monto_extras_diurnas, monto_extras_nocturnas, monto_extras_feriados, subtotal_devengado, horas_extras_diurnas, horas_extras_nocturnas, horas_extras_feriados")
          .eq("quincena_id", q.id);

        const totalBase = (items || []).reduce((s, i) => s + Number(i.salario_base_calc), 0);
        const totalExtras = (items || []).reduce((s, i) => s + Number(i.monto_extras_diurnas) + Number(i.monto_extras_nocturnas) + Number(i.monto_extras_feriados), 0);
        const totalHoras = (items || []).reduce((s, i) => s + Number(i.horas_extras_diurnas) + Number(i.horas_extras_nocturnas) + Number(i.horas_extras_feriados), 0);
        const totalDevengado = (items || []).reduce((s, i) => s + Number(i.subtotal_devengado), 0);
        const pct = totalDevengado > 0 ? Math.round((totalExtras / totalDevengado) * 10000) / 100 : 0;

        rows.push({
          periodo: `${formatDate(q.periodo_inicio)} - ${formatDate(q.periodo_fin)}`,
          descripcion: q.descripcion || "",
          empleados: (items || []).length,
          nomina_base: totalBase,
          total_horas_extras: totalHoras,
          monto_horas_extras: totalExtras,
          total_devengado: totalDevengado,
          pct_extras: pct,
        });
      }

      const sumF = (k: string) => rows.reduce((s, r) => s + (Number((r as Record<string, unknown>)[k]) || 0), 0);
      return {
        columns: [
          { key: "periodo", label: "Período" },
          { key: "empleados", label: "Empleados", align: "right" as const },
          { key: "nomina_base", label: "Nómina Base", align: "right" as const },
          { key: "total_horas_extras", label: "Total H. Extras", align: "right" as const },
          { key: "monto_horas_extras", label: "Costo H. Extras", align: "right" as const },
          { key: "total_devengado", label: "Total Devengado", align: "right" as const },
          { key: "pct_extras", label: "% Extras", align: "right" as const },
        ],
        data: rows,
        totals: {
          periodo: "TOTALES",
          nomina_base: sumF("nomina_base"),
          total_horas_extras: sumF("total_horas_extras"),
          monto_horas_extras: sumF("monto_horas_extras"),
          total_devengado: sumF("total_devengado"),
        },
        periodo: `${formatDate(filters.fechaDesde)} - ${formatDate(filters.fechaHasta)}`,
        subtitle: "Impacto Económico de Horas Extras — Tendencia por Quincena",
      };
    }

    case "analisis_rotacion_costos": {
      if (!filters.quincenaId) throw new Error("Seleccione una quincena");

      const { data: items, error } = await supabase
        .from("nomina_items")
        .select("*, empleado:empleados(sucursal_id, sucursal:sucursales(nombre))")
        .eq("quincena_id", filters.quincenaId);
      if (error) throw error;

      const bySuc: Record<string, { sucursal: string; empleados: number; salario_base: number; extras: number; devengado: number; deducciones: number; neto: number; patronal: number; prestamos: number; costo_total: number }> = {};

      for (const item of items || []) {
        const emp = unwrap<{ sucursal_id: string; sucursal: { nombre: string } | { nombre: string }[] }>(item.empleado);
        const suc = emp?.sucursal ? (Array.isArray(emp.sucursal) ? emp.sucursal[0]?.nombre : emp.sucursal?.nombre) || "Sin Sucursal" : "Sin Sucursal";

        if (!bySuc[suc]) bySuc[suc] = { sucursal: suc, empleados: 0, salario_base: 0, extras: 0, devengado: 0, deducciones: 0, neto: 0, patronal: 0, prestamos: 0, costo_total: 0 };
        const g = bySuc[suc];
        g.empleados++;
        g.salario_base += Number(item.salario_base_calc);
        g.extras += Number(item.monto_extras_diurnas) + Number(item.monto_extras_nocturnas) + Number(item.monto_extras_feriados);
        g.devengado += Number(item.subtotal_devengado);
        g.deducciones += Number(item.total_deducciones);
        g.neto += Number(item.total_neto);
        g.patronal += Number(item.afp_patronal_monto) + Number(item.sfs_patronal_monto) + Number(item.srl_patronal_monto);
        g.prestamos += Number(item.deduccion_prestamos);
        g.costo_total = g.devengado + g.patronal;
      }

      const rows = Object.values(bySuc);
      const sumF = (k: string) => rows.reduce((s, r) => s + (Number((r as Record<string, unknown>)[k]) || 0), 0);

      const { data: q } = await supabase.from("quincenas").select("*").eq("id", filters.quincenaId).single();

      return {
        columns: [
          { key: "sucursal", label: "Sucursal" },
          { key: "empleados", label: "Empl.", align: "right" as const },
          { key: "salario_base", label: "Salarios Base", align: "right" as const },
          { key: "extras", label: "H. Extras", align: "right" as const },
          { key: "devengado", label: "Devengado", align: "right" as const },
          { key: "deducciones", label: "Deducciones", align: "right" as const },
          { key: "neto", label: "Neto", align: "right" as const },
          { key: "patronal", label: "Patronal", align: "right" as const },
          { key: "prestamos", label: "Préstamos", align: "right" as const },
          { key: "costo_total", label: "Costo Total", align: "right" as const },
        ],
        data: rows,
        totals: {
          sucursal: "TOTAL EMPRESA",
          empleados: sumF("empleados"),
          salario_base: sumF("salario_base"),
          extras: sumF("extras"),
          devengado: sumF("devengado"),
          deducciones: sumF("deducciones"),
          neto: sumF("neto"),
          patronal: sumF("patronal"),
          prestamos: sumF("prestamos"),
          costo_total: sumF("costo_total"),
        },
        periodo: q ? `${formatDate(q.periodo_inicio)} - ${formatDate(q.periodo_fin)}` : "",
        subtitle: "Dashboard de Costos Laborales por Sucursal",
      };
    }

    default:
      throw new Error("Reporte no implementado");
  }
}
