"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Save, Loader2, ArrowLeft, Calculator, Printer, Upload, CheckCircle } from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import jsPDF from "jspdf";
import type { Empleado } from "@/types";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

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

  // Post-save receipt state
  const [savedPrestamoId, setSavedPrestamoId] = useState<string | null>(null);
  const [markingFirmado, setMarkingFirmado] = useState(false);
  const [firmado, setFirmado] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      const { data: insertData, error: insertError } = await supabase
        .from("prestamos")
        .insert({
          empleado_id: empleadoId,
          monto_total: Number(montoTotal),
          cuota_quincenal: Number(cuotaQuincenal),
          saldo_pendiente: Number(montoTotal),
          fecha_inicio: fechaInicio,
          estado: "activo",
          numero_cuotas_estimado: cuotasEstimadas,
          numero_cuotas_pagadas: 0,
          notas: notas || null,
        })
        .select("id")
        .single();

      if (insertError) throw insertError;

      setSavedPrestamoId(insertData.id);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Error al guardar préstamo"
      );
    } finally {
      setSaving(false);
    }
  }

  const selectedEmpleado = empleados.find((e) => e.id === empleadoId);

  async function generateReciboPDF() {
    if (!selectedEmpleado) return;
    setGeneratingPdf(true);
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
      const pageWidth = doc.internal.pageSize.getWidth();

      // Load logo
      let logoImg: HTMLImageElement | null = null;
      try {
        logoImg = await loadImage("/logo-servimast.jpg");
      } catch {
        // Continue without logo
      }

      // Header with logo
      if (logoImg) {
        doc.addImage(logoImg, "JPEG", 14, 10, 22, 22);
      }

      const headerX = logoImg ? 40 : 14;
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("SERVIMAST", headerX, 20);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100);
      doc.text("Sistema de Seguridad y Redes", headerX, 26);
      doc.text("RNC: 000-00000-0 | Tel: (809) 000-0000", headerX, 31);

      // Divider line
      doc.setDrawColor(0, 188, 212);
      doc.setLineWidth(0.8);
      doc.line(14, 38, pageWidth - 14, 38);

      // Title
      doc.setTextColor(0);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("RECIBO DE PRÉSTAMO", pageWidth / 2, 50, { align: "center" });

      // Date
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100);
      const today = new Date();
      const dateStr = today.toLocaleDateString("es-DO", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
      doc.text(`Fecha: ${dateStr}`, pageWidth - 14, 50, { align: "right" });

      // Employee details section
      let y = 64;
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0);
      doc.text("DATOS DEL EMPLEADO", 14, y);
      y += 2;
      doc.setDrawColor(200);
      doc.setLineWidth(0.3);
      doc.line(14, y, pageWidth - 14, y);
      y += 8;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const empNombre = `${selectedEmpleado.nombre} ${selectedEmpleado.apellido}`;
      const details = [
        ["Nombre:", empNombre],
        ["No. Empleado:", selectedEmpleado.numero_empleado || "—"],
        ["Cédula:", selectedEmpleado.cedula || "—"],
        ["Departamento:", selectedEmpleado.departamento || "—"],
      ];

      for (const [label, value] of details) {
        doc.setFont("helvetica", "bold");
        doc.text(label, 18, y);
        doc.setFont("helvetica", "normal");
        doc.text(value, 55, y);
        y += 7;
      }

      // Loan details section
      y += 6;
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("DETALLES DEL PRÉSTAMO", 14, y);
      y += 2;
      doc.line(14, y, pageWidth - 14, y);
      y += 8;

      doc.setFontSize(10);
      const loanDetails = [
        ["Monto Total:", formatCurrency(Number(montoTotal))],
        ["Cuota Quincenal:", formatCurrency(Number(cuotaQuincenal))],
        ["Cuotas Estimadas:", cuotasEstimadas ? `${cuotasEstimadas} quincenas` : "—"],
        ["Fecha de Inicio:", fechaInicio],
      ];

      for (const [label, value] of loanDetails) {
        doc.setFont("helvetica", "bold");
        doc.text(label, 18, y);
        doc.setFont("helvetica", "normal");
        doc.text(value, 65, y);
        y += 7;
      }

      if (notas) {
        y += 2;
        doc.setFont("helvetica", "bold");
        doc.text("Notas:", 18, y);
        y += 6;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        const splitNotas = doc.splitTextToSize(notas, pageWidth - 40);
        doc.text(splitNotas, 18, y);
        y += splitNotas.length * 5;
      }

      // Declaration
      y += 12;
      doc.setDrawColor(0, 188, 212);
      doc.setLineWidth(0.5);
      doc.line(14, y - 4, pageWidth - 14, y - 4);
      y += 4;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0);
      const declaration = `Yo, ${empNombre}, declaro haber recibido la cantidad de ${formatCurrency(Number(montoTotal))} en concepto de préstamo, el cual me comprometo a pagar en cuotas quincenales de ${formatCurrency(Number(cuotaQuincenal))}.`;
      const splitDeclaration = doc.splitTextToSize(declaration, pageWidth - 32);
      doc.text(splitDeclaration, 16, y);
      y += splitDeclaration.length * 6 + 30;

      // Signature line
      doc.setDrawColor(0);
      doc.setLineWidth(0.4);
      doc.line(pageWidth / 2 - 45, y, pageWidth / 2 + 45, y);
      y += 5;
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("Firma del Empleado", pageWidth / 2, y, { align: "center" });
      y += 5;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100);
      doc.text(empNombre, pageWidth / 2, y, { align: "center" });

      // Date line at bottom
      y += 15;
      doc.setTextColor(0);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`Fecha: ________________________`, 14, y);

      // Footer
      const pageHeight = doc.internal.pageSize.getHeight();
      doc.setFontSize(7);
      doc.setTextColor(150);
      doc.text(
        "SERVIMAST - Sistema de Gestión de Nómina",
        pageWidth / 2,
        pageHeight - 8,
        { align: "center" }
      );

      doc.save(`Recibo_Prestamo_${selectedEmpleado.numero_empleado || "emp"}_${today.toISOString().split("T")[0]}.pdf`);
    } catch (err) {
      console.error("Error generating PDF:", err);
    } finally {
      setGeneratingPdf(false);
    }
  }

  async function handleMarcarFirmado() {
    if (!savedPrestamoId) return;
    setMarkingFirmado(true);
    try {
      const supabase = createClient();
      await supabase
        .from("prestamos")
        .update({
          recibo_firmado: true,
          recibo_fecha_firma: new Date().toISOString(),
        })
        .eq("id", savedPrestamoId);
      setFirmado(true);
    } catch (err) {
      console.error("Error marking as signed:", err);
    } finally {
      setMarkingFirmado(false);
    }
  }

  async function handleUploadRecibo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !savedPrestamoId) return;
    setUploading(true);
    try {
      const supabase = createClient();
      const fileExt = file.name.split(".").pop();
      const filePath = `${savedPrestamoId}/recibo_firmado.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("recibos-prestamos")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("recibos-prestamos")
        .getPublicUrl(filePath);

      const imageUrl = urlData.publicUrl;

      try {
        await supabase
          .from("prestamos")
          .update({ recibo_imagen_url: imageUrl })
          .eq("id", savedPrestamoId);
      } catch (err) {
        console.error("Error saving image URL to prestamo:", err);
      }

      setUploadedUrl(imageUrl);
    } catch (err) {
      console.error("Error uploading receipt:", err);
      setError("Error al subir la imagen del recibo.");
    } finally {
      setUploading(false);
    }
  }

  // Show success/receipt UI after saving
  if (savedPrestamoId) {
    return (
      <div>
        <div className="flex items-center gap-4 mb-6">
          <div className="p-2 bg-green-100 rounded-lg">
            <CheckCircle className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Préstamo Registrado
            </h1>
            <p className="text-gray-500 text-sm">
              Préstamo registrado exitosamente
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm mb-6">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">
                Préstamo registrado exitosamente
              </p>
              <p className="text-sm text-gray-500">
                {selectedEmpleado
                  ? `${selectedEmpleado.nombre} ${selectedEmpleado.apellido}`
                  : ""}{" "}
                — {formatCurrency(Number(montoTotal))}
              </p>
            </div>
          </div>

          {/* Resumen */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Monto Total</p>
              <p className="font-semibold text-gray-900 font-mono">
                {formatCurrency(Number(montoTotal))}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Cuota Quincenal</p>
              <p className="font-semibold text-gray-900 font-mono">
                {formatCurrency(Number(cuotaQuincenal))}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Cuotas Estimadas</p>
              <p className="font-semibold text-gray-900">
                {cuotasEstimadas ?? "—"}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Fecha Inicio</p>
              <p className="font-semibold text-gray-900">{fechaInicio}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <div className="flex flex-wrap gap-3">
              <button
                onClick={generateReciboPDF}
                disabled={generatingPdf}
                className="inline-flex items-center gap-2 bg-cyan-500 hover:bg-cyan-600 text-white font-semibold px-5 py-2.5 rounded-lg transition-colors disabled:opacity-50 shadow-sm"
              >
                {generatingPdf ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Printer className="h-4 w-4" />
                )}
                Imprimir Recibo
              </button>

              <button
                onClick={handleMarcarFirmado}
                disabled={markingFirmado || firmado}
                className={`inline-flex items-center gap-2 font-semibold px-5 py-2.5 rounded-lg transition-colors shadow-sm ${
                  firmado
                    ? "bg-green-100 text-green-700 border border-green-300 cursor-default"
                    : "bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-50"
                }`}
              >
                {markingFirmado ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                {firmado ? "Recibo Firmado" : "Marcar como Firmado"}
              </button>
            </div>

            {/* Upload signed receipt */}
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleUploadRecibo}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="inline-flex items-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium px-5 py-2.5 rounded-lg transition-colors disabled:opacity-50 shadow-sm"
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {uploading
                  ? "Subiendo..."
                  : uploadedUrl
                    ? "Cambiar Foto del Recibo"
                    : "Subir Foto del Recibo Firmado"}
              </button>
              {uploadedUrl && (
                <span className="text-sm text-green-600 flex items-center gap-1">
                  <CheckCircle className="h-4 w-4" />
                  Imagen subida
                </span>
              )}
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-200">
                {error}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end">
          <Link
            href="/prestamos"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium text-sm hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Ir a Préstamos
          </Link>
        </div>
      </div>
    );
  }

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
