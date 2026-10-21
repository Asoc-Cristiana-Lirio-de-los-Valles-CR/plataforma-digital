// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import type { SyncResult } from '../../src/lib/sync-youtube';

const runYoutubeSync = vi.fn();
const acquireSyncLock = vi.fn();
const revalidatePath = vi.fn();
vi.mock('@/lib/sync-youtube', () => ({ runYoutubeSync }));
vi.mock('@/lib/sync-lock', () => ({ acquireSyncLock }));
vi.mock('next/cache', () => ({ revalidatePath }));

const activityPosts: { action: string; metadata: Record<string, unknown> }[] = [];
const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
  if (String(input).endsWith('/items/activity_logs') && init?.method === 'POST') {
    activityPosts.push(JSON.parse(String(init.body)));
    return new Response('{}', { status: 200 });
  }
  throw new Error(`fetch inesperado: ${String(input)}`);
});
vi.stubGlobal('fetch', fetchMock);

function result(overrides: Partial<SyncResult> = {}): SyncResult {
  return {
    inserted: 0, updated: 0, unchanged: 1022, unavailable: 0, restored: 0,
    titleChanges: [], changes: [], unavailableIds: [], errors: [], dryRun: false, ...overrides,
  };
}

function fakeLock() {
  return { token: 't-1', ensure: vi.fn(async () => true), release: vi.fn(async () => {}) };
}

function request(query = '', token = 'sync-secret') {
  return new NextRequest(`http://localhost/api/sync/youtube${query}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

async function loadRoute() {
  vi.resetModules();
  return import('../../src/app/api/sync/youtube/route');
}

beforeEach(() => {
  process.env.SYNC_SECRET = 'sync-secret';
  process.env.DIRECTUS_URL = 'http://directus:8055';
  process.env.DIRECTUS_ADMIN_TOKEN = 'admin-token';
  runYoutubeSync.mockReset();
  acquireSyncLock.mockReset();
  revalidatePath.mockReset();
  activityPosts.length = 0;
});

describe('POST /api/sync/youtube', () => {
  it('rechaza peticiones sin el secreto correcto', async () => {
    const { POST } = await loadRoute();
    expect((await POST(request('', ''))).status).toBe(401);
    expect((await POST(request('', 'otro'))).status).toBe(401);
    expect(runYoutubeSync).not.toHaveBeenCalled();
    expect(acquireSyncLock).not.toHaveBeenCalled();
  });

  it('rechaza todo si SYNC_SECRET no está configurado (incluido "Bearer undefined")', async () => {
    delete process.env.SYNC_SECRET;
    const { POST } = await loadRoute();
    expect((await POST(request('', 'undefined'))).status).toBe(401);
    expect(runYoutubeSync).not.toHaveBeenCalled();
  });

  it('responde 409 sin sincronizar cuando otra ejecución tiene el lock', async () => {
    acquireSyncLock.mockResolvedValue(null);
    const { POST } = await loadRoute();
    expect((await POST(request())).status).toBe(409);
    expect(runYoutubeSync).not.toHaveBeenCalled();
  });

  it('responde 503 sin sincronizar si Redis no está disponible (falla cerrado)', async () => {
    acquireSyncLock.mockRejectedValue(new Error('Redis timeout'));
    const { POST } = await loadRoute();
    expect((await POST(request())).status).toBe(503);
    expect(runYoutubeSync).not.toHaveBeenCalled();
  });

  it('sincroniza con el lock, registra el resultado, revalida y libera el lock', async () => {
    const lock = fakeLock();
    acquireSyncLock.mockResolvedValue(lock);
    runYoutubeSync.mockImplementation(async (opts: { ensureLock: () => Promise<boolean> }) => {
      expect(await opts.ensureLock()).toBe(true);
      return result({ updated: 5, unavailable: 3, unavailableIds: ['a', 'b', 'c'] });
    });
    const { POST } = await loadRoute();
    const res = await POST(request());
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, updated: 5, unavailable: 3 });
    expect(lock.ensure).toHaveBeenCalledTimes(1);
    expect(lock.release).toHaveBeenCalledTimes(1);
    expect(activityPosts).toEqual([{ action: 'youtube_sync', metadata: expect.objectContaining({ updated: 5, unavailable: 3 }) }]);
    expect(revalidatePath).toHaveBeenCalledWith('/[locale]/biblioteca', 'layout');
  });

  it('no revalida cuando la sincronización no escribió nada', async () => {
    acquireSyncLock.mockResolvedValue(fakeLock());
    runYoutubeSync.mockResolvedValue(result());
    const { POST } = await loadRoute();
    expect((await POST(request())).status).toBe(200);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('responde 207 cuando la ejecución terminó con errores, para que el cron lo haga visible', async () => {
    acquireSyncLock.mockResolvedValue(fakeLock());
    runYoutubeSync.mockResolvedValue(result({ updated: 1, errors: ['unavailable_circuit_breaker'] }));
    const { POST } = await loadRoute();
    expect((await POST(request())).status).toBe(207);
  });

  it('libera el lock y registra el fallo cuando la sincronización lanza un error', async () => {
    const lock = fakeLock();
    acquireSyncLock.mockResolvedValue(lock);
    runYoutubeSync.mockRejectedValue(new Error('YouTube videos error: 500'));
    const { POST } = await loadRoute();
    const res = await POST(request());
    expect(res.status).toBe(500);
    expect(lock.release).toHaveBeenCalledTimes(1);
    expect(activityPosts).toEqual([{ action: 'youtube_sync_error', metadata: { error: 'Error: YouTube videos error: 500' } }]);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('aplica el enfriamiento de 10 minutos entre ejecuciones reales', async () => {
    acquireSyncLock.mockResolvedValue(fakeLock());
    runYoutubeSync.mockResolvedValue(result());
    const { POST } = await loadRoute();
    expect((await POST(request())).status).toBe(200);
    expect((await POST(request())).status).toBe(429);
    expect(acquireSyncLock).toHaveBeenCalledTimes(1);
  });

  it('dry_run calcula el plan sin lock, sin registro, sin revalidar y sin consumir el enfriamiento', async () => {
    runYoutubeSync.mockResolvedValue(result({ dryRun: true, updated: 5 }));
    const { POST } = await loadRoute();
    const res = await POST(request('?dry_run=true'));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, dryRun: true, updated: 5 });
    expect(runYoutubeSync).toHaveBeenCalledWith({ dryRun: true });
    expect(acquireSyncLock).not.toHaveBeenCalled();
    expect(activityPosts).toHaveLength(0);
    expect(revalidatePath).not.toHaveBeenCalled();

    acquireSyncLock.mockResolvedValue(fakeLock());
    runYoutubeSync.mockResolvedValue(result());
    expect((await POST(request())).status).toBe(200);
  });
});
