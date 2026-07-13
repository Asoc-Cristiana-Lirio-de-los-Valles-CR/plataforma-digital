export const revalidate = 300;

import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { getSeriesWithSermons } from '@/lib/sermons';
import { SermonCard } from '@/components/sermons/SermonCard';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const result = await getSeriesWithSermons(slug);
  if (!result) return {};
  return { title: result.series.title, description: result.series.description ?? undefined };
}

export default async function SeriesPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const t = await getTranslations('biblioteca');
  const result = await getSeriesWithSermons(slug);
  if (!result) notFound();

  const { series, sermons } = result;

  return (
    <div className="section-padding">
      <div className="container-page">
        <Link href={`/${locale}/biblioteca`} className="text-sm text-muted hover:text-brand-600 dark:hover:text-brand-400 mb-6 inline-block">
          {t('backToLibrary')}
        </Link>
        <div className="mb-8">
          <h1 className="display-title mb-2">{series.title}</h1>
          <p className="text-muted">{series.year} · {sermons.length} predicaciones</p>
          {series.description && <p className="text-muted mt-3">{series.description}</p>}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {sermons.map(s => <SermonCard key={s.id} sermon={s} locale={locale} />)}
        </div>
      </div>
    </div>
  );
}
