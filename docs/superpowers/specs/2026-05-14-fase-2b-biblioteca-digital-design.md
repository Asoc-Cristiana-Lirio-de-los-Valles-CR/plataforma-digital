# Fase 2B — Biblioteca Digital de Predicaciones

## Resumen

Biblioteca pública de predicaciones de la Iglesia Cristiana Lirio de los Valles. Importación masiva desde YouTube con curación editorial en Directus. Rutas SSR/ISR en Next.js. Sin exposición directa de YouTube API en runtime público.

**Objetivo:** Convertir el historial de videos del canal de YouTube en una biblioteca navegable, indexada por Google y editorialmente controlada por el admin — sin trabajo manual masivo.

---

## Decisiones clave

| Decisión | Elección | Razón |
|----------|----------|-------|
| Layout | Híbrido (hero + filas por serie + recientes + página individual) | Combina descubrimiento visual con organización editorial |
| Fuente pública | Directus únicamente | YouTube API nunca expuesta en frontend |
| Sync | API route `/api/sync/youtube` + GitHub Actions cron | Reutiliza youtube.ts, sin contenedor extra |
| Alcance de cada sync (rev. 2026-10-21) | Reconciliación completa de la playlist de subidas en cada ejecución (`?full=true` aceptado, sin efecto) | ~45 unidades de cuota para ~1 000 videos; el modo incremental (`publishedAfter`) nunca revisitaba videos ya importados y dejaba títulos viejos |
| Series/predicadores | Admin asigna; sync sugiere (`suggested_*`) | Control editorial sin trabajo manual excesivo |
| Búsqueda | Client-side sobre dataset cargado | Suficiente para 100–1000 predicaciones; sin complejidad extra |
| SW offline | Definida explícitamente antes de cualquier código nuevo | Evita caché accidental de contenido privado |
| Thumbnails | `thumbnail_url` (YouTube) + `manual_thumbnail` (override opcional) | Admin puede reemplazar sin romper frontend |

---

## 1. Estrategia offline PWA (primer bloque — precede todo código nuevo)

Modificación a `next.config.ts` — configuración definitiva de `next-pwa`:

```typescript
runtimeCaching: [
  // App shell y assets estáticos
  { urlPattern: /^\/_next\/static\/.*/i,    handler: 'CacheFirst' },
  { urlPattern: /^\/_next\/image\?.*/i,     handler: 'StaleWhileRevalidate' },
  { urlPattern: /^https:\/\/fonts\./i,      handler: 'CacheFirst' },

  // Thumbnails externos YouTube — con límite de entradas y expiración
  {
    urlPattern: /^https:\/\/i\.ytimg\.com\/.*/i,
    handler: 'StaleWhileRevalidate',
    options: { cacheName: 'yt-thumbs', expiration: { maxEntries: 200, maxAgeSeconds: 604800 } }
  },
  {
    urlPattern: /^https:\/\/img\.youtube\.com\/.*/i,
    handler: 'StaleWhileRevalidate',
    options: { cacheName: 'yt-thumbs', expiration: { maxEntries: 200, maxAgeSeconds: 604800 } }
  },

  // Páginas públicas de la biblioteca — network first
  { urlPattern: /^\/(es|en)\/biblioteca.*/i, handler: 'NetworkFirst' },
]
```

**Nunca cachear (excluidos explícitamente):**
- `^\/api\/.*` — todas las APIs sin excepción
- `^\/(es|en)\/asociados.*` — portal privado
- `youtube\.com\/embed`, `googlevideo\.com`, `youtubei\.googleapis\.com` — embeds y API de YouTube

**Página offline fallback:** `/offline` — estática, cacheada en app shell, visible solo cuando la red falla en rutas públicas. Nunca en rutas `/asociados/*`, `/api/*` ni auth.

---

## 2. Modelo de datos en Directus

