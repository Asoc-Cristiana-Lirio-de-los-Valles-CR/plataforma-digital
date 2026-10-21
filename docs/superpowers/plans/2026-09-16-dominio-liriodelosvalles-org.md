# Habilitar liriodelosvalles.org como mirror — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hacer que `liriodelosvalles.org` (y `www.`, `admin.`, `api.`) sirvan el mismo contenido que sus equivalentes `.cr`, vía un certificado SSL SAN único y reglas nginx actualizadas, con canonical self-referencing en Next.js.

**Architecture:** DNS ya está correcto (zonas Cloudflare activas, mismos registros A). El fix real es: (1) certificado Origin CA con SANs de ambos dominios, reemplazando el actual en `/etc/nginx/ssl` del VPS; (2) `server_name` de nginx ampliado en los dos vhosts (`nextjs.conf`, `directus.conf`); (3) `generateMetadata` dinámico en el layout raíz de Next.js para que `metadataBase` (y por tanto el canonical) se derive del `Host` real de cada petición.

**Tech Stack:** Cloudflare API (Origin CA Certificates), OpenSSL, nginx (Alpine, en Docker), Next.js 15 App Router (`generateMetadata`), SSH a VPS Ubuntu 24.04.

**Spec:** `docs/superpowers/specs/2026-09-16-dominio-liriodelosvalles-org-design.md`

## Global Constraints

- No se elimina el certificado anterior hasta confirmar en producción que el nuevo cert funciona en ambos dominios (condición del usuario).
- Backup del `.pem`/`.key` actual obligatorio antes de tocar nada en `/etc/nginx/ssl`.
- `nginx -t` debe pasar antes de cualquier `nginx -s reload` / restart del contenedor. Si falla, no se aplica el reload.
- Sin cambios en PostgreSQL, Directus (colecciones/roles/flows) ni datos.
- Sin redirect: `liriodelosvalles.org` sirve contenido directamente (mirror), no 301.
- Canonical debe ser self-referencing por host, no fijo a un dominio.
- VPS: `lirio@20.12.207.240`, clave `/c/Users/MEGALAPTOP/.ssh/lirio_azure_key` (ya verificada), proyecto en `/opt/lirio/app`.
- Cloudflare API token vigente: variable `cfut_...` extraíble de `credenciales.txt` vía `grep -o 'cfut_[A-Za-z0-9]*' credenciales.txt | head -1` (no imprimir el valor en logs/output).
- Zone IDs ya confirmados: `liriodelosvallescr.org` = `3a8d6e6cffcc490fd9eb39621a0b5877`, `liriodelosvalles.org` = `af6b05af9dac1273a1026b41df474aaa`.

---

### Task 1: Generar y validar el certificado SAN vía Cloudflare Origin CA

**Files:**
- Create (local, scratchpad — nunca en el repo): CSR, clave privada temporal, cert firmado.
- No se modifica ningún archivo del repo en esta tarea.

**Interfaces:**
- Produces: archivo `origin-san.pem` (cert firmado por Cloudflare) y `origin-san.key` (clave privada) en el scratchpad, listos para subir al VPS en la Tarea 2.

- [ ] **Step 1: Generar clave privada y CSR con SANs de los 4 hosts**

En el scratchpad (`C:\Users\MEGALAPTOP\AppData\Local\Temp\claude\...\scratchpad`, o el que la sesión tenga asignado):

```bash
mkdir -p /tmp/lirio-cert && cd /tmp/lirio-cert
cat > san.cnf <<'EOF'
[req]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = dn
req_extensions = req_ext

[dn]
CN = liriodelosvallescr.org

[req_ext]
subjectAltName = @alt_names

[alt_names]
DNS.1 = liriodelosvallescr.org
DNS.2 = www.liriodelosvallescr.org
DNS.3 = liriodelosvalles.org
DNS.4 = www.liriodelosvalles.org
EOF

openssl req -new -newkey rsa:2048 -nodes \
  -keyout origin-san.key \
  -out origin-san.csr \
  -config san.cnf
```

