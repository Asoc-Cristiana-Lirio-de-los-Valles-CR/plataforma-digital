import { createDirectus, rest, readItems, readSingleton } from '@directus/sdk';
import type { ServiceSchedule, WeeklyVerse, ChurchInfo, ChurchLeader, Ministerio } from './types';

// DIRECTUS_URL = server-side only (container-to-container, e.g. http://directus:8055)
// NEXT_PUBLIC_DIRECTUS_URL = browser-side (e.g. https://admin.liriodelosvallescr.org)
const directus = createDirectus(
  process.env.DIRECTUS_URL ?? process.env.NEXT_PUBLIC_DIRECTUS_URL ?? 'http://directus:8055'
).with(rest());

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
        filter: { status: { _eq: 'published' } },
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

export { directus };