### Colección `sermons`

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | uuid | PK |
| `title` | string | Sigue a YouTube mientras `title == raw_youtube_title`; si un editor lo cambió, sync lo conserva (rev. 2026-10-21) |
| `slug` | string | Único; auto-generado del título al crear |
| `youtube_id` | string | Único; `dQw4w9WgXcQ` |
| `youtube_status` | enum: `available \| unavailable` | Sync actualiza |
| `visibility` | enum: `public \| unlisted \| private` | Default: `public` |
| `featured` | boolean | Default: `false` |
| `description` | text | Editable; sync nunca sobreescribe |
| `sermon_date` | date | Fecha UTC de `youtube_published_at`; sync la sigue solo si no fue editada a mano ni está en `sync_locked_fields` |
| `sync_locked_fields` | json (lista) | Campos editoriales que la sync nunca sobrescribe en ese sermón: `sermon_date`, `title`. `null` = sin protección. Migración aditiva del 2026-10-21 (ver abajo) |
| `duration_seconds` | integer | Importado de YouTube |
| `thumbnail_url` | string | `i.ytimg.com/vi/{id}/maxresdefault.jpg` |
| `manual_thumbnail` | M2O directus_files | Override del admin; nullable |
| `preacher` | M2O → `preachers` | nullable |
| `series` | M2O → `sermon_series` | nullable |
| `tags` | M2M → `sermon_tags` | nullable; para temas futuros |
| `suggested_preacher` | string | Sugerencia del sync; admin aprueba o ignora |
| `suggested_series` | string | Sugerencia del sync; admin aprueba o ignora |
| `raw_youtube_title` | string | Último título conocido en YouTube; sync lo actualiza siempre (rev. 2026-10-21) |
| `imported_at` | datetime | Timestamp de primera importación |
| `last_synced_at` | datetime | Timestamp de la última escritura del sync en el registro |
| `youtube_published_at` | datetime | `publishedAt` actual de YouTube (cambia cuando una transmisión pasa a ser pública) |
| `view_count` | integer | Se refresca solo cuando el registro se escribe por otro cambio (no se muestra en la web) |

**Índices:** `youtube_id` UNIQUE, `slug` UNIQUE, índices en `youtube_published_at`, `sermon_date`, `visibility`, `featured`.

**Revisión 2026-10-21 — YouTube es la fuente de verdad de los metadatos que administra.** El sync original nunca actualizaba el título de los registros existentes y su modo incremental no volvía a visitarlos: las transmisiones importadas con el título del servicio anterior quedaban así para siempre en la Biblioteca.

**Campos que sync NUNCA sobreescribe:** `description`, `slug`, `preacher`, `series`, `visibility`, `featured`, `manual_thumbnail`, `tags`, `thumbnail_url`, `suggested_*`, `imported_at`, `sync_locked_fields`. `title` y `sermon_date` se protegen cuando un editor los personalizó o cuando figuran en `sync_locked_fields`.

**Campos protegidos (`sync_locked_fields`, 2026-10-21).** La detección implícita de ediciones manuales no alcanza: si `sermon_date` coincide con la fecha UTC de `youtube_published_at`, no se distingue una fecha editorial válida de una automática. Caso real: el servicio de `D0hL4Ax6juU` fue el 11 de octubre y YouTube terminó de publicar la transmisión a las 00:28 del 12 (hora de Costa Rica); la sync la habría movido al 12. Reglas:
- Se marcan en el panel de Directus los campos a proteger (`sermon_date`, `title`) y Directus registra quién y cuándo en sus revisiones (`sermons` tiene la auditoría por defecto, `accountability = all`: 1646 revisiones al 2026-10-21). **Hoy solo root@ puede editar `sermons`**: la política "Administrador CMS" no tiene permisos sobre la colección. Darle acceso a esa política es una decisión aparte. El token de servicio de la sync y del script pertenece a root@, así que un `lock` por script queda auditado a nombre de root@.
- `unlock` (o desmarcar la casilla) **no devuelve el campo a YouTube**: tras una sync protegida, el valor ya difiere del automático y la regla implícita lo trata como edición manual. Para que la sync vuelva a seguir a YouTube hay que igualar `sermon_date` a la fecha UTC de `youtube_published_at` (o `title` a `raw_youtube_title`).
- `protectedFields` solo informa las escrituras aplicadas (o planificadas en `dry_run`), igual que `changes`. Puede incluir títulos editoriales en el log del cron, que es público. No expone nada nuevo: la política pública ya lee `sermons` con `fields: ["*"]` y sin filtro.
- La sync omite esos campos, sigue actualizando `raw_youtube_title`, `youtube_published_at`, la duración y el estado, e informa cada omisión en `protectedFields` (respuesta, `dry_run` y `activity_logs`) con `kept`, `youtube` y `reason`. `reason` vale `sync_locked_fields` o `manual_edit`.
- **Falla cerrado**: si Directus no devuelve el campo (no existe, falta permiso u otro error de lectura) o trae un valor que no es `null` ni una lista de campos protegibles, la sync aborta antes de escribir nada. Una protección nunca se pierde en silencio.
- No se protege nada automáticamente: el campo nace en `null` para todos los sermones.

