-- ================================================================
-- SERVIMAST — Sistema de Nómina Quincenal
-- Esquema completo de base de datos
-- Base legal: Ley 16-92 Código de Trabajo RD + Ley 87-01 TSS
-- ================================================================

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===== ENUMS =====
CREATE TYPE rol_usuario AS ENUM ('admin', 'operador', 'empleado');
CREATE TYPE estado_quincena AS ENUM ('borrador', 'procesando', 'aprobada', 'pagada');
CREATE TYPE estado_prestamo AS ENUM ('activo', 'pagado', 'cancelado');
CREATE TYPE estado_nomina_item AS ENUM ('borrador', 'aprobado', 'pagado');
CREATE TYPE motivo_liquidacion AS ENUM ('despido_sin_causa', 'renuncia', 'mutuo_acuerdo', 'fin_contrato');
CREATE TYPE tipo_contrato AS ENUM ('determinado', 'indeterminado');
CREATE TYPE estado_empleado AS ENUM ('activo', 'inactivo', 'periodo_prueba', 'desvinculado');

-- ===== PROFILES (vinculado a auth.users) =====
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  rol rol_usuario NOT NULL DEFAULT 'empleado',
  empleado_id UUID,
  nombre_display TEXT,
  activo BOOLEAN NOT NULL DEFAULT true,
  ultimo_acceso TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===== EMPLEADOS =====
CREATE TABLE empleados (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero_empleado TEXT UNIQUE NOT NULL,
  cedula TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  fecha_nacimiento DATE,
  direccion TEXT,
  email TEXT,
  telefono_trabajo TEXT,
  telefono_personal TEXT,
  fecha_ingreso DATE NOT NULL,
  cargo TEXT,
  departamento TEXT,
  tipo_contrato tipo_contrato NOT NULL DEFAULT 'indeterminado',
  periodo_prueba_fin DATE,
  sueldo_quincenal NUMERIC(12,2) NOT NULL,
  tarifa_hora NUMERIC(10,2) NOT NULL GENERATED ALWAYS AS (sueldo_quincenal / 88) STORED,
  banco TEXT,
  numero_cuenta TEXT,
  nss TEXT,
  estado estado_empleado NOT NULL DEFAULT 'activo',
  dias_vacaciones_acumulados NUMERIC(5,2) NOT NULL DEFAULT 0,
  dias_vacaciones_tomados NUMERIC(5,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger para auto-generar numero_empleado
CREATE OR REPLACE FUNCTION generate_numero_empleado()
RETURNS TRIGGER AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(numero_empleado FROM 4) AS INTEGER)), 0) + 1
  INTO next_num
  FROM empleados;
  NEW.numero_empleado := 'EMP' || LPAD(next_num::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_generate_numero_empleado
  BEFORE INSERT ON empleados
  FOR EACH ROW
  WHEN (NEW.numero_empleado IS NULL OR NEW.numero_empleado = '')
  EXECUTE FUNCTION generate_numero_empleado();

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_empleados_updated_at
  BEFORE UPDATE ON empleados
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- FK profile -> empleado
ALTER TABLE profiles ADD CONSTRAINT fk_profiles_empleado
  FOREIGN KEY (empleado_id) REFERENCES empleados(id) ON DELETE SET NULL;

-- ===== QUINCENAS =====
CREATE TABLE quincenas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  periodo_inicio DATE NOT NULL,
  periodo_fin DATE NOT NULL,
  dias_habiles INTEGER DEFAULT 11,
  estado estado_quincena NOT NULL DEFAULT 'borrador',
  descripcion TEXT,
  creado_por UUID REFERENCES auth.users(id),
  aprobado_por UUID REFERENCES auth.users(id),
  fecha_aprobacion TIMESTAMPTZ,
  fecha_pago TIMESTAMPTZ,
  marcado_pagado_por UUID REFERENCES auth.users(id),
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_periodo CHECK (periodo_fin > periodo_inicio),
  CONSTRAINT uq_periodo UNIQUE (periodo_inicio, periodo_fin)
);

CREATE TRIGGER trg_quincenas_updated_at
  BEFORE UPDATE ON quincenas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ===== NOMINA_ITEMS =====
