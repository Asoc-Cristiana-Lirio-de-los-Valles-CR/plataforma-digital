// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  createMigration, runCli, FIELD, FIELD_DEFINITION, LOCKABLE_FIELDS as SCRIPT_LOCKABLE,
} from '../../../scripts/add-sermons-sync-locked-fields.mjs';
import { LOCKABLE_FIELDS } from '../../src/lib/sync-youtube';

const TOKEN = 'admin-token';
type Sermon = { id: string; youtube_id: string; sermon_date: string; sync_locked_fields?: unknown };

// Doble mínimo de Directus para /fields y /items/sermons (403 para un campo inexistente, como Directus 11).
function fakeDirectus(sermons: Sermon[]) {
  // maxLimit emula QUERY_LIMIT_MAX; deleteNoop, un DELETE que responde 204 sin borrar el campo;
  // patchIgnores, campos que un PATCH acepta (200) pero no guarda.
  const state = { fieldExists: false, fieldType: 'json', calls: [] as string[], maxLimit: 0, deleteNoop: false, patchIgnores: [] as string[] };
  const items = new Map(sermons.map(s => [s.id, { ...s }]));
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
  const fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input));
    const method = (init?.method ?? 'GET').toUpperCase();
    state.calls.push(`${method} ${url.pathname}`);
    if (url.pathname === '/server/info') return json({ data: { project: { project_name: 'LIRIO-PRUEBA' } } });
    if (new Headers(init?.headers).get('authorization') !== `Bearer ${TOKEN}`) return json({ errors: [] }, 401);
    if (url.pathname === '/fields/sermons' && method === 'GET') {
      const base = [{ field: 'id', type: 'uuid' }, { field: 'sermon_date', type: 'date' }];
      return json({ data: state.fieldExists ? [...base, { field: FIELD, type: state.fieldType }] : base });
    }
    if (url.pathname === `/fields/sermons/${FIELD}`) {
      if (method === 'DELETE') {
        if (!state.fieldExists) return json({ errors: [] }, 403);
        if (state.deleteNoop) return new Response(null, { status: 204 });
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
      if (url.searchParams.get(`filter[${FIELD}][_nnull]`) === 'true') {
        const requested = Number(url.searchParams.get('limit') ?? '100');
        const limit = state.maxLimit > 0 && (requested === -1 || requested > state.maxLimit) ? state.maxLimit : requested;
        const offset = Number(url.searchParams.get('offset') ?? '0');
        const locked = [...items.values()].filter(s => s.sync_locked_fields != null).sort((a, b) => a.id.localeCompare(b.id));
        return json({ data: locked.slice(offset, limit === -1 ? undefined : offset + limit) });
      }
      const youtubeId = url.searchParams.get('filter[youtube_id][_eq]');
      return json({ data: [...items.values()].filter(s => s.youtube_id === youtubeId) });
    }
    const patchMatch = url.pathname.match(/^\/items\/sermons\/(.+)$/);
    if (patchMatch && method === 'PATCH') {
      const row = items.get(patchMatch[1]);
      if (!row) return json({ errors: [] }, 404);
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      for (const f of state.patchIgnores) delete body[f];
      Object.assign(row, body);
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
    // Producción (2026-10-21): el servicio fue el 3 de octubre y el registro conserva la fecha del video anterior.
    { id: 's-eze2', youtube_id: 'EZe2JywDzDc', sermon_date: '2026-09-27' },
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

  it('el trigger de PostgreSQL protege los mismos campos y se puede revertir', () => {
    const sql = (name: string) => readFileSync(path.resolve(__dirname, `../../../scripts/sql/${name}`), 'utf8');
    const up = sql('sermons-sync-locks-trigger.up.sql');
    const array = up.match(/FOREACH\s+\w+\s+IN\s+ARRAY\s+ARRAY\[([^\]]*)\]/i)?.[1] ?? '';
    expect([...array.matchAll(/'([^']+)'/g)].map(m => m[1])).toEqual([...LOCKABLE_FIELDS]);
    expect(up).toMatch(/BEFORE UPDATE ON public\.sermons/i);
    const down = sql('sermons-sync-locks-trigger.down.sql');
    expect(down).toMatch(/DROP TRIGGER IF EXISTS sermons_enforce_sync_locks ON public\.sermons/i);
    expect(down).toMatch(/DROP FUNCTION IF EXISTS public\.sermons_enforce_sync_locks\(\)/i);
    expect(down.replace(/--.*$/gm, '')).not.toMatch(/CASCADE/i);
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
    expect(dx.state.calls).toEqual(['GET /fields/sermons']);
  });

  it('check falla (no responde "no existe") si el token no tiene permisos o el destino no es Directus', async () => {
    const wrong = createMigration({ directusUrl: 'http://directus:8055', token: 'otro-token', fetch: dx.fetch });
    await expect(wrong.check()).rejects.toThrow(/sin permisos o destino equivocado/);
    await expect(wrong.revert()).rejects.toThrow(/sin permisos o destino equivocado/);
  });

  it('target identifica el destino (origen y nombre del proyecto) sin credenciales', async () => {
    expect(await migration().target()).toEqual({ origin: 'http://directus:8055', project: 'LIRIO-PRUEBA' });
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
    expect(dx.state.calls).toEqual(['GET /fields/sermons']);
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

  it('lock no pisa una protección guardada con un valor mal formado', async () => {
    await migration().apply();
    dx.items.get('s-d0hl')!.sync_locked_fields = 'sermon_date';
    await expect(migration().lock('D0hL4Ax6juU', 'title')).rejects.toThrow(/valor inválido/);
    expect(dx.items.get('s-d0hl')?.sync_locked_fields).toBe('sermon_date');
  });

  it('revert elimina el campo, informa las protecciones que se pierden y es idempotente', async () => {
    await migration().apply();
    await migration().lock('D0hL4Ax6juU', 'sermon_date');
    expect(await migration().revert()).toEqual({
      removed: true, lostLocks: [{ youtube_id: 'D0hL4Ax6juU', sync_locked_fields: ['sermon_date'] }],
    });
    expect(await migration().revert()).toEqual({ removed: false, lostLocks: [] });
    expect(await migration().check()).toEqual({ exists: false });
  });

  it('lock no confunde una protección ausente en la respuesta con "sin protección"', async () => {
    await migration().apply();
    delete dx.items.get('s-d0hl')!.sync_locked_fields;
    await expect(migration().lock('D0hL4Ax6juU', 'title')).rejects.toThrow(/no devolvió sync_locked_fields/);
    expect(dx.state.calls.filter(c => c.startsWith('PATCH'))).toEqual([]);
  });

  it('revert lista todas las protecciones aunque Directus recorte el limit, sin contar listas vacías', async () => {
    await migration().apply();
    await migration().lock('D0hL4Ax6juU', 'sermon_date');
    dx.items.get('s-dup1')!.sync_locked_fields = ['title'];
    dx.items.get('s-dup2')!.sync_locked_fields = [];
    dx.state.maxLimit = 1;
    expect((await migration().revert()).lostLocks).toEqual([
      { youtube_id: 'D0hL4Ax6juU', sync_locked_fields: ['sermon_date'] },
      { youtube_id: 'DUPLICADO01', sync_locked_fields: ['title'] },
    ]);
  });

  it('revert verifica que el campo quedó eliminado', async () => {
    await migration().apply();
    dx.state.deleteNoop = true;
    await expect(migration().revert()).rejects.toThrow(/sigue existiendo/);
  });

  it('setDate fija la fecha editorial y la protege en una sola escritura', async () => {
    await migration().apply();
    dx.state.calls = [];
    expect(await migration().setDate('EZe2JywDzDc', '2026-10-03')).toEqual({
      youtube_id: 'EZe2JywDzDc',
      before: { sermon_date: '2026-09-27', sync_locked_fields: null },
      after: { sermon_date: '2026-10-03', sync_locked_fields: ['sermon_date'] },
      changed: true,
    });
    expect(dx.state.calls.filter(c => c.startsWith('PATCH'))).toEqual(['PATCH /items/sermons/s-eze2']);
    expect(dx.items.get('s-eze2')).toMatchObject({ sermon_date: '2026-10-03', sync_locked_fields: ['sermon_date'] });
  });

  it('setDate conserva las demás protecciones y es idempotente', async () => {
    await migration().apply();
    await migration().lock('EZe2JywDzDc', 'title');
    expect(await migration().setDate('EZe2JywDzDc', '2026-10-03')).toMatchObject({
      after: { sermon_date: '2026-10-03', sync_locked_fields: ['sermon_date', 'title'] }, changed: true,
    });
    dx.state.calls = [];
    expect(await migration().setDate('EZe2JywDzDc', '2026-10-03')).toMatchObject({ changed: false });
    expect(dx.state.calls.filter(c => c.startsWith('PATCH'))).toEqual([]);
  });

  it('setDate con la fecha ya correcta solo añade la protección', async () => {
    await migration().apply();
    dx.state.calls = [];
    const bodies: unknown[] = [];
    const spy = (async (input: string | URL | Request, init?: RequestInit) => {
      if ((init?.method ?? 'GET') === 'PATCH') bodies.push(JSON.parse(String(init?.body)));
      return dx.fetch(input, init);
    }) as typeof globalThis.fetch;
    const m = createMigration({ directusUrl: 'http://directus:8055', token: TOKEN, fetch: spy });
    expect(await m.setDate('D0hL4Ax6juU', '2026-10-11')).toMatchObject({
      after: { sermon_date: '2026-10-11', sync_locked_fields: ['sermon_date'] }, changed: true,
    });
    expect(bodies).toEqual([{ sync_locked_fields: ['sermon_date'] }]);
  });

  it('setDate no cambia una fecha que ya está protegida con otro valor', async () => {
    await migration().apply();
    await migration().lock('D0hL4Ax6juU', 'sermon_date');
    dx.state.calls = [];
    await expect(migration().setDate('D0hL4Ax6juU', '2026-10-12')).rejects.toThrow(/ya está protegida con 2026-10-11.*unlock/);
    expect(dx.state.calls.filter(c => c.startsWith('PATCH'))).toEqual([]);
    expect(dx.items.get('s-d0hl')?.sermon_date).toBe('2026-10-11');
  });

  it('setDate rechaza fechas inválidas antes de conectarse', async () => {
    for (const bad of ['2026-02-30', '2026-13-01', '2026-10-32', '2026-10-00', '2026-00-10', '03/10/2026', '2026-10-3', '2026-10-03T00:00:00Z', '']) {
      await expect(migration().setDate('EZe2JywDzDc', bad)).rejects.toThrow(/Fecha inválida/);
    }
    expect(dx.state.calls).toEqual([]);
  });

  it('setDate exige el campo migrado y no pisa una protección mal formada', async () => {
    await expect(migration().setDate('EZe2JywDzDc', '2026-10-03')).rejects.toThrow(/no existe.*apply/);
    await migration().apply();
    dx.items.get('s-eze2')!.sync_locked_fields = 'sermon_date';
    await expect(migration().setDate('EZe2JywDzDc', '2026-10-03')).rejects.toThrow(/valor inválido/);
    expect(dx.items.get('s-eze2')?.sermon_date).toBe('2026-09-27');
  });

  it('setDate verifica que la fecha y la protección quedaron guardadas', async () => {
    await migration().apply();
    dx.state.patchIgnores = ['sermon_date'];
    await expect(migration().setDate('EZe2JywDzDc', '2026-10-03')).rejects.toThrow(/no quedó guardada/);
  });
});

describe('runCli (lo que ejecuta la CLI)', () => {
  const env = { DIRECTUS_URL: 'http://directus:8055', DIRECTUS_ADMIN_TOKEN: TOKEN };
  // Cada línea impresa queda también en state.calls, para comprobar su orden respecto de las peticiones.
  function capture() {
    const lines: Record<string, unknown>[] = [];
    const out = (line: string) => {
      const parsed = JSON.parse(line) as Record<string, unknown>;
      lines.push(parsed);
      dx.state.calls.push(`OUT ${Object.keys(parsed).join(',')}`);
    };
    return { lines, out };
  }

  it('imprime el destino antes de ejecutar el comando, también si el comando falla', async () => {
    await migration().apply();
    const { lines, out } = capture();
    await expect(runCli(['lock', 'NOEXISTE000', 'sermon_date'], { env, fetch: dx.fetch, out })).rejects.toThrow(/0 sermones/);
    expect(lines).toEqual([
      { command: 'lock', args: ['NOEXISTE000', 'sermon_date'], target: { origin: 'http://directus:8055', project: 'LIRIO-PRUEBA' } },
    ]);
  });

  it('revert lista las protecciones que se pierden antes de borrar el campo', async () => {
    await migration().apply();
    await migration().lock('D0hL4Ax6juU', 'sermon_date');
    dx.state.calls = [];
    const { lines, out } = capture();
    const lostLocks = [{ youtube_id: 'D0hL4Ax6juU', sync_locked_fields: ['sermon_date'] }];
    expect(await runCli(['revert', '--yes'], { env, fetch: dx.fetch, out })).toEqual({ removed: true, lostLocks });
    const listed = dx.state.calls.indexOf('OUT command,target,lostLocks');
    expect(listed).toBeGreaterThan(-1);
    expect(listed).toBeLessThan(dx.state.calls.indexOf(`DELETE /fields/sermons/${FIELD}`));
    expect(lines.at(-1)).toMatchObject({ command: 'revert', result: { removed: true, lostLocks } });
  });

  it('lock y unlock validan sus argumentos antes de conectarse', async () => {
    const { out } = capture();
    await expect(runCli(['lock', 'D0hL4Ax6juU', 'description'], { env, fetch: dx.fetch, out })).rejects.toThrow(/no se puede proteger/);
    await expect(runCli(['unlock', 'D0hL4Ax6juU'], { env, fetch: dx.fetch, out })).rejects.toThrow(/no se puede proteger/);
    await expect(runCli(['lock'], { env, fetch: dx.fetch, out })).rejects.toThrow(/Uso: lock <youtube_id> <campo>/);
    expect(dx.state.calls).toEqual([]);
  });

  it('set-date valida sus argumentos antes de conectarse', async () => {
    const { out } = capture();
    await expect(runCli(['set-date', 'EZe2JywDzDc'], { env, fetch: dx.fetch, out })).rejects.toThrow(/Fecha inválida/);
    await expect(runCli(['set-date', 'EZe2JywDzDc', '3/10/2026'], { env, fetch: dx.fetch, out })).rejects.toThrow(/Fecha inválida/);
    await expect(runCli(['set-date'], { env, fetch: dx.fetch, out })).rejects.toThrow(/Uso: set-date <youtube_id> <AAAA-MM-DD>/);
    expect(dx.state.calls).toEqual([]);
  });

  it('set-date imprime el destino y después el antes y el después', async () => {
    await migration().apply();
    const { lines, out } = capture();
    await runCli(['set-date', 'EZe2JywDzDc', '2026-10-03'], { env, fetch: dx.fetch, out });
    expect(lines).toEqual([
      { command: 'set-date', args: ['EZe2JywDzDc', '2026-10-03'], target: { origin: 'http://directus:8055', project: 'LIRIO-PRUEBA' } },
      {
        command: 'set-date', target: { origin: 'http://directus:8055', project: 'LIRIO-PRUEBA' },
        result: {
          youtube_id: 'EZe2JywDzDc', changed: true,
          before: { sermon_date: '2026-09-27', sync_locked_fields: null },
          after: { sermon_date: '2026-10-03', sync_locked_fields: ['sermon_date'] },
        },
      },
    ]);
  });
});

describe('CLI de la migración (por stdin, como en producción)', () => {
  const script = readFileSync(path.resolve(__dirname, '../../../scripts/add-sermons-sync-locked-fields.mjs'));
  const cli = (args: string[], env: Record<string, string>) => spawnSync(process.execPath, ['--input-type=module', '-', ...args], {
    input: script, encoding: 'utf8',
    env: { ...Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('DIRECTUS_'))), ...env } as NodeJS.ProcessEnv,
  });
  const env = { DIRECTUS_URL: 'http://127.0.0.1:9', DIRECTUS_ADMIN_TOKEN: 'x' };

  it('exige DIRECTUS_URL y DIRECTUS_ADMIN_TOKEN', () => {
    const res = cli(['check'], {});
    expect(res.status).toBe(1);
    expect(res.stderr).toMatch(/Se requieren DIRECTUS_URL y DIRECTUS_ADMIN_TOKEN/);
  });

  it('revert sin --yes se niega antes de conectarse', () => {
    const res = cli(['revert'], env);
    expect(res.status).toBe(1);
    expect(res.stderr).toMatch(/confirme con --yes/);
  });

  it('un comando desconocido muestra el uso y no se conecta', () => {
    const res = cli(['borrar'], env);
    expect(res.status).toBe(1);
    expect(res.stderr).toMatch(/Uso:/);
    expect(res.stdout).toBe('');
  });
});
