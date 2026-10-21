// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest';
import { runYoutubeSync } from '../../src/lib/sync-youtube';
import { createFakeYouTube, type FakeVideo } from '../support/fake-youtube';
import { createFakeDirectus, type Row } from '../support/fake-directus';

const SYNCED_AT = '2026-10-21T15:00:00.000Z';

const OLD_TITLE = 'Servicio General 11 de Octubre de 2026 - Veneno en la Olla.';
const NEW_TITLE = 'Servicio General 17 de Octubre de 2026 - La libertad que nace del perdón.';

function sermonRow(overrides: Partial<Row> & { id: string; youtube_id: string }): Row {
  return {
    title: 'Servicio General',
    raw_youtube_title: 'Servicio General',
    slug: `slug-${overrides.youtube_id}`,
    youtube_status: 'available',
    visibility: 'public',
    featured: false,
    description: 'Descripción editorial',
    youtube_published_at: '2026-10-01T15:00:00.000Z',
    sermon_date: '2026-10-01',
    duration_seconds: 5400,
    view_count: 10,
    preacher: null,
    series: null,
    manual_thumbnail: null,
    ...overrides,
  };
}

function ytVideo(overrides: Partial<FakeVideo> & { id: string }): FakeVideo {
  return { title: 'Servicio General', publishedAt: '2026-10-01T15:00:00Z', duration: 'PT1H30M', viewCount: 10, ...overrides };
}

let yt: ReturnType<typeof createFakeYouTube>;
let dx: ReturnType<typeof createFakeDirectus>;

function deps() {
  return {
    fetch: (async (input: string | URL | Request, init?: RequestInit) => {
      const url = new URL(String(input));
      if (yt.handles(url)) return yt.handle(url);
      if (dx.handles(url)) return dx.handle(url, init);
      throw new Error(`host inesperado: ${url.host}`);
    }) as typeof fetch,
    now: () => new Date(SYNCED_AT),
    sleep: async () => {},
  };
}

beforeEach(() => {
  process.env.YOUTUBE_API_KEY = 'test-key';
  process.env.YOUTUBE_CHANNEL_ID = 'UCtest';
  process.env.DIRECTUS_URL = 'http://directus:8055';
  process.env.DIRECTUS_ADMIN_TOKEN = 'admin-token';

  yt = createFakeYouTube([
    ytVideo({ id: 'kcylErKffEM', title: `${NEW_TITLE} `, publishedAt: '2026-10-18T15:21:56Z', duration: 'PT1H56M7S', viewCount: 130 }),
    ytVideo({ id: 'xe5mHjhrS-A', title: 'Servicio General 18 de Octubre de 2026 - El cristiano y el manejo de culpa.', publishedAt: '2026-10-19T06:45:58Z' }),
    ytVideo({ id: 'NEWvideo001', title: 'Servicio General 24 de Octubre de 2026 - Serie Romanos #1', description: 'Nueva predicación', publishedAt: '2026-10-25T02:10:00Z', duration: 'PT1H40M', viewCount: 3 }),
  ]);
  dx = createFakeDirectus([
    sermonRow({ id: 's1', youtube_id: 'kcylErKffEM', title: OLD_TITLE, raw_youtube_title: OLD_TITLE, youtube_published_at: '2026-10-18T15:21:56.000Z', sermon_date: '2026-10-18', duration_seconds: 6967, view_count: 120 }),
    sermonRow({ id: 's2', youtube_id: 'xe5mHjhrS-A', title: 'Servicio General 18 de Octubre de 2026 - El cristiano y el manejo de culpa.', raw_youtube_title: 'Servicio General 18 de Octubre de 2026 - El cristiano y el manejo de culpa.', youtube_published_at: '2026-10-19T06:45:58.000Z', sermon_date: '2026-10-19' }),
  ]);
});

