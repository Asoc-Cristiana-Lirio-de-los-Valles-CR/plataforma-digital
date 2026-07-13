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
| Import inicial | `POST /api/sync/youtube?full=true` | Importa historial completo una sola vez |
| Sync incremental | `publishedAfter = last_successful_sync` | Reduce quota de YouTube API |
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
| `title` | string | Editable por admin; sync nunca sobreescribe |
| `slug` | string | Único; auto-generado del título al crear |
| `youtube_id` | string | Único; `dQw4w9WgXcQ` |
| `youtube_status` | enum: `available \| unavailable` | Sync actualiza |
| `visibility` | enum: `public \| unlisted \| private` | Default: `public` |
| `featured` | boolean | Default: `false` |
| `description` | text | Editable; sync nunca sobreescribe |
| `sermon_date` | date | Fecha real del culto |
| `duration_seconds` | integer | Importado de YouTube |
| `thumbnail_url` | string | `i.ytimg.com/vi/{id}/maxresdefault.jpg` |
| `manual_thumbnail` | M2O directus_files | Override del admin; nullable |
| `preacher` | M2O → `preachers` | nullable |
| `series` | M2O → `sermon_series` | nullable |
| `tags` | M2M → `sermon_tags` | nullable; para temas futuros |
| `suggested_preacher` | string | Sugerencia del sync; admin aprueba o ignora |
| `suggested_series` | string | Sugerencia del sync; admin aprueba o ignora |
| `raw_youtube_title` | string | Título original YouTube; inmutable post-import |
| `imported_at` | datetime | Timestamp de primera importación |
| `last_synced_at` | datetime | Timestamp del último sync exitoso |
| `youtube_published_at` | datetime | Fecha original de publicación en YouTube |
| `view_count` | integer | Sincronizado desde YouTube en cada sync |

**Índices:** `youtube_id` UNIQUE, `slug` UNIQUE, índices en `youtube_published_at`, `sermon_date`, `visibility`, `featured`.

**Campos que sync NUNCA sobreescribe:** `title`, `description`, `slug`, `preacher`, `series`, `visibility`, `featured`, `manual_thumbnail`, `tags`.

**Soft-delete para videos eliminados de YouTube:** sync marca `youtube_status = 'unavailable'` y `visibility = 'private'`. Nunca borra el registro — preserva URLs existentes y referencias internas.

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
- Rate limit: 1 llamada cada 10 minutos (in-memory)
- Sync lock: clave Redis `youtube_sync_lock` con TTL 15 min — evita ejecuciones concurrentes
- Logs en `activity_logs` con `action: 'youtube_sync'`, metadata con `{ inserted, updated, errors }`

**Parámetros:**
- Sin parámetros → sync incremental: solo videos nuevos desde `last_successful_sync` (timestamp del último registro en `activity_logs` con `action: 'youtube_sync'` y sin error)
- `?full=true` → importación masiva completa con paginación por `nextPageToken`

### Flujo de sync

```
Por cada video de YouTube:
  si youtube_id existe en Directus:
    → actualiza: view_count, youtube_status, last_synced_at, duration_seconds
    → NO toca: title, description, preacher, series, visibility, featured, etc.
  si youtube_id no existe:
    → crea registro con:
        visibility = 'public'
        featured = false
        raw_youtube_title = título YouTube
        title = título YouTube (editable por admin después)
        suggested_preacher = resultado de pattern matching
        suggested_series = resultado de pattern matching
        importado_at = now()
        last_synced_at = now()

Para videos que existían en Directus y ya no están en YouTube:
  → youtube_status = 'unavailable'
  → visibility = 'private'
```

### Pattern matching para sugerencias

Expresiones regulares simples sobre `raw_youtube_title`. Configurables en array en el código. No ML ni IA.

Ejemplos:
- `"Serie Romanos #3 — El llamado | Pastor José"` → `suggested_series: "Romanos"`, `suggested_preacher: "José"`
- `"AVIVAMIENTO 2023 DIA 2"` → `suggested_series: "Avivamiento 2023"`
- `"Culto Domingo AM"` → sin sugerencia

### Sync lock (Redis)

```typescript
const lockKey = 'youtube_sync_lock';
const locked = await redis.set(lockKey, '1', 'EX', 900, 'NX'); // 15 min TTL
if (!locked) return Response.json({ error: 'Sync already running' }, { status: 409 });
// ... sync logic ...
await redis.del(lockKey);
```

### GitHub Actions cron

Archivo: `.github/workflows/sync-sermons.yml`

```yaml
name: Sync sermons from YouTube
on:
  schedule:
    - cron: '0 9 * * *'  # 3am Costa Rica = 9am UTC
  workflow_dispatch:       # disparo manual desde GitHub UI

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger sync
        run: |
          curl -X POST https://liriodelosvallescr.org/api/sync/youtube \
            -H "Authorization: Bearer ${{ secrets.SYNC_SECRET }}" \
            --fail
```

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
