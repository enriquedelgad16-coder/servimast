// ===== ENUMS =====
export type RolUsuario = "admin" | "operador" | "empleado";
export type EstadoQuincena = "borrador" | "procesando" | "aprobada" | "pagada";
export type EstadoPrestamo = "activo" | "pagado" | "cancelado";
export type EstadoNominaItem = "borrador" | "aprobado" | "pagado";
export type TipoHoraExtra = "diurna" | "nocturna" | "feriado";
export type MotivoLiquidacion =
  | "despido_sin_causa"
  | "renuncia"
  | "mutuo_acuerdo"
  | "fin_contrato";
export type TipoContrato = "determinado" | "indeterminado";
export type EstadoEmpleado =
  | "activo"
  | "inactivo"
  | "periodo_prueba"
  | "desvinculado";

// ===== ENTIDADES =====
export interface Empleado {
  id: string;
  numero_empleado: string;
  cedula: string;
  nombre: string;
  apellido: string;
  fecha_nacimiento: string | null;
  direccion: string | null;
  email: string | null;
  telefono_trabajo: string | null;
  telefono_personal: string | null;
  fecha_ingreso: string;
  cargo: string | null;
  departamento: string | null;
  tipo_contrato: TipoContrato;
  periodo_prueba_fin: string | null;
  sueldo_quincenal: number;
  tarifa_hora: number;
  banco: string | null;
  numero_cuenta: string | null;
  nss: string | null;
  estado: EstadoEmpleado;
  dias_vacaciones_acumulados: number;
  dias_vacaciones_tomados: number;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  rol: RolUsuario;
  empleado_id: string | null;
  nombre_display: string | null;
  activo: boolean;
  ultimo_acceso: string | null;
  created_at: string;
}

export interface Quincena {
  id: string;
  periodo_inicio: string;
  periodo_fin: string;
  dias_habiles: number | null;
  estado: EstadoQuincena;
  descripcion: string | null;
  creado_por: string | null;
  aprobado_por: string | null;
  fecha_aprobacion: string | null;
  fecha_pago: string | null;
  marcado_pagado_por: string | null;
  notas: string | null;
  created_at: string;
  updated_at: string;
}

export interface NominaItem {
  id: string;
  quincena_id: string;
  empleado_id: string;
  horas_base: number;
  tarifa_hora: number;
  horas_extras_diurnas: number;
  horas_extras_nocturnas: number;
  horas_extras_feriados: number;
  tarifa_hora_extra: number | null;
  instalaciones_gpon: number;
  instalaciones_red: number;
  tarifa_instalacion_gpon: number;
  tarifa_instalacion_red: number;
  metas_cumplimiento: number;
  otros_ingresos: number;
  descripcion_otros_ingresos: string | null;
  faltas_dias: number;
  isr_aplica: boolean;
  isr_monto: number;
  salario_base_calc: number;
  monto_extras_diurnas: number;
  monto_extras_nocturnas: number;
  monto_extras_feriados: number;
  monto_instalaciones_gpon: number;
  monto_instalaciones_red: number;
  subtotal_devengado: number;
  deduccion_por_faltas: number;
  afp_porcentaje: number;
  sfs_porcentaje: number;
  afp_monto: number;
  sfs_monto: number;
  deduccion_prestamos: number;
  otros_descuentos: number;
  descripcion_otros_descuentos: string | null;
  total_deducciones: number;
  total_neto: number;
  afp_patronal_monto: number;
  sfs_patronal_monto: number;
  srl_patronal_monto: number;
  estado: EstadoNominaItem;
  alerta_neto_negativo: boolean;
  alerta_limite_descuentos: boolean;
  numero_comprobante: string | null;
  pdf_url: string | null;
  pdf_generado_en: string | null;
  notas: string | null;
  created_at: string;
  updated_at: string;
  // Relations
  empleado?: Empleado;
}

