import { describe, it, expect, vi } from 'vitest';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

process.env.YOUTUBE_API_KEY = 'test-key';
process.env.YOUTUBE_CHANNEL_ID = 'UCtest';
process.env.DIRECTUS_URL = 'http://directus:8055';
process.env.DIRECTUS_ADMIN_TOKEN = 'admin-token';

import {
  suggestFromTitle,
  buildThumbnailUrl,
  planSermonUpdate,
  type ExistingSermon,
  type YouTubeVideo,
} from '../../src/lib/sync-youtube';

const SYNCED_AT = '2026-10-21T15:00:00.000Z';

// Datos reales de producción (2026-10-21): kcylErKffEM fue importado con el título del servicio anterior.
const staleKcyl: ExistingSermon = {
  id: 'sermon-kcyl',
  youtube_id: 'kcylErKffEM',
  title: 'Servicio General 11 de Octubre de 2026 - Veneno en la Olla.',
  raw_youtube_title: 'Servicio General 11 de Octubre de 2026 - Veneno en la Olla.',
  youtube_status: 'available',
  youtube_published_at: '2026-10-18T15:21:56.000Z',
  sermon_date: '2026-10-18',
  duration_seconds: 6967,
  view_count: 120,
  sync_locked_fields: null,
};

const youtubeKcyl: YouTubeVideo = {
  id: 'kcylErKffEM',
  title: 'Servicio General 17 de Octubre de 2026 - La libertad que nace del perdón. ',
  description: 'Gracias por acompañarnos en este servicio',
  publishedAt: '2026-10-18T15:21:56Z',
  durationSeconds: 6967,
  viewCount: 130,
};

