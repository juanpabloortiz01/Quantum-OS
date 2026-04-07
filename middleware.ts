import { auth } from "@/auth";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;

  // 1. PROTEGER SOLO EL DASHBOARD
  if (!isLoggedIn && pathname.startsWith('/dashboard')) {
    return Response.redirect(new URL('/', req.nextUrl));
  }

  // 2. SI YA HAY SESIÓN, EVITAR LA LANDING
  if (isLoggedIn && pathname === '/') {
    return Response.redirect(new URL('/dashboard', req.nextUrl));
  }
});

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};