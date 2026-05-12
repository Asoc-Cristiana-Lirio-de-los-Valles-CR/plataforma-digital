import Link from 'next/link';
import Image from 'next/image';
import { useLocale } from 'next-intl';

interface LogoProps {
  inverted?: boolean;
}

export function Logo({ inverted = false }: LogoProps) {
  const locale = useLocale();

  return (
    <Link href={`/${locale}`} className="flex items-center gap-2 group">
      <Image
        src="/logo.png"
        alt="Lirio de los Valles"
        width={48}
        height={48}
        className={`h-12 w-12 object-contain flex-shrink-0 transition-opacity duration-200 group-hover:opacity-80 ${
          inverted ? 'brightness-0 invert' : 'dark:brightness-0 dark:invert'
        }`}
        priority
      />
      <div className="flex flex-col leading-tight">
        <span className={`font-display font-bold text-base tracking-tight ${
          inverted ? 'text-white' : 'text-brand-900 dark:text-white'
        }`}>
          Lirio de los Valles
        </span>
        <span className={`text-[10px] font-semibold tracking-[0.15em] uppercase ${
          inverted ? 'text-white/60' : 'text-brand-500 dark:text-brand-300'
        }`}>
          Costa Rica
        </span>
      </div>
    </Link>
  );
}
