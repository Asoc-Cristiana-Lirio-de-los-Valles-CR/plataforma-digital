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

  it('una protección no informa nada si YouTube propone el mismo valor', () => {
    const video = { ...youtubeD0hl, publishedAt: '2026-10-11T20:00:00Z' };
    expect(planSermonUpdate(d0hl, video, SYNCED_AT)?.protectedFields).toEqual([]);
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
