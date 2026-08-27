import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

const AUTH_ROUTES = ['/login'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Demo mode: skip all auth ──────────────────────────────────────
  if (process.env.DEMO_MODE === 'true') {
    const isLoggedIn = request.cookies.get('demo_session')?.value === 'true';

    if (!isLoggedIn && !AUTH_ROUTES.some(r => pathname.startsWith(r))) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    if (isLoggedIn && AUTH_ROUTES.some(r => pathname.startsWith(r))) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }

  // ── Production mode: full Supabase auth ──────────────────────────
  const { supabaseResponse, user, supabase } = await updateSession(request);

  if (user && AUTH_ROUTES.some(r => pathname.startsWith(r))) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  if (!user && !AUTH_ROUTES.some(r => pathname.startsWith(r))) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (user) {
    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', user.id).single();
    const role = profile?.role ?? 'viewer';

    if (pathname.startsWith('/admin') && role !== 'approver') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    if ((pathname.startsWith('/approvals') || pathname.startsWith('/transfers')) && role === 'viewer') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
