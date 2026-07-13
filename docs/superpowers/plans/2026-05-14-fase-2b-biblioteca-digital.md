# Fase 2B — Biblioteca Digital de Predicaciones — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir una biblioteca pública de predicaciones con importación masiva desde YouTube, curación editorial en Directus y páginas SSR en Next.js.

**Architecture:** YouTube sirve como CDN/plataforma de video; un sync job (API route + GitHub Actions cron) importa metadata a Directus, que es la única fuente de datos del frontend. Next.js renderiza páginas SSR/ISR con layout híbrido (hero + series + recientes + página individual). La estrategia offline del SW se configura primero para evitar caché accidental de contenido privado.

**Tech Stack:** Next.js 15, Directus 11, next-pwa, Vitest, TypeScript, Tailwind CSS, Redis (sync lock), GitHub Actions (cron)

**Spec:** `docs/superpowers/specs/2026-05-14-fase-2b-biblioteca-digital-design.md`

---

## Estructura de archivos

| Archivo | Acción | Responsabilidad |
|---------|--------|----------------|
| `nextjs/next.config.ts` | Modificar | Runtime caching explícito para SW |
| `nextjs/src/lib/types.ts` | Modificar | Tipos: Sermon, Preacher, SermonSeries, SermonTag |
| `nextjs/src/lib/sermons.ts` | Crear | Funciones de acceso a Directus para sermons |
| `nextjs/src/lib/sync-youtube.ts` | Crear | Lógica de sync YouTube → Directus (sin HTTP concerns) |
| `nextjs/src/components/sermons/SermonCard.tsx` | Crear | Card reutilizable: thumbnail + título + metadata |
| `nextjs/src/components/sermons/YoutubeEmbed.tsx` | Crear | Thumbnail → iframe al click (click-to-play) |
| `nextjs/src/components/sermons/SermonHero.tsx` | Crear | Featured sermon con player grande |
| `nextjs/src/components/sermons/SeriesRow.tsx` | Crear | Scroll horizontal de SermonCards por serie |
| `nextjs/src/components/sermons/SermonFilters.tsx` | Crear | Chips de filtro client-side |
| `nextjs/src/components/sermons/SermonSearch.tsx` | Crear | Input búsqueda client-side |
| `nextjs/src/app/offline/page.tsx` | Crear | Página fallback offline estática |
| `nextjs/src/app/[locale]/biblioteca/page.tsx` | Crear | Página principal biblioteca (SSR revalidate 60s) |
| `nextjs/src/app/[locale]/biblioteca/[slug]/page.tsx` | Crear | Página individual predicación (SSR revalidate 300s) |
| `nextjs/src/app/[locale]/biblioteca/series/[slug]/page.tsx` | Crear | Página de serie completa |
| `nextjs/src/app/[locale]/biblioteca/predicador/[slug]/page.tsx` | Crear | Predicaciones por predicador |
| `nextjs/src/app/api/sync/youtube/route.ts` | Crear | POST sync job protegido con SYNC_SECRET |
| `.github/workflows/sync-sermons.yml` | Crear | Cron GitHub Actions 3am CR (9am UTC) |
| `.env.example` | Modificar | Agregar SYNC_SECRET |
| `nextjs/tests/unit/sermons.test.ts` | Crear | Tests de sermons.ts |
| `nextjs/tests/unit/sync-youtube.test.ts` | Crear | Tests de sync-youtube.ts |
| `nextjs/messages/es.json` | Modificar | Textos en español para biblioteca |
| `nextjs/messages/en.json` | Modificar | Textos en inglés para biblioteca |

---

## Tarea 1: Estrategia offline SW — configurar next.config.ts

**Archivos:**
- Modificar: `nextjs/next.config.ts`

- [ ] **Paso 1: Reemplazar `runtimeCaching: []` con configuración explícita**

Abrir `nextjs/next.config.ts`. La línea actual es:
```typescript
runtimeCaching: [],
```

Reemplazar con:
```typescript
runtimeCaching: [
  // App shell y assets estáticos
  {
    urlPattern: /^\/_next\/static\/.*/i,
    handler: 'CacheFirst',
    options: { cacheName: 'static-assets' },
  },
  {
    urlPattern: /^\/_next\/image\?.*/i,
    handler: 'StaleWhileRevalidate',
    options: { cacheName: 'next-images' },
  },
  {
    urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
    handler: 'CacheFirst',
    options: { cacheName: 'google-fonts' },
  },
  // Thumbnails YouTube con límite y expiración
  {
    urlPattern: /^https:\/\/i\.ytimg\.com\/.*/i,
    handler: 'StaleWhileRevalidate',
    options: {
      cacheName: 'yt-thumbs',
      expiration: { maxEntries: 200, maxAgeSeconds: 604800 }, // 7 días
    },
  },
  {
    urlPattern: /^https:\/\/img\.youtube\.com\/.*/i,
    handler: 'StaleWhileRevalidate',
    options: {
      cacheName: 'yt-thumbs',
      expiration: { maxEntries: 200, maxAgeSeconds: 604800 },
    },
  },
  // Páginas públicas — network first, fallback cache
  {
    urlPattern: /^\/(es|en)\/(biblioteca|historia|donaciones|contacto|en-vivo)(\/.*)?$/i,
    handler: 'NetworkFirst',
    options: { cacheName: 'public-pages', networkTimeoutSeconds: 5 },
  },
  // Excluir /api/* explícitamente — nunca cachear
  {
    urlPattern: /^\/api\/.*/i,
    handler: 'NetworkOnly',
  },
  // Excluir portal privado explícitamente
  {
    urlPattern: /^\/(es|en)\/asociados.*/i,
    handler: 'NetworkOnly',
  },
  // Excluir embeds y API YouTube
  {
    urlPattern: /youtube\.com\/embed\/.*/i,
    handler: 'NetworkOnly',
  },
  {
    urlPattern: /googlevideo\.com\/.*/i,
    handler: 'NetworkOnly',
  },
  {
    urlPattern: /youtubei\.googleapis\.com\/.*/i,
    handler: 'NetworkOnly',
  },
],
```

- [ ] **Paso 2: Build para verificar que no rompe nada**

```bash
cd nextjs && npm run build
```
Esperado: build exitoso, sin errores TS.

- [ ] **Paso 3: Commit**

```bash
git add nextjs/next.config.ts
git commit -m "feat(sw): explicit runtime caching strategy — never cache /api, /asociados, YouTube embeds"
```

---

## Tarea 2: Página offline fallback

**Archivos:**
- Crear: `nextjs/src/app/offline/page.tsx`

- [ ] **Paso 1: Crear la página**

```typescript
// nextjs/src/app/offline/page.tsx
export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-950 dark:bg-brand-950">
      <div className="text-center px-6">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-brand-900 flex items-center justify-center">
          <svg className="w-10 h-10 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
          </svg>
        </div>
        <h1 className="text-2xl font-display font-semibold text-white mb-3">Sin conexión</h1>
        <p className="text-brand-300 mb-8 max-w-sm mx-auto">
          No hay conexión a internet. Reconéctate para ver predicaciones y contenido de la iglesia.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="bg-brand-600 hover:bg-brand-500 text-white font-medium px-6 py-3 rounded-xl transition-colors"
        >
          Reintentar
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Paso 2: Commit**

```bash
git add nextjs/src/app/offline/page.tsx
git commit -m "feat(sw): add offline fallback page"
```

---

## Tarea 3: Tipos TypeScript para sermons

**Archivos:**
- Modificar: `nextjs/src/lib/types.ts`

- [ ] **Paso 1: Agregar tipos al final de `types.ts`**

Abrir `nextjs/src/lib/types.ts` y agregar al final:

```typescript
export interface SermonTag {
  id: string;
  name: string;
  slug: string;
}

export interface Preacher {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  photo: string | null;
  active: boolean;
}

export interface SermonSeries {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  cover_image: string | null;
  year: number;
  sort_order: number;
  active: boolean;
}