CREATE TABLE nomina_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quincena_id UUID NOT NULL REFERENCES quincenas(id) ON DELETE CASCADE,
  empleado_id UUID NOT NULL REFERENCES empleados(id),

  -- Entrada
  horas_base NUMERIC(6,2) NOT NULL DEFAULT 88,
  tarifa_hora NUMERIC(10,2) NOT NULL,
  horas_extras_diurnas NUMERIC(6,2) NOT NULL DEFAULT 0,
  horas_extras_nocturnas NUMERIC(6,2) NOT NULL DEFAULT 0,
  horas_extras_feriados NUMERIC(6,2) NOT NULL DEFAULT 0,
  tarifa_hora_extra NUMERIC(10,2),
  instalaciones_gpon INTEGER NOT NULL DEFAULT 0,
  instalaciones_red INTEGER NOT NULL DEFAULT 0,
  tarifa_instalacion_gpon NUMERIC(10,2) NOT NULL DEFAULT 0,
  tarifa_instalacion_red NUMERIC(10,2) NOT NULL DEFAULT 0,
  metas_cumplimiento NUMERIC(12,2) NOT NULL DEFAULT 0,
  otros_ingresos NUMERIC(12,2) NOT NULL DEFAULT 0,
  descripcion_otros_ingresos TEXT,
  faltas_dias NUMERIC(4,2) NOT NULL DEFAULT 0,

  -- Calculado: ISR
  isr_aplica BOOLEAN NOT NULL DEFAULT false,
  isr_monto NUMERIC(12,2) NOT NULL DEFAULT 0,

  -- Calculado: Ingresos
  salario_base_calc NUMERIC(12,2) NOT NULL DEFAULT 0,
  monto_extras_diurnas NUMERIC(12,2) NOT NULL DEFAULT 0,
  monto_extras_nocturnas NUMERIC(12,2) NOT NULL DEFAULT 0,
  monto_extras_feriados NUMERIC(12,2) NOT NULL DEFAULT 0,
  monto_instalaciones_gpon NUMERIC(12,2) NOT NULL DEFAULT 0,
  monto_instalaciones_red NUMERIC(12,2) NOT NULL DEFAULT 0,
  subtotal_devengado NUMERIC(12,2) NOT NULL DEFAULT 0,

  -- Calculado: Deducciones
  deduccion_por_faltas NUMERIC(12,2) NOT NULL DEFAULT 0,
  afp_porcentaje NUMERIC(6,4) NOT NULL DEFAULT 0.0287,
  sfs_porcentaje NUMERIC(6,4) NOT NULL DEFAULT 0.0304,
  afp_monto NUMERIC(12,2) NOT NULL DEFAULT 0,
  sfs_monto NUMERIC(12,2) NOT NULL DEFAULT 0,
  deduccion_prestamos NUMERIC(12,2) NOT NULL DEFAULT 0,
  otros_descuentos NUMERIC(12,2) NOT NULL DEFAULT 0,
  descripcion_otros_descuentos TEXT,
  total_deducciones NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_neto NUMERIC(12,2) NOT NULL DEFAULT 0,

  -- Patronal (informativo, no descuenta al empleado)
  afp_patronal_monto NUMERIC(12,2) NOT NULL DEFAULT 0,
  sfs_patronal_monto NUMERIC(12,2) NOT NULL DEFAULT 0,
  srl_patronal_monto NUMERIC(12,2) NOT NULL DEFAULT 0,

  -- Estado
  estado estado_nomina_item NOT NULL DEFAULT 'borrador',
  alerta_neto_negativo BOOLEAN NOT NULL DEFAULT false,
  alerta_limite_descuentos BOOLEAN NOT NULL DEFAULT false,
  numero_comprobante TEXT,
  pdf_url TEXT,
  pdf_generado_en TIMESTAMPTZ,
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_nomina_empleado UNIQUE (quincena_id, empleado_id)
);

CREATE TRIGGER trg_nomina_items_updated_at
  BEFORE UPDATE ON nomina_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ===== PRESTAMOS =====
