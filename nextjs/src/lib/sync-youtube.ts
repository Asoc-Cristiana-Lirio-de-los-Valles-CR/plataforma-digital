// Sin imports a propósito: Playwright y los scripts de ensayo importan este módulo directamente.
const YT_API_BASE = 'https://www.googleapis.com/youtube/v3';
const YT_PAGE_SIZE = 50;
const DIRECTUS_PAGE_SIZE = 500;
const WRITE_TIMEOUT_MS = 15_000;
const RETRY_ATTEMPTS = 3;
const MAX_UNAVAILABLE_PER_RUN = 10;
const MAX_UNAVAILABLE_RATIO = 0.02;
const MAX_REPORTED_CANDIDATES = 50;
const MAX_PLAYLIST_PAGES = 200;

const EXISTING_FIELDS = [
  'id', 'youtube_id', 'title', 'raw_youtube_title', 'youtube_status',
  'youtube_published_at', 'sermon_date', 'duration_seconds', 'view_count', 'sync_locked_fields',
].join(',');

/** Campos editoriales que un editor puede proteger por sermón en Directus (`sync_locked_fields`). */
export const LOCKABLE_FIELDS = ['sermon_date', 'title'] as const;
export type LockableField = (typeof LOCKABLE_FIELDS)[number];

export interface SyncResult {
  inserted: number;
  updated: number;
  unchanged: number;
  unavailable: number;
  restored: number;
  titleChanges: TitleChange[];
  /** Escrituras aplicadas (o planificadas en dryRun), con los nombres de los campos que cambian. */
  changes: SyncChange[];
  /** Cambios de YouTube que no se aplican porque el campo está protegido. */
  protectedFields: ProtectedField[];
  unavailableIds: string[];
  unavailableSkipped?: 'verification_failed' | 'circuit_breaker';
  /** IDs confirmados como no disponibles que el freno no marcó (para revisión humana). */
  unavailableCandidates?: string[];
  errors: string[];
  dryRun: boolean;
  lockLost?: boolean;
}

export interface SyncChange {
  youtube_id: string;
  action: 'insert' | 'update' | 'restore' | 'unavailable';
  fields: string[];
}

export interface SyncOptions {
  dryRun?: boolean;
  /** Se llama antes de cada escritura; debe confirmar (y renovar) la propiedad del lock. */
  ensureLock?: () => Promise<boolean>;
}

export interface SyncDeps {
  fetch?: typeof fetch;
  now?: () => Date;
  sleep?: (ms: number) => Promise<void>;
}

export interface ExistingSermon {
  id: string;
  youtube_id: string;
  title: string | null;
  raw_youtube_title: string | null;
  youtube_status: 'available' | 'unavailable';
  youtube_published_at: string | null;
  sermon_date: string | null;
  duration_seconds: number | null;
  view_count: number | null;
  sync_locked_fields: LockableField[] | null;
}

export interface ProtectedField {
  youtube_id: string;
  field: LockableField;
  /** Valor que se conserva. */
  kept: string | null;
  /** Valor que proponía YouTube. */
  youtube: string | null;
  reason: 'sync_locked_fields' | 'manual_edit';
}

export interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  publishedAt: string;
  durationSeconds: number | null;
  viewCount: number | null;
}

export interface TitleChange {
  youtube_id: string;
  from: string;
  to: string;
  editorial: boolean;
}

export interface SermonUpdatePlan {
  patch: Record<string, unknown>;
  titleChange?: TitleChange;
  protectedFields: ProtectedField[];
}

