"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Eye, Edit, MoreHorizontal } from "lucide-react";
import { formatCedula, formatCurrency } from "@/lib/utils";
import type { Empleado } from "@/types";

const ESTADO_BADGES: Record<string, string> = {
  activo: "bg-success-100 text-success-600",
  inactivo: "bg-gray-100 text-gray-600",
  periodo_prueba: "bg-warning-100 text-warning-500",
  desvinculado: "bg-danger-100 text-danger-600",
};

const ESTADO_LABELS: Record<string, string> = {
  activo: "Activo",
  inactivo: "Inactivo",
  periodo_prueba: "Prueba",
  desvinculado: "Desvinculado",
};

interface EmpleadosTableProps {
  empleados: Empleado[];
}

export function EmpleadosTable({ empleados }: EmpleadosTableProps) {
  const [search, setSearch] = useState("");

  const filtered = empleados.filter((e) => {
    const q = search.toLowerCase();
    return (
      e.nombre.toLowerCase().includes(q) ||
      e.apellido.toLowerCase().includes(q) ||
      e.cedula.includes(q) ||
      e.numero_empleado.toLowerCase().includes(q) ||
      (e.departamento || "").toLowerCase().includes(q) ||
      (e.cargo || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Search */}
      <div className="p-4 border-b border-gray-200">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, cédula, departamento..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-4 py-3 font-medium text-gray-500">
                No.
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">
                Nombre
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">
                Cédula
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">
                Cargo
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">
                Departamento
              </th>
              <th className="text-right px-4 py-3 font-medium text-gray-500">
                Sueldo Quincenal
              </th>
              <th className="text-center px-4 py-3 font-medium text-gray-500">
                Estado
              </th>
              <th className="text-center px-4 py-3 font-medium text-gray-500">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="text-center py-12 text-gray-400"
                >
                  {search
                    ? "No se encontraron empleados con esa búsqueda"
                    : "No hay empleados registrados"}
                </td>
              </tr>
            ) : (
              filtered.map((emp) => (
                <tr
                  key={emp.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-gray-500">
                    {emp.numero_empleado}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    <Link href={`/empleados/${emp.id}`} className="text-cyan-600 hover:text-cyan-700 hover:underline">
                      {emp.apellido}, {emp.nombre}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-gray-600">
                    {formatCedula(emp.cedula)}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {emp.cargo || "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {emp.departamento || "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-gray-900">
                    {formatCurrency(emp.sueldo_quincenal)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${ESTADO_BADGES[emp.estado] || ""}`}
                    >
                      {ESTADO_LABELS[emp.estado] || emp.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Link
                        href={`/empleados/${emp.id}`}
                        className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-cyan-500 transition-colors"
                        title="Ver detalle"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      <Link
                        href={`/empleados/${emp.id}?edit=true`}
                        className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-orange-500 transition-colors"
                        title="Editar"
                      >
                        <Edit className="h-4 w-4" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 text-sm text-gray-500">
        Mostrando {filtered.length} de {empleados.length} empleados
      </div>
    </div>
  );
}