describe('runYoutubeSync', () => {
  it('actualiza el título de un video existente renombrado en YouTube (regresión kcylErKffEM)', async () => {
    const result = await runYoutubeSync({}, deps());
    expect(dx.items.get('s1')).toMatchObject({ title: NEW_TITLE, raw_youtube_title: NEW_TITLE, last_synced_at: SYNCED_AT });
    expect(result.updated).toBe(1);
    expect(result.unchanged).toBe(1);
    expect(result.titleChanges).toEqual([{ youtube_id: 'kcylErKffEM', from: OLD_TITLE, to: NEW_TITLE, editorial: false }]);
  });

  it('importa un video nuevo con los campos de YouTube y valores editoriales por defecto', async () => {
    const result = await runYoutubeSync({}, deps());
    const [created] = dx.byYoutubeId('NEWvideo001');
    expect(result.inserted).toBe(1);
    expect(created).toMatchObject({
      title: 'Servicio General 24 de Octubre de 2026 - Serie Romanos #1',
      raw_youtube_title: 'Servicio General 24 de Octubre de 2026 - Serie Romanos #1',
      youtube_status: 'available',
      visibility: 'public',
      featured: false,
      description: 'Nueva predicación',
      youtube_published_at: '2026-10-25T02:10:00Z',
      sermon_date: '2026-10-25',
      duration_seconds: 6000,
      view_count: 3,
      suggested_series: 'Romanos',
      thumbnail_url: 'https://i.ytimg.com/vi/NEWvideo001/maxresdefault.jpg',
      imported_at: SYNCED_AT,
    });
    expect(String(created.slug)).toMatch(/-o001$/);
  });

  it('una segunda ejecución no duplica registros ni escribe nada', async () => {
    await runYoutubeSync({}, deps());
    const writesAfterFirst = dx.writes.length;
    const second = await runYoutubeSync({}, deps());
    expect(dx.writes.length).toBe(writesAfterFirst);
    expect(dx.byYoutubeId('NEWvideo001')).toHaveLength(1);
    expect(second).toMatchObject({ inserted: 0, updated: 0, unchanged: 3, unavailable: 0, errors: [] });
  });

  it('conserva los campos editoriales del registro al actualizar', async () => {
    dx.items.set('s1', {
      ...dx.items.get('s1')!,
      description: 'Texto editorial', preacher: 'preacher-1', series: 'series-1',
      visibility: 'unlisted', featured: true, slug: 'slug-editorial', manual_thumbnail: 'file-1',
    });
    await runYoutubeSync({}, deps());
    expect(dx.items.get('s1')).toMatchObject({
      title: NEW_TITLE,
      description: 'Texto editorial', preacher: 'preacher-1', series: 'series-1',
      visibility: 'unlisted', featured: true, slug: 'slug-editorial', manual_thumbnail: 'file-1',
    });
  });

  it('conserva un título editado a mano y registra el nuevo título de YouTube', async () => {
    dx.items.set('s1', { ...dx.items.get('s1')!, title: 'La libertad que nace del perdón' });
    const result = await runYoutubeSync({}, deps());
    expect(dx.items.get('s1')).toMatchObject({ title: 'La libertad que nace del perdón', raw_youtube_title: NEW_TITLE });
    expect(result.titleChanges[0].editorial).toBe(true);
  });

  it('recorre todas las páginas de la playlist y carga todos los registros existentes', async () => {
    for (let i = 0; i < 520; i++) {
      const id = `bulk${String(i).padStart(7, '0')}`;
      yt.videos.set(id, ytVideo({ id }));
      dx.items.set(`b${String(i).padStart(4, '0')}`, sermonRow({ id: `b${String(i).padStart(4, '0')}`, youtube_id: id }));
    }
    const result = await runYoutubeSync({}, deps());
    expect(result).toMatchObject({ inserted: 1, updated: 1, unchanged: 521, errors: [] });
    expect(yt.calls.playlistItems).toBe(11);
  });

  it('carga todos los registros aunque Directus recorte el tamaño de página (QUERY_LIMIT_MAX)', async () => {
    dx.state.maxLimit = 100;
    for (let i = 0; i < 520; i++) {
      const id = `bulk${String(i).padStart(7, '0')}`;
      yt.videos.set(id, ytVideo({ id }));
      dx.items.set(`b${String(i).padStart(4, '0')}`, sermonRow({ id: `b${String(i).padStart(4, '0')}`, youtube_id: id }));
    }
    const result = await runYoutubeSync({}, deps());
    expect(result).toMatchObject({ inserted: 1, updated: 1, unchanged: 521, errors: [] });
  });

  it('aborta sin escribir si la playlist repite el token de página', async () => {
    yt.options.repeatPageToken = true;
    await expect(runYoutubeSync({}, deps())).rejects.toThrow(/pageToken/);
    expect(dx.writes).toHaveLength(0);
    expect(yt.calls.playlistItems).toBeLessThanOrEqual(3);
  });

  it('trata los "Private video" de la playlist como no disponibles y no los importa', async () => {
    dx.items.set('s3', sermonRow({ id: 's3', youtube_id: 'private0001' }));
    yt.videos.set('private0001', ytVideo({ id: 'private0001', placeholder: true }));
    yt.videos.set('private0002', ytVideo({ id: 'private0002', placeholder: true }));
    const result = await runYoutubeSync({}, deps());
    expect(result.unavailableIds).toEqual(['private0001']);
    expect(dx.byYoutubeId('private0002')).toHaveLength(0);
    expect(dx.items.get('s3')).toMatchObject({ youtube_status: 'unavailable', title: 'Servicio General' });
  });

  it('una ejecución real sin DIRECTUS_ADMIN_TOKEN falla antes de consultar nada', async () => {
    process.env.DIRECTUS_ADMIN_TOKEN = '';
    await expect(runYoutubeSync({}, deps())).rejects.toThrow(/DIRECTUS_ADMIN_TOKEN/);
    expect(yt.calls).toEqual({ channels: 0, playlistItems: 0, videos: 0 });
  });

  it('falla sin llamar a YouTube ni escribir si falta la configuración de YouTube', async () => {
    process.env.YOUTUBE_API_KEY = '';
    await expect(runYoutubeSync({}, deps())).rejects.toThrow(/YOUTUBE_API_KEY/);
    expect(yt.calls).toEqual({ channels: 0, playlistItems: 0, videos: 0 });
    expect(dx.writes).toHaveLength(0);
  });

  it('un error persistente de YouTube aborta sin escribir y sin anular vistas ni duración', async () => {
    yt.failures.push({ endpoint: 'videos', status: 500, times: 3 });
    await expect(runYoutubeSync({}, deps())).rejects.toThrow(/YouTube videos error: 500/);
    expect(dx.writes).toHaveLength(0);
    expect(dx.items.get('s1')).toMatchObject({ title: OLD_TITLE, view_count: 120, duration_seconds: 6967 });
  });

  it('no reintenta un 403 de cuota y no expone la clave en el error', async () => {
    yt.failures.push({ endpoint: 'playlistItems', status: 403, times: 1 });
    const error = await runYoutubeSync({}, deps()).catch((e: Error) => e);
    expect(String(error)).toMatch(/YouTube playlistItems error: 403/);
    expect(String(error)).not.toContain('test-key');
    expect(yt.calls.playlistItems).toBe(1);
    expect(dx.writes).toHaveLength(0);
  });

  it('reintenta un error transitorio 503 y completa la sincronización', async () => {
    yt.failures.push({ endpoint: 'playlistItems', status: 503, times: 1 });
    const result = await runYoutubeSync({}, deps());
    expect(result.updated).toBe(1);
    expect(yt.calls.playlistItems).toBe(2);
  });

  it('si falla la carga de sermones en Directus no escribe nada (evita duplicados)', async () => {
    dx.state.failReads = 1;
    await expect(runYoutubeSync({}, deps())).rejects.toThrow(/Directus/);
    expect(dx.writes).toHaveLength(0);
  });

  it('un fallo de escritura no impide las demás y la siguiente ejecución converge', async () => {
    dx.failWritesFor.add('kcylErKffEM');
    const first = await runYoutubeSync({}, deps());
    expect(first.errors).toEqual([expect.stringContaining('kcylErKffEM')]);
    expect(first.inserted).toBe(1);
    expect(first.changes.map(c => c.youtube_id)).toEqual(['NEWvideo001']);
    expect(first.titleChanges).toEqual([]);
    expect(dx.items.get('s1')?.title).toBe(OLD_TITLE);

    dx.failWritesFor.clear();
    const second = await runYoutubeSync({}, deps());
    expect(second).toMatchObject({ updated: 1, inserted: 0, errors: [] });
    expect(second.titleChanges.map(c => c.youtube_id)).toEqual(['kcylErKffEM']);
    expect(dx.items.get('s1')?.title).toBe(NEW_TITLE);
  });

  it('marca unavailable solo los videos que videos.list confirma ausentes, sin tocar visibility', async () => {
    dx.items.set('s3', sermonRow({ id: 's3', youtube_id: 'FuM-yQOXU1o' }));
    dx.items.set('s4', sermonRow({ id: 's4', youtube_id: 'unlisted001' }));
    yt.videos.set('unlisted001', ytVideo({ id: 'unlisted001', listed: false }));
    const result = await runYoutubeSync({}, deps());
    expect(result.unavailable).toBe(1);
    expect(result.unavailableIds).toEqual(['FuM-yQOXU1o']);
    expect(dx.items.get('s3')).toMatchObject({ youtube_status: 'unavailable', visibility: 'public', title: 'Servicio General' });
    expect(dx.items.get('s4')?.youtube_status).toBe('available');
  });

  it('si la verificación de ausentes falla no marca ninguno pero aplica los títulos', async () => {
    dx.items.set('s3', sermonRow({ id: 's3', youtube_id: 'FuM-yQOXU1o' }));
    yt.failures.push({ endpoint: 'videos', part: 'id', status: 500, times: 3 });
    const result = await runYoutubeSync({}, deps());
    expect(result.unavailable).toBe(0);
    expect(result.unavailableSkipped).toBe('verification_failed');
    expect(dx.items.get('s3')?.youtube_status).toBe('available');
    expect(dx.items.get('s1')?.title).toBe(NEW_TITLE);
  });

  it('frena el marcado ante una indisponibilidad masiva', async () => {
    for (let i = 0; i < 11; i++) dx.items.set(`m${i}`, sermonRow({ id: `m${i}`, youtube_id: `missing${String(i).padStart(4, '0')}` }));
    const result = await runYoutubeSync({}, deps());
    expect(result.unavailable).toBe(0);
    expect(result.unavailableSkipped).toBe('circuit_breaker');
    expect(result.errors).toContain('unavailable_circuit_breaker');
    expect([...(result.unavailableCandidates ?? [])].sort()).toEqual(Array.from({ length: 11 }, (_, i) => `missing${String(i).padStart(4, '0')}`));
    expect([...dx.items.values()].filter(r => r.youtube_status === 'unavailable')).toHaveLength(0);
  });

  it('recupera un sermón unavailable cuando el video vuelve a estar disponible', async () => {
    dx.items.set('s2', { ...dx.items.get('s2')!, youtube_status: 'unavailable' });
    const result = await runYoutubeSync({}, deps());
    expect(result.restored).toBe(1);
    expect(dx.items.get('s2')?.youtube_status).toBe('available');
  });

  it('dryRun calcula el plan completo sin escribir', async () => {
    dx.items.set('s3', sermonRow({ id: 's3', youtube_id: 'FuM-yQOXU1o' }));
    const result = await runYoutubeSync({ dryRun: true }, deps());
    expect(dx.writes).toHaveLength(0);
    expect(result).toMatchObject({ dryRun: true, inserted: 1, updated: 1, unavailable: 1, unavailableIds: ['FuM-yQOXU1o'] });
    expect(result.titleChanges.map(c => c.youtube_id)).toEqual(['kcylErKffEM']);
    expect(result.changes).toEqual([
      { youtube_id: 'kcylErKffEM', action: 'update', fields: ['raw_youtube_title', 'title'] },
      { youtube_id: 'NEWvideo001', action: 'insert', fields: [] },
      { youtube_id: 'FuM-yQOXU1o', action: 'unavailable', fields: ['youtube_status'] },
    ]);
  });

  it('comprueba el lock antes de cada escritura y se detiene al perderlo', async () => {
    let checks = 0;
    const ensureLock = async () => ++checks === 1;
    const result = await runYoutubeSync({ ensureLock }, deps());
    expect(dx.writes).toHaveLength(1);
    expect(checks).toBe(2);
    expect(result.lockLost).toBe(true);
    expect(result.errors).toContain('lock_lost');
    expect(result.changes.map(c => c.youtube_id)).toEqual(['kcylErKffEM']);
  });

  it('sin la propiedad del lock no escribe nada ni reporta cambios', async () => {
    const result = await runYoutubeSync({ ensureLock: async () => false }, deps());
    expect(dx.writes).toHaveLength(0);
    expect(result).toMatchObject({ lockLost: true, updated: 0, inserted: 0, titleChanges: [], changes: [] });
  });
});
