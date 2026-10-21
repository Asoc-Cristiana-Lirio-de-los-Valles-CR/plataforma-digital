/**
 * Migración: sermons.sync_locked_fields — campos editoriales que la sync de YouTube nunca sobrescribe.
 *
 * Uso (requiere DIRECTUS_URL y DIRECTUS_ADMIN_TOKEN en el entorno; a propósito NO lee .env):
 *   node scripts/add-sermons-sync-locked-fields.mjs check                    # solo lectura
 *   node scripts/add-sermons-sync-locked-fields.mjs apply                    # crea el campo (idempotente)
 *   node scripts/add-sermons-sync-locked-fields.mjs lock <youtube_id> <campo>
 *   node scripts/add-sermons-sync-locked-fields.mjs unlock <youtube_id> <campo>
 *   node scripts/add-sermons-sync-locked-fields.mjs revert --yes             # elimina el campo y sus protecciones
 *
 * En producción se ejecuta dentro del contenedor, sin que el token salga del servidor:
 *   ssh ... 'docker exec -i lirio_nextjs node --input-type=module - check' < scripts/add-sermons-sync-locked-fields.mjs
 *
 * Solo usa módulos de Node: el contenedor de Next.js no tiene el resto del repositorio.
 */
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const FIELD = 'sync_locked_fields';
/** Debe coincidir con LOCKABLE_FIELDS de nextjs/src/lib/sync-youtube.ts (lo verifica una prueba). */
export const LOCKABLE_FIELDS = ['sermon_date', 'title'];

export const FIELD_DEFINITION = {
  field: FIELD,
  type: 'json',
  meta: {
    interface: 'select-multiple-checkbox',
    special: ['cast-json'],
    options: {
      choices: [
        { text: 'Fecha del sermón (sermon_date)', value: 'sermon_date' },
        { text: 'Título (title)', value: 'title' },
      ],
    },
    display: 'labels',
    display_options: {
      choices: [
        { text: 'Fecha del sermón', value: 'sermon_date' },
        { text: 'Título', value: 'title' },
      ],
    },
    note: 'Campos que la sincronización con YouTube nunca sobrescribe en este sermón. Vacío: sin protección.',
    width: 'full',
  },
  schema: { is_nullable: true, default_value: null },
};

