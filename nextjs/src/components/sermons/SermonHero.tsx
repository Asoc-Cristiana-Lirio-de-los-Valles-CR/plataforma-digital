import type { Sermon } from '@/lib/types';
import { YoutubeEmbed } from './YoutubeEmbed';

interface SermonHeroProps {
  sermon: Sermon;
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '';
  const m = Math.floor(seconds / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}min`;
  return `${m}min`;
}

export function SermonHero({ sermon }: SermonHeroProps) {
  const thumbSrc = sermon.manual_thumbnail ?? sermon.thumbnail_url;

  return (
    <div className="grid lg:grid-cols-2 gap-8 items-center">
      <YoutubeEmbed
        youtubeId={sermon.youtube_id}
        title={sermon.title}
        thumbnailUrl={thumbSrc}
        className="shadow-2xl"
      />
      <div>
        {sermon.featured && (
          <span className="inline-block text-xs font-semibold tracking-wider uppercase text-brand-500 dark:text-brand-400 mb-3">
            ✦ Predicación destacada
          </span>
        )}
        <h2 className="text-2xl lg:text-3xl font-display font-semibold text-brand-900 dark:text-white mb-4 leading-snug">
          {sermon.title}
        </h2>
        <div className="flex flex-wrap gap-3 text-sm text-muted mb-4">
          {sermon.preacher && (
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              {sermon.preacher.name}
            </span>
          )}
          {sermon.series && (
            <span className="flex items-center gap-1 text-brand-500 dark:text-brand-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              {sermon.series.title}
            </span>
          )}
          {sermon.sermon_date && (
            <span>
              {new Date(sermon.sermon_date).toLocaleDateString('es-CR', { year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          )}
          {sermon.duration_seconds && (
            <span>{formatDuration(sermon.duration_seconds)}</span>
          )}
        </div>
        {sermon.description && (
          <p className="text-muted line-clamp-3">{sermon.description}</p>
        )}
      </div>
    </div>
  );
}
