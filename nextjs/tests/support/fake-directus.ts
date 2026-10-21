// Doble en memoria de la colección `sermons` de Directus (REST /items), con youtube_id único.
export type Row = Record<string, unknown> & { id: string; youtube_id: string };

export interface WriteRecord {
  method: 'POST' | 'PATCH';
  id: string;
  youtube_id: string;
  body: Record<string, unknown>;
}

export function createFakeDirectus(rows: Row[] = [], token = 'admin-token') {
  const items = new Map<string, Row>(rows.map(r => [r.id, { ...r }]));
  const writes: WriteRecord[] = [];
  const failWritesFor = new Set<string>();
  /**
   * maxLimit emula QUERY_LIMIT_MAX de Directus: recorta el limit pedido.
   * unknownFields: campos que no existen en el esquema (Directus responde 403 si se piden).
   * dropFields: campos que la respuesta omite (simula una proyección defectuosa).
   * adminAccess: lo que responde /policies/me/globals para el token.
   */
  const state = { failReads: 0, seq: 0, maxLimit: 0, unknownFields: [] as string[], dropFields: [] as string[], adminAccess: true };

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

  async function handle(url: URL, init?: RequestInit): Promise<Response> {
    const auth = new Headers(init?.headers).get('authorization');
    if (auth !== `Bearer ${token}`) return json({ errors: [{ message: 'forbidden' }] }, 403);
    const method = (init?.method ?? 'GET').toUpperCase();
    const parts = url.pathname.split('/').filter(Boolean);
    if (method === 'GET' && parts.join('/') === 'policies/me/globals') {
      return json({ data: { admin_access: state.adminAccess, app_access: true, enforce_tfa: false } });
    }
    if (parts[0] !== 'items' || parts[1] !== 'sermons') return json({ errors: [{ message: 'not found' }] }, 404);

    if (method === 'GET') {
      if (state.failReads > 0) {
        state.failReads--;
        return json({ errors: [{ message: 'injected read failure' }] }, 503);
      }
      // Como Directus: devuelve solo los campos pedidos y un campo sin valor llega como null.
      const fields = url.searchParams.get('fields')?.split(',').filter(f => f && f !== '*') ?? [];
      if (fields.some(f => state.unknownFields.includes(f))) {
        return json({ errors: [{ message: 'You don\'t have permission to access this.', extensions: { code: 'FORBIDDEN' } }] }, 403);
      }
      const project = (row: Row) => fields.length === 0 ? row
        : Object.fromEntries(fields.filter(f => !state.dropFields.includes(f)).map(f => [f, row[f] ?? null]));
      if (parts[2]) {
        const row = items.get(parts[2]);
        return row ? json({ data: project(row) }) : json({ errors: [{ message: 'not found' }] }, 403);
      }
      const requested = Number(url.searchParams.get('limit') ?? '100');
      const limit = state.maxLimit > 0 && (requested === -1 || requested > state.maxLimit) ? state.maxLimit : requested;
      const offset = Number(url.searchParams.get('offset') ?? '0');
      const sorted = [...items.values()].sort((a, b) => a.id.localeCompare(b.id));
      return json({ data: sorted.slice(offset, limit === -1 ? undefined : offset + limit).map(project) });
    }

    const body = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>;

    if (method === 'POST') {
      const youtubeId = String(body.youtube_id);
      if (failWritesFor.has(youtubeId)) return json({ errors: [{ message: 'injected write failure' }] }, 500);
      if ([...items.values()].some(r => r.youtube_id === youtubeId)) {
        return json({ errors: [{ message: 'not unique', extensions: { code: 'RECORD_NOT_UNIQUE' } }] }, 400);
      }
      const id = `gen-${++state.seq}`;
      items.set(id, { ...body, id, youtube_id: youtubeId });
      writes.push({ method: 'POST', id, youtube_id: youtubeId, body });
      return json({ data: items.get(id) });
    }

    if (method === 'PATCH' && parts[2]) {
      const row = items.get(parts[2]);
      if (!row) return json({ errors: [{ message: 'not found' }] }, 404);
      if (failWritesFor.has(row.youtube_id)) return json({ errors: [{ message: 'injected write failure' }] }, 500);
      items.set(row.id, { ...row, ...body });
      writes.push({ method: 'PATCH', id: row.id, youtube_id: row.youtube_id, body });
      return json({ data: items.get(row.id) });
    }

    return json({ errors: [{ message: 'unsupported' }] }, 405);
  }

  return {
    items,
    writes,
    failWritesFor,
    state,
    byYoutubeId: (youtubeId: string) => [...items.values()].filter(r => r.youtube_id === youtubeId),
    handles: (url: URL) => url.hostname === 'directus',
    handle,
  };
}