Nota: usar el path real del scratchpad de la sesión, no `/tmp` literal, salvo que la sesión corra en un entorno donde `/tmp` sea válido (WSL/Git Bash sobre Windows sí lo resuelve dentro de su propio filesystem temporal — confirmar con `pwd` tras el `mkdir`).

- [ ] **Step 2: Verificar el CSR contiene los 4 SANs**

```bash
openssl req -in origin-san.csr -noout -text | grep -A1 "Subject Alternative Name"
```

Expected: línea con los 4 `DNS:` listados.

- [ ] **Step 3: Enviar el CSR a Cloudflare Origin CA vía API**

```bash
TOKEN=$(grep -o 'cfut_[A-Za-z0-9]*' /c/Proyectos/liriodelosvallescr.org/credenciales.txt | head -1)
CSR_JSON=$(node -e "console.log(JSON.stringify(require('fs').readFileSync('origin-san.csr','utf8')))")

curl -s -X POST "https://api.cloudflare.com/client/v4/certificates" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"hostnames\":[\"liriodelosvallescr.org\",\"www.liriodelosvallescr.org\",\"liriodelosvalles.org\",\"www.liriodelosvalles.org\"],\"requested_validity\":5475,\"request_type\":\"origin-rsa\",\"csr\":$CSR_JSON}" \
  > cf-response.json

cat cf-response.json | node -e '
let data="";process.stdin.on("data",d=>data+=d);process.stdin.on("end",()=>{
  const j = JSON.parse(data);
  console.log("success:", j.success);
  if (!j.success) { console.log(JSON.stringify(j.errors)); process.exit(1); }
  require("fs").writeFileSync("origin-san.pem", j.result.certificate);
  console.log("cert escrito en origin-san.pem, id:", j.result.id);
})'
```

Expected: `success: true` y el archivo `origin-san.pem` creado.

- [ ] **Step 4: Validar el certificado con OpenSSL — SANs, fechas, y match con la key**

```bash
echo "=== SANs del certificado ==="
openssl x509 -in origin-san.pem -noout -text | grep -A1 "Subject Alternative Name"

echo "=== Fechas de validez ==="
openssl x509 -in origin-san.pem -noout -dates

echo "=== Modulus del cert ==="
openssl x509 -in origin-san.pem -noout -modulus | openssl md5

echo "=== Modulus de la key (debe coincidir) ==="
openssl rsa -in origin-san.key -noout -modulus | openssl md5
```

Expected:
- Los 4 SANs presentes.
- `notBefore` ≈ hoy, `notAfter` ≈ +15 años.
- Los dos hashes MD5 del modulus son **idénticos** (confirma que cert y key corresponden).

Si cualquiera de estas验证 falla, **detener la tarea** y no continuar a la Tarea 2 — no se sube un cert no validado al VPS.

- [ ] **Step 5: Confirmar que los archivos no quedan en el repo**

```bash
cd /c/Proyectos/liriodelosvallescr.org && git status --short
```

Expected: sin cambios (los archivos viven solo en el scratchpad, nunca se copiaron al repo).

---

### Task 2: Backup del certificado actual e instalación del nuevo cert en el VPS

**Files:**
- Modify (en el VPS, fuera del repo): `/etc/nginx/ssl/liriodelosvallescr.org.pem`, `/etc/nginx/ssl/liriodelosvallescr.org.key`
- Create (en el VPS): `/etc/nginx/ssl/backup-2026-09-16/liriodelosvallescr.org.pem`, `.key`

**Interfaces:**
- Consumes: `origin-san.pem` y `origin-san.key` de la Task 1.
- Produces: cert SAN activo en `/etc/nginx/ssl/`, backup del anterior conservado.

- [ ] **Step 1: Backup del cert/key actuales en el VPS**

```bash
ssh -i /c/Users/MEGALAPTOP/.ssh/lirio_azure_key lirio@20.12.207.240 '
set -e
sudo mkdir -p /etc/nginx/ssl/backup-2026-09-16
sudo cp /etc/nginx/ssl/liriodelosvallescr.org.pem /etc/nginx/ssl/backup-2026-09-16/
sudo cp /etc/nginx/ssl/liriodelosvallescr.org.key /etc/nginx/ssl/backup-2026-09-16/
ls -la /etc/nginx/ssl/backup-2026-09-16/
'
```

