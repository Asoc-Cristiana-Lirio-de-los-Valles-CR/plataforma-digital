import type { BlockScripture } from '@/lib/types';

interface Props { data: BlockScripture; locale: string; }

const styleMap = {
  light: 'bg-white dark:bg-brand-900 text-brand-900 dark:text-white',
  dark: 'bg-brand-900 dark:bg-brand-950 text-white',
  gold: 'bg-gold-50 dark:bg-brand-900 text-brand-900 dark:text-white border-l-4 border-gold-500',
} as const;

export function ScriptureBlock({ data, locale }: Props) {
  const verse = locale === 'en' && data.verse_en ? data.verse_en : data.verse;
  const style = data.background_style ?? 'gold';

  return (
    <section className={`section-padding ${styleMap[style]}`}>
      <div className="container-page max-w-2xl text-center">
        <blockquote className="text-xl md:text-2xl font-serif italic leading-relaxed mb-4">
          &ldquo;{verse}&rdquo;
        </blockquote>
        <cite className="text-sm font-semibold uppercase tracking-widest text-gold-500 not-italic">
          {data.reference}
        </cite>
      </div>
    </section>
  );
}
