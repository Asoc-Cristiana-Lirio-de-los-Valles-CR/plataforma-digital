// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createMigration, FIELD, FIELD_DEFINITION, LOCKABLE_FIELDS as SCRIPT_LOCKABLE,
} from '../../../scripts/add-sermons-sync-locked-fields.mjs';
import { LOCKABLE_FIELDS } from '../../src/lib/sync-youtube';

const TOKEN = 'admin-token';
type Sermon = { id: string; youtube_id: string; sermon_date: string; sync_locked_fields?: string[] | null };

// Doble mínimo de Directus para /fields y /items/sermons (403 para un campo inexistente, como Directus 11).
function fakeDirectus(sermons: Sermon[]) {
  const state = { fieldExists: false, fieldType: 'json', calls: [] as string[] };
  const items = new Map(sermons.map(s => [s.id, { ...s }]));
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
  const fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input));
    const method = (init?.method ?? 'GET').toUpperCase();
    state.calls.push(`${method} ${url.pathname}`);
    if (new Headers(init?.headers).get('authorization') !== `Bearer ${TOKEN}`) return json({ errors: [] }, 401);
    if (url.pathname === `/fields/sermons/${FIELD}`) {
      if (method === 'GET') return state.fieldExists ? json({ data: { field: FIELD, type: state.fieldType } }) : json({ errors: [] }, 403);
      if (method === 'DELETE') {
        if (!state.fieldExists) return json({ errors: [] }, 403);
        state.fieldExists = false;
        for (const s of items.values()) delete s.sync_locked_fields;
        return new Response(null, { status: 204 });
      }
    }
    if (url.pathname === '/fields/sermons' && method === 'POST') {
      if (state.fieldExists) return json({ errors: [{ message: 'already exists' }] }, 400);
      const body = JSON.parse(String(init?.body));
      expect(body).toEqual(FIELD_DEFINITION);
      state.fieldExists = true;
      for (const s of items.values()) s.sync_locked_fields = null;
      return json({ data: { field: FIELD, type: 'json' } });
    }
    if (url.pathname === '/items/sermons' && method === 'GET') {
      if (!state.fieldExists && url.searchParams.get('fields')?.includes(FIELD)) return json({ errors: [] }, 403);
      const youtubeId = url.searchParams.get('filter[youtube_id][_eq]');
      return json({ data: [...items.values()].filter(s => s.youtube_id === youtubeId) });
    }
    const patchMatch = url.pathname.match(/^\/items\/sermons\/(.+)$/);
    if (patchMatch && method === 'PATCH') {
      const row = items.get(patchMatch[1]);
      if (!row) return json({ errors: [] }, 404);
      Object.assign(row, JSON.parse(String(init?.body)));
      return json({ data: row });
    }
    return json({ errors: [{ message: `no soportado: ${method} ${url.pathname}` }] }, 405);
  }) as typeof globalThis.fetch;
  return { state, items, fetch };
}

let dx: ReturnType<typeof fakeDirectus>;
const migration = () => createMigration({ directusUrl: 'http://directus:8055', token: TOKEN, fetch: dx.fetch });

beforeEach(() => {
  dx = fakeDirectus([
    { id: 's-d0hl', youtube_id: 'D0hL4Ax6juU', sermon_date: '2026-10-11' },
    { id: 's-dup1', youtube_id: 'DUPLICADO01', sermon_date: '2026-01-01' },
    { id: 's-dup2', youtube_id: 'DUPLICADO01', sermon_date: '2026-01-01' },
  ]);
});

describe('migración sermons.sync_locked_fields', () => {
  it('protege exactamente los mismos campos que respeta el sincronizador', () => {
    expect([...SCRIPT_LOCKABLE]).toEqual([...LOCKABLE_FIELDS]);
    const choices = (FIELD_DEFINITION.meta.options.choices as { value: string }[]).map(c => c.value);
    expect(choices).toEqual([...LOCKABLE_FIELDS]);
  });

  it('define un campo JSON opcional, sin valor por defecto, editable desde el panel', () => {
    expect(FIELD_DEFINITION).toMatchObject({
      field: 'sync_locked_fields',
      type: 'json',
      meta: { interface: 'select-multiple-checkbox', special: ['cast-json'] },
      schema: { is_nullable: true, default_value: null },
    });
  });

  it('check es de solo lectura e informa si el campo existe', async () => {
    expect(await migration().check()).toEqual({ exists: false });
    expect(dx.state.calls).toEqual([`GET /fields/sermons/${FIELD}`]);
  });

  it('apply crea el campo, lo verifica y deja todos los sermones sin protección', async () => {
    expect(await migration().apply()).toEqual({ created: true });
    expect(await migration().check()).toEqual({ exists: true, type: 'json' });
    expect([...dx.items.values()].every(s => s.sync_locked_fields === null)).toBe(true);
  });

  it('apply es idempotente: si el campo ya existe no lo vuelve a crear', async () => {
    await migration().apply();
    dx.state.calls = [];
    expect(await migration().apply()).toEqual({ created: false });
    expect(dx.state.calls).toEqual([`GET /fields/sermons/${FIELD}`]);
  });

  it('apply se detiene si existe un campo con ese nombre pero de otro tipo', async () => {
    dx.state.fieldExists = true;
    dx.state.fieldType = 'string';
    await expect(migration().apply()).rejects.toThrow(/tipo string/);
  });

  it('lock protege un campo de un sermón concreto y es idempotente', async () => {
    await migration().apply();
    expect(await migration().lock('D0hL4Ax6juU', 'sermon_date')).toEqual({
      youtube_id: 'D0hL4Ax6juU', before: null, after: ['sermon_date'], changed: true,
    });
    expect(await migration().lock('D0hL4Ax6juU', 'sermon_date')).toMatchObject({ after: ['sermon_date'], changed: false });
    expect(dx.items.get('s-d0hl')).toMatchObject({ sermon_date: '2026-10-11', sync_locked_fields: ['sermon_date'] });
  });

  it('unlock retira la protección y deja null cuando no queda ninguna', async () => {
    await migration().apply();
    await migration().lock('D0hL4Ax6juU', 'sermon_date');
    expect(await migration().unlock('D0hL4Ax6juU', 'sermon_date')).toMatchObject({ after: null, changed: true });
  });

  it('lock rechaza campos no protegibles, sermones inexistentes o duplicados y un esquema sin migrar', async () => {
    await expect(migration().lock('D0hL4Ax6juU', 'sermon_date')).rejects.toThrow(/no existe.*apply/);
    await migration().apply();
    await expect(migration().lock('D0hL4Ax6juU', 'description')).rejects.toThrow(/no se puede proteger/);
    await expect(migration().lock('NOEXISTE000', 'sermon_date')).rejects.toThrow(/0 sermones/);
    await expect(migration().lock('DUPLICADO01', 'sermon_date')).rejects.toThrow(/2 sermones/);
  });

  it('revert elimina el campo y es idempotente', async () => {
    await migration().apply();
    expect(await migration().revert()).toEqual({ removed: true });
    expect(await migration().revert()).toEqual({ removed: false });
    expect(await migration().check()).toEqual({ exists: false });
  });
});