**Migración** (`scripts/add-sermons-sync-locked-fields.mjs`; probada contra Directus 11 en el E2E aislado):
- Comandos:
  - `check`: solo lectura. Lee la lista de campos; un 403 se trata como error ("sin permisos o destino equivocado"), nunca como "no existe".
  - `apply`: crea el campo JSON opcional. Es idempotente.
  - `lock <youtube_id> <campo>` y `unlock <youtube_id> <campo>`: idempotentes y verificados con una relectura. Se niegan a pisar un valor mal formado.
  - `revert --yes`: elimina el campo y todas las protecciones. Antes lista en la salida las protecciones que se pierden, porque borrar el campo no deja revisiones por sermón.
  - Cada ejecución imprime el destino: origen y `project_name`.
- En producción se ejecuta **desde Git Bash** (PowerShell 5.1 no admite `<` y altera la codificación), dentro del contenedor para que el token no salga del servidor: `ssh … 'docker exec -i lirio_nextjs node --input-type=module - <comando>' < scripts/add-sermons-sync-locked-fields.mjs`.
- No modifica ningún valor existente. La política pública lee `sermons` con `fields: ["*"]`, así que la lista es visible en la API pública. Solo contiene nombres de campos y no requiere cambiar permisos.
- **Orden de despliegue** (el código anterior, de `9a7b366`, ignora el campo):
  1. Respaldo verificado.
  2. Release del código.
  3. `apply`.
  4. `lock` de los casos aprobados.
  5. `dry_run`.
  6. Sync real autorizada.
  7. Reactivar el cron.

  `sync-sermons.yml` debe seguir **desactivado** hasta el `dry_run` con el código nuevo, porque con la migración aplicada bajo el código anterior, una sync movería la fecha protegida. El código nuevo falla cerrado (no escribe) mientras no exista el campo. La única ventana restante son los segundos entre `apply` y `lock`, que controla el operador con el cron desactivado. Después de la primera sync protegida, la regla implícita también conserva la fecha, así que un rollback del código ya no la altera.

**Videos no disponibles públicamente** (eliminados, privados o inaccesibles; la API no los distingue): sync marca `youtube_status = 'unavailable'` solo tras confirmarlo con `videos.list`, con freno ante marcados masivos (máx. 10 por ejecución y 2 % de los disponibles). No toca `visibility` ni borra el registro. Desaparecen de listas y búsqueda, el detalle responde 404, y se recuperan solos si el video vuelve.

### Colección `preachers`

| Campo | Tipo |
|-------|------|
| `id` | uuid |
| `name` | string |
| `slug` | string UNIQUE |
| `bio` | text nullable |
| `photo` | M2O directus_files nullable |
| `active` | boolean default true |

### Colección `sermon_series`

| Campo | Tipo |
|-------|------|
| `id` | uuid |
| `title` | string |
| `slug` | string UNIQUE |
| `description` | text nullable |
| `cover_image` | M2O directus_files nullable |
| `year` | integer |
| `sort_order` | integer default 0 |
| `active` | boolean default true |

### Colección `sermon_tags`

| Campo | Tipo |
|-------|------|
| `id` | uuid |
| `name` | string |
| `slug` | string UNIQUE |

