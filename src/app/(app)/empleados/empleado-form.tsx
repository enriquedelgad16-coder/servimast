"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { empleadoSchema, type EmpleadoFormData } from "@/lib/validations/schemas";
import { createClient } from "@/lib/supabase/client";
import { Save, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { Empleado } from "@/types";

interface EmpleadoFormProps {
  empleado?: Empleado;
}

export function EmpleadoForm({ empleado }: EmpleadoFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [departamentos, setDepartamentos] = useState<string[]>([]);
  const [sucursales, setSucursales] = useState<{ id: string; nombre: string }[]>([]);
  const isEdit = !!empleado;

  useEffect(() => {
    async function loadDropdowns() {
      const supabase = createClient();
      const [dRes, sRes] = await Promise.all([
        supabase.from("departamentos").select("nombre").eq("activo", true).order("nombre"),
        supabase.from("sucursales").select("id, nombre").eq("activo", true).order("nombre"),
      ]);
      setDepartamentos((dRes.data || []).map((d) => d.nombre));
      setSucursales(sRes.data || []);
    }
    loadDropdowns();
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EmpleadoFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(empleadoSchema) as any,
    defaultValues: empleado
      ? {
          cedula: empleado.cedula,
          nombre: empleado.nombre,
          apellido: empleado.apellido,
          fecha_nacimiento: empleado.fecha_nacimiento || "",
          direccion: empleado.direccion || "",
          email: empleado.email || "",
          telefono_trabajo: empleado.telefono_trabajo || "",
          telefono_personal: empleado.telefono_personal || "",
          fecha_ingreso: empleado.fecha_ingreso,
          cargo: empleado.cargo || "",
          departamento: empleado.departamento || "",
          sucursal_id: empleado.sucursal_id || "",
          tipo_contrato: empleado.tipo_contrato,
          periodo_prueba_fin: empleado.periodo_prueba_fin || "",
          sueldo_quincenal: empleado.sueldo_quincenal,
          banco: empleado.banco || "",
          numero_cuenta: empleado.numero_cuenta || "",
          nss: empleado.nss || "",
        }
      : {
          cedula: "",
          nombre: "",
          apellido: "",
          fecha_nacimiento: "",
          direccion: "",
          email: "",
          telefono_trabajo: "",
          telefono_personal: "",
          fecha_ingreso: "",
          cargo: "",
          departamento: "",
          sucursal_id: "",
          tipo_contrato: "indeterminado",
          periodo_prueba_fin: "",
          sueldo_quincenal: 0,
          banco: "",
          numero_cuenta: "",
          nss: "",
        },
  });

  async function onSubmit(data: EmpleadoFormData) {
    setSaving(true);
    setError(null);

    try {
      const supabase = createClient();

      // Clean empty strings to null
      const cleanData = Object.fromEntries(
        Object.entries(data).map(([key, value]) => [
          key,
          value === "" ? null : value,
        ])
      );

      if (isEdit) {
        const { error: updateError } = await supabase
          .from("empleados")
          .update(cleanData)
          .eq("id", empleado.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from("empleados")
          .insert(cleanData);

        if (insertError) {
          if (insertError.message.includes("duplicate key")) {
            throw new Error(
              "Ya existe un empleado con esa cédula"
            );
          }
          throw insertError;
        }
      }

      router.push("/empleados");
      router.refresh();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Error al guardar empleado"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/empleados"
          className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? "Editar Empleado" : "Nuevo Empleado"}
          </h1>
          {isEdit && (
            <p className="text-gray-500 text-sm">
              {empleado.numero_empleado} — {empleado.nombre} {empleado.apellido}
            </p>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-danger-100 text-danger-600 text-sm p-4 rounded-lg border border-red-200">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Datos Personales */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Datos Personales
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cédula *
                </label>
                <input
                  {...register("cedula")}
                  placeholder="000-0000000-0"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                />
                {errors.cedula && (
                  <p className="text-danger-600 text-xs mt-1">
                    {errors.cedula.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre *
                  </label>
                  <input
                    {...register("nombre")}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  />
                  {errors.nombre && (
                    <p className="text-danger-600 text-xs mt-1">
                      {errors.nombre.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Apellido *
                  </label>
                  <input
                    {...register("apellido")}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  />
                  {errors.apellido && (
                    <p className="text-danger-600 text-xs mt-1">
                      {errors.apellido.message}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha de Nacimiento
                </label>
                <input
                  {...register("fecha_nacimiento")}
                  type="date"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dirección
                </label>
                <textarea
                  {...register("direccion")}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Correo Electrónico
                </label>
                <input
                  {...register("email")}
                  type="email"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                />
                {errors.email && (
                  <p className="text-danger-600 text-xs mt-1">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tel. Trabajo
                  </label>
                  <input
                    {...register("telefono_trabajo")}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tel. Personal
                  </label>
                  <input
                    {...register("telefono_personal")}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Datos Laborales */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Datos Laborales
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha de Ingreso *
                  </label>
                  <input
                    {...register("fecha_ingreso")}
                    type="date"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  />
                  {errors.fecha_ingreso && (
                    <p className="text-danger-600 text-xs mt-1">
                      {errors.fecha_ingreso.message}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cargo
                    </label>
                    <input
                      {...register("cargo")}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Departamento
                    </label>
                    <select
                      {...register("departamento")}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                    >
                      <option value="">Seleccionar departamento...</option>
                      {departamentos.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sucursal
                  </label>
                  <select
                    {...register("sucursal_id")}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  >
                    <option value="">Seleccionar sucursal...</option>
                    {sucursales.map((s) => (
                      <option key={s.id} value={s.id}>{s.nombre}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tipo de Contrato *
                    </label>
                    <select
                      {...register("tipo_contrato")}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                    >
                      <option value="indeterminado">Indeterminado</option>
                      <option value="determinado">Determinado</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fin Período Prueba
                    </label>
                    <input
                      {...register("periodo_prueba_fin")}
                      type="date"
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sueldo Quincenal (RD$) *
                  </label>
                  <input
                    {...register("sueldo_quincenal", { valueAsNumber: true })}
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  />
                  {errors.sueldo_quincenal && (
                    <p className="text-danger-600 text-xs mt-1">
                      {errors.sueldo_quincenal.message}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    Tarifa hora = Sueldo / 88 horas
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Datos Bancarios y Seguridad Social
              </h2>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Banco
                    </label>
                    <input
                      {...register("banco")}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      No. Cuenta
                    </label>
                    <input
                      {...register("numero_cuenta")}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    NSS (Seguridad Social)
                  </label>
                  <input
                    {...register("nss")}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="mt-6 flex items-center justify-end gap-3">
          <Link
            href="/empleados"
            className="px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium text-sm hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors disabled:opacity-50 shadow-sm"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </form>
    </div>
  );
}
