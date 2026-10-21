import { NextRequest, NextResponse } from 'next/server';
import { runYoutubeSync } from '@/lib/sync-youtube';

let lastSyncAt = 0;
const SYNC_COOLDOWN_MS = 10 * 60 * 1000;

const LOCK_TTL = 900;

async function acquireLock(directusUrl: string, adminToken: string): Promise<boolean> {
  const since = new Date(Date.now() - LOCK_TTL * 1000).toISOString();
  const res = await fetch(
    `${directusUrl}/items/activity_logs?filter[action][_eq]=youtube_sync_running&filter[date_created][_gte]=${since}&limit=1`,
    { headers: { Authorization: `Bearer ${adminToken}` } }
  ).catch(() => null);

  if (res?.ok) {
    const data = await res.json();
    if (data?.data?.length > 0) return false;
  }

  await fetch(`${directusUrl}/items/activity_logs`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'youtube_sync_running', metadata: { started_at: new Date().toISOString() } }),
  }).catch(() => {});

  return true;
}

export async function POST(request: NextRequest) {
  const auth = request.headers.get('Authorization');
  const expected = `Bearer ${process.env.SYNC_SECRET}`;
  if (!auth || auth !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (Date.now() - lastSyncAt < SYNC_COOLDOWN_MS) {
    return NextResponse.json({ error: 'Sync cooldown active. Retry in 10 minutes.' }, { status: 429 });
  }

  const directusUrl = process.env.DIRECTUS_URL ?? 'http://directus:8055';
  const adminToken = process.env.DIRECTUS_ADMIN_TOKEN!;

  const locked = await acquireLock(directusUrl, adminToken);
  if (!locked) {
    return NextResponse.json({ error: 'Sync already running' }, { status: 409 });
  }

  lastSyncAt = Date.now();

  const full = request.nextUrl.searchParams.get('full') === 'true';

  let publishedAfter: string | undefined;
  if (!full) {
    try {
      const logsRes = await fetch(
        `${directusUrl}/items/activity_logs?filter[action][_eq]=youtube_sync&sort[]=-date_created&limit=1`,
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      const logsData = await logsRes.json();
      const lastSync = logsData?.data?.[0]?.date_created;
      if (lastSync) publishedAfter = lastSync;
    } catch { /* first sync */ }
  }

  try {
    const result = await runYoutubeSync({ full, publishedAfter });

    await fetch(`${directusUrl}/items/activity_logs`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'youtube_sync',
        metadata: { ...result, full, publishedAfter },
      }),
    }).catch(() => {});

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error('Sync error:', err);
    return NextResponse.json({ error: 'Sync failed', detail: String(err) }, { status: 500 });
  }
}
