"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  MapPin,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Users,
  X,
  Save,
} from "lucide-react";
import type { Sucursal } from "@/types";

interface Props {
  sucursales: Sucursal[];
  employeeCounts: Record<string, number>;
}

export function SucursalesClient({ sucursales, employeeCounts }: Props) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nombre, setNombre] = useState("");
  const [direccion, setDireccion] = useState("");
  const [telefono, setTelefono] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function startNew() {
    setEditingId(null);
    setNombre("");
    setDireccion("");
    setTelefono("");
    setShowForm(true);
    setError(null);
  }

  function startEdit(suc: Sucursal) {
    setEditingId(suc.id);
    setNombre(suc.nombre);
    setDireccion(suc.direccion || "");
    setTelefono(suc.telefono || "");
    setShowForm(true);
    setError(null);
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    setNombre("");
    setDireccion("");
    setTelefono("");
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
      const payload = {
        nombre: nombre.trim(),
        direccion: direccion.trim() || null,
        telefono: telefono.trim() || null,
      };
      if (editingId) {
        const { error: updateError } = await supabase
          .from("sucursales")
          .update(payload)
          .eq("id", editingId);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from("sucursales")
          .insert(payload);
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

  async function handleDelete(suc: Sucursal) {
    const count = employeeCounts[suc.id] || 0;
    if (count > 0) {
      setError(`No se puede eliminar "${suc.nombre}" porque tiene ${count} empleado(s) asignado(s).`);
      return;
    }
    if (!confirm(`¿Eliminar la sucursal "${suc.nombre}"?`)) return;
    setDeleting(suc.id);
    setError(null);
    try {
      const supabase = createClient();
      const { error: deleteError } = await supabase
        .from("sucursales")
        .delete()
        .eq("id", suc.id);
      if (deleteError) throw deleteError;
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al eliminar");
    } finally {
      setDeleting(null);
    }
  }

  async function handleToggleActive(suc: Sucursal) {
    try {
      const supabase = createClient();
      await supabase
        .from("sucursales")
        .update({ activo: !suc.activo })
        .eq("id", suc.id);
      router.refresh();
    } catch {
      // silent
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-violet-100 rounded-lg">
            <MapPin className="h-6 w-6 text-violet-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Sucursales</h1>
            <p className="text-gray-500 text-sm">
              Gestionar sucursales de la empresa
            </p>
          </div>
        </div>
        <button
          onClick={startNew}
          className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-4 py-2.5 rounded-lg transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Nueva Sucursal
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-200">
          {error}
        </div>
      )}

      {showForm && (
        <div className="mb-6 bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">
            {editingId ? "Editar Sucursal" : "Nueva Sucursal"}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre *
              </label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Sucursal Santiago"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Direccion
              </label>
              <input
                type="text"
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                placeholder="Dirección de la sucursal"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Teléfono
              </label>
              <input
                type="text"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="(809) 000-0000"
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
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
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

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-4 py-3 text-left font-medium text-gray-500">Nombre</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Dirección</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Teléfono</th>
              <th className="px-4 py-3 text-center font-medium text-gray-500">Empleados</th>
              <th className="px-4 py-3 text-center font-medium text-gray-500">Estado</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sucursales.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-gray-400">
                  <MapPin className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                  No hay sucursales registradas
                </td>
              </tr>
            ) : (
              sucursales.map((suc) => (
                <tr key={suc.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{suc.nombre}</td>
                  <td className="px-4 py-3 text-gray-500">{suc.direccion || "—"}</td>
                  <td className="px-4 py-3 text-gray-500">{suc.telefono || "—"}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center gap-1 bg-violet-50 text-violet-700 px-2 py-0.5 rounded-full text-xs font-medium">
                      <Users className="h-3 w-3" />
                      {employeeCounts[suc.id] || 0}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleToggleActive(suc)}
                      className={`text-xs px-2 py-1 rounded-full font-medium ${
                        suc.activo ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {suc.activo ? "Activa" : "Inactiva"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => startEdit(suc)}
                        className="p-1.5 text-gray-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(suc)}
                        disabled={deleting === suc.id}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Eliminar"
                      >
                        {deleting === suc.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
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
