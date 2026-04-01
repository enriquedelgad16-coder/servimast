"use client";

interface PrintHeaderProps {
  title: string;
  subtitle?: string;
  periodo?: string;
  fecha?: string;
}

export function PrintHeader({ title, subtitle, periodo, fecha }: PrintHeaderProps) {
  return (
    <div className="hidden print:block mb-6 border-b-2 border-gray-800 pb-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-servimast.jpg"
            alt="SERVIMAST"
            className="w-16 h-16 rounded-lg"
          />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">SERVIMAST</h1>
            <p className="text-sm text-gray-600">Sistema de Seguridad y Redes</p>
            <p className="text-xs text-gray-500">RNC: 000-00000-0 | Tel: (809) 000-0000</p>
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          {subtitle && <p className="text-sm text-gray-600">{subtitle}</p>}
          {periodo && <p className="text-sm text-gray-500">Período: {periodo}</p>}
          <p className="text-xs text-gray-400 mt-1">
            Fecha: {fecha || new Date().toLocaleDateString("es-DO")}
          </p>
        </div>
      </div>
    </div>
  );
}
