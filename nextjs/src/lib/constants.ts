export const SITE = {
  name: 'Iglesia Cristiana Lirio de los Valles',
  nameEn: 'Lirio de los Valles Christian Church',
  legalId: '3-002-104369',
  domain: 'liriodelosvallescr.org',
  url: 'https://liriodelosvallescr.org',
} as const;

export const SOCIAL = {
  facebook: 'https://www.facebook.com/liriodelosvalles',
  youtube: 'https://www.youtube.com/@liriodelosvalles',
  instagram: 'https://www.instagram.com/liriodelosvalles',
} as const;

export const NAV_LINKS = [
  { href: '/', key: 'home' },
  { href: '/historia', key: 'history' },
  { href: '/en-vivo', key: 'live' },
  { href: '/donaciones', key: 'donate' },
  { href: '/contacto', key: 'contact' },
] as const;

export const LOCALES = ['es', 'en'] as const;
export type Locale = typeof LOCALES[number];

export function siteName(locale: string) {
  return locale === 'en' ? SITE.nameEn : SITE.name;
}

// Fallback schedule when Directus is unreachable — day keys must match messages/days translations
export const DEFAULT_SCHEDULE = [
  { day: 'wednesday', time: '9:30 a.m.', name: 'Ayuno y Oración', name_en: 'Fasting & Prayer' },
  { day: 'wednesday', time: '6:30 p.m.', name: 'Culto de Adoración', name_en: 'Worship Service' },
  { day: 'friday', time: '7:00 p.m.', name: 'Red Juvenil', name_en: 'Youth Network' },
  { day: 'saturday', time: '6:30 p.m.', name: 'Culto General', name_en: 'General Service' },
] as const;
