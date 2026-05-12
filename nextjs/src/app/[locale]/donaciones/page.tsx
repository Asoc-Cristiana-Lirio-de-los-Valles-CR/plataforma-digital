import { getTranslations, getLocale } from 'next-intl/server';
import { getChurchInfo } from '@/lib/directus';
import { SITE, siteName } from '@/lib/constants';
import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  return { title: 'Donaciones' };
}

function CopyButton({ value }: { value: string }) {
  return (
    <button
      onClick={() => navigator.clipboard.writeText(value)}
      className="text-xs text-brand-600 dark:text-brand-300 hover:underline ml-2"
      title="Copiar"
    >
      copiar
    </button>
  );
}

export default async function DonacionesPage() {
  const t = await getTranslations('donate');
  const locale = await getLocale();
  const info = await getChurchInfo();

  const sinpeNumber = info?.sinpe_number || '8888-8888';
  const sinpeName = (info as any)?.sinpe_name || 'Asociación Cristiana Lirio de los Valles';
  const bankAccount = info?.bank_account || '';
  const bankIban = (info as any)?.bank_iban || '';
  const paypalUrl = info?.paypal_url || '';
  const legalName = info?.legal_name || 'Asociación Cristiana Lirio de los Valles';
  const cedulaJuridica = info?.cedula_juridica || '3-002-104369';
  const legalDesc = locale === 'en'
    ? (info?.legal_description_en || info?.legal_description || '')
    : (info?.legal_description || '');

  return (
    <>
      {/* Hero header */}
      <section
        className="relative py-20 sm:py-28"
        style={{ backgroundImage: 'linear-gradient(160deg, #2e0f52 0%, #461a7a 60%, #1a0730 100%)' }}
      >
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }}
          aria-hidden
        />
        <div className="container-page relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="gold-line" />
            <span className="text-gold-400 text-sm font-semibold tracking-[0.2em] uppercase">
              {siteName(locale)}
            </span>
          </div>
          <h1 className="font-display text-4xl sm:text-5xl font-bold text-white leading-tight mb-3">
            {t('title')}
          </h1>
          <p className="text-white/70 text-lg max-w-xl">{t('subtitle')}</p>
        </div>
      </section>

      {/* Donation methods */}
      <section className="section-padding">
        <div className="container-page">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">

            {/* SINPE */}
            <div className="card p-8 flex flex-col">
              <div className="w-12 h-12 rounded-xl bg-brand-100 dark:bg-brand-900/40 flex items-center justify-center mb-5">
                <svg className="w-6 h-6 text-brand-600 dark:text-brand-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xs font-bold tracking-[0.15em] uppercase text-gold-500 mb-4">
                {t('sinpe')}
              </h3>
              <div className="space-y-2 flex-1">
                <div>
                  <p className="text-xs text-muted mb-1">{locale === 'es' ? 'Número' : 'Number'}</p>
                  <p className="font-mono text-2xl font-bold tracking-widest text-brand-900 dark:text-white">
                    {sinpeNumber}
                  </p>
                </div>
              </div>
              <p className="text-[11px] text-muted mt-4 truncate">{sinpeName}</p>
            </div>

            {/* Bank transfer */}
            <div className="card p-8 flex flex-col">
              <div className="w-12 h-12 rounded-xl bg-brand-100 dark:bg-brand-900/40 flex items-center justify-center mb-5">
                <svg className="w-6 h-6 text-brand-600 dark:text-brand-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <h3 className="text-xs font-bold tracking-[0.15em] uppercase text-gold-500 mb-4">
                {t('bank')}
              </h3>
              <div className="space-y-3 text-sm flex-1">
                {bankAccount && (
                  <div>
                    <p className="text-xs text-muted">{t('account')}</p>
                    <p className="font-mono font-bold tracking-wider text-brand-900 dark:text-white">{bankAccount}</p>
                  </div>
                )}
                {bankIban && (
                  <div>
                    <p className="text-xs text-muted">{t('iban')}</p>
                    <p className="font-medium text-brand-900 dark:text-white font-mono text-xs">{bankIban}</p>
                  </div>
                )}
                {!bankAccount && !bankIban && (
                  <p className="text-muted">
                    {locale === 'es'
                      ? 'Contáctenos para información bancaria'
                      : 'Contact us for banking information'}
                  </p>
                )}
              </div>
              <p className="text-[11px] text-muted mt-4 truncate">{legalName}</p>
            </div>

            {/* PayPal */}
            <div className="card p-8 flex flex-col">
              <div className="w-12 h-12 rounded-xl bg-brand-100 dark:bg-brand-900/40 flex items-center justify-center mb-5">
                <svg className="w-6 h-6 text-brand-600 dark:text-brand-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" />
                </svg>
              </div>
              <h3 className="text-xs font-bold tracking-[0.15em] uppercase text-gold-500 mb-4">
                {t('paypal')}
              </h3>
              <div className="flex-1">
                {paypalUrl ? (
                  <a
                    href={paypalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-gold text-sm"
                  >
                    {locale === 'es' ? 'Donar con PayPal' : 'Donate with PayPal'} →
                  </a>
                ) : (
                  <p className="text-sm text-muted">
                    {locale === 'es' ? 'Próximamente disponible' : 'Coming soon'}
                  </p>
                )}
              </div>
              <p className="text-[11px] text-muted mt-4 truncate">{legalName}</p>
            </div>

          </div>

          {/* Legal information */}
          <div className="max-w-3xl mx-auto mt-14">
            <div className="rounded-2xl border border-gold-500/25 bg-gold-500/[0.04] dark:bg-gold-500/[0.03] overflow-hidden">
              {/* Header strip */}
              <div className="flex items-center gap-3 px-6 py-4 border-b border-gold-500/20 bg-gold-500/[0.06]">
                <svg className="w-4 h-4 text-gold-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-xs font-bold tracking-[0.18em] uppercase text-gold-500">
                  {locale === 'es' ? 'Información legal' : 'Legal information'}
                </span>
              </div>
              {/* Body */}
              <div className="px-6 py-5 space-y-4">
                <div>
                  <p className="text-[11px] text-muted uppercase tracking-widest mb-1">
                    {locale === 'es' ? 'Razón social' : 'Legal name'}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <p className="font-display text-base font-bold text-brand-900 dark:text-white">
                      {legalName}
                    </p>
                    <span className="text-gold-500/40 hidden sm:inline">|</span>
                    <p className="text-sm text-muted">
                      {locale === 'es' ? 'Cédula jurídica:' : 'Tax ID:'}{' '}
                      <span className="font-mono font-bold text-brand-700 dark:text-brand-300">{cedulaJuridica}</span>
                    </p>
                  </div>
                </div>
                <p className="text-sm text-muted leading-relaxed border-l-2 border-gold-500/40 pl-3">
                  {legalDesc}
                </p>
              </div>
            </div>
          </div>

          {/* Thank you note */}
          <div className="max-w-2xl mx-auto mt-12 text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="gold-line" />
              <div className="gold-line" />
            </div>
            <p className="text-brand-700 dark:text-brand-300 font-display text-xl italic">
              {t('thankYou')}
            </p>
            <p className="text-muted text-sm mt-3">
              {locale === 'es'
                ? 'El 100% de las donaciones se destina al ministerio y servicio comunitario de la asociación.'
                : '100% of donations go to the ministry and community service of the association.'}
            </p>
            <p className="text-xs text-muted mt-2">
              {siteName(locale)} · {locale === 'es' ? 'Cédula jurídica' : 'Legal ID'}: {SITE.legalId}
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