const SERIES_PATTERNS = [
  /serie[:\s]+([a-záéíóúüñ0-9\s]+?)(?:\s+#\d+|\s+parte|\s+cap|$|[\|\-—])/i,
  /avivamiento\s+(\d{4})/i,
  /retiro\s+(\d{4})/i,
];

const PREACHER_PATTERNS = [
  /(?:pastor|pastora|hno|hnao?|hermano|hermana)[.\s]+([a-záéíóúüñ\s]+?)(?:\s*[\|\-—]|$)/i,
  /[\|\-—]\s*(?:pastor|pastora)?[.\s]*([A-ZÁÉÍÓÚÜÑ][a-záéíóúüñ]+(?:\s+[A-ZÁÉÍÓÚÜÑ][a-záéíóúüñ]+)?)\s*$/,
];

export function suggestFromTitle(title: string): { suggestedSeries: string; suggestedPreacher: string } {
  let suggestedSeries = '';
  let suggestedPreacher = '';

  for (const pattern of SERIES_PATTERNS) {
    const match = title.match(pattern);
    if (match) {
      suggestedSeries = match[1].trim();
      break;
    }
  }

  for (const pattern of PREACHER_PATTERNS) {
    const match = title.match(pattern);
    if (match) {
      suggestedPreacher = match[1].trim();
      break;
    }
  }

  return { suggestedSeries, suggestedPreacher };
}

function toInstant(value: string | null): number | null {
  if (!value) return null;
  const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/.test(value);
  const ms = Date.parse(hasZone ? value : `${value}Z`);
  return Number.isNaN(ms) ? null : ms;
}

function utcDate(value: string | null): string | null {
  const ms = toInstant(value);
  return ms === null ? null : new Date(ms).toISOString().slice(0, 10);
}

// Sigue a YouTube en los campos que YouTube administra; los campos editoriales nunca se tocan.
// title y sermon_date se conservan si están en sync_locked_fields o si un editor los cambió a mano.
// Una protección siempre acompaña a un cambio que sí se escribe (raw_youtube_title o youtube_published_at),
// así que null sigue significando "nada que escribir ni que informar".
export function planSermonUpdate(
  existing: ExistingSermon,
  video: YouTubeVideo,
  syncedAt: string
): SermonUpdatePlan | null {
  const patch: Record<string, unknown> = {};
  const protectedFields: ProtectedField[] = [];
  const locked = new Set(existing.sync_locked_fields ?? []);
  let titleChange: TitleChange | undefined;

  const ytTitle = video.title.trim();
  const storedRaw = (existing.raw_youtube_title ?? '').trim();
  const storedTitle = (existing.title ?? '').trim();
  if (ytTitle && ytTitle !== storedRaw) {
    const reason = locked.has('title') ? 'sync_locked_fields' : storedTitle !== storedRaw ? 'manual_edit' : null;
    patch.raw_youtube_title = ytTitle;
    if (!reason) patch.title = ytTitle;
    else if (ytTitle !== storedTitle) {
      protectedFields.push({ youtube_id: existing.youtube_id, field: 'title', kept: existing.title, youtube: ytTitle, reason });
    }
    titleChange = { youtube_id: existing.youtube_id, from: storedRaw, to: ytTitle, editorial: reason !== null };
  }

  const ytPublished = toInstant(video.publishedAt);
  if (ytPublished !== null && ytPublished !== toInstant(existing.youtube_published_at)) {
    patch.youtube_published_at = video.publishedAt;
    const newDate = utcDate(video.publishedAt);
    if (newDate !== existing.sermon_date) {
      const reason = locked.has('sermon_date') ? 'sync_locked_fields'
        : existing.sermon_date !== utcDate(existing.youtube_published_at) ? 'manual_edit' : null;
      if (!reason) patch.sermon_date = newDate;
      else protectedFields.push({ youtube_id: existing.youtube_id, field: 'sermon_date', kept: existing.sermon_date, youtube: newDate, reason });
    }
  }

  if (video.durationSeconds && video.durationSeconds > 0 && video.durationSeconds !== existing.duration_seconds) {
    patch.duration_seconds = video.durationSeconds;
  }

  if (existing.youtube_status !== 'available') patch.youtube_status = 'available';

  if (Object.keys(patch).length === 0) return null;

  if (video.viewCount !== null) patch.view_count = video.viewCount;
  patch.last_synced_at = syncedAt;
  return { patch, titleChange, protectedFields };
}

export function buildThumbnailUrl(youtubeId: string): string {
  return `https://i.ytimg.com/vi/${youtubeId}/maxresdefault.jpg`;
}

function parseDuration(iso: string): number {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  return (parseInt(match[1] ?? '0') * 3600) + (parseInt(match[2] ?? '0') * 60) + parseInt(match[3] ?? '0');
}

function generateSlug(title: string, youtubeId: string): string {
  const base = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60);
  return `${base}-${youtubeId.slice(-4)}`;
}

