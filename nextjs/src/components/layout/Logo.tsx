import Link from 'next/link';
import Image from 'next/image';
import { useLocale } from 'next-intl';

interface LogoProps {
  inverted?: boolean;
}

export function Logo({ inverted = false }: LogoProps) {
  const locale = useLocale();

  return (
    <Link href={`/${locale}`} className="flex items-center gap-3 group">
      <Image
        src="/logo.png"
        alt="Lirio de los Valles"
        width={200}
        height={67}
        className={`h-14 w-auto object-contain transition-opacity duration-200 group-hover:opacity-80 ${
          inverted ? 'brightness-0 invert' : 'dark:brightness-0 dark:invert'
        }`}
        priority
      />
    </Link>
  );
}
