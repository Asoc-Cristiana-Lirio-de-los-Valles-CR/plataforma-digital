import { fetch as undiciFetch } from 'undici';
import { NextRequest, NextResponse } from 'next/server';

const DIRECTUS_URL = process.env.DIRECTUS_URL ?? 'http://directus:8055';
const ADMIN_TOKEN = process.env.DIRECTUS_ADMIN_TOKEN!;

async function computeTeamToken(secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode('team-access'));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function isAuthorized(request: NextRequest): Promise<boolean> {
  const secret = process.env.TEAM_SECRET;
  if (!secret) return false;
  const cookie = request.cookies.get('team_access');
  return cookie?.value === await computeTeamToken(secret);
}

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    // Use undici to bypass Next.js fetch cache entirely
    const docRes = await undiciFetch(
      `${DIRECTUS_URL}/items/team_documents/${id}?fields=id,title,file,status,visibility,access_token`,
      { headers: { Authorization: `Bearer ${ADMIN_TOKEN}`, 'Cache-Control': 'no-store' } }
    );
    if (!docRes.ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const { data: doc } = await docRes.json() as { data: { id: string; title: string; file: string; status: string; visibility: string; access_token: string | null } };
    if (!doc || doc.status !== 'published') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const tokenParam = new URL(request.url).searchParams.get('token');
    const hasValidToken = !!(doc.access_token && tokenParam === doc.access_token);

    // private docs require valid cookie or per-doc token; link docs allow direct access
    if (doc.visibility !== 'link' && !hasValidToken && !await isAuthorized(request)) {
      return new NextResponse(
        `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Acceso restringido</title><style>*{margin:0;padding:0;box-sizing:border-box}body{min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0a0a14;font-family:system-ui,sans-serif;color:#fff}div{text-align:center;padding:2rem}.icon{font-size:3rem;margin-bottom:1rem}h1{font-size:1.25rem;font-weight:600;margin-bottom:.5rem}p{font-size:.875rem;color:rgba(255,255,255,.4);margin-bottom:1.5rem}a{display:inline-block;padding:.625rem 1.25rem;background:#4f3d8a;color:#fff;border-radius:.75rem;font-size:.875rem;text-decoration:none}a:hover{background:#5e4aa0}</style></head><body><div><div class="icon">🔒</div><h1>Documento restringido</h1><p>Este documento requiere autorización para ser visualizado.</p><a href="/es/equipo/acceso">Ingresar con clave de acceso</a></div></body></html>`,
        { status: 401, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }

    const fileRes = await undiciFetch(
      `${DIRECTUS_URL}/assets/${doc.file}`,
      { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` } }
    );
    if (!fileRes.ok) return NextResponse.json({ error: 'File not found' }, { status: 404 });

    const contentType = fileRes.headers.get('content-type') ?? 'application/octet-stream';

    return new NextResponse(fileRes.body as unknown as BodyInit, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': 'inline',
        'Cache-Control': 'private, no-store',
        'X-Robots-Tag': 'noindex',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'no-referrer',
        'Content-Security-Policy': "default-src 'none'; media-src 'self'; img-src 'self' data:; object-src 'self'",
      },
    });
  } catch (err) {
    console.error('Team document proxy error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
