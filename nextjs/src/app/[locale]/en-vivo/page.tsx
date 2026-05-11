import { getTranslations } from 'next-intl/server';
import { getLiveStream, getRecentStreams } from '@/lib/youtube';
import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  return { title: 'En Vivo' };
}

export default async function EnVivoPage() {
  const t = await getTranslations('live');
  const [liveStream, recentStreams] = await Promise.all([
    getLiveStream(),
    getRecentStreams(6),
  ]);

  return (
    <>
      {/* Page header */}
      <section className="section-padding bg-subtle">
        <div className="container-page">
          <div className="max-w-3xl mx-auto text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="gold-line" />
              <span className="text-muted text-xs font-semibold tracking-[0.2em] uppercase">
                Lirio de los Valles
              </span>
              <div className="gold-line" />
            </div>
            <h1 className="display-title mb-4">{t('title')}</h1>
            <p className="text-muted text-lg">{t('subtitle')}</p>
          </div>
        </div>
      </section>

      {/* Live player or placeholder */}
      <section className="section-padding">
        <div className="container-page max-w-4xl mx-auto">
          {liveStream ? (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="live-badge">{t('watching')}</span>
                <h2 className="text-lg font-semibold text-brand-900 dark:text-white truncate">
                  {liveStream.title}
                </h2>
              </div>
              <div className="relative aspect-video w-full rounded-2xl overflow-hidden shadow-lg">
                <iframe
                  src={`https://www.youtube.com/embed/${liveStream.videoId}?autoplay=1&rel=0`}
                  title={liveStream.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0 w-full h-full"
                />
              </div>
            </div>
          ) : (
            <div className="card p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-brand-100 dark:bg-brand-900/40 flex items-center justify-center">
                <svg className="w-8 h-8 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.069A1 1 0 0121 8.845v6.31a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
                </svg>
              </div>
              <h2 className="text-xl font-display font-semibold text-brand-900 dark:text-white mb-2">
                {t('noStream')}
              </h2>
              <p className="text-muted">{t('noStreamDesc')}</p>
            </div>
          )}
        </div>
      </section>

      {/* Recent streams */}
      {recentStreams.length > 0 && (
        <section className="section-padding bg-subtle">
          <div className="container-page">
            <div className="text-center mb-10">
              <h2 className="section-title">{t('pastStreams')}</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {recentStreams.map((video) => (
                <a
                  key={video.videoId}
                  href={`https://www.youtube.com/watch?v=${video.videoId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="card-hover group block overflow-hidden"
                >
                  <div className="relative aspect-video overflow-hidden">
                    {video.thumbnail ? (
                      <img
                        src={video.thumbnail}
                        alt={video.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full bg-brand-100 dark:bg-brand-900/40" />
                    )}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/30">
                      <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                        <svg className="w-5 h-5 text-brand-700 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="text-sm font-medium text-brand-900 dark:text-white line-clamp-2">
                      {video.title}
                    </p>
                    {video.publishedAt && (
                      <p className="text-xs text-muted mt-1">
                        {new Date(video.publishedAt).toLocaleDateString('es-CR', {
                          year: 'numeric', month: 'long', day: 'numeric',
                        })}
                      </p>
                    )}
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
