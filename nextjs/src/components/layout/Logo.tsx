import Link from 'next/link';
import { useLocale } from 'next-intl';
import { SITE } from '@/lib/constants';

interface LogoProps {
  inverted?: boolean;
}

export function Logo({ inverted = false }: LogoProps) {
  const locale = useLocale();

  return (
    <Link href={`/${locale}`} className="flex items-center gap-3 group">
      {/* Lily SVG mark */}
      <div className="relative w-9 h-9 flex-shrink-0">
        <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <circle cx="18" cy="18" r="17" className={inverted ? 'fill-white/10' : 'fill-brand-700/10 dark:fill-brand-400/15'} />
          {/* Lily petals */}
          <path d="M18 6 C18 6 14 10 14 15 C14 18 16 20 18 20 C20 20 22 18 22 15 C22 10 18 6 18 6Z"
            className={inverted ? 'fill-white' : 'fill-brand-700 dark:fill-brand-400'} />
          <path d="M8 14 C8 14 11 17 15 17 C17.5 17 19 15.5 18.5 13.5 C18 11.5 15.5 10.5 13 11 C10 11.5 8 14 8 14Z"
            className={inverted ? 'fill-white/80' : 'fill-brand-600 dark:fill-brand-300'} />
          <path d="M28 14 C28 14 25 17 21 17 C18.5 17 17 15.5 17.5 13.5 C18 11.5 20.5 10.5 23 11 C26 11.5 28 14 28 14Z"
            className={inverted ? 'fill-white/80' : 'fill-brand-600 dark:fill-brand-300'} />
          {/* Stem */}
          <path d="M18 20 L18 30" stroke={inverted ? 'white' : 'var(--gold-500)'} strokeWidth="1.5" strokeLinecap="round"/>
          {/* Leaves */}
          <path d="M18 25 C18 25 14 24 12 27" stroke={inverted ? 'white' : 'var(--gold-500)'} strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M18 23 C18 23 22 22 24 25" stroke={inverted ? 'white' : 'var(--gold-500)'} strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </div>

      {/* Text */}
      <div className="flex flex-col leading-tight">
        <span
          className={`font-display font-semibold text-lg leading-none tracking-wide ${
            inverted ? 'text-white' : 'text-brand-900 dark:text-white'
          } group-hover:text-gold-500 transition-colors duration-200`}
        >
          Lirio de los Valles
        </span>
        <span className={`text-[10px] font-sans font-medium tracking-[0.15em] uppercase ${
          inverted ? 'text-white/60' : 'text-muted'
        }`}>
          {SITE.domain.split('.')[1] === 'org' ? 'Iglesia Cristiana' : 'Christian Church'}
        </span>
      </div>
    </Link>
  );
}
