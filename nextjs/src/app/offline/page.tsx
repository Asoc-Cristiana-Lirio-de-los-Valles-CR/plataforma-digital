'use client';

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-950 dark:bg-brand-950">
      <div className="text-center px-6">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-brand-900 flex items-center justify-center">
          <svg className="w-10 h-10 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
          </svg>
        </div>
        <h1 className="text-2xl font-display font-semibold text-white mb-3">Sin conexión</h1>
        <p className="text-brand-300 mb-8 max-w-sm mx-auto">
          No hay conexión a internet. Reconéctate para ver predicaciones y contenido de la iglesia.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="bg-brand-600 hover:bg-brand-500 text-white font-medium px-6 py-3 rounded-xl transition-colors"
        >
          Reintentar
        </button>
      </div>
    </div>
  );
}
