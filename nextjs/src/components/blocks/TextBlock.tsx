import type { BlockText } from '@/lib/types';

interface Props { data: BlockText; locale: string; }

const alignClass = {
  left: 'text-left',
  center: 'text-center mx-auto',
  right: 'text-right ml-auto',
} as const;

export function TextBlock({ data, locale }: Props) {
  const heading = locale === 'en' && data.heading_en ? data.heading_en : data.heading;
  const content = locale === 'en' && data.content_en ? data.content_en : data.content;

  return (
    <section className="section-padding">
      <div className={`container-page max-w-3xl ${alignClass[data.alignment ?? 'left']}`}>
        {heading && (
          <h2 className="text-2xl md:text-3xl font-display font-bold text-brand-900 dark:text-white mb-6">
            {heading}
          </h2>
        )}
        <div
          className="prose prose-lg dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      </div>
    </section>
  );
}
