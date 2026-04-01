"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Settings, Save, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import type { ConfiguracionSistema } from "@/types";

const GRUPO_LABELS: Record<string, { titulo: string; descripcion: string }> = {
  tss: {
    titulo: "Seguridad Social (TSS)",
    descripcion: "Porcentajes de AFP, SFS, SRL y otros aportes obligatorios",
  },
  nomina: {
    titulo: "Nomina",
    descripcion: "Factores de horas extras, ISR y parametros de calculo",
  },
  sistema: {
    titulo: "Sistema",
    descripcion: "Datos generales de la empresa y configuracion del sistema",
  },
};

const GRUPO_ORDER = ["tss", "nomina", "sistema"];

function isNumericValue(valor: string): boolean {
  return !isNaN(Number(valor)) && valor.trim() !== "";
}

export default function ConfiguracionPage() {
  const [configs, setConfigs] = useState<ConfiguracionSistema[]>([]);
  const [modified, setModified] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const supabase = useMemo(() => createClient(), []);

  const fetchConfigs = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("configuracion_sistema")
      .select("*")
      .order("tipo")
      .order("clave");

    if (error) {
      setFeedback({ type: "error", message: "Error al cargar configuracion" });
    } else {
      setConfigs(data || []);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  const grouped = GRUPO_ORDER.reduce(
    (acc, tipo) => {
      acc[tipo] = configs.filter((c) => c.tipo === tipo);
      return acc;
    },
    {} as Record<string, ConfiguracionSistema[]>
  );

  // Include any configs with types not in GRUPO_ORDER under "sistema"
  const knownTypes = new Set(GRUPO_ORDER);
  const extras = configs.filter((c) => !knownTypes.has(c.tipo || ""));
  if (extras.length > 0) {
    grouped["sistema"] = [...(grouped["sistema"] || []), ...extras];
  }

  const handleChange = (id: string, valor: string) => {
    setModified((prev) => ({ ...prev, [id]: valor }));
    // Clear feedback when user edits
    if (feedback) setFeedback(null);
  };

  const getDisplayValue = (config: ConfiguracionSistema): string => {
    if (modified[config.id] !== undefined) return modified[config.id];
    return config.valor;
  };

  const hasChanges = Object.keys(modified).length > 0;

  const handleSave = async () => {
    if (!hasChanges) return;
    setSaving(true);
    setFeedback(null);

    try {
      const updates = Object.entries(modified).map(([id, valor]) =>
        supabase
          .from("configuracion_sistema")
          .update({ valor, updated_at: new Date().toISOString() })
          .eq("id", id)
      );

      const results = await Promise.all(updates);
      const errors = results.filter((r) => r.error);

      if (errors.length > 0) {
        setFeedback({
          type: "error",
          message: `Error al guardar ${errors.length} parametro(s)`,
        });
      } else {
        setFeedback({
          type: "success",
          message: "Configuracion guardada exitosamente",
        });
        setModified({});
        await fetchConfigs();
      }
    } catch {
      setFeedback({ type: "error", message: "Error inesperado al guardar" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Configuracion</h1>
          <p className="text-gray-500 text-sm mt-1">
            Parametros del sistema, porcentajes TSS, datos de la empresa
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
          <Loader2 className="h-8 w-8 mx-auto animate-spin text-gray-400" />
          <p className="text-gray-400 mt-3">Cargando configuracion...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configuracion</h1>
          <p className="text-gray-500 text-sm mt-1">
            Parametros del sistema, porcentajes TSS, datos de la empresa
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={!hasChanges || saving}
          className={`inline-flex items-center gap-2 font-semibold px-5 py-2.5 rounded-lg transition-colors shadow-sm ${
            hasChanges
              ? "bg-orange-500 hover:bg-orange-600 text-white"
              : "bg-gray-200 text-gray-400 cursor-not-allowed"
          }`}
        >
          {saving ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Save className="h-5 w-5" />
          )}
          Guardar Cambios
        </button>
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div
          className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-6 text-sm font-medium ${
            feedback.type === "success"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle className="h-5 w-5 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
          )}
          {feedback.message}
        </div>
      )}

      <div className="space-y-6">
        {GRUPO_ORDER.map((tipo) => {
          const items = grouped[tipo];
          if (!items || items.length === 0) return null;
          const meta = GRUPO_LABELS[tipo] || {
            titulo: tipo,
            descripcion: "",
          };

          return (
            <div
              key={tipo}
              className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
            >
              {/* Card header */}
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                <div className="flex items-center gap-3">
                  <Settings className="h-5 w-5 text-orange-500" />
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      {meta.titulo}
                    </h2>
                    <p className="text-xs text-gray-500">{meta.descripcion}</p>
                  </div>
                </div>
              </div>

              {/* Card body */}
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                  {items.map((config) => {
                    const currentValue = getDisplayValue(config);
                    const isModified = modified[config.id] !== undefined;
                    const isNumeric = isNumericValue(config.valor);

                    return (
                      <div key={config.id}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {config.descripcion || config.clave}
                          {isModified && (
                            <span className="ml-2 text-xs text-orange-500 font-normal">
                              (modificado)
                            </span>
                          )}
                        </label>
                        <input
                          type={isNumeric ? "number" : "text"}
                          step={isNumeric ? "any" : undefined}
                          value={currentValue}
                          onChange={(e) =>
                            handleChange(config.id, e.target.value)
                          }
                          className={`w-full px-3 py-2 text-sm rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 ${
                            isModified
                              ? "border-orange-400 bg-orange-50"
                              : "border-gray-200 bg-white"
                          }`}
                        />
                        <p className="text-xs text-gray-400 mt-1">
                          Clave: {config.clave}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {configs.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
          <Settings className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-400">
            No hay parametros de configuracion registrados
          </p>
        </div>
      )}
    </div>
  );
}
