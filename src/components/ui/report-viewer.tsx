"use client";

import { useState } from "react";
import { Download, Printer, FileSpreadsheet, FileText, X, Filter } from "lucide-react";
import { generatePDFReport } from "@/lib/pdf-utils";
import { formatCurrency } from "@/lib/utils";
import * as XLSX from "xlsx";

interface ReportViewerProps {
  title: string;
  subtitle?: string;
  periodo?: string;
  columns: { key: string; label: string; align?: "left" | "center" | "right" }[];
  data: Record<string, unknown>[];
  totals?: Record<string, unknown>;
  onClose?: () => void;
  filters?: React.ReactNode;
  onRowClick?: (row: Record<string, unknown>, index: number) => void;
  renderExpandedRow?: (row: Record<string, unknown>, index: number) => React.ReactNode;
  rowClickHint?: string;
}

export function ReportViewer({
  title,
  subtitle,
  periodo,
  columns,
  data,
  totals,
  onClose,
  filters,
  onRowClick,
  renderExpandedRow,
  rowClickHint,
}: ReportViewerProps) {
  const [showFilters, setShowFilters] = useState(false);

  function formatValue(val: unknown): string {
    if (val === null || val === undefined) return "—";
    if (typeof val === "number") {
      // Format monetary values with RD$ (values with decimals or >= 100)
      if (val >= 100 || String(val).includes(".")) {
        return formatCurrency(val);
      }
      return String(val);
    }
    return String(val);
  }

  function handleExportPDF() {
    const colLabels = columns.map((c) => c.label);
    const rows = data.map((row) =>
      columns.map((c) => {
        const val = row[c.key];
        return formatValue(val);
      })
    );
    const totalRow = totals
      ? columns.map((c) => {
          const val = totals[c.key];
          return formatValue(val);
        })
      : undefined;

    generatePDFReport({
      title,
      subtitle,
      periodo,
      columns: colLabels,
      data: rows,
      totals: totalRow,
      orientation: columns.length > 6 ? "landscape" : "portrait",
    });
  }

  function handleExportExcel() {
    const excelData = data.map((row) => {
      const obj: Record<string, unknown> = {};
      columns.forEach((c) => {
        const val = row[c.key];
        // Format numbers as RD$ strings in Excel too
        if (typeof val === "number" && (val >= 100 || String(val).includes("."))) {
          obj[c.label] = formatCurrency(val);
        } else {
          obj[c.label] = val ?? "";
        }
      });
      return obj;
    });

    if (totals) {
      const totalObj: Record<string, unknown> = {};
      columns.forEach((c) => {
        const val = totals[c.key];
        if (typeof val === "number" && (val >= 100 || String(val).includes("."))) {
          totalObj[c.label] = formatCurrency(val);
        } else {
          totalObj[c.label] = val ?? "";
        }
      });
      excelData.push(totalObj);
    }

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reporte");

    const colWidths = columns.map((c) => ({
      wch: Math.max(
        c.label.length + 4,
        ...data.map((row) => String(formatValue(row[c.key])).length + 2)
      ),
    }));
    ws["!cols"] = colWidths;

    const today = new Date().toISOString().split("T")[0];
    XLSX.writeFile(wb, `${title.replace(/\s+/g, "_")}_${today}.xlsx`);
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 px-4 py-3 bg-gray-50 print:hidden">
        <div>
          <h3 className="font-semibold text-gray-900 text-base sm:text-lg">{title}</h3>
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
          {periodo && (
            <p className="text-xs text-gray-400">Período: {periodo}</p>
          )}
          <p className="text-xs text-gray-400 mt-0.5">
            {data.length} registro{data.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {filters && (
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                showFilters
                  ? "bg-cyan-100 text-cyan-700"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              <Filter className="h-4 w-4" />
              Filtros
            </button>
          )}
          <button
            onClick={handleExportPDF}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
          >
            <FileText className="h-4 w-4" />
            PDF
          </button>
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-600 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Excel
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            <Printer className="h-4 w-4" />
            Imprimir
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      {showFilters && filters && (
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50/50 print:hidden">
          {filters}
        </div>
      )}

      {/* Print Header */}
      <div className="hidden print:block px-6 pt-6 pb-4 border-b-2 border-gray-800">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-servimast.jpg"
              alt="SERVIMAST"
              className="w-14 h-14 rounded-lg"
            />
            <div>
              <h1 className="text-xl font-bold text-gray-900">SERVIMAST</h1>
              <p className="text-xs text-gray-600">
                Sistema de Seguridad y Redes
              </p>
              <p className="text-[10px] text-gray-500">
                RNC: 000-00000-0 | Tel: (809) 000-0000
              </p>
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-base font-bold text-gray-900">{title}</h2>
            {subtitle && (
              <p className="text-xs text-gray-600">{subtitle}</p>
            )}
            {periodo && (
              <p className="text-xs text-gray-500">Período: {periodo}</p>
            )}
            <p className="text-[10px] text-gray-400 mt-1">
              Fecha: {new Date().toLocaleDateString("es-DO")}
            </p>
          </div>
        </div>
      </div>

      {/* Row click hint */}
      {rowClickHint && (
        <div className="px-4 py-2 bg-cyan-50 text-cyan-700 text-xs border-b border-cyan-100 print:hidden">
          {rowClickHint}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 print:bg-gray-800">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-2.5 font-medium text-gray-500 print:text-white print:bg-[#0f1e32] ${
                    col.align === "right"
                      ? "text-right"
                      : col.align === "center"
                        ? "text-center"
                        : "text-left"
                  }`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="text-center py-12 text-gray-400"
                >
                  <Download className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                  <p>No hay datos para mostrar</p>
                </td>
              </tr>
            ) : (
              data.map((row, i) => (
                <>
                  <tr
                    key={i}
                    className={`hover:bg-gray-50 print:hover:bg-transparent even:bg-gray-50/50 ${onRowClick ? "cursor-pointer" : ""}`}
                    onClick={onRowClick ? () => onRowClick(row, i) : undefined}
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={`px-4 py-2 ${
                          col.align === "right"
                            ? "text-right font-mono"
                            : col.align === "center"
                              ? "text-center"
                              : "text-left"
                        }`}
                      >
                        {formatValue(row[col.key])}
                      </td>
                    ))}
                  </tr>
                  {renderExpandedRow?.(row, i)}
                </>
              ))
            )}
            {totals && data.length > 0 && (
              <tr className="bg-navy-900 text-white font-semibold print:bg-[#0f1e32]">
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 py-2.5 ${
                      col.align === "right"
                        ? "text-right font-mono"
                        : col.align === "center"
                          ? "text-center"
                          : "text-left"
                    }`}
                  >
                    {formatValue(totals[col.key])}
                  </td>
                ))}
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Print footer */}
      <div className="hidden print:block px-6 py-3 text-center text-[10px] text-gray-400 border-t border-gray-200">
        SERVIMAST - Sistema de Gestión de Nómina | Impreso:{" "}
        {new Date().toLocaleString("es-DO")}
      </div>
    </div>
  );
}
