import { NextRequest, NextResponse } from 'next/server';

async function computeTeamToken(secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode('team-access'));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function POST(request: NextRequest) {
  const secret = process.env.TEAM_SECRET;
  if (!secret) return NextResponse.json({ error: 'Not configured' }, { status: 500 });

  const { key, locale } = await request.json().catch(() => ({}));
  if (!key || key !== secret) {
    return NextResponse.json({ error: 'Clave incorrecta' }, { status: 401 });
  }

  const token = await computeTeamToken(secret);

  const response = NextResponse.json({ ok: true });
  response.cookies.set('team_access', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });
  return response;
}