export interface Sermon {
  id: string;
  title: string;
  slug: string;
  youtube_id: string;
  youtube_status: 'available' | 'unavailable';
  visibility: 'public' | 'unlisted' | 'private';
  featured: boolean;
  description: string | null;
  sermon_date: string | null;
  duration_seconds: number | null;
  thumbnail_url: string;
  manual_thumbnail: string | null;
  preacher: Preacher | null;
  series: SermonSeries | null;
  tags: SermonTag[];
  suggested_preacher: string | null;
  suggested_series: string | null;
  raw_youtube_title: string;
  imported_at: string;
  last_synced_at: string | null;
  youtube_published_at: string | null;
  view_count: number;
}
```

- [ ] **Paso 2: Verificar TS**

```bash
cd nextjs && npx tsc --noEmit
```
Esperado: sin errores.

- [ ] **Paso 3: Commit**

```bash
git add nextjs/src/lib/types.ts
git commit -m "feat(biblioteca): add Sermon, Preacher, SermonSeries, SermonTag types"
```

---

## Tarea 4: Colecciones Directus vía API

**Archivos:** ninguno en Next.js — llamadas curl a la API de Directus.

> Prerequisito: tener `DIRECTUS_ADMIN_TOKEN` en `.env` local (o usar `root@` token).

- [ ] **Paso 1: Crear colección `sermon_tags`**

```bash
DIRECTUS_URL=http://localhost:8055
ADMIN_TOKEN=<tu-admin-token>

curl -X POST "$DIRECTUS_URL/collections" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "collection": "sermon_tags",
    "fields": [
      {"field": "id", "type": "uuid", "meta": {"hidden": true, "readonly": true}, "schema": {"is_primary_key": true, "has_auto_increment": false}},
      {"field": "name", "type": "string", "schema": {"is_nullable": false}},
      {"field": "slug", "type": "string", "schema": {"is_nullable": false, "is_unique": true}}
    ]
  }'
```

- [ ] **Paso 2: Crear colección `preachers`**

```bash
curl -X POST "$DIRECTUS_URL/collections" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "collection": "preachers",
    "fields": [
      {"field": "id", "type": "uuid", "meta": {"hidden": true, "readonly": true}, "schema": {"is_primary_key": true}},
      {"field": "name", "type": "string", "schema": {"is_nullable": false}},
      {"field": "slug", "type": "string", "schema": {"is_nullable": false, "is_unique": true}},
      {"field": "bio", "type": "text", "schema": {"is_nullable": true}},
      {"field": "photo", "type": "uuid", "schema": {"is_nullable": true}},
      {"field": "active", "type": "boolean", "schema": {"default_value": true}}
    ]
  }'
```

- [ ] **Paso 3: Crear colección `sermon_series`**

```bash
curl -X POST "$DIRECTUS_URL/collections" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "collection": "sermon_series",
    "fields": [
      {"field": "id", "type": "uuid", "meta": {"hidden": true, "readonly": true}, "schema": {"is_primary_key": true}},
      {"field": "title", "type": "string", "schema": {"is_nullable": false}},
      {"field": "slug", "type": "string", "schema": {"is_nullable": false, "is_unique": true}},
      {"field": "description", "type": "text", "schema": {"is_nullable": true}},
      {"field": "cover_image", "type": "uuid", "schema": {"is_nullable": true}},
      {"field": "year", "type": "integer", "schema": {"is_nullable": false}},
      {"field": "sort_order", "type": "integer", "schema": {"default_value": 0}},
      {"field": "active", "type": "boolean", "schema": {"default_value": true}}
    ]
  }'
```

- [ ] **Paso 4: Crear colección `sermons`**

```bash
curl -X POST "$DIRECTUS_URL/collections" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "collection": "sermons",
    "fields": [
      {"field": "id", "type": "uuid", "meta": {"hidden": true, "readonly": true}, "schema": {"is_primary_key": true}},
      {"field": "title", "type": "string", "schema": {"is_nullable": false}},
      {"field": "slug", "type": "string", "schema": {"is_nullable": false, "is_unique": true}},
      {"field": "youtube_id", "type": "string", "schema": {"is_nullable": false, "is_unique": true}},
      {"field": "youtube_status", "type": "string", "schema": {"default_value": "available"}},
      {"field": "visibility", "type": "string", "schema": {"default_value": "public"}},
      {"field": "featured", "type": "boolean", "schema": {"default_value": false}},
      {"field": "description", "type": "text", "schema": {"is_nullable": true}},
      {"field": "sermon_date", "type": "date", "schema": {"is_nullable": true}},
      {"field": "duration_seconds", "type": "integer", "schema": {"is_nullable": true}},
      {"field": "thumbnail_url", "type": "string", "schema": {"is_nullable": false}},
      {"field": "manual_thumbnail", "type": "uuid", "schema": {"is_nullable": true}},
      {"field": "suggested_preacher", "type": "string", "schema": {"is_nullable": true}},
      {"field": "suggested_series", "type": "string", "schema": {"is_nullable": true}},
      {"field": "raw_youtube_title", "type": "string", "schema": {"is_nullable": false}},
      {"field": "imported_at", "type": "dateTime", "schema": {"is_nullable": false}},
      {"field": "last_synced_at", "type": "dateTime", "schema": {"is_nullable": true}},
      {"field": "youtube_published_at", "type": "dateTime", "schema": {"is_nullable": true}},
      {"field": "view_count", "type": "integer", "schema": {"default_value": 0}}
    ]
  }'
```

- [ ] **Paso 5: Crear relaciones M2O (preacher, series)**

```bash
# Relación sermons.preacher → preachers
curl -X POST "$DIRECTUS_URL/relations" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "collection": "sermons",
    "field": "preacher",
    "related_collection": "preachers"
  }'

# Relación sermons.series → sermon_series
curl -X POST "$DIRECTUS_URL/relations" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "collection": "sermons",
    "field": "series",
    "related_collection": "sermon_series"
  }'
```

- [ ] **Paso 6: Crear relación M2M sermons ↔ sermon_tags**

```bash
curl -X POST "$DIRECTUS_URL/fields/sermons" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "field": "tags",
    "type": "alias",
    "meta": {
      "special": ["m2m"],
      "interface": "list-m2m",
      "options": {"template": "{{sermon_tags_id.name}}"}
    }
  }'
```

- [ ] **Paso 7: Configurar permisos públicos**

```bash
# Leer sermons públicos
curl -X POST "$DIRECTUS_URL/permissions" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "role": null,
    "collection": "sermons",
    "action": "read",
    "permissions": {"visibility": {"_eq": "public"}},
    "fields": ["*"]
  }'

# Leer preachers activos
curl -X POST "$DIRECTUS_URL/permissions" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role": null, "collection": "preachers", "action": "read", "permissions": {"active": {"_eq": true}}, "fields": ["*"]}'

# Leer sermon_series activas
curl -X POST "$DIRECTUS_URL/permissions" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role": null, "collection": "sermon_series", "action": "read", "permissions": {"active": {"_eq": true}}, "fields": ["*"]}'

# Leer sermon_tags (sin restricción)
curl -X POST "$DIRECTUS_URL/permissions" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role": null, "collection": "sermon_tags", "action": "read", "permissions": {}, "fields": ["*"]}'
```

- [ ] **Paso 8: Verificar colecciones creadas**

```bash
curl "$DIRECTUS_URL/collections/sermons" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.data.collection'
```
Esperado: `"sermons"`

---

## Tarea 5: `src/lib/sermons.ts` — funciones de acceso Directus

**Archivos:**
- Crear: `nextjs/src/lib/sermons.ts`
- Crear: `nextjs/tests/unit/sermons.test.ts`

- [ ] **Paso 1: Escribir los tests primero**

Crear `nextjs/tests/unit/sermons.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';

vi.mock('@directus/sdk', () => ({
  createDirectus: vi.fn(() => ({
    with: vi.fn().mockReturnThis(),
    request: vi.fn().mockResolvedValue([]),
  })),
  rest: vi.fn(),
  readItems: vi.fn(),
}));

import { getSermons, getSermon, getSeriesList, getPreachers } from '../../src/lib/sermons';

