import { getTranslations, getLocale } from 'next-intl/server';
import Image from 'next/image';
import { getChurchInfo, getChurchLeaders, getMinisterios } from '@/lib/directus';
import { SITE, siteName } from '@/lib/constants';
import type { Metadata } from 'next';
import type { ChurchLeader } from '@/lib/types';

export async function generateMetadata(): Promise<Metadata> {
  return { title: 'Historia' };
}

const ROLE_ORDER: Record<string, number> = {
  pastor_general: 0,
  pastor: 1,
  anciano: 2,
  lider: 3,
};

const ROLE_LABEL: Record<string, { es: string; en: string }> = {
  pastor_general: { es: 'Pastor General', en: 'Senior Pastor' },
  pastor: { es: 'Pastores', en: 'Pastors' },
  anciano: { es: 'Ancianos', en: 'Elders' },
  lider: { es: 'Líderes', en: 'Leaders' },
};

function groupByRole(leaders: ChurchLeader[]): Map<string, ChurchLeader[]> {
  const map = new Map<string, ChurchLeader[]>();
  const ordered = [...leaders].sort(
    (a, b) => (ROLE_ORDER[a.role] ?? 99) - (ROLE_ORDER[b.role] ?? 99)
  );
  for (const leader of ordered) {
    if (!map.has(leader.role)) map.set(leader.role, []);
    map.get(leader.role)!.push(leader);
  }
  return map;
}

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL ?? 'https://admin.liriodelosvallescr.org';

