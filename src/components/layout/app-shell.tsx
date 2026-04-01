"use client";

import { useState } from "react";
import { Navbar } from "./navbar";
import { Sidebar } from "./sidebar";
import { cn } from "@/lib/utils";
import type { RolUsuario } from "@/types";

interface AppShellProps {
  children: React.ReactNode;
  userName: string | null;
  userRole: RolUsuario;
}

function useIsMobile() {
  if (typeof window === "undefined") return false;
  return window.innerWidth < 1024;
}

export function AppShell({ children, userName, userRole }: AppShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar
        userName={userName}
        userRole={userRole}
        onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
      />

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar — desktop always visible, mobile as overlay */}
      <div
        className={cn(
          "lg:block",
          mobileMenuOpen ? "block" : "hidden"
        )}
      >
        <Sidebar
          userRole={userRole}
          collapsed={mobileMenuOpen ? false : sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          onNavigate={() => {
            if (useIsMobile()) setMobileMenuOpen(false);
          }}
        />
      </div>

      {/* Main content */}
      <main
        className={cn(
          "pt-16 min-h-screen transition-all duration-300",
          sidebarCollapsed ? "lg:pl-16" : "lg:pl-60"
        )}
      >
        <div className="p-3 sm:p-6">{children}</div>
      </main>
    </div>
  );
}
