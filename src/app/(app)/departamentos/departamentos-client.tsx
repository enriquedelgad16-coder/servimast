"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Building2,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Users,
  X,
  Save,
} from "lucide-react";
import type { Departamento } from "@/types";

interface Props {
  departamentos: Departamento[];
  employeeCounts: Record<string, number>;
}

export function DepartamentosClient({ departamentos, employeeCounts }: Props) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function startNew() {
    setEditingId(null);
    setNombre("");
    setDescripcion("");
    setShowForm(true);
    setError(null);
  }

  function startEdit(dept: Departamento) {
    setEditingId(dept.id);
    setNombre(dept.nombre);
    setDescripcion(dept.descripcion || "");
    setShowForm(true);
    setError(null);
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    setNombre("");
    setDescripcion("");
    setError(null);
  }

  async function handleSave() {
    if (!nombre.trim()) {
      setError("El nombre es obligatorio");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const supabase = createClient();
      if (editingId) {
        const { error: updateError } = await supabase
          .from("departamentos")
          .update({ nombre: nombre.trim(), descripcion: descripcion.trim() || null })
          .eq("id", editingId);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from("departamentos")
          .insert({ nombre: nombre.trim(), descripcion: descripcion.trim() || null });
        if (insertError) throw insertError;
      }
      cancelForm();
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(dept: Departamento) {
    const count = employeeCounts[dept.nombre] || 0;
    if (count > 0) {
      setError(`No se puede eliminar "${dept.nombre}" porque tiene ${count} empleado(s) asignado(s).`);
      return;
    }
    if (!confirm(`¿Eliminar el departamento "${dept.nombre}"?`)) return;
    setDeleting(dept.id);
    setError(null);
    try {
      const supabase = createClient();
      const { error: deleteError } = await supabase
        .from("departamentos")
        .delete()
        .eq("id", dept.id);
      if (deleteError) throw deleteError;
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al eliminar");
    } finally {
      setDeleting(null);
    }
  }

  async function handleToggleActive(dept: Departamento) {
    try {
      const supabase = createClient();
      await supabase
        .from("departamentos")
        .update({ activo: !dept.activo })
        .eq("id", dept.id);
      router.refresh();
    } catch {
      // silent
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-100 rounded-lg">
            <Building2 className="h-6 w-6 text-cyan-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Departamentos</h1>
            <p className="text-gray-500 text-sm">
              Gestionar departamentos de la empresa
            </p>
          </div>
        </div>
        <button
          onClick={startNew}
          className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-4 py-2.5 rounded-lg transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Nuevo Departamento
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-200">
          {error}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="mb-6 bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">
            {editingId ? "Editar Departamento" : "Nuevo Departamento"}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre *
              </label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Servicios Tecnicos"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descripcion
              </label>
              <input
                type="text"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Breve descripcion del departamento"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
              />
            </div>
          </div>
          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 bg-cyan-500 hover:bg-cyan-600 text-white font-semibold px-5 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {editingId ? "Actualizar" : "Crear"}
            </button>
            <button
              onClick={cancelForm}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-4 w-4 inline mr-1" />
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-4 py-3 text-left font-medium text-gray-500">
                Nombre
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">
                Descripcion
              </th>
              <th className="px-4 py-3 text-center font-medium text-gray-500">
                Empleados
              </th>
              <th className="px-4 py-3 text-center font-medium text-gray-500">
                Estado
              </th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {departamentos.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="text-center py-12 text-gray-400"
                >
                  <Building2 className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                  No hay departamentos registrados
                </td>
              </tr>
            ) : (
              departamentos.map((dept) => (
                <tr key={dept.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {dept.nombre}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {dept.descripcion || "—"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center gap-1 bg-cyan-50 text-cyan-700 px-2 py-0.5 rounded-full text-xs font-medium">
                      <Users className="h-3 w-3" />
                      {employeeCounts[dept.nombre] || 0}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleToggleActive(dept)}
                      className={`text-xs px-2 py-1 rounded-full font-medium ${
                        dept.activo
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {dept.activo ? "Activo" : "Inactivo"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => startEdit(dept)}
                        className="p-1.5 text-gray-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(dept)}
                        disabled={deleting === dept.id}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Eliminar"
                      >
                        {deleting === dept.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
