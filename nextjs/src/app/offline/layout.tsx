import type { Metadata } from 'next';
import { DM_Sans } from 'next/font/google';
import '@/app/globals.css';

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Sin conexión — Lirio de los Valles',
};

export default function OfflineLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${dmSans.variable} dark`}>
      <body className="bg-brand-950 text-white antialiased">{children}</body>
    </html>
  );
}
