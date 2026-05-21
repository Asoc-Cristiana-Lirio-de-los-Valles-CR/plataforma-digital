import type { BlockHero } from '@/lib/types';
import Image from 'next/image';

interface Props { data: BlockHero; locale: string; }

export function HeroBlock({ data, locale }: Props) {
  const title = locale === 'en' && data.title_en ? data.title_en : data.title;
  const subtitle = locale === 'en' && data.subtitle_en ? data.subtitle_en : data.subtitle;
  const ctaText = locale === 'en' && data.cta_text_en ? data.cta_text_en : data.cta_text;
  const bgUrl = data.background_image
    ? `${process.env.NEXT_PUBLIC_DIRECTUS_URL}/assets/${data.background_image}`
    : null;

  return (
    <section className="relative min-h-[60vh] flex items-center justify-center overflow-hidden">
      {bgUrl ? (
        <Image
          src={bgUrl}
          alt={title}
          fill
          className="object-cover"
          priority
        />
      ) : (
        <div className="absolute inset-0 bg-brand-900 dark:bg-brand-950" />
      )}
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative z-10 text-center section-padding max-w-4xl mx-auto">
        <h1 className="text-4xl md:text-6xl font-display font-bold text-white mb-4">{title}</h1>
        {subtitle && (
          <p className="text-xl md:text-2xl text-white/80 mb-8">{subtitle}</p>
        )}
        {ctaText && data.cta_link && (
          <a href={data.cta_link} className="btn-gold inline-block">
            {ctaText}
          </a>
        )}
      </div>
    </section>
  );
}