CREATE TABLE prestamos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empleado_id UUID NOT NULL REFERENCES empleados(id),
  monto_total NUMERIC(12,2) NOT NULL,
  cuota_quincenal NUMERIC(12,2) NOT NULL,
  saldo_pendiente NUMERIC(12,2) NOT NULL,
  fecha_inicio DATE NOT NULL,
  fecha_cierre DATE,
  estado estado_prestamo NOT NULL DEFAULT 'activo',
  numero_cuotas_estimado INTEGER,
  numero_cuotas_pagadas INTEGER NOT NULL DEFAULT 0,
  notas TEXT,
  aprobado_por UUID REFERENCES auth.users(id),
  cancelado_por UUID REFERENCES auth.users(id),
  motivo_cancelacion TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_prestamos_updated_at
  BEFORE UPDATE ON prestamos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ===== PAGOS_PRESTAMOS =====
CREATE TABLE pagos_prestamos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prestamo_id UUID NOT NULL REFERENCES prestamos(id),
  nomina_item_id UUID REFERENCES nomina_items(id),
  quincena_id UUID REFERENCES quincenas(id),
  monto_pagado NUMERIC(12,2) NOT NULL,
  saldo_antes NUMERIC(12,2) NOT NULL,
  saldo_despues NUMERIC(12,2) NOT NULL,
  numero_cuota INTEGER,
  fecha_pago TIMESTAMPTZ NOT NULL DEFAULT now(),
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===== LIQUIDACIONES =====
CREATE TABLE liquidaciones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empleado_id UUID NOT NULL REFERENCES empleados(id),
  fecha_ingreso DATE NOT NULL,
  fecha_salida DATE NOT NULL,
  anos_trabajados INTEGER NOT NULL DEFAULT 0,
  meses_trabajados INTEGER NOT NULL DEFAULT 0,
  motivo motivo_liquidacion NOT NULL,
  sueldo_mensual NUMERIC(12,2) NOT NULL,
  sueldo_diario NUMERIC(12,2) NOT NULL,
  dias_preaviso INTEGER NOT NULL DEFAULT 0,
  monto_preaviso NUMERIC(12,2) NOT NULL DEFAULT 0,
  dias_cesantia INTEGER NOT NULL DEFAULT 0,
  monto_cesantia NUMERIC(12,2) NOT NULL DEFAULT 0,
  dias_vacaciones_proporcionales NUMERIC(6,2) NOT NULL DEFAULT 0,
  monto_vacaciones NUMERIC(12,2) NOT NULL DEFAULT 0,
  meses_regalia INTEGER NOT NULL DEFAULT 0,
  monto_regalia NUMERIC(12,2) NOT NULL DEFAULT 0,
  monto_salarios_pendientes NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_liquidacion NUMERIC(12,2) NOT NULL DEFAULT 0,
  notas TEXT,
  pdf_url TEXT,
  calculado_por UUID REFERENCES auth.users(id),
  aprobado_por UUID REFERENCES auth.users(id),
  fecha_aprobacion TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_liquidaciones_updated_at
  BEFORE UPDATE ON liquidaciones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ===== VACACIONES =====