Expected: ambos archivos listados en el directorio de backup con el mismo tamaño que los originales.

- [ ] **Step 2: Verificar integridad del backup (comparar hash con el original)**

```bash
ssh -i /c/Users/MEGALAPTOP/.ssh/lirio_azure_key lirio@20.12.207.240 '
sha256sum /etc/nginx/ssl/liriodelosvallescr.org.pem /etc/nginx/ssl/backup-2026-09-16/liriodelosvallescr.org.pem
sha256sum /etc/nginx/ssl/liriodelosvallescr.org.key /etc/nginx/ssl/backup-2026-09-16/liriodelosvallescr.org.key
'
```

Expected: cada par de hashes (original vs. backup) es idéntico.

- [ ] **Step 3: Copiar el nuevo cert SAN al VPS (SIN sobrescribir todavía los nombres activos)**

```bash
scp -i /c/Users/MEGALAPTOP/.ssh/lirio_azure_key \
  /tmp/lirio-cert/origin-san.pem \
  /tmp/lirio-cert/origin-san.key \
  lirio@20.12.207.240:/tmp/

ssh -i /c/Users/MEGALAPTOP/.ssh/lirio_azure_key lirio@20.12.207.240 '
sudo mv /tmp/origin-san.pem /etc/nginx/ssl/origin-san.pem
sudo mv /tmp/origin-san.key /etc/nginx/ssl/origin-san.key
sudo chown root:root /etc/nginx/ssl/origin-san.pem /etc/nginx/ssl/origin-san.key
sudo chmod 644 /etc/nginx/ssl/origin-san.pem
sudo chmod 600 /etc/nginx/ssl/origin-san.key
ls -la /etc/nginx/ssl/
'
```

Expected: `origin-san.pem` (644) y `origin-san.key` (600) presentes junto a los archivos actuales, sin tocarlos todavía.

- [ ] **Step 4: Reemplazar los archivos activos por los nuevos (mismo nombre que nginx espera)**

nginx referencia `/etc/nginx/ssl/liriodelosvallescr.org.pem` y `.key` por nombre fijo en los `.conf`. Para no tener que editar esas rutas (y mantener el diff de nginx mínimo, solo `server_name`), se sobrescriben esos dos nombres con el contenido del cert SAN:

```bash
ssh -i /c/Users/MEGALAPTOP/.ssh/lirio_azure_key lirio@20.12.207.240 '
set -e
sudo cp /etc/nginx/ssl/origin-san.pem /etc/nginx/ssl/liriodelosvallescr.org.pem
sudo cp /etc/nginx/ssl/origin-san.key /etc/nginx/ssl/liriodelosvallescr.org.key
sudo chown root:root /etc/nginx/ssl/liriodelosvallescr.org.pem /etc/nginx/ssl/liriodelosvallescr.org.key
sudo chmod 644 /etc/nginx/ssl/liriodelosvallescr.org.pem
sudo chmod 600 /etc/nginx/ssl/liriodelosvallescr.org.key
'
```

- [ ] **Step 5: Validar en el VPS que el archivo activo es ahora el cert SAN**

```bash
ssh -i /c/Users/MEGALAPTOP/.ssh/lirio_azure_key lirio@20.12.207.240 '
openssl x509 -in /etc/nginx/ssl/liriodelosvallescr.org.pem -noout -text | grep -A1 "Subject Alternative Name"
'
```

Expected: los 4 SANs aparecen en el archivo que nginx va a cargar.

---

### Task 3: Ampliar server_name en nginx y validar con nginx -t antes de reload

**Files:**
- Modify: `nginx/conf.d/nextjs.conf`
- Modify: `nginx/conf.d/directus.conf`

**Interfaces:**
- Consumes: cert SAN ya activo en `/etc/nginx/ssl/liriodelosvallescr.org.*` (Task 2).
- Produces: nginx sirviendo Next.js/Directus en ambos dominios.

- [ ] **Step 1: Editar `nginx/conf.d/nextjs.conf` — agregar los hosts .valles a ambos server_name**

Reemplazar las dos líneas `server_name liriodelosvallescr.org www.liriodelosvallescr.org;` (líneas 3 y 9) por:

