import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { runYoutubeSync, type SyncResult } from '@/lib/sync-youtube';
import { acquireSyncLock } from '@/lib/sync-lock';

let lastSyncAt = 0;
const SYNC_COOLDOWN_MS = 10 * 60 * 1000;

async function logActivity(action: string, metadata: Record<string, unknown>): Promise<void> {
  const directusUrl = process.env.DIRECTUS_URL ?? 'http://directus:8055';
  try {
    const res = await fetch(`${directusUrl}/items/activity_logs`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.DIRECTUS_ADMIN_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, metadata }),
    });
    if (!res.ok) console.error(`Sync activity log failed: ${res.status}`);
  } catch (err) {
    console.error('Sync activity log failed:', err);
  }
}

function writeCount(result: SyncResult): number {
  return result.inserted + result.updated + result.restored + result.unavailable;
}

export async function POST(request: NextRequest) {
  const auth = request.headers.get('Authorization');
  const expected = `Bearer ${process.env.SYNC_SECRET}`;
  if (!process.env.SYNC_SECRET || !auth || auth !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // `full` se acepta por compatibilidad: toda ejecución reconcilia el catálogo completo.
  if (request.nextUrl.searchParams.get('dry_run') === 'true') {
    try {
      const result = await runYoutubeSync({ dryRun: true });
      return NextResponse.json({ ok: true, ...result });
    } catch (err) {
      console.error('Sync dry run error:', err);
      return NextResponse.json({ error: 'Sync dry run failed', detail: String(err) }, { status: 500 });
    }
  }

  if (Date.now() - lastSyncAt < SYNC_COOLDOWN_MS) {
    return NextResponse.json({ error: 'Sync cooldown active. Retry in 10 minutes.' }, { status: 429 });
  }

  let lock;
  try {
    lock = await acquireSyncLock();
  } catch (err) {
    console.error('Sync lock unavailable:', err);
    return NextResponse.json({ error: 'Sync lock unavailable' }, { status: 503 });
  }
  if (!lock) {
    return NextResponse.json({ error: 'Sync already running' }, { status: 409 });
  }

  lastSyncAt = Date.now();
  try {
    const result = await runYoutubeSync({ ensureLock: () => lock.ensure() });
    await logActivity('youtube_sync', { ...result });
    if (writeCount(result) > 0) revalidatePath('/[locale]/biblioteca', 'layout');
    return NextResponse.json({ ok: result.errors.length === 0, ...result }, { status: result.errors.length === 0 ? 200 : 207 });
  } catch (err) {
    console.error('Sync error:', err);
    await logActivity('youtube_sync_error', { error: String(err) });
    return NextResponse.json({ error: 'Sync failed', detail: String(err) }, { status: 500 });
  } finally {
    await lock.release();
  }
}
