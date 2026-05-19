'use client';
import { useState, useEffect, useCallback } from 'react';

interface Profile {
  id: number;
  nombre: string;
  email: string;
  tipo_identificacion: string;
  numero_identificacion: string;
  fecha_nacimiento: string;
  fecha_bautismo: string | null;
  telefono: string;
  ultima_actividad: string | null;
}

interface Solicitud {
  id: number;
  status: string;
  requested_at: string;
  notes: string | null;
  profile_id: Profile;
}

const TIPO_LABEL: Record<string, string> = {
  cedula_identidad: 'Cédula',
  dimex: 'DIMEX',
  pasaporte: 'Pasaporte',
};

function formatDate(s: string | null) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function SolicitudesPage() {
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<number | null>(null);
  const [processing, setProcessing] = useState<number | null>(null);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [toast, setToast] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/asociados/admin/solicitudes');
      if (!res.ok) { setError('Sin acceso.'); return; }
      const { data } = await res.json();
      setSolicitudes(data);
    } catch {
      setError('Error al cargar solicitudes.');
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handle(id: number, action: 'approve' | 'reject') {
    setProcessing(id);
    try {
      const res = await fetch('/api/asociados/admin/solicitudes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action, notes: notes[id] ?? '' }),
      });
      if (!res.ok) throw new Error();
      setToast(action === 'approve' ? 'Miembro aprobado ✓' : 'Solicitud rechazada');
      setTimeout(() => setToast(''), 3000);
      setSolicitudes(prev => prev.filter(s => s.id !== id));
      setExpanded(null);
    } catch {
      setToast('Error al procesar. Intenta de nuevo.');
      setTimeout(() => setToast(''), 3000);
    }
    setProcessing(null);
  }

  return (
    <div className="min-h-screen bg-[#0d0a19] p-4 sm:p-8">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2 rounded-xl bg-[#461a7a] text-white text-sm shadow-lg animate-fade-in">
          {toast}
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-display font-semibold text-white">Solicitudes pendientes</h1>
            <p className="text-sm text-white/40 mt-0.5">Portal de Asociados — Administración</p>
          </div>
          <button
            onClick={load}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-white/50
                       hover:bg-white/5 transition-colors duration-150"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Actualizar
          </button>
        </div>

        {loading && (
          <div className="text-center py-16 text-white/30 text-sm">Cargando solicitudes...</div>
        )}

        {error && (
          <div className="text-center py-16 text-red-400 text-sm">{error}</div>
        )}

        {!loading && !error && solicitudes.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
            <p className="text-white/30 text-sm">No hay solicitudes pendientes</p>
          </div>
        )}

        {/* List */}
        <div className="space-y-3">
          {solicitudes.map(s => {
            const p = s.profile_id;
            const isOpen = expanded === s.id;
            const busy = processing === s.id;

            return (
              <div
                key={s.id}
                className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden"
              >
                {/* Row */}
                <button
                  onClick={() => setExpanded(isOpen ? null : s.id)}
                  className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-white/[0.03] transition-colors"
                >
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-[#461a7a]/40 border border-[#b48af7]/20
                                  flex items-center justify-center shrink-0 text-[#b48af7] font-semibold text-sm">
                    {(p.nombre?.[0] ?? '?').toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium text-sm truncate">{p.nombre || '—'}</span>
                      <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium
                        ${s.status === 'pending'
                          ? 'bg-amber-500/15 text-amber-400'
                          : 'bg-blue-500/15 text-blue-400'}`}>
                        {s.status === 'pending' ? 'Pendiente' : 'Incompleto'}
                      </span>
                    </div>
                    <div className="text-xs text-white/40 truncate mt-0.5">{p.email}</div>
                  </div>

                  <div className="text-xs text-white/30 shrink-0 hidden sm:block">
                    {formatDate(s.requested_at)}
                  </div>

                  <svg
                    className={`w-4 h-4 text-white/30 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Detail panel */}
                {isOpen && (
                  <div className="border-t border-white/10 px-5 py-5">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3 mb-5">
                      <Field label="Nombre" value={p.nombre} />
                      <Field label="Correo" value={p.email} />
                      <Field label="Tipo ID" value={TIPO_LABEL[p.tipo_identificacion] ?? p.tipo_identificacion} />
                      <Field label="Número ID" value={p.numero_identificacion} />
                      <Field label="Fecha nacimiento" value={formatDate(p.fecha_nacimiento)} />
                      <Field label="Teléfono" value={p.telefono} />
                      {p.fecha_bautismo && <Field label="Fecha bautismo" value={formatDate(p.fecha_bautismo)} />}
                      <Field label="Solicitud" value={formatDate(s.requested_at)} />
                    </div>

                    {/* Notes */}
                    <div className="mb-4">
                      <label className="block text-xs text-white/40 mb-1">Notas (opcional)</label>
                      <textarea
                        rows={2}
                        placeholder="Motivo de rechazo u observaciones..."
                        value={notes[s.id] ?? ''}
                        onChange={e => setNotes(n => ({ ...n, [s.id]: e.target.value }))}
                        className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs
                                   placeholder:text-white/20 focus:outline-none focus:border-[#b48af7]/40 resize-none"
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                      <button
                        onClick={() => handle(s.id, 'approve')}
                        disabled={busy}
                        className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500
                                   text-white text-sm font-semibold transition-colors disabled:opacity-50"
                      >
                        {busy ? 'Procesando...' : 'Aprobar'}
                      </button>
                      <button
                        onClick={() => handle(s.id, 'reject')}
                        disabled={busy}
                        className="flex-1 py-2.5 rounded-xl bg-red-900/40 hover:bg-red-900/70
                                   border border-red-800/50 text-red-400 text-sm font-semibold
                                   transition-colors disabled:opacity-50"
                      >
                        Rechazar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-white/30 mb-0.5">{label}</div>
      <div className="text-sm text-white">{value || '—'}</div>
    </div>
  );
}
