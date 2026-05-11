import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { Providers } from './providers';
import '@/app/globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Iglesia Cristiana Lirio de los Valles',
    template: '%s | Lirio de los Valles',
  },
  description: 'Iglesia Cristiana Lirio de los Valles — Comunidad de fe en Costa Rica',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://liriodelosvallescr.org'),
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
    <html lang={locale} suppressHydrationWarning>
      <body>
        <NextIntlClientProvider messages={messages}>
          <Providers>
            {children}
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
