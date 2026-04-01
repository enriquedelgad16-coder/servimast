"use client";

import { useState, useMemo, Fragment } from "react";
import { Search, ChevronDown, ChevronRight, Filter } from "lucide-react";
import type { AuditLog } from "@/types";
import { formatDateTime } from "@/lib/utils";

const ACCION_BADGES: Record<string, string> = {
  INSERT: "bg-green-100 text-green-700",
  UPDATE: "bg-yellow-100 text-yellow-700",
  DELETE: "bg-red-100 text-red-700",
};

const ACCION_LABELS: Record<string, string> = {
  INSERT: "Insercion",
  UPDATE: "Actualizacion",
  DELETE: "Eliminacion",
};

function JsonDiff({
  label,
  data,
}: {
  label: string;
  data: Record<string, unknown> | null;
}) {
  if (!data || Object.keys(data).length === 0) {
    return (
      <div>
        <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
        <p className="text-xs text-gray-400 italic">Sin datos</p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
      <pre className="text-xs bg-gray-50 border border-gray-200 rounded-lg p-3 overflow-x-auto max-h-64 text-gray-700">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

export default function AuditTable({ logs }: { logs: AuditLog[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterTabla, setFilterTabla] = useState("");
  const [filterAccion, setFilterAccion] = useState("");
  const [filterFechaDesde, setFilterFechaDesde] = useState("");
  const [filterFechaHasta, setFilterFechaHasta] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const tablas = useMemo(() => {
    const set = new Set(logs.map((l) => l.tabla_afectada));
    return Array.from(set).sort();
  }, [logs]);

  const filtered = useMemo(() => {
    return logs.filter((log) => {
      if (filterTabla && log.tabla_afectada !== filterTabla) return false;
      if (filterAccion && log.accion !== filterAccion) return false;
      if (filterFechaDesde) {
        const logDate = log.created_at.slice(0, 10);
        if (logDate < filterFechaDesde) return false;
      }
      if (filterFechaHasta) {
        const logDate = log.created_at.slice(0, 10);
        if (logDate > filterFechaHasta) return false;
      }
      return true;
    });
  }, [logs, filterTabla, filterAccion, filterFechaDesde, filterFechaHasta]);

  const hasActiveFilters =
    filterTabla || filterAccion || filterFechaDesde || filterFechaHasta;

  const clearFilters = () => {
    setFilterTabla("");
    setFilterAccion("");
    setFilterFechaDesde("");
    setFilterFechaHasta("");
  };

  return (
    <div className="space-y-4">
      {/* Filter toggle */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
            showFilters || hasActiveFilters
              ? "bg-orange-50 border-orange-200 text-orange-700"
              : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
          }`}
        >
          <Filter className="h-4 w-4" />
          Filtros
          {hasActiveFilters && (
            <span className="bg-orange-500 text-white text-xs rounded-full px-1.5 py-0.5 leading-none">
              !
            </span>
          )}
        </button>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Limpiar filtros
          </button>
        )}
        <span className="text-sm text-gray-400 ml-auto">
          {filtered.length} registro{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Filter controls */}
      {showFilters && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                <Search className="h-3 w-3 inline mr-1" />
                Tabla
              </label>
              <select
                value={filterTabla}
                onChange={(e) => setFilterTabla(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              >
                <option value="">Todas las tablas</option>
                {tablas.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Accion
              </label>
              <select
                value={filterAccion}
                onChange={(e) => setFilterAccion(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              >
                <option value="">Todas las acciones</option>
                <option value="INSERT">Insercion</option>
                <option value="UPDATE">Actualizacion</option>
                <option value="DELETE">Eliminacion</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Desde
              </label>
              <input
                type="date"
                value={filterFechaDesde}
                onChange={(e) => setFilterFechaDesde(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Hasta
              </label>
              <input
                type="date"
                value={filterFechaHasta}
                onChange={(e) => setFilterFechaHasta(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="w-8 px-2 py-3"></th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">
                  Fecha
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">
                  Tabla
                </th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">
                  Accion
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">
                  Registro ID
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">
                  Usuario
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">
                  Campos Modificados
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="text-center py-12 text-gray-400"
                  >
                    <Search className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>No se encontraron registros de auditoria</p>
                  </td>
                </tr>
              ) : (
                filtered.map((log) => {
                  const isExpanded = expandedId === log.id;
                  return (
                    <Fragment key={log.id}>
                      <tr
                        onClick={() =>
                          setExpandedId(isExpanded ? null : log.id)
                        }
                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                      >
                        <td className="px-2 py-3 text-gray-400">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                          {formatDateTime(log.created_at)}
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {log.tabla_afectada}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              ACCION_BADGES[log.accion] || ""
                            }`}
                          >
                            {ACCION_LABELS[log.accion] || log.accion}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600 font-mono text-xs">
                          {log.registro_id
                            ? log.registro_id.slice(0, 8) + "..."
                            : "-"}
                        </td>
                        <td className="px-4 py-3 text-gray-600 font-mono text-xs">
                          {log.usuario_id
                            ? log.usuario_id.slice(0, 8) + "..."
                            : "-"}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {log.campos_modificados &&
                          log.campos_modificados.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {log.campos_modificados
                                .slice(0, 3)
                                .map((campo) => (
                                  <span
                                    key={campo}
                                    className="inline-flex px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs"
                                  >
                                    {campo}
                                  </span>
                                ))}
                              {log.campos_modificados.length > 3 && (
                                <span className="text-xs text-gray-400">
                                  +{log.campos_modificados.length - 3} mas
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      </tr>

                      {/* Expanded detail row */}
                      {isExpanded && (
                        <tr className="bg-gray-50">
                          <td colSpan={7} className="px-6 py-4">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                              <JsonDiff
                                label="Datos Anteriores"
                                data={log.datos_anteriores}
                              />
                              <JsonDiff
                                label="Datos Nuevos"
                                data={log.datos_nuevos}
                              />
                            </div>
                            {(log.ip_address || log.user_agent) && (
                              <div className="mt-3 pt-3 border-t border-gray-200 flex flex-wrap gap-4 text-xs text-gray-400">
                                {log.ip_address && (
                                  <span>IP: {log.ip_address}</span>
                                )}
                                {log.user_agent && (
                                  <span className="truncate max-w-md">
                                    UA: {log.user_agent}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
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

