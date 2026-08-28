import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

const AUTH_ROUTES = ['/login'];
const PUBLIC_PREFIXES = ['/_next', '/api', '/favicon.ico', '/spit-', '/SPIT_'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static assets or public images
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // ── Demo mode: skip all Supabase auth ─────────────────────────────
  if (process.env.DEMO_MODE === 'true' || process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
    const isLoggedIn = request.cookies.get('demo_session')?.value === 'true';

    if (!isLoggedIn && !AUTH_ROUTES.some((r) => pathname.startsWith(r))) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    if (isLoggedIn && AUTH_ROUTES.some((r) => pathname.startsWith(r))) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }

  // ── Production mode: resilient Supabase auth ──────────────────────
  try {
    const { supabaseResponse, user } = await updateSession(request);
    const isAuthRoute = AUTH_ROUTES.some((r) => pathname.startsWith(r));

    if (user && isAuthRoute) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    if (!user && !isAuthRoute) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    return supabaseResponse;
  } catch (error) {
    console.error('Middleware execution error:', error);
    if (AUTH_ROUTES.some((r) => pathname.startsWith(r))) {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
