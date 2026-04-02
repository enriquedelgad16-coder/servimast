"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Users,
  Calculator,
  Wallet,
  TrendingUp,
  AlertTriangle,
  Clock,
  ChevronDown,
  FileText,
  CreditCard,
  BarChart3,
  UserPlus,
  PlusCircle,
  ArrowRight,
  CalendarDays,
  Shield,
  Activity,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface QuincenaTotals {
  id: string;
  periodo_inicio: string;
  periodo_fin: string;
  estado: string;
  descripcion: string | null;
  fecha_pago: string | null;
  total_devengado: number;
  total_deducciones: number;
  total_neto: number;
  total_empleados: number;
  horas_extras_diurnas: number;
  horas_extras_nocturnas: number;
  horas_extras_feriados: number;
  afp_patronal: number;
  sfs_patronal: number;
  srl_patronal: number;
}

interface ActividadReciente {
  id: string;
  empleado_id: string;
  total_neto: number;
  created_at: string;
  empleado_nombre: string;
  empleado_numero: string;
  periodo: string;
}

interface DashboardClientProps {
  totalEmpleados: number;
  empleadosPorDepto: Record<string, number>;
  departamentos: string[];
  quincenas: QuincenaTotals[];
  prestamosActivos: number;
  saldoPrestamos: number;
  costoPatronal: {
    afp: number;
    sfs: number;
    srl: number;
    total: number;
    quincenas: number;
    mes: string;
  };
  actividadReciente: ActividadReciente[];
  alertas: {
    empleadosProbacion: number;
    prestamosPorTerminar: number;
    quincenasBorrador: number;
  };
}

// ---------------------------------------------------------------------------
// Chart colors
// ---------------------------------------------------------------------------

const CHART_COLORS = [
  "#00B4D8",
  "#F97316",
  "#16A34A",
  "#3B82F6",
  "#EAB308",
  "#8B5CF6",
  "#EC4899",
  "#14B8A6",
  "#F43F5E",
  "#6366F1",
];

