"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Empleado, Vacacion } from "@/types";
import { formatDate } from "@/lib/utils";
import {
  Plus,
  Loader2,
  X,
  Palmtree,
  Calendar,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

// ---------- helpers ----------
function calcAnosServicio(fechaIngreso: string): number {
  const ingreso = new Date(fechaIngreso);
  const hoy = new Date();
  let anos = hoy.getFullYear() - ingreso.getFullYear();
  const m = hoy.getMonth() - ingreso.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < ingreso.getDate())) anos--;
  return Math.max(0, anos);
}

function calcDiasAcumuladosLey(fechaIngreso: string): number {
  // CT Art. 177: 14 dias habiles por cada anio de servicio despues del primer anio
  const anos = calcAnosServicio(fechaIngreso);
  if (anos < 1) return 0;
  return anos * 14;
}

const ESTADO_BADGE: Record<string, string> = {
  pendiente: "bg-yellow-100 text-yellow-700",
  aprobada: "bg-green-100 text-green-700",
  rechazada: "bg-red-100 text-red-600",
  completada: "bg-blue-100 text-blue-600",
};

// ---------- main component ----------
interface Props {
  empleados: Empleado[];
  vacaciones: (Vacacion & { empleado?: { nombre: string; apellido: string } })[];
}

export default function VacacionesClient({ empleados, vacaciones }: Props) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [expandedEmp, setExpandedEmp] = useState<string | null>(null);

  // group vacaciones by empleado
  const vacByEmp: Record<string, typeof vacaciones> = {};
  for (const v of vacaciones) {
    if (!vacByEmp[v.empleado_id]) vacByEmp[v.empleado_id] = [];
    vacByEmp[v.empleado_id].push(v);
  }

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vacaciones</h1>
          <p className="text-gray-500 text-sm mt-1">
            Gestion de vacaciones y dias libres de empleados (CT Art. 177)
          </p>
        </div>
        <button
          onClick={() => setDialogOpen(true)}
          className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-4 py-2.5 rounded-lg transition-colors shadow-sm"
        >
          <Plus className="h-5 w-5" />
          Registrar Vacaciones
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <p className="text-sm text-gray-500">Empleados con vacaciones</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {Object.keys(vacByEmp).length}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <p className="text-sm text-gray-500">Solicitudes pendientes</p>
          <p className="text-2xl font-bold text-yellow-600 mt-1">
            {vacaciones.filter((v) => v.estado === "pendiente").length}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <p className="text-sm text-gray-500">Dias tomados (total)</p>
          <p className="text-2xl font-bold text-cyan-600 mt-1">
            {vacaciones
              .filter((v) => v.estado === "aprobada" || v.estado === "completada")
              .reduce((s, v) => s + v.dias_habiles, 0)}
          </p>
        </div>
      </div>

      {/* Employees table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-500">
                  Empleado
                </th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">
                  Fecha Ingreso
                </th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">
                  Anos Servicio
                </th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">
                  Dias Acumulados
                </th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">
                  Dias Tomados
                </th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">
                  Dias Disponibles
                </th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">
                  Historial
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {empleados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400">
                    <Palmtree className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>No hay empleados registrados</p>
                  </td>
                </tr>
              ) : (
                empleados.map((emp) => {
                  const anosServ = calcAnosServicio(emp.fecha_ingreso);
                  const acumulados =
                    emp.dias_vacaciones_acumulados > 0
                      ? emp.dias_vacaciones_acumulados
                      : calcDiasAcumuladosLey(emp.fecha_ingreso);
                  const tomados = emp.dias_vacaciones_tomados;
                  const disponibles = acumulados - tomados;
                  const empVacs = vacByEmp[emp.id] || [];
                  const isExpanded = expandedEmp === emp.id;

                  return (
                    <React.Fragment key={emp.id}>
                      <tr
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {emp.apellido}, {emp.nombre}
                          <span className="block text-xs text-gray-400">
                            {emp.numero_empleado}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-gray-600">
                          {formatDate(emp.fecha_ingreso)}
                        </td>
                        <td className="px-4 py-3 text-center text-gray-600">
                          {anosServ}
                        </td>
                        <td className="px-4 py-3 text-center font-semibold text-gray-900">
                          {acumulados}
                        </td>
                        <td className="px-4 py-3 text-center text-gray-600">
                          {tomados}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`font-semibold ${
                              disponibles > 0
                                ? "text-green-600"
                                : disponibles === 0
                                ? "text-gray-500"
                                : "text-red-600"
                            }`}
                          >
                            {disponibles}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {empVacs.length > 0 ? (
                            <button
                              onClick={() =>
                                setExpandedEmp(isExpanded ? null : emp.id)
                              }
                              className="inline-flex items-center gap-1 text-cyan-600 hover:text-cyan-700 text-xs font-medium"
                            >
                              {empVacs.length} reg.
                              {isExpanded ? (
                                <ChevronUp className="h-3.5 w-3.5" />
                              ) : (
                                <ChevronDown className="h-3.5 w-3.5" />
                              )}
                            </button>
                          ) : (
                            <span className="text-xs text-gray-400">--</span>
                          )}
                        </td>
                      </tr>
                      {isExpanded && empVacs.length > 0 && (
                        <tr key={`${emp.id}-history`}>
                          <td colSpan={7} className="bg-gray-50 px-8 py-3">
                            <p className="text-xs font-semibold text-gray-500 mb-2">
                              Historial de vacaciones
                            </p>
                            <div className="space-y-1.5">
                              {empVacs.map((v) => (
                                <div
                                  key={v.id}
                                  className="flex items-center gap-4 text-xs"
                                >
                                  <Calendar className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                                  <span className="text-gray-700">
                                    {formatDate(v.fecha_inicio)} -{" "}
                                    {formatDate(v.fecha_fin)}
                                  </span>
                                  <span className="font-medium text-gray-900">
                                    {v.dias_habiles} dias
                                  </span>
                                  <span
                                    className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                                      ESTADO_BADGE[v.estado] || ""
                                    }`}
                                  >
                                    {v.estado.charAt(0).toUpperCase() +
                                      v.estado.slice(1)}
                                  </span>
                                  {v.notas && (
                                    <span className="text-gray-400 truncate max-w-[200px]">
                                      {v.notas}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dialog */}
      {dialogOpen && (
        <RegistrarVacacionesDialog
          empleados={empleados}
          onClose={() => {
            setDialogOpen(false);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

// ---------- Dialog ----------
function RegistrarVacacionesDialog({
  empleados,
  onClose,
}: {
  empleados: Empleado[];
  onClose: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [empleadoId, setEmpleadoId] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [diasHabiles, setDiasHabiles] = useState<number | "">("");
  const [notas, setNotas] = useState("");

  // auto-calc working days (rough: exclude weekends)
  function calcBusinessDays(start: string, end: string): number {
    const s = new Date(start);
    const e = new Date(end);
    let count = 0;
    const cur = new Date(s);
    while (cur <= e) {
      const day = cur.getDay();
      if (day !== 0 && day !== 6) count++;
      cur.setDate(cur.getDate() + 1);
    }
    return count;
  }

  function handleDateChange(start: string, end: string) {
    if (start && end && new Date(end) >= new Date(start)) {
      setDiasHabiles(calcBusinessDays(start, end));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!empleadoId || !fechaInicio || !fechaFin || !diasHabiles) {
      setError("Todos los campos marcados son requeridos");
      return;
    }
    if (new Date(fechaFin) < new Date(fechaInicio)) {
      setError("La fecha fin debe ser posterior a la fecha inicio");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const supabase = createClient();

      // Insert vacacion record
      const { error: insertErr } = await supabase.from("vacaciones").insert({
        empleado_id: empleadoId,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        dias_habiles: Number(diasHabiles),
        estado: "aprobada",
        notas: notas || null,
      });
      if (insertErr) throw insertErr;

      // Update empleado dias_vacaciones_tomados
      const emp = empleados.find((x) => x.id === empleadoId);
      if (emp) {
        const newTomados = emp.dias_vacaciones_tomados + Number(diasHabiles);
        const { error: updErr } = await supabase
          .from("empleados")
          .update({ dias_vacaciones_tomados: newTomados })
          .eq("id", empleadoId);
        if (updErr) throw updErr;
      }

      onClose();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Error al registrar vacaciones"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/50"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-white rounded-2xl shadow-xl w-full max-w-md"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Registrar Vacaciones
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Empleado *
              </label>
              <select
                value={empleadoId}
                onChange={(e) => setEmpleadoId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
              >
                <option value="">Seleccionar empleado...</option>
                {empleados
                  .filter((emp) => emp.estado === "activo")
                  .map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.apellido}, {emp.nombre} ({emp.numero_empleado})
                    </option>
                  ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha Inicio *
                </label>
                <input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => {
                    setFechaInicio(e.target.value);
                    handleDateChange(e.target.value, fechaFin);
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha Fin *
                </label>
                <input
                  type="date"
                  value={fechaFin}
                  onChange={(e) => {
                    setFechaFin(e.target.value);
                    handleDateChange(fechaInicio, e.target.value);
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dias Habiles *
              </label>
              <input
                type="number"
                min={1}
                value={diasHabiles}
                onChange={(e) =>
                  setDiasHabiles(
                    e.target.value ? parseInt(e.target.value) : ""
                  )
                }
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                placeholder="Se calcula automaticamente"
              />
              <p className="text-xs text-gray-400 mt-1">
                Se calcula al seleccionar fechas. Puede ajustar manualmente.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notas
              </label>
              <textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 resize-none"
                placeholder="Observaciones adicionales..."
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium text-sm hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {saving ? "Guardando..." : "Registrar"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
