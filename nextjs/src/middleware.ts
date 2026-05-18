import { getToken } from 'next-auth/jwt';
import createIntlMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getTeamSecret } from '@/lib/teamSecret';

const DIRECTUS_URL = process.env.DIRECTUS_URL ?? 'http://directus:8055';
const ADMIN_TOKEN = process.env.DIRECTUS_ADMIN_TOKEN!;

// Cache team_members emails (60s TTL) to avoid Directus fetch on every request
const g = globalThis as typeof globalThis & {
  _teamMembersCache?: { emails: Set<string>; expires: number };
};

async function computeTeamToken(secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode('team-access'));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function isTeamMember(email: string): Promise<boolean> {
  if (g._teamMembersCache && Date.now() < g._teamMembersCache.expires) {
    return g._teamMembersCache.emails.has(email.toLowerCase());
  }
  try {
    const res = await fetch(
      `${DIRECTUS_URL}/items/team_members?fields=email&limit=200`,
      { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` } }
    );
    if (res.ok) {
      const { data } = await res.json() as { data: { email: string }[] };
      const emails = new Set(data.map(m => m.email.toLowerCase()));
      g._teamMembersCache = { emails, expires: Date.now() + 60_000 };
      return emails.has(email.toLowerCase());
    }
  } catch {
    // fail open if Directus unreachable — deny access
  }
  return false;
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

  if (localePath.startsWith('/equipo') && !localePath.startsWith('/equipo/acceso')) {
    const secret = await getTeamSecret();
    const locale = localeMatch?.[1] ?? 'es';

    if (!secret) {
      return NextResponse.redirect(new URL(`/${locale}/equipo/acceso`, request.url));
    }

    const expected = await computeTeamToken(secret);
    const teamCookie = request.cookies.get('team_access');

    // Valid HMAC cookie → allow
    if (teamCookie?.value === expected) {
      return intlMiddleware(request);
    }

    // ?key= param → set cookie and redirect clean
    const key = request.nextUrl.searchParams.get('key');
    if (key && key === secret) {
      const response = NextResponse.redirect(new URL(`/${locale}/equipo/manuales`, request.url));
      response.cookies.set('team_access', expected, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
      });
      return response;
    }

    // NextAuth Google session → check team_members list
    const token = await getToken({
      req: request,
      secret: process.env.AUTH_SECRET,
      cookieName: '__Secure-authjs.session-token',
      secureCookie: true,
    });

    if (token?.email && await isTeamMember(token.email as string)) {
      // Set team_access cookie so subsequent requests skip Directus lookup
      const response = NextResponse.next();
      response.cookies.set('team_access', expected, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
      });
      return intlMiddleware(request);
    }

    return NextResponse.redirect(new URL(`/${locale}/equipo/acceso`, request.url));
  }

  if (localePath.startsWith('/asociados')) {
    const isPublic = PUBLIC_ASOCIADOS.some(p => localePath === p || localePath.startsWith(p + '/'));

    if (!isPublic) {
      const token = await getToken({
        req: request,
        secret: process.env.AUTH_SECRET,
        cookieName: '__Secure-authjs.session-token',
        secureCookie: true,
      });
      const locale = localeMatch?.[1] ?? 'es';

      if (!token) {
        return NextResponse.redirect(new URL(`/${locale}/asociados/login`, request.url));
      }

      const status = token.profileStatus as string | null | undefined;

      if (status === 'incomplete') {
        if (!localePath.startsWith('/asociados/completar-perfil')) {
          return NextResponse.redirect(new URL(`/${locale}/asociados/completar-perfil`, request.url));
        }
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

  return intlMiddleware(request);
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|robots\\.txt|sitemap\\.xml|icon|apple-icon|opengraph-image|.*\\..*).*)'],
};
