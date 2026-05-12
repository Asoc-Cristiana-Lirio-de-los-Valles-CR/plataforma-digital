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
  email: string;
  address: string;
  facebook_url: string;
  youtube_url: string;
  instagram_url: string;
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
}

export interface VideoItem {
  videoId: string;
  title: string;
  thumbnail: string;
  publishedAt?: string;
}
