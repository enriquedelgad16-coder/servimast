import { createClient } from "@/lib/supabase/server";
import {
  Users,
  Calculator,
  Wallet,
  TrendingUp,
  AlertTriangle,
  Clock,
} from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  color: string;
}

function StatCard({ title, value, subtitle, icon: Icon, color }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
          {subtitle && (
            <p className="mt-1 text-sm text-gray-400">{subtitle}</p>
          )}
        </div>
        <div className={`rounded-lg p-3 ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();

  // Fetch stats
  const [empleadosRes, quincenasRes, prestamosRes] = await Promise.all([
    supabase
      .from("empleados")
      .select("id", { count: "exact", head: true })
      .eq("estado", "activo"),
    supabase
      .from("quincenas")
      .select("id, estado, periodo_inicio, periodo_fin")
      .order("periodo_fin", { ascending: false })
      .limit(1),
    supabase
      .from("prestamos")
      .select("id, saldo_pendiente", { count: "exact" })
      .eq("estado", "activo"),
  ]);

  const totalEmpleados = empleadosRes.count || 0;
  const ultimaQuincena = quincenasRes.data?.[0];
  const prestamosActivos = prestamosRes.count || 0;
  const saldoPrestamos = (prestamosRes.data || []).reduce(
    (sum, p) => sum + Number(p.saldo_pendiente),
    0
  );

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("es-DO", {
      style: "currency",
      currency: "DOP",
      minimumFractionDigits: 2,
    }).format(amount);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">
          Resumen general del sistema de nómina
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Empleados Activos"
          value={totalEmpleados}
          icon={Users}
          color="bg-cyan-500"
        />
        <StatCard
          title="Última Quincena"
          value={ultimaQuincena?.estado || "Sin datos"}
          subtitle={
            ultimaQuincena
              ? `${ultimaQuincena.periodo_inicio} — ${ultimaQuincena.periodo_fin}`
              : undefined
          }
          icon={Calculator}
          color="bg-orange-500"
        />
        <StatCard
          title="Préstamos Activos"
          value={prestamosActivos}
          subtitle={`Saldo: ${formatCurrency(saldoPrestamos)}`}
          icon={Wallet}
          color="bg-info-500"
        />
        <StatCard
          title="Costo Patronal"
          value="—"
          subtitle="AFP + SFS + SRL"
          icon={TrendingUp}
          color="bg-success-600"
        />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-cyan-500" />
            Acciones Rápidas
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <a
              href="/nomina"
              className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <Calculator className="h-5 w-5 text-orange-500" />
              <span className="text-sm font-medium text-gray-700">
                Nueva Quincena
              </span>
            </a>
            <a
              href="/empleados"
              className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <Users className="h-5 w-5 text-cyan-500" />
              <span className="text-sm font-medium text-gray-700">
                Agregar Empleado
              </span>
            </a>
            <a
              href="/prestamos"
              className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <Wallet className="h-5 w-5 text-info-500" />
              <span className="text-sm font-medium text-gray-700">
                Nuevo Préstamo
              </span>
            </a>
            <a
              href="/reportes"
              className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <TrendingUp className="h-5 w-5 text-success-600" />
              <span className="text-sm font-medium text-gray-700">
                Ver Reportes
              </span>
            </a>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning-500" />
            Alertas
          </h2>
          <div className="space-y-3">
            <p className="text-sm text-gray-500 italic">
              No hay alertas pendientes
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
