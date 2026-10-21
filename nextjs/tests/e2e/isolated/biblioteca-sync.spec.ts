// E2E AISLADO de la sincronización YouTube → Biblioteca. Solo corre contra docker-compose.e2e.yml.
import { test, expect } from '@playwright/test';
import { runYoutubeSync, type SyncResult } from '../../../src/lib/sync-youtube';
import { acquireSyncLock } from '../../../src/lib/sync-lock';
import { createFakeYouTube } from '../../support/fake-youtube';
import {
  isolatedConfig, prepareIsolatedDirectus, createSermon, findSermons, updateSermon,
  deleteAllSermons, dx, sermonsMigration, E2E_ADMIN_TOKEN, E2E_SYNC_SECRET,
} from './directus-admin';

test.skip(process.env.E2E_ISOLATED !== '1', 'Requiere el stack aislado (E2E_ISOLATED=1, docker-compose.e2e.yml)');
test.describe.configure({ mode: 'serial' });

const run = Date.now().toString(36).slice(-6);
const ids = { a: `A${run}0000`.slice(0, 11), b: `B${run}0000`.slice(0, 11), c: `C${run}0000`.slice(0, 11), d: `D${run}0000`.slice(0, 11) };
const titles = {
  aOld: `E2E ${run} Servicio A - Título viejo`,
  aNew: `E2E ${run} Servicio A - Título corregido en YouTube`,
  bEditorial: `E2E ${run} Título editorial B`,
  bRawOld: `E2E ${run} Servicio B - viejo`,
  bRawNew: `E2E ${run} Servicio B - nuevo en YouTube`,
  c: `E2E ${run} Servicio C`,
  d: `E2E ${run} Servicio D`,
};
const slugs = { a: `e2e-${run}-a`, b: `e2e-${run}-b`, c: `e2e-${run}-c`, d: `e2e-${run}-d` };
const sermonIds: Record<string, string> = {};

const yt = createFakeYouTube([
  { id: ids.a, title: `${titles.aNew} `, publishedAt: '2099-01-04T15:00:00Z' },
  { id: ids.b, title: titles.bRawNew, publishedAt: '2099-01-03T15:00:00Z' },
  { id: ids.d, title: titles.d, publishedAt: '2099-01-01T15:00:00Z' },
]);

async function syncNow(): Promise<SyncResult> {
  const { directusUrl, redisUrl } = isolatedConfig();
  const directusOrigin = new URL(directusUrl).origin;
  Object.assign(process.env, {
    YOUTUBE_API_KEY: 'e2e-clave-ficticia',
    YOUTUBE_CHANNEL_ID: 'UCe2e',
    DIRECTUS_URL: directusUrl,
    DIRECTUS_ADMIN_TOKEN: E2E_ADMIN_TOKEN,
  });
  const redis = new URL(redisUrl);
  const lock = await acquireSyncLock({ host: redis.hostname, port: Number(redis.port) });
  if (!lock) throw new Error('Lock ocupado en el Redis aislado');
  try {
    return await runYoutubeSync({ ensureLock: () => lock.ensure() }, {
      fetch: (async (input: string | URL | Request, init?: RequestInit) => {
        const url = new URL(String(input));
        if (yt.handles(url)) return yt.handle(url);
        if (url.origin === directusOrigin) return fetch(url, init);
        throw new Error(`Salida bloqueada en el E2E aislado: ${url.origin}`);
      }) as typeof fetch,
    });
  } finally {
    await lock.release();
  }
}