```nginx
    server_name liriodelosvallescr.org www.liriodelosvallescr.org liriodelosvalles.org www.liriodelosvalles.org;
```

- [ ] **Step 2: Editar `nginx/conf.d/directus.conf` — agregar los hosts .valles a ambos server_name**

Reemplazar las dos líneas `server_name admin.liriodelosvallescr.org api.liriodelosvallescr.org;` (líneas 3 y 9) por:

```nginx
    server_name admin.liriodelosvallescr.org api.liriodelosvallescr.org admin.liriodelosvalles.org api.liriodelosvalles.org;
```

- [ ] **Step 3: Commit del cambio de nginx en el repo (local)**

```bash
cd /c/Proyectos/liriodelosvallescr.org
git add nginx/conf.d/nextjs.conf nginx/conf.d/directus.conf
git commit -m "$(cat <<'EOF'
feat(nginx): servir liriodelosvalles.org como mirror del sitio público

Agrega los hostnames de liriodelosvalles.org (raíz, www, admin, api) a
los server_name existentes. Mismo proxy_pass, mismo cert SSL (ahora SAN
con ambos dominios). DNS ya estaba correcto; nginx no reconocía el host
y caía al vhost de Directus por defecto.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 4: Desplegar el cambio de nginx al VPS (fuera del flujo normal de CI/CD, que solo reconstruye nextjs)**

```bash
git push origin main

ssh -i /c/Users/MEGALAPTOP/.ssh/lirio_azure_key lirio@20.12.207.240 '
cd /opt/lirio/app
git fetch origin
git checkout main
git pull origin main
'
```

- [ ] **Step 5: Validar sintaxis de nginx ANTES de recargar — condición dura del usuario**

```bash
ssh -i /c/Users/MEGALAPTOP/.ssh/lirio_azure_key lirio@20.12.207.240 '
cd /opt/lirio/app
docker compose exec nginx nginx -t
'
```

Expected: `nginx: configuration file /etc/nginx/nginx.conf test is successful`

**Si falla: detener aquí. No ejecutar el Step 6. Reportar el error de sintaxis y corregir antes de continuar.**

- [ ] **Step 6: Recargar nginx (solo si Step 5 fue exitoso)**

```bash
ssh -i /c/Users/MEGALAPTOP/.ssh/lirio_azure_key lirio@20.12.207.240 '
cd /opt/lirio/app
docker compose exec nginx nginx -s reload
'
```

- [ ] **Step 7: Verificación HTTP inmediata de los 8 hosts requeridos**

```bash
for host in liriodelosvallescr.org www.liriodelosvallescr.org liriodelosvalles.org www.liriodelosvalles.org admin.liriodelosvallescr.org admin.liriodelosvalles.org api.liriodelosvallescr.org api.liriodelosvalles.org; do
  echo "=== $host ==="
  curl -s -o /dev/null -w "HTTP %{http_code}\n" --max-time 10 "https://$host"
done
```

Expected: todos responden `200` o `301`/`302` esperado (Directus en `/` suele redirigir a `/admin`), sin errores de conexión SSL ni timeout.

- [ ] **Step 8: Confirmar que liriodelosvalles.org ya sirve Next.js, no Directus**

```bash
curl -sI --max-time 10 https://liriodelosvalles.org | grep -i "x-powered-by\|location"
```

Expected: **ausencia** de `X-Powered-By: Directus` y de `Location: ./admin`. Debe verse header propio de Next.js (o ninguno de esos dos) — comparar contra:

```bash
curl -sI --max-time 10 https://liriodelosvallescr.org | grep -i "x-powered-by\|location"
```

que debe dar el mismo resultado (ambos sirviendo el mismo Next.js).

- [ ] **Step 9: Confirmar que admin.liriodelosvalles.org sigue sirviendo Directus correctamente**

```bash
curl -sI --max-time 10 https://admin.liriodelosvalles.org | grep -i "x-powered-by\|location"
```

Expected: `X-Powered-By: Directus` presente (es Directus, y eso es correcto para este subdominio).

---

### Task 4: Canonical self-referencing en Next.js

**Files:**
- Modify: `nextjs/src/app/[locale]/layout.tsx:28,35-69`
- Test: `nextjs/src/app/[locale]/__tests__/layout.metadata.test.ts` (nuevo)

**Interfaces:**
- Consumes: `headers()` de `next/headers` (ya importado en el archivo).
- Produces: `generateMetadata(): Promise<Metadata>` exportado en reemplazo de la constante `metadata`. Ninguna otra ruta cambia — heredan `metadataBase` del layout raíz según el comportamiento estándar de Next.js.

- [ ] **Step 1: Escribir el test que falla — metadataBase debe reflejar el host de la petición**

Crear `nextjs/src/app/[locale]/__tests__/layout.metadata.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';

