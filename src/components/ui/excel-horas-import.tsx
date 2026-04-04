"use client";

import { useState, useCallback } from "react";
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle, X, Download, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";
import { formatCurrency } from "@/lib/utils";
import type { Empleado, Quincena } from "@/types";

// ─── Constants ───────────────────────────────────────────────────────────────

const HORAS_REGULARES_QUINCENA = 88;
const FACTOR_EXTRA_25 = 1.25; // Primeras 2 horas extras diarias
const FACTOR_EXTRA_35 = 1.35; // Horas extras posteriores
const MAX_HORAS_25_POR_DIA = 2;

// ─── Types ───────────────────────────────────────────────────────────────────

interface ExcelRow {
  nombre?: string;
  apellido?: string;
  cargo?: string;
  sucursal?: string;
  tiempo_trabajado?: number;
}

interface HorasExtraCalc {
  empleado_id: string;
  nombre: string;
  apellido: string;
  cargo: string;
  sucursal: string;
  sueldo_quincenal: number;
  tarifa_hora: number;
  tiempo_trabajado: number;
  horas_regulares: number;
  horas_extras_total: number;
  horas_extras_25: number;
  horas_extras_35: number;
  monto_extras_25: number;
  monto_extras_35: number;
  monto_extras_total: number;
  matched: boolean;
  matchError?: string;
}

