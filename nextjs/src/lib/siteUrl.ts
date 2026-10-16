import { headers } from 'next/headers';

const FALLBACK_URL = 'https://liriodelosvallescr.org';

// Host es entrada del cliente: solo se acepta un hostname[:puerto] literal
const VALID_HOST = /^[a-z0-9.-]+(:\d+)?$/i;

/**
 * URL base del sitio derivada del host de la petición, para que cada dominio
 * (liriodelosvallescr.org y liriodelosvalles.org) se autorreferencie en su
 * metadata en lugar de apuntar siempre al dominio institucional.
 */
export async function getSiteUrl(): Promise<string> {
  const headersList = await headers();
  const host = headersList.get('x-forwarded-host') ?? headersList.get('host');

  if (host && VALID_HOST.test(host)) {
    return `https://${host}`;
  }

  return process.env.NEXT_PUBLIC_SITE_URL || FALLBACK_URL;
}
