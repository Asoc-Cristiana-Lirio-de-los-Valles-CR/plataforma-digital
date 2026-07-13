'use client';

import { useTranslations, useLocale } from 'next-intl';
import { useState } from 'react';
import { SITE, siteName } from '@/lib/constants';
import type { ChurchInfo, ServiceSchedule } from '@/lib/types';

interface Props {
  churchInfo: ChurchInfo | null;
  schedule: ServiceSchedule[];
}

const WHATSAPP_SVG = 'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z';

export function ContactForm({ churchInfo, schedule }: Props) {
  const t = useTranslations('contact');
  const tDays = useTranslations('days');
  const locale = useLocale();
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [form, setForm] = useState({ name: '', email: '', message: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Server error');
      setStatus('success');
      setForm({ name: '', email: '', message: '' });
    } catch {
      setStatus('error');
    }
  };

  const phone = churchInfo?.phone || null;
  const whatsapp = churchInfo?.whatsapp || null;
  const email = churchInfo?.email || null;
  const address = churchInfo?.address || null;
  const addressMapUrl = churchInfo?.address_map_url || null;
  const facebook = churchInfo?.facebook_url || null;
  const youtube = churchInfo?.youtube_url || null;
  const instagram = churchInfo?.instagram_url || null;

  const socialLinks = [
    facebook && {
      href: facebook, label: 'Facebook',
      path: 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z',
    },
    youtube && {
      href: youtube, label: 'YouTube',
      path: 'M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z',
    },
    instagram && {
      href: instagram, label: 'Instagram',
      path: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z',
    },
  ].filter(Boolean) as { href: string; label: string; path: string }[];

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

      <section className="section-padding">
        <div className="container-page">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-5xl mx-auto">

            {/* Contact form */}
            <div>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-brand-800 dark:text-gray-200 mb-1.5">
                    {t('name')} *
                  </label>
                  <input
                    id="name"
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700
                               bg-white dark:bg-gray-900 text-brand-900 dark:text-white
                               placeholder:text-gray-400
                               focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent
                               transition-colors"
                    placeholder={locale === 'es' ? 'Tu nombre completo' : 'Your full name'}
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-brand-800 dark:text-gray-200 mb-1.5">
                    {t('email')} *
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700
                               bg-white dark:bg-gray-900 text-brand-900 dark:text-white
                               placeholder:text-gray-400
                               focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent
                               transition-colors"
                    placeholder={locale === 'es' ? 'tu@correo.com' : 'your@email.com'}
                  />
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-brand-800 dark:text-gray-200 mb-1.5">
                    {t('message')} *
                  </label>
                  <textarea
                    id="message"
                    required
                    rows={5}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700
                               bg-white dark:bg-gray-900 text-brand-900 dark:text-white
                               placeholder:text-gray-400
                               focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent
                               transition-colors resize-none"
                    placeholder={locale === 'es' ? '¿Cómo podemos ayudarte?' : 'How can we help you?'}
                  />
                </div>

                <button
                  type="submit"
                  disabled={status === 'sending'}
                  className="btn-gold w-full justify-center disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {status === 'sending' ? t('sending') : t('send')}
                </button>

                {status === 'success' && (
                  <p className="text-sm text-green-600 dark:text-green-400 text-center font-medium">
                    {t('success')}
                  </p>
                )}
                {status === 'error' && (
                  <p className="text-sm text-red-600 dark:text-red-400 text-center font-medium">
                    {t('error')}
                  </p>
                )}
              </form>
            </div>

            {/* Contact info */}
            <div className="space-y-8">

              {/* Contact details */}
              {(phone || whatsapp || email || address) && (
                <div>
                  <h2 className="text-xs font-bold tracking-[0.2em] uppercase text-gold-500 mb-4">
                    {t('address')}
                  </h2>
                  <div className="space-y-3">
                    {phone && (
                      <a href={`tel:${phone}`} className="flex items-center gap-3 text-sm text-brand-800 dark:text-gray-200 hover:text-brand-600 dark:hover:text-white transition-colors">
                        <span className="w-8 h-8 rounded-lg bg-brand-100 dark:bg-brand-900/40 flex items-center justify-center text-brand-600 dark:text-brand-300 flex-shrink-0">
                          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
                        </span>
                        {phone}
                      </a>
                    )}
                    {whatsapp && (
                      <a
                        href={`https://wa.me/${whatsapp.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 text-sm text-brand-800 dark:text-gray-200 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                      >
                        <span className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400 flex-shrink-0">
                          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d={WHATSAPP_SVG}/></svg>
                        </span>
                        WhatsApp
                      </a>
                    )}
                    {email && (
                      <a href={`mailto:${email}`} className="flex items-center gap-3 text-sm text-brand-800 dark:text-gray-200 hover:text-brand-600 dark:hover:text-white transition-colors">
                        <span className="w-8 h-8 rounded-lg bg-brand-100 dark:bg-brand-900/40 flex items-center justify-center text-brand-600 dark:text-brand-300 flex-shrink-0">
                          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
                        </span>
                        {email}
                      </a>
                    )}
                    {address && (
                      <div className="flex items-start gap-3">
                        <span className="w-8 h-8 rounded-lg bg-brand-100 dark:bg-brand-900/40 flex items-center justify-center text-brand-600 dark:text-brand-300 flex-shrink-0 mt-0.5">
                          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                        </span>
                        <div>
                          <p className="text-sm text-brand-800 dark:text-gray-200">{address}</p>
                          {addressMapUrl && (
                            <a href={addressMapUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-gold-500 hover:text-gold-400 transition-colors">
                              {locale === 'es' ? 'Ver en mapa →' : 'View on map →'}
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Schedule */}
              {schedule.length > 0 && (
                <div>
                  <h2 className="text-xs font-bold tracking-[0.2em] uppercase text-gold-500 mb-4">
                    {t('schedule')}
                  </h2>
                  <ul className="space-y-2 text-sm text-brand-800 dark:text-gray-200">
                    {schedule.map((s, i) => (
                      <li key={i} className="flex justify-between">
                        <span>{locale === 'es' ? s.name : s.name_en}</span>
                        <span className="text-muted">
                          {tDays.has(s.day as any) ? tDays(s.day as any) : s.day} {s.time}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Social media */}
              {socialLinks.length > 0 && (
                <div>
                  <h2 className="text-xs font-bold tracking-[0.2em] uppercase text-gold-500 mb-4">
                    {locale === 'es' ? 'Redes Sociales' : 'Social Media'}
                  </h2>
                  <div className="flex gap-3">
                    {socialLinks.map(({ href, label, path }) => (
                      <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label}
                        className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-900/40 flex items-center justify-center text-brand-600 dark:text-brand-300 hover:bg-brand-200 dark:hover:bg-brand-800 transition-colors">
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d={path} /></svg>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Legal */}
              <div className="card p-6 text-xs text-muted leading-relaxed">
                <p className="font-semibold text-brand-800 dark:text-gray-200 mb-1">
                  {churchInfo?.legal_name || siteName(locale)}
                </p>
                <p>{locale === 'es' ? 'Cédula jurídica' : 'Legal ID'}: {churchInfo?.cedula_juridica || SITE.legalId}</p>
                <p>Costa Rica</p>
              </div>
            </div>

          </div>
        </div>
      </section>
    </>
  );
}
