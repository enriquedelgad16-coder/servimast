import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { User, Briefcase, CreditCard, Wallet, Calendar, FileText } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default async function MiPortalPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Get profile to find empleado_id
  const { data: profile } = await supabase
    .from("profiles")
    .select("rol, empleado_id, nombre_display")
    .eq("id", user.id)
    .single();

  // If no empleado linked, show message
  if (!profile?.empleado_id) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Mi Portal</h1>
          <p className="text-gray-500 text-sm mt-1">
            Portal del empleado
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
          <User className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500 font-medium">
            Su cuenta aún no está vinculada a un registro de empleado.
          </p>
          <p className="text-gray-400 text-sm mt-1">
            Contacte al administrador para vincular su perfil.
          </p>
        </div>
      </div>
    );
  }

  // Get employee data
  const { data: empleado } = await supabase
    .from("empleados")
    .select("*")
    .eq("id", profile.empleado_id)
    .single();

  if (!empleado) redirect("/login");

  // Get recent nomina items
  const { data: nominaReciente } = await supabase
    .from("nomina_items")
    .select("*, quincena:quincenas(periodo_inicio, periodo_fin, estado)")
    .eq("empleado_id", empleado.id)
    .order("created_at", { ascending: false })
    .limit(6);

  // Get active loans
  const { data: prestamos } = await supabase
    .from("prestamos")
    .select("*")
    .eq("empleado_id", empleado.id)
    .eq("estado", "activo");

  const diasVacDisponibles =
    empleado.dias_vacaciones_acumulados - empleado.dias_vacaciones_tomados;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Mi Portal</h1>
        <p className="text-gray-500 text-sm mt-1">
          Bienvenido, {empleado.nombre} {empleado.apellido}
        </p>
      </div>

      {/* Employee Info Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-cyan-50 rounded-lg text-cyan-600">
              <User className="h-5 w-5" />
            </div>
            <h2 className="font-semibold text-gray-900">Datos Personales</h2>
          </div>
          <div className="space-y-2 text-sm">
            <p>
              <span className="text-gray-500">No. Empleado:</span>{" "}
              <span className="font-medium">{empleado.numero_empleado}</span>
            </p>
            <p>
              <span className="text-gray-500">Cédula:</span>{" "}
              <span className="font-medium">{empleado.cedula}</span>
            </p>
            <p>
              <span className="text-gray-500">Email:</span>{" "}
              <span className="font-medium">{empleado.email || "—"}</span>
            </p>
            <p>
              <span className="text-gray-500">Teléfono:</span>{" "}
              <span className="font-medium">
                {empleado.telefono_personal || "—"}
              </span>
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-cyan-50 rounded-lg text-cyan-600">
              <Briefcase className="h-5 w-5" />
            </div>
            <h2 className="font-semibold text-gray-900">Datos Laborales</h2>
          </div>
          <div className="space-y-2 text-sm">
            <p>
              <span className="text-gray-500">Cargo:</span>{" "}
              <span className="font-medium">{empleado.cargo || "—"}</span>
            </p>
            <p>
              <span className="text-gray-500">Departamento:</span>{" "}
              <span className="font-medium">
                {empleado.departamento || "—"}
              </span>
            </p>
            <p>
              <span className="text-gray-500">Fecha Ingreso:</span>{" "}
              <span className="font-medium">{empleado.fecha_ingreso}</span>
            </p>
            <p>
              <span className="text-gray-500">Tipo Contrato:</span>{" "}
              <span className="font-medium capitalize">
                {empleado.tipo_contrato}
              </span>
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-cyan-50 rounded-lg text-cyan-600">
              <CreditCard className="h-5 w-5" />
            </div>
            <h2 className="font-semibold text-gray-900">Compensación</h2>
          </div>
          <div className="space-y-2 text-sm">
            <p>
              <span className="text-gray-500">Sueldo Quincenal:</span>{" "}
              <span className="font-semibold text-gray-900">
                {formatCurrency(empleado.sueldo_quincenal)}
              </span>
            </p>
            <p>
              <span className="text-gray-500">Tarifa Hora:</span>{" "}
              <span className="font-medium">
                {formatCurrency(empleado.tarifa_hora)}
              </span>
            </p>
            <p>
              <span className="text-gray-500">Vacaciones Disponibles:</span>{" "}
              <span className="font-medium">
                {diasVacDisponibles} días
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Active Loans */}
      {prestamos && prestamos.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Wallet className="h-5 w-5 text-orange-500" />
            Préstamos Activos
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {prestamos.map((p) => (
              <div
                key={p.id}
                className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-sm text-gray-500">Saldo Pendiente</p>
                    <p className="text-xl font-bold text-gray-900">
                      {formatCurrency(p.saldo_pendiente)}
                    </p>
                  </div>
                  <span className="px-2.5 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                    Activo
                  </span>
                </div>
                <div className="text-sm text-gray-500 space-y-1">
                  <p>
                    Monto original: {formatCurrency(p.monto_total)}
                  </p>
                  <p>Cuota quincenal: {formatCurrency(p.cuota_quincenal)}</p>
                  <p>
                    Cuotas: {p.numero_cuotas_pagadas}/
                    {p.numero_cuotas_estimado || "—"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Payroll */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <FileText className="h-5 w-5 text-cyan-500" />
          Últimas Nóminas
        </h2>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-500">
                  Período
                </th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">
                  Devengado
                </th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">
                  Deducciones
                </th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">
                  Neto
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(!nominaReciente || nominaReciente.length === 0) ? (
                <tr>
                  <td
                    colSpan={4}
                    className="text-center py-8 text-gray-400"
                  >
                    No hay registros de nómina
                  </td>
                </tr>
              ) : (
                nominaReciente.map((item) => {
                  const q = item.quincena as {
                    periodo_inicio: string;
                    periodo_fin: string;
                    estado: string;
                  } | null;
                  return (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-900">
                        {q
                          ? `${q.periodo_inicio} — ${q.periodo_fin}`
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        {formatCurrency(item.subtotal_devengado)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-red-500">
                        {formatCurrency(item.total_deducciones)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold">
                        {formatCurrency(item.total_neto)}
                      </td>
                    </tr>
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
