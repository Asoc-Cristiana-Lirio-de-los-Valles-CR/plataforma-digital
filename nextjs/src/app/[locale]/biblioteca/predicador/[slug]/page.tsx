export const revalidate = 300;

import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { getPreacherWithSermons } from '@/lib/sermons';
import { SermonCard } from '@/components/sermons/SermonCard';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const result = await getPreacherWithSermons(slug);
  if (!result) return {};
  return { title: result.preacher.name };
}

export default async function PreacherPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const t = await getTranslations('biblioteca');
  const result = await getPreacherWithSermons(slug);
  if (!result) notFound();

  const { preacher, sermons } = result;

  return (
    <div className="section-padding">
      <div className="container-page">
        <Link href={`/${locale}/biblioteca`} className="text-sm text-muted hover:text-brand-600 dark:hover:text-brand-400 mb-6 inline-block">
          {t('backToLibrary')}
        </Link>
        <div className="mb-8">
          <h1 className="display-title mb-2">{preacher.name}</h1>
          <p className="text-muted">{sermons.length} predicaciones</p>
          {preacher.bio && <p className="text-muted mt-3">{preacher.bio}</p>}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {sermons.map(s => <SermonCard key={s.id} sermon={s} locale={locale} />)}
        </div>
      </div>
    </div>
  );
}
