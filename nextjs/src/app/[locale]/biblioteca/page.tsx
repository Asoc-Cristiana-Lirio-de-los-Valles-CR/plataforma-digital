export const revalidate = 60;

import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { getSermons, getSermonsByYear, searchSermons, getFeaturedSermon, getSeriesList, getPreachers, getAvailableYears } from '@/lib/sermons';
import { BibliotecaClient } from './BibliotecaClient';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Biblioteca de Predicaciones',
    description: 'Predicaciones, series y mensajes de la Iglesia Cristiana Lirio de los Valles.',
  };
}

export default async function BibliotecaPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ year?: string; q?: string }>;
}) {
  const { locale } = await params;
  const { year, q } = await searchParams;
  const t = await getTranslations('biblioteca');

  const selectedYear = year ? parseInt(year) : null;
  const searchQuery = q?.trim() ?? '';

  const [sermons, featuredSermon, seriesList, preachers, availableYears] = await Promise.all([
    searchQuery
      ? searchSermons(searchQuery)
      : selectedYear
        ? getSermonsByYear(selectedYear)
        : getSermons(200),
    getFeaturedSermon(),
    getSeriesList(),
    getPreachers(),
    getAvailableYears(),
  ]);

  const tObj = {
    featured: t('featured'),
    recentSermons: t('recentSermons'),
    searchPlaceholder: t('searchPlaceholder'),
    noResults: t('noResults'),
  };

  return (
    <>
      <section className="section-padding bg-subtle">
        <div className="container-page">
          <div className="max-w-3xl mx-auto text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="gold-line" />
              <span className="text-muted text-xs font-semibold tracking-[0.2em] uppercase">Lirio de los Valles</span>
              <div className="gold-line" />
            </div>
            <h1 className="display-title mb-4">{t('title')}</h1>
            <p className="text-muted text-lg">{t('subtitle')}</p>
          </div>
        </div>
      </section>

      <BibliotecaClient
        sermons={sermons}
        featuredSermon={featuredSermon}
        seriesList={seriesList}
        preachers={preachers}
        locale={locale}
        t={tObj}
        availableYears={availableYears}
        selectedYear={selectedYear}
        searchQuery={searchQuery}
      />
    </>
  );
}
