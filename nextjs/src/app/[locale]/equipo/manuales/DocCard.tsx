'use client';

import { useState } from 'react';
import type { TeamDocument } from './page';

const CATEGORY_LABELS: Record<string, string> = {
  manual: 'Manual',
  politica: 'Política',
  recurso: 'Recurso',
  otro: 'Otro',
};

const CATEGORY_COLORS: Record<string, string> = {
  manual: 'bg-brand-900/40 text-brand-300 border-brand-500/20',
  politica: 'bg-blue-900/40 text-blue-300 border-blue-500/20',
  recurso: 'bg-emerald-900/40 text-emerald-300 border-emerald-500/20',
  otro: 'bg-white/10 text-white/50 border-white/10',
};

const FILE_ICON: Record<string, string> = {
  'application/pdf': '📄',
  'image/jpeg': '🖼️',
  'image/png': '🖼️',
  'video/mp4': '🎬',
  'video/quicktime': '🎬',
};

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://liriodelosvallescr.org';

export default function DocCard({ doc }: { doc: TeamDocument }) {
  const [token, setToken] = useState<string | null>(doc.access_token);
  const [rotating, setRotating] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareableLink = token
    ? `${SITE_URL}/api/equipo/documents/${doc.id}?token=${token}`
    : null;

  async function handleRotate() {
    setRotating(true);
    try {
      const res = await fetch(`/api/equipo/documents/${doc.id}/rotate`, { method: 'POST' });
      if (res.ok) {
        const { token: newToken } = await res.json();
        setToken(newToken);
      }
    } finally {
      setRotating(false);
    }
  }

  async function handleCopy() {
    if (!shareableLink) return;
    await navigator.clipboard.writeText(shareableLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="p-4 rounded-2xl bg-white/4 border border-white/8 hover:bg-white/6 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="text-base">{FILE_ICON[doc.file_type ?? ''] ?? '📎'}</span>
            {doc.category && (
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${CATEGORY_COLORS[doc.category] ?? CATEGORY_COLORS.otro}`}>
                {CATEGORY_LABELS[doc.category] ?? doc.category}
              </span>
            )}
            {doc.visibility === 'link' && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border bg-emerald-900/30 text-emerald-400 border-emerald-500/20">
                Enlace público
              </span>
            )}
            {doc.visibility === 'private' && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border bg-orange-900/30 text-orange-400 border-orange-500/20">
                Privado
              </span>
            )}
          </div>
          <h3 className="font-medium text-white text-sm leading-snug">{doc.title}</h3>
          {doc.description && (
            <p className="text-xs text-white/35 mt-1 line-clamp-2">{doc.description}</p>
          )}
          <p className="text-[10px] text-white/20 mt-2">
            {new Date(doc.date_created).toLocaleDateString('es-CR', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          {/* Token management for private docs */}
          {doc.visibility === 'private' && (
            <div className="mt-3 pt-3 border-t border-white/6">
              {shareableLink ? (
                <div className="space-y-1.5">
                  <p className="text-[10px] text-white/30 font-medium uppercase tracking-wider">Enlace compartible</p>
                  <div className="flex items-center gap-1.5">
                    <code className="flex-1 text-[10px] text-white/40 bg-white/4 rounded-lg px-2 py-1 truncate font-mono">
                      {shareableLink}
                    </code>
                    <button
                      onClick={handleCopy}
                      className="flex-none px-2 py-1 rounded-lg bg-white/6 hover:bg-white/10 text-white/50 hover:text-white/80 text-[10px] transition-colors whitespace-nowrap"
                    >
                      {copied ? '✓ Copiado' : '📋 Copiar'}
                    </button>
                    <button
                      onClick={handleRotate}
                      disabled={rotating}
                      className="flex-none px-2 py-1 rounded-lg bg-white/6 hover:bg-white/10 text-white/50 hover:text-white/80 text-[10px] transition-colors disabled:opacity-40 whitespace-nowrap"
                      title="Rotar token — invalida el enlace anterior"
                    >
                      {rotating ? '...' : '🔄 Rotar'}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleRotate}
                  disabled={rotating}
                  className="text-[10px] px-2.5 py-1 rounded-lg bg-brand-900/40 hover:bg-brand-800/40 border border-brand-700/30 text-brand-400 transition-colors disabled:opacity-40"
                >
                  {rotating ? 'Generando...' : '🔑 Generar enlace compartible'}
                </button>
              )}
            </div>
          )}
        </div>

        <a
          href={`/api/equipo/documents/${doc.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-none flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                     bg-brand-800/60 hover:bg-brand-700/60 border border-brand-700/40
                     text-brand-300 text-xs font-medium transition-colors whitespace-nowrap"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          </svg>
          Ver
        </a>
      </div>
    </div>
  );
}