describe('planSermonUpdate', () => {
  it('actualiza title y raw_youtube_title cuando el título no fue editado y YouTube lo cambió', () => {
    const plan = planSermonUpdate(staleKcyl, youtubeKcyl, SYNCED_AT);
    expect(plan?.patch).toEqual({
      title: 'Servicio General 17 de Octubre de 2026 - La libertad que nace del perdón.',
      raw_youtube_title: 'Servicio General 17 de Octubre de 2026 - La libertad que nace del perdón.',
      view_count: 130,
      last_synced_at: SYNCED_AT,
    });
    expect(plan?.titleChange).toEqual({
      youtube_id: 'kcylErKffEM',
      from: 'Servicio General 11 de Octubre de 2026 - Veneno en la Olla.',
      to: 'Servicio General 17 de Octubre de 2026 - La libertad que nace del perdón.',
      editorial: false,
    });
  });

  it('conserva el título editorial y solo registra el último título de YouTube en raw_youtube_title', () => {
    const edited = { ...staleKcyl, title: 'La libertad que nace del perdón (Pastor invitado)' };
    const plan = planSermonUpdate(edited, youtubeKcyl, SYNCED_AT);
    expect(plan?.patch).toEqual({
      raw_youtube_title: 'Servicio General 17 de Octubre de 2026 - La libertad que nace del perdón.',
      view_count: 130,
      last_synced_at: SYNCED_AT,
    });
    expect(plan?.titleChange?.editorial).toBe(true);
  });

  it('detecta cambios de espacios internos como el caso real 6hr2-CqUGE8', () => {
    const existing: ExistingSermon = {
      ...staleKcyl,
      youtube_id: '6hr2-CqUGE8',
      title: 'Servicio General  27de Sep de 2026 - El Cristiano y la Culpa.',
      raw_youtube_title: 'Servicio General  27de Sep de 2026 - El Cristiano y la Culpa.',
    };
    const video = { ...youtubeKcyl, id: '6hr2-CqUGE8', title: 'Servicio General 27 de Sep de 2026 - El Cristiano y la Culpa.' };
    expect(planSermonUpdate(existing, video, SYNCED_AT)?.patch.title).toBe(
      'Servicio General 27 de Sep de 2026 - El Cristiano y la Culpa.'
    );
  });

  it('sigue la nueva fecha de publicación de YouTube (caso real EZe2JywDzDc)', () => {
    const existing: ExistingSermon = {
      ...staleKcyl,
      youtube_id: 'EZe2JywDzDc',
      title: 'Servicio General  27de Sep de 2026 - El Cristiano y la Culpa.',
      raw_youtube_title: 'Servicio General  27de Sep de 2026 - El Cristiano y la Culpa.',
      youtube_published_at: '2026-09-27T18:00:54.000Z',
      sermon_date: '2026-09-27',
      duration_seconds: 6244,
    };
    const video: YouTubeVideo = {
      id: 'EZe2JywDzDc',
      title: 'Servicio General  3 de Octubre de 2026 - No nos vamos a familiarizar con la enfermedad',
      description: '',
      publishedAt: '2026-10-04T18:36:28Z',
      durationSeconds: 6244,
      viewCount: 120,
    };
    expect(planSermonUpdate(existing, video, SYNCED_AT)?.patch).toEqual({
      title: 'Servicio General  3 de Octubre de 2026 - No nos vamos a familiarizar con la enfermedad',
      raw_youtube_title: 'Servicio General  3 de Octubre de 2026 - No nos vamos a familiarizar con la enfermedad',
      youtube_published_at: '2026-10-04T18:36:28Z',
      sermon_date: '2026-10-04',
      view_count: 120,
      last_synced_at: SYNCED_AT,
    });
  });

  it('no toca sermon_date si un editor lo cambió a mano', () => {
    const existing = { ...staleKcyl, youtube_published_at: '2026-09-27T18:00:54.000Z', sermon_date: '2026-10-03' };
    const video = { ...youtubeKcyl, title: staleKcyl.title as string, publishedAt: '2026-10-04T18:36:28Z' };
    expect(planSermonUpdate(existing, video, SYNCED_AT)?.patch).toEqual({
      youtube_published_at: '2026-10-04T18:36:28Z',
      view_count: 130,
      last_synced_at: SYNCED_AT,
    });
  });

  it('devuelve null cuando nada relevante cambió (mismo instante con otro formato)', () => {
    const video = { ...youtubeKcyl, title: staleKcyl.title as string, viewCount: 120 };
    expect(planSermonUpdate(staleKcyl, video, SYNCED_AT)).toBeNull();
  });

  it('devuelve null si la única diferencia del título son espacios en los extremos', () => {
    const video = { ...youtubeKcyl, title: `  ${staleKcyl.title} `, viewCount: 120 };
    expect(planSermonUpdate(staleKcyl, video, SYNCED_AT)).toBeNull();
  });

  it('no escribe solo porque cambió el conteo de vistas', () => {
    const video = { ...youtubeKcyl, title: staleKcyl.title as string, viewCount: 9999 };
    expect(planSermonUpdate(staleKcyl, video, SYNCED_AT)).toBeNull();
  });

  it('no borra la duración guardada cuando YouTube no la informa', () => {
    const video = { ...youtubeKcyl, title: staleKcyl.title as string, durationSeconds: null };
    expect(planSermonUpdate(staleKcyl, video, SYNCED_AT)).toBeNull();
    const zero = { ...youtubeKcyl, title: staleKcyl.title as string, durationSeconds: 0 };
    expect(planSermonUpdate(staleKcyl, zero, SYNCED_AT)).toBeNull();
  });

  it('actualiza la duración cuando YouTube termina de procesar la transmisión', () => {
    const existing = { ...staleKcyl, duration_seconds: null };
    const video = { ...youtubeKcyl, title: staleKcyl.title as string };
    expect(planSermonUpdate(existing, video, SYNCED_AT)?.patch).toEqual({
      duration_seconds: 6967,
      view_count: 130,
      last_synced_at: SYNCED_AT,
    });
  });

  it('recupera un sermón marcado unavailable cuando el video vuelve a YouTube', () => {
    const existing = { ...staleKcyl, youtube_status: 'unavailable' as const };
    const video = { ...youtubeKcyl, title: staleKcyl.title as string };
    expect(planSermonUpdate(existing, video, SYNCED_AT)?.patch).toEqual({
      youtube_status: 'available',
      view_count: 130,
      last_synced_at: SYNCED_AT,
    });
  });

  it('nunca incluye campos editoriales en el parche', () => {
    const plan = planSermonUpdate({ ...staleKcyl, sermon_date: '2026-10-18', duration_seconds: 1 }, youtubeKcyl, SYNCED_AT);
    const editorialFields = ['description', 'slug', 'preacher', 'series', 'tags', 'visibility', 'featured',
      'manual_thumbnail', 'thumbnail_url', 'suggested_series', 'suggested_preacher', 'imported_at'];
    for (const field of editorialFields) expect(plan?.patch).not.toHaveProperty(field);
  });

  it('sin cambios protegidos informa protectedFields vacío', () => {
    expect(planSermonUpdate(staleKcyl, youtubeKcyl, SYNCED_AT)?.protectedFields).toEqual([]);
  });
});

