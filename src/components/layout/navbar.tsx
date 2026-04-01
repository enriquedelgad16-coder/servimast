"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LogOut, Menu, Bell } from "lucide-react";
import Image from "next/image";

interface NavbarProps {
  userName: string | null;
  userRole: string;
  onMenuToggle: () => void;
}

export function Navbar({ userName, userRole, onMenuToggle }: NavbarProps) {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const roleLabel =
    userRole === "admin"
      ? "Administrador"
      : userRole === "operador"
        ? "Operador"
        : "Empleado";

  return (
    <header className="fixed top-0 left-0 right-0 z-40 h-16 bg-navy-900 shadow-lg print:hidden">
      <div className="flex h-full items-center justify-between px-4">
        {/* Left: menu + logo */}
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuToggle}
            className="lg:hidden text-white p-2 hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Abrir menú"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-3">
            <Image
              src="/logo-servimast.jpg"
              alt="SERVIMAST JPM"
              width={44}
              height={44}
              className="rounded-lg"
            />
            <div className="hidden sm:block">
              <h1 className="text-white font-bold text-lg leading-tight">
                SERVIMAST JPM
              </h1>
              <p className="text-cyan-400 text-xs">Sistema de Gestión de Nómina</p>
            </div>
          </div>
        </div>

        {/* Right: notifications + user */}
        <div className="flex items-center gap-4">
          <button
            className="text-gray-400 hover:text-white p-2 hover:bg-white/10 rounded-lg transition-colors relative"
            aria-label="Notificaciones"
          >
            <Bell className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-white text-sm font-medium leading-tight">
                {userName || "Usuario"}
              </p>
              <p className="text-cyan-400 text-xs">{roleLabel}</p>
            </div>

            <button
              onClick={handleLogout}
              className="text-gray-400 hover:text-red-400 p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Cerrar sesión"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
