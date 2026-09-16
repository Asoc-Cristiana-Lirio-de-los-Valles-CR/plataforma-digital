# Habilitar liriodelosvalles.org como mirror del sitio público

**Fecha:** 2026-09-16
**Estado:** Aprobado por el usuario (condiciones incluidas abajo)

## Contexto

La iglesia es dueña de dos dominios: `liriodelosvallescr.org` (en producción)
y `liriodelosvalles.org` (adicional, legítimo). Ambos ya están agregados como
zonas activas en la misma cuenta de Cloudflare, y `liriodelosvalles.org` ya
tiene registros DNS correctos apuntando al mismo origen
(`20.12.207.240`, proxied, mismo esquema de subdominios `admin`/`api`/`www`).

**Diagnóstico:** el dominio no era inalcanzable por DNS. nginx en el VPS no
tiene `liriodelosvalles.org` en ningún `server_name`
(`nginx/conf.d/nextjs.conf`, `nginx/conf.d/directus.conf`), así que las
peticiones caen al primer `server{}` que nginx evalúa —el de Directus— y
`https://liriodelosvalles.org` devuelve el panel de Directus
(`X-Powered-By: Directus`, redirect a `./admin`) en vez del sitio Next.js.

Cloudflare está en modo **Full (strict)**: el origen debe presentar un
certificado válido para el hostname que llega. El cert actual
(`/etc/nginx/ssl/liriodelosvallescr.org.pem/.key`, montado read-only desde
el host VPS, fuera del repo) solo cubre `liriodelosvallescr.org` y su `www`.

## Decisión de producto

- `liriodelosvalles.org` y `www.liriodelosvalles.org` sirven el **mismo sitio
  Next.js**, sin redirect (mirror).
- `admin.liriodelosvalles.org` y `api.liriodelosvalles.org` sirven Directus,
  igual que sus equivalentes `.cr`.
- SEO: **canonical self-referencing** — cada dominio genera su propia URL
  canónica según el `Host` de la petición entrante, no un dominio fijo.

## Cambios

### 1. Certificado SSL de origen (Cloudflare Origin CA, SAN)

Un solo Origin Certificate cubriendo:
`liriodelosvallescr.org, www.liriodelosvallescr.org, liriodelosvalles.org, www.liriodelosvalles.org`.

Generado vía API de Cloudflare (`POST /client/v4/certificates`, endpoint de
cuenta, no de zona — ya verificado que el token `Zone:DNS:Edit` actual tiene
acceso), con una CSR propia (clave privada generada localmente, nunca sale
del VPS/máquina de despliegue).

**Salvaguardas obligatorias (condición del usuario):**
- Backup de `liriodelosvallescr.org.pem` y `.key` actuales antes de tocar nada.
- Validar el nuevo cert con OpenSSL: SANs correctos, fechas de validez,
  correspondencia módulo n entre cert y key.
- No borrar el cert anterior hasta confirmar en producción que nginx carga
  el nuevo cert y ambos dominios responden correctamente vía Full (strict).

### 2. nginx — server_name

- `nginx/conf.d/nextjs.conf`: agregar `liriodelosvalles.org
  www.liriodelosvalles.org` a los dos bloques `server_name` (HTTP redirect a
  HTTPS, y HTTPS). Mismo `ssl_certificate`/`ssl_certificate_key` (el nuevo
  SAN), mismo `proxy_pass http://nextjs:3000`.
- `nginx/conf.d/directus.conf`: agregar `admin.liriodelosvalles.org
  api.liriodelosvalles.org` a los dos bloques `server_name`. Mismo cert SAN,
  mismo `proxy_pass http://directus:8055`.
- Antes de cualquier reload: `nginx -t` dentro del contenedor. Si falla, no
  se recarga y se reporta el error sin aplicar cambios.

### 3. Canonical self-referencing (Next.js)

`nextjs/src/app/[locale]/layout.tsx` define hoy `metadata` como objeto
estático con `metadataBase: new URL(siteUrl)`, donde `siteUrl` es
`NEXT_PUBLIC_SITE_URL` o un fallback fijo a `liriodelosvallescr.org`. Esto
hace que toda URL relativa (y cualquier canonical futuro) resuelva siempre
al mismo dominio sin importar el `Host` real.

El layout ya usa `headers()` en el body del componente (para `x-pathname`),
así que el patrón encaja: convertir el `export const metadata` estático en
`export async function generateMetadata()`, leyendo el header `host` (con
`x-forwarded-host` como prioridad, ya que Cloudflare/nginx reenvían ese
header) para construir `metadataBase` dinámicamente por request. El resto
de los campos de metadata no cambia — solo la base de resolución.

No se modifican los 13 archivos que ya llaman `generateMetadata` en rutas
hijas: heredan/mergean sobre el `metadataBase` del layout raíz según el
comportamiento estándar de Next.js App Router.

### 4. Fuera de alcance

- Sin cambios en PostgreSQL, Directus (colecciones/roles/flows) ni datos.
- Sin cambios en DNS (ya está correcto).
- Sin tests Playwright nuevos (cambio de infraestructura/config, no de
  producto o UI).

## Plan de verificación (obligatorio antes de cerrar)

Contra el VPS en producción, tras aplicar los cambios:

1. `nginx -t` exitoso antes de cada reload.
2. Backup del cert/key anterior existe y es íntegro.
3. Nuevo cert validado con OpenSSL (SANs, fechas, match con key) antes de
   instalarlo.
4. Respuesta HTTPS 200/301 esperada (sin errores de cadena SSL) en:
   - `https://liriodelosvallescr.org`
   - `https://www.liriodelosvallescr.org`
   - `https://liriodelosvalles.org`
   - `https://www.liriodelosvalles.org`
   - `https://admin.liriodelosvallescr.org`
   - `https://admin.liriodelosvalles.org`
   - `https://api.liriodelosvallescr.org`
   - `https://api.liriodelosvalles.org`
5. `liriodelosvalles.org` ya NO devuelve `X-Powered-By: Directus` ni
   `Location: ./admin` — responde con los headers de Next.js.
6. Canonical tag en el HTML de `liriodelosvalles.org` apunta a
   `liriodelosvalles.org` (self-referencing), y en `liriodelosvallescr.org`
   apunta a sí mismo.
7. Directus (`admin.*`, `api.*`) sigue funcionando igual en ambos dominios.
8. Certificado anterior se conserva hasta confirmar (5)-(7); no se borra en
   esta tarea.

## Documentación

- Actualizar `CLAUDE.md`:
  - "Arquitectura de Dominios": agregar `liriodelosvalles.org` y sus
    subdominios como mirror.
  - "Infraestructura VM — registro de cambios y tenants" → tabla de
    "Cambios a nivel de host": nueva fila (cert SSL SAN, nginx server_name).
  - Nota en "Estado del stack" sobre el canonical self-referencing.
- Regla #0: este cambio toca únicamente recursos de esta plataforma (su
  propio nginx, su propio cert, su propia zona Cloudflare adicional). No
  toca recursos de ningún tenant, así que no aplica registro cruzado en
  otro repo.
