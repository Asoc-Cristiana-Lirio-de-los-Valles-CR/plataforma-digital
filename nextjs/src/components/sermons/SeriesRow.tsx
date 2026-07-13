import type { Sermon, SermonSeries } from '@/lib/types';
import { SermonCard } from './SermonCard';

interface SeriesRowProps {
  series: SermonSeries;
  sermons: Sermon[];
  locale: string;
}

export function SeriesRow({ series, sermons, locale }: SeriesRowProps) {
  if (sermons.length === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-display font-semibold text-brand-900 dark:text-white">
          {series.title}
          <span className="text-sm font-normal text-muted ml-2">{series.year}</span>
        </h3>
        <a
          href={`/${locale}/biblioteca/series/${series.slug}`}
          className="text-sm text-brand-600 dark:text-brand-400 hover:underline"
        >
          Ver todos →
        </a>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide">
        {sermons.map((sermon) => (
          <div key={sermon.id} className="snap-start flex-shrink-0 w-64 sm:w-72">
            <SermonCard sermon={sermon} locale={locale} />
          </div>
        ))}
      </div>
    </div>
  );
}
