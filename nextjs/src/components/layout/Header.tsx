'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import { Logo } from './Logo';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { LanguageToggle } from '@/components/ui/LanguageToggle';
import { NAV_LINKS } from '@/lib/constants';
import { clsx } from 'clsx';

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const locale = useLocale();
  const t = useTranslations('nav');
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => setMobileOpen(false), [pathname]);

  // Lock body scroll when mobile menu open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const isActive = (href: string) => {
    const full = href === '/' ? `/${locale}` : `/${locale}${href}`;
    return pathname === full || pathname.startsWith(full + '/');
  };

  return (
    <>
      <header
        className={clsx(
          'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
          scrolled
            ? 'bg-white/95 dark:bg-gray-950/95 backdrop-blur-md shadow-sm border-b border-gray-100 dark:border-gray-800/60'
            : 'bg-transparent'
        )}
      >
        <div className="container-page">
          <div className="flex items-center justify-between h-16 sm:h-18">

            {/* Logo */}
            <Logo />

            {/* Desktop nav */}
            <nav className="hidden lg:flex items-center gap-1" aria-label="Navegación principal">
              {NAV_LINKS.map(({ href, key }) => (
                <Link
                  key={key}
                  href={`/${locale}${href === '/' ? '' : href}`}
                  className={clsx(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150',
                    isActive(href)
                      ? 'text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-950/50'
                      : 'text-gray-700 dark:text-gray-300 hover:text-brand-700 dark:hover:text-brand-300 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                  )}
                >
                  {t(key as 'home' | 'history' | 'live' | 'donate' | 'contact')}
                </Link>
              ))}
            </nav>

            {/* Right actions */}
            <div className="flex items-center gap-2">
              {/* Live CTA — desktop */}
              <Link
                href={`/${locale}/en-vivo`}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                           text-xs font-bold tracking-widest uppercase
                           text-red-600 dark:text-red-400
                           border border-red-200 dark:border-red-800
                           hover:bg-red-50 dark:hover:bg-red-950/40
                           transition-colors duration-150"
                aria-label="Ver en vivo"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                Live
              </Link>

              <ThemeToggle />
              <LanguageToggle />

              {/* Hamburger */}
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="lg:hidden w-9 h-9 flex flex-col items-center justify-center gap-1.5
                           text-gray-700 dark:text-gray-300
                           hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg
                           transition-colors duration-150"
                aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
                aria-expanded={mobileOpen}
              >
                <span className={clsx('block w-5 h-0.5 bg-current rounded-full transition-all duration-200',
                  mobileOpen && 'translate-y-2 rotate-45')} />
                <span className={clsx('block w-5 h-0.5 bg-current rounded-full transition-all duration-200',
                  mobileOpen && 'opacity-0')} />
                <span className={clsx('block w-5 h-0.5 bg-current rounded-full transition-all duration-200',
                  mobileOpen && '-translate-y-2 -rotate-45')} />
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* Mobile menu overlay */}
      <div
        className={clsx(
          'fixed inset-0 z-40 lg:hidden transition-all duration-300',
          mobileOpen ? 'visible' : 'invisible'
        )}
      >
        {/* Backdrop */}
        <div
          className={clsx(
            'absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300',
            mobileOpen ? 'opacity-100' : 'opacity-0'
          )}
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />

        {/* Drawer */}
        <div
          className={clsx(
            'absolute right-0 top-0 bottom-0 w-72 max-w-[85vw]',
            'bg-white dark:bg-gray-950 shadow-xl',
            'flex flex-col',
            'transition-transform duration-300 ease-out',
            mobileOpen ? 'translate-x-0' : 'translate-x-full'
          )}
        >
          {/* Drawer header */}
          <div className="flex items-center justify-between px-6 h-16 border-b border-gray-100 dark:border-gray-800">
            <span className="font-display font-semibold text-brand-900 dark:text-white">Menú</span>
            <button
              onClick={() => setMobileOpen(false)}
              className="w-8 h-8 flex items-center justify-center rounded-lg
                         text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800
                         transition-colors duration-150"
              aria-label="Cerrar menú"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Nav links */}
          <nav className="flex-1 overflow-y-auto py-4 px-4">
            {NAV_LINKS.map(({ href, key }) => (
              <Link
                key={key}
                href={`/${locale}${href === '/' ? '' : href}`}
                className={clsx(
                  'flex items-center px-4 py-3.5 rounded-xl text-base font-medium mb-1',
                  'transition-all duration-150',
                  isActive(href)
                    ? 'text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-950/50'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                )}
              >
                {t(key as 'home' | 'history' | 'live' | 'donate' | 'contact')}
              </Link>
            ))}

            {/* Live link mobile */}
            <Link
              href={`/${locale}/en-vivo`}
              className="flex items-center gap-2 px-4 py-3.5 rounded-xl text-base font-medium
                         text-red-600 dark:text-red-400 mt-2
                         hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors duration-150"
            >
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
              En Vivo / Live
            </Link>
          </nav>

          {/* Bottom actions */}
          <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex items-center gap-3">
            <ThemeToggle />
            <LanguageToggle />
          </div>
        </div>
      </div>

      {/* Spacer so content doesn't hide behind fixed header */}
      <div className="h-16 sm:h-18" aria-hidden />
    </>
  );
}
