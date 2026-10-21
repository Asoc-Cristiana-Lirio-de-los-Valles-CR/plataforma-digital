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
  const state = { failReads: 0, seq: 0 };

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

  async function handle(url: URL, init?: RequestInit): Promise<Response> {
    const auth = new Headers(init?.headers).get('authorization');
    if (auth !== `Bearer ${token}`) return json({ errors: [{ message: 'forbidden' }] }, 403);
    const method = (init?.method ?? 'GET').toUpperCase();
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts[0] !== 'items' || parts[1] !== 'sermons') return json({ errors: [{ message: 'not found' }] }, 404);

    if (method === 'GET') {
      if (state.failReads > 0) {
        state.failReads--;
        return json({ errors: [{ message: 'injected read failure' }] }, 503);
      }
      const limit = Number(url.searchParams.get('limit') ?? '100');
      const offset = Number(url.searchParams.get('offset') ?? '0');
      const sorted = [...items.values()].sort((a, b) => a.id.localeCompare(b.id));
      return json({ data: sorted.slice(offset, limit === -1 ? undefined : offset + limit) });
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