export function buildNewSermon(video: YouTubeVideo, syncedAt: string): Record<string, unknown> {
  const title = video.title.trim();
  const { suggestedSeries, suggestedPreacher } = suggestFromTitle(title);
  return {
    title,
    raw_youtube_title: title,
    slug: generateSlug(title, video.id),
    youtube_id: video.id,
    youtube_status: 'available',
    visibility: 'public',
    featured: false,
    description: video.description.slice(0, 2000) || null,
    thumbnail_url: buildThumbnailUrl(video.id),
    duration_seconds: video.durationSeconds,
    view_count: video.viewCount ?? 0,
    youtube_published_at: video.publishedAt,
    sermon_date: utcDate(video.publishedAt),
    suggested_series: suggestedSeries || null,
    suggested_preacher: suggestedPreacher || null,
    imported_at: syncedAt,
    last_synced_at: syncedAt,
  };
}

interface Context {
  fetch: typeof fetch;
  sleep: (ms: number) => Promise<void>;
  apiKey: string;
  channelId: string;
  directusUrl: string;
  adminToken: string;
}

async function ytGet(ctx: Context, endpoint: string, params: Record<string, string>): Promise<Record<string, unknown>> {
  const query = new URLSearchParams({ ...params, key: ctx.apiKey });
  const url = `${YT_API_BASE}/${endpoint}?${query}`;
  let lastStatus: number | string = 'network';
  for (let attempt = 0; attempt < RETRY_ATTEMPTS; attempt++) {
    if (attempt > 0) await ctx.sleep(1000 * 2 ** (attempt - 1));
    let res: Response;
    try {
      res = await ctx.fetch(url);
    } catch {
      lastStatus = 'network';
      continue;
    }
    if (res.ok) return (await res.json()) as Record<string, unknown>;
    lastStatus = res.status;
    // 403 (cuota/clave) y otros 4xx no se reintentan: repetirlos solo consume cuota.
    if (res.status !== 429 && res.status < 500) break;
  }
  throw new Error(`YouTube ${endpoint} error: ${lastStatus}`);
}

function toYouTubeVideo(item: Record<string, unknown>): YouTubeVideo {
  const snippet = (item.snippet ?? {}) as Record<string, unknown>;
  const details = (item.contentDetails ?? {}) as Record<string, unknown>;
  const stats = (item.statistics ?? {}) as Record<string, unknown>;
  return {
    id: String(item.id),
    title: String(snippet.title ?? ''),
    description: String(snippet.description ?? ''),
    publishedAt: String(snippet.publishedAt ?? ''),
    durationSeconds: typeof details.duration === 'string' ? parseDuration(details.duration) : null,
    viewCount: stats.viewCount !== undefined ? parseInt(String(stats.viewCount)) : null,
  };
}

