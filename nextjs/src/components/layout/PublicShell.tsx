'use client';
import { usePathname } from 'next/navigation';
import { Header } from './Header';
import { Footer } from './Footer';

export function PublicShell({
  children,
  churchName,
}: {
  children: React.ReactNode;
  churchName?: string;
}) {
  const pathname = usePathname();
  const isPortal = pathname.includes('/asociados') || pathname.includes('/equipo');

  if (isPortal) {
    return <>{children}</>;
  }

  return (
    <>
      <Header churchName={churchName} />
      <main>{children}</main>
      <Footer />
    </>
  );
}
