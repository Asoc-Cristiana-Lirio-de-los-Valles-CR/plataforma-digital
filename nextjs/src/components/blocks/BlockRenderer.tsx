import type { PageBlock } from '@/lib/types';
import { HeroBlock } from './HeroBlock';
import { TextBlock } from './TextBlock';
import { ScriptureBlock } from './ScriptureBlock';

interface Props { blocks: PageBlock[]; locale: string; }

export function BlockRenderer({ blocks, locale }: Props) {
  return (
    <>
      {blocks.map((block, i) => {
        switch (block.collection) {
          case 'block_hero':
            return <HeroBlock key={i} data={block.item} locale={locale} />;
          case 'block_text':
            return <TextBlock key={i} data={block.item} locale={locale} />;
          case 'block_scripture':
            return <ScriptureBlock key={i} data={block.item} locale={locale} />;
          default:
            return null;
        }
      })}
    </>
  );
}