export default async function HistoriaPage() {
  const t = await getTranslations('history');
  const locale = await getLocale();
  const [info, leaders, ministerios] = await Promise.all([
    getChurchInfo(),
    getChurchLeaders(),
    getMinisterios(),
  ]);

  const history = info ? (locale === 'es' ? info.history : info.history_en) : null;
  const vision = info ? (locale === 'es' ? info.vision : info.vision_en) : null;
  const mission = info ? (locale === 'es' ? info.mission : info.mission_en) : null;

  const grouped = groupByRole(leaders);

  return (
    <>
      {/* Hero header */}
      <section
        className="relative py-20 sm:py-28 flex items-end"
        style={{ backgroundImage: 'linear-gradient(160deg, #2e0f52 0%, #461a7a 60%, #1a0730 100%)' }}
      >
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }}
          aria-hidden
        />
        <div className="container-page relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="gold-line" />
            <span className="text-gold-400 text-sm font-semibold tracking-[0.2em] uppercase">
              {siteName(locale)}
            </span>
          </div>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight">
            {t('title')}
          </h1>
        </div>
      </section>

      {/* History content */}
      <section className="section-padding">
        <div className="container-page max-w-3xl mx-auto">
          {history ? (
            <div
              className="prose prose-brand dark:prose-invert max-w-none text-lg leading-relaxed"
              dangerouslySetInnerHTML={{ __html: history }}
            />
          ) : (
            <div className="space-y-6 text-lg leading-relaxed text-brand-800 dark:text-gray-200">
              <p>
                {locale === 'es'
                  ? 'La Asociación Cristiana Lirio de los Valles es una comunidad de fe fundada con el propósito de servir a Dios y a la comunidad en Costa Rica. Con cédula jurídica 3-002-104369, somos una organización sin fines de lucro comprometida con los valores del Evangelio.'
                  : 'The Lirio de los Valles Christian Association is a faith community founded with the purpose of serving God and the community in Costa Rica. With legal ID 3-002-104369, we are a non-profit organization committed to the values of the Gospel.'}
              </p>
              <p>
                {locale === 'es'
                  ? 'A lo largo de los años, hemos crecido como familia espiritual, ofreciendo espacios de adoración, formación bíblica, comunión y servicio social. Nuestras puertas están abiertas a toda persona que busque conocer a Dios y crecer en su fe.'
                  : 'Over the years, we have grown as a spiritual family, offering spaces for worship, biblical formation, fellowship and social service. Our doors are open to everyone who seeks to know God and grow in their faith.'}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Vision & Mission */}
      <section className="section-padding bg-subtle">
        <div className="container-page">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="card p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="gold-line" />
                <h2 className="text-xs font-bold tracking-[0.2em] uppercase text-gold-500">
                  {t('vision')}
                </h2>
              </div>
              <p className="text-brand-800 dark:text-gray-200 leading-relaxed">
                {vision || (locale === 'es'
                  ? 'Ser una comunidad de fe que transforma vidas, familias y la sociedad costarricense a través del poder del Evangelio de Jesucristo.'
                  : 'To be a faith community that transforms lives, families and Costa Rican society through the power of the Gospel of Jesus Christ.')}
              </p>
            </div>
            <div className="card p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="gold-line" />
                <h2 className="text-xs font-bold tracking-[0.2em] uppercase text-gold-500">
                  {t('mission')}
                </h2>
              </div>
              <p className="text-brand-800 dark:text-gray-200 leading-relaxed">
                {mission || (locale === 'es'
                  ? 'Discipular a hombres y mujeres en los principios del Reino de Dios, fomentando la adoración genuina, la comunión fraternal y el servicio al prójimo.'
                  : 'To disciple men and women in the principles of the Kingdom of God, fostering genuine worship, fraternal fellowship and service to others.')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Leadership */}
      {leaders.length > 0 && (
        <section className="section-padding">
          <div className="container-page">
            <div className="text-center mb-12">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="gold-line" />
                <div className="gold-line" />
              </div>
              <h2 className="section-title">
                {locale === 'es' ? 'Nuestro Liderazgo' : 'Our Leadership'}
              </h2>
            </div>

            {Array.from(grouped.entries()).map(([role, group]) => (
              <div key={role} className="mb-14 last:mb-0">
                <div className="flex items-center gap-3 mb-6">
                  <div className="gold-line" />
                  <h3 className="text-xs font-bold tracking-[0.2em] uppercase text-gold-500">
                    {locale === 'es' ? ROLE_LABEL[role]?.es : ROLE_LABEL[role]?.en}
                  </h3>
                </div>

                <div className={`grid gap-6 ${
                  role === 'pastor_general'
                    ? 'grid-cols-1 max-w-sm'
                    : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
                }`}>
                  {group.map((leader) => (
                    <div key={leader.id} className="card p-6 text-center">
                      {/* Photo */}
                      <div className="w-20 h-20 rounded-full mx-auto mb-4 overflow-hidden bg-brand-100 dark:bg-brand-900/40 flex items-center justify-center">
                        {leader.photo ? (
                          <Image
                            src={`${DIRECTUS_URL}/assets/${leader.photo}?width=80&height=80&fit=cover`}
                            alt={leader.name}
                            width={80}
                            height={80}
                            className="object-cover w-full h-full"
                          />
                        ) : (
                          <span className="text-2xl text-brand-400">✝</span>
                        )}
                      </div>
                      <p className="font-display font-semibold text-brand-900 dark:text-white leading-snug">
                        {leader.name}
                      </p>
                      <p className="text-xs text-gold-500 font-semibold uppercase tracking-wider mt-1">
                        {leader.title || (locale === 'es' ? ROLE_LABEL[leader.role]?.es : ROLE_LABEL[leader.role]?.en)}
                      </p>
                      {(locale === 'es' ? leader.bio : leader.bio_en) && (
                        <p className="text-sm text-muted mt-3 leading-relaxed">
                          {locale === 'es' ? leader.bio : leader.bio_en}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Ministries */}
      {ministerios.length > 0 && (
        <section className="section-padding bg-subtle">
          <div className="container-page">
            <div className="text-center mb-12">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="gold-line" />
                <div className="gold-line" />
              </div>
              <h2 className="section-title">
                {locale === 'es' ? 'Nuestros Ministerios' : 'Our Ministries'}
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {ministerios.map((m) => (
                <div key={m.id} className="card p-6">
                  <div className="flex items-start gap-4">
                    {m.icon && (
                      <span className="text-3xl flex-shrink-0">{m.icon}</span>
                    )}
                    <div>
                      <h3 className="font-display font-semibold text-brand-900 dark:text-white mb-1">
                        {locale === 'es' ? m.name : (m.name_en || m.name)}
                      </h3>
                      {m.leader_name && (
                        <p className="text-xs text-gold-500 font-semibold uppercase tracking-wider mb-2">
                          {m.leader_name}
                        </p>
                      )}
                      {(locale === 'es' ? m.description : m.description_en) && (
                        <p className="text-sm text-muted leading-relaxed">
                          {locale === 'es' ? m.description : m.description_en}
                        </p>
                      )}
                      {m.schedule_enabled && (m.meeting_day || m.meeting_time) && (
                        <p className="text-xs text-gold-500 font-semibold mt-2">
                          {[m.meeting_day, m.meeting_time, m.meeting_location].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Faith declaration */}
      <section className="section-padding">
        <div className="container-page max-w-3xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="gold-line" />
            <h2 className="text-xs font-bold tracking-[0.2em] uppercase text-gold-500">
              {t('faith')}
            </h2>
            <div className="gold-line" />
          </div>
          <blockquote className="font-display text-2xl italic text-brand-900 dark:text-white leading-relaxed">
            {locale === 'es'
              ? '"Creemos en la Biblia como la Palabra inspirada e infalible de Dios, en la Trinidad, en la salvación por gracia mediante la fe en Jesucristo, y en la vida eterna."'
              : '"We believe in the Bible as the inspired and infallible Word of God, in the Trinity, in salvation by grace through faith in Jesus Christ, and in eternal life."'}
          </blockquote>
        </div>
      </section>
    </>
  );
}
