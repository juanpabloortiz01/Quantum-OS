import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Verificamos los nombres de cookies estándar de NextAuth / Auth.js
  const sessionToken = 
    request.cookies.get('next-auth.session-token') ||
    request.cookies.get('__Secure-next-auth.session-token') ||
    request.cookies.get('authjs.session-token') ||
    request.cookies.get('__Secure-authjs.session-token');
    
  const isLoggedIn = !!sessionToken;
  const { pathname } = request.nextUrl;

  // 1. PROTEGER SOLO EL DASHBOARD
  if (!isLoggedIn && pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // 2. SI YA HAY SESIÓN, EVITAR LA LANDING
  if (isLoggedIn && pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};