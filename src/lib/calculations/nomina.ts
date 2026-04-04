/**
 * Motor de Cálculo de Nómina — SERVIMAST
 * Base legal: Ley 16-92 Código de Trabajo RD + Ley 87-01 TSS
 */

import type { NominaCalcInput, NominaCalcConfig, NominaCalcResult } from "@/types";

/** Configuración por defecto según la ley vigente */
export const DEFAULT_CONFIG: NominaCalcConfig = {
  afp_empleado_pct: 0.0287,   // 2.87% — Art. 39 Ley 87-01
  sfs_empleado_pct: 0.0304,   // 3.04% — Art. 22 Ley 87-01
  afp_patronal_pct: 0.0710,   // 7.10% — Art. 39 Ley 87-01
  sfs_patronal_pct: 0.0709,   // 7.09% — Art. 22 Ley 87-01
  srl_patronal_pct: 0.0120,   // 1.20% — SRL
  factor_extra_diurna: 1.35,  // Art. 203 CT
  factor_extra_nocturna: 2.00, // Art. 211 CT
  factor_extra_feriado: 2.00,  // Art. 605 CT
  limite_descuentos_pct: 0.80, // Política interna (80%)
  isr_exencion_anual: 624329,  // DGII vigente
};

/**
 * Calcula el ISR mensual según escala progresiva DGII
 * Art. 296 Código Tributario RD
 */
export function calcularISRQuincenal(salarioAnualProyectado: number, exencion: number): number {
  if (salarioAnualProyectado <= exencion) return 0;

  const baseGravable = salarioAnualProyectado - exencion;
  let isrAnual = 0;

  // Escala progresiva DGII 2025-2026
  if (baseGravable <= 416220) {
    isrAnual = baseGravable * 0.15;
  } else if (baseGravable <= 624329) {
    isrAnual = 62433 + (baseGravable - 416220) * 0.20;
  } else {
    isrAnual = 104099 + (baseGravable - 624329) * 0.25;
  }

  // Dividir entre 24 quincenas
  return Math.round((isrAnual / 24) * 100) / 100;
}

/**
 * Calcula todos los conceptos de nómina de un empleado para una quincena
 */
export function calcularNomina(
  input: NominaCalcInput,
  config: NominaCalcConfig = DEFAULT_CONFIG
): NominaCalcResult {
  // 1. SALARIO BASE
  const salario_base = round(input.horas_base * input.tarifa_hora);

  // 2. HORAS EXTRAS (Código de Trabajo RD)
  const monto_extras_diurnas = round(
    input.horas_extras_diurnas * input.tarifa_hora * config.factor_extra_diurna
  );
  const monto_extras_nocturnas = round(
    input.horas_extras_nocturnas * input.tarifa_hora * config.factor_extra_nocturna
  );
  const monto_extras_feriados = round(
    input.horas_extras_feriados * input.tarifa_hora * config.factor_extra_feriado
  );

  // 3. INSTALACIONES
  const monto_gpon = round(input.instalaciones_gpon * input.tarifa_gpon);
  const monto_red = round(input.instalaciones_red * input.tarifa_red);

  // 4. SUBTOTAL DEVENGADO
  const subtotal_devengado = round(
    salario_base +
    monto_extras_diurnas +
    monto_extras_nocturnas +
    monto_extras_feriados +
    monto_gpon +
    monto_red +
    input.metas_cumplimiento +
    input.otros_ingresos
  );

  // 5. DEDUCCIÓN POR FALTAS (días hábiles reales)
  const dias_habiles = input.dias_habiles_quincena || 11; // ~11 días hábiles por quincena
  const valor_dia = salario_base / dias_habiles;
  const deduccion_faltas = round(input.faltas_dias * valor_dia);

  // 6. BASE PARA SEGURIDAD SOCIAL (sobre sueldo base, no sobre devengado total)
  // Ley 87-01: cotizaciones se calculan sobre el salario ordinario (sueldo base quincenal)
  const base_seguridad_social = round(salario_base);

  // 7. AFP Y SFS (Ley 87-01) — calculados sobre salario base
  const afp_monto = round(base_seguridad_social * config.afp_empleado_pct);
  const sfs_monto = round(base_seguridad_social * config.sfs_empleado_pct);

  // 8. APORTES PATRONALES (para TSS — no descuentan al empleado) — sobre salario base
  const afp_patronal = round(base_seguridad_social * config.afp_patronal_pct);
  const sfs_patronal = round(base_seguridad_social * config.sfs_patronal_pct);
  const srl_patronal = round(base_seguridad_social * config.srl_patronal_pct);

  // 9. ISR
  const salarioAnualProyectado = subtotal_devengado * 24;
  const isr_monto = calcularISRQuincenal(salarioAnualProyectado, config.isr_exencion_anual);

  // 10. PRÉSTAMOS (múltiples, ordenados por fecha, el más antiguo primero)
  let deduccion_prestamos = 0;
  for (const prestamo of input.prestamos_activos) {
    const cuota = Math.min(prestamo.cuota_quincenal, prestamo.saldo_pendiente);
    deduccion_prestamos += round(cuota);
  }

  // 11. TOTAL DEDUCCIONES Y NETO
  const total_deducciones = round(
    deduccion_faltas +
    afp_monto +
    sfs_monto +
    isr_monto +
    deduccion_prestamos +
    input.otros_descuentos
  );
  const total_neto = round(subtotal_devengado - total_deducciones);

  // 12. ALERTAS
  const alerta_neto_negativo = total_neto <= 0;
  const limite_descuentos = subtotal_devengado * config.limite_descuentos_pct;
  const alerta_limite_descuentos = total_deducciones > limite_descuentos;

  return {
    salario_base,
    monto_extras_diurnas,
    monto_extras_nocturnas,
    monto_extras_feriados,
    monto_gpon,
    monto_red,
    subtotal_devengado,
    deduccion_faltas,
    base_seguridad_social,
    afp_monto,
    sfs_monto,
    isr_monto,
    deduccion_prestamos,
    total_deducciones,
    total_neto,
    afp_patronal,
    sfs_patronal,
    srl_patronal,
    alerta_neto_negativo,
    alerta_limite_descuentos,
  };
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