const ESTADO_BADGE: Record<string, string> = {
  borrador: "bg-gray-100 text-gray-600",
  aprobada: "bg-blue-100 text-blue-700",
  pagada: "bg-green-100 text-green-700",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatShortDate(dateStr: string) {
  if (!dateStr) return "";
  const [, m, d] = dateStr.split("-");
  return `${d}/${m}`;
}

function formatPeriodoLabel(inicio: string, fin: string) {
  return `${formatShortDate(inicio)} - ${formatShortDate(fin)}`;
}

function formatMesLabel(mesStr: string) {
  if (!mesStr) return "";
  const [y, m] = mesStr.split("-");
  const nombres = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  return `${nombres[Number(m) - 1]} ${y}`;
}

function timeAgo(dateStr: string) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "hace un momento";
  if (diffMins < 60) return `hace ${diffMins} min`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `hace ${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `hace ${diffDays}d`;
  return new Intl.DateTimeFormat("es-DO", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

// ---------------------------------------------------------------------------
// Custom tooltip
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CurrencyTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-lg p-3 text-sm">
      <p className="font-medium text-gray-700 mb-1">{label}</p>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {payload.map((entry: any, i: number) => (
        <p key={i} style={{ color: entry.color }} className="flex justify-between gap-4">
          <span>{entry.name}:</span>
          <span className="font-semibold">{formatCurrency(entry.value)}</span>
        </p>
      ))}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function HoursTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-lg p-3 text-sm">
      <p className="font-medium text-gray-700 mb-1">{label}</p>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {payload.map((entry: any, i: number) => (
        <p key={i} style={{ color: entry.color }} className="flex justify-between gap-4">
          <span>{entry.name}:</span>
          <span className="font-semibold">{entry.value}h</span>
        </p>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DashboardClient({
  totalEmpleados,
  empleadosPorDepto,
  departamentos,
  quincenas,
  prestamosActivos,
  saldoPrestamos,
  costoPatronal,
  actividadReciente,
  alertas,
}: DashboardClientProps) {
  const [periodoFilter, setPeriodoFilter] = useState<"3" | "6" | "12">("6");

  // Derived data
  const filteredQuincenas = useMemo(() => {
    const limit = Number(periodoFilter);
    const quincenaLimit = limit * 2;
    return quincenas.slice(0, quincenaLimit);
  }, [quincenas, periodoFilter]);

  // Latest quincena with data
  const ultimaQuincena = useMemo(
    () => quincenas.find((q) => q.total_empleados > 0) ?? null,
    [quincenas]
  );

  // Chart data: Tendencia de nómina (area chart by month)
  const tendenciaData = useMemo(() => {
    const monthMap: Record<string, { devengado: number; deducciones: number; neto: number }> = {};
    [...filteredQuincenas].forEach((q) => {
      if (q.total_empleados === 0) return;
      const monthKey = q.periodo_fin.substring(0, 7);
      if (!monthMap[monthKey]) monthMap[monthKey] = { devengado: 0, deducciones: 0, neto: 0 };
      monthMap[monthKey].devengado += q.total_devengado;
      monthMap[monthKey].deducciones += q.total_deducciones;
      monthMap[monthKey].neto += q.total_neto;
    });
    return Object.entries(monthMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        name: formatMesLabel(month),
        Devengado: Math.round(data.devengado),
        Deducciones: Math.round(data.deducciones),
        Neto: Math.round(data.neto),
      }));
  }, [filteredQuincenas]);

  // Chart data: Distribucion por departamento
  const deptoChartData = useMemo(() => {
    return Object.entries(empleadosPorDepto)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [empleadosPorDepto]);

  // Chart data: Horas extra por periodo
  const horasExtraData = useMemo(() => {
    return [...filteredQuincenas]
      .filter((q) => q.total_empleados > 0 && (q.horas_extras_diurnas > 0 || q.horas_extras_nocturnas > 0 || q.horas_extras_feriados > 0))
      .reverse()
      .map((q) => ({
        name: formatPeriodoLabel(q.periodo_inicio, q.periodo_fin),
        Diurnas: q.horas_extras_diurnas,
        Nocturnas: q.horas_extras_nocturnas,
        Feriados: q.horas_extras_feriados,
      }));
  }, [filteredQuincenas]);

  // Costo patronal mensual history for chart
  const patronalHistoryData = useMemo(() => {
    const monthMap: Record<string, { afp: number; sfs: number; srl: number }> = {};
    [...filteredQuincenas].forEach((q) => {
      if (q.total_empleados === 0) return;
      const monthKey = q.periodo_fin.substring(0, 7);
      if (!monthMap[monthKey]) monthMap[monthKey] = { afp: 0, sfs: 0, srl: 0 };
      monthMap[monthKey].afp += q.afp_patronal;
      monthMap[monthKey].sfs += q.sfs_patronal;
      monthMap[monthKey].srl += q.srl_patronal;
    });
    return Object.entries(monthMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        name: formatMesLabel(month),
        "AFP (7.10%)": Math.round(data.afp),
        "SFS (7.09%)": Math.round(data.sfs),
        "SRL (1.20%)": Math.round(data.srl),
      }));
  }, [filteredQuincenas]);

  const totalAlertas =
    alertas.empleadosProbacion +
    alertas.prestamosPorTerminar +
    alertas.quincenasBorrador;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">
            Resumen general del sistema de nomina
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <select
              value={periodoFilter}
              onChange={(e) => setPeriodoFilter(e.target.value as "3" | "6" | "12")}
              className="appearance-none bg-white border border-gray-200 rounded-lg pl-3 pr-8 py-2 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent cursor-pointer"
            >
              <option value="3">Ultimos 3 meses</option>
              <option value="6">Ultimos 6 meses</option>
              <option value="12">Ultimos 12 meses</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Stat cards                                                          */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Empleados Activos */}
        <Link
          href="/empleados"
          className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md hover:border-cyan-300 transition-all group"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">
                Empleados Activos
              </p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {totalEmpleados}
              </p>
              <p className="mt-1 text-sm text-gray-400">
                {departamentos.length} departamento{departamentos.length !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="rounded-lg p-3 bg-cyan-500 group-hover:bg-cyan-400 transition-colors">
              <Users className="h-6 w-6 text-white" />
            </div>
          </div>
        </Link>

        {/* Ultima Quincena — expanded */}
        <Link
          href={ultimaQuincena ? `/nomina/${ultimaQuincena.id}` : "/nomina"}
          className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md hover:border-orange-300 transition-all group"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-gray-500">
                  Ultima Quincena
                </p>
                {ultimaQuincena && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${ESTADO_BADGE[ultimaQuincena.estado] || "bg-gray-100 text-gray-600"}`}>
                    {ultimaQuincena.estado}
                  </span>
                )}
              </div>
              {ultimaQuincena ? (
                <>
                  <p className="mt-1 text-2xl font-bold text-gray-900">
                    {formatCurrency(ultimaQuincena.total_neto)}
                  </p>
                  <div className="mt-1 space-y-0.5">
                    <p className="text-xs text-gray-400">
                      {formatPeriodoLabel(ultimaQuincena.periodo_inicio, ultimaQuincena.periodo_fin)}
                      {" · "}{ultimaQuincena.total_empleados} empleados
                    </p>
                    <div className="flex gap-3 text-xs">
                      <span className="text-cyan-600">Dev: {formatCurrency(ultimaQuincena.total_devengado)}</span>
                      <span className="text-red-500">Ded: {formatCurrency(ultimaQuincena.total_deducciones)}</span>
                    </div>
                  </div>
                </>
              ) : (
                <p className="mt-2 text-lg text-gray-400">Sin datos</p>
              )}
            </div>
            <div className="rounded-lg p-3 bg-orange-500 group-hover:bg-orange-400 transition-colors shrink-0">
              <Calculator className="h-6 w-6 text-white" />
            </div>
          </div>
        </Link>

        {/* Prestamos Activos */}
        <Link
          href="/prestamos"
          className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md hover:border-blue-300 transition-all group"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">
                Prestamos Activos
              </p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {prestamosActivos}
              </p>
              <p className="mt-1 text-sm text-gray-400">
                Saldo: {formatCurrency(saldoPrestamos)}
              </p>
            </div>
            <div className="rounded-lg p-3 bg-blue-500 group-hover:bg-blue-400 transition-colors">
              <Wallet className="h-6 w-6 text-white" />
            </div>
          </div>
        </Link>

        {/* Costo Patronal TSS — with breakdown */}
        <Link
          href="/tss"
          className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md hover:border-green-300 transition-all group"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-500">
                TSS Patronal Mensual
              </p>
              {costoPatronal.total > 0 ? (
                <>
                  <p className="mt-1 text-2xl font-bold text-gray-900">
                    {formatCurrency(costoPatronal.total)}
                  </p>
                  <div className="mt-1 space-y-0.5">
                    <p className="text-xs text-gray-400">
                      {formatMesLabel(costoPatronal.mes)} · {costoPatronal.quincenas} quincena{costoPatronal.quincenas !== 1 ? "s" : ""}
                    </p>
                    <div className="flex gap-2 text-[10px] text-gray-500">
                      <span>AFP: {formatCurrency(costoPatronal.afp)}</span>
                      <span>SFS: {formatCurrency(costoPatronal.sfs)}</span>
                      <span>SRL: {formatCurrency(costoPatronal.srl)}</span>
                    </div>
                  </div>
                </>
              ) : (
                <p className="mt-2 text-lg text-gray-400">Sin datos</p>
              )}
            </div>
            <div className="rounded-lg p-3 bg-green-600 group-hover:bg-green-500 transition-colors shrink-0">
              <Shield className="h-6 w-6 text-white" />
            </div>
          </div>
        </Link>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Charts section                                                      */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tendencia de nomina mensual (Area chart) */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm lg:col-span-2">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-cyan-500" />
            Tendencia de Nomina Mensual
          </h2>
          {tendenciaData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={tendenciaData}>
                <defs>
                  <linearGradient id="gradDevengado" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00B4D8" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#00B4D8" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradNeto" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16A34A" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#16A34A" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6B7280" }} tickLine={false} axisLine={{ stroke: "#E5E7EB" }} />
                <YAxis
                  tick={{ fontSize: 11, fill: "#6B7280" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)}
                />
                <Tooltip content={<CurrencyTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={8} />
                <Area type="monotone" dataKey="Devengado" stroke="#00B4D8" strokeWidth={2} fill="url(#gradDevengado)" dot={{ fill: "#00B4D8", r: 3 }} />
                <Area type="monotone" dataKey="Deducciones" stroke="#F97316" strokeWidth={2} fill="none" dot={{ fill: "#F97316", r: 3 }} />
                <Area type="monotone" dataKey="Neto" stroke="#16A34A" strokeWidth={2} fill="url(#gradNeto)" dot={{ fill: "#16A34A", r: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-400 text-sm">
              No hay datos de nomina. Apruebe y procese quincenas para ver estadisticas.
            </div>
          )}
        </div>

        {/* Distribucion por departamento */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-orange-500" />
            Distribucion por Departamento
          </h2>
          {deptoChartData.length > 0 ? (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="60%" height={280}>
                <PieChart>
                  <Pie
                    data={deptoChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={95}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                  >
                    {deptoChartData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => {
                    const v = Number(value ?? 0);
                    return [`${v} empleado${v !== 1 ? "s" : ""}`, ""];
                  }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {deptoChartData.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-2 text-sm">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                    <span className="text-gray-600 truncate">{d.name}</span>
                    <span className="ml-auto font-semibold text-gray-900">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-gray-400 text-sm">
              No hay datos de departamentos
            </div>
          )}
        </div>

        {/* Costo Patronal TSS por mes */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-600" />
            Costo Patronal TSS por Mes
          </h2>
          {patronalHistoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={patronalHistoryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6B7280" }} tickLine={false} axisLine={{ stroke: "#E5E7EB" }} />
                <YAxis
                  tick={{ fontSize: 11, fill: "#6B7280" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)}
                />
                <Tooltip content={<CurrencyTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" iconSize={8} />
                <Bar dataKey="AFP (7.10%)" stackId="tss" fill="#3B82F6" radius={[0, 0, 0, 0]} />
                <Bar dataKey="SFS (7.09%)" stackId="tss" fill="#00B4D8" radius={[0, 0, 0, 0]} />
                <Bar dataKey="SRL (1.20%)" stackId="tss" fill="#16A34A" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-gray-400 text-sm">
              No hay datos de aportes patronales
            </div>
          )}
        </div>

        {/* Horas extra por periodo */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm lg:col-span-2">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-500" />
            Horas Extra por Periodo
          </h2>
          {horasExtraData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={horasExtraData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6B7280" }} tickLine={false} axisLine={{ stroke: "#E5E7EB" }} />
                <YAxis tick={{ fontSize: 11, fill: "#6B7280" }} tickLine={false} axisLine={false} />
                <Tooltip content={<HoursTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={8} />
                <Bar dataKey="Diurnas" fill="#00B4D8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Nocturnas" fill="#6366F1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Feriados" fill="#F97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[260px] flex items-center justify-center text-gray-400 text-sm">
              No hay datos de horas extra registradas
            </div>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Quick actions + Alertas + Actividad reciente                        */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick actions */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5 text-cyan-500" />
            Acciones Rapidas
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/nomina" className="flex items-center gap-3 p-3 rounded-lg bg-orange-50 hover:bg-orange-100 transition-colors group">
              <Calculator className="h-5 w-5 text-orange-500" />
              <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">Nueva Quincena</span>
            </Link>
            <Link href="/empleados/nuevo" className="flex items-center gap-3 p-3 rounded-lg bg-cyan-50 hover:bg-cyan-100 transition-colors group">
              <UserPlus className="h-5 w-5 text-cyan-500" />
              <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">Agregar Empleado</span>
            </Link>
            <Link href="/prestamos" className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors group">
              <PlusCircle className="h-5 w-5 text-blue-500" />
              <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">Nuevo Prestamo</span>
            </Link>
            <Link href="/reportes" className="flex items-center gap-3 p-3 rounded-lg bg-green-50 hover:bg-green-100 transition-colors group">
              <FileText className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">Ver Reportes</span>
            </Link>
            <Link href="/tss" className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors group">
              <Shield className="h-5 w-5 text-gray-500" />
              <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">TSS</span>
            </Link>
            <Link href="/nomina" className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors group">
              <CreditCard className="h-5 w-5 text-gray-500" />
              <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">Comprobantes</span>
            </Link>
          </div>
        </div>

        {/* Alertas */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Alertas
            {totalAlertas > 0 && (
              <span className="ml-auto inline-flex items-center justify-center h-6 w-6 rounded-full bg-yellow-100 text-yellow-600 text-xs font-bold">
                {totalAlertas}
              </span>
            )}
          </h2>
          {totalAlertas === 0 ? (
            <p className="text-sm text-gray-400 italic">
              No hay alertas pendientes
            </p>
          ) : (
            <div className="space-y-3">
              {alertas.empleadosProbacion > 0 && (
                <Link href="/empleados" className="flex items-start gap-3 p-3 rounded-lg bg-yellow-50 hover:bg-yellow-100 transition-colors">
                  <Users className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">Periodo de prueba</p>
                    <p className="text-xs text-gray-500">
                      {alertas.empleadosProbacion} empleado{alertas.empleadosProbacion !== 1 ? "s" : ""} finalizando (60-90 dias)
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-400 ml-auto shrink-0 mt-0.5" />
                </Link>
              )}

              {alertas.prestamosPorTerminar > 0 && (
                <Link href="/prestamos" className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors">
                  <Wallet className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">Prestamos por finalizar</p>
                    <p className="text-xs text-gray-500">
                      {alertas.prestamosPorTerminar} prestamo{alertas.prestamosPorTerminar !== 1 ? "s" : ""} con 2 cuotas o menos
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-400 ml-auto shrink-0 mt-0.5" />
                </Link>
              )}

              {alertas.quincenasBorrador > 0 && (
                <Link href="/nomina" className="flex items-start gap-3 p-3 rounded-lg bg-orange-50 hover:bg-orange-100 transition-colors">
                  <CalendarDays className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">Quincenas en borrador</p>
                    <p className="text-xs text-gray-500">
                      {alertas.quincenasBorrador} quincena{alertas.quincenasBorrador !== 1 ? "s" : ""} pendiente{alertas.quincenasBorrador !== 1 ? "s" : ""} de aprobar
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-400 ml-auto shrink-0 mt-0.5" />
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Actividad reciente */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-cyan-500" />
            Actividad Reciente
          </h2>
          {actividadReciente.length === 0 ? (
            <p className="text-sm text-gray-400 italic">
              No hay actividad reciente
            </p>
          ) : (
            <div className="space-y-3">
              {actividadReciente.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="h-9 w-9 rounded-full bg-cyan-100 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-cyan-700">
                      {item.empleado_nombre
                        .split(" ")
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {item.empleado_nombre}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      {item.periodo}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-gray-900">
                      {formatCurrency(item.total_neto)}
                    </p>
                    <p className="text-xs text-gray-400">
                      {timeAgo(item.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