async function fetchChannelVideos(ctx: Context): Promise<{ playlistIds: string[]; videos: Map<string, YouTubeVideo> }> {
  const channel = await ytGet(ctx, 'channels', { part: 'contentDetails', id: ctx.channelId });
  const items = channel.items as { contentDetails?: { relatedPlaylists?: { uploads?: string } } }[] | undefined;
  const uploads = items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploads) throw new Error('YouTube channels error: uploads playlist not found');

  const seen = new Set<string>();
  const usedTokens = new Set<string>();
  let pageToken: string | undefined;
  do {
    if (pageToken && (usedTokens.has(pageToken) || usedTokens.size >= MAX_PLAYLIST_PAGES)) {
      throw new Error('YouTube playlistItems error: repeated or runaway pageToken');
    }
    if (pageToken) usedTokens.add(pageToken);
    const params: Record<string, string> = { part: 'contentDetails', playlistId: uploads, maxResults: String(YT_PAGE_SIZE) };
    if (pageToken) params.pageToken = pageToken;
    const page = await ytGet(ctx, 'playlistItems', params);
    for (const item of (page.items ?? []) as { contentDetails?: { videoId?: unknown } }[]) {
      const id = item.contentDetails?.videoId;
      if (typeof id === 'string') seen.add(id);
    }
    pageToken = typeof page.nextPageToken === 'string' ? page.nextPageToken : undefined;
  } while (pageToken);

  const playlistIds = [...seen];
  const videos = new Map<string, YouTubeVideo>();
  for (let i = 0; i < playlistIds.length; i += YT_PAGE_SIZE) {
    const ids = playlistIds.slice(i, i + YT_PAGE_SIZE).join(',');
    const data = await ytGet(ctx, 'videos', { part: 'snippet,contentDetails,statistics', id: ids });
    for (const item of (data.items ?? []) as Record<string, unknown>[]) {
      const video = toYouTubeVideo(item);
      videos.set(video.id, video);
    }
  }
  return { playlistIds, videos };
}

async function findMissingOnYouTube(ctx: Context, ids: string[]): Promise<string[]> {
  const returned = new Set<string>();
  for (let i = 0; i < ids.length; i += YT_PAGE_SIZE) {
    const data = await ytGet(ctx, 'videos', { part: 'id', id: ids.slice(i, i + YT_PAGE_SIZE).join(',') });
    for (const item of (data.items ?? []) as Record<string, unknown>[]) returned.add(String(item.id));
  }
  return ids.filter(id => !returned.has(id));
}

function directusHeaders(ctx: Context, json = false): Record<string, string> {
  const headers: Record<string, string> = {};
  if (ctx.adminToken) headers.Authorization = `Bearer ${ctx.adminToken}`;
  if (json) headers['Content-Type'] = 'application/json';
  return headers;
}

async function loadExistingSermons(ctx: Context): Promise<Map<string, ExistingSermon>> {
  const existing = new Map<string, ExistingSermon>();
  // Avanza por filas recibidas y termina con una página vacía: Directus puede recortar el limit (QUERY_LIMIT_MAX).
  for (let offset = 0; ; ) {
    const query = new URLSearchParams({ fields: EXISTING_FIELDS, sort: 'id', limit: String(DIRECTUS_PAGE_SIZE), offset: String(offset) });
    const res = await ctx.fetch(`${ctx.directusUrl}/items/sermons?${query}`, { headers: directusHeaders(ctx) });
    if (!res.ok) throw new Error(`Directus sermons read error: ${res.status}`);
    const rows = ((await res.json()) as { data?: ExistingSermon[] }).data ?? [];
    if (rows.length === 0) return existing;
    for (const row of rows) {
      assertValidLocks(row);
      if (row.youtube_id) existing.set(row.youtube_id, row);
    }
    offset += rows.length;
  }
}

// Sin admin_access, Directus 11 puede devolver null en un campo que el token no puede leer en esa fila
// (varias políticas con campos distintos) en vez de responder 403: ese null ocultaría una protección.
async function assertAdminAccess(ctx: Context): Promise<void> {
  const res = await ctx.fetch(`${ctx.directusUrl}/policies/me/globals`, { headers: directusHeaders(ctx) });
  if (!res.ok) throw new Error(`Directus access check error: ${res.status}`);
  const globals = ((await res.json()) as { data?: { admin_access?: unknown } }).data;
  if (globals?.admin_access !== true) {
    throw new Error('Directus access check error: DIRECTUS_ADMIN_TOKEN lacks admin_access');
  }
}

