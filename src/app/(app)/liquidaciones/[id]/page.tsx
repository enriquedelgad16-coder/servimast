import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { ArrowLeft, FileText, Calculator, User, Briefcase } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

const MOTIVO_LABELS: Record<string, string> = {
  despido_sin_causa: "Despido sin causa justificada",
  renuncia: "Renuncia voluntaria",
  mutuo_acuerdo: "Mutuo acuerdo",
  fin_contrato: "Fin de contrato",
};

interface PageProps {
  params: Promise<{ id: string }>;
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

function MontoRow({
  label,
  dias,
  meses,
  monto,
  sublabel,
}: {
  label: string;
  dias?: number;
  meses?: number;
  monto: number;
  sublabel?: string;
}) {
  return (
    <div className="flex justify-between items-center py-3">
      <div>
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-xs text-gray-400">
          {sublabel && <span>{sublabel}</span>}
          {dias !== undefined && <span> — {dias} dias</span>}
          {meses !== undefined && <span> — {meses} meses</span>}
        </p>
      </div>
      <span className="text-sm font-mono font-semibold text-gray-900">
        {formatCurrency(monto)}
      </span>
    </div>
  );
}

export default async function LiquidacionDetallePage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: liq, error } = await supabase
    .from("liquidaciones")
    .select("*, empleado:empleados(nombre, apellido, numero_empleado, cedula, cargo, departamento)")
    .eq("id", id)
    .single();

  if (error || !liq) {
    notFound();
  }

  const emp = liq.empleado as {
    nombre: string;
    apellido: string;
    numero_empleado: string;
    cedula: string;
    cargo: string | null;
    departamento: string | null;
  } | null;

  const aprobada = !!liq.fecha_aprobacion;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link
            href="/liquidaciones"
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Liquidacion — {emp ? `${emp.nombre} ${emp.apellido}` : "Empleado"}
            </h1>
            <p className="text-gray-500 text-sm flex items-center gap-2">
              {emp?.numero_empleado}
              <span
                className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                  aprobada
                    ? "bg-success-100 text-success-600"
                    : "bg-warning-100 text-warning-500"
                }`}
              >
                {aprobada ? "Aprobada" : "Pendiente"}
              </span>
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Datos del Empleado */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <User className="h-5 w-5 text-cyan-500" />
            Datos del Empleado
          </h2>
          <dl className="grid grid-cols-2 gap-4">
            <Field label="Nombre" value={emp ? `${emp.nombre} ${emp.apellido}` : null} />
            <Field label="No. Empleado" value={emp?.numero_empleado || null} />
            <Field label="Cedula" value={emp?.cedula || null} />
            <Field label="Cargo" value={emp?.cargo || null} />
            <Field label="Departamento" value={emp?.departamento || null} />
          </dl>
        </div>

        {/* Datos de la Liquidacion */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-orange-500" />
            Datos de la Terminacion
          </h2>
          <dl className="grid grid-cols-2 gap-4">
            <Field label="Fecha Ingreso" value={formatDate(liq.fecha_ingreso)} />
            <Field label="Fecha Salida" value={formatDate(liq.fecha_salida)} />
            <Field
              label="Tiempo Trabajado"
              value={`${liq.anos_trabajados} ano(s), ${liq.meses_trabajados % 12} mes(es)`}
            />
            <Field label="Motivo" value={MOTIVO_LABELS[liq.motivo] || liq.motivo} />
            <Field label="Sueldo Mensual" value={formatCurrency(liq.sueldo_mensual)} />
            <Field label="Sueldo Diario" value={formatCurrency(liq.sueldo_diario)} />
          </dl>
        </div>

        {/* Desglose de Montos */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm lg:col-span-2">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calculator className="h-5 w-5 text-cyan-500" />
            Desglose de la Liquidacion
          </h2>

          <div className="divide-y divide-gray-100">
            <MontoRow
              label="Preaviso"
              dias={liq.dias_preaviso}
              monto={liq.monto_preaviso}
              sublabel="Art. 76 Codigo de Trabajo"
            />
            <MontoRow
              label="Cesantia"
              dias={liq.dias_cesantia}
              monto={liq.monto_cesantia}
              sublabel="Art. 80 Codigo de Trabajo"
            />
            <MontoRow
              label="Vacaciones Proporcionales"
              dias={liq.dias_vacaciones_proporcionales}
              monto={liq.monto_vacaciones}
              sublabel="Art. 177 Codigo de Trabajo"
            />
            <MontoRow
              label="Regalia Pascual Proporcional"
              meses={liq.meses_regalia}
              monto={liq.monto_regalia}
              sublabel="Art. 219 Codigo de Trabajo"
            />
            {liq.monto_salarios_pendientes > 0 && (
              <MontoRow
                label="Salarios Pendientes"
                monto={liq.monto_salarios_pendientes}
              />
            )}
          </div>

          {/* Total */}
          <div className="mt-4 bg-orange-50 border border-orange-200 rounded-lg p-4 flex justify-between items-center">
            <span className="text-lg font-bold text-gray-900">TOTAL LIQUIDACION</span>
            <span className="text-xl font-bold text-orange-600 font-mono">
              {formatCurrency(liq.total_liquidacion)}
            </span>
          </div>
        </div>

        {/* Notas y Auditoria */}
        {(liq.notas || liq.calculado_por || liq.aprobado_por) && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm lg:col-span-2">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-gray-400" />
              Informacion Adicional
            </h2>
            <dl className="grid grid-cols-2 gap-4">
              {liq.notas && (
                <div className="col-span-2">
                  <Field label="Notas" value={liq.notas} />
                </div>
              )}
              <Field label="Calculado por" value={liq.calculado_por} />
              <Field label="Aprobado por" value={liq.aprobado_por} />
              {liq.fecha_aprobacion && (
                <Field label="Fecha Aprobacion" value={formatDate(liq.fecha_aprobacion)} />
              )}
              <Field label="Fecha de Creacion" value={formatDate(liq.created_at)} />
            </dl>
          </div>
        )}
      </div>
    </div>
  );
}
