/**
 * Cálculo de Liquidación — SERVIMAST
 * Base legal: Ley 16-92 Código de Trabajo RD
 */

import type { MotivoLiquidacion } from "@/types";
import { differenceInMonths, differenceInYears, getMonth } from "date-fns";

export interface LiquidacionInput {
  fecha_ingreso: Date;
  fecha_salida: Date;
  sueldo_mensual: number;
  motivo: MotivoLiquidacion;
  monto_salarios_pendientes?: number;
}

export interface LiquidacionResult {
  anos_trabajados: number;
  meses_trabajados: number;
  sueldo_diario: number;
  dias_preaviso: number;
  monto_preaviso: number;
  dias_cesantia: number;
  monto_cesantia: number;
  dias_vacaciones_proporcionales: number;
  monto_vacaciones: number;
  meses_regalia: number;
  monto_regalia: number;
  monto_salarios_pendientes: number;
  total_liquidacion: number;
}

/**
 * Calcula la liquidación completa de un empleado
 */
export function calcularLiquidacion(input: LiquidacionInput): LiquidacionResult {
  const meses = differenceInMonths(input.fecha_salida, input.fecha_ingreso);
  const anos = differenceInYears(input.fecha_salida, input.fecha_ingreso);

  // Sueldo diario: sueldo mensual / 23.83 (promedio días laborables)
  const sueldo_diario = round(input.sueldo_mensual / 23.83);

  // 1. PREAVISO — Art. 76 CT
  let dias_preaviso = 0;
  if (input.motivo !== "fin_contrato") {
    if (meses < 3) dias_preaviso = 7;
    else if (meses < 6) dias_preaviso = 14;
    else if (meses < 12) dias_preaviso = 28;
    else dias_preaviso = 30;
  }
  const monto_preaviso = round(sueldo_diario * dias_preaviso);

  // 2. CESANTÍA — Art. 80 CT (solo despido sin causa justificada)
  let dias_cesantia = 0;
  if (input.motivo === "despido_sin_causa") {
    if (meses >= 3 && meses < 6) {
      dias_cesantia = 6;
    } else if (meses >= 6 && meses < 12) {
      dias_cesantia = 13;
    } else if (anos >= 1 && anos < 5) {
      dias_cesantia = 21 * anos;
    } else if (anos >= 5) {
      dias_cesantia = 23 * anos;
    }
  }
  const monto_cesantia = round(sueldo_diario * dias_cesantia);

  // 3. VACACIONES PROPORCIONALES — Art. 177 CT
  const dias_vacaciones_anuales = anos >= 5 ? 18 : 14;
  const meses_trabajados_en_anio = meses % 12;
  const dias_vacaciones_proporcionales = round(
    (dias_vacaciones_anuales / 12) * meses_trabajados_en_anio
  );
  const monto_vacaciones = round(sueldo_diario * dias_vacaciones_proporcionales);

  // 4. REGALÍA PASCUAL PROPORCIONAL — Art. 219 CT
  // Meses trabajados en el año actual (enero a la fecha de salida)
  const mesActual = getMonth(input.fecha_salida) + 1; // 1-indexed
  const meses_regalia = mesActual;
  const monto_regalia = round((input.sueldo_mensual / 12) * meses_regalia);

  // 5. SALARIOS PENDIENTES
  const monto_salarios_pendientes = input.monto_salarios_pendientes || 0;

  // 6. TOTAL
  const total_liquidacion = round(
    monto_preaviso +
    monto_cesantia +
    monto_vacaciones +
    monto_regalia +
    monto_salarios_pendientes
  );

  return {
    anos_trabajados: anos,
    meses_trabajados: meses,
    sueldo_diario,
    dias_preaviso,
    monto_preaviso,
    dias_cesantia,
    monto_cesantia,
    dias_vacaciones_proporcionales,
    monto_vacaciones,
    meses_regalia,
    monto_regalia,
    monto_salarios_pendientes,
    total_liquidacion,
  };
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