### Permisos Directus

Rol `publico` (policy pública):
- read `sermons` donde `visibility = 'public'`
- read `preachers` donde `active = true`
- read `sermon_series` donde `active = true`
- read `sermon_tags`

Sin auth requerida. `unlisted` y `private` no accesibles por policy pública.

---

## 3. Arquitectura de sync

### Ruta API

`POST /api/sync/youtube`
- Autenticación: `Authorization: Bearer SYNC_SECRET`
- Rate limit: 1 ejecución real cada 10 minutos (in-memory); `dry_run` no la consume
- Sync lock atómico en Redis (ver abajo): 409 si otra ejecución lo tiene, 503 si Redis no responde (falla cerrado)
- Logs en `activity_logs`: `action: 'youtube_sync'` con `{ inserted, updated, unchanged, unavailable, restored, titleChanges, changes, unavailableIds, unavailableSkipped, errors }`; `action: 'youtube_sync_error'` si la ejecución aborta
- Respuesta: 200 sin errores, 207 si terminó con errores parciales (el cron lo marca como fallido), 500 si abortó sin escribir

**Parámetros (rev. 2026-10-21):**
- Sin parámetros → **reconciliación completa**: recorre toda la playlist de subidas (~45 unidades de cuota para ~1 000 videos). El modo incremental se eliminó porque nunca volvía a visitar los videos existentes.
- `?dry_run=true` → calcula y devuelve el plan sin escribir nada (ni sermones, ni lock, ni logs)
- `?full=true` → aceptado por compatibilidad; equivale a la ejecución normal

### Flujo de sync (rev. 2026-10-21)

```
1. Lecturas (si alguna falla, se aborta sin escribir):
   channels → playlistItems (todas las páginas) → videos.list (snippet, contentDetails, statistics; lotes de 50)
   + todos los sermones existentes de Directus (paginado)
2. Plan, por cada video de la playlist:
   si youtube_id existe → planSermonUpdate (solo campos que cambiaron; nada si no cambió nada):
       raw_youtube_title = título YouTube
       title = título YouTube, solo si title == raw_youtube_title (no personalizado)
       youtube_published_at = publishedAt; sermon_date = su fecha UTC, solo si no fue editada a mano
       duration_seconds si YouTube la informa (> 0) y cambió
       youtube_status = 'available' si estaba 'unavailable' (recuperación)
   si no existe → crea registro (visibility public, featured false, title = raw = título YouTube,
       suggested_preacher / suggested_series por pattern matching, imported_at = last_synced_at = now)
3. No disponibles: sermones 'available' que videos.list no devolvió → segunda verificación con videos.list
   → freno ante marcados masivos → youtube_status = 'unavailable' (visibility intacta)
4. Escrituras: antes de cada una se confirma y renueva el lock; si se perdió, se detiene
```

### Pattern matching para sugerencias

Expresiones regulares simples sobre `raw_youtube_title`. Configurables en array en el código. No ML ni IA.

Ejemplos:
- `"Serie Romanos #3 — El llamado | Pastor José"` → `suggested_series: "Romanos"`, `suggested_preacher: "José"`
- `"AVIVAMIENTO 2023 DIA 2"` → `suggested_series: "Avivamiento 2023"`
- `"Culto Domingo AM"` → sin sugerencia

### Sync lock (Redis) — implementado 2026-10-21 en `nextjs/src/lib/sync-lock.ts`

- Adquisición: `SET lirio:sync:youtube:lock <token-aleatorio> NX PX 900000` (atómico en Redis).
- Antes de cada escritura: script Lua compara-y-renueva (`GET == token` → `PEXPIRE`). Si devuelve 0 o Redis no responde, la ejecución deja de escribir (`lock_lost`).
- Liberación: script Lua compara-y-borra; solo el dueño puede liberar. Si el proceso cae, el TTL libera el lock.
- Sin dependencias: cliente RESP mínimo sobre `node:net`. Usa `REDIS_HOST`/`REDIS_PORT` o, si no existen, `redis:6379` (red interna de Docker).
- Verificado en el stack aislado: la purga automática de caché de Directus no borra la clave.

