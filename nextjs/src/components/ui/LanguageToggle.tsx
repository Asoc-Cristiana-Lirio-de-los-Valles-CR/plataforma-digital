'use client';
import { useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';

export function LanguageToggle() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const switchLocale = () => {
    const newLocale = locale === 'es' ? 'en' : 'es';
    const newPath = pathname.replace(`/${locale}`, `/${newLocale}`);
    router.push(newPath);
  };

  return (
    <button
      onClick={switchLocale}
      aria-label={locale === 'es' ? 'Switch to English' : 'Cambiar a Español'}
      className="px-3 py-1.5 text-sm font-semibold rounded-lg
                 border border-gray-300 dark:border-gray-600
                 text-gray-700 dark:text-gray-300
                 hover:bg-gray-100 dark:hover:bg-gray-800
                 transition-colors duration-150"
    >
      {locale === 'es' ? 'EN' : 'ES'}
    </button>
  );
}
