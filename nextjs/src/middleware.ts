import { getToken } from 'next-auth/jwt';
import createIntlMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const intlMiddleware = createIntlMiddleware({
  locales: ['es', 'en'],
  defaultLocale: 'es',
  localeDetection: false,
});

const PUBLIC_ASOCIADOS = ['/asociados/login', '/asociados/registro', '/asociados/pendiente'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const localeMatch = pathname.match(/^\/(es|en)(\/.*)?$/);
  const localePath = localeMatch ? (localeMatch[2] ?? '/') : pathname;

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

      if (status === 'pending') {
        if (!localePath.startsWith('/asociados/pendiente')) {
          return NextResponse.redirect(new URL(`/${locale}/asociados/pendiente`, request.url));
        }
      } else if (status === 'suspended') {
        return NextResponse.redirect(new URL(`/${locale}/asociados/login?error=suspended`, request.url));
      } else if (!status) {
        return NextResponse.redirect(new URL(`/${locale}/asociados/registro`, request.url));
      }
    }
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|robots\\.txt|sitemap\\.xml|icon|apple-icon|opengraph-image|.*\\..*).*)'],
};