describe('getSermons', () => {
  it('returns empty array on error', async () => {
    const result = await getSermons();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe('getSermon', () => {
  it('returns null when not found', async () => {
    const result = await getSermon('slug-inexistente');
    expect(result).toBeNull();
  });
});

describe('getSeriesList', () => {
  it('returns empty array on error', async () => {
    const result = await getSeriesList();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe('getPreachers', () => {
  it('returns empty array on error', async () => {
    const result = await getPreachers();
    expect(Array.isArray(result)).toBe(true);
  });
});
```

- [ ] **Paso 2: Correr tests — deben fallar**

```bash
cd nextjs && npm test tests/unit/sermons.test.ts
```
Esperado: FAIL — "Cannot find module '../../src/lib/sermons'"

- [ ] **Paso 3: Crear `nextjs/src/lib/sermons.ts`**

```typescript
import { createDirectus, rest, readItems } from '@directus/sdk';
import type { Sermon, SermonSeries, Preacher } from './types';

const directus = createDirectus(
  process.env.DIRECTUS_URL ?? process.env.NEXT_PUBLIC_DIRECTUS_URL ?? 'http://directus:8055'
).with(rest({ onRequest: (options) => ({ ...options, cache: 'no-store' }) }));

const SERMON_FIELDS = [
  'id', 'title', 'slug', 'youtube_id', 'youtube_status', 'visibility',
  'featured', 'description', 'sermon_date', 'duration_seconds',
  'thumbnail_url', 'manual_thumbnail', 'raw_youtube_title',
  'imported_at', 'last_synced_at', 'youtube_published_at', 'view_count',
  'suggested_preacher', 'suggested_series',
  'preacher.id', 'preacher.name', 'preacher.slug', 'preacher.photo', 'preacher.bio',
  'series.id', 'series.title', 'series.slug', 'series.year', 'series.cover_image',
  'tags.sermon_tags_id.id', 'tags.sermon_tags_id.name', 'tags.sermon_tags_id.slug',
] as const;

export async function getSermons(limit = 50): Promise<Sermon[]> {
  try {
    return await directus.request(
      readItems('sermons', {
        filter: { visibility: { _eq: 'public' } },
        sort: ['-sermon_date', '-youtube_published_at'],
        limit,
        fields: SERMON_FIELDS as unknown as string[],
      })
    ) as Sermon[];
  } catch {
    return [];
  }
}

export async function getFeaturedSermon(): Promise<Sermon | null> {
  try {
    const results = await directus.request(
      readItems('sermons', {
        filter: { visibility: { _eq: 'public' }, featured: { _eq: true } },
        sort: ['-sermon_date', '-youtube_published_at'],
        limit: 1,
        fields: SERMON_FIELDS as unknown as string[],
      })
    ) as Sermon[];
    if (results.length > 0) return results[0];

    // Fallback: más reciente
    const recent = await directus.request(
      readItems('sermons', {
        filter: { visibility: { _eq: 'public' } },
        sort: ['-sermon_date', '-youtube_published_at'],
        limit: 1,
        fields: SERMON_FIELDS as unknown as string[],
      })
    ) as Sermon[];
    return recent[0] ?? null;
  } catch {
    return null;
  }
}

export async function getSermon(slug: string): Promise<Sermon | null> {
  try {
    const results = await directus.request(
      readItems('sermons', {
        filter: { slug: { _eq: slug } },
        limit: 1,
        fields: SERMON_FIELDS as unknown as string[],
      })
    ) as Sermon[];
    return results[0] ?? null;
  } catch {
    return null;
  }
}

export async function getRelatedSermons(sermon: Sermon, limit = 3): Promise<Sermon[]> {
  try {
    // Prioridad: misma serie → mismo predicador → recientes
    const filter: Record<string, unknown> = {
      visibility: { _eq: 'public' },
      id: { _neq: sermon.id },
    };

    if (sermon.series?.id) {
      filter['series'] = { id: { _eq: sermon.series.id } };
    } else if (sermon.preacher?.id) {
      filter['preacher'] = { id: { _eq: sermon.preacher.id } };
    }

    const results = await directus.request(
      readItems('sermons', {
        filter,
        sort: ['-sermon_date', '-youtube_published_at'],
        limit,
        fields: SERMON_FIELDS as unknown as string[],
      })
    ) as Sermon[];

    // Si no hay suficientes con la prioridad, completar con recientes
    if (results.length < limit) {
      const recent = await directus.request(
        readItems('sermons', {
          filter: { visibility: { _eq: 'public' }, id: { _nin: [sermon.id, ...results.map(s => s.id)] } },
          sort: ['-sermon_date', '-youtube_published_at'],
          limit: limit - results.length,
          fields: SERMON_FIELDS as unknown as string[],
        })
      ) as Sermon[];
      return [...results, ...recent];
    }

    return results;
  } catch {
    return [];
  }
}

export async function getSeriesList(): Promise<SermonSeries[]> {
  try {
    return await directus.request(
      readItems('sermon_series', {
        filter: { active: { _eq: true } },
        sort: ['sort_order', '-year'],
        fields: ['*'],
      })
    ) as SermonSeries[];
  } catch {
    return [];
  }
}

export async function getSeriesWithSermons(slug: string): Promise<{ series: SermonSeries; sermons: Sermon[] } | null> {
  try {
    const seriesResults = await directus.request(
      readItems('sermon_series', {
        filter: { slug: { _eq: slug }, active: { _eq: true } },
        limit: 1,
        fields: ['*'],
      })
    ) as SermonSeries[];
    if (!seriesResults.length) return null;

    const series = seriesResults[0];
    const sermons = await directus.request(
      readItems('sermons', {
        filter: { visibility: { _eq: 'public' }, series: { id: { _eq: series.id } } },
        sort: ['-sermon_date', '-youtube_published_at'],
        fields: SERMON_FIELDS as unknown as string[],
      })
    ) as Sermon[];

    return { series, sermons };
  } catch {
    return null;
  }
}

export async function getPreachers(): Promise<Preacher[]> {
  try {
    return await directus.request(
      readItems('preachers', {
        filter: { active: { _eq: true } },
        sort: ['name'],
        fields: ['id', 'name', 'slug', 'photo', 'bio', 'active'],
      })
    ) as Preacher[];
  } catch {
    return [];
  }
}

export async function getPreacherWithSermons(slug: string): Promise<{ preacher: Preacher; sermons: Sermon[] } | null> {
  try {
    const preachers = await directus.request(
      readItems('preachers', {
        filter: { slug: { _eq: slug }, active: { _eq: true } },
        limit: 1,
        fields: ['*'],
      })
    ) as Preacher[];
    if (!preachers.length) return null;

    const preacher = preachers[0];
    const sermons = await directus.request(
      readItems('sermons', {
        filter: { visibility: { _eq: 'public' }, preacher: { id: { _eq: preacher.id } } },
        sort: ['-sermon_date', '-youtube_published_at'],
        fields: SERMON_FIELDS as unknown as string[],
      })
    ) as Sermon[];

    return { preacher, sermons };
  } catch {
    return null;
  }
}
```

- [ ] **Paso 4: Correr tests — deben pasar**

```bash
cd nextjs && npm test tests/unit/sermons.test.ts
```
Esperado: PASS — 4 tests

- [ ] **Paso 5: Commit**

```bash
git add nextjs/src/lib/sermons.ts nextjs/src/lib/types.ts nextjs/tests/unit/sermons.test.ts
git commit -m "feat(biblioteca): add sermon types and Directus query functions"
```

---

## Tarea 6: Componente `YoutubeEmbed`

**Archivos:**
- Crear: `nextjs/src/components/sermons/YoutubeEmbed.tsx`

El componente muestra el thumbnail primero y carga el iframe solo al hacer click. Esto mejora el CLS (Cumulative Layout Shift) y el rendimiento en mobile.

- [ ] **Paso 1: Crear el componente**

```typescript
// nextjs/src/components/sermons/YoutubeEmbed.tsx
'use client';

import { useState } from 'react';
import Image from 'next/image';

interface YoutubeEmbedProps {
  youtubeId: string;
  title: string;
  thumbnailUrl: string;
  className?: string;
}

export function YoutubeEmbed({ youtubeId, title, thumbnailUrl, className = '' }: YoutubeEmbedProps) {
  const [playing, setPlaying] = useState(false);

  if (playing) {
    return (
      <div className={`relative aspect-video w-full ${className}`}>
        <iframe
          src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full rounded-2xl"
        />
      </div>
    );
  }

  return (
    <button
      onClick={() => setPlaying(true)}
      className={`relative aspect-video w-full group cursor-pointer ${className}`}
      aria-label={`Reproducir: ${title}`}
    >
      <Image
        src={thumbnailUrl}
        alt={title}
        fill
        className="object-cover rounded-2xl"
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 70vw"
        priority
      />
      <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/20 group-hover:bg-black/30 transition-colors">
        <div className="w-16 h-16 rounded-full bg-white/90 group-hover:bg-white flex items-center justify-center shadow-lg transition-colors">
          <svg className="w-7 h-7 text-brand-700 ml-1" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>
    </button>
  );
}
```

- [ ] **Paso 2: Verificar TS**

```bash
cd nextjs && npx tsc --noEmit
```
Esperado: sin errores.

- [ ] **Paso 3: Commit**

```bash
git add nextjs/src/components/sermons/YoutubeEmbed.tsx
git commit -m "feat(biblioteca): add YoutubeEmbed click-to-play component"
```

---

## Tarea 7: Componente `SermonCard`

**Archivos:**
- Crear: `nextjs/src/components/sermons/SermonCard.tsx`

- [ ] **Paso 1: Crear el componente**

```typescript
// nextjs/src/components/sermons/SermonCard.tsx
import Link from 'next/link';
import Image from 'next/image';
import type { Sermon } from '@/lib/types';

interface SermonCardProps {
  sermon: Sermon;
  locale: string;
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '';
  const m = Math.floor(seconds / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}min`;
  return `${m}min`;
}

export function SermonCard({ sermon, locale }: SermonCardProps) {
  // manual_thumbnail toma prioridad sobre thumbnail_url
  const thumbSrc = sermon.manual_thumbnail ?? sermon.thumbnail_url;

  return (
    <Link
      href={`/${locale}/biblioteca/${sermon.slug}`}
      className="group block rounded-xl overflow-hidden bg-white dark:bg-brand-900/40 border border-brand-100 dark:border-brand-800 hover:border-brand-400 dark:hover:border-brand-600 transition-colors"
    >
      <div className="relative aspect-video overflow-hidden bg-brand-100 dark:bg-brand-900">
        {thumbSrc ? (
          <Image
            src={thumbSrc}
            alt={sermon.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className="w-10 h-10 text-brand-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.069A1 1 0 0121 8.845v6.31a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
            </svg>
          </div>
        )}
        {sermon.duration_seconds && (
          <span className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
            {formatDuration(sermon.duration_seconds)}
          </span>
        )}
      </div>
      <div className="p-3">
        <p className="text-sm font-semibold text-brand-900 dark:text-white line-clamp-2 mb-1">
          {sermon.title}
        </p>
        <div className="flex items-center gap-1.5 flex-wrap">
          {sermon.preacher && (
            <span className="text-xs text-muted">{sermon.preacher.name}</span>
          )}
          {sermon.series && (
            <>
              <span className="text-xs text-muted">·</span>
              <span className="text-xs text-brand-500 dark:text-brand-400">{sermon.series.title}</span>
            </>
          )}
          {sermon.sermon_date && (
            <>
              <span className="text-xs text-muted">·</span>
              <span className="text-xs text-muted">
                {new Date(sermon.sermon_date).toLocaleDateString('es-CR', { year: 'numeric', month: 'short' })}
              </span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}
```

- [ ] **Paso 2: Commit**

```bash
git add nextjs/src/components/sermons/SermonCard.tsx
git commit -m "feat(biblioteca): add SermonCard component"
```

---

## Tarea 8: Componente `SermonHero`

**Archivos:**
- Crear: `nextjs/src/components/sermons/SermonHero.tsx`

- [ ] **Paso 1: Crear el componente**

```typescript
// nextjs/src/components/sermons/SermonHero.tsx
import type { Sermon } from '@/lib/types';
import { YoutubeEmbed } from './YoutubeEmbed';

interface SermonHeroProps {
  sermon: Sermon;
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '';
  const m = Math.floor(seconds / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}min`;
  return `${m}min`;
}

export function SermonHero({ sermon }: SermonHeroProps) {
  const thumbSrc = sermon.manual_thumbnail ?? sermon.thumbnail_url;

  return (
    <div className="grid lg:grid-cols-2 gap-8 items-center">
      <YoutubeEmbed
        youtubeId={sermon.youtube_id}
        title={sermon.title}
        thumbnailUrl={thumbSrc}
        className="shadow-2xl"
      />
      <div>
        {sermon.featured && (
          <span className="inline-block text-xs font-semibold tracking-wider uppercase text-brand-500 dark:text-brand-400 mb-3">
            ✦ Predicación destacada
          </span>
        )}
        <h2 className="text-2xl lg:text-3xl font-display font-semibold text-brand-900 dark:text-white mb-4 leading-snug">
          {sermon.title}
        </h2>
        <div className="flex flex-wrap gap-3 text-sm text-muted mb-4">
          {sermon.preacher && (
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              {sermon.preacher.name}
            </span>
          )}
          {sermon.series && (
            <span className="flex items-center gap-1 text-brand-500 dark:text-brand-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              {sermon.series.title}
            </span>
          )}
          {sermon.sermon_date && (
            <span>
              {new Date(sermon.sermon_date).toLocaleDateString('es-CR', { year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          )}
          {sermon.duration_seconds && (
            <span>{formatDuration(sermon.duration_seconds)}</span>
          )}
        </div>
        {sermon.description && (
          <p className="text-muted line-clamp-3">{sermon.description}</p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Paso 2: Commit**

```bash
git add nextjs/src/components/sermons/SermonHero.tsx
git commit -m "feat(biblioteca): add SermonHero component"
```

---

## Tarea 9: Componentes `SeriesRow`, `SermonFilters`, `SermonSearch`

**Archivos:**
- Crear: `nextjs/src/components/sermons/SeriesRow.tsx`
- Crear: `nextjs/src/components/sermons/SermonFilters.tsx`
- Crear: `nextjs/src/components/sermons/SermonSearch.tsx`

- [ ] **Paso 1: Crear `SeriesRow`**

```typescript
// nextjs/src/components/sermons/SeriesRow.tsx
import type { Sermon, SermonSeries } from '@/lib/types';
import { SermonCard } from './SermonCard';

interface SeriesRowProps {
  series: SermonSeries;
  sermons: Sermon[];
  locale: string;
}

export function SeriesRow({ series, sermons, locale }: SeriesRowProps) {
  if (sermons.length === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-display font-semibold text-brand-900 dark:text-white">
          {series.title}
          <span className="text-sm font-normal text-muted ml-2">{series.year}</span>
        </h3>
        <a
          href={`/${locale}/biblioteca/series/${series.slug}`}
          className="text-sm text-brand-600 dark:text-brand-400 hover:underline"
        >
          Ver todos →
        </a>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide">
        {sermons.map((sermon) => (
          <div key={sermon.id} className="snap-start flex-shrink-0 w-64 sm:w-72">
            <SermonCard sermon={sermon} locale={locale} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Paso 2: Crear `SermonFilters`**

```typescript
// nextjs/src/components/sermons/SermonFilters.tsx
'use client';

import type { Preacher, SermonSeries } from '@/lib/types';

export interface FilterState {
  seriesId: string | null;
  preacherId: string | null;
  year: string | null;
}

interface SermonFiltersProps {
  series: SermonSeries[];
  preachers: Preacher[];
  years: number[];
  filters: FilterState;
  onChange: (filters: FilterState) => void;
}

export function SermonFilters({ series, preachers, years, filters, onChange }: SermonFiltersProps) {
  const chip = (label: string, active: boolean, onClick: () => void) => (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
        active
          ? 'bg-brand-600 text-white'
          : 'bg-brand-100 dark:bg-brand-900 text-brand-700 dark:text-brand-300 hover:bg-brand-200 dark:hover:bg-brand-800'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-3">
      {series.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {chip('Todas las series', !filters.seriesId, () => onChange({ ...filters, seriesId: null }))}
          {series.map((s) =>
            chip(s.title, filters.seriesId === s.id, () =>
              onChange({ ...filters, seriesId: filters.seriesId === s.id ? null : s.id })
            )
          )}
        </div>
      )}
      {preachers.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {chip('Todos los predicadores', !filters.preacherId, () => onChange({ ...filters, preacherId: null }))}
          {preachers.map((p) =>
            chip(p.name, filters.preacherId === p.id, () =>
              onChange({ ...filters, preacherId: filters.preacherId === p.id ? null : p.id })
            )
          )}
        </div>
      )}
      {years.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {chip('Todos los años', !filters.year, () => onChange({ ...filters, year: null }))}
          {years.map((y) =>
            chip(String(y), filters.year === String(y), () =>
              onChange({ ...filters, year: filters.year === String(y) ? null : String(y) })
            )
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Paso 3: Crear `SermonSearch`**

```typescript
// nextjs/src/components/sermons/SermonSearch.tsx
'use client';

interface SermonSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SermonSearch({ value, onChange, placeholder = 'Buscar predicaciones...' }: SermonSearchProps) {
  return (
    <div className="relative">
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none"
        fill="none" stroke="currentColor" viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-brand-200 dark:border-brand-700 bg-white dark:bg-brand-900/40 text-brand-900 dark:text-white placeholder-muted text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-brand-700 dark:hover:text-white"
          aria-label="Limpiar búsqueda"
        >
          ×
        </button>
      )}
    </div>
  );
}
```

- [ ] **Paso 4: Commit**

```bash
git add nextjs/src/components/sermons/SeriesRow.tsx nextjs/src/components/sermons/SermonFilters.tsx nextjs/src/components/sermons/SermonSearch.tsx
git commit -m "feat(biblioteca): add SeriesRow, SermonFilters, SermonSearch components"
```

---

## Tarea 10: Textos i18n para biblioteca

**Archivos:**
- Modificar: `nextjs/messages/es.json`
- Modificar: `nextjs/messages/en.json`

- [ ] **Paso 1: Agregar claves en `es.json`**

Abrir `nextjs/messages/es.json` y agregar la clave `"biblioteca"` al objeto raíz:

```json
"biblioteca": {
  "title": "Biblioteca de Predicaciones",
  "subtitle": "Predications, series y mensajes de la Iglesia Lirio de los Valles",
  "featured": "Predicación destacada",
  "recentSermons": "Predicaciones recientes",
  "allSeries": "Todas las series",
  "searchPlaceholder": "Buscar predicaciones...",
  "noResults": "No se encontraron predicaciones con ese criterio.",
  "viewAll": "Ver todas",
  "preacher": "Predicador",
  "series": "Serie",
  "duration": "Duración",
  "publishedOn": "Publicado el",
  "relatedSermons": "Predicaciones relacionadas",
  "backToLibrary": "← Volver a la biblioteca",
  "watchOnYouTube": "Ver en YouTube",
  "metaDescription": "Biblioteca de predicaciones y mensajes de la Iglesia Cristiana Lirio de los Valles."
}
```

- [ ] **Paso 2: Agregar claves en `en.json`**

Abrir `nextjs/messages/en.json` y agregar:

```json
"biblioteca": {
  "title": "Sermon Library",
  "subtitle": "Sermons, series and messages from Lirio de los Valles Church",
  "featured": "Featured sermon",
  "recentSermons": "Recent sermons",
  "allSeries": "All series",
  "searchPlaceholder": "Search sermons...",
  "noResults": "No sermons found for that criteria.",
  "viewAll": "View all",
  "preacher": "Preacher",
  "series": "Series",
  "duration": "Duration",
  "publishedOn": "Published on",
  "relatedSermons": "Related sermons",
  "backToLibrary": "← Back to library",
  "watchOnYouTube": "Watch on YouTube",
  "metaDescription": "Sermon library from Iglesia Cristiana Lirio de los Valles."
}
```

- [ ] **Paso 3: Commit**

```bash
git add nextjs/messages/es.json nextjs/messages/en.json
git commit -m "feat(biblioteca): add i18n keys for sermon library"
```

---

## Tarea 11: Página principal `/biblioteca`

**Archivos:**
- Crear: `nextjs/src/app/[locale]/biblioteca/page.tsx`

Esta página es un Client Component contenedor que recibe sermons del server component y maneja filtros/búsqueda client-side.

- [ ] **Paso 1: Crear un componente client `BibliotecaClient`**

Crear `nextjs/src/app/[locale]/biblioteca/BibliotecaClient.tsx`:

```typescript
'use client';

import { useState, useMemo } from 'react';
import type { Sermon, SermonSeries, Preacher } from '@/lib/types';
import { SermonCard } from '@/components/sermons/SermonCard';
import { SeriesRow } from '@/components/sermons/SeriesRow';
import { SermonFilters, type FilterState } from '@/components/sermons/SermonFilters';
import { SermonSearch } from '@/components/sermons/SermonSearch';
import { SermonHero } from '@/components/sermons/SermonHero';

interface BibliotecaClientProps {
  sermons: Sermon[];
  featuredSermon: Sermon | null;
  seriesList: SermonSeries[];
  preachers: Preacher[];
  locale: string;
  t: Record<string, string>;
}

export function BibliotecaClient({ sermons, featuredSermon, seriesList, preachers, locale, t }: BibliotecaClientProps) {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<FilterState>({ seriesId: null, preacherId: null, year: null });

  const years = useMemo(() => {
    const ys = sermons
      .map(s => s.sermon_date ? new Date(s.sermon_date).getFullYear() : null)
      .filter((y): y is number => y !== null);
    return [...new Set(ys)].sort((a, b) => b - a);
  }, [sermons]);

  const filtered = useMemo(() => {
    return sermons.filter((s) => {
      if (filters.seriesId && s.series?.id !== filters.seriesId) return false;
      if (filters.preacherId && s.preacher?.id !== filters.preacherId) return false;
      if (filters.year && s.sermon_date && String(new Date(s.sermon_date).getFullYear()) !== filters.year) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          s.title.toLowerCase().includes(q) ||
          s.preacher?.name.toLowerCase().includes(q) ||
          s.series?.title.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [sermons, filters, search]);

  const isFiltering = !!search || !!filters.seriesId || !!filters.preacherId || !!filters.year;

  // Sermons por serie para las filas (solo sin filtro activo)
  const seriesSermonsMap = useMemo(() => {
    const map = new Map<string, Sermon[]>();
    for (const serie of seriesList) {
      map.set(serie.id, sermons.filter(s => s.series?.id === serie.id).slice(0, 8));
    }
    return map;
  }, [sermons, seriesList]);

  return (
    <div className="space-y-12">
      {/* Hero con predicación featured */}
      {featuredSermon && !isFiltering && (
        <section className="section-padding bg-subtle">
          <div className="container-page">
            <div className="text-center mb-8">
              <span className="text-xs font-semibold tracking-widest uppercase text-brand-500 dark:text-brand-400">
                {t.featured}
              </span>
            </div>
            <SermonHero sermon={featuredSermon} />
          </div>
        </section>
      )}

      {/* Buscador y filtros */}
      <section className="section-padding">
        <div className="container-page">
          <div className="space-y-4 mb-8">
            <SermonSearch value={search} onChange={setSearch} placeholder={t.searchPlaceholder} />
            <SermonFilters series={seriesList} preachers={preachers} years={years} filters={filters} onChange={setFilters} />
          </div>

          {/* Si hay filtro activo: grid con resultados */}
          {isFiltering ? (
            filtered.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map(s => <SermonCard key={s.id} sermon={s} locale={locale} />)}
              </div>
            ) : (
              <p className="text-center text-muted py-12">{t.noResults}</p>
            )
          ) : (
            /* Vista normal: filas por serie + recientes */
            <div className="space-y-12">
              {seriesList.map(serie => {
                const sSermons = seriesSermonsMap.get(serie.id) ?? [];
                return <SeriesRow key={serie.id} series={serie} sermons={sSermons} locale={locale} />;
              })}

              {/* Recientes */}
              <div>
                <h3 className="text-lg font-display font-semibold text-brand-900 dark:text-white mb-4">
                  {t.recentSermons}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {sermons.slice(0, 6).map(s => <SermonCard key={s.id} sermon={s} locale={locale} />)}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Paso 2: Crear la página server component**

Crear `nextjs/src/app/[locale]/biblioteca/page.tsx`:

```typescript
export const revalidate = 60;

import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { getSermons, getFeaturedSermon, getSeriesList, getPreachers } from '@/lib/sermons';
import { BibliotecaClient } from './BibliotecaClient';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Biblioteca de Predicaciones',
    description: 'Predications, series y mensajes de la Iglesia Cristiana Lirio de los Valles.',
  };
}

export default async function BibliotecaPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations('biblioteca');

  const [sermons, featuredSermon, seriesList, preachers] = await Promise.all([
    getSermons(200),
    getFeaturedSermon(),
    getSeriesList(),
    getPreachers(),
  ]);

  const tObj = {
    featured: t('featured'),
    recentSermons: t('recentSermons'),
    searchPlaceholder: t('searchPlaceholder'),
    noResults: t('noResults'),
  };

  return (
    <>
      <section className="section-padding bg-subtle">
        <div className="container-page">
          <div className="max-w-3xl mx-auto text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="gold-line" />
              <span className="text-muted text-xs font-semibold tracking-[0.2em] uppercase">Lirio de los Valles</span>
              <div className="gold-line" />
            </div>
            <h1 className="display-title mb-4">{t('title')}</h1>
            <p className="text-muted text-lg">{t('subtitle')}</p>
          </div>
        </div>
      </section>

      <BibliotecaClient
        sermons={sermons}
        featuredSermon={featuredSermon}
        seriesList={seriesList}
        preachers={preachers}
        locale={locale}
        t={tObj}
      />
    </>
  );
}
```

- [ ] **Paso 3: Verificar TS**

```bash
cd nextjs && npx tsc --noEmit
```
Esperado: sin errores.

- [ ] **Paso 4: Commit**

```bash
git add "nextjs/src/app/[locale]/biblioteca/"
git commit -m "feat(biblioteca): add main /biblioteca page with hero, series rows, filters and search"
```

---

## Tarea 12: Página individual `/biblioteca/[slug]`

**Archivos:**
- Crear: `nextjs/src/app/[locale]/biblioteca/[slug]/page.tsx`

- [ ] **Paso 1: Crear la página**

```typescript
// nextjs/src/app/[locale]/biblioteca/[slug]/page.tsx
export const revalidate = 300;

import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { getSermon, getRelatedSermons } from '@/lib/sermons';
import { YoutubeEmbed } from '@/components/sermons/YoutubeEmbed';
import { SermonCard } from '@/components/sermons/SermonCard';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://liriodelosvallescr.org';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { slug, locale } = await params;
  const sermon = await getSermon(slug);
  if (!sermon || sermon.visibility !== 'public') return {};

  const thumbSrc = sermon.manual_thumbnail ?? sermon.thumbnail_url;

  return {
    title: sermon.title,
    description: sermon.description ?? `Predicación: ${sermon.title}`,
    openGraph: {
      title: sermon.title,
      description: sermon.description ?? `Predicación: ${sermon.title}`,
      images: thumbSrc ? [{ url: thumbSrc, width: 1280, height: 720 }] : [],
      url: `${siteUrl}/${locale}/biblioteca/${slug}`,
      type: 'video.other',
    },
    twitter: {
      card: 'summary_large_image',
      title: sermon.title,
      description: sermon.description ?? undefined,
      images: thumbSrc ? [thumbSrc] : [],
    },
  };
}

export default async function SermonPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const t = await getTranslations('biblioteca');

  const sermon = await getSermon(slug);

  // visibility !== 'public' → 404 (unlisted = solo con URL directa, sin listar)
  if (!sermon || sermon.visibility === 'private') notFound();

  const related = await getRelatedSermons(sermon, 3);
  const thumbSrc = sermon.manual_thumbnail ?? sermon.thumbnail_url;

  return (
    <div className="section-padding">
      <div className="container-page max-w-4xl mx-auto">
        {/* Back link */}
        <Link href={`/${locale}/biblioteca`} className="text-sm text-muted hover:text-brand-600 dark:hover:text-brand-400 mb-6 inline-block">
          {t('backToLibrary')}
        </Link>

        {/* Player */}
        <YoutubeEmbed
          youtubeId={sermon.youtube_id}
          title={sermon.title}
          thumbnailUrl={thumbSrc}
          className="mb-8"
        />

        {/* Metadata */}
        <div className="mb-8">
          <h1 className="text-2xl lg:text-3xl font-display font-semibold text-brand-900 dark:text-white mb-4">
            {sermon.title}
          </h1>
          <div className="flex flex-wrap gap-4 text-sm text-muted mb-4">
            {sermon.preacher && (
              <Link href={`/${locale}/biblioteca/predicador/${sermon.preacher.slug}`} className="hover:text-brand-600 dark:hover:text-brand-400">
                {t('preacher')}: {sermon.preacher.name}
              </Link>
            )}
            {sermon.series && (
              <Link href={`/${locale}/biblioteca/series/${sermon.series.slug}`} className="text-brand-500 dark:text-brand-400 hover:underline">
                {t('series')}: {sermon.series.title}
              </Link>
            )}
            {sermon.sermon_date && (
              <span>
                {new Date(sermon.sermon_date).toLocaleDateString('es-CR', { year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
            )}
          </div>
          {sermon.description && (
            <p className="text-muted leading-relaxed">{sermon.description}</p>
          )}
          <a
            href={`https://www.youtube.com/watch?v=${sermon.youtube_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-4 text-sm text-brand-600 dark:text-brand-400 hover:underline"
          >
            {t('watchOnYouTube')} ↗
          </a>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <div className="border-t border-brand-100 dark:border-brand-800 pt-8">
            <h2 className="text-lg font-display font-semibold text-brand-900 dark:text-white mb-6">
              {t('relatedSermons')}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {related.map(s => <SermonCard key={s.id} sermon={s} locale={locale} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Paso 2: Verificar TS**

```bash
cd nextjs && npx tsc --noEmit
```
Esperado: sin errores.

- [ ] **Paso 3: Commit**

```bash
git add "nextjs/src/app/[locale]/biblioteca/[slug]/"
git commit -m "feat(biblioteca): add individual sermon page with player, metadata and related sermons"
```

---

## Tarea 13: Páginas de serie y predicador

**Archivos:**
- Crear: `nextjs/src/app/[locale]/biblioteca/series/[slug]/page.tsx`
- Crear: `nextjs/src/app/[locale]/biblioteca/predicador/[slug]/page.tsx`

- [ ] **Paso 1: Crear página de serie**

```typescript
// nextjs/src/app/[locale]/biblioteca/series/[slug]/page.tsx
export const revalidate = 300;

import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { getSeriesWithSermons } from '@/lib/sermons';
import { SermonCard } from '@/components/sermons/SermonCard';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const result = await getSeriesWithSermons(slug);
  if (!result) return {};
  return { title: result.series.title, description: result.series.description ?? undefined };
}

export default async function SeriesPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const t = await getTranslations('biblioteca');
  const result = await getSeriesWithSermons(slug);
  if (!result) notFound();

  const { series, sermons } = result;

  return (
    <div className="section-padding">
      <div className="container-page">
        <Link href={`/${locale}/biblioteca`} className="text-sm text-muted hover:text-brand-600 dark:hover:text-brand-400 mb-6 inline-block">
          {t('backToLibrary')}
        </Link>
        <div className="mb-8">
          <h1 className="display-title mb-2">{series.title}</h1>
          <p className="text-muted">{series.year} · {sermons.length} predicaciones</p>
          {series.description && <p className="text-muted mt-3">{series.description}</p>}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {sermons.map(s => <SermonCard key={s.id} sermon={s} locale={locale} />)}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Paso 2: Crear página de predicador**

```typescript
// nextjs/src/app/[locale]/biblioteca/predicador/[slug]/page.tsx
export const revalidate = 300;

import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { getPreacherWithSermons } from '@/lib/sermons';
import { SermonCard } from '@/components/sermons/SermonCard';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const result = await getPreacherWithSermons(slug);
  if (!result) return {};
  return { title: result.preacher.name };
}

export default async function PreacherPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const t = await getTranslations('biblioteca');
  const result = await getPreacherWithSermons(slug);
  if (!result) notFound();

  const { preacher, sermons } = result;

  return (
    <div className="section-padding">
      <div className="container-page">
        <Link href={`/${locale}/biblioteca`} className="text-sm text-muted hover:text-brand-600 dark:hover:text-brand-400 mb-6 inline-block">
          {t('backToLibrary')}
        </Link>
        <div className="mb-8">
          <h1 className="display-title mb-2">{preacher.name}</h1>
          <p className="text-muted">{sermons.length} predicaciones</p>
          {preacher.bio && <p className="text-muted mt-3">{preacher.bio}</p>}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {sermons.map(s => <SermonCard key={s.id} sermon={s} locale={locale} />)}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Paso 3: Commit**

```bash
git add "nextjs/src/app/[locale]/biblioteca/series/" "nextjs/src/app/[locale]/biblioteca/predicador/"
git commit -m "feat(biblioteca): add series and preacher listing pages"
```

---

## Tarea 14: `src/lib/sync-youtube.ts` — lógica de sync

**Archivos:**
- Crear: `nextjs/src/lib/sync-youtube.ts`
- Crear: `nextjs/tests/unit/sync-youtube.test.ts`

Esta función contiene la lógica de importación YouTube → Directus, separada de la API route para poder testarla.

- [ ] **Paso 1: Escribir tests primero**

Crear `nextjs/tests/unit/sync-youtube.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

process.env.YOUTUBE_API_KEY = 'test-key';
process.env.YOUTUBE_CHANNEL_ID = 'UCtest';
process.env.DIRECTUS_URL = 'http://directus:8055';
process.env.DIRECTUS_ADMIN_TOKEN = 'admin-token';

import { suggestFromTitle, buildThumbnailUrl } from '../../src/lib/sync-youtube';

describe('suggestFromTitle', () => {
  it('extracts series from known pattern', () => {
    const result = suggestFromTitle('Serie Romanos #3 — El llamado');
    expect(result.suggestedSeries).toBe('Romanos');
  });

  it('returns empty strings for generic titles', () => {
    const result = suggestFromTitle('Culto Domingo AM');
    expect(result.suggestedSeries).toBe('');
    expect(result.suggestedPreacher).toBe('');
  });

  it('extracts year-based series', () => {
    const result = suggestFromTitle('AVIVAMIENTO 2023 DIA 2');
    expect(result.suggestedSeries).toContain('2023');
  });
});

describe('buildThumbnailUrl', () => {
  it('builds maxresdefault URL from youtube_id', () => {
    const url = buildThumbnailUrl('dQw4w9WgXcQ');
    expect(url).toBe('https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg');
  });
});
```

- [ ] **Paso 2: Correr tests — deben fallar**

```bash
cd nextjs && npm test tests/unit/sync-youtube.test.ts
```
Esperado: FAIL — "Cannot find module"

- [ ] **Paso 3: Crear `nextjs/src/lib/sync-youtube.ts`**

```typescript
// nextjs/src/lib/sync-youtube.ts
const YT_API_BASE = 'https://www.googleapis.com/youtube/v3';

export interface SyncResult {
  inserted: number;
  updated: number;
  errors: string[];
}

export interface YouTubeVideoItem {
  id: { videoId: string };
  snippet: {
    title: string;
    description: string;
    publishedAt: string;
    thumbnails: {
      maxres?: { url: string };
      high?: { url: string };
      medium?: { url: string };
    };
  };
  contentDetails?: { duration: string };
  statistics?: { viewCount: string };
}

// Pattern rules for suggesting series and preacher from YouTube title
const SERIES_PATTERNS = [
  /serie[:\s]+([a-záéíóúüñ0-9\s]+?)(?:\s+#\d+|\s+parte|\s+cap|$|[\|\-—])/i,
  /avivamiento\s+(\d{4})/i,
  /retiro\s+(\d{4})/i,
];

const PREACHER_PATTERNS = [
  /(?:pastor|pastora|hno|hnao?|hermano|hermana)[.\s]+([a-záéíóúüñ\s]+?)(?:\s*[\|\-—]|$)/i,
  /[\|\-—]\s*(?:pastor|pastora)?[.\s]*([A-ZÁÉÍÓÚÜÑ][a-záéíóúüñ]+(?:\s+[A-ZÁÉÍÓÚÜÑ][a-záéíóúüñ]+)?)\s*$/,
];

export function suggestFromTitle(title: string): { suggestedSeries: string; suggestedPreacher: string } {
  let suggestedSeries = '';
  let suggestedPreacher = '';

  for (const pattern of SERIES_PATTERNS) {
    const match = title.match(pattern);
    if (match) {
      suggestedSeries = match[1].trim();
      break;
    }
  }

  for (const pattern of PREACHER_PATTERNS) {
    const match = title.match(pattern);
    if (match) {
      suggestedPreacher = match[1].trim();
      break;
    }
  }

  return { suggestedSeries, suggestedPreacher };
}

export function buildThumbnailUrl(youtubeId: string): string {
  return `https://i.ytimg.com/vi/${youtubeId}/maxresdefault.jpg`;
}

// ISO 8601 duration (PT1H2M3S) to seconds
function parseDuration(iso: string): number {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  return (parseInt(match[1] ?? '0') * 3600) + (parseInt(match[2] ?? '0') * 60) + parseInt(match[3] ?? '0');
}

function generateSlug(title: string, youtubeId: string): string {
  const base = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60);
  return `${base}-${youtubeId.slice(-4)}`;
}

async function fetchYouTubePage(
  apiKey: string,
  channelId: string,
  pageToken?: string,
  publishedAfter?: string
): Promise<{ items: YouTubeVideoItem[]; nextPageToken?: string }> {
  let url = `${YT_API_BASE}/search?part=snippet&channelId=${channelId}&type=video&order=date&maxResults=50&key=${apiKey}`;
  if (pageToken) url += `&pageToken=${pageToken}`;
  if (publishedAfter) url += `&publishedAfter=${encodeURIComponent(publishedAfter)}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`YouTube API error: ${res.status}`);
  const data = await res.json();

  // Enrich with contentDetails for duration
  const videoIds = (data.items ?? []).map((i: YouTubeVideoItem) => i.id.videoId).join(',');
  let enriched = data.items ?? [];
  if (videoIds) {
    const detailsUrl = `${YT_API_BASE}/videos?part=contentDetails,statistics&id=${videoIds}&key=${apiKey}`;
    const detailsRes = await fetch(detailsUrl);
    if (detailsRes.ok) {
      const details = await detailsRes.json();
      const detailMap = new Map((details.items ?? []).map((d: Record<string, unknown>) => [d.id, d]));
      enriched = enriched.map((item: YouTubeVideoItem) => ({
        ...item,
        contentDetails: (detailMap.get(item.id.videoId) as Record<string, unknown>)?.contentDetails,
        statistics: (detailMap.get(item.id.videoId) as Record<string, unknown>)?.statistics,
      }));
    }
  }

  return { items: enriched, nextPageToken: data.nextPageToken };
}

async function upsertSermon(
  directusUrl: string,
  adminToken: string,
  video: YouTubeVideoItem,
  existingId: string | null,
  lastSyncedAt: string
): Promise<'inserted' | 'updated' | 'error'> {
  const { id: { videoId }, snippet, contentDetails, statistics } = video;
  const thumbnailUrl = buildThumbnailUrl(videoId);
  const durationSeconds = contentDetails?.duration ? parseDuration(contentDetails.duration) : null;
  const viewCount = statistics?.viewCount ? parseInt(statistics.viewCount) : 0;

  if (existingId) {
    // Update only safe fields — never touch editorial fields
    const res = await fetch(`${directusUrl}/items/sermons/${existingId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        youtube_status: 'available',
        view_count: viewCount,
        duration_seconds: durationSeconds,
        last_synced_at: lastSyncedAt,
      }),
    });
    return res.ok ? 'updated' : 'error';
  }

  // Insert new sermon
  const { suggestedSeries, suggestedPreacher } = suggestFromTitle(snippet.title);
  const slug = generateSlug(snippet.title, videoId);

  const res = await fetch(`${directusUrl}/items/sermons`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: snippet.title,
      raw_youtube_title: snippet.title,
      slug,
      youtube_id: videoId,
      youtube_status: 'available',
      visibility: 'public',
      featured: false,
      description: snippet.description?.slice(0, 2000) || null,
      thumbnail_url: thumbnailUrl,
      duration_seconds: durationSeconds,
      view_count: viewCount,
      youtube_published_at: snippet.publishedAt,
      sermon_date: snippet.publishedAt?.split('T')[0] ?? null,
      suggested_series: suggestedSeries || null,
      suggested_preacher: suggestedPreacher || null,
      imported_at: lastSyncedAt,
      last_synced_at: lastSyncedAt,
    }),
  });
  return res.ok ? 'inserted' : 'error';
}

export async function runYoutubeSync(options: {
  full?: boolean;
  publishedAfter?: string;
}): Promise<SyncResult> {
  const apiKey = process.env.YOUTUBE_API_KEY!;
  const channelId = process.env.YOUTUBE_CHANNEL_ID!;
  const directusUrl = process.env.DIRECTUS_URL ?? 'http://directus:8055';
  const adminToken = process.env.DIRECTUS_ADMIN_TOKEN!;

  const result: SyncResult = { inserted: 0, updated: 0, errors: [] };
  const syncedAt = new Date().toISOString();

  let pageToken: string | undefined;

  do {
    const { items, nextPageToken } = await fetchYouTubePage(
      apiKey, channelId, pageToken, options.full ? undefined : options.publishedAfter
    );

    for (const video of items) {
      try {
        const videoId = video.id.videoId;
        // Check if already in Directus
        const checkRes = await fetch(
          `${directusUrl}/items/sermons?filter[youtube_id][_eq]=${videoId}&fields=id&limit=1`,
          { headers: { Authorization: `Bearer ${adminToken}` } }
        );
        const checkData = await checkRes.json();
        const existingId = checkData?.data?.[0]?.id ?? null;

        const outcome = await upsertSermon(directusUrl, adminToken, video, existingId, syncedAt);
        if (outcome === 'inserted') result.inserted++;
        else if (outcome === 'updated') result.updated++;
        else result.errors.push(videoId);
      } catch (err) {
        result.errors.push(`${video.id.videoId}: ${String(err)}`);
      }
    }

    pageToken = nextPageToken;
  } while (pageToken && options.full);

  return result;
}
```

- [ ] **Paso 4: Correr tests — deben pasar**

```bash
cd nextjs && npm test tests/unit/sync-youtube.test.ts
```
Esperado: PASS — 4 tests

- [ ] **Paso 5: Commit**

```bash
git add nextjs/src/lib/sync-youtube.ts nextjs/tests/unit/sync-youtube.test.ts
git commit -m "feat(biblioteca): add YouTube sync logic with pattern matching and upsert"
```

---

## Tarea 15: API route `/api/sync/youtube`

**Archivos:**
- Crear: `nextjs/src/app/api/sync/youtube/route.ts`

- [ ] **Paso 1: Crear la ruta**

```typescript
// nextjs/src/app/api/sync/youtube/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { runYoutubeSync } from '@/lib/sync-youtube';

// Simple rate limit: 1 sync per 10 minutes
let lastSyncAt = 0;
const SYNC_COOLDOWN_MS = 10 * 60 * 1000;

// Redis lock key — prevents concurrent syncs across restarts
const LOCK_KEY = 'youtube_sync_lock';
const LOCK_TTL = 900; // 15 minutes

async function acquireLock(directusUrl: string, adminToken: string): Promise<boolean> {
  // Use activity_logs as a simple distributed lock check
  // Check if there's a running sync in the last 15 min
  const since = new Date(Date.now() - LOCK_TTL * 1000).toISOString();
  const res = await fetch(
    `${directusUrl}/items/activity_logs?filter[action][_eq]=youtube_sync_running&filter[date_created][_gte]=${since}&limit=1`,
    { headers: { Authorization: `Bearer ${adminToken}` } }
  ).catch(() => null);

  if (res?.ok) {
    const data = await res.json();
    if (data?.data?.length > 0) return false; // Lock held
  }

  // Write lock marker
  await fetch(`${directusUrl}/items/activity_logs`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'youtube_sync_running', metadata: { started_at: new Date().toISOString() } }),
  }).catch(() => {});

  return true;
}

export async function POST(request: NextRequest) {
  // Validate SYNC_SECRET
  const auth = request.headers.get('Authorization');
  const expected = `Bearer ${process.env.SYNC_SECRET}`;
  if (!auth || auth !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // In-memory rate limit
  if (Date.now() - lastSyncAt < SYNC_COOLDOWN_MS) {
    return NextResponse.json({ error: 'Sync cooldown active. Retry in 10 minutes.' }, { status: 429 });
  }

  const directusUrl = process.env.DIRECTUS_URL ?? 'http://directus:8055';
  const adminToken = process.env.DIRECTUS_ADMIN_TOKEN!;

  const locked = await acquireLock(directusUrl, adminToken);
  if (!locked) {
    return NextResponse.json({ error: 'Sync already running' }, { status: 409 });
  }

  lastSyncAt = Date.now();

  const full = request.nextUrl.searchParams.get('full') === 'true';

  // For incremental sync: find last successful sync timestamp
  let publishedAfter: string | undefined;
  if (!full) {
    try {
      const logsRes = await fetch(
        `${directusUrl}/items/activity_logs?filter[action][_eq]=youtube_sync&sort[]=-date_created&limit=1`,
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      const logsData = await logsRes.json();
      const lastSync = logsData?.data?.[0]?.date_created;
      if (lastSync) publishedAfter = lastSync;
    } catch { /* first sync — no publishedAfter */ }
  }

  try {
    const result = await runYoutubeSync({ full, publishedAfter });

    // Log result
    await fetch(`${directusUrl}/items/activity_logs`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'youtube_sync',
        metadata: { ...result, full, publishedAfter },
      }),
    }).catch(() => {});

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error('Sync error:', err);
    return NextResponse.json({ error: 'Sync failed', detail: String(err) }, { status: 500 });
  }
}
```

- [ ] **Paso 2: Agregar `SYNC_SECRET` al `.env.example`**

Abrir `.env.example` y agregar al bloque de NextAuth:

```
# Sync job — GitHub Actions usa este token para disparar /api/sync/youtube
SYNC_SECRET=<openssl rand -base64 32>
```

- [ ] **Paso 3: Verificar TS**

```bash
cd nextjs && npx tsc --noEmit
```
Esperado: sin errores.

- [ ] **Paso 4: Commit**

```bash
git add nextjs/src/app/api/sync/youtube/route.ts .env.example
git commit -m "feat(biblioteca): add protected YouTube sync API route with lock and rate limit"
```

---

## Tarea 16: GitHub Actions workflow

**Archivos:**
- Crear: `.github/workflows/sync-sermons.yml`

- [ ] **Paso 1: Crear el workflow**

```yaml
# .github/workflows/sync-sermons.yml
name: Sync sermons from YouTube

on:
  schedule:
    - cron: '0 9 * * *'  # 3am Costa Rica (UTC-6) = 9am UTC
  workflow_dispatch:       # permite disparar manualmente desde GitHub UI

jobs:
  sync:
    runs-on: ubuntu-latest
    timeout-minutes: 10

    steps:
      - name: Trigger YouTube sync
        run: |
          response=$(curl -s -o /dev/null -w "%{http_code}" \
            -X POST https://liriodelosvallescr.org/api/sync/youtube \
            -H "Authorization: Bearer ${{ secrets.SYNC_SECRET }}")
          echo "HTTP status: $response"
          if [ "$response" != "200" ]; then
            echo "Sync failed with status $response"
            exit 1
          fi
```

> Prerequisito en GitHub: agregar `SYNC_SECRET` en Settings → Secrets and variables → Actions → New repository secret.

- [ ] **Paso 2: Commit**

```bash
git add .github/workflows/sync-sermons.yml
git commit -m "feat(biblioteca): add GitHub Actions cron for daily YouTube sync"
```

---

## Tarea 17: Build final y verificación

- [ ] **Paso 1: Build completo**

```bash
cd nextjs && npm run build
```
Esperado: build exitoso, todas las rutas nuevas aparecen en la tabla de salida:
```
├ ƒ /[locale]/biblioteca
├ ƒ /[locale]/biblioteca/[slug]
├ ƒ /[locale]/biblioteca/series/[slug]
├ ƒ /[locale]/biblioteca/predicador/[slug]
├ ƒ /api/sync/youtube
├ ○ /offline
```

- [ ] **Paso 2: Tests unitarios**

```bash
cd nextjs && npm test
```
Esperado: PASS — todos los tests existentes + los nuevos (sermons.test.ts, sync-youtube.test.ts).

- [ ] **Paso 3: Verificar que Fase 2A no se rompió**

```bash
# Con el servidor corriendo (npm run dev o docker compose up):
curl http://localhost:4000/api/health/auth | jq .status
```
Esperado: `"ok"`

- [ ] **Paso 4: Verificar sync manualmente**

```bash
# Con SYNC_SECRET configurado:
curl -X POST http://localhost:4000/api/sync/youtube \
  -H "Authorization: Bearer $SYNC_SECRET" | jq .
```
Esperado: `{ "ok": true, "inserted": N, "updated": M, "errors": [] }`

- [ ] **Paso 5: Commit final**

```bash
git add .
git commit -m "feat(fase-2b): complete sermon library — SW strategy, Directus collections, sync, pages, components"
```

---

## Variables de entorno nuevas (resumen)

Agregar al `.env` del servidor antes del deploy:

```
SYNC_SECRET=<openssl rand -base64 32>
```

Las demás variables ya existen (`YOUTUBE_API_KEY`, `YOUTUBE_CHANNEL_ID`, `DIRECTUS_ADMIN_TOKEN`).

Agregar en GitHub Secrets:
```
SYNC_SECRET=<mismo valor que el .env del servidor>
```

---

## Checklist de verificación post-deploy

- [ ] `GET /es/biblioteca` → muestra hero + series + recientes
- [ ] `GET /es/biblioteca/[slug-valido]` → página con player, metadata, relacionados
- [ ] `GET /es/biblioteca/[slug-privado]` → 404
- [ ] `POST /api/sync/youtube` sin token → 401
- [ ] `POST /api/sync/youtube` con token correcto → 200, videos aparecen en Directus
- [ ] `POST /api/sync/youtube?full=true` → importación masiva completa
- [ ] GitHub Actions workflow `sync-sermons.yml` se puede disparar manualmente → exitoso
- [ ] `GET /api/health/auth` → sigue respondiendo `ok` (Fase 2A intacta)
- [ ] Filtros y búsqueda en `/biblioteca` funcionan sin requests extra al servidor
- [ ] En Chrome DevTools → Application → Service Worker: `/api/*` no aparece en caché
- [ ] Instalar PWA en móvil → `/biblioteca` carga en modo offline con datos cacheados previos