### GitHub Actions cron (rev. 2026-10-21)

Archivo: `.github/workflows/sync-sermons.yml`
- `schedule` diario (`0 9 * * *`; GitHub suele retrasarlo varias horas) y `workflow_dispatch` con el input booleano `dry_run`, que llama a `?dry_run=true` y solo devuelve el plan.
- `curl --max-time 120`. nginx corta a los 60 s con un 504, aunque la sync siga en el servidor; en ese caso hay que revisar `activity_logs`. Si curl falla, el job sale en rojo con su código de salida.
- El cuerpo JSON se imprime en el log. Ese log es público porque el repositorio lo es. Contiene contadores, IDs, títulos de YouTube (el actual y el anterior), los campos cambiados y los mensajes de error, pero nunca claves ni tokens.
- Códigos:
  - 200 → éxito.
  - **207 (errores parciales o freno de no disponibles) → job en rojo** con la anotación `::error`, para que no pase inadvertido.
  - Cualquier otro código → job en rojo.
- Con `dry_run`, el job también sale en rojo en dos casos:
  - si la respuesta no confirma `dryRun: true`, porque una versión antigua ignora el parámetro y sincroniza de verdad;
  - si el plan contiene errores.

### Decisiones previas al release (2026-10-21)

| Punto | Decisión para este release | Pendiente (requiere aprobación porque cambia datos o comportamiento) |
|---|---|---|
| HTTP 207 | El cron lo marca en rojo e imprime `errors` | — |
| Transmisiones programadas o en curso | **Sin cambios**: se importan al aparecer en la playlist y cada ejecución corrige título, fecha y duración cuando terminan | No importar mientras `liveBroadcastContent` sea `upcoming` o `live`. Evitaría ver en la Biblioteca servicios que aún no ocurrieron y slugs con el título del servicio anterior |
| `sermon_date` de servicios nocturnos | **Sin cambios**: fecha UTC. 388 de 1027 registros (publicados de 18:00 a 23:59 en Costa Rica) muestran el día siguiente, igual que En Vivo | Calcular la fecha en `America/Costa_Rica`, corregir una vez esos 388 registros (con `dry_run`, respaldo y la regla de "no editada a mano") y formatear En Vivo con `timeZone: 'America/Costa_Rica'` |
| E2E aislado en CI | Paso dentro del job "Playwright E2E" (check obligatorio en `main`) | — |

### Variable de entorno nueva

```
SYNC_SECRET=<openssl rand -base64 32>
```

---

## 4. Rutas y componentes

### Routing

| Ruta | Tipo | Revalidate |
|------|------|-----------|
| `/[locale]/biblioteca` | SSR | 60s |
| `/[locale]/biblioteca/[slug]` | SSR | 300s |
| `/[locale]/biblioteca/series/[slug]` | SSR | 300s |
| `/[locale]/biblioteca/predicador/[slug]` | SSR | 300s |
| `/api/sync/youtube` | API route | — |
| `/offline` | Static | — |

### Página `/biblioteca`

1. **Hero** — predicación más reciente con `featured = true`. Si no hay featured: predicación más reciente. Player YouTube embed + título + predicador + fecha.
2. **Filas por serie** — una fila por `sermon_series` activa con `sort_order`, scroll horizontal en mobile, grid en desktop.
3. **Recientes** — grid 2×3 de predicaciones más recientes ordenadas por `sermon_date`.
4. **Filtros client-side** — chips: serie · predicador · año. Filtra sobre el dataset ya cargado en página.
5. **Búsqueda** — input de texto; filtra por `title`, `preacher.name`, `series.title` sobre el dataset cargado.

### Página `/biblioteca/[slug]`

- `visibility !== 'public'` → `notFound()` (404). `unlisted` = solo accesible con URL directa (no listada).
- `generateMetadata()` dinámico: `title`, `description`, `openGraph.images` con thumbnail, Twitter card, canonical URL.
- Player: `YoutubeEmbed` — muestra thumbnail primero, carga iframe solo al click (evita CLS, mejora Lighthouse y rendimiento móvil).
- Predicaciones relacionadas con fallback: misma serie → mismo predicador → recientes.