test.beforeAll(async () => {
  await prepareIsolatedDirectus();
  await deleteAllSermons();
  sermonIds.a = await createSermon({ youtube_id: ids.a, title: titles.aOld, raw_youtube_title: titles.aOld, slug: slugs.a, sermon_date: '2099-01-04', youtube_published_at: '2099-01-04T15:00:00Z' });
  sermonIds.b = await createSermon({ youtube_id: ids.b, title: titles.bEditorial, raw_youtube_title: titles.bRawOld, slug: slugs.b, sermon_date: '2099-01-03', youtube_published_at: '2099-01-03T15:00:00Z', description: 'Descripción editorial B' });
  sermonIds.c = await createSermon({ youtube_id: ids.c, title: titles.c, raw_youtube_title: titles.c, slug: slugs.c, sermon_date: '2099-01-02', youtube_published_at: '2099-01-02T15:00:00Z' });
  sermonIds.d = await createSermon({ youtube_id: ids.d, title: titles.d, raw_youtube_title: titles.d, slug: slugs.d, sermon_date: '2099-01-01', youtube_published_at: '2099-01-01T15:00:00Z', youtube_status: 'unavailable' });
});

test.afterAll(async () => {
  if (process.env.E2E_ISOLATED === '1') await deleteAllSermons();
});

test('antes de sincronizar, la Biblioteca muestra el título viejo (y la caché de Directus queda poblada)', async ({ page }) => {
  await page.goto('/es/biblioteca');
  await expect(page.getByRole('heading', { name: titles.aOld, exact: true }).first()).toBeVisible();
});

test('la sincronización actualiza títulos, respeta el editorial, marca C y recupera D', async () => {
  const result = await syncNow();
  expect(result).toMatchObject({ inserted: 0, updated: 2, restored: 1, unavailable: 1, unavailableIds: [ids.c], errors: [] });
  expect(result.titleChanges).toEqual([
    { youtube_id: ids.a, from: titles.aOld, to: titles.aNew, editorial: false },
    { youtube_id: ids.b, from: titles.bRawOld, to: titles.bRawNew, editorial: true },
  ]);
  const [b] = await findSermons(ids.b);
  expect(b).toMatchObject({ title: titles.bEditorial, raw_youtube_title: titles.bRawNew, description: 'Descripción editorial B', visibility: 'public' });
  const [c] = await findSermons(ids.c);
  expect(c).toMatchObject({ youtube_status: 'unavailable', visibility: 'public', title: titles.c });
});

function card(page: import('@playwright/test').Page, locale: string, slug: string) {
  return page.locator(`a[href="/${locale}/biblioteca/${slug}"]`).first();
}

test('héroe y tarjetas muestran el título nuevo, sin rastro del viejo', async ({ page }) => {
  await page.goto('/es/biblioteca');
  await expect(page.getByRole('heading', { name: titles.aNew, exact: true }).first()).toBeVisible();
  await expect(card(page, 'es', slugs.a).getByText(titles.aNew, { exact: true })).toBeVisible();
  await expect(page.getByText(titles.aOld)).toHaveCount(0);
});

test('la búsqueda devuelve títulos actuales y excluye el no disponible', async ({ page }) => {
  await page.goto(`/es/biblioteca?q=${encodeURIComponent(`E2E ${run}`)}`);
  await expect(card(page, 'es', slugs.a).getByText(titles.aNew, { exact: true })).toBeVisible();
  await expect(card(page, 'es', slugs.b).getByText(titles.bEditorial, { exact: true })).toBeVisible();
  await expect(card(page, 'es', slugs.d).getByText(titles.d, { exact: true })).toBeVisible();
  await expect(page.locator(`a[href="/es/biblioteca/${slugs.c}"]`)).toHaveCount(0);
  await expect(page.getByText(titles.c)).toHaveCount(0);
  await expect(page.getByText(titles.aOld)).toHaveCount(0);
});