interface ExcelHorasImportProps {
  empleados: Empleado[];
  quincena: Quincena;
  onApply: (items: HorasExtraCalc[]) => Promise<void>;
  onClose: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalizeStr(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function matchEmpleado(
  row: ExcelRow,
  empleados: Empleado[]
): { empleado: Empleado | null; error?: string } {
  const rowNombre = normalizeStr(row.nombre || "");
  const rowApellido = normalizeStr(row.apellido || "");

  if (!rowNombre && !rowApellido) {
    return { empleado: null, error: "Falta nombre y apellido" };
  }

  // Try exact match first
  let match = empleados.find(
    (e) =>
      normalizeStr(e.nombre) === rowNombre &&
      normalizeStr(e.apellido) === rowApellido
  );

  // Try partial match (contains)
  if (!match) {
    match = empleados.find(
      (e) =>
        normalizeStr(e.nombre).includes(rowNombre) &&
        normalizeStr(e.apellido).includes(rowApellido)
    );
  }

  // Try reverse partial match
  if (!match) {
    match = empleados.find(
      (e) =>
        rowNombre.includes(normalizeStr(e.nombre)) &&
        rowApellido.includes(normalizeStr(e.apellido))
    );
  }

  if (!match) {
    return { empleado: null, error: `No se encontró: ${row.nombre} ${row.apellido}` };
  }

  return { empleado: match };
}

function calcularHorasExtras(
  tiempoTrabajado: number,
  tarifaHora: number,
  diasHabiles: number
): {
  horas_extras_total: number;
  horas_extras_25: number;
  horas_extras_35: number;
  monto_extras_25: number;
  monto_extras_35: number;
  monto_extras_total: number;
} {
  const horasExtrasTotal = Math.max(0, tiempoTrabajado - HORAS_REGULARES_QUINCENA);

  if (horasExtrasTotal === 0) {
    return {
      horas_extras_total: 0,
      horas_extras_25: 0,
      horas_extras_35: 0,
      monto_extras_25: 0,
      monto_extras_35: 0,
      monto_extras_total: 0,
    };
  }

  // Distribución: primeras 2 horas extras por día hábil van al 25%, el resto al 35%
  const maxHoras25 = diasHabiles * MAX_HORAS_25_POR_DIA;
  const horas25 = Math.min(horasExtrasTotal, maxHoras25);
  const horas35 = Math.max(0, horasExtrasTotal - maxHoras25);

  // Cálculo de montos:
  // 25% sobre salario ordinario = tarifa_hora × 1.25
  // 35% sobre salario ordinario = tarifa_hora × 1.35
  const monto25 = Math.round(horas25 * tarifaHora * FACTOR_EXTRA_25 * 100) / 100;
  const monto35 = Math.round(horas35 * tarifaHora * FACTOR_EXTRA_35 * 100) / 100;

  return {
    horas_extras_total: horasExtrasTotal,
    horas_extras_25: horas25,
    horas_extras_35: horas35,
    monto_extras_25: monto25,
    monto_extras_35: monto35,
    monto_extras_total: Math.round((monto25 + monto35) * 100) / 100,
  };
}

// ─── Column name mapping ─────────────────────────────────────────────────────

function findColumn(headers: string[], candidates: string[]): string | null {
  for (const header of headers) {
    const normalized = normalizeStr(header);
    for (const candidate of candidates) {
      if (normalized.includes(candidate)) return header;
    }
  }
  return null;
}

function parseExcelRows(worksheet: XLSX.WorkSheet): ExcelRow[] {
  const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet);
  if (jsonData.length === 0) return [];

  const headers = Object.keys(jsonData[0]);

  const colNombre = findColumn(headers, ["nombre"]);
  const colApellido = findColumn(headers, ["apellido"]);
  const colCargo = findColumn(headers, ["cargo", "posicion", "puesto"]);
  const colSucursal = findColumn(headers, ["sucursal", "branch", "sede", "oficina"]);
  const colTiempo = findColumn(headers, ["tiempo trabajado", "tiempo_trabajado", "horas trabajadas", "horas_trabajadas", "horas", "total horas", "total_horas"]);

  if (!colNombre || !colApellido || !colTiempo) {
    throw new Error(
      `Columnas requeridas no encontradas. Se necesitan: Nombre, Apellido, Tiempo Trabajado. ` +
      `Encontradas: ${headers.join(", ")}`
    );
  }

  return jsonData.map((row) => ({
    nombre: String(row[colNombre] || "").trim(),
    apellido: String(row[colApellido] || "").trim(),
    cargo: colCargo ? String(row[colCargo] || "").trim() : "",
    sucursal: colSucursal ? String(row[colSucursal] || "").trim() : "",
    tiempo_trabajado: Number(row[colTiempo]) || 0,
  }));
}

// ─── Template download ───────────────────────────────────────────────────────

function downloadTemplate(empleados: Empleado[]) {
  const data = empleados
    .filter((e) => e.estado === "activo")
    .map((e) => ({
      Nombre: e.nombre,
      Apellido: e.apellido,
      Cargo: e.cargo || "",
      Sucursal: "",
      "Tiempo Trabajado": 88,
    }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Horas Trabajadas");
  XLSX.writeFile(wb, "Plantilla_Horas_Trabajadas.xlsx");
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ExcelHorasImport({
  empleados,
  quincena,
  onApply,
  onClose,
}: ExcelHorasImportProps) {
  const [step, setStep] = useState<"upload" | "preview" | "applying">("upload");
  const [fileName, setFileName] = useState("");
  const [results, setResults] = useState<HorasExtraCalc[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const diasHabiles = quincena.dias_habiles || 11;

  const processFile = useCallback(
    (file: File) => {
      setError(null);
      setFileName(file.name);

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows = parseExcelRows(firstSheet);

          if (rows.length === 0) {
            setError("El archivo no contiene datos");
            return;
          }

          const processed: HorasExtraCalc[] = rows.map((row) => {
            const { empleado, error: matchErr } = matchEmpleado(row, empleados);
            const tarifa = empleado?.tarifa_hora || 0;
            const sueldo = empleado?.sueldo_quincenal || 0;
            const tiempo = row.tiempo_trabajado || 0;

            const extras = calcularHorasExtras(tiempo, tarifa, diasHabiles);

            return {
              empleado_id: empleado?.id || "",
              nombre: row.nombre || "",
              apellido: row.apellido || "",
              cargo: row.cargo || empleado?.cargo || "",
              sucursal: row.sucursal || "",
              sueldo_quincenal: sueldo,
              tarifa_hora: tarifa,
              tiempo_trabajado: tiempo,
              horas_regulares: Math.min(tiempo, HORAS_REGULARES_QUINCENA),
              ...extras,
              matched: !!empleado,
              matchError: matchErr,
            };
          });

          setResults(processed);
          setStep("preview");
        } catch (err) {
          setError(err instanceof Error ? err.message : "Error al leer el archivo");
        }
      };
      reader.readAsArrayBuffer(file);
    },
    [empleados, diasHabiles]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  async function handleApply() {
    const validItems = results.filter((r) => r.matched && r.horas_extras_total > 0);
    if (validItems.length === 0) {
      setError("No hay horas extras válidas para aplicar");
      return;
    }
    setStep("applying");
    try {
      await onApply(validItems);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al aplicar");
      setStep("preview");
    }
  }

  const totalEmpleados = results.length;
  const totalMatched = results.filter((r) => r.matched).length;
  const totalConExtras = results.filter((r) => r.horas_extras_total > 0).length;
  const totalMontoExtras = results.reduce((s, r) => s + r.monto_extras_total, 0);
  const totalHorasExtras = results.reduce((s, r) => s + r.horas_extras_total, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-50 rounded-lg">
              <FileSpreadsheet className="h-5 w-5 text-cyan-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Importar Horas Trabajadas
              </h2>
              <p className="text-sm text-gray-500">
                Quincena: {quincena.periodo_inicio} — {quincena.periodo_fin}
                {" | "}Límite regular: {HORAS_REGULARES_QUINCENA}h | Días hábiles: {diasHabiles}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {step === "upload" && (
            <div className="space-y-4">
              {/* Info box */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                <p className="font-semibold mb-2">Formato del Excel:</p>
                <ul className="list-disc ml-5 space-y-1">
                  <li><strong>Nombre</strong> — Nombre del empleado</li>
                  <li><strong>Apellido</strong> — Apellido del empleado</li>
                  <li><strong>Cargo</strong> — Cargo (opcional)</li>
                  <li><strong>Sucursal</strong> — Sucursal (opcional)</li>
                  <li><strong>Tiempo Trabajado</strong> — Total de horas trabajadas en la quincena</li>
                </ul>
                <p className="mt-3 text-blue-700">
                  <strong>Cálculo automático:</strong> A partir de la hora 89, se calculan horas extras.
                  Primeras 2h/día al 25% ({formatCurrency(0)} + 25% sobre tarifa hora).
                  Horas adicionales al 35% sobre tarifa hora.
                </p>
              </div>

              {/* Template download */}
              <button
                onClick={() => downloadTemplate(empleados)}
                className="inline-flex items-center gap-2 text-sm text-cyan-600 hover:text-cyan-700 font-medium"
              >
                <Download className="h-4 w-4" />
                Descargar plantilla con empleados activos
              </button>

              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
                  dragActive
                    ? "border-cyan-500 bg-cyan-50"
                    : "border-gray-300 hover:border-gray-400"
                }`}
              >
                <Upload className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 font-medium">
                  Arrastra el archivo Excel aquí
                </p>
                <p className="text-sm text-gray-400 mt-1">o</p>
                <label className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg cursor-pointer text-sm font-medium transition-colors">
                  <FileSpreadsheet className="h-4 w-4" />
                  Seleccionar archivo
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileInput}
                    className="hidden"
                  />
                </label>
                <p className="text-xs text-gray-400 mt-3">
                  Formatos: .xlsx, .xls, .csv
                </p>
              </div>
            </div>
          )}

          {step === "preview" && (
            <div className="space-y-4">
              {/* Summary cards */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Empleados en Excel</p>
                  <p className="text-xl font-bold text-gray-900">{totalEmpleados}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Matched</p>
                  <p className="text-xl font-bold text-green-600">{totalMatched}</p>
                </div>
                <div className="bg-orange-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Con Extras</p>
                  <p className="text-xl font-bold text-orange-600">{totalConExtras}</p>
                </div>
                <div className="bg-cyan-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Total H. Extras</p>
                  <p className="text-xl font-bold text-cyan-600">{totalHorasExtras.toFixed(1)}h</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Monto Total Extras</p>
                  <p className="text-xl font-bold text-blue-600">{formatCurrency(totalMontoExtras)}</p>
                </div>
              </div>

              {/* File info */}
              <p className="text-sm text-gray-500">
                Archivo: <span className="font-medium text-gray-700">{fileName}</span>
              </p>

              {/* Table */}
              <div className="overflow-x-auto border border-gray-200 rounded-xl">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left px-3 py-2.5 font-medium text-gray-500">Estado</th>
                      <th className="text-left px-3 py-2.5 font-medium text-gray-500">Empleado</th>
                      <th className="text-left px-3 py-2.5 font-medium text-gray-500">Cargo</th>
                      <th className="text-right px-3 py-2.5 font-medium text-gray-500">Tarifa/h</th>
                      <th className="text-right px-3 py-2.5 font-medium text-gray-500">Tiempo Trab.</th>
                      <th className="text-right px-3 py-2.5 font-medium text-gray-500">H. Regulares</th>
                      <th className="text-right px-3 py-2.5 font-medium text-gray-500">H. Extra Total</th>
                      <th className="text-right px-3 py-2.5 font-medium text-gray-500">H. al 25%</th>
                      <th className="text-right px-3 py-2.5 font-medium text-gray-500">H. al 35%</th>
                      <th className="text-right px-3 py-2.5 font-medium text-gray-500">Monto 25%</th>
                      <th className="text-right px-3 py-2.5 font-medium text-gray-500">Monto 35%</th>
                      <th className="text-right px-3 py-2.5 font-medium text-gray-500 bg-gray-100">Total Extras</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {results.map((r, i) => (
                      <tr
                        key={i}
                        className={
                          !r.matched
                            ? "bg-red-50/50"
                            : r.horas_extras_total > 0
                            ? "bg-orange-50/30"
                            : ""
                        }
                      >
                        <td className="px-3 py-2">
                          {r.matched ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <span title={r.matchError}>
                              <AlertTriangle className="h-4 w-4 text-red-500" />
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 font-medium">
                          {r.nombre} {r.apellido}
                          {!r.matched && (
                            <span className="block text-xs text-red-500">{r.matchError}</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-gray-500">{r.cargo}</td>
                        <td className="px-3 py-2 text-right font-mono">{formatCurrency(r.tarifa_hora)}</td>
                        <td className="px-3 py-2 text-right font-mono font-medium">
                          {r.tiempo_trabajado}h
                        </td>
                        <td className="px-3 py-2 text-right font-mono">{r.horas_regulares}h</td>
                        <td className="px-3 py-2 text-right font-mono font-medium">
                          {r.horas_extras_total > 0 ? (
                            <span className="text-orange-600">{r.horas_extras_total}h</span>
                          ) : (
                            "0h"
                          )}
                        </td>
                        <td className="px-3 py-2 text-right font-mono">{r.horas_extras_25}h</td>
                        <td className="px-3 py-2 text-right font-mono">{r.horas_extras_35}h</td>
                        <td className="px-3 py-2 text-right font-mono">{formatCurrency(r.monto_extras_25)}</td>
                        <td className="px-3 py-2 text-right font-mono">{formatCurrency(r.monto_extras_35)}</td>
                        <td className="px-3 py-2 text-right font-mono font-bold bg-gray-50">
                          {r.monto_extras_total > 0 ? (
                            <span className="text-blue-600">{formatCurrency(r.monto_extras_total)}</span>
                          ) : (
                            formatCurrency(0)
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-300 bg-gray-50 font-semibold">
                      <td colSpan={4} className="px-3 py-2">TOTALES</td>
                      <td className="px-3 py-2 text-right font-mono">
                        {results.reduce((s, r) => s + r.tiempo_trabajado, 0).toFixed(1)}h
                      </td>
                      <td className="px-3 py-2 text-right font-mono">
                        {results.reduce((s, r) => s + r.horas_regulares, 0).toFixed(1)}h
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-orange-600">
                        {totalHorasExtras.toFixed(1)}h
                      </td>
                      <td className="px-3 py-2 text-right font-mono">
                        {results.reduce((s, r) => s + r.horas_extras_25, 0).toFixed(1)}h
                      </td>
                      <td className="px-3 py-2 text-right font-mono">
                        {results.reduce((s, r) => s + r.horas_extras_35, 0).toFixed(1)}h
                      </td>
                      <td className="px-3 py-2 text-right font-mono">
                        {formatCurrency(results.reduce((s, r) => s + r.monto_extras_25, 0))}
                      </td>
                      <td className="px-3 py-2 text-right font-mono">
                        {formatCurrency(results.reduce((s, r) => s + r.monto_extras_35, 0))}
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-bold text-blue-600 bg-gray-100">
                        {formatCurrency(totalMontoExtras)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-orange-100 border border-orange-300" /> Con horas extras
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-red-100 border border-red-300" /> No encontrado en sistema
                </span>
                <span>
                  <strong>25%:</strong> Primeras {MAX_HORAS_25_POR_DIA}h extras/día ({diasHabiles} días = máx {diasHabiles * MAX_HORAS_25_POR_DIA}h)
                </span>
                <span>
                  <strong>35%:</strong> Horas extras adicionales
                </span>
              </div>
            </div>
          )}

          {step === "applying" && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-cyan-500 mb-3" />
              <p className="text-gray-600 font-medium">Aplicando horas extras a la nómina...</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 flex items-center justify-between bg-gray-50">
          <div>
            {step === "preview" && (
              <button
                onClick={() => { setStep("upload"); setResults([]); setError(null); }}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Subir otro archivo
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancelar
            </button>
            {step === "preview" && (
              <button
                onClick={handleApply}
                disabled={totalConExtras === 0}
                className="px-5 py-2 bg-cyan-500 hover:bg-cyan-600 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Aplicar {totalConExtras} empleado{totalConExtras !== 1 ? "s" : ""} con extras ({formatCurrency(totalMontoExtras)})
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
