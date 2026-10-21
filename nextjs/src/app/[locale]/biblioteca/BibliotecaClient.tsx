'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
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
  availableYears: number[];
  selectedYear: number | null;
  searchQuery: string;
}

export function BibliotecaClient({
  sermons, featuredSermon, seriesList, preachers, locale, t,
  availableYears, selectedYear, searchQuery,
}: BibliotecaClientProps) {
  const router = useRouter();
  const pathname = usePathname();

  // Local search input mirrors the server-side query
  const [search, setSearch] = useState(searchQuery);
  const [filters, setFilters] = useState<FilterState>({
    seriesId: null,
    preacherId: null,
    year: selectedYear ? String(selectedYear) : null,
  });

  // Debounce search → push URL param so server re-fetches
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams();
      if (search.trim()) params.set('q', search.trim());
      if (filters.year) params.set('year', filters.year);
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function handleYearChange(year: string | null) {
    setFilters(f => ({ ...f, year }));
    // Clear search when switching year, rebuild URL
    const params = new URLSearchParams();
    if (search.trim()) params.set('q', search.trim());
    if (year) params.set('year', year);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  // Client-side filter: only series/preacher (search & year are server-side)
  const filtered = useMemo(() => {
    return sermons.filter((s) => {
      if (filters.seriesId && s.series?.id !== filters.seriesId) return false;
      if (filters.preacherId && s.preacher?.id !== filters.preacherId) return false;
      return true;
    });
  }, [sermons, filters]);

  const isFiltering = !!searchQuery || !!filters.seriesId || !!filters.preacherId || !!selectedYear;

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
            <SermonFilters
              series={seriesList}
              preachers={preachers}
              years={availableYears}
              filters={filters}
              onChange={(f) => {
                if (f.year !== filters.year) {
                  handleYearChange(f.year);
                } else {
                  setFilters(f);
                }
              }}
            />
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
