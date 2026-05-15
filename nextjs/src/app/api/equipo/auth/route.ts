import { createHmac } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

export function computeTeamToken(secret: string): string {
  return createHmac('sha256', secret).update('team-access').digest('hex');
}

export async function POST(request: NextRequest) {
  const secret = process.env.TEAM_SECRET;
  if (!secret) return NextResponse.json({ error: 'Not configured' }, { status: 500 });

  const { key, locale } = await request.json().catch(() => ({}));
  if (!key || key !== secret) {
    return NextResponse.json({ error: 'Clave incorrecta' }, { status: 401 });
  }

  const token = computeTeamToken(secret);
  const redirectUrl = `/${locale ?? 'es'}/equipo/manuales`;

  const response = NextResponse.redirect(new URL(redirectUrl, request.url));
  response.cookies.set('team_access', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
  return response;
}
