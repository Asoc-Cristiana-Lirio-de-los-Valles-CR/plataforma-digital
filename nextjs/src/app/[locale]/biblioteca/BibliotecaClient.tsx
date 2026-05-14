'use client';

import { useState, useMemo } from 'react';
import type { Sermon, SermonSeries, Preacher } from '@/lib/types';
import { SermonCard } from '@/components/sermons/SermonCard';
import { SeriesRow } from '@/components/sermons/SeriesRow';
import { SermonFilters, type FilterState } from '@/components/sermons/SermonFilters';
import { SermonSearch } from '@/components/sermons/SermonSearch';
import { SermonHero } from '@/components/sermons/SermonHero';

interface BibliotecaClientProps {
  sermons: Sermon[];
  featuredSermon: Sermon | null;
  seriesList: SermonSeries[];
  preachers: Preacher[];
  locale: string;
  t: Record<string, string>;
}

export function BibliotecaClient({ sermons, featuredSermon, seriesList, preachers, locale, t }: BibliotecaClientProps) {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<FilterState>({ seriesId: null, preacherId: null, year: null });

  const years = useMemo(() => {
    const ys = sermons
      .map(s => s.sermon_date ? new Date(s.sermon_date).getFullYear() : null)
      .filter((y): y is number => y !== null);
    return [...new Set(ys)].sort((a, b) => b - a);
  }, [sermons]);

  const filtered = useMemo(() => {
    return sermons.filter((s) => {
      if (filters.seriesId && s.series?.id !== filters.seriesId) return false;
      if (filters.preacherId && s.preacher?.id !== filters.preacherId) return false;
      if (filters.year && s.sermon_date && String(new Date(s.sermon_date).getFullYear()) !== filters.year) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          s.title.toLowerCase().includes(q) ||
          s.preacher?.name.toLowerCase().includes(q) ||
          s.series?.title.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [sermons, filters, search]);

  const isFiltering = !!search || !!filters.seriesId || !!filters.preacherId || !!filters.year;

  const seriesSermonsMap = useMemo(() => {
    const map = new Map<string, Sermon[]>();
    for (const serie of seriesList) {
      map.set(serie.id, sermons.filter(s => s.series?.id === serie.id).slice(0, 8));
    }
    return map;
  }, [sermons, seriesList]);

  return (
    <div className="space-y-12">
      {featuredSermon && !isFiltering && (
        <section className="section-padding bg-subtle">
          <div className="container-page">
            <div className="text-center mb-8">
              <span className="text-xs font-semibold tracking-widest uppercase text-brand-500 dark:text-brand-400">
                {t.featured}
              </span>
            </div>
            <SermonHero sermon={featuredSermon} />
          </div>
        </section>
      )}

      <section className="section-padding">
        <div className="container-page">
          <div className="space-y-4 mb-8">
            <SermonSearch value={search} onChange={setSearch} placeholder={t.searchPlaceholder} />
            <SermonFilters series={seriesList} preachers={preachers} years={years} filters={filters} onChange={setFilters} />
          </div>

          {isFiltering ? (
            filtered.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map(s => <SermonCard key={s.id} sermon={s} locale={locale} />)}
              </div>
            ) : (
              <p className="text-center text-muted py-12">{t.noResults}</p>
            )
          ) : (
            <div className="space-y-12">
              {seriesList.map(serie => {
                const sSermons = seriesSermonsMap.get(serie.id) ?? [];
                return <SeriesRow key={serie.id} series={serie} sermons={sSermons} locale={locale} />;
              })}

              <div>
                <h3 className="text-lg font-display font-semibold text-brand-900 dark:text-white mb-4">
                  {t.recentSermons}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {sermons.slice(0, 6).map(s => <SermonCard key={s.id} sermon={s} locale={locale} />)}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
