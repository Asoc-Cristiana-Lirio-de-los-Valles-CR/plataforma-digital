import { getToken } from 'next-auth/jwt';
import createIntlMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getTeamSecret } from '@/lib/teamSecret';

async function computeTeamToken(secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode('team-access'));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

const intlMiddleware = createIntlMiddleware({
  locales: ['es', 'en'],
  defaultLocale: 'es',
  localeDetection: false,
});

const PUBLIC_ASOCIADOS = ['/asociados/login', '/asociados/pendiente', '/asociados/completar-perfil'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const localeMatch = pathname.match(/^\/(es|en)(\/.*)?$/);
  const localePath = localeMatch ? (localeMatch[2] ?? '/') : pathname;
  const locale = localeMatch?.[1] ?? 'es';

  // ── Zona Equipo ──────────────────────────────────────────────────────────
  if (localePath.startsWith('/equipo') && !localePath.startsWith('/equipo/acceso')) {
    const secret = await getTeamSecret();

    if (!secret) {
      return NextResponse.redirect(new URL(`/${locale}/equipo/acceso`, request.url));
    }

    const expected = await computeTeamToken(secret);
    const teamCookie = request.cookies.get('team_access');

    // 1. Valid HMAC cookie (emergency key or previously granted) → allow
    if (teamCookie?.value === expected) {
      const response = intlMiddleware(request);
      response.headers.set('x-pathname', pathname);
      return response;
    }

    // 2. ?key= param matches secret → set cookie and redirect clean
    const key = request.nextUrl.searchParams.get('key');
    if (key && key === secret) {
      const response = NextResponse.redirect(new URL(`/${locale}/equipo/manuales`, request.url));
      response.cookies.set('team_access', expected, {
        httpOnly: true, secure: true, sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, path: '/',
      });
      return response;
    }

    // 3. NextAuth session → check equipoStatus from unified member system
    const token = await getToken({
      req: request,
      secret: process.env.AUTH_SECRET,
      cookieName: '__Secure-authjs.session-token',
      secureCookie: true,
    });

    if (token?.equipoStatus === 'active') {
      // Set HMAC cookie so subsequent requests skip JWT lookup
      const response = intlMiddleware(request);
      response.headers.set('x-pathname', pathname);
      response.cookies.set('team_access', expected, {
        httpOnly: true, secure: true, sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, path: '/',
      });
      return response;
    }

    return NextResponse.redirect(new URL(`/${locale}/equipo/acceso`, request.url));
  }

  // ── Portal Asociados ──────────────────────────────────────────────────────
  if (localePath.startsWith('/asociados')) {
    const isPublic = PUBLIC_ASOCIADOS.some(p => localePath === p || localePath.startsWith(p + '/'));

    if (!isPublic) {
      const token = await getToken({
        req: request,
        secret: process.env.AUTH_SECRET,
        cookieName: '__Secure-authjs.session-token',
        secureCookie: true,
      });

      if (!token) {
        return NextResponse.redirect(new URL(`/${locale}/asociados/login`, request.url));
      }

      const status = token.asociadosStatus as string | null | undefined;

      if (status === 'incomplete') {
        return NextResponse.redirect(new URL(`/${locale}/asociados/completar-perfil`, request.url));
      } else if (status === 'pending') {
        if (!localePath.startsWith('/asociados/pendiente')) {
          return NextResponse.redirect(new URL(`/${locale}/asociados/pendiente`, request.url));
        }
      } else if (status === 'suspended') {
        return NextResponse.redirect(new URL(`/${locale}/asociados/login?error=suspended`, request.url));
      } else if (!status) {
        return NextResponse.redirect(new URL(`/${locale}/asociados/login?error=no_profile`, request.url));
      }
    }
  }

  const response = intlMiddleware(request);
  response.headers.set('x-pathname', pathname);
  return response;
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|robots\\.txt|sitemap\\.xml|icon|apple-icon|opengraph-image|.*\\..*).*)'],
};