test('el detalle muestra el título actual en español e inglés', async ({ page }) => {
  for (const locale of ['es', 'en']) {
    await page.goto(`/${locale}/biblioteca/${slugs.a}`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(titles.aNew);
  }
  await page.goto(`/es/biblioteca/${slugs.b}`);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(titles.bEditorial);
});

test('el detalle de un video no disponible responde 404 y el recuperado responde 200', async ({ page }) => {
  expect((await page.goto(`/es/biblioteca/${slugs.c}`))?.status()).toBe(404);
  const d = await page.goto(`/es/biblioteca/${slugs.d}`);
  expect(d?.status()).toBe(200);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(titles.d);
});

test('una segunda sincronización no escribe ni duplica', async () => {
  const result = await syncNow();
  expect(result).toMatchObject({ inserted: 0, updated: 0, restored: 0, unavailable: 0, unchanged: 3, errors: [] });
  expect(await findSermons(ids.a)).toHaveLength(1);
});

test('si C vuelve a YouTube se recupera y su detalle vuelve a responder', async ({ page }) => {
  yt.videos.set(ids.c, { id: ids.c, title: titles.c, publishedAt: '2099-01-02T15:00:00Z' });
  const result = await syncNow();
  expect(result).toMatchObject({ restored: 1, unavailable: 0, errors: [] });
  expect((await page.goto(`/es/biblioteca/${slugs.c}`))?.status()).toBe(200);
});

// Réplica del caso D0hL4Ax6juU: servicio del día 5; YouTube termina de publicar la transmisión el 6 (UTC).
test.describe('campos protegidos (sync_locked_fields) con la migración real', () => {
  const e = { id: `E${run}0000`.slice(0, 11), slug: `e2e-${run}-e`, old: `E2E ${run} Servicio E - viejo`, new: `E2E ${run} Servicio E - corregido` };

  test.beforeAll(async () => {
    yt.videos.set(e.id, { id: e.id, title: e.new, publishedAt: '2099-01-06T06:28:31Z' });
    sermonIds.e = await createSermon({ youtube_id: e.id, title: e.old, raw_youtube_title: e.old, slug: e.slug, sermon_date: '2099-01-05', youtube_published_at: '2099-01-05T15:00:00Z' });
  });

  test('la migración dejó sync_locked_fields en Directus y es idempotente', async () => {
    expect(await sermonsMigration().check()).toEqual({ exists: true, type: 'json' });
    expect(await sermonsMigration().apply()).toEqual({ created: false });
    const [row] = await findSermons(e.id);
    expect(row.sync_locked_fields).toBeNull();
  });

  test('proteger la fecha queda registrado en las revisiones de Directus', async () => {
    expect(await sermonsMigration().lock(e.id, 'sermon_date')).toMatchObject({ before: null, after: ['sermon_date'], changed: true });
    const res = await dx(`/revisions?filter[collection][_eq]=sermons&filter[item][_eq]=${sermonIds.e}&fields=delta&sort=-id&limit=1`);
    const [revision] = ((await res.json()) as { data: { delta: Record<string, unknown> }[] }).data;
    expect(revision.delta).toMatchObject({ sync_locked_fields: ['sermon_date'] });
  });

  test('la sync actualiza título y publicación pero conserva la fecha protegida y lo informa', async ({ page }) => {
    const result = await syncNow();
    expect(result.errors).toEqual([]);
    expect(result.protectedFields).toEqual([
      { youtube_id: e.id, field: 'sermon_date', kept: '2099-01-05', youtube: '2099-01-06', reason: 'sync_locked_fields' },
    ]);
    expect(result.changes.find(c => c.youtube_id === e.id)?.fields).toEqual(['raw_youtube_title', 'title', 'youtube_published_at']);
    const [row] = await findSermons(e.id);
    expect(row).toMatchObject({ sermon_date: '2099-01-05', title: e.new, sync_locked_fields: ['sermon_date'] });
    await page.goto(`/es/biblioteca/${e.slug}`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(e.new);
    await expect(page.getByText('5 de enero de 2099').first()).toBeVisible();
  });

  test('las sincronizaciones posteriores no cambian la fecha protegida', async () => {
    const result = await syncNow();
    expect(result).toMatchObject({ updated: 0, inserted: 0, protectedFields: [], errors: [] });
    expect((await findSermons(e.id))[0].sermon_date).toBe('2099-01-05');
  });

  test('sin el campo de protecciones la sync falla cerrado y no escribe (Directus real)', async () => {
    expect(await sermonsMigration().revert()).toEqual({
      removed: true, lostLocks: [{ youtube_id: e.id, sync_locked_fields: ['sermon_date'] }],
    });
    try {
      yt.videos.set(e.id, { id: e.id, title: `${e.new} 2`, publishedAt: '2099-01-07T10:00:00Z' });
      const before = await (await dx('/items/sermons?fields=id,title,sermon_date,last_synced_at&sort=id&limit=-1')).json();
      await expect(syncNow()).rejects.toThrow(/Directus sermons read error/);
      const after = await (await dx('/items/sermons?fields=id,title,sermon_date,last_synced_at&sort=id&limit=-1')).json();
      expect(after).toEqual(before);
    } finally {
      yt.videos.set(e.id, { id: e.id, title: e.new, publishedAt: '2099-01-06T06:28:31Z' });
      await sermonsMigration().apply();
      await sermonsMigration().lock(e.id, 'sermon_date');
    }
  });
});

test.describe('lock atómico en el Redis aislado', () => {
  function redisOpts() {
    const redis = new URL(isolatedConfig().redisUrl);
    return { host: redis.hostname, port: Number(redis.port) };
  }

  test('de 10 adquisiciones simultáneas solo una obtiene el lock', async () => {
    const locks = await Promise.all(Array.from({ length: 10 }, () => acquireSyncLock(redisOpts())));
    const owners = locks.filter(l => l !== null);
    expect(owners).toHaveLength(1);
    await owners[0]!.release();
  });

  test('un lock perdido no puede renovarse ni borrar el lock del nuevo dueño', async () => {
    const first = await acquireSyncLock(redisOpts());
    await first!.release();
    const second = await acquireSyncLock(redisOpts());
    expect(second).not.toBeNull();
    expect(await first!.ensure()).toBe(false);
    await first!.release();
    expect(await second!.ensure()).toBe(true);
    await second!.release();
  });

  test('la purga automática de caché de Directus no borra el lock', async () => {
    const lock = await acquireSyncLock(redisOpts());
    await updateSermon(sermonIds.d, { view_count: 7 });
    expect(await lock!.ensure()).toBe(true);
    await lock!.release();
  });
});

test.describe('ruta real POST /api/sync/youtube en el stack aislado', () => {
  test('rechaza peticiones sin secreto', async ({ request }) => {
    expect((await request.post('/api/sync/youtube')).status()).toBe(401);
  });

  test('responde 409 mientras otra ejecución tiene el lock', async ({ request }) => {
    const redis = new URL(isolatedConfig().redisUrl);
    const lock = await acquireSyncLock({ host: redis.hostname, port: Number(redis.port) });
    try {
      const res = await request.post('/api/sync/youtube', { headers: { Authorization: `Bearer ${E2E_SYNC_SECRET}` } });
      expect(res.status()).toBe(409);
    } finally {
      await lock!.release();
    }
  });

  // El stack aislado no tiene clave de YouTube a propósito (sin tráfico saliente): prueba el aborto previo a cualquier lectura.
  test('sin clave de YouTube configurada la ruta aborta sin escribir y libera el lock', async ({ request }) => {
    const before = await (await dx('/items/sermons?fields=id,title,youtube_status,last_synced_at&sort=id&limit=-1')).json();
    const res = await request.post('/api/sync/youtube', { headers: { Authorization: `Bearer ${E2E_SYNC_SECRET}` } });
    expect(res.status()).toBe(500);
    const after = await (await dx('/items/sermons?fields=id,title,youtube_status,last_synced_at&sort=id&limit=-1')).json();
    expect(after).toEqual(before);
    const redis = new URL(isolatedConfig().redisUrl);
    const lock = await acquireSyncLock({ host: redis.hostname, port: Number(redis.port) });
    expect(lock).not.toBeNull();
    await lock!.release();
  });
});
