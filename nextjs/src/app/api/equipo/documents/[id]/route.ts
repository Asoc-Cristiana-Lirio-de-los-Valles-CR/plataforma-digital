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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const docRes = await fetch(
      `${DIRECTUS_URL}/items/team_documents/${id}?fields=id,title,file,status,visibility`,
      { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` } }
    );
    if (!docRes.ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const { data: doc } = await docRes.json();
    if (!doc || doc.status !== 'published') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // private docs require valid cookie; link docs allow direct access
    if (doc.visibility !== 'link' && !await isAuthorized(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const fileRes = await fetch(
      `${DIRECTUS_URL}/assets/${doc.file}`,
      { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` } }
    );
    if (!fileRes.ok) return NextResponse.json({ error: 'File not found' }, { status: 404 });

    const contentType = fileRes.headers.get('content-type') ?? 'application/octet-stream';

    // View-only — always inline, never allow download via Content-Disposition attachment
    return new NextResponse(fileRes.body, {
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
