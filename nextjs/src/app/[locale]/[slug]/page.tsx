import { notFound } from 'next/navigation';
import { getPageBySlug, getPageSlugs } from '@/lib/directus';
import { BlockRenderer } from '@/components/blocks/BlockRenderer';
import type { Metadata } from 'next';

export const revalidate = 60;

interface Props {
  params: Promise<{ locale: string; slug: string }>;
}

export async function generateStaticParams() {
  const slugs = await getPageSlugs();
  const locales = ['es', 'en'];
  return locales.flatMap((locale) => slugs.map((slug) => ({ locale, slug })));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPageBySlug(slug);
  if (!page) return {};
  return {
    title: page.seo_title ?? page.title,
    description: page.seo_description,
  };
}

export default async function PageBuilderPage({ params }: Props) {
  const { locale, slug } = await params;
  const page = await getPageBySlug(slug);
  if (!page) notFound();

  return (
    <main>
      <BlockRenderer blocks={page.blocks ?? []} locale={locale} />
    </main>
  );
}
