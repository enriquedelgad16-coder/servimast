import { z } from "zod";

// Validación de cédula dominicana
const cedulaRegex = /^\d{3}-?\d{7}-?\d{1}$/;

export const empleadoSchema = z.object({
  cedula: z
    .string()
    .min(11, "La cédula debe tener 11 dígitos")
    .regex(cedulaRegex, "Formato de cédula inválido (XXX-XXXXXXX-X)"),
  nombre: z.string().min(2, "El nombre es requerido"),
  apellido: z.string().min(2, "El apellido es requerido"),
  fecha_nacimiento: z.string().optional().nullable(),
  direccion: z.string().optional().nullable(),
  email: z.string().email("Correo electrónico inválido").optional().nullable(),
  telefono_trabajo: z.string().optional().nullable(),
  telefono_personal: z.string().optional().nullable(),
  fecha_ingreso: z.string().min(1, "La fecha de ingreso es requerida"),
  cargo: z.string().optional().nullable(),
  departamento: z.string().optional().nullable(),
  tipo_contrato: z.enum(["determinado", "indeterminado"]).default("indeterminado"),
  periodo_prueba_fin: z.string().optional().nullable(),
  sueldo_quincenal: z
    .number({ message: "El sueldo quincenal es requerido" })
    .positive("El sueldo debe ser mayor a 0"),
  banco: z.string().optional().nullable(),
  numero_cuenta: z.string().optional().nullable(),
  nss: z.string().optional().nullable(),
});

export const nominaItemSchema = z.object({
  horas_base: z.number().min(0).default(88),
  horas_extras_diurnas: z.number().min(0).default(0),
  horas_extras_nocturnas: z.number().min(0).default(0),
  horas_extras_feriados: z.number().min(0).default(0),
  instalaciones_gpon: z.number().int().min(0).default(0),
  instalaciones_red: z.number().int().min(0).default(0),
  tarifa_instalacion_gpon: z.number().min(0).default(0),
  tarifa_instalacion_red: z.number().min(0).default(0),
  metas_cumplimiento: z.number().min(0).default(0),
  otros_ingresos: z.number().min(0).default(0),
  descripcion_otros_ingresos: z.string().optional().nullable(),
  faltas_dias: z.number().min(0).default(0),
  otros_descuentos: z.number().min(0).default(0),
  descripcion_otros_descuentos: z.string().optional().nullable(),
  notas: z.string().optional().nullable(),
});

export const prestamoSchema = z.object({
  empleado_id: z.string().uuid("Debe seleccionar un empleado"),
  monto_total: z
    .number({ message: "El monto total es requerido" })
    .positive("El monto debe ser mayor a 0"),
  cuota_quincenal: z
    .number({ message: "La cuota quincenal es requerida" })
    .positive("La cuota debe ser mayor a 0"),
  fecha_inicio: z.string().min(1, "La fecha de inicio es requerida"),
  notas: z.string().optional().nullable(),
});

export const quincenaSchema = z.object({
  periodo_inicio: z.string().min(1, "La fecha de inicio es requerida"),
  periodo_fin: z.string().min(1, "La fecha de fin es requerida"),
  descripcion: z.string().optional().nullable(),
  notas: z.string().optional().nullable(),
});

export const liquidacionSchema = z.object({
  empleado_id: z.string().uuid("Debe seleccionar un empleado"),
  fecha_salida: z.string().min(1, "La fecha de salida es requerida"),
  motivo: z.enum(["despido_sin_causa", "renuncia", "mutuo_acuerdo", "fin_contrato"]),
  monto_salarios_pendientes: z.number().min(0).default(0),
  notas: z.string().optional().nullable(),
});

export const loginSchema = z.object({
  email: z.string().email("Correo electrónico inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

export type EmpleadoFormData = z.infer<typeof empleadoSchema>;
export type NominaItemFormData = z.infer<typeof nominaItemSchema>;
export type PrestamoFormData = z.infer<typeof prestamoSchema>;
export type QuincenaFormData = z.infer<typeof quincenaSchema>;
export type LiquidacionFormData = z.infer<typeof liquidacionSchema>;
export type LoginFormData = z.infer<typeof loginSchema>;
