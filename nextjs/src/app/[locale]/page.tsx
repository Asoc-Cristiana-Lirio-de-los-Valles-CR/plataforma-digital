import Image from 'next/image';
import { getTranslations, getLocale } from 'next-intl/server';
import { getServiceSchedule, getWeeklyVerse } from '@/lib/directus';
import { DEFAULT_SCHEDULE } from '@/lib/constants';

export default async function HomePage() {
  const t = await getTranslations('home');
  const tDays = await getTranslations('days');
  const locale = await getLocale();
  const [schedule, verse] = await Promise.all([
    getServiceSchedule(),
    getWeeklyVerse(),
  ]);

  const displaySchedule = schedule.length > 0 ? schedule : DEFAULT_SCHEDULE;

  return (
    <>
      {/* Hero */}
      <section className="relative min-h-[85vh] flex items-center overflow-hidden">
        {/* Background image — Next.js Image for automatic WebP + sizing */}
        <Image
          src="/hero-bg.webp"
          alt=""
          fill
          priority
          quality={90}
          className="object-cover object-center"
          aria-hidden
        />
        {/* Dark overlay — preserves text legibility over the image */}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(160deg, rgba(0,0,0,0.55) 0%, rgba(10,5,20,0.40) 50%, rgba(0,0,0,0.65) 100%)' }}
          aria-hidden
        />
        {/* Fog layer 1 */}
        <div
          className="fog-layer-1 pointer-events-none"
          style={{
            position: 'absolute', inset: 0, zIndex: 1,
            backgroundImage: [
              'radial-gradient(ellipse 45% 35% at 5% 10%, rgba(255,255,255,0.55) 0%, transparent 70%)',
              'radial-gradient(ellipse 40% 30% at 50% 50%, rgba(255,255,255,0.45) 0%, transparent 68%)',
              'radial-gradient(ellipse 42% 35% at 95% 85%, rgba(255,255,255,0.52) 0%, transparent 70%)',
            ].join(', '),
            backgroundSize: '300% 300%',
            filter: 'blur(30px)',
            willChange: 'background-position',
          }}
          aria-hidden
        />
        {/* Fog layer 2 */}
        <div
          className="fog-layer-2 pointer-events-none"
          style={{
            position: 'absolute', inset: 0, zIndex: 1,
            backgroundImage: [
              'radial-gradient(ellipse 48% 32% at 90% 8%, rgba(255,255,255,0.50) 0%, transparent 68%)',
              'radial-gradient(ellipse 42% 34% at 8% 55%, rgba(255,255,255,0.45) 0%, transparent 65%)',
              'radial-gradient(ellipse 45% 30% at 55% 92%, rgba(255,255,255,0.47) 0%, transparent 68%)',
            ].join(', '),
            backgroundSize: '300% 300%',
            filter: 'blur(35px)',
            willChange: 'background-position',
          }}
          aria-hidden
        />
        {/* Fog layer 3 */}
        <div
          className="fog-layer-3 pointer-events-none"
          style={{
            position: 'absolute', inset: 0, zIndex: 1,
            backgroundImage: [
              'radial-gradient(ellipse 35% 45% at 2% 40%, rgba(220,225,255,0.42) 0%, transparent 62%)',
              'radial-gradient(ellipse 50% 28% at 50% 2%, rgba(220,225,255,0.38) 0%, transparent 65%)',
              'radial-gradient(ellipse 35% 45% at 98% 50%, rgba(220,225,255,0.40) 0%, transparent 62%)',
              'radial-gradient(ellipse 50% 28% at 50% 98%, rgba(220,225,255,0.35) 0%, transparent 62%)',
            ].join(', '),
            backgroundSize: '250% 250%',
            filter: 'blur(25px)',
            willChange: 'background-position',
          }}
          aria-hidden
        />

        <div className="container-page relative z-10 py-20 sm:py-28">
          <div className="max-w-2xl animate-fade-up">
            <div className="flex items-center gap-3 mb-6">
              <div className="gold-line" />
              <span className="text-gold-400 text-sm font-semibold tracking-[0.2em] uppercase">
                Costa Rica
              </span>
            </div>

            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6 whitespace-nowrap">
              {t('title')}
            </h1>

            <p className="text-lg text-white/70 leading-relaxed mb-10 animation-delay-200 animate-fade-up opacity-0">
              {t('subtitle')}
            </p>

            <div className="flex flex-wrap gap-4 animation-delay-300 animate-fade-up opacity-0">
              <a href="#schedule" className="btn-gold">
                {t('schedule')} →
              </a>
              <a href="/en-vivo" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm bg-transparent border-2 border-white/70 text-white hover:bg-white/15 hover:border-white transition-all duration-200">
                {t('watchLive')}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Schedule */}
      <section id="schedule" className="section-padding bg-subtle">
        <div className="container-page">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="gold-line" />
              <div className="gold-line" />
            </div>
            <h2 className="section-title">{t('schedule')}</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4 max-w-5xl mx-auto">
            {displaySchedule.map((item, i) => (
              <div key={i} className="card-hover p-6 text-center">
                <div className="flex items-baseline justify-center gap-1 mb-1">
                  <span className="text-2xl font-display font-semibold text-gold-500 leading-none">
                    {item.time.replace(/\s*(AM|PM)$/i, '')}
                  </span>
                  <span className="text-xs font-bold text-gold-400 uppercase">
                    {item.time.match(/AM|PM/i)?.[0] ?? ''}
                  </span>
                </div>
                <div className="text-sm font-bold text-brand-700 dark:text-brand-300 uppercase tracking-wider mb-1">
                  {tDays.has(item.day as any) ? tDays(item.day as any) : item.day}
                </div>
                <div className="text-sm text-muted">
                  {locale === 'en' && 'name_en' in item && item.name_en ? item.name_en : item.name}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Weekly verse */}
      {verse && (
        <section className="section-padding">
          <div className="container-page">
            <div className="max-w-2xl mx-auto text-center">
              <div className="flex items-center justify-center gap-3 mb-8">
                <div className="gold-line" />
                <span className="text-muted text-xs font-semibold tracking-[0.2em] uppercase">
                  {t('verse')}
                </span>
                <div className="gold-line" />
              </div>
              <blockquote className="font-display text-2xl sm:text-3xl italic text-brand-900 dark:text-white leading-relaxed mb-4">
                &ldquo;{verse.verse_text}&rdquo;
              </blockquote>
              <cite className="text-sm text-muted not-italic font-semibold tracking-wide">
                — {verse.reference}
              </cite>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
