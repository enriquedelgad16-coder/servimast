"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { quincenaSchema, type QuincenaFormData } from "@/lib/validations/schemas";
import { createClient } from "@/lib/supabase/client";
import { Plus, Loader2, X } from "lucide-react";

export function NuevaQuincenaDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<QuincenaFormData>({
    resolver: zodResolver(quincenaSchema),
  });

  async function onSubmit(data: QuincenaFormData) {
    setSaving(true);
    setError(null);

    try {
      const supabase = createClient();

      const { error: insertError } = await supabase
        .from("quincenas")
        .insert({
          periodo_inicio: data.periodo_inicio,
          periodo_fin: data.periodo_fin,
          descripcion: data.descripcion || null,
          notas: data.notas || null,
        });

      if (insertError) {
        if (insertError.message.includes("uq_periodo")) {
          throw new Error("Ya existe una quincena con ese período");
        }
        throw insertError;
      }

      reset();
      setOpen(false);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al crear quincena");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-4 py-2.5 rounded-lg transition-colors shadow-sm"
      >
        <Plus className="h-5 w-5" />
        Nueva Quincena
      </button>
    );
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/50"
        onClick={() => setOpen(false)}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Nueva Quincena
            </h2>
            <button
              onClick={() => setOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
            {error && (
              <div className="bg-danger-100 text-danger-600 text-sm p-3 rounded-lg">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Inicio *
                </label>
                <input
                  {...register("periodo_inicio")}
                  type="date"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                />
                {errors.periodo_inicio && (
                  <p className="text-danger-600 text-xs mt-1">
                    {errors.periodo_inicio.message}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fin *
                </label>
                <input
                  {...register("periodo_fin")}
                  type="date"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                />
                {errors.periodo_fin && (
                  <p className="text-danger-600 text-xs mt-1">
                    {errors.periodo_fin.message}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descripción
              </label>
              <input
                {...register("descripcion")}
                placeholder="Ej: Primera quincena marzo 2026"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notas
              </label>
              <textarea
                {...register("notas")}
                rows={2}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
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
                {saving ? "Creando..." : "Crear Quincena"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
