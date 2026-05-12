import { getTranslations, getLocale } from 'next-intl/server';
import { getChurchInfo } from '@/lib/directus';
import { SITE, siteName } from '@/lib/constants';
import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  return { title: 'Historia' };
}

export default async function HistoriaPage() {
  const t = await getTranslations('history');
  const locale = await getLocale();
  const info = await getChurchInfo();

  const history = info
    ? (locale === 'es' ? info.history : info.history_en)
    : null;
  const vision = info
    ? (locale === 'es' ? info.vision : info.vision_en)
    : null;
  const mission = info
    ? (locale === 'es' ? info.mission : info.mission_en)
    : null;

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