vi.mock('next/headers', () => ({
  headers: vi.fn(),
}));

vi.mock('next-intl/server', () => ({
  getMessages: vi.fn().mockResolvedValue({}),
}));

vi.mock('@/lib/directus', () => ({
  getChurchInfo: vi.fn().mockResolvedValue({ name: 'Test Church' }),
}));

import { headers } from 'next/headers';

describe('generateMetadata — canonical self-referencing', () => {
  it('usa el host liriodelosvalles.org cuando la petición llega por ese dominio', async () => {
    (headers as any).mockResolvedValue(
      new Map([
        ['x-forwarded-host', 'liriodelosvalles.org'],
        ['host', 'liriodelosvalles.org'],
      ])
    );

    const { generateMetadata } = await import('../layout');
    const metadata = await generateMetadata();

    expect(metadata.metadataBase?.toString()).toBe('https://liriodelosvalles.org/');
  });

  it('usa el host liriodelosvallescr.org cuando la petición llega por ese dominio', async () => {
    (headers as any).mockResolvedValue(
      new Map([
        ['x-forwarded-host', 'liriodelosvallescr.org'],
        ['host', 'liriodelosvallescr.org'],
      ])
    );

    const { generateMetadata } = await import('../layout');
    const metadata = await generateMetadata();

    expect(metadata.metadataBase?.toString()).toBe('https://liriodelosvallescr.org/');
  });

  it('cae al fallback fijo si no hay headers de host disponibles', async () => {
    (headers as any).mockResolvedValue(new Map());

    const { generateMetadata } = await import('../layout');
    const metadata = await generateMetadata();

    expect(metadata.metadataBase?.toString()).toBe('https://liriodelosvallescr.org/');
  });
});
```

- [ ] **Step 2: Ejecutar el test y verificar que falla**

```bash
cd nextjs && npx vitest run src/app/[locale]/__tests__/layout.metadata.test.ts
```

Expected: FAIL — `generateMetadata` no existe como export nombrado todavía (el archivo solo exporta `metadata`).

- [ ] **Step 3: Implementar generateMetadata en el layout raíz**

En `nextjs/src/app/[locale]/layout.tsx`, reemplazar (líneas 28 y 35-69):

```typescript
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://liriodelosvallescr.org';
```

y el bloque `export const metadata: Metadata = { ... }` por:

```typescript
const FALLBACK_SITE_URL = 'https://liriodelosvallescr.org';