// Relee la fila justo antes de escribir sermon_date o title: una protección marcada durante la sync se respeta.
async function replanBeforeWrite(ctx: Context, op: UpdateOp, syncedAt: string): Promise<UpdateOp | null> {
  const query = new URLSearchParams({ fields: EXISTING_FIELDS });
  const res = await ctx.fetch(`${ctx.directusUrl}/items/sermons/${op.id}?${query}`, { headers: directusHeaders(ctx) });
  if (!res.ok) throw new Error(`Directus sermons read error: ${res.status}`);
  const row = ((await res.json()) as { data?: ExistingSermon }).data;
  if (!row) throw new Error('Directus sermons read error: empty');
  assertValidLocks(row);
  const plan = planSermonUpdate(row, op.video, syncedAt);
  return plan ? toUpdateOp(op.youtubeId, op.id, op.video, plan) : null;
}

function toUpdateOp(youtubeId: string, id: string, video: YouTubeVideo, plan: SermonUpdatePlan): UpdateOp {
  return {
    kind: plan.patch.youtube_status === 'available' ? 'restore' : 'update',
    youtubeId, id, video, body: plan.patch, titleChange: plan.titleChange, protectedFields: plan.protectedFields,
  };
}

// Falla cerrado: una protección ausente o ilegible nunca se interpreta como "sin protección".
function assertValidLocks(row: ExistingSermon): void {
  if (!Object.prototype.hasOwnProperty.call(row, 'sync_locked_fields')) {
    throw new Error('Directus sermons read error: sync_locked_fields missing');
  }
  const value: unknown = row.sync_locked_fields;
  if (value === null) return;
  if (!Array.isArray(value) || !value.every(f => (LOCKABLE_FIELDS as readonly unknown[]).includes(f))) {
    throw new Error(`Directus sermons read error: invalid sync_locked_fields for ${row.youtube_id}`);
  }
}

function unavailableLimit(availableCount: number): number {
  return Math.max(1, Math.min(MAX_UNAVAILABLE_PER_RUN, Math.floor(availableCount * MAX_UNAVAILABLE_RATIO)));
}

interface UpdateOp {
  kind: 'update' | 'restore'; youtubeId: string; id: string; video: YouTubeVideo; body: Record<string, unknown>;
  titleChange?: TitleChange; protectedFields: ProtectedField[];
}

type WriteOp =
  | { kind: 'insert'; youtubeId: string; body: Record<string, unknown> }
  | { kind: 'unavailable'; youtubeId: string; id: string; body: Record<string, unknown> }
  | UpdateOp;

