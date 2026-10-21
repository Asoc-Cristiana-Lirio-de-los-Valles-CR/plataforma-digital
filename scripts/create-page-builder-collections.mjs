/**
 * Page Builder — crea colecciones en Directus vía API
 * Uso: node scripts/create-page-builder-collections.mjs
 * Requiere: DIRECTUS_URL y DIRECTUS_ADMIN_TOKEN en el entorno o .env
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load .env manually
try {
  const env = readFileSync(resolve(process.cwd(), '.env'), 'utf8');
  for (const line of env.split('\n')) {
    const [key, ...rest] = line.split('=');
    if (key && !key.startsWith('#') && !process.env[key.trim()]) {
      process.env[key.trim()] = rest.join('=').trim().replace(/^["']|["']$/g, '');
    }
  }
} catch {}

const BASE = process.env.DIRECTUS_URL ?? 'http://localhost:8055';
const TOKEN = process.env.DIRECTUS_ADMIN_TOKEN;

if (!TOKEN) {
  console.error('❌ DIRECTUS_ADMIN_TOKEN no encontrado');
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  'Content-Type': 'application/json',
};

async function api(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  try {
    return { ok: res.ok, status: res.status, data: JSON.parse(text) };
  } catch {
    return { ok: res.ok, status: res.status, data: text };
  }
}

async function createCollection(name, fields, meta = {}) {
  const existing = await api('GET', `/collections/${name}`);
  if (existing.ok) {
    console.log(`⏭  Colección ${name} ya existe, omitiendo`);
    return;
  }
  const res = await api('POST', '/collections', {
    collection: name,
    meta: { icon: 'article', color: '#6d28d9', ...meta },
    schema: { name },
    fields,
  });
  if (res.ok) {
    console.log(`✅ Colección ${name} creada`);
  } else {
    console.error(`❌ Error creando ${name}:`, JSON.stringify(res.data?.errors ?? res.data, null, 2));
  }
}

async function createField(collection, field) {
  const existing = await api('GET', `/fields/${collection}/${field.field}`);
  if (existing.ok) return;
  const res = await api('POST', `/fields/${collection}`, field);
  if (!res.ok) {
    console.error(`❌ Error campo ${collection}.${field.field}:`, JSON.stringify(res.data?.errors ?? res.data, null, 2));
  }
}

async function applyPermissions(collection) {
  // Administrator role already has full access — only need Administrador CMS
  const adminCmsRoleId = '3882241c-6ca8-4c6f-b703-527199fdb013';
  for (const action of ['create', 'read', 'update', 'delete']) {
    const existing = await api('GET', `/permissions?filter[collection][_eq]=${collection}&filter[role][_eq]=${adminCmsRoleId}&filter[action][_eq]=${action}`);
    if (existing.ok && existing.data?.data?.length > 0) continue;
    await api('POST', '/permissions', {
      collection,
      action,
      role: adminCmsRoleId,
      fields: '*',
      permissions: {},
      validation: {},
    });
  }
  console.log(`🔐 Permisos aplicados a ${collection}`);
}

// ─── Colección: pages ────────────────────────────────────────────────────────
await createCollection('pages', [
  { field: 'id', type: 'uuid', meta: { hidden: true, readonly: true }, schema: { is_primary_key: true, has_auto_increment: false } },
  { field: 'status', type: 'string', meta: { interface: 'select-dropdown', options: { choices: [{ text: 'Published', value: 'published' }, { text: 'Draft', value: 'draft' }] }, width: 'half' }, schema: { default_value: 'draft' } },
  { field: 'slug', type: 'string', meta: { interface: 'input', width: 'half', note: 'URL: /es/[slug]. Reservados: api, admin, asociados, historia, biblioteca, ministerios, donaciones, contacto, equipo, en-vivo' }, schema: { is_unique: true } },
  { field: 'title', type: 'string', meta: { interface: 'input', width: 'half', required: true } },
  { field: 'title_en', type: 'string', meta: { interface: 'input', width: 'half' } },
  { field: 'seo_title', type: 'string', meta: { interface: 'input', width: 'half' } },
  { field: 'seo_description', type: 'text', meta: { interface: 'input-multiline', width: 'half' } },
  { field: 'published_at', type: 'timestamp', meta: { interface: 'datetime', width: 'half', nullable: true } },
], { sort_field: 'slug' });

// ─── Colección: block_hero ───────────────────────────────────────────────────
await createCollection('block_hero', [
  { field: 'id', type: 'integer', meta: { hidden: true, readonly: true }, schema: { is_primary_key: true, has_auto_increment: true } },
  { field: 'title', type: 'string', meta: { interface: 'input', width: 'half', required: true } },
  { field: 'title_en', type: 'string', meta: { interface: 'input', width: 'half' } },
  { field: 'subtitle', type: 'text', meta: { interface: 'input-multiline', width: 'half' } },
  { field: 'subtitle_en', type: 'text', meta: { interface: 'input-multiline', width: 'half' } },
  { field: 'background_image', type: 'uuid', meta: { interface: 'file-image', width: 'full' } },
  { field: 'cta_text', type: 'string', meta: { interface: 'input', width: 'half' } },
  { field: 'cta_text_en', type: 'string', meta: { interface: 'input', width: 'half' } },
  { field: 'cta_link', type: 'string', meta: { interface: 'input', width: 'full' } },
], { icon: 'view_carousel', color: '#7c3aed' });

// ─── Colección: block_text ───────────────────────────────────────────────────
await createCollection('block_text', [
  { field: 'id', type: 'integer', meta: { hidden: true, readonly: true }, schema: { is_primary_key: true, has_auto_increment: true } },
  { field: 'heading', type: 'string', meta: { interface: 'input', width: 'half' } },
  { field: 'heading_en', type: 'string', meta: { interface: 'input', width: 'half' } },
  { field: 'content', type: 'text', meta: { interface: 'input-rich-text-md', width: 'half', required: true } },
  { field: 'content_en', type: 'text', meta: { interface: 'input-rich-text-md', width: 'half' } },
  { field: 'alignment', type: 'string', meta: { interface: 'select-dropdown', width: 'full', options: { choices: [{ text: 'Left', value: 'left' }, { text: 'Center', value: 'center' }, { text: 'Right', value: 'right' }] } }, schema: { default_value: 'left' } },
], { icon: 'article', color: '#0891b2' });

// ─── Colección: block_scripture ──────────────────────────────────────────────
await createCollection('block_scripture', [
  { field: 'id', type: 'integer', meta: { hidden: true, readonly: true }, schema: { is_primary_key: true, has_auto_increment: true } },
  { field: 'verse', type: 'text', meta: { interface: 'input-multiline', width: 'half', required: true } },
  { field: 'verse_en', type: 'text', meta: { interface: 'input-multiline', width: 'half' } },
  { field: 'reference', type: 'string', meta: { interface: 'input', width: 'half', required: true } },
  { field: 'background_style', type: 'string', meta: { interface: 'select-dropdown', width: 'half', options: { choices: [{ text: 'Light', value: 'light' }, { text: 'Dark', value: 'dark' }, { text: 'Gold', value: 'gold' }] } }, schema: { default_value: 'gold' } },
], { icon: 'menu_book', color: '#b45309' });

// ─── Campo M2A blocks en pages ───────────────────────────────────────────────
console.log('\n📎 Creando campo M2A blocks en pages...');
const m2aField = await api('POST', '/fields/pages', {
  field: 'blocks',
  type: 'alias',
  meta: {
    interface: 'list-m2a',
    special: ['m2a'],
    options: {
      allowedCollections: ['block_hero', 'block_text', 'block_scripture'],
    },
    width: 'full',
  },
});
if (m2aField.ok || m2aField.data?.errors?.[0]?.message?.includes('already exists')) {
  console.log('✅ Campo M2A blocks creado/existente');
} else {
  console.error('❌ Error campo M2A:', JSON.stringify(m2aField.data?.errors ?? m2aField.data, null, 2));
}

// ─── Permisos ────────────────────────────────────────────────────────────────
console.log('\n🔐 Aplicando permisos...');
for (const col of ['pages', 'block_hero', 'block_text', 'block_scripture', 'pages_blocks']) {
  await applyPermissions(col);
}

console.log('\n🎉 Page Builder listo en Directus!');
console.log('   → Crea tu primera página en: admin.liriodelosvallescr.org/content/pages');
