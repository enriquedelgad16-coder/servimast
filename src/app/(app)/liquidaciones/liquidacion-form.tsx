"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calculator, Save, Loader2, FileText, Printer, UserX } from "lucide-react";
import { generatePDFReport } from "@/lib/pdf-utils";
import { createClient } from "@/lib/supabase/client";
import { calcularLiquidacion } from "@/lib/calculations/liquidacion";
import type { LiquidacionResult } from "@/lib/calculations/liquidacion";
import type { MotivoLiquidacion } from "@/types";
import { formatCurrency } from "@/lib/utils";

interface EmpleadoOption {
  id: string;
  nombre: string;
  apellido: string;
  numero_empleado: string;
  fecha_ingreso: string;
  sueldo_quincenal: number;
  estado: string;
}

interface Props {
  empleados: EmpleadoOption[];
  preselectedEmpleadoId?: string;
}

const MOTIVO_OPTIONS: { value: MotivoLiquidacion; label: string }[] = [
  { value: "despido_sin_causa", label: "Despido sin causa justificada" },
  { value: "renuncia", label: "Renuncia voluntaria" },
  { value: "mutuo_acuerdo", label: "Mutuo acuerdo" },
  { value: "fin_contrato", label: "Fin de contrato" },
];

export function LiquidacionForm({ empleados, preselectedEmpleadoId }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [empleadoId, setEmpleadoId] = useState(preselectedEmpleadoId || "");
  const [fechaSalida, setFechaSalida] = useState("");
  const [motivo, setMotivo] = useState<MotivoLiquidacion | "">("");
  const [salariosPendientes, setSalariosPendientes] = useState(0);
  const [notas, setNotas] = useState("");
  const [resultado, setResultado] = useState<LiquidacionResult | null>(null);

  const selectedEmpleado = useMemo(
    () => empleados.find((e) => e.id === empleadoId) || null,
    [empleados, empleadoId]
  );

  const sueldoMensual = selectedEmpleado ? selectedEmpleado.sueldo_quincenal * 2 : 0;

  function handleCalcular() {
    if (!selectedEmpleado || !fechaSalida || !motivo) {
      setError("Seleccione empleado, fecha de salida y motivo.");
      return;
    }

    setError(null);

    const result = calcularLiquidacion({
      fecha_ingreso: new Date(selectedEmpleado.fecha_ingreso),
      fecha_salida: new Date(fechaSalida),
      sueldo_mensual: sueldoMensual,
      motivo: motivo as MotivoLiquidacion,
      monto_salarios_pendientes: salariosPendientes,
    });

    setResultado(result);
  }

  async function handleGuardar() {
    if (!resultado || !selectedEmpleado || !motivo) return;

    setSaving(true);
    setError(null);

    try {
      const supabase = createClient();

      const { error: insertError } = await supabase
        .from("liquidaciones")
        .insert({
          empleado_id: selectedEmpleado.id,
          fecha_ingreso: selectedEmpleado.fecha_ingreso,
          fecha_salida: fechaSalida,
          anos_trabajados: resultado.anos_trabajados,
          meses_trabajados: resultado.meses_trabajados,
          motivo,
          sueldo_mensual: sueldoMensual,
          sueldo_diario: resultado.sueldo_diario,
          dias_preaviso: resultado.dias_preaviso,
          monto_preaviso: resultado.monto_preaviso,
          dias_cesantia: resultado.dias_cesantia,
          monto_cesantia: resultado.monto_cesantia,
          dias_vacaciones_proporcionales: resultado.dias_vacaciones_proporcionales,
          monto_vacaciones: resultado.monto_vacaciones,
          meses_regalia: resultado.meses_regalia,
          monto_regalia: resultado.monto_regalia,
          monto_salarios_pendientes: resultado.monto_salarios_pendientes,
          total_liquidacion: resultado.total_liquidacion,
          notas: notas || null,
        });

      if (insertError) throw insertError;

      // Also deactivate the employee
      await supabase.from("empleados").update({ estado: "desvinculado" }).eq("id", selectedEmpleado.id);

      router.push("/liquidaciones");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar la liquidacion");
    } finally {
      setSaving(false);
    }
  }

  function handleExportPDF() {
    if (!resultado || !selectedEmpleado) return;
    const motivoLabel = MOTIVO_OPTIONS.find((m) => m.value === motivo)?.label || motivo;
    const columns = ["Concepto", "Detalle", "Monto (RD$)"];
    const data: (string | number)[][] = [
      ["Preaviso (Art. 76 CT)", `${resultado.dias_preaviso} días`, resultado.monto_preaviso],
      ["Cesantía (Art. 80 CT)", `${resultado.dias_cesantia} días`, resultado.monto_cesantia],
      ["Vacaciones Proporcionales (Art. 177 CT)", `${resultado.dias_vacaciones_proporcionales} días`, resultado.monto_vacaciones],
      ["Regalía Pascual Proporcional (Art. 219 CT)", `${resultado.meses_regalia} meses`, resultado.monto_regalia],
    ];
    if (resultado.monto_salarios_pendientes > 0) {
      data.push(["Salarios Pendientes", "", resultado.monto_salarios_pendientes]);
    }
    const totals: (string | number)[] = ["TOTAL LIQUIDACIÓN", "", resultado.total_liquidacion];
    generatePDFReport({
      title: "Liquidación Laboral",
      subtitle: `${selectedEmpleado.nombre} ${selectedEmpleado.apellido} (${selectedEmpleado.numero_empleado}) — ${motivoLabel}`,
      periodo: `Ingreso: ${selectedEmpleado.fecha_ingreso} | Salida: ${fechaSalida}`,
      columns, data, totals,
      fileName: `Liquidacion_${selectedEmpleado.numero_empleado}_${fechaSalida}.pdf`,
    });
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/liquidaciones"
          className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nueva Liquidacion</h1>
          <p className="text-gray-500 text-sm mt-1">
            Calculo de prestaciones laborales segun Codigo de Trabajo RD
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-danger-50 border border-danger-200 rounded-lg text-danger-600 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Formulario */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5 text-cyan-500" />
            Datos de la Liquidacion
          </h2>

          <div className="space-y-4">
            {/* Empleado */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Empleado *
              </label>
              <select
                value={empleadoId}
                onChange={(e) => {
                  setEmpleadoId(e.target.value);
                  setResultado(null);
                }}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
              >
                <option value="">Seleccionar empleado...</option>
                {empleados.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.apellido}, {emp.nombre} ({emp.numero_empleado})
                  </option>
                ))}
              </select>
            </div>

            {/* Info del empleado seleccionado */}
            {selectedEmpleado && (
              <div className="bg-gray-50 rounded-lg p-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Fecha Ingreso:</span>
                  <span className="font-medium text-gray-900">{selectedEmpleado.fecha_ingreso}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Sueldo Quincenal:</span>
                  <span className="font-medium text-gray-900">{formatCurrency(selectedEmpleado.sueldo_quincenal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Sueldo Mensual:</span>
                  <span className="font-semibold text-orange-600">{formatCurrency(sueldoMensual)}</span>
                </div>
              </div>
            )}

            {/* Fecha de Salida */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha de Salida *
              </label>
              <input
                type="date"
                value={fechaSalida}
                onChange={(e) => {
                  setFechaSalida(e.target.value);
                  setResultado(null);
                }}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
              />
            </div>

            {/* Motivo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Motivo de Terminacion *
              </label>
              <select
                value={motivo}
                onChange={(e) => {
                  setMotivo(e.target.value as MotivoLiquidacion);
                  setResultado(null);
                }}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
              >
                <option value="">Seleccionar motivo...</option>
                {MOTIVO_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Salarios Pendientes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Salarios Pendientes (RD$)
              </label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={salariosPendientes}
                onChange={(e) => {
                  setSalariosPendientes(parseFloat(e.target.value) || 0);
                  setResultado(null);
                }}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
              />
            </div>

            {/* Notas */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notas
              </label>
              <textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                rows={3}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none resize-none"
                placeholder="Observaciones adicionales..."
              />
            </div>

            {/* Boton Calcular */}
            <button
              type="button"
              onClick={handleCalcular}
              className="w-full inline-flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-600 text-white font-semibold px-4 py-2.5 rounded-lg transition-colors shadow-sm"
            >
              <Calculator className="h-5 w-5" />
              Calcular Liquidacion
            </button>
          </div>
        </div>

        {/* Vista Previa */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calculator className="h-5 w-5 text-orange-500" />
            Desglose de Liquidacion
          </h2>

          {!resultado ? (
            <div className="text-center py-12 text-gray-400">
              <Calculator className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>Complete los datos y presione &quot;Calcular&quot;</p>
              <p className="text-sm mt-1">para ver el desglose de la liquidacion</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Tiempo trabajado */}
              <div className="bg-gray-50 rounded-lg p-3 text-sm">
                <p className="font-medium text-gray-900 mb-1">Tiempo Trabajado</p>
                <p className="text-gray-600">
                  {resultado.anos_trabajados} ano{resultado.anos_trabajados !== 1 ? "s" : ""},{" "}
                  {resultado.meses_trabajados % 12} mes{(resultado.meses_trabajados % 12) !== 1 ? "es" : ""}
                  {" "}({resultado.meses_trabajados} meses totales)
                </p>
                <p className="text-gray-500 mt-1">
                  Sueldo diario: {formatCurrency(resultado.sueldo_diario)}
                </p>
              </div>

              {/* Desglose */}
              <div className="divide-y divide-gray-100">
                <ResultRow
                  label="Preaviso"
                  dias={resultado.dias_preaviso}
                  monto={resultado.monto_preaviso}
                  sublabel="Art. 76 CT"
                />
                <ResultRow
                  label="Cesantia"
                  dias={resultado.dias_cesantia}
                  monto={resultado.monto_cesantia}
                  sublabel="Art. 80 CT"
                />
                <ResultRow
                  label="Vacaciones Proporcionales"
                  dias={resultado.dias_vacaciones_proporcionales}
                  monto={resultado.monto_vacaciones}
                  sublabel="Art. 177 CT"
                />
                <ResultRow
                  label="Regalia Pascual Proporcional"
                  meses={resultado.meses_regalia}
                  monto={resultado.monto_regalia}
                  sublabel="Art. 219 CT"
                />
                {resultado.monto_salarios_pendientes > 0 && (
                  <ResultRow
                    label="Salarios Pendientes"
                    monto={resultado.monto_salarios_pendientes}
                  />
                )}
              </div>

              {/* Total */}
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex justify-between items-center">
                <span className="text-lg font-bold text-gray-900">TOTAL LIQUIDACION</span>
                <span className="text-xl font-bold text-orange-600 font-mono">
                  {formatCurrency(resultado.total_liquidacion)}
                </span>
              </div>

              {/* Action buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleExportPDF}
                  className="inline-flex items-center justify-center gap-2 bg-red-50 text-red-600 font-medium px-4 py-2.5 rounded-lg hover:bg-red-100 transition-colors text-sm"
                >
                  <FileText className="h-4 w-4" /> Exportar PDF
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center justify-center gap-2 bg-gray-100 text-gray-600 font-medium px-4 py-2.5 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                >
                  <Printer className="h-4 w-4" /> Imprimir
                </button>
              </div>
              <button
                type="button"
                onClick={handleGuardar}
                disabled={saving}
                className="w-full inline-flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-semibold px-4 py-2.5 rounded-lg transition-colors shadow-sm"
              >
                {saving ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <UserX className="h-5 w-5" />
                )}
                {saving ? "Procesando..." : "Guardar y Desvincular Empleado"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ResultRow({
  label,
  dias,
  meses,
  monto,
  sublabel,
}: {
  label: string;
  dias?: number;
  meses?: number;
  monto: number;
  sublabel?: string;
}) {
  return (
    <div className="flex justify-between items-center py-3">
      <div>
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-xs text-gray-400">
          {sublabel && <span>{sublabel}</span>}
          {dias !== undefined && <span> — {dias} dias</span>}
          {meses !== undefined && <span> — {meses} meses</span>}
        </p>
      </div>
      <span className="text-sm font-mono font-semibold text-gray-900">
        {formatCurrency(monto)}
      </span>
    </div>
  );
}
