// Administración del Directus AISLADO (stack lirio-e2e). Toda llamada pasa antes por la guarda.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { assertIsolatedDirectusState, assertIsolatedE2E, isolatedConfigFromEnv, E2E_SENTINEL } from './guard';

const MIGRATION_SCRIPT = path.resolve(__dirname, '../../../../scripts/add-sermons-sync-locked-fields.mjs');

export const E2E_ADMIN_TOKEN = process.env.E2E_DIRECTUS_TOKEN ?? 'e2e-admin-token-solo-pruebas';
export const E2E_SYNC_SECRET = process.env.E2E_SYNC_SECRET ?? 'e2e-sync-secret-solo-pruebas';

export function isolatedConfig() {
  const config = isolatedConfigFromEnv();
  assertIsolatedE2E(config);
  return config;
}

export async function dx(path: string, init: RequestInit = {}): Promise<Response> {
  const { directusUrl } = isolatedConfig();
  return fetch(`${directusUrl}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${E2E_ADMIN_TOKEN}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  });
}

async function dxOk<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await dx(path, init);
  if (!res.ok) throw new Error(`Directus aislado ${init.method ?? 'GET'} ${path} → ${res.status}: ${await res.text()}`);
  return (res.status === 204 ? null : ((await res.json()) as { data: T }).data) as T;
}

const uuidPk = { field: 'id', type: 'uuid', meta: { hidden: true, readonly: true, special: ['uuid'] }, schema: { is_primary_key: true, length: 36, has_auto_increment: false } };
const intPk = { field: 'id', type: 'integer', meta: { hidden: true }, schema: { is_primary_key: true, has_auto_increment: true } };

async function createCollection(collection: string, fields: unknown[]) {
  await dxOk('/collections', { method: 'POST', body: JSON.stringify({ collection, meta: {}, schema: {}, fields }) });
}

async function publicPolicyId(): Promise<string> {
  const access = await dxOk<{ policy: string }[]>('/access?filter[role][_null]=true&filter[user][_null]=true&fields=policy');
  if (!access[0]?.policy) throw new Error('No se encontró la política pública del Directus aislado');
  return access[0].policy;
}

// Falla cerrado: solo un Directus que acepta el token e2e y no tiene la colección cuenta como vacío.
async function sermonCount(): Promise<number> {
  const me = await dx('/users/me?fields=id');
  if (!me.ok) throw new Error(`E2E aislado bloqueado: el Directus destino rechaza el token e2e (${me.status})`);
  if (!(await dx('/collections/sermons')).ok) return 0;
  const res = await dx('/items/sermons?aggregate[count]=*');
  if (!res.ok) throw new Error(`E2E aislado bloqueado: no se pudo contar sermones (${res.status})`);
  const data = ((await res.json()) as { data: { count: number | string }[] }).data;
  return Number(data[0]?.count ?? 0);
}

// Ejecuta la migración igual que en producción (script por stdin a `node --input-type=module -`),
// apuntada al Directus aislado tras pasar la guarda.
function runMigration(...args: string[]): unknown {
  const res = spawnSync(process.execPath, ['--input-type=module', '-', ...args], {
    input: readFileSync(MIGRATION_SCRIPT),
    env: { ...process.env, DIRECTUS_URL: isolatedConfig().directusUrl, DIRECTUS_ADMIN_TOKEN: E2E_ADMIN_TOKEN },
    encoding: 'utf8',
  });
  if (res.status !== 0) throw new Error(`Migración ${args.join(' ')} falló: ${res.stderr}`);
  return (JSON.parse(res.stdout.trim()) as { result: unknown }).result;
}

export function sermonsMigration() {
  return {
    check: async () => runMigration('check'),
    apply: async () => runMigration('apply'),
    revert: async () => runMigration('revert', '--yes'),
    lock: async (youtubeId: string, field: string) => runMigration('lock', youtubeId, field),
  };
}

/** Verifica que el destino es el stack aislado, crea el esquema de la Biblioteca y aplica la migración (idempotente). */
export async function prepareIsolatedDirectus(): Promise<void> {
  const { directusUrl } = isolatedConfig();
  const info = (await (await fetch(`${directusUrl}/server/info`)).json()) as { data?: { project?: { project_name?: string } } };
  assertIsolatedDirectusState({ projectName: info.data?.project?.project_name ?? null, sermonCount: await sermonCount() });
  await dxOk('/settings', { method: 'PATCH', body: JSON.stringify({ project_name: E2E_SENTINEL }) });

  if (!(await dx('/collections/sermons')).ok) await createLibrarySchema();
  await sermonsMigration().apply();
}

// Esquema de la Biblioteca tal como existe hoy en producción (sin sync_locked_fields, que llega por migración).
async function createLibrarySchema(): Promise<void> {

  await createCollection('preachers', [
    uuidPk,
    { field: 'name', type: 'string', schema: { is_nullable: false } },
    { field: 'slug', type: 'string', schema: { is_nullable: false, is_unique: true } },
    { field: 'bio', type: 'text' },
    { field: 'photo', type: 'uuid' },
    { field: 'active', type: 'boolean', schema: { default_value: true } },
  ]);
  await createCollection('sermon_series', [
    uuidPk,
    { field: 'title', type: 'string', schema: { is_nullable: false } },
    { field: 'slug', type: 'string', schema: { is_nullable: false, is_unique: true } },
    { field: 'description', type: 'text' },
    { field: 'cover_image', type: 'uuid' },
    { field: 'year', type: 'integer' },
    { field: 'sort_order', type: 'integer', schema: { default_value: 0 } },
    { field: 'active', type: 'boolean', schema: { default_value: true } },
  ]);
  await createCollection('sermon_tags', [
    uuidPk,
    { field: 'name', type: 'string', schema: { is_nullable: false } },
    { field: 'slug', type: 'string', schema: { is_nullable: false, is_unique: true } },
  ]);
  await createCollection('sermons', [
    uuidPk,
    { field: 'title', type: 'string', schema: { is_nullable: false } },
    { field: 'slug', type: 'string', schema: { is_nullable: false, is_unique: true } },
    { field: 'youtube_id', type: 'string', schema: { is_nullable: false, is_unique: true } },
    { field: 'youtube_status', type: 'string', schema: { default_value: 'available' } },
    { field: 'visibility', type: 'string', schema: { default_value: 'public' } },
    { field: 'featured', type: 'boolean', schema: { default_value: false } },
    { field: 'description', type: 'text' },
    { field: 'sermon_date', type: 'date' },
    { field: 'duration_seconds', type: 'integer' },
    { field: 'thumbnail_url', type: 'string', schema: { is_nullable: false } },
    { field: 'manual_thumbnail', type: 'uuid' },
    { field: 'suggested_preacher', type: 'string' },
    { field: 'suggested_series', type: 'string' },
    { field: 'raw_youtube_title', type: 'string', schema: { is_nullable: false } },
    { field: 'imported_at', type: 'dateTime', schema: { is_nullable: false } },
    { field: 'last_synced_at', type: 'dateTime' },
    { field: 'youtube_published_at', type: 'dateTime' },
    { field: 'view_count', type: 'integer', schema: { default_value: 0 } },
    { field: 'preacher', type: 'uuid', meta: { special: ['m2o'] } },
    { field: 'series', type: 'uuid', meta: { special: ['m2o'] } },
  ]);
  await createCollection('sermons_sermon_tags', [
    intPk,
    { field: 'sermons_id', type: 'uuid' },
    { field: 'sermon_tags_id', type: 'uuid' },
  ]);
  await createCollection('activity_logs', [
    intPk,
    { field: 'action', type: 'string' },
    { field: 'date_created', type: 'timestamp', meta: { special: ['date-created'] } },
  ]);
  // Directus 11 rechaza campos json sin meta dentro de POST /collections; por /fields sí los acepta.
  await dxOk('/fields/activity_logs', { method: 'POST', body: JSON.stringify({ field: 'metadata', type: 'json' }) });

  await dxOk('/relations', { method: 'POST', body: JSON.stringify({ collection: 'sermons', field: 'preacher', related_collection: 'preachers' }) });
  await dxOk('/relations', { method: 'POST', body: JSON.stringify({ collection: 'sermons', field: 'series', related_collection: 'sermon_series' }) });
  await dxOk('/fields/sermons', { method: 'POST', body: JSON.stringify({ field: 'tags', type: 'alias', meta: { special: ['m2m'], interface: 'list-m2m' } }) });
  await dxOk('/relations', {
    method: 'POST',
    body: JSON.stringify({ collection: 'sermons_sermon_tags', field: 'sermons_id', related_collection: 'sermons', meta: { one_field: 'tags', junction_field: 'sermon_tags_id' }, schema: { on_delete: 'CASCADE' } }),
  });
  await dxOk('/relations', {
    method: 'POST',
    body: JSON.stringify({ collection: 'sermons_sermon_tags', field: 'sermon_tags_id', related_collection: 'sermon_tags', meta: { junction_field: 'sermons_id' }, schema: { on_delete: 'CASCADE' } }),
  });

  const policy = await publicPolicyId();
  const read = (collection: string, permissions: Record<string, unknown> = {}) =>
    dxOk('/permissions', { method: 'POST', body: JSON.stringify({ policy, collection, action: 'read', permissions, fields: ['*'] }) });
  await read('sermons', { visibility: { _eq: 'public' } });
  await read('preachers', { active: { _eq: true } });
  await read('sermon_series', { active: { _eq: true } });
  await read('sermon_tags');
  await read('sermons_sermon_tags');
}

export interface SeedSermon {
  youtube_id: string;
  title: string;
  raw_youtube_title: string;
  slug: string;
  sermon_date: string;
  youtube_published_at: string;
  youtube_status?: 'available' | 'unavailable';
  description?: string;
}

export async function createSermon(seed: SeedSermon): Promise<string> {
  const row = await dxOk<{ id: string }>('/items/sermons', {
    method: 'POST',
    body: JSON.stringify({
      youtube_status: 'available',
      visibility: 'public',
      featured: false,
      thumbnail_url: `https://i.ytimg.com/vi/${seed.youtube_id}/maxresdefault.jpg`,
      duration_seconds: 5400,
      view_count: 1,
      imported_at: '2026-10-21T12:00:00.000Z',
      ...seed,
    }),
  });
  return row.id;
}

export async function findSermons(youtubeId: string): Promise<Record<string, unknown>[]> {
  return dxOk(`/items/sermons?filter[youtube_id][_eq]=${encodeURIComponent(youtubeId)}&fields=*`);
}

export async function updateSermon(id: string, patch: Record<string, unknown>): Promise<void> {
  await dxOk(`/items/sermons/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
}

export async function deleteAllSermons(): Promise<void> {
  const rows = await dxOk<{ id: string }[]>('/items/sermons?fields=id&limit=-1');
  if (rows.length) await dxOk('/items/sermons', { method: 'DELETE', body: JSON.stringify(rows.map(r => r.id)) });
}
