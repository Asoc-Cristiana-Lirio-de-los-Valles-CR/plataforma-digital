'use client';
import { useState, useEffect, useRef, useCallback } from 'react';

interface Doc {
  id: number;
  title: string;
  description: string | null;
  category: string;
  status: 'active' | 'inactive';
  allow_download: boolean;
  version: string | null;
  date_created: string;
}

const CATEGORIES: { key: string; label: string; icon: string }[] = [
  { key: 'all', label: 'Todos', icon: '📁' },
  { key: 'financial_report', label: 'Estados Financieros', icon: '💰' },
  { key: 'minutes', label: 'Actas', icon: '📋' },
  { key: 'regulation', label: 'Reglamentos', icon: '📜' },
  { key: 'announcement', label: 'Anuncios', icon: '📢' },
  { key: 'other', label: 'Otros', icon: '📄' },
];

const CAT_LABEL: Record<string, string> = {
  financial_report: 'Estados Financieros',
  minutes: 'Actas',
  regulation: 'Reglamentos',
  announcement: 'Anuncios',
  other: 'Otros',
};

function formatDate(s: string) {
  return new Date(s).toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function AdminDocumentosPage() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'financial_report',
    allow_download: true,
    version: '',
  });

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/asociados/admin/documentos');
      const { data } = await r.json();
      setDocs(data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = activeCategory === 'all' ? docs : docs.filter(d => d.category === activeCategory);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) { showToast('Selecciona un archivo.', false); return; }
    if (!form.title.trim()) { showToast('El título es requerido.', false); return; }

    const fd = new FormData();
    fd.append('file', file);
    fd.append('title', form.title.trim());
    fd.append('description', form.description.trim());
    fd.append('category', form.category);
    fd.append('allow_download', String(form.allow_download));
    if (form.version.trim()) fd.append('version', form.version.trim());

    setUploading(true);
    try {
      const r = await fetch('/api/asociados/admin/documentos', { method: 'POST', body: fd });
      const data = await r.json();
      if (!r.ok) { showToast(data.error ?? 'Error al subir.', false); return; }
      showToast('Documento subido exitosamente.');
      setShowForm(false);
      setForm({ title: '', description: '', category: 'financial_report', allow_download: true, version: '' });
      if (fileRef.current) fileRef.current.value = '';
      load();
    } finally {
      setUploading(false);
    }
  }

  async function toggleStatus(doc: Doc) {
    const newStatus = doc.status === 'active' ? 'inactive' : 'active';
    const r = await fetch('/api/asociados/admin/documentos', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: doc.id, status: newStatus }),
    });
    if (r.ok) {
      setDocs(prev => prev.map(d => d.id === doc.id ? { ...d, status: newStatus } : d));
      showToast(newStatus === 'active' ? 'Documento activado.' : 'Documento desactivado.');
    }
  }

  async function deleteDoc(doc: Doc) {
    if (!confirm(`¿Eliminar permanentemente "${doc.title}"? Esta acción no se puede deshacer.`)) return;
    const r = await fetch('/api/asociados/admin/documentos', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: doc.id }),
    });
    if (r.ok) {
      setDocs(prev => prev.filter(d => d.id !== doc.id));
      showToast('Documento eliminado.');
    } else {
      showToast('Error al eliminar.', false);
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-lg transition-all
          ${toast.ok ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300' : 'bg-red-500/20 border border-red-500/40 text-red-300'}`}>
          {toast.msg}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Documentos</h1>
          <p className="text-sm text-white/40 mt-0.5">Gestión de documentos para asociados</p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Subir documento
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleUpload} className="mb-6 p-5 rounded-2xl bg-white/5 border border-white/10 space-y-4">
          <h2 className="text-sm font-semibold text-white/80">Nuevo documento</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-white/50 mb-1">Título *</label>
              <input
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                placeholder="Ej. Estado Financiero 2024"
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-violet-500/60"
              />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">Categoría *</label>
              <select
                value={form.category}
                onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-[#1a1530] border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500/60"
              >
                {CATEGORIES.filter(c => c.key !== 'all').map(c => (
                  <option key={c.key} value={c.key}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">Versión (opcional)</label>
              <input
                value={form.version}
                onChange={e => setForm(p => ({ ...p, version: e.target.value }))}
                placeholder="Ej. v1.0"
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-violet-500/60"
              />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">Archivo *</label>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white/70 text-sm file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-violet-600 file:text-white file:text-xs file:cursor-pointer focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-white/50 mb-1">Descripción (opcional)</label>
            <textarea
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              rows={2}
              placeholder="Descripción breve del documento..."
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-violet-500/60 resize-none"
            />
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => setForm(p => ({ ...p, allow_download: !p.allow_download }))}
              className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${form.allow_download ? 'bg-violet-600' : 'bg-white/10'}`}
            >
              <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${form.allow_download ? 'left-5' : 'left-1'}`} />
            </div>
            <span className="text-sm text-white/60">Permitir descarga</span>
          </label>

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={uploading}
              className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-medium transition-colors"
            >
              {uploading ? 'Subiendo...' : 'Subir documento'}
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

      {/* Category tabs */}
      <div className="flex gap-2 flex-wrap mb-5">
        {CATEGORIES.map(cat => {
          const count = cat.key === 'all' ? docs.length : docs.filter(d => d.category === cat.key).length;
          return (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeCategory === cat.key
                  ? 'bg-violet-600 text-white'
                  : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70'
              }`}
            >
              <span>{cat.icon}</span>
              {cat.label}
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${activeCategory === cat.key ? 'bg-white/20' : 'bg-white/10'}`}>{count}</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="text-center py-12 text-white/30 text-sm">Cargando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-white/30 text-sm">No hay documentos en esta categoría.</div>
      ) : (
        <div className="space-y-2">
          {filtered.map(doc => (
            <div key={doc.id} className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
              doc.status === 'active'
                ? 'bg-white/3 border-white/8 hover:border-white/15'
                : 'bg-white/1 border-white/4 opacity-50'
            }`}>
              <div className="text-2xl shrink-0">{CATEGORIES.find(c => c.key === doc.category)?.icon ?? '📄'}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-white truncate">{doc.title}</p>
                  {doc.version && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/20">{doc.version}</span>
                  )}
                  {!doc.allow_download && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/20">Solo lectura</span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-xs text-white/30">{CAT_LABEL[doc.category] ?? doc.category}</span>
                  <span className="text-white/20">·</span>
                  <span className="text-xs text-white/30">{formatDate(doc.date_created)}</span>
                  {doc.description && (
                    <>
                      <span className="text-white/20">·</span>
                      <span className="text-xs text-white/30 truncate max-w-[200px]">{doc.description}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => toggleStatus(doc)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                    doc.status === 'active'
                      ? 'border-amber-500/30 text-amber-400 hover:bg-amber-500/10'
                      : 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'
                  }`}
                >
                  {doc.status === 'active' ? 'Desactivar' : 'Activar'}
                </button>
                <button
                  onClick={() => deleteDoc(doc)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border border-red-500/30 text-red-400 hover:bg-red-500/10"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
