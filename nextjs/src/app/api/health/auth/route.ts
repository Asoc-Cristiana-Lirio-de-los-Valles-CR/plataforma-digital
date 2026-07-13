import { NextResponse } from 'next/server';

const DIRECTUS_URL = process.env.DIRECTUS_URL ?? 'http://directus:8055';

export const dynamic = 'force-dynamic';

export async function GET() {
  const checks: Record<string, 'ok' | 'fail' | 'missing'> = {};

  // Check required env vars exist (never expose values)
  checks.AUTH_SECRET = process.env.AUTH_SECRET ? 'ok' : 'missing';
  checks.AUTH_GOOGLE_ID = process.env.AUTH_GOOGLE_ID ? 'ok' : 'missing';
  checks.AUTH_GOOGLE_SECRET = process.env.AUTH_GOOGLE_SECRET ? 'ok' : 'missing';
  checks.DIRECTUS_ADMIN_TOKEN = process.env.DIRECTUS_ADMIN_TOKEN ? 'ok' : 'missing';
  checks.DIRECTUS_DOCUMENTS_TOKEN = process.env.DIRECTUS_DOCUMENTS_TOKEN ? 'ok' : 'missing';

  // Check Directus reachable with admin token
  try {
    const res = await fetch(`${DIRECTUS_URL}/server/health`, {
      headers: { Authorization: `Bearer ${process.env.DIRECTUS_ADMIN_TOKEN}` },
      signal: AbortSignal.timeout(3000),
    });
    checks.directus_connection = res.ok ? 'ok' : 'fail';
  } catch {
    checks.directus_connection = 'fail';
  }

  // Check documents token has correct scope (read asociados_documents)
  try {
    const res = await fetch(
      `${DIRECTUS_URL}/items/asociados_documents?limit=1&fields=id`,
      {
        headers: { Authorization: `Bearer ${process.env.DIRECTUS_DOCUMENTS_TOKEN}` },
        signal: AbortSignal.timeout(3000),
      }
    );
    // 200 or 403 with data means token works; 401 means invalid token
    checks.documents_token_scope = res.status !== 401 ? 'ok' : 'fail';
  } catch {
    checks.documents_token_scope = 'fail';
  }

  const allOk = Object.values(checks).every(v => v === 'ok');

  return NextResponse.json(
    { status: allOk ? 'ok' : 'degraded', checks },
    { status: allOk ? 200 : 503 }
  );
}
