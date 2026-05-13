export const revalidate = 60;

import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { Cormorant_Garamond, DM_Sans } from 'next/font/google';
import { Providers } from './providers';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import '@/app/globals.css';

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  display: 'swap',
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://liriodelosvallescr.org';

export const metadata: Metadata = {
  title: {
    default: 'Iglesia Cristiana Lirio de los Valles',
    template: '%s | Lirio de los Valles',
  },
  description: 'Iglesia Cristiana Lirio de los Valles — Comunidad de fe en San José, Costa Rica. Servicios, transmisiones en vivo y más.',
  metadataBase: new URL(siteUrl),
  keywords: ['iglesia', 'cristiana', 'lirio de los valles', 'costa rica', 'san josé', 'fe', 'comunidad'],
  openGraph: {
    type: 'website',
    url: siteUrl,
    siteName: 'Iglesia Cristiana Lirio de los Valles',
    title: 'Iglesia Cristiana Lirio de los Valles',
    description: 'Comunidad de fe en Costa Rica. Bienvenido a casa.',
    locale: 'es_CR',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Iglesia Cristiana Lirio de los Valles',
    description: 'Comunidad de fe en Costa Rica. Bienvenido a casa.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${dmSans.variable} ${cormorant.variable}`}
    >
      <body className="font-sans antialiased">
        <NextIntlClientProvider messages={messages}>
          <Providers>
            <Header />
            <main>{children}</main>
            <Footer />
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