export function createMigration({ directusUrl, token, fetch = globalThis.fetch }) {
  if (!directusUrl || !token) throw new Error('Se requieren DIRECTUS_URL y DIRECTUS_ADMIN_TOKEN');

  async function api(method, path, body) {
    const res = await fetch(`${directusUrl}${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    return { status: res.status, ok: res.ok, data };
  }

  /** Origen y nombre del proyecto Directus, para que el operador confirme el destino antes de leer la salida. */
  async function target() {
    const res = await api('GET', '/server/info');
    return { origin: new URL(directusUrl).origin, project: res.data?.data?.project?.project_name ?? null };
  }

  // Se lee la lista de campos y no /fields/sermons/<campo>: Directus 11 responde 403 tanto a un campo
  // inexistente como a un token sin permisos, y aquí un "no existe" falso no debe pasar en silencio.
  async function check() {
    const res = await api('GET', '/fields/sermons');
    if (!res.ok || !Array.isArray(res.data?.data)) {
      throw new Error(`No se pudo leer el esquema de sermons (HTTP ${res.status}): token sin permisos o destino equivocado`);
    }
    const field = res.data.data.find(f => f.field === FIELD);
    return field ? { exists: true, type: field.type } : { exists: false };
  }

  async function apply() {
    const current = await check();
    if (current.exists) {
      if (current.type !== 'json') throw new Error(`Ya existe sermons.${FIELD} con tipo ${current.type}; se esperaba json`);
      return { created: false };
    }
    const res = await api('POST', '/fields/sermons', FIELD_DEFINITION);
    if (!res.ok) throw new Error(`No se pudo crear sermons.${FIELD}: HTTP ${res.status} ${JSON.stringify(res.data)}`);
    const after = await check();
    if (!after.exists || after.type !== 'json') throw new Error(`sermons.${FIELD} no quedó creado como json`);
    return { created: true };
  }

  // Borrar el campo no deja revisiones por sermón: la salida registra las protecciones que se pierden.
  async function revert() {
    if (!(await check()).exists) return { removed: false, lostLocks: [] };
    const query = new URLSearchParams({ [`filter[${FIELD}][_nnull]`]: 'true', fields: `youtube_id,${FIELD}`, limit: '-1' });
    const locked = await api('GET', `/items/sermons?${query}`);
    if (!locked.ok) throw new Error(`No se pudieron listar las protecciones antes de revertir: HTTP ${locked.status}`);
    const lostLocks = (locked.data?.data ?? []).map(s => ({ youtube_id: s.youtube_id, [FIELD]: s[FIELD] }));
    const res = await api('DELETE', `/fields/sermons/${FIELD}`);
    if (!res.ok) throw new Error(`No se pudo eliminar sermons.${FIELD}: HTTP ${res.status}`);
    return { removed: true, lostLocks };
  }

  async function findSermon(youtubeId) {
    const query = new URLSearchParams({ 'filter[youtube_id][_eq]': youtubeId, fields: `id,youtube_id,${FIELD}`, limit: '2' });
    const res = await api('GET', `/items/sermons?${query}`);
    if (!res.ok) throw new Error(`No se pudo leer el sermón ${youtubeId}: HTTP ${res.status}`);
    const rows = res.data?.data ?? [];
    if (rows.length !== 1) throw new Error(`Se esperaba 1 sermón con youtube_id ${youtubeId} y hay ${rows.length} sermones`);
    return rows[0];
  }

  async function setLocks(youtubeId, field, add) {
    if (!LOCKABLE_FIELDS.includes(field)) {
      throw new Error(`El campo ${field} no se puede proteger; opciones: ${LOCKABLE_FIELDS.join(', ')}`);
    }
    if (!(await check()).exists) throw new Error(`sermons.${FIELD} no existe: ejecute apply primero`);
    const sermon = await findSermon(youtubeId);
    const before = sermon[FIELD] ?? null;
    // Igual que la sync: un valor mal formado no se interpreta como "sin protección" ni se pisa.
    if (before !== null && !(Array.isArray(before) && before.every(f => LOCKABLE_FIELDS.includes(f)))) {
      throw new Error(`${FIELD} de ${youtubeId} tiene un valor inválido (${JSON.stringify(before)}); corríjalo en Directus antes de continuar`);
    }
    const set = new Set(before ?? []);
    if (add) set.add(field); else set.delete(field);
    const next = LOCKABLE_FIELDS.filter(f => set.has(f));
    const after = next.length > 0 ? next : null;
    if (JSON.stringify(after) === JSON.stringify(before)) return { youtube_id: youtubeId, before, after, changed: false };
    const res = await api('PATCH', `/items/sermons/${sermon.id}`, { [FIELD]: after });
    if (!res.ok) throw new Error(`No se pudo actualizar ${youtubeId}: HTTP ${res.status}`);
    const saved = (await findSermon(youtubeId))[FIELD] ?? null;
    if (JSON.stringify(saved) !== JSON.stringify(after)) throw new Error(`La protección de ${youtubeId} no quedó guardada`);
    return { youtube_id: youtubeId, before, after, changed: true };
  }

  return {
    target,
    check,
    apply,
    revert,
    lock: (youtubeId, field) => setLocks(youtubeId, field, true),
    unlock: (youtubeId, field) => setLocks(youtubeId, field, false),
  };
}

async function main([command, ...args]) {
  const migration = createMigration({ directusUrl: process.env.DIRECTUS_URL, token: process.env.DIRECTUS_ADMIN_TOKEN });
  const commands = {
    check: () => migration.check(),
    apply: () => migration.apply(),
    revert: () => migration.revert(),
    lock: () => migration.lock(args[0], args[1]),
    unlock: () => migration.unlock(args[0], args[1]),
  };
  // Validaciones antes de cualquier conexión.
  if (!commands[command]) throw new Error('Uso: check | apply | lock <youtube_id> <campo> | unlock <youtube_id> <campo> | revert --yes');
  if (command === 'revert' && args[0] !== '--yes') throw new Error('revert elimina el campo y todas las protecciones: confirme con --yes');
  const target = await migration.target();
  console.log(JSON.stringify({ command, args, target, result: await commands[command]() }));
}

// CLI por archivo o por stdin (`node --input-type=module -`); al importarlo (pruebas) no hace nada.
const invokedPath = process.argv[1];
if (invokedPath === '-' || (invokedPath && import.meta.url === pathToFileURL(resolve(invokedPath)).href)) {
  main(process.argv.slice(2)).catch(err => {
    console.error(JSON.stringify({ error: err.message }));
    process.exit(1);
  });
}