export const viewport = {
  themeColor: '#461a7a',
  viewportFit: 'cover',
};

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const host = headersList.get('x-forwarded-host') ?? headersList.get('host');
  const siteUrl = host ? `https://${host}` : (process.env.NEXT_PUBLIC_SITE_URL ?? FALLBACK_SITE_URL);

  return {
    title: {
      default: 'Iglesia Cristiana Lirio de los Valles',
      template: '%s | Lirio de los Valles',
    },
    description: 'Iglesia Cristiana Lirio de los Valles — Comunidad de fe en San José, Costa Rica. Servicios, transmisiones en vivo y más.',
    metadataBase: new URL(siteUrl),
    keywords: ['iglesia', 'cristiana', 'lirio de los valles', 'costa rica', 'san josé', 'fe', 'comunidad'],
    openGraph: {
      type: 'website',
      url: siteUrl,
      siteName: 'Iglesia Cristiana Lirio de los Valles',
      title: 'Iglesia Cristiana Lirio de los Valles',
      description: 'Comunidad de fe en Costa Rica. Bienvenido a casa.',
      locale: 'es_CR',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Iglesia Cristiana Lirio de los Valles',
      description: 'Comunidad de fe en Costa Rica. Bienvenido a casa.',
    },
    robots: {
      index: true,
      follow: true,
    },
    manifest: '/manifest.webmanifest',
    icons: {
      apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
    },
    appleWebApp: {
      capable: true,
      title: 'Portal Lirio',
      statusBarStyle: 'black-translucent',
    },
  };
}
```

Nota: `viewport` se mantiene como export estático separado (no depende del host). El resto del archivo (`LocaleLayout` y su uso de `headers()` para `x-pathname`) no cambia.

- [ ] **Step 4: Ejecutar el test y verificar que pasa**

```bash
cd nextjs && npx vitest run src/app/[locale]/__tests__/layout.metadata.test.ts
```

Expected: PASS en los 3 casos.

- [ ] **Step 5: Correr la suite completa de tests unitarios para descartar regresiones**

```bash
cd nextjs && npm test
```

Expected: todos los tests pasan (ninguna otra ruta llama a `metadata` importándolo directamente del layout raíz — Next.js resuelve `generateMetadata` por convención de nombre de export).

- [ ] **Step 6: Commit**

```bash
cd /c/Proyectos/liriodelosvallescr.org
git add nextjs/src/app/\[locale\]/layout.tsx nextjs/src/app/\[locale\]/__tests__/layout.metadata.test.ts
git commit -m "$(cat <<'EOF'
feat(seo): canonical self-referencing por host en metadataBase

generateMetadata reemplaza el export estático metadata para derivar
metadataBase del header host de cada petición (x-forwarded-host primero,
por Cloudflare/nginx). Necesario para que liriodelosvalles.org y
liriodelosvallescr.org se autorreferencien como canonical, en vez de
apuntar siempre al dominio fijo en NEXT_PUBLIC_SITE_URL.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 7: Push y esperar el deploy automático (CI/CD reconstruye solo nextjs)**

```bash
git push origin main
```

El workflow `deploy-prod.yml` reconstruye y reinicia el contenedor `nextjs` automáticamente al hacer push a `main`. Esperar a que termine (revisar en GitHub Actions) antes de la Task 5.

- [ ] **Step 8: Verificar canonical en producción para ambos dominios**

```bash
echo "=== liriodelosvalles.org ==="
curl -s --max-time 10 https://liriodelosvalles.org | grep -o '<link rel="canonical"[^>]*>'

echo "=== liriodelosvallescr.org ==="
curl -s --max-time 10 https://liriodelosvallescr.org | grep -o '<link rel="canonical"[^>]*>'
```

Expected: cada uno muestra su propio dominio en el `href` (self-referencing), no un dominio fijo compartido.

---

### Task 5: Verificación final, limpieza condicionada y documentación

**Files:**
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: resultados de las Tasks 1-4.
- Produces: `CLAUDE.md` actualizado; certificado anterior conservado (no se borra en esta tarea, por condición explícita del usuario).

- [ ] **Step 1: Checklist de verificación completa (los 12 puntos pedidos por el usuario)**

```bash
echo "1) nginx -t"
ssh -i /c/Users/MEGALAPTOP/.ssh/lirio_azure_key lirio@20.12.207.240 'cd /opt/lirio/app && docker compose exec nginx nginx -t'

echo "2) Backup existe"
ssh -i /c/Users/MEGALAPTOP/.ssh/lirio_azure_key lirio@20.12.207.240 'ls -la /etc/nginx/ssl/backup-2026-09-16/'

echo "3) Los 8 hosts responden"
for host in liriodelosvallescr.org www.liriodelosvallescr.org liriodelosvalles.org www.liriodelosvalles.org admin.liriodelosvallescr.org admin.liriodelosvalles.org api.liriodelosvallescr.org api.liriodelosvalles.org; do
  echo "--- $host ---"
  curl -s -o /dev/null -w "HTTP %{http_code}\n" --max-time 10 "https://$host"
done

echo "4) liriodelosvalles.org ya NO es Directus"
curl -sI --max-time 10 https://liriodelosvalles.org | grep -i "x-powered-by\|location" || echo "(sin headers de Directus — correcto)"

echo "5) Canonical self-referencing"
curl -s --max-time 10 https://liriodelosvalles.org | grep -o '<link rel="canonical"[^>]*>'
curl -s --max-time 10 https://liriodelosvallescr.org | grep -o '<link rel="canonical"[^>]*>'

echo "6) Directus sigue funcionando en ambos dominios admin"
curl -sI --max-time 10 https://admin.liriodelosvallescr.org | head -1
curl -sI --max-time 10 https://admin.liriodelosvalles.org | head -1
```

