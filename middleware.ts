// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const session = request.cookies.get('quantum_session'); // O tu token de Auth
  const { pathname } = request.nextUrl;

  // 1. Si no hay sesión y trata de entrar al dashboard o onboarding
  if (!session && (pathname.startsWith('/dashboard') || pathname.startsWith('/onboarding'))) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // 2. Si hay sesión pero está en la landing, mandarlo al dashboard
  if (session && pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/dashboard/:path*', '/onboarding/:path*'],
};