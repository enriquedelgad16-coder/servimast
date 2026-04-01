"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  FileSpreadsheet,
  Download,
  Users,
  Calculator,
  Wallet,
  Calendar,
  Shield,
  Building2,
} from "lucide-react";
import * as XLSX from "xlsx";

interface ReportDef {
  id: string;
  nombre: string;
  descripcion: string;
  icon: React.ReactNode;
  categoria: string;
}

const REPORTES: ReportDef[] = [
  {
    id: "empleados_activos",
    nombre: "Empleados Activos",
    descripcion: "Lista completa de empleados activos con datos personales y laborales",
    icon: <Users className="h-5 w-5" />,
    categoria: "Empleados",
  },
  {
    id: "empleados_departamento",
    nombre: "Empleados por Departamento",
    descripcion: "Empleados agrupados por departamento con cargo y sueldo",
    icon: <Building2 className="h-5 w-5" />,
    categoria: "Empleados",
  },
  {
    id: "nomina_quincena",
    nombre: "Nómina por Quincena",
    descripcion: "Detalle completo de nómina de una quincena seleccionada",
    icon: <Calculator className="h-5 w-5" />,
    categoria: "Nómina",
  },
  {
    id: "nomina_resumen_mensual",
    nombre: "Resumen Mensual de Nómina",
    descripcion: "Totales mensuales de devengado, deducciones y neto",
    icon: <Calculator className="h-5 w-5" />,
    categoria: "Nómina",
  },
  {
    id: "prestamos_activos",
    nombre: "Préstamos Activos",
    descripcion: "Préstamos activos con saldos pendientes y cuotas",
    icon: <Wallet className="h-5 w-5" />,
    categoria: "Préstamos",
  },
  {
    id: "tss_mensual",
    nombre: "Reporte TSS Mensual",
    descripcion: "Aportes AFP, SFS y SRL para Tesorería de Seguridad Social",
    icon: <Shield className="h-5 w-5" />,
    categoria: "TSS",
  },
  {
    id: "vacaciones_resumen",
    nombre: "Resumen de Vacaciones",
    descripcion: "Días acumulados, tomados y disponibles por empleado",
    icon: <Calendar className="h-5 w-5" />,
    categoria: "Vacaciones",
  },
  {
    id: "costo_patronal",
    nombre: "Costo Patronal Mensual",
    descripcion: "Total de contribuciones patronales AFP, SFS, SRL por mes",
    icon: <Building2 className="h-5 w-5" />,
    categoria: "TSS",
  },
];

