"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Save, Loader2, ArrowLeft, Calculator } from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import type { Empleado } from "@/types";

export function PrestamoForm() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(true);

  const [empleadoId, setEmpleadoId] = useState("");
  const [montoTotal, setMontoTotal] = useState("");
  const [cuotaQuincenal, setCuotaQuincenal] = useState("");
  const [fechaInicio, setFechaInicio] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [notas, setNotas] = useState("");

  const cuotasEstimadas =
    montoTotal && cuotaQuincenal && Number(cuotaQuincenal) > 0
      ? Math.ceil(Number(montoTotal) / Number(cuotaQuincenal))
      : null;

  useEffect(() => {
    async function fetchEmpleados() {
      const supabase = createClient();
      const { data } = await supabase
        .from("empleados")
        .select("*")
        .eq("estado", "activo")
        .order("apellido", { ascending: true });
      setEmpleados(data || []);
      setLoading(false);
    }
    fetchEmpleados();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!empleadoId || !montoTotal || !cuotaQuincenal) return;

    setSaving(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error: insertError } = await supabase.from("prestamos").insert({
        empleado_id: empleadoId,
        monto_total: Number(montoTotal),
        cuota_quincenal: Number(cuotaQuincenal),
        saldo_pendiente: Number(montoTotal),
        fecha_inicio: fechaInicio,
        estado: "activo",
        numero_cuotas_estimado: cuotasEstimadas,
        numero_cuotas_pagadas: 0,
        notas: notas || null,
      });

      if (insertError) throw insertError;

      router.push("/prestamos");
      router.refresh();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Error al guardar préstamo"
      );
    } finally {
      setSaving(false);
    }
  }

  const selectedEmpleado = empleados.find((e) => e.id === empleadoId);

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/prestamos"
          className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nuevo Préstamo</h1>
          <p className="text-gray-500 text-sm">
            Registrar un préstamo a un empleado
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 text-red-600 text-sm p-4 rounded-lg border border-red-200">
          {error}
        </div>
      )}

      <form onSubmit={onSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Datos del Préstamo
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Empleado *
                </label>
                {loading ? (
                  <div className="flex items-center gap-2 text-gray-400 text-sm py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Cargando empleados...
                  </div>
                ) : (
                  <select
                    value={empleadoId}
                    onChange={(e) => setEmpleadoId(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  >
                    <option value="">Seleccionar empleado...</option>
                    {empleados.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.apellido}, {emp.nombre} — {emp.numero_empleado}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {selectedEmpleado && (
                <div className="bg-cyan-50 rounded-lg p-3 text-sm">
                  <p className="font-medium text-cyan-800">
                    {selectedEmpleado.nombre} {selectedEmpleado.apellido}
                  </p>
                  <p className="text-cyan-600">
                    Sueldo quincenal:{" "}
                    {formatCurrency(selectedEmpleado.sueldo_quincenal)}
                  </p>
                  <p className="text-cyan-600">
                    Departamento: {selectedEmpleado.departamento || "—"}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monto Total (RD$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={montoTotal}
                  onChange={(e) => setMontoTotal(e.target.value)}
                  required
                  placeholder="0.00"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cuota Quincenal (RD$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={cuotaQuincenal}
                  onChange={(e) => setCuotaQuincenal(e.target.value)}
                  required
                  placeholder="0.00"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha de Inicio *
                </label>
                <input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notas
                </label>
                <textarea
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  rows={3}
                  placeholder="Descripción o motivo del préstamo..."
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 resize-none"
                />
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Calculator className="h-5 w-5 text-cyan-500" />
              Resumen del Préstamo
            </h2>

            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <span className="text-gray-600">Monto Total</span>
                <span className="font-semibold text-gray-900 font-mono">
                  {montoTotal
                    ? formatCurrency(Number(montoTotal))
                    : "RD$ 0.00"}
                </span>
              </div>

              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <span className="text-gray-600">Cuota Quincenal</span>
                <span className="font-semibold text-gray-900 font-mono">
                  {cuotaQuincenal
                    ? formatCurrency(Number(cuotaQuincenal))
                    : "RD$ 0.00"}
                </span>
              </div>

              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <span className="text-gray-600">Cuotas Estimadas</span>
                <span className="font-semibold text-gray-900">
                  {cuotasEstimadas ? `${cuotasEstimadas} quincenas` : "—"}
                </span>
              </div>

              {cuotasEstimadas && (
                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                  <span className="text-gray-600">Tiempo Estimado</span>
                  <span className="font-semibold text-gray-900">
                    {cuotasEstimadas <= 2
                      ? `${cuotasEstimadas} quincena${cuotasEstimadas > 1 ? "s" : ""}`
                      : `~${Math.ceil(cuotasEstimadas / 2)} mes${Math.ceil(cuotasEstimadas / 2) > 1 ? "es" : ""}`}
                  </span>
                </div>
              )}

              {selectedEmpleado && cuotaQuincenal && (
                <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200">
                  <p className="text-sm text-amber-800">
                    <strong>Impacto en nómina:</strong> Se descontarán{" "}
                    {formatCurrency(Number(cuotaQuincenal))} cada quincena del
                    sueldo de {selectedEmpleado.nombre}.
                  </p>
                  <p className="text-xs text-amber-600 mt-1">
                    Sueldo neto estimado:{" "}
                    {formatCurrency(
                      selectedEmpleado.sueldo_quincenal -
                        Number(cuotaQuincenal)
                    )}{" "}
                    (sin otras deducciones)
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <Link
            href="/prestamos"
            className="px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium text-sm hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={saving || !empleadoId || !montoTotal || !cuotaQuincenal}
            className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors disabled:opacity-50 shadow-sm"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? "Guardando..." : "Registrar Préstamo"}
          </button>
        </div>
      </form>
    </div>
  );
}
