'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';
import { clsx } from 'clsx';
import { useState, useEffect } from 'react';
import { signOut } from 'next-auth/react';

const NAV = [
  {
    href: '/asociados',
    label: 'Inicio',
    icon: (active: boolean) => (
      <svg className="w-6 h-6" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
      </svg>
    ),
  },
  {
    href: '/asociados/documentos',
    label: 'Documentos',
    icon: (active: boolean) => (
      <svg className="w-6 h-6" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
      </svg>
    ),
  },
  {
    href: '/asociados/comunicados',
    label: 'Comunicados',
    icon: (active: boolean) => (
      <svg className="w-6 h-6" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 1 1 0-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 0 1-1.44-4.282m3.102.069a18.03 18.03 0 0 1-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 0 1 8.835 2.535M10.34 6.66a23.847 23.847 0 0 1 8.835-2.535m0 0A23.74 23.74 0 0 1 18.795 3m.38 1.125a23.91 23.91 0 0 1 1.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 0 0 1.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 0 1 0 3.46" />
      </svg>
    ),
  },
  {
    href: '/asociados/perfil',
    label: 'Perfil',
    icon: (active: boolean) => (
      <svg className="w-6 h-6" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
      </svg>
    ),
  },
];

const NO_LAYOUT_PATHS = ['/asociados/login', '/asociados/pendiente', '/asociados/registro', '/asociados/completar-perfil'];

export default function AsociadosLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const locale = useLocale();
  const [isAdmin, setIsAdmin] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    fetch('/api/auth/session').then(r => r.json()).then(s => {
      if (s?.user?.isAdmin) {
        setIsAdmin(true);
        fetch('/api/asociados/admin/solicitudes')
          .then(r => r.json())
          .then(d => setPendingCount(d?.data?.length ?? 0))
          .catch(() => {});
      }
    }).catch(() => {});
  }, []);

  const isActive = (href: string) => {
    const full = `/${locale}${href}`;
    return href === '/asociados'
      ? pathname === full
      : pathname.startsWith(full);
  };

  const localePath = pathname.replace(`/${locale}`, '');
  if (NO_LAYOUT_PATHS.some(p => localePath === p || localePath.startsWith(p + '/'))) {
    return <>{children}</>;
  }

  const adminHref = '/asociados/admin/solicitudes';
  const adminActive = pathname.startsWith(`/${locale}/asociados/admin`);

  return (
    <div className="min-h-screen bg-[#0d0a19] text-white flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-[#0d0a19]/95 backdrop-blur-md border-b border-white/5 px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.webp" alt="Lirio" className="h-7 w-auto" />
          <span className="text-sm font-semibold text-white/80 hidden sm:block">Portal Asociados</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href={`/${locale}`} className="text-xs text-white/40 hover:text-white/70 transition-colors hidden sm:block">
            Sitio público
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: '/es/asociados/login' })}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                       text-white/50 hover:text-red-400 hover:bg-red-500/10
                       border border-white/10 hover:border-red-500/30
                       transition-all duration-150"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="hidden sm:inline">Cerrar sesión</span>
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 pb-20 sm:pb-0 sm:pl-20 lg:pl-64">
        {children}
      </main>

      {/* Bottom nav — mobile */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 sm:hidden bg-[#0d0a19]/95 backdrop-blur-md border-t border-white/5">
        <div className="flex items-center justify-around h-16 px-2">
          {NAV.map(({ href, label, icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={`/${locale}${href}`}
                className={clsx(
                  'flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all duration-150',
                  active ? 'text-[#b48af7]' : 'text-white/40'
                )}
              >
                {icon(active)}
                <span className="text-[10px] font-medium">{label}</span>
              </Link>
            );
          })}
          {isAdmin && (
            <Link
              href={`/${locale}${adminHref}`}
              className={clsx(
                'flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all duration-150 relative',
                adminActive ? 'text-amber-400' : 'text-white/40'
              )}
            >
              <svg className="w-6 h-6" fill={adminActive ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
              </svg>
              <span className="text-[10px] font-medium">Admin</span>
              {pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-[9px] font-bold text-black flex items-center justify-center">
                  {pendingCount > 9 ? '9+' : pendingCount}
                </span>
              )}
            </Link>
          )}
        </div>
      </nav>

      {/* Side nav — desktop */}
      <nav className="hidden sm:flex fixed left-0 top-14 bottom-0 z-30 w-20 lg:w-64 flex-col bg-[#0d0a19] border-r border-white/5 py-4 px-2 lg:px-4">
        {NAV.map(({ href, label, icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={`/${locale}${href}`}
              className={clsx(
                'flex items-center gap-3 px-3 py-3 rounded-xl mb-1 transition-all duration-150',
                active
                  ? 'bg-[#461a7a]/60 text-[#b48af7]'
                  : 'text-white/40 hover:text-white/70 hover:bg-white/5'
              )}
            >
              {icon(active)}
              <span className="hidden lg:block text-sm font-medium">{label}</span>
            </Link>
          );
        })}

        {isAdmin && (
          <>
            <div className="my-3 h-px bg-white/5" />
            <Link
              href={`/${locale}${adminHref}`}
              className={clsx(
                'flex items-center gap-3 px-3 py-3 rounded-xl mb-1 transition-all duration-150 relative',
                adminActive
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'text-white/40 hover:text-amber-400/70 hover:bg-amber-500/10'
              )}
            >
              <div className="relative shrink-0">
                <svg className="w-6 h-6" fill={adminActive ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                </svg>
                {pendingCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-amber-500 text-[9px] font-bold text-black flex items-center justify-center">
                    {pendingCount > 9 ? '9+' : pendingCount}
                  </span>
                )}
              </div>
              <span className="hidden lg:block text-sm font-medium">Administración</span>
              {pendingCount > 0 && (
                <span className="hidden lg:flex ml-auto items-center justify-center px-1.5 py-0.5 rounded-full bg-amber-500 text-[10px] font-bold text-black min-w-[20px]">
                  {pendingCount > 9 ? '9+' : pendingCount}
                </span>
              )}
            </Link>
          </>
        )}
      </nav>
    </div>
  );
}
