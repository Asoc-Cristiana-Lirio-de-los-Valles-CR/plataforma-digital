import type { Metadata } from 'next';
import { getChurchInfo, getServiceSchedule } from '@/lib/directus';
import { ContactForm } from '@/components/sections/ContactForm';

export const metadata: Metadata = { title: 'Contacto' };

export default async function ContactoPage() {
  const [info, schedule] = await Promise.all([
    getChurchInfo(),
    getServiceSchedule(),
  ]);

  return <ContactForm churchInfo={info} schedule={schedule} />;
}
