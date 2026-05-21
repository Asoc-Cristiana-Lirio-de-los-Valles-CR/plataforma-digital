import { getTranslations } from 'next-intl/server';
import { getMinisterios } from '@/lib/directus';
import Link from 'next/link';
import Image from 'next/image';

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'ministerios' });
  return { title: t('title') };
}

export default async function MinisteriosPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'ministerios' });
  const ministerios = await getMinisterios();
  const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL ?? 'https://api.liriodelosvallescr.org';

  return (
    <main className="min-h-screen">
      {/* Hero */}
      <section className="section-padding bg-subtle">
        <div className="container-page text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="gold-line" />
            <div className="gold-line" />
          </div>
          <h1 className="section-title mb-3">{t('title')}</h1>
          <p className="text-muted max-w-xl mx-auto">{t('subtitle')}</p>
        </div>
      </section>

      {/* Grid */}
      <section className="section-padding">
        <div className="container-page">
          {ministerios.length === 0 ? (
            <p className="text-center text-muted py-16">{t('noMinistries')}</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {ministerios.map((m) => {
                const name = locale === 'es' ? m.name : (m.name_en || m.name);
                const desc = locale === 'es' ? m.description : (m.description_en || m.description);
                const coverUrl = m.cover_image
                  ? `${DIRECTUS_URL}/assets/${m.cover_image}?width=600&quality=80`
                  : m.photo
                  ? `${DIRECTUS_URL}/assets/${m.photo}?width=600&quality=80`
                  : null;

                return (
                  <Link
                    key={m.id}
                    href={`/${locale}/ministerios/${m.id}`}
                    className="card overflow-hidden group hover:shadow-md transition-shadow duration-200"
                  >
                    {coverUrl && (
                      <div className="relative h-44 w-full">
                        <Image
                          src={coverUrl}
                          alt={name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        />
                      </div>
                    )}
                    <div className="p-5">
                      <h2 className="font-display font-semibold text-brand-900 dark:text-white mb-1">
                        {name}
                      </h2>
                      {m.leader_name && (
                        <p className="text-xs text-gold-500 font-semibold uppercase tracking-wider mb-2">
                          {t('leader')}: {m.leader_name}
                        </p>
                      )}
                      {desc && (
                        <p className="text-sm text-muted leading-relaxed line-clamp-3">{desc}</p>
                      )}
                      {m.schedule_enabled && (m.meeting_day || m.meeting_time) && (
                        <p className="text-xs text-gold-500 font-semibold mt-3">
                          {[m.meeting_day, m.meeting_time, m.meeting_location].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