CREATE TABLE vacaciones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empleado_id UUID NOT NULL REFERENCES empleados(id),
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  dias_solicitados NUMERIC(5,2) NOT NULL,
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobada', 'rechazada', 'cancelada')),
  aprobado_por UUID REFERENCES auth.users(id),
  fecha_aprobacion TIMESTAMPTZ,
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_vacaciones_updated_at
  BEFORE UPDATE ON vacaciones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ===== AUDIT LOG =====
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tabla_afectada TEXT NOT NULL,
  registro_id UUID NOT NULL,
  accion TEXT NOT NULL CHECK (accion IN ('INSERT', 'UPDATE', 'DELETE')),
  datos_anteriores JSONB,
  datos_nuevos JSONB,
  campos_modificados TEXT[],
  usuario_id UUID REFERENCES auth.users(id),
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Función genérica de auditoría
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log (tabla_afectada, registro_id, accion, datos_nuevos, usuario_id)
    VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_log (tabla_afectada, registro_id, accion, datos_anteriores, datos_nuevos, usuario_id)
    VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log (tabla_afectada, registro_id, accion, datos_anteriores, usuario_id)
    VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', to_jsonb(OLD), auth.uid());
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplicar auditoría a tablas principales
CREATE TRIGGER audit_empleados AFTER INSERT OR UPDATE OR DELETE ON empleados
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
CREATE TRIGGER audit_nomina_items AFTER INSERT OR UPDATE OR DELETE ON nomina_items
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
CREATE TRIGGER audit_prestamos AFTER INSERT OR UPDATE OR DELETE ON prestamos
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
CREATE TRIGGER audit_quincenas AFTER INSERT OR UPDATE OR DELETE ON quincenas
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
CREATE TRIGGER audit_liquidaciones AFTER INSERT OR UPDATE OR DELETE ON liquidaciones
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- ===== CONFIGURACIÓN DEL SISTEMA =====
CREATE TABLE configuracion_sistema (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clave TEXT UNIQUE NOT NULL,
  valor TEXT NOT NULL,
  descripcion TEXT,
  tipo TEXT DEFAULT 'text',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insertar configuración por defecto
INSERT INTO configuracion_sistema (clave, valor, descripcion, tipo) VALUES
  ('afp_empleado_pct', '0.0287', 'AFP empleado 2.87% - Art. 39 Ley 87-01', 'number'),
  ('sfs_empleado_pct', '0.0304', 'SFS empleado 3.04% - Art. 22 Ley 87-01', 'number'),
  ('afp_patronal_pct', '0.0710', 'AFP patronal 7.10% - Art. 39 Ley 87-01', 'number'),
  ('sfs_patronal_pct', '0.0709', 'SFS patronal 7.09% - Art. 22 Ley 87-01', 'number'),
  ('srl_patronal_pct', '0.0120', 'SRL patronal 1.20%', 'number'),
  ('factor_extra_diurna', '1.35', 'Factor hora extra diurna - Art. 203 CT', 'number'),
  ('factor_extra_nocturna', '2.00', 'Factor hora extra nocturna - Art. 211 CT', 'number'),
  ('factor_extra_feriado', '2.00', 'Factor hora extra feriado - Art. 605 CT', 'number'),
  ('isr_exencion_anual', '624329', 'Exención anual ISR - DGII vigente', 'number'),
  ('limite_descuentos_pct', '0.80', 'Límite descuentos 80% - Política interna', 'number'),
  ('empresa_nombre', 'SERVIMAST Sistema de Seguridad y Redes', 'Nombre de la empresa', 'text'),
  ('empresa_rnc', '', 'RNC de la empresa', 'text'),
  ('empresa_direccion', '', 'Dirección de la empresa', 'text'),
  ('empresa_telefono', '', 'Teléfono de la empresa', 'text');

-- ===== ROW LEVEL SECURITY (RLS) =====
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE empleados ENABLE ROW LEVEL SECURITY;
ALTER TABLE quincenas ENABLE ROW LEVEL SECURITY;
ALTER TABLE nomina_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE prestamos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos_prestamos ENABLE ROW LEVEL SECURITY;
ALTER TABLE liquidaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE vacaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracion_sistema ENABLE ROW LEVEL SECURITY;

-- Helper function para obtener el rol del usuario actual
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS rol_usuario AS $$
  SELECT rol FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- PROFILES policies
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "profiles_admin_all" ON profiles FOR ALL USING (get_user_role() = 'admin');

-- EMPLEADOS policies
CREATE POLICY "empleados_select" ON empleados FOR SELECT USING (
  get_user_role() IN ('admin', 'operador')
  OR id = (SELECT empleado_id FROM profiles WHERE id = auth.uid())
);
CREATE POLICY "empleados_insert" ON empleados FOR INSERT WITH CHECK (get_user_role() = 'admin');
CREATE POLICY "empleados_update" ON empleados FOR UPDATE USING (get_user_role() = 'admin');
CREATE POLICY "empleados_delete" ON empleados FOR DELETE USING (get_user_role() = 'admin');

-- QUINCENAS policies
CREATE POLICY "quincenas_select" ON quincenas FOR SELECT USING (
  get_user_role() IN ('admin', 'operador')
);
CREATE POLICY "quincenas_insert" ON quincenas FOR INSERT WITH CHECK (get_user_role() = 'admin');
CREATE POLICY "quincenas_update" ON quincenas FOR UPDATE USING (get_user_role() IN ('admin', 'operador'));
CREATE POLICY "quincenas_delete" ON quincenas FOR DELETE USING (get_user_role() = 'admin');

-- NOMINA_ITEMS policies
CREATE POLICY "nomina_items_select" ON nomina_items FOR SELECT USING (
  get_user_role() IN ('admin', 'operador')
  OR empleado_id = (SELECT empleado_id FROM profiles WHERE id = auth.uid())
);
CREATE POLICY "nomina_items_insert" ON nomina_items FOR INSERT WITH CHECK (get_user_role() IN ('admin', 'operador'));
CREATE POLICY "nomina_items_update" ON nomina_items FOR UPDATE USING (get_user_role() IN ('admin', 'operador'));
CREATE POLICY "nomina_items_delete" ON nomina_items FOR DELETE USING (get_user_role() = 'admin');

-- PRESTAMOS policies
CREATE POLICY "prestamos_select" ON prestamos FOR SELECT USING (
  get_user_role() IN ('admin', 'operador')
  OR empleado_id = (SELECT empleado_id FROM profiles WHERE id = auth.uid())
);
CREATE POLICY "prestamos_insert" ON prestamos FOR INSERT WITH CHECK (get_user_role() = 'admin');
CREATE POLICY "prestamos_update" ON prestamos FOR UPDATE USING (get_user_role() = 'admin');
CREATE POLICY "prestamos_delete" ON prestamos FOR DELETE USING (get_user_role() = 'admin');

-- PAGOS_PRESTAMOS policies
CREATE POLICY "pagos_prestamos_select" ON pagos_prestamos FOR SELECT USING (
  get_user_role() IN ('admin', 'operador')
);
CREATE POLICY "pagos_prestamos_insert" ON pagos_prestamos FOR INSERT WITH CHECK (get_user_role() IN ('admin', 'operador'));

-- LIQUIDACIONES policies
CREATE POLICY "liquidaciones_select" ON liquidaciones FOR SELECT USING (
  get_user_role() IN ('admin', 'operador')
  OR empleado_id = (SELECT empleado_id FROM profiles WHERE id = auth.uid())
);
CREATE POLICY "liquidaciones_insert" ON liquidaciones FOR INSERT WITH CHECK (get_user_role() = 'admin');
CREATE POLICY "liquidaciones_update" ON liquidaciones FOR UPDATE USING (get_user_role() = 'admin');

-- VACACIONES policies
CREATE POLICY "vacaciones_select" ON vacaciones FOR SELECT USING (
  get_user_role() IN ('admin', 'operador')
  OR empleado_id = (SELECT empleado_id FROM profiles WHERE id = auth.uid())
);
CREATE POLICY "vacaciones_insert" ON vacaciones FOR INSERT WITH CHECK (
  get_user_role() IN ('admin', 'operador')
  OR empleado_id = (SELECT empleado_id FROM profiles WHERE id = auth.uid())
);
CREATE POLICY "vacaciones_update" ON vacaciones FOR UPDATE USING (get_user_role() IN ('admin', 'operador'));

-- AUDIT_LOG policies
CREATE POLICY "audit_log_select" ON audit_log FOR SELECT USING (get_user_role() = 'admin');

-- CONFIGURACION policies
CREATE POLICY "config_select" ON configuracion_sistema FOR SELECT USING (get_user_role() IN ('admin', 'operador'));
CREATE POLICY "config_update" ON configuracion_sistema FOR UPDATE USING (get_user_role() = 'admin');

-- ===== SUCURSALES =====
CREATE TABLE sucursales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL UNIQUE,
  direccion TEXT,
  telefono TEXT,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_sucursales_updated_at
  BEFORE UPDATE ON sucursales
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Agregar sucursal a empleados
ALTER TABLE empleados ADD COLUMN sucursal_id UUID REFERENCES sucursales(id);

-- RLS para sucursales
ALTER TABLE sucursales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sucursales_select" ON sucursales FOR SELECT USING (true);
CREATE POLICY "sucursales_insert" ON sucursales FOR INSERT WITH CHECK (get_user_role() = 'admin');
CREATE POLICY "sucursales_update" ON sucursales FOR UPDATE USING (get_user_role() = 'admin');
CREATE POLICY "sucursales_delete" ON sucursales FOR DELETE USING (get_user_role() = 'admin');

-- Auditoría para sucursales
CREATE TRIGGER audit_sucursales AFTER INSERT OR UPDATE OR DELETE ON sucursales
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- ===== HORAS EXTRAS IMPORTADAS =====
CREATE TABLE horas_extras_importadas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quincena_id UUID NOT NULL REFERENCES quincenas(id) ON DELETE CASCADE,
  empleado_id UUID NOT NULL REFERENCES empleados(id),
  tiempo_trabajado NUMERIC(6,2) NOT NULL,
  horas_regulares NUMERIC(6,2) NOT NULL DEFAULT 88,
  horas_extras_total NUMERIC(6,2) NOT NULL DEFAULT 0,
  horas_extras_25 NUMERIC(6,2) NOT NULL DEFAULT 0,
  horas_extras_35 NUMERIC(6,2) NOT NULL DEFAULT 0,
  monto_extras_25 NUMERIC(12,2) NOT NULL DEFAULT 0,
  monto_extras_35 NUMERIC(12,2) NOT NULL DEFAULT 0,
  monto_extras_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  archivo_origen TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_horas_extras_quincena_empleado UNIQUE (quincena_id, empleado_id)
);

