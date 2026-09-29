import { getTranslations } from 'next-intl/server';
import { getMinisterios } from '@/lib/directus';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

// El layout lee headers(): esta página no puede prerenderizarse (ISR) sin
// provocar DYNAMIC_SERVER_USAGE → 500. Mismo caso que [slug] (commit 86b3ed1).
export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const ministerios = await getMinisterios();
  const m = ministerios.find((x) => String(x.id) === id);
  if (!m) return {};
  return { title: locale === 'es' ? m.name : (m.name_en || m.name) };
}

export default async function MinisterioDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: 'ministerios' });
  const ministerios = await getMinisterios();
  const m = ministerios.find((x) => String(x.id) === id);
  if (!m) notFound();

  const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL ?? 'https://api.liriodelosvallescr.org';
  const name = locale === 'es' ? m.name : (m.name_en || m.name);
  const desc = locale === 'es' ? m.description : (m.description_en || m.description);
  const coverUrl = m.cover_image
    ? `${DIRECTUS_URL}/assets/${m.cover_image}?width=1200&quality=85`
    : m.photo
    ? `${DIRECTUS_URL}/assets/${m.photo}?width=1200&quality=85`
    : null;

  return (
    <main className="min-h-screen">
      {/* Cover */}
      {coverUrl && (
        <div className="relative h-64 sm:h-80 w-full">
          <Image
            src={coverUrl}
            alt={name}
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-6 left-0 right-0 container-page">
            <h1 className="text-3xl font-display font-bold text-white">{name}</h1>
          </div>
        </div>
      )}

      <section className="section-padding">
        <div className="container-page max-w-3xl">
          {/* Title when no cover */}
          {!coverUrl && (
            <>
              <div className="flex items-center gap-3 mb-4">
                <div className="gold-line" />
              </div>
              <h1 className="section-title mb-6">{name}</h1>
            </>
          )}

          {/* Meta */}
          <div className="flex flex-wrap gap-4 mb-8">
            {m.leader_name && (
              <div>
                <span className="text-xs text-gold-500 font-semibold uppercase tracking-wider">
                  {t('leader')}
                </span>
                <p className="text-sm font-medium text-brand-900 dark:text-white">{m.leader_name}</p>
              </div>
            )}
            {m.contact_phone && (
              <div>
                <span className="text-xs text-gold-500 font-semibold uppercase tracking-wider">
                  {t('phone')}
                </span>
                <p className="text-sm font-medium text-brand-900 dark:text-white">{m.contact_phone}</p>
              </div>
            )}
            {m.schedule_enabled && (m.meeting_day || m.meeting_time) && (
              <div>
                <span className="text-xs text-gold-500 font-semibold uppercase tracking-wider">
                  {t('schedule')}
                </span>
                <p className="text-sm font-medium text-brand-900 dark:text-white">
                  {[m.meeting_day, m.meeting_time, m.meeting_location].filter(Boolean).join(' · ')}
                </p>
              </div>
            )}
          </div>

          {/* Description */}
          {desc && (
            <p className="text-base text-muted leading-relaxed whitespace-pre-line mb-10">{desc}</p>
          )}

          <Link
            href={`/${locale}/ministerios`}
            className="text-brand-700 dark:text-brand-300 text-sm font-medium hover:underline"
          >
            {t('back')}
          </Link>
        </div>
      </section>
    </main>
  );
}