// Caso real de producción (2026-10-21): el servicio fue el 11 de octubre y YouTube terminó de
// publicar la transmisión a las 00:28 del 12 (hora de Costa Rica), 06:28 UTC.
describe('planSermonUpdate con campos protegidos (sync_locked_fields)', () => {
  const d0hl: ExistingSermon = {
    id: 'sermon-d0hl',
    youtube_id: 'D0hL4Ax6juU',
    title: 'Servicio General 10 de Octubre de 2026 - Un diagnóstico que trae vida',
    raw_youtube_title: 'Servicio General 10 de Octubre de 2026 - Un diagnóstico que trae vida',
    youtube_status: 'available',
    youtube_published_at: '2026-10-11T15:09:53.000Z',
    sermon_date: '2026-10-11',
    duration_seconds: 8356,
    view_count: 200,
    sync_locked_fields: ['sermon_date'],
  };
  const youtubeD0hl: YouTubeVideo = {
    id: 'D0hL4Ax6juU',
    title: 'Servicio General 11 de Octubre de 2026 - Veneno en la Olla.',
    description: '',
    publishedAt: '2026-10-12T06:28:31Z',
    durationSeconds: 8356,
    viewCount: 210,
  };

  it('sin protección, la fecha seguiría a YouTube y pasaría al 12 de octubre', () => {
    const plan = planSermonUpdate({ ...d0hl, sync_locked_fields: null }, youtubeD0hl, SYNCED_AT);
    expect(plan?.patch.sermon_date).toBe('2026-10-12');
  });

  it('D0hL4Ax6juU conserva el 11 de octubre y actualiza título y metadatos de YouTube', () => {
    const plan = planSermonUpdate(d0hl, youtubeD0hl, SYNCED_AT);
    expect(plan?.patch).toEqual({
      title: 'Servicio General 11 de Octubre de 2026 - Veneno en la Olla.',
      raw_youtube_title: 'Servicio General 11 de Octubre de 2026 - Veneno en la Olla.',
      youtube_published_at: '2026-10-12T06:28:31Z',
      view_count: 210,
      last_synced_at: SYNCED_AT,
    });
    expect(plan?.protectedFields).toEqual([
      { youtube_id: 'D0hL4Ax6juU', field: 'sermon_date', kept: '2026-10-11', youtube: '2026-10-12', reason: 'sync_locked_fields' },
    ]);
  });

  it('una sincronización posterior no cambia la fecha protegida ni escribe nada', () => {
    const afterFirstSync: ExistingSermon = {
      ...d0hl,
      title: youtubeD0hl.title,
      raw_youtube_title: youtubeD0hl.title,
      youtube_published_at: '2026-10-12T06:28:31.000Z',
    };
    expect(planSermonUpdate(afterFirstSync, youtubeD0hl, SYNCED_AT)).toBeNull();
  });

  it('si YouTube vuelve a mover la publicación, la fecha protegida sigue intacta', () => {
    const afterFirstSync: ExistingSermon = { ...d0hl, title: youtubeD0hl.title, raw_youtube_title: youtubeD0hl.title, youtube_published_at: '2026-10-12T06:28:31.000Z' };
    const moved = { ...youtubeD0hl, publishedAt: '2026-10-13T10:00:00Z' };
    const plan = planSermonUpdate(afterFirstSync, moved, SYNCED_AT);
    expect(plan?.patch).not.toHaveProperty('sermon_date');
    expect(plan?.patch.youtube_published_at).toBe('2026-10-13T10:00:00Z');
    expect(plan?.protectedFields).toEqual([
      { youtube_id: 'D0hL4Ax6juU', field: 'sermon_date', kept: '2026-10-11', youtube: '2026-10-13', reason: 'sync_locked_fields' },
    ]);
  });

  it('un título protegido no se sobrescribe aunque nunca se haya editado; raw_youtube_title sí se actualiza', () => {
    const plan = planSermonUpdate({ ...staleKcyl, sync_locked_fields: ['title'] }, youtubeKcyl, SYNCED_AT);
    expect(plan?.patch).toEqual({
      raw_youtube_title: 'Servicio General 17 de Octubre de 2026 - La libertad que nace del perdón.',
      view_count: 130,
      last_synced_at: SYNCED_AT,
    });
    expect(plan?.titleChange?.editorial).toBe(true);
    expect(plan?.protectedFields).toEqual([{
      youtube_id: 'kcylErKffEM', field: 'title', reason: 'sync_locked_fields',
      kept: 'Servicio General 11 de Octubre de 2026 - Veneno en la Olla.',
      youtube: 'Servicio General 17 de Octubre de 2026 - La libertad que nace del perdón.',
    }]);
  });

  it('informa como edición manual la fecha y el título personalizados sin protección explícita', () => {
    const edited: ExistingSermon = {
      ...staleKcyl, title: 'Título editorial', youtube_published_at: '2026-09-27T18:00:54.000Z', sermon_date: '2026-10-03',
    };
    const video = { ...youtubeKcyl, publishedAt: '2026-10-04T18:36:28Z' };
    const plan = planSermonUpdate(edited, video, SYNCED_AT);
    expect(plan?.patch).not.toHaveProperty('sermon_date');
    expect(plan?.patch).not.toHaveProperty('title');
    expect(plan?.protectedFields).toEqual([
      { youtube_id: 'kcylErKffEM', field: 'title', kept: 'Título editorial', youtube: 'Servicio General 17 de Octubre de 2026 - La libertad que nace del perdón.', reason: 'manual_edit' },
      { youtube_id: 'kcylErKffEM', field: 'sermon_date', kept: '2026-10-03', youtube: '2026-10-04', reason: 'manual_edit' },
    ]);
  });

  it('quitar la protección no devuelve la fecha a YouTube: queda como edición manual', () => {
    const unlockedAfterSync: ExistingSermon = {
      ...d0hl, title: youtubeD0hl.title, raw_youtube_title: youtubeD0hl.title,
      youtube_published_at: '2026-10-12T06:28:31.000Z', sync_locked_fields: null,
    };
    const plan = planSermonUpdate(unlockedAfterSync, { ...youtubeD0hl, publishedAt: '2026-10-13T10:00:00Z' }, SYNCED_AT);
    expect(plan?.patch).not.toHaveProperty('sermon_date');
    expect(plan?.protectedFields).toEqual([
      { youtube_id: 'D0hL4Ax6juU', field: 'sermon_date', kept: '2026-10-11', youtube: '2026-10-13', reason: 'manual_edit' },
    ]);
  });

  it('un sermón protegido que vuelve a estar disponible se recupera sin tocar su fecha', () => {
    const plan = planSermonUpdate({ ...d0hl, youtube_status: 'unavailable' }, youtubeD0hl, SYNCED_AT);
    expect(plan?.patch).toMatchObject({ youtube_status: 'available', youtube_published_at: '2026-10-12T06:28:31Z' });
    expect(plan?.patch).not.toHaveProperty('sermon_date');
    expect(plan?.protectedFields.map(p => p.field)).toEqual(['sermon_date']);
  });

  it('una protección no informa nada si YouTube propone el mismo valor', () => {
    const video = { ...youtubeD0hl, publishedAt: '2026-10-11T20:00:00Z' };
    expect(planSermonUpdate(d0hl, video, SYNCED_AT)?.protectedFields).toEqual([]);
  });

  it('un título protegido no se informa si YouTube propone el mismo título', () => {
    const editorial = 'Servicio General 17 de Octubre de 2026 - La libertad que nace del perdón.';
    const plan = planSermonUpdate({ ...staleKcyl, title: editorial, sync_locked_fields: ['title'] }, youtubeKcyl, SYNCED_AT);
    expect(plan?.patch).toMatchObject({ raw_youtube_title: editorial });
    expect(plan?.patch).not.toHaveProperty('title');
    expect(plan?.protectedFields).toEqual([]);
  });
});

