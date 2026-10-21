'use client';
import { useState, useEffect, useCallback } from 'react';

interface Comunicado {
  id: number;
  title: string;
  body: string;
  priority: 'normal' | 'high' | 'urgent';
  visibility: 'asociados' | 'equipo' | 'all';
  status: 'published' | 'draft' | 'archived';
  date_created: string;
}

const PRIORITY_LABEL: Record<string, { label: string; color: string }> = {
  normal: { label: 'Normal', color: 'text-white/40 border-white/10' },
  high: { label: 'Importante', color: 'text-amber-400 border-amber-500/30 bg-amber-500/10' },
  urgent: { label: 'Urgente', color: 'text-red-400 border-red-500/30 bg-red-500/10' },
};

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  published: { label: 'Publicado', color: 'text-emerald-400' },
  draft: { label: 'Borrador', color: 'text-white/40' },
  archived: { label: 'Archivado', color: 'text-white/20' },
};

const VISIBILITY_LABEL: Record<string, string> = {
  asociados: 'Asociados',
  equipo: 'Equipo',
  all: 'Público',
};

function formatDate(s: string) {
  return new Date(s).toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function AdminComunicadosPage() {
  const [items, setItems] = useState<Comunicado[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [filter, setFilter] = useState<'all' | 'published' | 'draft' | 'archived'>('all');

  const [form, setForm] = useState({
    title: '',
    body: '',
    priority: 'normal',
    visibility: 'asociados',
  });

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/asociados/admin/comunicados');
      const { data } = await r.json();
      setItems(data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = filter === 'all' ? items : items.filter(i => i.status === filter);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.body.trim()) {
      showToast('Título y contenido son requeridos.', false);
      return;
    }
    setSaving(true);
    try {
      const r = await fetch('/api/asociados/admin/comunicados', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await r.json();
      if (!r.ok) { showToast(data.error ?? 'Error al publicar.', false); return; }
      showToast('Comunicado publicado.');
      setShowForm(false);
      setForm({ title: '', body: '', priority: 'normal', visibility: 'asociados' });
      load();
    } finally {
      setSaving(false);
    }
  }

  async function reenviar(item: Comunicado) {
    if (!confirm(`¿Reenviar "${item.title}" a todos los asociados activos?`)) return;
    const r = await fetch('/api/asociados/admin/comunicados', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: item.id }),
    });
    const data = await r.json();
    if (r.ok) showToast(`Reenviado a ${data.sent} asociado${data.sent !== 1 ? 's' : ''}.`);
    else showToast(data.error ?? 'Error al reenviar.', false);
  }

  async function eliminar(item: Comunicado) {
    if (!confirm(`¿Eliminar permanentemente "${item.title}"? Esta acción no se puede deshacer.`)) return;
    const r = await fetch('/api/asociados/admin/comunicados', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: item.id }),
    });
    if (r.ok) {
      setItems(prev => prev.filter(i => i.id !== item.id));
      setExpanded(null);
      showToast('Comunicado eliminado.');
    } else {
      const data = await r.json();
      showToast(data.error ?? 'Error al eliminar.', false);
    }
  }

  async function changeStatus(id: number, status: string) {
    const r = await fetch('/api/asociados/admin/comunicados', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    if (r.ok) {
      setItems(prev => prev.map(i => i.id === id ? { ...i, status: status as Comunicado['status'] } : i));
      showToast(status === 'archived' ? 'Archivado.' : status === 'draft' ? 'Movido a borrador.' : 'Publicado.');
    }
  }

  const statusCounts = {
    all: items.length,
    published: items.filter(i => i.status === 'published').length,
    draft: items.filter(i => i.status === 'draft').length,
    archived: items.filter(i => i.status === 'archived').length,
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-lg
          ${toast.ok ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300' : 'bg-red-500/20 border border-red-500/40 text-red-300'}`}>
          {toast.msg}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Comunicados</h1>
          <p className="text-sm text-white/40 mt-0.5">Publicaciones para asociados</p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo comunicado
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="mb-6 p-5 rounded-2xl bg-white/5 border border-white/10 space-y-4">
          <h2 className="text-sm font-semibold text-white/80">Nuevo comunicado</h2>

          <div>
            <label className="block text-xs text-white/50 mb-1">Título *</label>
            <input
              value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              placeholder="Ej. Aviso reunión general"
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-blue-500/60"
            />
          </div>

          <div>
            <label className="block text-xs text-white/50 mb-1">Contenido *</label>
            <textarea
              value={form.body}
              onChange={e => setForm(p => ({ ...p, body: e.target.value }))}
              rows={5}
              placeholder="Escribe el comunicado aquí..."
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-blue-500/60 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-white/50 mb-1">Prioridad</label>
              <select
                value={form.priority}
                onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-[#1a1530] border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500/60"
              >
                <option value="normal">Normal</option>
                <option value="high">Importante</option>
                <option value="urgent">Urgente</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">Visibilidad</label>
              <select
                value={form.visibility}
                onChange={e => setForm(p => ({ ...p, visibility: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-[#1a1530] border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500/60"
              >
                <option value="asociados">Solo Asociados</option>
                <option value="equipo">Solo Equipo</option>
                <option value="all">Todos</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium transition-colors"
            >
              {saving ? 'Publicando...' : 'Publicar'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 text-sm transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 mb-5">
        {(['all', 'published', 'draft', 'archived'] as const).map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === s ? 'bg-blue-600 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'
            }`}
          >
            {s === 'all' ? 'Todos' : STATUS_LABEL[s].label}
            <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] ${filter === s ? 'bg-white/20' : 'bg-white/10'}`}>
              {statusCounts[s]}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-white/30 text-sm">Cargando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-white/30 text-sm">No hay comunicados.</div>
      ) : (
        <div className="space-y-2">
          {filtered.map(item => {
            const prio = PRIORITY_LABEL[item.priority];
            const stat = STATUS_LABEL[item.status];
            const isOpen = expanded === item.id;

            return (
              <div key={item.id} className={`rounded-xl border transition-all ${
                item.status === 'archived'
                  ? 'border-white/5 bg-white/1 opacity-50'
                  : 'border-white/8 bg-white/3 hover:border-white/15'
              }`}>
                <button
                  onClick={() => setExpanded(isOpen ? null : item.id)}
                  className="w-full flex items-center gap-3 p-4 text-left"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-white">{item.title}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${prio.color}`}>{prio.label}</span>
                      <span className="text-[10px] text-white/30 bg-white/5 px-1.5 py-0.5 rounded-full">{VISIBILITY_LABEL[item.visibility]}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className={`text-xs ${stat.color}`}>{stat.label}</span>
                      <span className="text-white/20">·</span>
                      <span className="text-xs text-white/30">{formatDate(item.date_created)}</span>
                    </div>
                  </div>
                  <svg className={`w-4 h-4 text-white/30 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m19 9-7 7-7-7" />
                  </svg>
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 border-t border-white/5">
                    <p className="text-sm text-white/60 leading-relaxed mt-3 whitespace-pre-wrap">{item.body}</p>
                    <div className="flex items-start justify-between gap-3 mt-4">
                      <div className="flex gap-2 flex-wrap">
                        {item.status === 'published' && (
                          <button
                            onClick={() => reenviar(item)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-blue-500/40 text-blue-400 hover:bg-blue-500/10 transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            Reenviar email
                          </button>
                        )}
                        {item.status !== 'published' && (
                          <button
                            onClick={() => changeStatus(item.id, 'published')}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                          >
                            Publicar
                          </button>
                        )}
                        {item.status !== 'draft' && item.status !== 'archived' && (
                          <button
                            onClick={() => changeStatus(item.id, 'draft')}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium border border-white/10 text-white/40 hover:bg-white/5 transition-colors"
                          >
                            Mover a borrador
                          </button>
                        )}
                        {item.status !== 'archived' && (
                          <button
                            onClick={() => changeStatus(item.id, 'archived')}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium border border-white/10 text-white/30 hover:bg-white/5 transition-colors"
                          >
                            Archivar
                          </button>
                        )}
                      </div>
                      <button
                        onClick={() => eliminar(item)}
                        className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
