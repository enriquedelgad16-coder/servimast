"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(
          authError.message === "Invalid login credentials"
            ? "Correo o contraseña incorrectos"
            : authError.message
        );
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Error al iniciar sesión. Intente de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-navy-800 flex-col items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-navy-900 via-navy-800 to-navy-700" />
        <div className="relative z-10 text-center">
          <div className="mb-8 flex justify-center">
            <Image
              src="/logo-servimast.jpg"
              alt="SERVIMAST JPM"
              width={180}
              height={180}
              className="rounded-xl shadow-2xl"
              priority
            />
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">SERVIMAST JPM</h1>
          <p className="text-cyan-400 text-lg font-medium mb-2">
            Sistema de Seguridad y Redes
          </p>
          <p className="text-gray-400 text-sm max-w-sm">
            Sistema de Gestión de Nómina Quincenal
          </p>
        </div>
        {/* Decorative elements */}
        <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute -top-20 -right-20 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl" />
      </div>

      {/* Right panel — login form */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 bg-gray-50">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex flex-col items-center mb-8">
            <Image
              src="/logo-servimast.jpg"
              alt="SERVIMAST JPM"
              width={100}
              height={100}
              className="rounded-xl shadow-lg mb-4"
              priority
            />
            <h1 className="text-2xl font-bold text-navy-800">SERVIMAST JPM</h1>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Iniciar Sesión
              </h2>
              <p className="text-gray-500 text-sm mt-1">
                Ingrese sus credenciales para acceder al sistema
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="bg-danger-100 text-danger-600 text-sm p-3 rounded-lg border border-red-200">
                  {error}
                </div>
              )}

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 mb-1.5"
                >
                  Correo electrónico
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="correo@ejemplo.com"
                  required
                  autoComplete="email"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700 mb-1.5"
                >
                  Contraseña
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="animate-spin h-5 w-5"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Ingresando...
                  </span>
                ) : (
                  "Ingresar"
                )}
              </button>
            </form>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            SERVIMAST JPM &copy; {new Date().getFullYear()} — Sistema de Nómina
          </p>
        </div>
      </div>
    </div>
  );
}
