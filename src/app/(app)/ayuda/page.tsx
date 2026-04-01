"use client";

import { useState } from "react";
import {
  HelpCircle,
  Search,
  Users,
  Calculator,
  Wallet,
  Calendar,
  FileSpreadsheet,
  Shield,
  Settings,
  BookOpen,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

interface FAQItem {
  pregunta: string;
  respuesta: string;
}

interface ModuloGuia {
  id: string;
  titulo: string;
  icon: React.ReactNode;
  descripcion: string;
  pasos: string[];
  faqs: FAQItem[];
}

const MODULOS: ModuloGuia[] = [
  {
    id: "empleados",
    titulo: "Empleados",
    icon: <Users className="h-5 w-5" />,
    descripcion: "Gestión del directorio de empleados",
    pasos: [
      "Ir a Empleados en el menú lateral",
      "Hacer clic en 'Nuevo Empleado' para agregar",
      "Completar los datos personales (cédula, nombre, apellido son obligatorios)",
      "Completar datos laborales (fecha ingreso, tipo contrato, sueldo quincenal)",
      "Opcionalmente agregar datos bancarios y NSS",
      "Hacer clic en 'Guardar' para registrar",
      "Para editar, hacer clic en el empleado desde la lista",
    ],
    faqs: [
      {
        pregunta: "¿Cómo se calcula la tarifa hora?",
        respuesta:
          "La tarifa hora se calcula automáticamente: Sueldo Quincenal ÷ 88 horas. Las 88 horas corresponden a una jornada de 44 horas semanales × 2 semanas.",
      },
      {
        pregunta: "¿Qué pasa si un empleado tiene cédula duplicada?",
        respuesta:
          "El sistema no permite cédulas duplicadas. Si intenta registrar una cédula que ya existe, recibirá un mensaje de error.",
      },
      {
        pregunta: "¿Cómo desvinculo a un empleado?",
        respuesta:
          "En la ficha del empleado, cambie el estado a 'Desvinculado'. Para calcular su liquidación, use el módulo de Liquidaciones.",
      },
    ],
  },
  {
    id: "nomina",
    titulo: "Nómina",
    icon: <Calculator className="h-5 w-5" />,
    descripcion: "Procesamiento de nómina quincenal",
    pasos: [
      "Ir a Nómina en el menú lateral",
      "Crear una nueva quincena especificando período inicio y fin",
      "Hacer clic en la quincena para abrir el detalle",
      "Usar 'Agregar Empleados' para incluir todos los empleados activos",
      "Ingresar horas extras (diurnas, nocturnas, feriados) para cada empleado",
      "Ingresar instalaciones GPON/Red, metas y otros ingresos si aplica",
      "Los cálculos de AFP, SFS, ISR y préstamos son automáticos",
      "Revisar el neto de cada empleado y los totales",
      "Usar 'Recalcular Todo' si modifica algún valor",
    ],
    faqs: [
      {
        pregunta: "¿Cuáles son los porcentajes de AFP y SFS?",
        respuesta:
          "AFP empleado: 2.87%, SFS empleado: 3.04%. Patronal: AFP 7.10%, SFS 7.09%, SRL 1.20%. Estos valores se pueden modificar en Configuración.",
      },
      {
        pregunta: "¿Cómo se calculan las horas extras?",
        respuesta:
          "Diurnas: tarifa_hora × 1.35. Nocturnas: tarifa_hora × 2.00. Feriados: tarifa_hora × 2.00. Según el Código de Trabajo dominicano.",
      },
      {
        pregunta: "¿Se descuentan automáticamente los préstamos?",
        respuesta:
          "Sí. Al calcular la nómina, el sistema busca los préstamos activos de cada empleado y aplica la cuota quincenal como deducción.",
      },
    ],
  },
  {
    id: "prestamos",
    titulo: "Préstamos",
    icon: <Wallet className="h-5 w-5" />,
    descripcion: "Gestión de préstamos a empleados",
    pasos: [
      "Ir a Préstamos en el menú lateral",
      "Hacer clic en 'Nuevo Préstamo'",
      "Seleccionar el empleado y especificar monto total y cuota quincenal",
      "El sistema calcula automáticamente las cuotas estimadas",
      "Los préstamos activos se descuentan automáticamente en la nómina",
      "Un empleado puede tener múltiples préstamos activos simultáneamente",
    ],
    faqs: [
      {
        pregunta: "¿Se pueden tener varios préstamos activos?",
        respuesta:
          "Sí. Un empleado puede tener múltiples préstamos activos. Todas las cuotas se suman y se descuentan en cada quincena.",
      },
      {
        pregunta: "¿Qué pasa cuando se paga el préstamo completo?",
        respuesta:
          "Cuando el saldo pendiente llega a 0, el préstamo se marca automáticamente como 'Pagado'.",
      },
    ],
  },
  {
    id: "liquidaciones",
    titulo: "Liquidaciones",
    icon: <FileSpreadsheet className="h-5 w-5" />,
    descripcion: "Cálculo de prestaciones laborales",
    pasos: [
      "Ir a Liquidaciones en el menú lateral",
      "Hacer clic en 'Nueva Liquidación'",
      "Seleccionar el empleado y especificar fecha de salida",
      "Seleccionar el motivo: despido sin causa, renuncia, mutuo acuerdo o fin de contrato",
      "El sistema calcula automáticamente: preaviso, cesantía, vacaciones proporcionales y regalía pascual",
      "Revisar los montos y guardar la liquidación",
    ],
    faqs: [
      {
        pregunta: "¿Qué prestaciones aplican por renuncia?",
        respuesta:
          "Por renuncia solo aplican vacaciones proporcionales y regalía pascual proporcional. NO aplica preaviso ni cesantía.",
      },
      {
        pregunta: "¿Cómo se calcula la cesantía?",
        respuesta:
          "Según el Art. 80 del CT: 3-6 meses = 6 días, 6-12 meses = 13 días, 1-5 años = 21 días/año, 5+ años = 23 días/año. Basado en el salario promedio de los últimos 6 meses.",
      },
    ],
  },
  {
    id: "tss",
    titulo: "Reportes TSS",
    icon: <Shield className="h-5 w-5" />,
    descripcion: "Tesorería de la Seguridad Social",
    pasos: [
      "Ir a TSS en el menú lateral",
      "Seleccionar el mes y año del reporte",
      "El sistema consolida los aportes de las dos quincenas del mes",
      "Revisar los totales de AFP, SFS y SRL",
      "Descargar el reporte en Excel para presentar a la TSS",
    ],
    faqs: [
      {
        pregunta: "¿Cuándo se presenta el reporte TSS?",
        respuesta:
          "El reporte TSS se presenta mensualmente. Los pagos se realizan dentro de los primeros 3 días laborales del mes siguiente.",
      },
    ],
  },
  {
    id: "vacaciones",
    titulo: "Vacaciones",
    icon: <Calendar className="h-5 w-5" />,
    descripcion: "Control de vacaciones",
    pasos: [
      "Ir a Vacaciones en el menú lateral",
      "Ver el balance de días por empleado",
      "Para registrar vacaciones, hacer clic en 'Registrar Vacaciones'",
      "Seleccionar empleado, fechas de inicio y fin",
      "Los días se descuentan automáticamente del saldo disponible",
    ],
    faqs: [
      {
        pregunta: "¿Cuántos días de vacaciones corresponden?",
        respuesta:
          "Según el Art. 177 del CT, corresponden 14 días laborables de vacaciones por cada año de servicio, después del primer año.",
      },
    ],
  },
  {
    id: "configuracion",
    titulo: "Configuración",
    icon: <Settings className="h-5 w-5" />,
    descripcion: "Parámetros del sistema",
    pasos: [
      "Ir a Configuración en el menú lateral (solo administradores)",
      "Modificar los porcentajes de TSS si cambian las regulaciones",
      "Ajustar factores de horas extras si es necesario",
      "Guardar los cambios para que apliquen en los próximos cálculos",
    ],
    faqs: [
      {
        pregunta: "¿Quién puede modificar la configuración?",
        respuesta:
          "Solo los usuarios con rol de Administrador pueden acceder y modificar la configuración del sistema.",
      },
    ],
  },
];

const GLOSARIO: { termino: string; definicion: string }[] = [
  { termino: "AFP", definicion: "Administradora de Fondos de Pensiones. Deducción obligatoria para la jubilación." },
  { termino: "SFS", definicion: "Seguro Familiar de Salud. Deducción obligatoria para cobertura de salud." },
  { termino: "SRL", definicion: "Seguro de Riesgos Laborales. Contribución patronal obligatoria." },
  { termino: "TSS", definicion: "Tesorería de la Seguridad Social. Entidad recaudadora de los aportes de seguridad social." },
  { termino: "ISR", definicion: "Impuesto Sobre la Renta. Impuesto progresivo aplicado al salario." },
  { termino: "Cesantía", definicion: "Prestación laboral pagada al empleado despedido sin causa justificada (Art. 80 CT)." },
  { termino: "Preaviso", definicion: "Notificación anticipada de terminación del contrato. Si no se da, se paga su equivalente (Art. 76 CT)." },
  { termino: "Regalía Pascual", definicion: "Salario de Navidad equivalente a 1/12 del salario devengado en el año (Art. 219 CT)." },
  { termino: "Tarifa Hora", definicion: "Sueldo quincenal dividido entre 88 horas (44 hrs/semana × 2 semanas)." },
  { termino: "Código de Trabajo", definicion: "Ley 16-92 que regula las relaciones laborales en República Dominicana." },
];

export default function AyudaPage() {
  const [search, setSearch] = useState("");
  const [expandedModulo, setExpandedModulo] = useState<string | null>(null);
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
  const [tab, setTab] = useState<"guias" | "glosario">("guias");

  const filtered = search
    ? MODULOS.filter(
        (m) =>
          m.titulo.toLowerCase().includes(search.toLowerCase()) ||
          m.descripcion.toLowerCase().includes(search.toLowerCase()) ||
          m.pasos.some((p) =>
            p.toLowerCase().includes(search.toLowerCase())
          ) ||
          m.faqs.some(
            (f) =>
              f.pregunta.toLowerCase().includes(search.toLowerCase()) ||
              f.respuesta.toLowerCase().includes(search.toLowerCase())
          )
      )
    : MODULOS;

  const filteredGlosario = search
    ? GLOSARIO.filter(
        (g) =>
          g.termino.toLowerCase().includes(search.toLowerCase()) ||
          g.definicion.toLowerCase().includes(search.toLowerCase())
      )
    : GLOSARIO;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <BookOpen className="h-7 w-7 text-cyan-500" />
          Centro de Ayuda
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Instrucciones, preguntas frecuentes y glosario de términos
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar en la ayuda..."
          className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setTab("guias")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === "guias"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Guías por Módulo
        </button>
        <button
          onClick={() => setTab("glosario")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === "glosario"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Glosario
        </button>
      </div>

      {tab === "guias" ? (
        <div className="space-y-4">
          {filtered.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <HelpCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-400">
                No se encontraron resultados para &quot;{search}&quot;
              </p>
            </div>
          )}
          {filtered.map((modulo) => (
            <div
              key={modulo.id}
              className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
            >
              <button
                onClick={() =>
                  setExpandedModulo(
                    expandedModulo === modulo.id ? null : modulo.id
                  )
                }
                className="w-full flex items-center gap-3 p-5 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="p-2 bg-cyan-50 rounded-lg text-cyan-600">
                  {modulo.icon}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">
                    {modulo.titulo}
                  </h3>
                  <p className="text-sm text-gray-500">{modulo.descripcion}</p>
                </div>
                {expandedModulo === modulo.id ? (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                )}
              </button>

              {expandedModulo === modulo.id && (
                <div className="border-t border-gray-200 p-5">
                  <h4 className="font-medium text-gray-800 mb-3">
                    Pasos para usar este módulo:
                  </h4>
                  <ol className="space-y-2 mb-6">
                    {modulo.pasos.map((paso, i) => (
                      <li key={i} className="flex gap-3 text-sm text-gray-600">
                        <span className="flex-shrink-0 w-6 h-6 bg-cyan-100 text-cyan-700 rounded-full flex items-center justify-center text-xs font-semibold">
                          {i + 1}
                        </span>
                        {paso}
                      </li>
                    ))}
                  </ol>

                  {modulo.faqs.length > 0 && (
                    <>
                      <h4 className="font-medium text-gray-800 mb-3">
                        Preguntas Frecuentes:
                      </h4>
                      <div className="space-y-2">
                        {modulo.faqs.map((faq, i) => {
                          const faqKey = `${modulo.id}-${i}`;
                          return (
                            <div
                              key={i}
                              className="border border-gray-100 rounded-lg"
                            >
                              <button
                                onClick={() =>
                                  setExpandedFaq(
                                    expandedFaq === faqKey ? null : faqKey
                                  )
                                }
                                className="w-full flex items-center gap-2 p-3 text-left text-sm hover:bg-gray-50 transition-colors"
                              >
                                <HelpCircle className="h-4 w-4 text-orange-400 flex-shrink-0" />
                                <span className="font-medium text-gray-700 flex-1">
                                  {faq.pregunta}
                                </span>
                                {expandedFaq === faqKey ? (
                                  <ChevronDown className="h-4 w-4 text-gray-400" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-gray-400" />
                                )}
                              </button>
                              {expandedFaq === faqKey && (
                                <div className="px-3 pb-3 pl-9 text-sm text-gray-600">
                                  {faq.respuesta}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-500 w-1/4">
                  Término
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">
                  Definición
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredGlosario.map((item) => (
                <tr key={item.termino} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-semibold text-gray-900">
                    {item.termino}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {item.definicion}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
