"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Edit,
  Printer,
  UserX,
  User,
  Briefcase,
  CreditCard,
  Building2,
  Calendar,
  DollarSign,
  Clock,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  FileText,
  Download,
  Shield,
} from "lucide-react";
import { formatCedula, formatCurrency, formatDate } from "@/lib/utils";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type {
  Empleado,
  NominaItem,
  Prestamo,
  Vacacion,
  Liquidacion,
  Quincena,
} from "@/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const ESTADO_BADGES: Record<string, string> = {
  activo: "bg-success-100 text-success-600",
  inactivo: "bg-gray-100 text-gray-600",
  periodo_prueba: "bg-warning-100 text-warning-500",
  desvinculado: "bg-danger-100 text-danger-600",
};

const ESTADO_LABELS: Record<string, string> = {
  activo: "Activo",
  inactivo: "Inactivo",
  periodo_prueba: "Período Prueba",
  desvinculado: "Desvinculado",
};

const TABS = [
  { key: "info", label: "Información" },
  { key: "nominas", label: "Nóminas" },
  { key: "prestamos", label: "Préstamos" },
  { key: "horas-extra", label: "Horas Extra" },
  { key: "vacaciones", label: "Vacaciones" },
  { key: "reportes", label: "Reportes" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const ESTADO_PRESTAMO_BADGE: Record<string, string> = {
  activo: "bg-success-100 text-success-600",
  pagado: "bg-info-100 text-info-500",
  cancelado: "bg-danger-100 text-danger-600",
};

const ESTADO_VACACION_BADGE: Record<string, string> = {
  pendiente: "bg-warning-100 text-warning-500",
  aprobada: "bg-success-100 text-success-600",
  rechazada: "bg-danger-100 text-danger-600",
  completada: "bg-info-100 text-info-500",
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface NominaItemWithQuincena extends NominaItem {
  quincena?: Quincena;
}

interface EmpleadoDetailClientProps {
  empleado: Empleado;
  nominaItems: NominaItemWithQuincena[];
  prestamos: Prestamo[];
  vacaciones: Vacacion[];
  liquidaciones: Liquidacion[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcAntiguedad(fechaIngreso: string): string {
  const ingreso = new Date(fechaIngreso);
  const hoy = new Date();
  let years = hoy.getFullYear() - ingreso.getFullYear();
  let months = hoy.getMonth() - ingreso.getMonth();
  if (months < 0) {
    years--;
    months += 12;
  }
  if (years > 0 && months > 0) return `${years}a ${months}m`;
  if (years > 0) return `${years} año${years > 1 ? "s" : ""}`;
  if (months > 0) return `${months} mes${months > 1 ? "es" : ""}`;
  return "< 1 mes";
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-sm text-gray-500">{label}</dt>
      <dd className="text-sm font-medium text-gray-900 mt-0.5">
        {value || "—"}
      </dd>
    </div>
  );
}

function periodLabel(q?: Quincena): string {
  if (!q) return "—";
  return `${formatDate(q.periodo_inicio)} – ${formatDate(q.periodo_fin)}`;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function EmpleadoDetailClient({
  empleado,
  nominaItems,
  prestamos,
  vacaciones,
}: EmpleadoDetailClientProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("info");
  const [filterDesde, setFilterDesde] = useState("");
  const [filterHasta, setFilterHasta] = useState("");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [horasFilterDesde, setHorasFilterDesde] = useState("");
  const [horasFilterHasta, setHorasFilterHasta] = useState("");

  const vacacionesDisponibles =
    empleado.dias_vacaciones_acumulados - empleado.dias_vacaciones_tomados;

  // ── Nominas filtered ────────────────────────────────────────────────────
  const nominaFiltered = useMemo(() => {
    return nominaItems.filter((item) => {
      if (!item.quincena) return true;
      const inicio = item.quincena.periodo_inicio;
      if (filterDesde && inicio < filterDesde) return false;
      if (filterHasta && inicio > filterHasta) return false;
      return true;
    });
  }, [nominaItems, filterDesde, filterHasta]);

  const nominaSummary = useMemo(() => {
    return nominaFiltered.reduce(
      (acc, item) => ({
        devengado: acc.devengado + item.subtotal_devengado,
        deducciones: acc.deducciones + item.total_deducciones,
        neto: acc.neto + item.total_neto,
      }),
      { devengado: 0, deducciones: 0, neto: 0 }
    );
  }, [nominaFiltered]);

  const netoChartData = useMemo(() => {
    return [...nominaFiltered]
      .sort((a, b) => {
        const dA = a.quincena?.periodo_inicio || "";
        const dB = b.quincena?.periodo_inicio || "";
        return dA.localeCompare(dB);
      })
      .map((item) => ({
        periodo: item.quincena
          ? `${formatDate(item.quincena.periodo_inicio).slice(0, 5)}`
          : "—",
        neto: item.total_neto,
      }));
  }, [nominaFiltered]);

  // ── Horas extra filtered ────────────────────────────────────────────────
  const horasExtraFiltered = useMemo(() => {
    return nominaItems.filter((item) => {
      if (
        item.horas_extras_diurnas === 0 &&
        item.horas_extras_nocturnas === 0 &&
        item.horas_extras_feriados === 0
      )
        return false;
      if (!item.quincena) return true;
      const inicio = item.quincena.periodo_inicio;
      if (horasFilterDesde && inicio < horasFilterDesde) return false;
      if (horasFilterHasta && inicio > horasFilterHasta) return false;
      return true;
    });
  }, [nominaItems, horasFilterDesde, horasFilterHasta]);

  const horasChartData = useMemo(() => {
    return [...horasExtraFiltered]
      .sort((a, b) => {
        const dA = a.quincena?.periodo_inicio || "";
        const dB = b.quincena?.periodo_inicio || "";
        return dA.localeCompare(dB);
      })
      .map((item) => ({
        periodo: item.quincena
          ? `${formatDate(item.quincena.periodo_inicio).slice(0, 5)}`
          : "—",
        diurnas: item.horas_extras_diurnas,
        nocturnas: item.horas_extras_nocturnas,
        feriados: item.horas_extras_feriados,
      }));
  }, [horasExtraFiltered]);

  // ── Prestamos summary ──────────────────────────────────────────────────
  const prestamosSummary = useMemo(() => {
    return prestamos.reduce(
      (acc, p) => ({
        totalPrestado: acc.totalPrestado + p.monto_total,
        totalPagado:
          acc.totalPagado + (p.monto_total - p.saldo_pendiente),
        saldoPendiente: acc.saldoPendiente + p.saldo_pendiente,
      }),
      { totalPrestado: 0, totalPagado: 0, saldoPendiente: 0 }
    );
  }, [prestamos]);

  const prestamosActivos = prestamos.filter((p) => p.estado === "activo");
  const prestamosHistorial = prestamos.filter((p) => p.estado !== "activo");

  // ── Toggle row expand ──────────────────────────────────────────────────
  function toggleRow(id: string) {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // ── Print ──────────────────────────────────────────────────────────────
  function handlePrint() {
    window.print();
  }

  return (
    <div className="print:bg-white">
      {/* ─── Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Link
            href="/empleados"
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors print:hidden"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-4">
            {/* Photo placeholder */}
            <div className="h-14 w-14 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
              <User className="h-7 w-7 text-gray-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {empleado.nombre} {empleado.apellido}
              </h1>
              <p className="text-gray-500 text-sm flex flex-wrap items-center gap-2">
                <span>{empleado.numero_empleado}</span>
                <span>&middot;</span>
                <span>{empleado.cargo || "Sin cargo"}</span>
                <span>&middot;</span>
                <span>{empleado.departamento || "Sin depto."}</span>
                <span>&middot;</span>
                <span
                  className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_BADGES[empleado.estado] || ""}`}
                >
                  {ESTADO_LABELS[empleado.estado] || empleado.estado}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 print:hidden">
          <Link
            href={`/empleados/${empleado.id}?edit=true`}
            className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-4 py-2.5 rounded-lg transition-colors shadow-sm text-sm"
          >
            <Edit className="h-4 w-4" />
            Editar
          </Link>
          {empleado.estado !== "desvinculado" && (
            <Link
              href={`/liquidaciones/nueva?empleado_id=${empleado.id}`}
              className="inline-flex items-center gap-2 bg-danger-100 hover:bg-danger-600 text-danger-600 hover:text-white font-semibold px-4 py-2.5 rounded-lg transition-colors text-sm"
            >
              <UserX className="h-4 w-4" />
              Despedir / Liquidar
            </Link>
          )}
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-4 py-2.5 rounded-lg transition-colors text-sm"
          >
            <Printer className="h-4 w-4" />
            Imprimir
          </button>
        </div>
      </div>

      {/* ─── Info Cards Row ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
            <DollarSign className="h-4 w-4 text-success-600" />
            Sueldo Quincenal
          </div>
          <p className="text-xl font-bold text-gray-900">
            {formatCurrency(empleado.sueldo_quincenal)}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
            <Clock className="h-4 w-4 text-info-500" />
            Tarifa Hora
          </div>
          <p className="text-xl font-bold text-gray-900">
            {formatCurrency(empleado.tarifa_hora)}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
            <Briefcase className="h-4 w-4 text-orange-500" />
            Antigüedad
          </div>
          <p className="text-xl font-bold text-gray-900">
            {calcAntiguedad(empleado.fecha_ingreso)}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
            <Calendar className="h-4 w-4 text-cyan-500" />
            Vacaciones Disponibles
          </div>
          <p className="text-xl font-bold text-gray-900">
            {vacacionesDisponibles} días
          </p>
        </div>
      </div>

      {/* ─── Tabs ──────────────────────────────────────────────────────── */}
      <div className="border-b border-gray-200 mb-6 print:hidden overflow-x-auto">
        <nav className="flex gap-1 -mb-px" aria-label="Pestañas">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                activeTab === tab.key
                  ? "border-cyan-500 text-cyan-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* ─── Tab Content ───────────────────────────────────────────────── */}
      {activeTab === "info" && (
        <TabInformacion empleado={empleado} />
      )}
      {activeTab === "nominas" && (
        <TabNominas
          items={nominaFiltered}
          summary={nominaSummary}
          chartData={netoChartData}
          filterDesde={filterDesde}
          filterHasta={filterHasta}
          onFilterDesde={setFilterDesde}
          onFilterHasta={setFilterHasta}
          expandedRows={expandedRows}
          onToggleRow={toggleRow}
        />
      )}
      {activeTab === "prestamos" && (
        <TabPrestamos
          activos={prestamosActivos}
          historial={prestamosHistorial}
          summary={prestamosSummary}
        />
      )}
      {activeTab === "horas-extra" && (
        <TabHorasExtra
          items={horasExtraFiltered}
          chartData={horasChartData}
          filterDesde={horasFilterDesde}
          filterHasta={horasFilterHasta}
          onFilterDesde={setHorasFilterDesde}
          onFilterHasta={setHorasFilterHasta}
        />
      )}
      {activeTab === "vacaciones" && (
        <TabVacaciones
          empleado={empleado}
          vacaciones={vacaciones}
          disponibles={vacacionesDisponibles}
        />
      )}
      {activeTab === "reportes" && (
        <TabReportes empleado={empleado} />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: Información
// ═══════════════════════════════════════════════════════════════════════════════

function TabInformacion({ empleado }: { empleado: Empleado }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Datos Personales */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <User className="h-5 w-5 text-cyan-500" />
          Datos Personales
        </h2>
        <dl className="grid grid-cols-2 gap-4">
          <Field label="Cédula" value={formatCedula(empleado.cedula)} />
          <Field
            label="Fecha Nac."
            value={
              empleado.fecha_nacimiento
                ? formatDate(empleado.fecha_nacimiento)
                : null
            }
          />
          <Field label="Email" value={empleado.email} />
          <Field label="Tel. Trabajo" value={empleado.telefono_trabajo} />
          <Field label="Tel. Personal" value={empleado.telefono_personal} />
          <div className="col-span-2">
            <Field label="Dirección" value={empleado.direccion} />
          </div>
        </dl>
      </div>

      {/* Datos Laborales */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-orange-500" />
          Datos Laborales
        </h2>
        <dl className="grid grid-cols-2 gap-4">
          <Field
            label="Fecha Ingreso"
            value={formatDate(empleado.fecha_ingreso)}
          />
          <Field label="Cargo" value={empleado.cargo} />
          <Field label="Departamento" value={empleado.departamento} />
          <Field label="Sucursal" value={empleado.sucursal?.nombre || "—"} />
          <Field
            label="Tipo Contrato"
            value={
              empleado.tipo_contrato === "indeterminado"
                ? "Indeterminado"
                : "Determinado"
            }
          />
          <Field
            label="Fin Período Prueba"
            value={
              empleado.periodo_prueba_fin
                ? formatDate(empleado.periodo_prueba_fin)
                : null
            }
          />
          <Field label="Estado" value={ESTADO_LABELS[empleado.estado] || empleado.estado} />
        </dl>
      </div>

      {/* Datos Salariales */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Building2 className="h-5 w-5 text-success-600" />
          Datos Salariales
        </h2>
        <dl className="grid grid-cols-2 gap-4">
          <Field
            label="Sueldo Quincenal"
            value={formatCurrency(empleado.sueldo_quincenal)}
          />
          <Field
            label="Tarifa Hora"
            value={formatCurrency(empleado.tarifa_hora)}
          />
          <Field
            label="Sueldo Mensual"
            value={formatCurrency(empleado.sueldo_quincenal * 2)}
          />
        </dl>
      </div>

      {/* Datos Bancarios y SS */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-info-500" />
          Datos Bancarios y Seguridad Social
        </h2>
        <dl className="grid grid-cols-2 gap-4">
          <Field label="Banco" value={empleado.banco} />
          <Field label="No. Cuenta" value={empleado.numero_cuenta} />
          <Field label="NSS" value={empleado.nss} />
          <Field
            label="Vacaciones Acumuladas"
            value={`${empleado.dias_vacaciones_acumulados} días`}
          />
          <Field
            label="Vacaciones Tomadas"
            value={`${empleado.dias_vacaciones_tomados} días`}
          />
        </dl>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: Nóminas
// ═══════════════════════════════════════════════════════════════════════════════

function TabNominas({
  items,
  summary,
  chartData,
  filterDesde,
  filterHasta,
  onFilterDesde,
  onFilterHasta,
  expandedRows,
  onToggleRow,
}: {
  items: NominaItemWithQuincena[];
  summary: { devengado: number; deducciones: number; neto: number };
  chartData: { periodo: string; neto: number }[];
  filterDesde: string;
  filterHasta: string;
  onFilterDesde: (v: string) => void;
  onFilterHasta: (v: string) => void;
  expandedRows: Set<string>;
  onToggleRow: (id: string) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Filter */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Desde
            </label>
            <input
              type="date"
              value={filterDesde}
              onChange={(e) => onFilterDesde(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Hasta
            </label>
            <input
              type="date"
              value={filterHasta}
              onChange={(e) => onFilterHasta(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
          {(filterDesde || filterHasta) && (
            <button
              onClick={() => {
                onFilterDesde("");
                onFilterHasta("");
              }}
              className="text-sm text-cyan-600 hover:text-cyan-700 font-medium pb-2"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs text-gray-500 mb-1">Total Devengado Acumulado</p>
          <p className="text-lg font-bold text-gray-900">
            {formatCurrency(summary.devengado)}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs text-gray-500 mb-1">Total Deducciones</p>
          <p className="text-lg font-bold text-danger-600">
            {formatCurrency(summary.deducciones)}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs text-gray-500 mb-1">Total Neto Pagado</p>
          <p className="text-lg font-bold text-success-600">
            {formatCurrency(summary.neto)}
          </p>
        </div>
      </div>

      {/* Neto Trend Chart */}
      {chartData.length > 1 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-cyan-500" />
            Tendencia Neto por Quincena
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="periodo" tick={{ fontSize: 11 }} />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={(v) =>
                  `${(v / 1000).toFixed(0)}k`
                }
              />
              <Tooltip
                formatter={(value) => [formatCurrency(Number(value ?? 0)), "Neto"]}
              />
              <Line
                type="monotone"
                dataKey="neto"
                stroke="#06b6d4"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-500 w-8"></th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">
                  Período
                </th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">
                  H. Base
                </th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">
                  H. Extra
                </th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">
                  Devengado
                </th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">
                  AFP
                </th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">
                  SFS
                </th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">
                  ISR
                </th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">
                  Deducciones
                </th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">
                  Neto
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-4 py-8 text-center text-gray-400"
                  >
                    No hay registros de nómina
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const isExpanded = expandedRows.has(item.id);
                  const totalExtras =
                    item.horas_extras_diurnas +
                    item.horas_extras_nocturnas +
                    item.horas_extras_feriados;
                  return (
                    <NominaRow
                      key={item.id}
                      item={item}
                      isExpanded={isExpanded}
                      totalExtras={totalExtras}
                      onToggle={() => onToggleRow(item.id)}
                    />
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

function NominaRow({
  item,
  isExpanded,
  totalExtras,
  onToggle,
}: {
  item: NominaItemWithQuincena;
  isExpanded: boolean;
  totalExtras: number;
  onToggle: () => void;
}) {
  return (
    <>
      <tr
        className="hover:bg-gray-50 cursor-pointer transition-colors"
        onClick={onToggle}
      >
        <td className="px-4 py-3 text-gray-400">
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </td>
        <td className="px-4 py-3 font-medium text-gray-900">
          {periodLabel(item.quincena)}
        </td>
        <td className="px-4 py-3 text-right text-gray-700">
          {item.horas_base}
        </td>
        <td className="px-4 py-3 text-right text-gray-700">{totalExtras}</td>
        <td className="px-4 py-3 text-right font-medium text-gray-900">
          {formatCurrency(item.subtotal_devengado)}
        </td>
        <td className="px-4 py-3 text-right text-gray-600">
          {formatCurrency(item.afp_monto)}
        </td>
        <td className="px-4 py-3 text-right text-gray-600">
          {formatCurrency(item.sfs_monto)}
        </td>
        <td className="px-4 py-3 text-right text-gray-600">
          {formatCurrency(item.isr_monto)}
        </td>
        <td className="px-4 py-3 text-right font-medium text-danger-600">
          {formatCurrency(item.total_deducciones)}
        </td>
        <td className="px-4 py-3 text-right font-bold text-success-600">
          {formatCurrency(item.total_neto)}
        </td>
      </tr>
      {isExpanded && (
        <tr className="bg-gray-50">
          <td colSpan={10} className="px-6 py-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 text-sm">
              <DetailCell
                label="Salario Base Calc."
                value={formatCurrency(item.salario_base_calc)}
              />
              <DetailCell
                label="H. Extras Diurnas"
                value={`${item.horas_extras_diurnas}h = ${formatCurrency(item.monto_extras_diurnas)}`}
              />
              <DetailCell
                label="H. Extras Nocturnas"
                value={`${item.horas_extras_nocturnas}h = ${formatCurrency(item.monto_extras_nocturnas)}`}
              />
              <DetailCell
                label="H. Extras Feriados"
                value={`${item.horas_extras_feriados}h = ${formatCurrency(item.monto_extras_feriados)}`}
              />
              <DetailCell
                label="Instal. GPON"
                value={`${item.instalaciones_gpon} = ${formatCurrency(item.monto_instalaciones_gpon)}`}
              />
              <DetailCell
                label="Instal. Red"
                value={`${item.instalaciones_red} = ${formatCurrency(item.monto_instalaciones_red)}`}
              />
              <DetailCell
                label="Metas Cumplimiento"
                value={formatCurrency(item.metas_cumplimiento)}
              />
              <DetailCell
                label="Otros Ingresos"
                value={formatCurrency(item.otros_ingresos)}
              />
              <DetailCell
                label="Faltas (días)"
                value={`${item.faltas_dias} = -${formatCurrency(item.deduccion_por_faltas)}`}
              />
              <DetailCell
                label="Préstamos"
                value={`-${formatCurrency(item.deduccion_prestamos)}`}
              />
              <DetailCell
                label="Otros Descuentos"
                value={`-${formatCurrency(item.otros_descuentos)}`}
              />
              {item.notas && (
                <div className="col-span-full">
                  <DetailCell label="Notas" value={item.notas} />
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function DetailCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs text-gray-500">{label}</span>
      <p className="font-medium text-gray-800">{value}</p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: Préstamos
// ═══════════════════════════════════════════════════════════════════════════════

function TabPrestamos({
  activos,
  historial,
  summary,
}: {
  activos: Prestamo[];
  historial: Prestamo[];
  summary: { totalPrestado: number; totalPagado: number; saldoPendiente: number };
}) {
  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs text-gray-500 mb-1">Total Prestado</p>
          <p className="text-lg font-bold text-gray-900">
            {formatCurrency(summary.totalPrestado)}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs text-gray-500 mb-1">Total Pagado</p>
          <p className="text-lg font-bold text-success-600">
            {formatCurrency(summary.totalPagado)}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs text-gray-500 mb-1">Saldo Pendiente</p>
          <p className="text-lg font-bold text-danger-600">
            {formatCurrency(summary.saldoPendiente)}
          </p>
        </div>
      </div>

      {/* Active Loans */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-success-600" />
          Préstamos Activos ({activos.length})
        </h3>
        {activos.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 text-center text-gray-400 text-sm">
            No tiene préstamos activos
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {activos.map((p) => (
              <PrestamoCard key={p.id} prestamo={p} />
            ))}
          </div>
        )}
      </div>

      {/* Loan History */}
      {historial.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-400" />
            Historial de Préstamos ({historial.length})
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {historial.map((p) => (
              <PrestamoCard key={p.id} prestamo={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PrestamoCard({ prestamo }: { prestamo: Prestamo }) {
  const pagado = prestamo.monto_total - prestamo.saldo_pendiente;
  const porcentaje =
    prestamo.monto_total > 0
      ? Math.round((pagado / prestamo.monto_total) * 100)
      : 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">
            {formatCurrency(prestamo.monto_total)}
          </p>
          <p className="text-xs text-gray-500">
            Cuota: {formatCurrency(prestamo.cuota_quincenal)} / quincena
          </p>
        </div>
        <span
          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_PRESTAMO_BADGE[prestamo.estado] || "bg-gray-100 text-gray-600"}`}
        >
          {prestamo.estado === "activo"
            ? "Activo"
            : prestamo.estado === "pagado"
              ? "Saldado"
              : "Cancelado"}
        </span>
      </div>

      {/* Progress bar */}
      <div className="mb-2">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Pagado: {formatCurrency(pagado)}</span>
          <span>{porcentaje}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-cyan-500 h-2 rounded-full transition-all"
            style={{ width: `${Math.min(porcentaje, 100)}%` }}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mt-3">
        <span>Inicio: {formatDate(prestamo.fecha_inicio)}</span>
        <span>
          Cuotas: {prestamo.numero_cuotas_pagadas}/
          {prestamo.numero_cuotas_estimado || "—"}
        </span>
        <span>Saldo: {formatCurrency(prestamo.saldo_pendiente)}</span>
      </div>

      {prestamo.notas && (
        <p className="text-xs text-gray-400 mt-2 italic">{prestamo.notas}</p>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: Horas Extra
// ═══════════════════════════════════════════════════════════════════════════════

function TabHorasExtra({
  items,
  chartData,
  filterDesde,
  filterHasta,
  onFilterDesde,
  onFilterHasta,
}: {
  items: NominaItemWithQuincena[];
  chartData: { periodo: string; diurnas: number; nocturnas: number; feriados: number }[];
  filterDesde: string;
  filterHasta: string;
  onFilterDesde: (v: string) => void;
  onFilterHasta: (v: string) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Filter */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Desde
            </label>
            <input
              type="date"
              value={filterDesde}
              onChange={(e) => onFilterDesde(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Hasta
            </label>
            <input
              type="date"
              value={filterHasta}
              onChange={(e) => onFilterHasta(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
          {(filterDesde || filterHasta) && (
            <button
              onClick={() => {
                onFilterDesde("");
                onFilterHasta("");
              }}
              className="text-sm text-cyan-600 hover:text-cyan-700 font-medium pb-2"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Bar Chart */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-orange-500" />
            Horas Extra por Quincena
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="periodo" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="diurnas" name="Diurnas" fill="#06b6d4" radius={[2, 2, 0, 0]} />
              <Bar dataKey="nocturnas" name="Nocturnas" fill="#f97316" radius={[2, 2, 0, 0]} />
              <Bar dataKey="feriados" name="Feriados" fill="#8b5cf6" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-500">
                  Período
                </th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">
                  Diurnas
                </th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">
                  Nocturnas
                </th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">
                  Feriados
                </th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">
                  Total Horas
                </th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">
                  Monto
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-gray-400"
                  >
                    No hay registros de horas extra
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const total =
                    item.horas_extras_diurnas +
                    item.horas_extras_nocturnas +
                    item.horas_extras_feriados;
                  const monto =
                    item.monto_extras_diurnas +
                    item.monto_extras_nocturnas +
                    item.monto_extras_feriados;
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {periodLabel(item.quincena)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700">
                        {item.horas_extras_diurnas}h
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700">
                        {item.horas_extras_nocturnas}h
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700">
                        {item.horas_extras_feriados}h
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">
                        {total}h
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-success-600">
                        {formatCurrency(monto)}
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

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: Vacaciones
// ═══════════════════════════════════════════════════════════════════════════════

function TabVacaciones({
  empleado,
  vacaciones,
  disponibles,
}: {
  empleado: Empleado;
  vacaciones: Vacacion[];
  disponibles: number;
}) {
  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs text-gray-500 mb-1">Días Acumulados</p>
          <p className="text-lg font-bold text-gray-900">
            {empleado.dias_vacaciones_acumulados}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs text-gray-500 mb-1">Días Tomados</p>
          <p className="text-lg font-bold text-orange-500">
            {empleado.dias_vacaciones_tomados}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs text-gray-500 mb-1">Días Disponibles</p>
          <p className="text-lg font-bold text-success-600">{disponibles}</p>
        </div>
      </div>

      {/* History */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-cyan-500" />
            Historial de Vacaciones
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-500">
                  Fecha Inicio
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">
                  Fecha Fin
                </th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">
                  Días Hábiles
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">
                  Estado
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">
                  Notas
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {vacaciones.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-gray-400"
                  >
                    No hay registros de vacaciones
                  </td>
                </tr>
              ) : (
                vacaciones.map((v) => (
                  <tr
                    key={v.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3 text-gray-900">
                      {formatDate(v.fecha_inicio)}
                    </td>
                    <td className="px-4 py-3 text-gray-900">
                      {formatDate(v.fecha_fin)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                      {v.dias_habiles}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_VACACION_BADGE[v.estado] || "bg-gray-100 text-gray-600"}`}
                      >
                        {v.estado.charAt(0).toUpperCase() + v.estado.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate">
                      {v.notas || "—"}
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

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: Reportes
// ═══════════════════════════════════════════════════════════════════════════════

function TabReportes({ empleado }: { empleado: Empleado }) {
  const reportes = [
    {
      icon: FileText,
      title: "Ficha del Empleado",
      description:
        "Documento PDF con todos los datos personales, laborales y salariales del empleado.",
      color: "text-cyan-500",
    },
    {
      icon: DollarSign,
      title: "Historial de Pagos",
      description:
        "Reporte PDF con el historial completo de nóminas procesadas para este empleado.",
      color: "text-success-600",
    },
    {
      icon: Shield,
      title: "Certificación Laboral",
      description:
        "Carta de certificación laboral con los datos del empleado, cargo y salario.",
      color: "text-orange-500",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {reportes.map((r) => (
        <div
          key={r.title}
          className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex flex-col"
        >
          <div className="flex items-center gap-3 mb-3">
            <r.icon className={`h-6 w-6 ${r.color}`} />
            <h3 className="text-sm font-semibold text-gray-900">{r.title}</h3>
          </div>
          <p className="text-xs text-gray-500 flex-1 mb-4">{r.description}</p>
          <button
            onClick={() => {
              // Placeholder: in the future this will call a PDF generation API
              alert(
                `Generando "${r.title}" para ${empleado.nombre} ${empleado.apellido}...`
              );
            }}
            className="inline-flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-4 py-2 rounded-lg transition-colors text-sm w-full"
          >
            <Download className="h-4 w-4" />
            Generar PDF
          </button>
        </div>
      ))}
    </div>
  );
}