export interface Prestamo {
  id: string;
  empleado_id: string;
  monto_total: number;
  cuota_quincenal: number;
  saldo_pendiente: number;
  fecha_inicio: string;
  fecha_cierre: string | null;
  estado: EstadoPrestamo;
  numero_cuotas_estimado: number | null;
  numero_cuotas_pagadas: number;
  notas: string | null;
  aprobado_por: string | null;
  cancelado_por: string | null;
  motivo_cancelacion: string | null;
  created_at: string;
  updated_at: string;
  // Relations
  empleado?: Empleado;
}

export interface PagoPrestamo {
  id: string;
  prestamo_id: string;
  nomina_item_id: string | null;
  quincena_id: string | null;
  monto_pagado: number;
  saldo_antes: number;
  saldo_despues: number;
  numero_cuota: number | null;
  fecha_pago: string;
  notas: string | null;
  created_at: string;
}

export type EstadoVacacion = "pendiente" | "aprobada" | "rechazada" | "completada";

export interface Vacacion {
  id: string;
  empleado_id: string;
  fecha_inicio: string;
  fecha_fin: string;
  dias_habiles: number;
  estado: EstadoVacacion;
  aprobado_por: string | null;
  notas: string | null;
  created_at: string;
  // Relations
  empleado?: Empleado;
}

export interface Liquidacion {
  id: string;
  empleado_id: string;
  fecha_ingreso: string;
  fecha_salida: string;
  anos_trabajados: number;
  meses_trabajados: number;
  motivo: MotivoLiquidacion;
  sueldo_mensual: number;
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
  notas: string | null;
  pdf_url: string | null;
  calculado_por: string | null;
  aprobado_por: string | null;
  fecha_aprobacion: string | null;
  created_at: string;
  updated_at: string;
  // Relations
  empleado?: Empleado;
}

export interface AuditLog {
  id: string;
  tabla_afectada: string;
  registro_id: string;
  accion: "INSERT" | "UPDATE" | "DELETE";
  datos_anteriores: Record<string, unknown> | null;
  datos_nuevos: Record<string, unknown> | null;
  campos_modificados: string[] | null;
  usuario_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface ConfiguracionSistema {
  id: string;
  clave: string;
  valor: string;
  descripcion: string | null;
  tipo: string | null;
  updated_at: string;
}

export interface Departamento {
  id: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

// ===== CÁLCULOS =====
export interface NominaCalcInput {
  horas_base: number;
  tarifa_hora: number;
  horas_extras_diurnas: number;
  horas_extras_nocturnas: number;
  horas_extras_feriados: number;
  instalaciones_gpon: number;
  instalaciones_red: number;
  tarifa_gpon: number;
  tarifa_red: number;
  metas_cumplimiento: number;
  otros_ingresos: number;
  faltas_dias: number;
  dias_habiles_quincena: number;
  otros_descuentos: number;
  prestamos_activos: {
    cuota_quincenal: number;
    saldo_pendiente: number;
  }[];
}

export interface NominaCalcConfig {
  afp_empleado_pct: number;
  sfs_empleado_pct: number;
  afp_patronal_pct: number;
  sfs_patronal_pct: number;
  srl_patronal_pct: number;
  factor_extra_diurna: number;
  factor_extra_nocturna: number;
  factor_extra_feriado: number;
  limite_descuentos_pct: number;
  isr_exencion_anual: number;
}

export interface NominaCalcResult {
  salario_base: number;
  monto_extras_diurnas: number;
  monto_extras_nocturnas: number;
  monto_extras_feriados: number;
  monto_gpon: number;
  monto_red: number;
  subtotal_devengado: number;
  deduccion_faltas: number;
  base_seguridad_social: number;
  afp_monto: number;
  sfs_monto: number;
  isr_monto: number;
  deduccion_prestamos: number;
  total_deducciones: number;
  total_neto: number;
  afp_patronal: number;
  sfs_patronal: number;
  srl_patronal: number;
  alerta_neto_negativo: boolean;
  alerta_limite_descuentos: boolean;
}
