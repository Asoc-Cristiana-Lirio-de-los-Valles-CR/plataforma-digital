export const revalidate = 300;

import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { getSermon, getRelatedSermons } from '@/lib/sermons';
import { YoutubeEmbed } from '@/components/sermons/YoutubeEmbed';
import { SermonCard } from '@/components/sermons/SermonCard';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://liriodelosvallescr.org';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { slug, locale } = await params;
  const sermon = await getSermon(slug);
  if (!sermon || sermon.visibility !== 'public') return {};

  const thumbSrc = sermon.manual_thumbnail ?? sermon.thumbnail_url;

  return {
    title: sermon.title,
    description: sermon.description ?? `Predicación: ${sermon.title}`,
    openGraph: {
      title: sermon.title,
      description: sermon.description ?? `Predicación: ${sermon.title}`,
      images: thumbSrc ? [{ url: thumbSrc, width: 1280, height: 720 }] : [],
      url: `${siteUrl}/${locale}/biblioteca/${slug}`,
      type: 'video.other',
    },
    twitter: {
      card: 'summary_large_image',
      title: sermon.title,
      description: sermon.description ?? undefined,
      images: thumbSrc ? [thumbSrc] : [],
    },
  };
}

export default async function SermonPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const t = await getTranslations('biblioteca');

  const sermon = await getSermon(slug);

  if (!sermon || sermon.visibility === 'private') notFound();

  const related = await getRelatedSermons(sermon, 3);
  const thumbSrc = sermon.manual_thumbnail ?? sermon.thumbnail_url;

  return (
    <div className="section-padding">
      <div className="container-page max-w-4xl mx-auto">
        <Link href={`/${locale}/biblioteca`} className="text-sm text-muted hover:text-brand-600 dark:hover:text-brand-400 mb-6 inline-block">
          {t('backToLibrary')}
        </Link>

        <YoutubeEmbed
          youtubeId={sermon.youtube_id}
          title={sermon.title}
          thumbnailUrl={thumbSrc}
          className="mb-8"
        />

        <div className="mb-8">
          <h1 className="text-2xl lg:text-3xl font-display font-semibold text-brand-900 dark:text-white mb-4">
            {sermon.title}
          </h1>
          <div className="flex flex-wrap gap-4 text-sm text-muted mb-4">
            {sermon.preacher && (
              <Link href={`/${locale}/biblioteca/predicador/${sermon.preacher.slug}`} className="hover:text-brand-600 dark:hover:text-brand-400">
                {t('preacher')}: {sermon.preacher.name}
              </Link>
            )}
            {sermon.series && (
              <Link href={`/${locale}/biblioteca/series/${sermon.series.slug}`} className="text-brand-500 dark:text-brand-400 hover:underline">
                {t('series')}: {sermon.series.title}
              </Link>
            )}
            {sermon.sermon_date && (
              <span>
                {new Date(sermon.sermon_date).toLocaleDateString('es-CR', { year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
            )}
          </div>
          {sermon.description && (
            <p className="text-muted leading-relaxed">{sermon.description}</p>
          )}
          <a
            href={`https://www.youtube.com/watch?v=${sermon.youtube_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-4 text-sm text-brand-600 dark:text-brand-400 hover:underline"
          >
            {t('watchOnYouTube')} ↗
          </a>
        </div>

        {related.length > 0 && (
          <div className="border-t border-brand-100 dark:border-brand-800 pt-8">
            <h2 className="text-lg font-display font-semibold text-brand-900 dark:text-white mb-6">
              {t('relatedSermons')}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {related.map(s => <SermonCard key={s.id} sermon={s} locale={locale} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
