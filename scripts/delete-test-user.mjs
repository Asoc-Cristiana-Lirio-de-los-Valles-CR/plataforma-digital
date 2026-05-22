#!/usr/bin/env node
// Borra completamente un usuario de prueba del sistema de asociados.
// Uso: node scripts/delete-test-user.mjs liriovisionmedia@gmail.com

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '../.env');
const env = Object.fromEntries(
  readFileSync(envPath, 'utf8').split('\n')
    .filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const BASE = env.NEXT_PUBLIC_DIRECTUS_URL ?? 'http://localhost:8055';
const ROOT_TOKEN = process.env.DIRECTUS_ROOT_TOKEN ?? env.DIRECTUS_ROOT_TOKEN;
const EMAIL = process.env.DIRECTUS_EMAIL ?? env.DIRECTUS_ADMIN_EMAIL;
const PASSWORD = process.env.DIRECTUS_PASSWORD ?? env.DIRECTUS_ADMIN_PASSWORD;
const TARGET = process.argv[2];

if (!TARGET) {
  console.error('Uso: node scripts/delete-test-user.mjs <email>');
  process.exit(1);
}

async function api(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, options);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${options.method ?? 'GET'} ${path} → ${res.status}: ${text}`);
  }
  const ct = res.headers.get('content-type') ?? '';
  return ct.includes('application/json') ? res.json() : null;
}

// 1. Autenticar (usar token estático root si está disponible)
let token;
if (ROOT_TOKEN) {
  console.log('Usando token estático root@...');
  token = ROOT_TOKEN;
} else {
  console.log(`Autenticando como ${EMAIL}...`);
  const { data: auth } = await api('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  token = auth.access_token;
}
const H = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

// 2. Buscar member_profile por email
console.log(`Buscando member_profile de ${TARGET}...`);
const profilesRes = await api(
  `/items/member_profiles?filter[email][_eq]=${encodeURIComponent(TARGET)}&fields=id`,
  { headers: H }
);
const profiles = profilesRes?.data ?? [];

if (profiles.length === 0) {
  console.log('No se encontró member_profile. Verificando directus_users...');
} else {
  const profileId = profiles[0].id;
  console.log(`  Profile ID: ${profileId}`);

  // 3. Borrar member_ministerios
  const minRes = await api(
    `/items/member_ministerios?filter[profile_id][_eq]=${profileId}&fields=id`,
    { headers: H }
  );
  const minIds = (minRes?.data ?? []).map(r => r.id);
  if (minIds.length) {
    console.log(`  Borrando ${minIds.length} member_ministerios...`);
    await api(`/items/member_ministerios`, {
      method: 'DELETE',
      headers: H,
      body: JSON.stringify(minIds),
    });
  } else {
    console.log('  Sin member_ministerios.');
  }

  // 4. Borrar member_accesses
  const accRes = await api(
    `/items/member_accesses?filter[profile_id][_eq]=${profileId}&fields=id`,
    { headers: H }
  );
  const accIds = (accRes?.data ?? []).map(r => r.id);
  if (accIds.length) {
    console.log(`  Borrando ${accIds.length} member_accesses...`);
    await api(`/items/member_accesses`, {
      method: 'DELETE',
      headers: H,
      body: JSON.stringify(accIds),
    });
  } else {
    console.log('  Sin member_accesses.');
  }

  // 5. Borrar member_profile
  console.log(`  Borrando member_profile/${profileId}...`);
  await api(`/items/member_profiles/${profileId}`, { method: 'DELETE', headers: H });
}

// 6. Borrar directus_user
console.log(`Buscando directus_user de ${TARGET}...`);
const usersRes = await api(
  `/users?filter[email][_eq]=${encodeURIComponent(TARGET)}&fields=id`,
  { headers: H }
);
const users = usersRes?.data ?? [];
if (users.length === 0) {
  console.log('  No se encontró directus_user con ese email.');
} else {
  const userId = users[0].id;
  console.log(`  User ID: ${userId}`);
  await api(`/users/${userId}`, { method: 'DELETE', headers: H });
  console.log(`  Directus user borrado.`);
}

console.log(`\n✅ listo — ${TARGET} eliminado del sistema.`);
