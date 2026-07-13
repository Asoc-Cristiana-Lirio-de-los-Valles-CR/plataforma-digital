import { createDirectus, rest, readItems, readSingleton } from '@directus/sdk';
import type { ServiceSchedule, WeeklyVerse, ChurchInfo, ChurchLeader, Ministerio, Page } from './types';

// DIRECTUS_URL = server-side only (container-to-container, e.g. http://directus:8055)
// NEXT_PUBLIC_DIRECTUS_URL = browser-side (e.g. https://admin.liriodelosvallescr.org)
const directus = createDirectus(
  process.env.DIRECTUS_URL ?? process.env.NEXT_PUBLIC_DIRECTUS_URL ?? 'http://directus:8055'
).with(rest({ onRequest: (options) => ({ ...options, cache: 'no-store' }) }));

export async function getServiceSchedule(): Promise<ServiceSchedule[]> {
  try {
    return await directus.request(
      readItems('service_schedule', {
        sort: ['sort'],
        filter: { status: { _eq: 'published' } },
      })
    ) as ServiceSchedule[];
  } catch {
    return [];
  }
}

export async function getWeeklyVerse(): Promise<WeeklyVerse | null> {
  try {
    const result = await directus.request(readItems('weekly_verse' as any, { limit: 1 }));
    if (Array.isArray(result)) return (result[0] as WeeklyVerse) ?? null;
    return (result as unknown as WeeklyVerse) ?? null;
  } catch {
    return null;
  }
}

export async function getChurchInfo(): Promise<ChurchInfo | null> {
  try {
    const result = await directus.request(readItems('church_info' as any, { limit: 1 }));
    // Directus returns singleton as object, regular collection as array
    if (Array.isArray(result)) return (result[0] as ChurchInfo) ?? null;
    return (result as unknown as ChurchInfo) ?? null;
  } catch {
    return null;
  }
}

export async function getChurchLeaders(): Promise<ChurchLeader[]> {
  try {
    return await directus.request(
      readItems('church_leaders', {
        sort: ['sort', 'name'],
        filter: { status: { _eq: 'published' }, visible_public: { _neq: false } },
        fields: ['*'],
      })
    ) as ChurchLeader[];
  } catch {
    return [];
  }
}

export async function getMinisterios(): Promise<Ministerio[]> {
  try {
    return await directus.request(
      readItems('ministerios', {
        sort: ['sort', 'name'],
        filter: { status: { _eq: 'published' } },
        fields: ['*'],
      })
    ) as Ministerio[];
  } catch {
    return [];
  }
}

export async function getPageBySlug(slug: string): Promise<Page | null> {
  try {
    const results = await directus.request(
      readItems('pages' as any, {
        filter: { slug: { _eq: slug }, status: { _eq: 'published' } },
        fields: ['*', 'blocks.*', 'blocks.item.*'],
        limit: 1,
      })
    ) as Page[];
    return results[0] ?? null;
  } catch {
    return null;
  }
}

export async function getPageSlugs(): Promise<string[]> {
  try {
    const results = await directus.request(
      readItems('pages' as any, {
        filter: { status: { _eq: 'published' } },
        fields: ['slug'],
      })
    ) as { slug: string }[];
    return results.map((p) => p.slug);
  } catch {
    return [];
  }
}

export { directus };
