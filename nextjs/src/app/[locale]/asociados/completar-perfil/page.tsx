'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';

const inputClass = 'w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-[#b48af7]/60 text-sm transition-colors';
const labelClass = 'block text-xs text-white/50 mb-1 font-medium';

const TIPOS_ID = [
  { value: 'cedula_identidad', label: 'Cédula de Identidad' },
  { value: 'dimex', label: 'DIMEX' },
  { value: 'pasaporte', label: 'Pasaporte' },
];

export default function CompletarPerfilPage() {
  const [sessionUser, setSessionUser] = useState<{ name?: string | null; email?: string | null } | null>(null);
  const [form, setForm] = useState({
    nombre: '',
    tipo_identificacion: '',
    numero_identificacion: '',
    fecha_nacimiento: '',
    fecha_bautismo: '',
    telefono: '',
    ministerio: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetch('/api/auth/session').then(r => r.json()).then(s => {
      if (s?.user) setSessionUser(s.user);
    }).catch(() => {});
  }, []);

  const nombreValue = sessionUser?.name ?? form.nombre;
  const emailValue = sessionUser?.email ?? '';

  function update(field: string, val: string) {
    setForm(f => ({ ...f, [field]: val }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/asociados/completar-perfil', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          nombre: nombreValue,
          email: emailValue,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? 'Error al guardar. Intenta de nuevo.');
      } else {
        setDone(true);
      }
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    }
    setLoading(false);
  }

  if (done) {
    return (
      <div className="min-h-screen bg-[#0d0a19] flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 rounded-full bg-[#461a7a]/40 border border-[#b48af7]/30 flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-[#b48af7]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>
          <h2 className="text-xl font-display font-semibold text-white mb-2">Solicitud enviada</h2>
          <p className="text-white/50 text-sm mb-6">
            Tu solicitud fue recibida. Un administrador revisará tu información y te notificará por correo cuando sea aprobada.
          </p>
          <a href="/es/asociados/pendiente" className="text-sm text-[#b48af7] hover:underline">
            Ver estado de tu solicitud
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d0a19] flex items-center justify-center p-4">
      <div className="w-full max-w-sm py-8">
        <div className="text-center mb-6">
          <Image src="/logo.webp" alt="Lirio" width={48} height={48} className="mx-auto mb-3 opacity-90" />
          <h1 className="text-xl font-display font-semibold text-white">Completa tu perfil</h1>
          <p className="text-xs text-white/40 mt-1">Necesitamos algunos datos adicionales para procesar tu solicitud</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nombre — pre-rellenado desde Google */}
          <div>
            <label className={labelClass}>Nombre completo <span className="text-red-400">*</span></label>
            {nombreValue ? (
              <div className={`${inputClass} opacity-60 cursor-not-allowed`}>{nombreValue}</div>
            ) : (
              <input
                type="text"
                placeholder="Tu nombre completo"
                value={form.nombre}
                onChange={e => update('nombre', e.target.value)}
                required
                className={inputClass}
              />
            )}
          </div>

          {/* Email — solo lectura */}
          {emailValue && (
            <div>
              <label className={labelClass}>Correo electrónico</label>
              <div className={`${inputClass} opacity-60 cursor-not-allowed`}>{emailValue}</div>
            </div>
          )}

          {/* Tipo de identificación */}
          <div>
            <label className={labelClass}>Tipo de identificación <span className="text-red-400">*</span></label>
            <select
              value={form.tipo_identificacion}
              onChange={e => update('tipo_identificacion', e.target.value)}
              required
              className={`${inputClass} [color-scheme:dark]`}
              style={{ colorScheme: 'dark' }}
            >
              <option value="" style={{ background: '#1a1230', color: '#fff' }}>Selecciona un tipo</option>
              {TIPOS_ID.map(t => (
                <option key={t.value} value={t.value} style={{ background: '#1a1230', color: '#fff' }}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Número de identificación */}
          <div>
            <label className={labelClass}>Número de identificación <span className="text-red-400">*</span></label>
            <input
              type="text"
              placeholder="Ej: 1-2345-6789"
              value={form.numero_identificacion}
              onChange={e => update('numero_identificacion', e.target.value)}
              required
              className={inputClass}
            />
          </div>

          {/* Fecha de nacimiento */}
          <div>
            <label className={labelClass}>Fecha de nacimiento <span className="text-red-400">*</span></label>
            <input
              type="date"
              value={form.fecha_nacimiento}
              onChange={e => update('fecha_nacimiento', e.target.value)}
              required
              max={new Date(new Date().setFullYear(new Date().getFullYear() - 10)).toISOString().split('T')[0]}
              className={`${inputClass} [color-scheme:dark]`}
            />
          </div>

          {/* Teléfono */}
          <div>
            <label className={labelClass}>Teléfono <span className="text-red-400">*</span></label>
            <div className="flex gap-2">
              <div className={`${inputClass} w-24 shrink-0 opacity-60 cursor-not-allowed flex items-center`}>+506</div>
              <input
                type="tel"
                placeholder="8888-8888"
                value={form.telefono}
                onChange={e => update('telefono', e.target.value)}
                required
                className={`${inputClass} flex-1`}
              />
            </div>
          </div>

          {/* Fecha de bautismo */}
          <div>
            <label className={labelClass}>Fecha de bautismo <span className="text-white/30">(opcional)</span></label>
            <input
              type="date"
              value={form.fecha_bautismo}
              onChange={e => update('fecha_bautismo', e.target.value)}
              className={`${inputClass} [color-scheme:dark]`}
            />
          </div>

          {/* Ministerio */}
          <div>
            <label className={labelClass}>Ministerio <span className="text-white/30">(opcional)</span></label>
            <input
              type="text"
              placeholder="Ej: Alabanza, Jóvenes..."
              value={form.ministerio}
              onChange={e => update('ministerio', e.target.value)}
              className={inputClass}
            />
          </div>

          <p className="text-xs text-white/30 leading-relaxed">
            Tu solicitud será revisada por un administrador. El acceso se habilita una vez aprobado.
          </p>

          {error && <p className="text-xs text-red-400 text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-[#461a7a] hover:bg-[#5a239a] text-white font-semibold text-sm transition-colors disabled:opacity-50"
          >
            {loading ? 'Guardando...' : 'Enviar solicitud'}
          </button>
        </form>
      </div>
    </div>
  );
}
