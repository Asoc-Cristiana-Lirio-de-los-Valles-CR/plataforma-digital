import type { Metadata } from 'next';
import { ContactForm } from '@/components/sections/ContactForm';

export const metadata: Metadata = { title: 'Contacto' };

export default function ContactoPage() {
  return <ContactForm />;
}
