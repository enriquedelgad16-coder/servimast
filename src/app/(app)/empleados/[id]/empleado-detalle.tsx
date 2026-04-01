import Link from "next/link";
import { ArrowLeft, Edit, User, Briefcase, Building2, CreditCard } from "lucide-react";
import { formatCedula, formatCurrency, formatDate } from "@/lib/utils";
import type { Empleado } from "@/types";

const ESTADO_BADGES: Record<string, string> = {
  activo: "bg-success-100 text-success-600",
  inactivo: "bg-gray-100 text-gray-600",
  periodo_prueba: "bg-warning-100 text-warning-500",
  desvinculado: "bg-danger-100 text-danger-600",
};

interface Props {
  empleado: Empleado;
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-sm text-gray-500">{label}</dt>
      <dd className="text-sm font-medium text-gray-900 mt-0.5">
        {value || "—"}
      </dd>
    </div>
  );
}

export function EmpleadoDetalle({ empleado }: Props) {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link
            href="/empleados"
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {empleado.nombre} {empleado.apellido}
            </h1>
            <p className="text-gray-500 text-sm">
              {empleado.numero_empleado} &middot;{" "}
              <span
                className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_BADGES[empleado.estado] || ""}`}
              >
                {empleado.estado}
              </span>
            </p>
          </div>
        </div>
        <Link
          href={`/empleados/${empleado.id}?edit=true`}
          className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-4 py-2.5 rounded-lg transition-colors shadow-sm"
        >
          <Edit className="h-4 w-4" />
          Editar
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Datos Personales */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <User className="h-5 w-5 text-cyan-500" />
            Datos Personales
          </h2>
          <dl className="grid grid-cols-2 gap-4">
            <Field label="Cédula" value={formatCedula(empleado.cedula)} />
            <Field label="Fecha Nac." value={empleado.fecha_nacimiento ? formatDate(empleado.fecha_nacimiento) : null} />
            <Field label="Email" value={empleado.email} />
            <Field label="Tel. Trabajo" value={empleado.telefono_trabajo} />
            <Field label="Tel. Personal" value={empleado.telefono_personal} />
            <div className="col-span-2">
              <Field label="Dirección" value={empleado.direccion} />
            </div>
          </dl>
        </div>

        {/* Datos Laborales */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-orange-500" />
            Datos Laborales
          </h2>
          <dl className="grid grid-cols-2 gap-4">
            <Field label="Fecha Ingreso" value={formatDate(empleado.fecha_ingreso)} />
            <Field label="Cargo" value={empleado.cargo} />
            <Field label="Departamento" value={empleado.departamento} />
            <Field label="Tipo Contrato" value={empleado.tipo_contrato === "indeterminado" ? "Indeterminado" : "Determinado"} />
            <Field label="Fin Período Prueba" value={empleado.periodo_prueba_fin ? formatDate(empleado.periodo_prueba_fin) : null} />
          </dl>
        </div>

        {/* Datos Salariales */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-success-600" />
            Datos Salariales
          </h2>
          <dl className="grid grid-cols-2 gap-4">
            <Field label="Sueldo Quincenal" value={formatCurrency(empleado.sueldo_quincenal)} />
            <Field label="Tarifa Hora" value={formatCurrency(empleado.tarifa_hora)} />
            <Field label="Sueldo Mensual" value={formatCurrency(empleado.sueldo_quincenal * 2)} />
          </dl>
        </div>

        {/* Datos Bancarios */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-info-500" />
            Datos Bancarios y SS
          </h2>
          <dl className="grid grid-cols-2 gap-4">
            <Field label="Banco" value={empleado.banco} />
            <Field label="No. Cuenta" value={empleado.numero_cuenta} />
            <Field label="NSS" value={empleado.nss} />
            <Field label="Vacaciones Acum." value={`${empleado.dias_vacaciones_acumulados} días`} />
          </dl>
        </div>
      </div>
    </div>
  );
}
