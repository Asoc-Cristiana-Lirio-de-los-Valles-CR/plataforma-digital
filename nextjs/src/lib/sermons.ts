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
        filter: { visibility: { _eq: 'public' }, youtube_status: { _eq: 'available' } },
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
        filter: { visibility: { _eq: 'public' }, youtube_status: { _eq: 'available' }, featured: { _eq: true } },
        sort: ['-sermon_date', '-youtube_published_at'],
        limit: 1,
        fields: SERMON_FIELDS as unknown as string[],
      })
    ) as Sermon[];
    if (results.length > 0) return results[0];

    const recent = await directus.request(
      readItems('sermons', {
        filter: { visibility: { _eq: 'public' }, youtube_status: { _eq: 'available' } },
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
    const filter: Record<string, unknown> = {
      visibility: { _eq: 'public' },
      youtube_status: { _eq: 'available' },
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

    if (results.length < limit) {
      const recent = await directus.request(
        readItems('sermons', {
          filter: { visibility: { _eq: 'public' }, youtube_status: { _eq: 'available' }, id: { _nin: [sermon.id, ...results.map(s => s.id)] } },
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
        filter: { visibility: { _eq: 'public' }, youtube_status: { _eq: 'available' }, series: { id: { _eq: series.id } } },
        sort: ['-sermon_date', '-youtube_published_at'],
        fields: SERMON_FIELDS as unknown as string[],
      })
    ) as Sermon[];

    return { series, sermons };
  } catch {
    return null;
  }
}

const MONTH_NAMES: Record<string, string> = {
  enero: '01', january: '01',
  febrero: '02', february: '02',
  marzo: '03', march: '03',
  abril: '04', april: '04',
  mayo: '05', may: '05',
  junio: '06', june: '06',
  julio: '07', july: '07',
  agosto: '08', august: '08',
  septiembre: '09', september: '09',
  octubre: '10', october: '10',
  noviembre: '11', november: '11',
  diciembre: '12', december: '12',
};

function buildDateFilters(q: string): Record<string, unknown>[] {
  const filters: Record<string, unknown>[] = [];
  const trimmed = q.trim().toLowerCase();

  // Full year: "2010"
  if (/^\d{4}$/.test(trimmed)) {
    const yr = trimmed;
    filters.push({ sermon_date: { _gte: `${yr}-01-01`, _lte: `${yr}-12-31` } });
    return filters; // year match is unambiguous, skip text search
  }

  // Month name: "mayo", "enero", etc.
  const monthNum = MONTH_NAMES[trimmed];
  if (monthNum) {
    // sermon_date contains "-MM-" pattern
    filters.push({ sermon_date: { _contains: `-${monthNum}-` } });
    return filters;
  }

  // "mayo 2024" or "2024 mayo"
  const monthYearMatch = trimmed.match(/^(\w+)\s+(\d{4})$/) ?? trimmed.match(/^(\d{4})\s+(\w+)$/);
  if (monthYearMatch) {
    const [, a, b] = monthYearMatch;
    const month = MONTH_NAMES[a.toLowerCase()] ?? MONTH_NAMES[b.toLowerCase()];
    const year = /^\d{4}$/.test(a) ? a : /^\d{4}$/.test(b) ? b : null;
    if (month && year) {
      filters.push({ sermon_date: { _gte: `${year}-${month}-01`, _lte: `${year}-${month}-31` } });
      return filters;
    }
  }

  // Day number only: "15" — ambiguous, include as date fragment alongside text
  if (/^\d{1,2}$/.test(trimmed)) {
    const day = trimmed.padStart(2, '0');
    filters.push({ sermon_date: { _contains: `-${day}` } });
  }

  return filters;
}

export async function searchSermons(query: string, limit = 300): Promise<Sermon[]> {
  if (!query.trim()) return [];
  try {
    const dateFilters = buildDateFilters(query.trim());
    const orClauses: Record<string, unknown>[] = [
      { title: { _icontains: query } },
      { description: { _icontains: query } },
      { raw_youtube_title: { _icontains: query } },
      ...dateFilters,
    ];

    return await directus.request(
      readItems('sermons', {
        filter: {
          visibility: { _eq: 'public' },
          youtube_status: { _eq: 'available' },
          _or: orClauses,
        },
        sort: ['-sermon_date', '-youtube_published_at'],
        limit,
        fields: SERMON_FIELDS as unknown as string[],
      })
    ) as Sermon[];
  } catch {
    return [];
  }
}

export async function getAvailableYears(): Promise<number[]> {
  try {
    // Fetch minimal fields to derive distinct years
    const results = await directus.request(
      readItems('sermons', {
        filter: { visibility: { _eq: 'public' }, youtube_status: { _eq: 'available' } },
        fields: ['sermon_date'],
        limit: -1,
      })
    ) as { sermon_date: string | null }[];
    const years = results
      .map(r => r.sermon_date ? new Date(r.sermon_date).getFullYear() : null)
      .filter((y): y is number => y !== null);
    return [...new Set(years)].sort((a, b) => b - a);
  } catch {
    return [];
  }
}

export async function getSermonsByYear(year: number, limit = 500): Promise<Sermon[]> {
  const from = `${year}-01-01`;
  const to = `${year}-12-31`;
  try {
    return await directus.request(
      readItems('sermons', {
        filter: {
          visibility: { _eq: 'public' },
          youtube_status: { _eq: 'available' },
          sermon_date: { _gte: from, _lte: to },
        },
        sort: ['-sermon_date', '-youtube_published_at'],
        limit,
        fields: SERMON_FIELDS as unknown as string[],
      })
    ) as Sermon[];
  } catch {
    return [];
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
        filter: { visibility: { _eq: 'public' }, youtube_status: { _eq: 'available' }, preacher: { id: { _eq: preacher.id } } },
        sort: ['-sermon_date', '-youtube_published_at'],
        fields: SERMON_FIELDS as unknown as string[],
      })
    ) as Sermon[];

    return { preacher, sermons };
  } catch {
    return null;
  }
}
