"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Calculator,
  Wallet,
  Palmtree,
  FileText,
  BarChart3,
  Shield,
  Settings,
  HelpCircle,
  ScrollText,
  Scale,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { RolUsuario } from "@/types";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles: RolUsuario[];
}

const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["admin", "operador"],
  },
  {
    label: "Empleados",
    href: "/empleados",
    icon: Users,
    roles: ["admin", "operador"],
  },
  {
    label: "Nómina",
    href: "/nomina",
    icon: Calculator,
    roles: ["admin", "operador"],
  },
  {
    label: "Préstamos",
    href: "/prestamos",
    icon: Wallet,
    roles: ["admin", "operador"],
  },
  {
    label: "Vacaciones",
    href: "/vacaciones",
    icon: Palmtree,
    roles: ["admin", "operador"],
  },
  {
    label: "Liquidaciones",
    href: "/liquidaciones",
    icon: Scale,
    roles: ["admin"],
  },
  {
    label: "TSS",
    href: "/tss",
    icon: Shield,
    roles: ["admin"],
  },
  {
    label: "Historial",
    href: "/historial",
    icon: ScrollText,
    roles: ["admin", "operador"],
  },
  {
    label: "Reportes",
    href: "/reportes",
    icon: BarChart3,
    roles: ["admin", "operador"],
  },
  {
    label: "Auditoría",
    href: "/auditoria",
    icon: FileText,
    roles: ["admin"],
  },
  {
    label: "Configuración",
    href: "/configuracion",
    icon: Settings,
    roles: ["admin"],
  },
  {
    label: "Ayuda",
    href: "/ayuda",
    icon: HelpCircle,
    roles: ["admin", "operador", "empleado"],
  },
];

interface SidebarProps {
  userRole: RolUsuario;
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ userRole, collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();

  const filteredItems = NAV_ITEMS.filter((item) =>
    item.roles.includes(userRole)
  );

  return (
    <aside
      className={cn(
        "fixed left-0 top-16 bottom-0 z-30 flex flex-col bg-navy-800 text-white transition-all duration-300",
        collapsed ? "w-16" : "w-60"
      )}
    >
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        <ul className="space-y-1">
          {filteredItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-cyan-500/20 text-cyan-400"
                      : "text-gray-300 hover:bg-white/10 hover:text-white",
                    collapsed && "justify-center px-2"
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <button
        onClick={onToggle}
        className="flex items-center justify-center border-t border-white/10 py-3 text-gray-400 hover:text-white transition-colors"
      >
        {collapsed ? (
          <ChevronRight className="h-5 w-5" />
        ) : (
          <ChevronLeft className="h-5 w-5" />
        )}
      </button>
    </aside>
  );
}
