'use client';

import type { Preacher, SermonSeries } from '@/lib/types';

export interface FilterState {
  seriesId: string | null;
  preacherId: string | null;
  year: string | null;
}

interface SermonFiltersProps {
  series: SermonSeries[];
  preachers: Preacher[];
  years: number[];
  filters: FilterState;
  onChange: (filters: FilterState) => void;
}

export function SermonFilters({ series, preachers, years, filters, onChange }: SermonFiltersProps) {
  const chip = (label: string, active: boolean, onClick: () => void) => (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
        active
          ? 'bg-brand-600 text-white'
          : 'bg-brand-100 dark:bg-brand-900 text-brand-700 dark:text-brand-300 hover:bg-brand-200 dark:hover:bg-brand-800'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-3">
      {series.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {chip('Todas las series', !filters.seriesId, () => onChange({ ...filters, seriesId: null }))}
          {series.map((s) =>
            chip(s.title, filters.seriesId === s.id, () =>
              onChange({ ...filters, seriesId: filters.seriesId === s.id ? null : s.id })
            )
          )}
        </div>
      )}
      {preachers.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {chip('Todos los predicadores', !filters.preacherId, () => onChange({ ...filters, preacherId: null }))}
          {preachers.map((p) =>
            chip(p.name, filters.preacherId === p.id, () =>
              onChange({ ...filters, preacherId: filters.preacherId === p.id ? null : p.id })
            )
          )}
        </div>
      )}
      {years.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {chip('Todos los años', !filters.year, () => onChange({ ...filters, year: null }))}
          {years.map((y) =>
            chip(String(y), filters.year === String(y), () =>
              onChange({ ...filters, year: filters.year === String(y) ? null : String(y) })
            )
          )}
        </div>
      )}
    </div>
  );
}