ALTER TABLE horas_extras_importadas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "horas_extras_importadas_select" ON horas_extras_importadas FOR SELECT USING (get_user_role() IN ('admin', 'operador'));
CREATE POLICY "horas_extras_importadas_insert" ON horas_extras_importadas FOR INSERT WITH CHECK (get_user_role() IN ('admin', 'operador'));
CREATE POLICY "horas_extras_importadas_update" ON horas_extras_importadas FOR UPDATE USING (get_user_role() IN ('admin', 'operador'));
CREATE POLICY "horas_extras_importadas_delete" ON horas_extras_importadas FOR DELETE USING (get_user_role() = 'admin');

-- ===== INDEXES =====
CREATE INDEX idx_empleados_estado ON empleados(estado);
CREATE INDEX idx_empleados_cedula ON empleados(cedula);
CREATE INDEX idx_empleados_departamento ON empleados(departamento);
CREATE INDEX idx_nomina_items_quincena ON nomina_items(quincena_id);
CREATE INDEX idx_nomina_items_empleado ON nomina_items(empleado_id);
CREATE INDEX idx_prestamos_empleado ON prestamos(empleado_id);
CREATE INDEX idx_prestamos_estado ON prestamos(estado);
CREATE INDEX idx_pagos_prestamos_prestamo ON pagos_prestamos(prestamo_id);
CREATE INDEX idx_quincenas_estado ON quincenas(estado);
CREATE INDEX idx_quincenas_periodo ON quincenas(periodo_inicio, periodo_fin);
CREATE INDEX idx_liquidaciones_empleado ON liquidaciones(empleado_id);
CREATE INDEX idx_vacaciones_empleado ON vacaciones(empleado_id);
CREATE INDEX idx_audit_log_tabla ON audit_log(tabla_afectada, registro_id);
CREATE INDEX idx_audit_log_created ON audit_log(created_at DESC);
CREATE INDEX idx_empleados_sucursal ON empleados(sucursal_id);
CREATE INDEX idx_sucursales_activo ON sucursales(activo);
CREATE INDEX idx_horas_extras_importadas_quincena ON horas_extras_importadas(quincena_id);
CREATE INDEX idx_horas_extras_importadas_empleado ON horas_extras_importadas(empleado_id);

-- ===== TRIGGER: Auto-crear profile al registrar usuario =====
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, rol, nombre_display)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'rol')::rol_usuario, 'empleado'),
    COALESCE(NEW.raw_user_meta_data->>'nombre_display', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