export async function runYoutubeSync(options: SyncOptions = {}, deps: SyncDeps = {}): Promise<SyncResult> {
  const ctx: Context = {
    fetch: deps.fetch ?? fetch,
    sleep: deps.sleep ?? (ms => new Promise(resolve => setTimeout(resolve, ms))),
    apiKey: process.env.YOUTUBE_API_KEY ?? '',
    channelId: process.env.YOUTUBE_CHANNEL_ID ?? '',
    directusUrl: process.env.DIRECTUS_URL ?? 'http://directus:8055',
    adminToken: process.env.DIRECTUS_ADMIN_TOKEN ?? '',
  };
  if (!ctx.apiKey || !ctx.channelId) {
    throw new Error('YouTube sync misconfigured: YOUTUBE_API_KEY and YOUTUBE_CHANNEL_ID are required');
  }
  // Sin token solo se verían los sermones públicos: los demás se planificarían como inserciones.
  if (!options.dryRun && !ctx.adminToken) {
    throw new Error('YouTube sync misconfigured: DIRECTUS_ADMIN_TOKEN is required for a real run');
  }
  const syncedAt = (deps.now ?? (() => new Date()))().toISOString();
  const result: SyncResult = {
    inserted: 0, updated: 0, unchanged: 0, unavailable: 0, restored: 0,
    titleChanges: [], changes: [], protectedFields: [], unavailableIds: [], errors: [], dryRun: Boolean(options.dryRun),
  };

  // 1. Todas las lecturas antes de cualquier escritura: un fallo aquí aborta sin tocar datos.
  if (ctx.adminToken) await assertAdminAccess(ctx);
  const { playlistIds, videos } = await fetchChannelVideos(ctx);
  const existing = await loadExistingSermons(ctx);

  // 2. Plan de escrituras.
  const ops: WriteOp[] = [];
  for (const youtubeId of playlistIds) {
    const video = videos.get(youtubeId);
    if (!video) continue;
    const current = existing.get(youtubeId);
    if (!current) {
      ops.push({ kind: 'insert', youtubeId, body: buildNewSermon(video, syncedAt) });
      continue;
    }
    const plan = planSermonUpdate(current, video, syncedAt);
    if (!plan) {
      result.unchanged++;
      continue;
    }
    ops.push(toUpdateOp(youtubeId, current.id, video, plan));
  }

  const available = [...existing.values()].filter(s => s.youtube_status === 'available');
  const candidates = available.filter(s => !videos.has(s.youtube_id)).map(s => s.youtube_id);
  if (candidates.length > 0) {
    let missing: string[] | null = null;
    try {
      missing = await findMissingOnYouTube(ctx, candidates);
    } catch (err) {
      result.unavailableSkipped = 'verification_failed';
      result.errors.push(`unavailable_verification_failed: ${String(err)}`);
    }
    if (missing && missing.length > unavailableLimit(available.length)) {
      result.unavailableSkipped = 'circuit_breaker';
      result.unavailableCandidates = missing.slice(0, MAX_REPORTED_CANDIDATES);
      result.errors.push('unavailable_circuit_breaker');
    } else if (missing) {
      for (const youtubeId of missing) {
        ops.push({ kind: 'unavailable', youtubeId, id: existing.get(youtubeId)!.id, body: { youtube_status: 'unavailable', last_synced_at: syncedAt } });
      }
    }
  }

  if (options.dryRun) {
    for (const op of ops) countOp(result, op);
    return result;
  }

  // 3. Escrituras, confirmando la propiedad del lock antes de cada una.
  for (let op of ops) {
    if (options.ensureLock && !(await options.ensureLock())) {
      result.lockLost = true;
      result.errors.push('lock_lost');
      break;
    }
    if ((op.kind === 'update' || op.kind === 'restore') && LOCKABLE_FIELDS.some(f => f in op.body)) {
      let fresh: UpdateOp | null;
      try {
        fresh = await replanBeforeWrite(ctx, op, syncedAt);
      } catch (err) {
        result.errors.push(`${op.youtubeId}: ${op.kind} lock_recheck_failed ${String(err)}`);
        continue;
      }
      if (!fresh) {
        result.unchanged++;
        continue;
      }
      op = fresh;
    }
    const isInsert = op.kind === 'insert';
    const path = op.kind === 'insert' ? '' : `/${op.id}`;
    try {
      const res = await ctx.fetch(`${ctx.directusUrl}/items/sermons${path}`, {
        method: isInsert ? 'POST' : 'PATCH',
        headers: directusHeaders(ctx, true),
        body: JSON.stringify(op.body),
        signal: AbortSignal.timeout(WRITE_TIMEOUT_MS),
      });
      if (res.ok) countOp(result, op);
      else result.errors.push(`${op.youtubeId}: ${op.kind} ${res.status}`);
    } catch (err) {
      result.errors.push(`${op.youtubeId}: ${op.kind} ${String(err)}`);
    }
  }

  return result;
}

function countOp(result: SyncResult, op: WriteOp): void {
  const fields = op.kind === 'insert'
    ? []
    : Object.keys(op.body).filter(k => k !== 'last_synced_at' && k !== 'view_count').sort();
  result.changes.push({ youtube_id: op.youtubeId, action: op.kind, fields });
  if (op.kind === 'update' || op.kind === 'restore') {
    if (op.titleChange) result.titleChanges.push(op.titleChange);
    result.protectedFields.push(...op.protectedFields);
  }
  if (op.kind === 'insert') result.inserted++;
  else if (op.kind === 'update') result.updated++;
  else if (op.kind === 'restore') result.restored++;
  else {
    result.unavailable++;
    result.unavailableIds.push(op.youtubeId);
  }
}
