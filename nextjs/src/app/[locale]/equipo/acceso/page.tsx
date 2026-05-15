'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';

export default function EquipoAccesoPage() {
  const params = useParams();
  const locale = params?.locale ?? 'es';
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/equipo/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, locale }),
        redirect: 'follow',
      });
      if (res.ok || res.redirected) {
        window.location.href = `/${locale}/equipo/manuales`;
      } else {
        setError('Clave incorrecta. Contacta al administrador.');
      }
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-950 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-brand-800/60 border border-brand-700/40 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-brand-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
          </div>
          <h1 className="text-xl font-display font-semibold text-white">Zona del Equipo</h1>
          <p className="text-sm text-white/40 mt-1">Ingresa la clave de acceso</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={key}
            onChange={e => setKey(e.target.value)}
            placeholder="Clave de acceso"
            autoFocus
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white
                       placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-brand-500/50
                       focus:border-brand-500/50 transition-all text-sm"
          />
          {error && (
            <p className="text-red-400 text-xs text-center">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading || !key}
            className="w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-40
                       disabled:cursor-not-allowed text-white font-medium text-sm transition-colors"
          >
            {loading ? 'Verificando...' : 'Acceder'}
          </button>
        </form>
      </div>
    </div>
  );
}