Expected: todo en verde según lo descrito en cada paso anterior de las Tasks 3 y 4. **Si algo falla, no continuar con Step 2 — volver a la tarea correspondiente.**

- [ ] **Step 2: Actualizar CLAUDE.md — Arquitectura de Dominios**

En `CLAUDE.md`, sección `## Arquitectura de Dominios`, reemplazar el bloque de código por:

```
liriodelosvallescr.org        → Next.js (sitio público)
liriodelosvalles.org          → Next.js (mirror del sitio público, mismo contenido, canonical self-referencing)
admin.liriodelosvallescr.org  → Directus (panel administración)
admin.liriodelosvalles.org    → Directus (mismo panel, mirror)
radio.liriodelosvallescr.org  → AzuraCast (radio online — Fase 3)
api.liriodelosvallescr.org    → Directus API
api.liriodelosvalles.org      → Directus API (mirror)
stats.liriodelosvallescr.org  → Umami (analytics — perfil opcional)
```

- [ ] **Step 3: Actualizar CLAUDE.md — tabla de cambios a nivel de host**

En `CLAUDE.md`, sección `### Cambios a nivel de host`, agregar una fila a la tabla:

```
| 2026-09-16 | Certificado Origin CA reemplazado por uno SAN cubriendo `liriodelosvallescr.org` + `www` + `liriodelosvalles.org` + `www`; `server_name` ampliado en `nginx/conf.d/nextjs.conf` y `directus.conf` | Habilitar `liriodelosvalles.org` (dominio adicional legítimo de la iglesia) como mirror del sitio público, sin romper `liriodelosvallescr.org` | Cert anterior respaldado en `/etc/nginx/ssl/backup-2026-09-16/` en el VPS, no eliminado. `nginx -t` validado antes de cada reload. Canonical self-referencing agregado en Next.js (`generateMetadata` en el layout raíz) |
```

- [ ] **Step 4: Actualizar CLAUDE.md — Estado del stack**

En `CLAUDE.md`, sección `## Estado del stack (2026-05-15)`, agregar una línea:

```
- Canonical SEO self-referencing por host (`generateMetadata` en `[locale]/layout.tsx`, usa `x-forwarded-host`) — soporta multi-dominio (`liriodelosvallescr.org` + `liriodelosvalles.org`) sin contenido duplicado
```

- [ ] **Step 5: Commit de la documentación**

```bash
cd /c/Proyectos/liriodelosvallescr.org
git add CLAUDE.md
git commit -m "$(cat <<'EOF'
docs: registrar liriodelosvalles.org y cambio de cert SAN en CLAUDE.md

Documenta el nuevo dominio mirror, el reemplazo del certificado Origin
CA (ahora SAN con 4 hostnames) y el canonical self-referencing, según
la Regla de registro de cambios a nivel de host.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
git push origin main
```

- [ ] **Step 6: Confirmar que NO se requiere registro cruzado en ningún tenant (Regla #0)**

Este cambio toca únicamente nginx, cert SSL y Next.js de esta plataforma, y una zona Cloudflare adicional de la propia iglesia — no afecta recursos de ningún tenant (`Sistema-Eventos-LiriodelosValles` no usa tráfico ni Nginx compartido según su estado actual). No se requiere ninguna acción en el repo del tenant.

- [ ] **Step 7: Dejar constancia explícita de que el cert anterior NO se elimina en esta tarea**

El archivo `/etc/nginx/ssl/backup-2026-09-16/` en el VPS queda como respaldo indefinido hasta que el usuario confirme, en una sesión posterior, que quiere liberarlo — no se programa ninguna limpieza automática. Reportar esto explícitamente al usuario al cerrar la tarea.
