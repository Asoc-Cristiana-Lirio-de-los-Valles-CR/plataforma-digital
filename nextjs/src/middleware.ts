import { auth } from '@/auth';
import createIntlMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const intlMiddleware = createIntlMiddleware({
  locales: ['es', 'en'],
  defaultLocale: 'es',
  localeDetection: false,
});

// Routes that require authentication inside /asociados
const PROTECTED_ASOCIADOS = ['/asociados', '/asociados/documentos', '/asociados/comunicados', '/asociados/perfil'];
// Routes accessible without auth inside /asociados
const PUBLIC_ASOCIADOS = ['/asociados/login', '/asociados/registro', '/asociados/pendiente'];

export default auth(async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Extract locale prefix if present
  const localeMatch = pathname.match(/^\/(es|en)(\/.*)?$/);
  const localePath = localeMatch ? (localeMatch[2] ?? '/') : pathname;

  // Only apply auth logic to /asociados/* routes
  if (localePath.startsWith('/asociados')) {
    const isPublicAsociadosRoute = PUBLIC_ASOCIADOS.some(p => localePath === p || localePath.startsWith(p + '/'));

    if (!isPublicAsociadosRoute) {
      const session = (request as any).auth;
      const locale = localeMatch?.[1] ?? 'es';

      if (!session?.user) {
        return NextResponse.redirect(new URL(`/${locale}/asociados/login`, request.url));
      }

      const status = session.user.profileStatus;

      if (status === 'pending') {
        if (!localePath.startsWith('/asociados/pendiente')) {
          return NextResponse.redirect(new URL(`/${locale}/asociados/pendiente`, request.url));
        }
      } else if (status === 'suspended') {
        return NextResponse.redirect(new URL(`/${locale}/asociados/login?error=suspended`, request.url));
      } else if (status === null || status === undefined) {
        // No profile yet — send to registro
        return NextResponse.redirect(new URL(`/${locale}/asociados/registro`, request.url));
      }
    }
  }

  return intlMiddleware(request);
});

export const config = {
  matcher: ['/((?!api|_next|_vercel|robots\\.txt|sitemap\\.xml|icon|apple-icon|opengraph-image|.*\\..*).*)'],
};