### Componentes nuevos

| Componente | Responsabilidad |
|-----------|----------------|
| `SermonCard` | Thumbnail + título + metadata. Usa `manual_thumbnail` si existe, fallback a `thumbnail_url`. Reutilizable en grid, fila y relacionados |
| `SermonHero` | Featured sermon: thumbnail grande + player al click |
| `SeriesRow` | Scroll horizontal de `SermonCard`. Una fila por serie |
| `SermonFilters` | Chips de filtro client-side: serie, predicador, año |
| `SermonSearch` | Input con filtrado en tiempo real sobre prop `sermons[]` |
| `YoutubeEmbed` | Thumbnail → iframe al click. `loading="lazy"`. Acepta `youtube_id` |

### Fuente de datos en páginas

Todas las páginas leen **exclusivamente de Directus** en server-side. YouTube API nunca se llama desde el frontend ni en SSR de páginas públicas — solo en el sync job.

---

## 5. Variables de entorno nuevas

```
SYNC_SECRET=<openssl rand -base64 32>
```

Las variables `YOUTUBE_API_KEY` y `YOUTUBE_CHANNEL_ID` ya existen en el proyecto.

---

## 6. Archivos a crear/modificar

| Archivo | Acción |
|---------|--------|
| `nextjs/next.config.ts` | Modificar: `runtimeCaching` explícito en `withPWA` |
| `nextjs/src/app/offline/page.tsx` | Crear: página fallback offline estática |
| `nextjs/src/app/[locale]/biblioteca/page.tsx` | Crear: página principal biblioteca |
| `nextjs/src/app/[locale]/biblioteca/[slug]/page.tsx` | Crear: página individual predicación |
| `nextjs/src/app/[locale]/biblioteca/series/[slug]/page.tsx` | Crear: página de serie |
| `nextjs/src/app/[locale]/biblioteca/predicador/[slug]/page.tsx` | Crear: página de predicador |
| `nextjs/src/app/api/sync/youtube/route.ts` | Crear: sync job protegido |
| `nextjs/src/lib/sermons.ts` | Crear: funciones de acceso a Directus para sermons |
| `nextjs/src/components/sermons/SermonCard.tsx` | Crear |
| `nextjs/src/components/sermons/SermonHero.tsx` | Crear |
| `nextjs/src/components/sermons/SeriesRow.tsx` | Crear |
| `nextjs/src/components/sermons/SermonFilters.tsx` | Crear |
| `nextjs/src/components/sermons/SermonSearch.tsx` | Crear |
| `nextjs/src/components/sermons/YoutubeEmbed.tsx` | Crear |
| `.github/workflows/sync-sermons.yml` | Crear |
| `.env.example` | Modificar: agregar `SYNC_SECRET` |
| `nextjs/src/lib/directus.ts` | Modificar: agregar funciones `getSermons`, `getSermon`, `getSeries`, `getPreachers` |

---

## 7. Verificación

1. `npm run build` sin errores
2. `GET /biblioteca` → muestra hero + series + recientes
3. `GET /biblioteca/[slug]` válido → página con player, metadata, relacionados
4. `GET /biblioteca/[slug]` de visibility `private` → 404
5. `POST /api/sync/youtube` sin token → 401
6. `POST /api/sync/youtube` con token → importa/actualiza sermons en Directus
7. `POST /api/sync/youtube` concurrente → segundo request recibe 409
8. Filtros y búsqueda funcionan client-side sin requests adicionales
9. Lighthouse mobile `/biblioteca` ≥ 85 (thumbnails lazy, embeds click-to-load)
10. `GET /api/health/auth` sigue respondiendo `ok` (no rompió nada de Fase 2A)
11. SW: abrir `/biblioteca` offline → muestra página cacheada (network first con fallback)
12. SW: abrir `/asociados` offline → no hay fallback, redirige a login (no hay caché)