// Producción y YouTube, 2026-10-21 (hora de Costa Rica). La fecha editorial es el día del inicio de la transmisión en hora de
// Costa Rica y coincide con la del título de YouTube; la sync, en cambio, deriva sermon_date del día UTC
// de publishedAt, que para un servicio de la tarde o un video procesado de madrugada cae al día siguiente.
describe('fechas editoriales de la Biblioteca (casos reales, set-date + sync_locked_fields)', () => {
  const casos = [
    { youtube_id: 'EZe2JywDzDc', guardada: '2026-09-27', editorial: '2026-10-03', publicadoGuardado: '2026-09-27T18:00:54.000Z',
      tituloGuardado: 'Servicio General  27de Sep de 2026 - El Cristiano y la Culpa.',
      tituloYoutube: 'Servicio General  3 de Octubre de 2026 - No nos vamos a familiarizar con la enfermedad', publishedAt: '2026-10-04T18:36:28Z' },
    { youtube_id: 'kcylErKffEM', guardada: '2026-10-18', editorial: '2026-10-17', publicadoGuardado: '2026-10-18T02:39:23.000Z',
      tituloGuardado: 'Servicio General 11 de Octubre de 2026 - Veneno en la Olla.',
      tituloYoutube: 'Servicio General 17 de Octubre de 2026 - La libertad que nace del perdón. ', publishedAt: '2026-10-18T15:21:56Z' },
    { youtube_id: 'ThtKPaa4WvI', guardada: '2026-10-05', editorial: '2026-10-04', publicadoGuardado: '2026-10-05T07:03:44.000Z',
      tituloGuardado: 'Servicio General  3 de Octubre de 2026 - No nos vamos a familiarizar con la enfermedad',
      tituloYoutube: 'Servicio General 4 de Octubre de 2026 ', publishedAt: '2026-10-05T07:03:44Z' },
    { youtube_id: '6hr2-CqUGE8', guardada: '2026-09-28', editorial: '2026-09-27', publicadoGuardado: '2026-09-28T09:00:15.000Z',
      tituloGuardado: 'Servicio General  27de Sep de 2026 - El Cristiano y la Culpa.',
      tituloYoutube: 'Servicio General 27 de Sep de 2026 - El Cristiano y la Culpa.', publishedAt: '2026-09-28T09:00:15Z' },
    { youtube_id: 'D0hL4Ax6juU', guardada: '2026-10-11', editorial: '2026-10-11', publicadoGuardado: '2026-10-11T15:09:53.000Z',
      tituloGuardado: 'Servicio General 10 de Octubre de 2026 - Un diagnóstico que trae vida',
      tituloYoutube: 'Servicio General 11 de Octubre de 2026 - Veneno en la Olla.', publishedAt: '2026-10-12T06:28:31Z' },
  ];
  const registro = (c: (typeof casos)[number], over: Partial<ExistingSermon> = {}): ExistingSermon => ({
    id: `sermon-${c.youtube_id}`, youtube_id: c.youtube_id, title: c.tituloGuardado, raw_youtube_title: c.tituloGuardado,
    youtube_status: 'available', youtube_published_at: c.publicadoGuardado, sermon_date: c.guardada,
    duration_seconds: 6000, view_count: 100, sync_locked_fields: null, ...over,
  });
  const video = (c: (typeof casos)[number]): YouTubeVideo => ({
    id: c.youtube_id, title: c.tituloYoutube, description: '', publishedAt: c.publishedAt, durationSeconds: 6000, viewCount: 100,
  });
  const diaUtc = (iso: string) => iso.slice(0, 10);

  it('sin corregir, la sync movería EZe2JywDzDc al 4 de octubre y D0hL4Ax6juU al 12, y dejaría las otras tres un día después', () => {
    const propuesta = Object.fromEntries(casos.map(c => [c.youtube_id, planSermonUpdate(registro(c), video(c), SYNCED_AT)?.patch.sermon_date ?? 'sin cambio']));
    expect(propuesta).toEqual({
      EZe2JywDzDc: '2026-10-04', kcylErKffEM: 'sin cambio', ThtKPaa4WvI: 'sin cambio', '6hr2-CqUGE8': 'sin cambio', D0hL4Ax6juU: '2026-10-12',
    });
  });

  // La sync solo reevalúa la fecha cuando YouTube cambia publishedAt (EZe2, kcyl y D0hL); en ThtK y 6hr2
  // no la toca, y la protección cubre el día en que YouTube la mueva.
  it('con la fecha editorial fijada y protegida, la sync corrige el título y no toca ninguna fecha', () => {
    for (const c of casos) {
      const plan = planSermonUpdate(registro(c, { sermon_date: c.editorial, sync_locked_fields: ['sermon_date'] }), video(c), SYNCED_AT);
      expect(plan?.patch, c.youtube_id).not.toHaveProperty('sermon_date');
      expect(plan?.patch.title, c.youtube_id).toBe(c.tituloYoutube.trim());
      const publicacionCambia = Date.parse(c.publishedAt) !== Date.parse(c.publicadoGuardado);
      expect(plan?.protectedFields, c.youtube_id).toEqual(publicacionCambia
        ? [{ youtube_id: c.youtube_id, field: 'sermon_date', kept: c.editorial, youtube: diaUtc(c.publishedAt), reason: 'sync_locked_fields' }]
        : []);
    }
  });

  it('si YouTube mueve la publicación más adelante, las cinco fechas protegidas siguen intactas', () => {
    for (const c of casos) {
      const sincronizado = registro(c, {
        sermon_date: c.editorial, sync_locked_fields: ['sermon_date'],
        title: c.tituloYoutube.trim(), raw_youtube_title: c.tituloYoutube.trim(), youtube_published_at: c.publishedAt,
      });
      const movido = { ...video(c), publishedAt: '2026-11-01T12:00:00Z' };
      expect(planSermonUpdate(sincronizado, movido, SYNCED_AT)?.patch, c.youtube_id).not.toHaveProperty('sermon_date');
    }
  });

  it('después de esa sincronización, la siguiente no escribe nada', () => {
    for (const c of casos) {
      const sincronizado = registro(c, {
        sermon_date: c.editorial, sync_locked_fields: ['sermon_date'],
        title: c.tituloYoutube.trim(), raw_youtube_title: c.tituloYoutube.trim(), youtube_published_at: c.publishedAt,
      });
      expect(planSermonUpdate(sincronizado, video(c), SYNCED_AT), c.youtube_id).toBeNull();
    }
  });

  it('sin la protección, las cuatro fechas corregidas se conservan como edición manual, pero D0hL4Ax6juU no: necesita el lock', () => {
    const conservadas = casos.filter(c => !('sermon_date' in (planSermonUpdate(registro(c, { sermon_date: c.editorial }), video(c), SYNCED_AT)?.patch ?? {})));
    expect(conservadas.map(c => c.youtube_id)).toEqual(['EZe2JywDzDc', 'kcylErKffEM', 'ThtKPaa4WvI', '6hr2-CqUGE8']);
  });
});

describe('suggestFromTitle', () => {
  it('extracts series from known pattern', () => {
    const result = suggestFromTitle('Serie Romanos #3 — El llamado');
    expect(result.suggestedSeries).toBe('Romanos');
  });

  it('returns empty strings for generic titles', () => {
    const result = suggestFromTitle('Culto Domingo AM');
    expect(result.suggestedSeries).toBe('');
    expect(result.suggestedPreacher).toBe('');
  });

  it('extracts year-based series', () => {
    const result = suggestFromTitle('AVIVAMIENTO 2023 DIA 2');
    expect(result.suggestedSeries).toContain('2023');
  });
});

describe('buildThumbnailUrl', () => {
  it('builds maxresdefault URL from youtube_id', () => {
    const url = buildThumbnailUrl('dQw4w9WgXcQ');
    expect(url).toBe('https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg');
  });
});
