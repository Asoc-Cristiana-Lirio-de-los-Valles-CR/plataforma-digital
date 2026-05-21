import Link from 'next/link';
import Image from 'next/image';
import { useLocale } from 'next-intl';

interface LogoProps {
  inverted?: boolean;
  churchName?: string;
}

export function Logo({ inverted = false, churchName }: LogoProps) {
  const locale = useLocale();

  return (
    <Link href={`/${locale}`} className="flex items-center gap-3 group">
      <Image
        src="/logo.webp"
        alt="Iglesia Cristiana Lirio de los Valles"
        width={284}
        height={230}
        className={`h-10 w-auto object-contain transition-opacity duration-200 group-hover:opacity-80 ${
          inverted ? '' : 'brightness-0 dark:brightness-0 dark:invert'
        }`}
        priority
      />
      {churchName && (
        <span className="hidden lg:flex flex-col font-display text-brand-900 dark:text-white leading-tight">
          <span className="text-[10px] font-medium uppercase tracking-widest text-gold-500 whitespace-nowrap">Iglesia Cristiana</span>
          <span className="text-sm font-semibold whitespace-nowrap">Lirio de los Valles</span>
        </span>
      )}
    </Link>
  );
}