export default function ReportesPage() {
  const [generating, setGenerating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generateReport(reportId: string) {
    setGenerating(reportId);
    setError(null);

    try {
      const supabase = createClient();
      let data: Record<string, unknown>[] = [];
      let filename = reportId;

      switch (reportId) {
        case "empleados_activos": {
          const { data: emps, error: e } = await supabase
            .from("empleados")
            .select("*")
            .eq("estado", "activo")
            .order("apellido");
          if (e) throw e;
          data = (emps || []).map((emp) => ({
            "No. Empleado": emp.numero_empleado,
            "Cédula": emp.cedula,
            "Nombre": emp.nombre,
            "Apellido": emp.apellido,
            "Cargo": emp.cargo || "",
            "Departamento": emp.departamento || "",
            "Fecha Ingreso": emp.fecha_ingreso,
            "Tipo Contrato": emp.tipo_contrato,
            "Sueldo Quincenal": emp.sueldo_quincenal,
            "Banco": emp.banco || "",
            "No. Cuenta": emp.numero_cuenta || "",
            "NSS": emp.nss || "",
            "Email": emp.email || "",
            "Tel. Trabajo": emp.telefono_trabajo || "",
            "Tel. Personal": emp.telefono_personal || "",
          }));
          filename = "Empleados_Activos";
          break;
        }
        case "empleados_departamento": {
          const { data: emps, error: e } = await supabase
            .from("empleados")
            .select("*")
            .eq("estado", "activo")
            .order("departamento")
            .order("apellido");
          if (e) throw e;
          data = (emps || []).map((emp) => ({
            "Departamento": emp.departamento || "Sin departamento",
            "No. Empleado": emp.numero_empleado,
            "Nombre": `${emp.nombre} ${emp.apellido}`,
            "Cargo": emp.cargo || "",
            "Sueldo Quincenal": emp.sueldo_quincenal,
            "Fecha Ingreso": emp.fecha_ingreso,
          }));
          filename = "Empleados_por_Departamento";
          break;
        }
        case "prestamos_activos": {
          const { data: prests, error: e } = await supabase
            .from("prestamos")
            .select("*, empleado:empleados(nombre, apellido, numero_empleado)")
            .eq("estado", "activo")
            .order("created_at", { ascending: false });
          if (e) throw e;
          data = (prests || []).map((p) => {
            const emp = p.empleado as { nombre: string; apellido: string; numero_empleado: string } | null;
            return {
              "Empleado": emp ? `${emp.nombre} ${emp.apellido}` : "",
              "No. Empleado": emp?.numero_empleado || "",
              "Monto Total": p.monto_total,
              "Cuota Quincenal": p.cuota_quincenal,
              "Saldo Pendiente": p.saldo_pendiente,
              "Cuotas Pagadas": p.numero_cuotas_pagadas,
              "Cuotas Estimadas": p.numero_cuotas_estimado || "",
              "Fecha Inicio": p.fecha_inicio,
            };
          });
          filename = "Prestamos_Activos";
          break;
        }
        case "vacaciones_resumen": {
          const { data: emps, error: e } = await supabase
            .from("empleados")
            .select("*")
            .eq("estado", "activo")
            .order("apellido");
          if (e) throw e;
          data = (emps || []).map((emp) => ({
            "No. Empleado": emp.numero_empleado,
            "Nombre": `${emp.nombre} ${emp.apellido}`,
            "Fecha Ingreso": emp.fecha_ingreso,
            "Días Acumulados": emp.dias_vacaciones_acumulados,
            "Días Tomados": emp.dias_vacaciones_tomados,
            "Días Disponibles":
              emp.dias_vacaciones_acumulados - emp.dias_vacaciones_tomados,
          }));
          filename = "Vacaciones_Resumen";
          break;
        }
        default: {
          setError("Reporte aún no implementado. Próximamente disponible.");
          setGenerating(null);
          return;
        }
      }

      if (data.length === 0) {
        setError("No hay datos para generar este reporte.");
        setGenerating(null);
        return;
      }

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Reporte");

      const colWidths = Object.keys(data[0]).map((key) => ({
        wch: Math.max(
          key.length,
          ...data.map((row) => String(row[key] ?? "").length)
        ),
      }));
      ws["!cols"] = colWidths;

      const today = new Date().toISOString().split("T")[0];
      XLSX.writeFile(wb, `${filename}_${today}.xlsx`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al generar reporte");
    } finally {
      setGenerating(null);
    }
  }

  const categorias = [...new Set(REPORTES.map((r) => r.categoria))];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Reportes</h1>
        <p className="text-gray-500 text-sm mt-1">
          Genera y descarga reportes en formato Excel
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 text-red-600 text-sm p-4 rounded-lg border border-red-200">
          {error}
        </div>
      )}

      {categorias.map((cat) => (
        <div key={cat} className="mb-8">
          <h2 className="text-lg font-semibold text-gray-700 mb-3">{cat}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {REPORTES.filter((r) => r.categoria === cat).map((reporte) => (
              <div
                key={reporte.id}
                className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="p-2 bg-cyan-50 rounded-lg text-cyan-600">
                    {reporte.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 text-sm">
                      {reporte.nombre}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {reporte.descripcion}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => generateReport(reporte.id)}
                  disabled={generating === reporte.id}
                  className="w-full inline-flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50 text-sm"
                >
                  {generating === reporte.id ? (
                    <>
                      <FileSpreadsheet className="h-4 w-4 animate-pulse" />
                      Generando...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      Descargar Excel
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
