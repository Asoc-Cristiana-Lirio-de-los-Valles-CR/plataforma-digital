import { createDirectus, rest, readItems, readSingleton } from '@directus/sdk';
import type { ServiceSchedule, WeeklyVerse, ChurchInfo } from './types';

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
    const items = await directus.request(readItems('weekly_verse' as any, { limit: 1 })) as WeeklyVerse[];
    return items[0] ?? null;
  } catch {
    return null;
  }
}

export async function getChurchInfo(): Promise<ChurchInfo | null> {
  try {
    const items = await directus.request(readItems('church_info' as any, { limit: 1 })) as ChurchInfo[];
    return items[0] ?? null;
  } catch {
    return null;
  }
}

export { directus };
