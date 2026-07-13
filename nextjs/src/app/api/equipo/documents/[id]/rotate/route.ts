import { fetch as undiciFetch } from 'undici';
import { NextRequest, NextResponse } from 'next/server';
import { getTeamSecret } from '@/lib/teamSecret';

const DIRECTUS_URL = process.env.DIRECTUS_URL ?? 'http://directus:8055';
const ADMIN_TOKEN = process.env.DIRECTUS_ADMIN_TOKEN!;

async function computeTeamToken(secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode('team-access'));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function isAuthorized(request: NextRequest): Promise<boolean> {
  const secret = await getTeamSecret();
  if (!secret) return false;
  const cookie = request.cookies.get('team_access');
  return cookie?.value === await computeTeamToken(secret);
}

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const newToken = crypto.randomUUID();

  const res = await undiciFetch(`${DIRECTUS_URL}/items/team_documents/${id}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${ADMIN_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ access_token: newToken }),
  });

  if (!res.ok) {
    return NextResponse.json({ error: 'Failed to update token' }, { status: 500 });
  }

  return NextResponse.json({ token: newToken });
}
