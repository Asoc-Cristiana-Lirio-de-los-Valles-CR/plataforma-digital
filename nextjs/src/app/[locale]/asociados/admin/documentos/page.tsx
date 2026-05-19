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

interface Category {
  id: number;
  key: string;
  label: string;
  icon: string | null;
  status: 'active' | 'archived';
}

function formatDate(s: string) {
  return new Date(s).toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function AdminDocumentosPage() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showCatModal, setShowCatModal] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({ title: '', description: '', category: '', allow_download: true, version: '' });

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const loadCategories = useCallback(async () => {
    try {
      const r = await fetch('/api/asociados/admin/categorias');
      const { data } = await r.json();
      const active = (data ?? []).filter((c: Category) => c.status === 'active');
      setCategories(active);
      if (!form.category && active.length > 0) {
        setForm(p => ({ ...p, category: active[0].key }));
      }
    } catch { /* silent */ }
  }, [form.category]);

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

  useEffect(() => {
    load();
    loadCategories();
  }, [load, loadCategories]);

  const catMap = Object.fromEntries(categories.map(c => [c.key, c]));
  const allCategories = [{ id: 0, key: 'all', label: 'Todos', icon: '📁', status: 'active' as const }, ...categories];
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
      setForm({ title: '', description: '', category: categories[0]?.key ?? '', allow_download: true, version: '' });
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

      {showCatModal && (
        <CategoriasModal
          onClose={() => { setShowCatModal(false); loadCategories(); }}
          showToast={showToast}
        />
      )}

      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-white">Documentos</h1>
          <p className="text-sm text-white/40 mt-0.5">Gestión de documentos para asociados</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCatModal(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white text-sm font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Categorías
          </button>
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
                {categories.map(c => (
                  <option key={c.key} value={c.key}>{c.icon ? `${c.icon} ` : ''}{c.label}</option>
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
            <button type="submit" disabled={uploading}
              className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-medium transition-colors">
              {uploading ? 'Subiendo...' : 'Subir documento'}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="px-5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 text-sm transition-colors">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Category tabs */}
      <div className="flex gap-2 flex-wrap mb-5">
        {allCategories.map(cat => {
          const count = cat.key === 'all' ? docs.length : docs.filter(d => d.category === cat.key).length;
          return (
            <button key={cat.key} onClick={() => setActiveCategory(cat.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeCategory === cat.key ? 'bg-violet-600 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70'
              }`}>
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
              doc.status === 'active' ? 'bg-white/3 border-white/8 hover:border-white/15' : 'bg-white/1 border-white/4 opacity-50'
            }`}>
              <div className="text-2xl shrink-0">{catMap[doc.category]?.icon ?? '📄'}</div>
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
                  <span className="text-xs text-white/30">{catMap[doc.category]?.label ?? doc.category}</span>
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
                <button onClick={() => toggleStatus(doc)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                    doc.status === 'active'
                      ? 'border-amber-500/30 text-amber-400 hover:bg-amber-500/10'
                      : 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'
                  }`}>
                  {doc.status === 'active' ? 'Desactivar' : 'Activar'}
                </button>
                <button onClick={() => deleteDoc(doc)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border border-red-500/30 text-red-400 hover:bg-red-500/10">
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

// ─── Emoji picker ─────────────────────────────────────────────────────────────

const EMOJI_GROUPS = [
  { label: 'Documentos', emojis: ['📄','📃','📋','📊','📈','📉','📑','📝','🗒️','🗃️','🗂️','📂','📁','🗄️'] },
  { label: 'Finanzas', emojis: ['💰','💵','💴','💶','💷','💳','🏦','💹','🪙','💸','🤑','📦'] },
  { label: 'Legal / Normas', emojis: ['⚖️','📜','🏛️','🔏','🔒','🛡️','✅','❌','⚠️','🔖','🏷️'] },
  { label: 'Iglesia', emojis: ['✝️','🕊️','📖','🙏','⛪','🌿','🌸','🌟','💒','🎶','🎵','🕯️'] },
  { label: 'Misc', emojis: ['📢','📣','🔔','💡','🗓️','📅','📌','📍','🔑','🏠','👥','🤝','✉️','📧'] },
];

function EmojiPicker({ value, onChange }: { value: string; onChange: (e: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full h-9 flex items-center justify-center rounded-lg bg-white/5 border border-white/10 hover:border-violet-500/40 text-xl transition-colors"
        title="Seleccionar icono"
      >
        {value || <span className="text-white/20 text-xs">+</span>}
      </button>
      {open && (
        <div className="absolute left-0 top-10 z-50 w-72 bg-[#1a1530] border border-white/15 rounded-xl shadow-2xl p-3 max-h-64 overflow-y-auto">
          {EMOJI_GROUPS.map(g => (
            <div key={g.label} className="mb-3">
              <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5">{g.label}</p>
              <div className="flex flex-wrap gap-1">
                {g.emojis.map(em => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => { onChange(em); setOpen(false); }}
                    className={`w-8 h-8 rounded-lg text-lg flex items-center justify-center transition-colors hover:bg-violet-500/20 ${value === em ? 'bg-violet-500/30 ring-1 ring-violet-500/50' : ''}`}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Modal de gestión de categorías ───────────────────────────────────────────

interface CategoriasModalProps {
  onClose: () => void;
  showToast: (msg: string, ok?: boolean) => void;
}

function CategoriasModal({ onClose, showToast }: CategoriasModalProps) {
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | 'new' | null>(null);
  const [editing, setEditing] = useState<Record<number, { label: string; icon: string }>>({});
  const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState({ key: '', label: '', icon: '' });

  useEffect(() => {
    fetch('/api/asociados/admin/categorias')
      .then(r => r.json())
      .then(({ data }) => { setCats(data ?? []); setLoading(false); });
  }, []);

  function startEdit(cat: Category) {
    setEditing(p => ({ ...p, [cat.id]: { label: cat.label, icon: cat.icon ?? '' } }));
  }

  async function saveEdit(cat: Category) {
    const ed = editing[cat.id];
    if (!ed) return;
    setSaving(cat.id);
    try {
      const r = await fetch('/api/asociados/admin/categorias', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: cat.id, label: ed.label, icon: ed.icon }),
      });
      const data = await r.json();
      if (!r.ok) { showToast(data.error ?? 'Error al guardar.', false); return; }
      setCats(prev => prev.map(c => c.id === cat.id ? { ...c, label: ed.label, icon: ed.icon || null } : c));
      setEditing(p => { const n = { ...p }; delete n[cat.id]; return n; });
      showToast('Categoría actualizada.');
    } finally {
      setSaving(null);
    }
  }

  async function archivecat(cat: Category) {
    if (!confirm(`¿Archivar "${cat.label}"? No podrá usarse para nuevos documentos.`)) return;
    setSaving(cat.id);
    try {
      const r = await fetch('/api/asociados/admin/categorias', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: cat.id, status: 'archived' }),
      });
      const data = await r.json();
      if (!r.ok) { showToast(data.error ?? 'Error al archivar.', false); return; }
      setCats(prev => prev.filter(c => c.id !== cat.id));
      showToast('Categoría archivada.');
    } finally {
      setSaving(null);
    }
  }

  async function createCat() {
    if (!newForm.key.trim() || !newForm.label.trim()) {
      showToast('Clave y nombre son requeridos.', false); return;
    }
    setSaving('new');
    try {
      const r = await fetch('/api/asociados/admin/categorias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newForm),
      });
      const data = await r.json();
      if (!r.ok) { showToast(data.error ?? 'Error al crear.', false); return; }
      setCats(prev => [...prev, data.data]);
      setNewForm({ key: '', label: '', icon: '' });
      setShowNew(false);
      showToast('Categoría creada.');
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-[#13102a] border border-white/10 rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 className="text-base font-semibold text-white">Gestionar categorías</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 max-h-[60vh] overflow-y-auto space-y-2">
          {loading ? (
            <p className="text-center text-white/30 text-sm py-6">Cargando...</p>
          ) : cats.filter(c => c.status === 'active').length === 0 ? (
            <p className="text-center text-white/30 text-sm py-6">No hay categorías activas.</p>
          ) : (
            cats.filter(c => c.status === 'active').map(cat => {
              const isEditing = !!editing[cat.id];
              const ed = editing[cat.id];
              return (
                <div key={cat.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/3 border border-white/8">
                  {isEditing ? (
                    <>
                      <div className="w-12 shrink-0">
                        <EmojiPicker value={ed.icon} onChange={v => setEditing(p => ({ ...p, [cat.id]: { ...p[cat.id], icon: v } }))} />
                      </div>
                      <input
                        value={ed.label}
                        onChange={e => setEditing(p => ({ ...p, [cat.id]: { ...p[cat.id], label: e.target.value } }))}
                        className="flex-1 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500/60"
                      />
                      <button
                        onClick={() => saveEdit(cat)}
                        disabled={saving === cat.id}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-violet-600 hover:bg-violet-500 text-white transition-colors disabled:opacity-50"
                      >
                        {saving === cat.id ? '...' : 'Guardar'}
                      </button>
                      <button
                        onClick={() => setEditing(p => { const n = { ...p }; delete n[cat.id]; return n; })}
                        className="px-2 py-1.5 rounded-lg text-xs text-white/40 hover:text-white transition-colors"
                      >
                        ✕
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="text-xl w-8 text-center">{cat.icon ?? '📄'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white">{cat.label}</p>
                        <p className="text-xs text-white/30">{cat.key}</p>
                      </div>
                      <button
                        onClick={() => startEdit(cat)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium border border-white/10 text-white/50 hover:text-white hover:bg-white/5 transition-colors"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => archivecat(cat)}
                        disabled={saving === cat.id}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium border border-red-500/20 text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                      >
                        {saving === cat.id ? '...' : 'Archivar'}
                      </button>
                    </>
                  )}
                </div>
              );
            })
          )}

          {/* Nueva categoría */}
          {showNew ? (
            <div className="p-3 rounded-xl bg-violet-500/10 border border-violet-500/20 space-y-3 mt-2">
              <p className="text-xs font-medium text-violet-300">Nueva categoría</p>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs text-white/40 mb-1">Icono</label>
                  <EmojiPicker value={newForm.icon} onChange={v => setNewForm(p => ({ ...p, icon: v }))} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-white/40 mb-1">Nombre *</label>
                  <input
                    value={newForm.label}
                    onChange={e => setNewForm(p => ({ ...p, label: e.target.value }))}
                    placeholder="Ej. Presupuestos"
                    className="w-full px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500/60"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-white/40 mb-1">Clave interna * <span className="text-white/20">(solo letras, números, guiones bajos)</span></label>
                <input
                  value={newForm.key}
                  onChange={e => setNewForm(p => ({ ...p, key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') }))}
                  placeholder="Ej. presupuestos"
                  className="w-full px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm font-mono focus:outline-none focus:border-violet-500/60"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={createCat}
                  disabled={saving === 'new'}
                  className="px-4 py-1.5 rounded-lg text-xs font-medium bg-violet-600 hover:bg-violet-500 text-white transition-colors disabled:opacity-50"
                >
                  {saving === 'new' ? 'Creando...' : 'Crear categoría'}
                </button>
                <button
                  onClick={() => { setShowNew(false); setNewForm({ key: '', label: '', icon: '' }); }}
                  className="px-4 py-1.5 rounded-lg text-xs text-white/40 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowNew(true)}
              className="w-full mt-2 py-2.5 rounded-xl border border-dashed border-white/15 text-white/40 hover:text-white/60 hover:border-white/25 text-sm transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nueva categoría
            </button>
          )}
        </div>

        <div className="px-6 py-4 border-t border-white/10">
          <button onClick={onClose} className="w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 text-sm transition-colors">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
