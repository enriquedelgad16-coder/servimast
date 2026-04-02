import { createClient } from "@/lib/supabase/server";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage() {
  const supabase = await createClient();

  // ---------------------------------------------------------------------------
  // 1. Empleados activos (total + por departamento)
  // ---------------------------------------------------------------------------
  const { count: totalEmpleados } = await supabase
    .from("empleados")
    .select("id", { count: "exact", head: true })
    .eq("estado", "activo");

  const { data: empleadosRaw } = await supabase
    .from("empleados")
    .select("id, departamento, fecha_ingreso, tipo_contrato")
    .eq("estado", "activo");

  const empleadosPorDepto: Record<string, number> = {};
  (empleadosRaw ?? []).forEach((e) => {
    const dept = e.departamento || "Sin departamento";
    empleadosPorDepto[dept] = (empleadosPorDepto[dept] || 0) + 1;
  });

  const departamentos = Object.keys(empleadosPorDepto).sort();

  // ---------------------------------------------------------------------------
  // 2. Ultimas 24 quincenas (all states) with nomina totals
  // ---------------------------------------------------------------------------
  const { data: quincenasRaw } = await supabase
    .from("quincenas")
    .select("id, periodo_inicio, periodo_fin, estado, descripcion, fecha_pago")
    .order("periodo_fin", { ascending: false })
    .limit(24);

  const quincenaIds = (quincenasRaw ?? []).map((q) => q.id);

  // Use correct column names from nomina_items table
  const { data: nominaItemsRaw } = quincenaIds.length
    ? await supabase
        .from("nomina_items")
        .select(
          "id, quincena_id, empleado_id, subtotal_devengado, total_deducciones, total_neto, horas_extras_diurnas, horas_extras_nocturnas, horas_extras_feriados, afp_monto, sfs_monto, isr_monto, afp_patronal_monto, sfs_patronal_monto, srl_patronal_monto, created_at"
        )
        .in("quincena_id", quincenaIds)
    : { data: [] };

  // Aggregate totals per quincena
  type QuincenaTotals = {
    id: string;
    periodo_inicio: string;
    periodo_fin: string;
    estado: string;
    descripcion: string | null;
    fecha_pago: string | null;
    total_devengado: number;
    total_deducciones: number;
    total_neto: number;
    total_empleados: number;
    horas_extras_diurnas: number;
    horas_extras_nocturnas: number;
    horas_extras_feriados: number;
    afp_patronal: number;
    sfs_patronal: number;
    srl_patronal: number;
  };

  const quincenasConTotales: QuincenaTotals[] = (quincenasRaw ?? []).map(
    (q) => {
      const items = (nominaItemsRaw ?? []).filter(
        (ni) => ni.quincena_id === q.id
      );
      return {
        id: q.id,
        periodo_inicio: q.periodo_inicio,
        periodo_fin: q.periodo_fin,
        estado: q.estado,
        descripcion: q.descripcion,
        fecha_pago: q.fecha_pago,
        total_devengado: items.reduce(
          (s, i) => s + Number(i.subtotal_devengado || 0),
          0
        ),
        total_deducciones: items.reduce(
          (s, i) => s + Number(i.total_deducciones || 0),
          0
        ),
        total_neto: items.reduce(
          (s, i) => s + Number(i.total_neto || 0),
          0
        ),
        total_empleados: items.length,
        horas_extras_diurnas: items.reduce(
          (s, i) => s + Number(i.horas_extras_diurnas || 0),
          0
        ),
        horas_extras_nocturnas: items.reduce(
          (s, i) => s + Number(i.horas_extras_nocturnas || 0),
          0
        ),
        horas_extras_feriados: items.reduce(
          (s, i) => s + Number(i.horas_extras_feriados || 0),
          0
        ),
        afp_patronal: items.reduce(
          (s, i) => s + Number(i.afp_patronal_monto || 0),
          0
        ),
        sfs_patronal: items.reduce(
          (s, i) => s + Number(i.sfs_patronal_monto || 0),
          0
        ),
        srl_patronal: items.reduce(
          (s, i) => s + Number(i.srl_patronal_monto || 0),
          0
        ),
      };
    }
  );

  // ---------------------------------------------------------------------------
  // 3. Prestamos activos
  // ---------------------------------------------------------------------------
  const { data: prestamosRaw, count: prestamosActivos } = await supabase
    .from("prestamos")
    .select("id, empleado_id, saldo_pendiente, cuota_quincenal, numero_cuotas_pagadas, estado, monto_total", {
      count: "exact",
    })
    .eq("estado", "activo");

  const saldoPrestamos = (prestamosRaw ?? []).reduce(
    (s, p) => s + Number(p.saldo_pendiente || 0),
    0
  );

  const prestamosPorTerminar = (prestamosRaw ?? []).filter(
    (p) =>
      Number(p.saldo_pendiente) > 0 &&
      Number(p.saldo_pendiente) <= Number(p.cuota_quincenal) * 2
  );

  // ---------------------------------------------------------------------------
  // 4. Costo patronal mensual (from actual stored patronal amounts)
  // Group quincenas by month and sum patronal for the latest month with data
  // ---------------------------------------------------------------------------
  const quincenasConDatos = quincenasConTotales.filter(
    (q) => q.total_empleados > 0
  );

  // Group by month (YYYY-MM from periodo_fin)
  const patronalPorMes: Record<string, { afp: number; sfs: number; srl: number; total: number; quincenas: number }> = {};
  quincenasConDatos.forEach((q) => {
    const mes = q.periodo_fin.substring(0, 7);
    if (!patronalPorMes[mes]) {
      patronalPorMes[mes] = { afp: 0, sfs: 0, srl: 0, total: 0, quincenas: 0 };
    }
    patronalPorMes[mes].afp += q.afp_patronal;
    patronalPorMes[mes].sfs += q.sfs_patronal;
    patronalPorMes[mes].srl += q.srl_patronal;
    patronalPorMes[mes].total += q.afp_patronal + q.sfs_patronal + q.srl_patronal;
    patronalPorMes[mes].quincenas += 1;
  });

  // Get the latest month with data
  const mesesOrdenados = Object.keys(patronalPorMes).sort().reverse();
  const ultimoMes = mesesOrdenados[0] || "";
  const costoPatronal = patronalPorMes[ultimoMes] || { afp: 0, sfs: 0, srl: 0, total: 0, quincenas: 0 };

  // ---------------------------------------------------------------------------
  // 5. Actividad reciente (ultimos 5 nomina_items)
  // ---------------------------------------------------------------------------
  const { data: actividadReciente } = await supabase
    .from("nomina_items")
    .select(
      "id, empleado_id, total_neto, created_at, empleados(nombre, apellido, numero_empleado), quincenas(periodo_inicio, periodo_fin)"
    )
    .order("created_at", { ascending: false })
    .limit(5);

  // ---------------------------------------------------------------------------
  // 6. Alertas
  // ---------------------------------------------------------------------------
  const hoy = new Date();
  const empleadosProbacion = (empleadosRaw ?? []).filter((e) => {
    if (!e.fecha_ingreso) return false;
    const ingreso = new Date(e.fecha_ingreso);
    const diasTranscurridos = Math.floor(
      (hoy.getTime() - ingreso.getTime()) / (1000 * 60 * 60 * 24)
    );
    return diasTranscurridos >= 60 && diasTranscurridos <= 90;
  });

  const { count: quincenasBorradorCount } = await supabase
    .from("quincenas")
    .select("id", { count: "exact", head: true })
    .eq("estado", "borrador");

  // ---------------------------------------------------------------------------
  // Build props
  // ---------------------------------------------------------------------------
  return (
    <DashboardClient
      totalEmpleados={totalEmpleados ?? 0}
      empleadosPorDepto={empleadosPorDepto}
      departamentos={departamentos}
      quincenas={quincenasConTotales}
      prestamosActivos={prestamosActivos ?? 0}
      saldoPrestamos={saldoPrestamos}
      costoPatronal={{
        afp: costoPatronal.afp,
        sfs: costoPatronal.sfs,
        srl: costoPatronal.srl,
        total: costoPatronal.total,
        quincenas: costoPatronal.quincenas,
        mes: ultimoMes,
      }}
      actividadReciente={(actividadReciente ?? []).map((a) => ({
        id: a.id,
        empleado_id: a.empleado_id,
        total_neto: Number(a.total_neto),
        created_at: a.created_at,
        empleado_nombre:
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (a.empleados as any)?.nombre && (a.empleados as any)?.apellido
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ? `${(a.empleados as any).nombre} ${(a.empleados as any).apellido}`
            : "Empleado",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        empleado_numero: (a.empleados as any)?.numero_empleado ?? "",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        periodo: (a.quincenas as any)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ? `${(a.quincenas as any).periodo_inicio} - ${(a.quincenas as any).periodo_fin}`
          : "",
      }))}
      alertas={{
        empleadosProbacion: empleadosProbacion.length,
        prestamosPorTerminar: prestamosPorTerminar.length,
        quincenasBorrador: quincenasBorradorCount ?? 0,
      }}
    />
  );
}
