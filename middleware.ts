import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const session = request.cookies.get('quantum_session'); 
  const { pathname } = request.nextUrl;

  // 1. PROTEGER SOLO EL DASHBOARD
  // El onboarding DEBE ser público para que el usuario pueda registrarse.
  if (!session && pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // 2. SI YA HAY SESIÓN, EVITAR LA LANDING (OPCIONAL)
  // Si el usuario ya está logueado, lo mandamos directo al panel.
  if (session && pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

// AJUSTE DEL MATCHER: Vigilamos todo, pero la lógica de arriba decide.
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};