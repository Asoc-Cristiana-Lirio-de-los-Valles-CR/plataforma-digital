export interface ServiceSchedule {
  id: number;
  day: string;
  time: string;
  name: string;
  name_en: string;
  sort: number;
  status: 'published' | 'draft';
}

export interface WeeklyVerse {
  verse_text: string;
  verse_text_en: string;
  reference: string;
}

export interface ChurchInfo {
  name: string;
  description: string;
  description_en: string;
  history: string;
  history_en: string;
  vision: string;
  vision_en: string;
  mission: string;
  mission_en: string;
  faith_declaration: string;
  faith_declaration_en: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  address_map_url: string;
  facebook_url: string;
  youtube_url: string;
  instagram_url: string;
  tiktok_url: string;
  sinpe_number: string;
  sinpe_name: string;
  bank_name: string;
  bank_account: string;
  bank_iban: string;
  paypal_url: string;
  legal_name: string;
  cedula_juridica: string;
  legal_description: string;
  legal_description_en: string;
  google_maps_embed: string;
  youtube_channel_url: string;
  spotify_url: string;
  telegram_url: string;
  business_hours: string;
  founded_year: number | null;
}

export interface ChurchLeader {
  id: number;
  status: 'published' | 'draft';
  sort: number;
  name: string;
  role: 'pastor_general' | 'pastor' | 'anciano' | 'lider';
  title: string;
  photo: string | null;
  bio: string;
  bio_en: string;
  phone: string;
  whatsapp: string;
  email: string;
  facebook_url: string;
  instagram_url: string;
  youtube_url: string;
  years_serving: number | null;
  featured: boolean;
  slug: string;
  visible_public: boolean;
}

export interface Ministerio {
  id: number;
  status: 'published' | 'draft';
  sort: number;
  name: string;
  name_en: string;
  description: string;
  description_en: string;
  icon: string;
  photo: string | null;
  cover_image: string | null;
  leader_name: string;
  contact_phone: string;
  meeting_day: string;
  meeting_time: string;
  meeting_location: string;
  schedule_enabled: boolean;
}

export interface VideoItem {
  videoId: string;
  title: string;
  thumbnail: string;
  publishedAt?: string;
}
