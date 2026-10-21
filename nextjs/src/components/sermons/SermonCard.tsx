import Link from 'next/link';
import Image from 'next/image';
import type { Sermon } from '@/lib/types';

interface SermonCardProps {
  sermon: Sermon;
  locale: string;
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '';
  const m = Math.floor(seconds / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}min`;
  return `${m}min`;
}

export function SermonCard({ sermon, locale }: SermonCardProps) {
  const thumbSrc = sermon.manual_thumbnail ?? sermon.thumbnail_url;

  return (
    <Link
      href={`/${locale}/biblioteca/${sermon.slug}`}
      className="group block rounded-xl overflow-hidden bg-white dark:bg-brand-900/40 border border-brand-100 dark:border-brand-800 hover:border-brand-400 dark:hover:border-brand-600 transition-colors"
    >
      <div className="relative aspect-video overflow-hidden bg-brand-100 dark:bg-brand-900">
        {thumbSrc ? (
          <Image
            src={thumbSrc}
            alt={sermon.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className="w-10 h-10 text-brand-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.069A1 1 0 0121 8.845v6.31a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
            </svg>
          </div>
        )}
        {sermon.duration_seconds && (
          <span className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
            {formatDuration(sermon.duration_seconds)}
          </span>
        )}
      </div>
      <div className="p-3">
        <p className="text-sm font-semibold text-brand-900 dark:text-white line-clamp-2 mb-1">
          {sermon.title}
        </p>
        <div className="flex items-center gap-1.5 flex-wrap">
          {sermon.preacher && (
            <span className="text-xs text-muted">{sermon.preacher.name}</span>
          )}
          {sermon.series && (
            <>
              <span className="text-xs text-muted">·</span>
              <span className="text-xs text-brand-500 dark:text-brand-400">{sermon.series.title}</span>
            </>
          )}
          {sermon.sermon_date && (
            <>
              <span className="text-xs text-muted">·</span>
              <span className="text-xs text-muted">
                {new Date(sermon.sermon_date).toLocaleDateString('es-CR', { year: 'numeric', month: 'short' })}
              </span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}
