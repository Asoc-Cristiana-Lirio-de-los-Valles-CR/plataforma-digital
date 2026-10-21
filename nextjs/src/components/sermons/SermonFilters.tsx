'use client';

import { useRef, useCallback } from 'react';
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

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
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
}

function YearCarousel({ years, activeYear, onSelect }: {
  years: number[];
  activeYear: string | null;
  onSelect: (year: string | null) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = useCallback((dir: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === 'left' ? -200 : 200, behavior: 'smooth' });
  }, []);

  const allItems = [{ label: 'Todos', value: null as string | null }, ...years.map(y => ({ label: String(y), value: String(y) }))];

  return (
    <div className="relative flex items-center gap-1">
      {/* Left arrow */}
      <button
        onClick={() => scroll('left')}
        aria-label="Años anteriores"
        className="flex-none flex items-center justify-center w-7 h-7 rounded-full
                   bg-brand-900/60 dark:bg-brand-950/80 border border-brand-700/40
                   text-brand-300 hover:text-white hover:bg-brand-700/60
                   transition-all duration-150 z-10 shadow-sm"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M9 11L5 7l4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Scroll track with fade edges */}
      <div className="relative flex-1 overflow-hidden">
        {/* Left fade */}
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-6 z-10
                        bg-gradient-to-r from-[hsl(var(--background))] to-transparent" />
        {/* Right fade */}
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-6 z-10
                        bg-gradient-to-l from-[hsl(var(--background))] to-transparent" />

        <div
          ref={scrollRef}
          className="flex items-center gap-1.5 overflow-x-auto scroll-smooth px-2 py-1"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {allItems.map(({ label, value }) => {
            const active = activeYear === value;
            return (
              <button
                key={label}
                onClick={() => onSelect(active ? null : value)}
                className={[
                  'flex-none relative px-3 py-1 rounded-full text-sm font-semibold whitespace-nowrap',
                  'transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400',
                  active
                    ? [
                        'bg-brand-600 text-white shadow-md',
                        'ring-1 ring-brand-400/60',
                        'scale-105',
                      ].join(' ')
                    : [
                        'text-brand-400 dark:text-brand-400',
                        'hover:text-white hover:bg-brand-800/60',
                        'border border-transparent hover:border-brand-700/50',
                      ].join(' '),
                ].join(' ')}
              >
                {active && (
                  <span className="absolute inset-0 rounded-full bg-brand-500/20 blur-sm -z-10" />
                )}
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Right arrow */}
      <button
        onClick={() => scroll('right')}
        aria-label="Años siguientes"
        className="flex-none flex items-center justify-center w-7 h-7 rounded-full
                   bg-brand-900/60 dark:bg-brand-950/80 border border-brand-700/40
                   text-brand-300 hover:text-white hover:bg-brand-700/60
                   transition-all duration-150 z-10 shadow-sm"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </div>
  );
}

export function SermonFilters({ series, preachers, years, filters, onChange }: SermonFiltersProps) {
  return (
    <div className="space-y-3">
      {series.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          <Chip label="Todas las series" active={!filters.seriesId} onClick={() => onChange({ ...filters, seriesId: null })} />
          {series.map((s) => (
            <Chip key={s.id} label={s.title} active={filters.seriesId === s.id}
              onClick={() => onChange({ ...filters, seriesId: filters.seriesId === s.id ? null : s.id })} />
          ))}
        </div>
      )}
      {preachers.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          <Chip label="Todos los predicadores" active={!filters.preacherId} onClick={() => onChange({ ...filters, preacherId: null })} />
          {preachers.map((p) => (
            <Chip key={p.id} label={p.name} active={filters.preacherId === p.id}
              onClick={() => onChange({ ...filters, preacherId: filters.preacherId === p.id ? null : p.id })} />
          ))}
        </div>
      )}
      {years.length > 1 && (
        <YearCarousel
          years={years}
          activeYear={filters.year}
          onSelect={(year) => onChange({ ...filters, year })}
        />
      )}
    </div>
  );
}
