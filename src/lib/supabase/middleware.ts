import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_ROUTES = ["/login", "/forgot-password"];

const ROLE_ROUTES: Record<string, string[]> = {
  admin: [
    "/dashboard",
    "/empleados",
    "/departamentos",
    "/nomina",
    "/prestamos",
    "/vacaciones",
    "/liquidaciones",
    "/historial",
    "/tss",
    "/auditoria",
    "/configuracion",
    "/reportes",
    "/ayuda",
  ],
  operador: [
    "/dashboard",
    "/empleados",
    "/nomina",
    "/prestamos",
    "/vacaciones",
    "/historial",
    "/reportes",
    "/ayuda",
  ],
  empleado: ["/mi-portal", "/ayuda"],
};

const ROLE_REDIRECT: Record<string, string> = {
  admin: "/dashboard",
  operador: "/dashboard",
  empleado: "/mi-portal",
};

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Public routes
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    if (user) {
      // Get user role
      const { data: profile } = await supabase
        .from("profiles")
        .select("rol")
        .eq("id", user.id)
        .single();

      const rol = profile?.rol || "empleado";
      const redirectTo = ROLE_REDIRECT[rol] || "/dashboard";
      return NextResponse.redirect(new URL(redirectTo, request.url));
    }
    return supabaseResponse;
  }

  // Protected routes — must be authenticated
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Get user role for RBAC
  const { data: profile } = await supabase
    .from("profiles")
    .select("rol")
    .eq("id", user.id)
    .single();

  const rol = (profile?.rol as string) || "empleado";
  const allowedRoutes = ROLE_ROUTES[rol] || ROLE_ROUTES.empleado;

  // Root redirect
  if (pathname === "/") {
    return NextResponse.redirect(
      new URL(ROLE_REDIRECT[rol] || "/dashboard", request.url)
    );
  }

  // Check if user has access to this route
  const hasAccess = allowedRoutes.some((route) => pathname.startsWith(route));
  if (!hasAccess) {
    return NextResponse.redirect(
      new URL(ROLE_REDIRECT[rol] || "/dashboard", request.url)
    );
  }

  return supabaseResponse;
}
