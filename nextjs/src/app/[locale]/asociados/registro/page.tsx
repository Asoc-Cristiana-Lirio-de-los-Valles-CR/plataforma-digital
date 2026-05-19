'use client';
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';

const inputClass = 'w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-[#b48af7]/60 text-sm transition-colors';
const labelClass = 'block text-xs text-white/50 mb-1 font-medium';

const TIPOS_ID = [
  { value: 'cedula_identidad', label: 'Cédula de Identidad' },
  { value: 'dimex', label: 'DIMEX' },
  { value: 'pasaporte', label: 'Pasaporte' },
];

const GOOGLE_ICON = (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

export default function RegistroPage() {
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
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

  function update(field: string, val: string) {
    setForm(f => ({ ...f, [field]: val }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/asociados/registro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? 'Error al registrar. Intenta de nuevo.');
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
          <Link href="/es/asociados/login" className="text-sm text-[#b48af7] hover:underline">
            Ir al inicio de sesión
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d0a19] flex items-center justify-center p-4">
      <div className="w-full max-w-sm py-8">
        <div className="text-center mb-6">
          <Image src="/logo.webp" alt="Lirio" width={48} height={48} className="mx-auto mb-3 opacity-90" />
          <h1 className="text-xl font-display font-semibold text-white">Registro de Miembro</h1>
          <p className="text-xs text-white/40 mt-1">Iglesia Cristiana Lirio de los Valles</p>
        </div>

        {/* Google sign-up */}
        <button
          onClick={() => signIn('google', { callbackUrl: '/es/asociados' })}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl
                     bg-white text-gray-800 font-semibold text-sm
                     hover:bg-gray-100 transition-colors duration-150 mb-4"
        >
          {GOOGLE_ICON}
          Registrarse con Google
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-xs text-white/30">o con email</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nombre y apellido */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Nombre <span className="text-red-400">*</span></label>
              <input type="text" placeholder="Juan" value={form.first_name}
                onChange={e => update('first_name', e.target.value)} required className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Apellido <span className="text-red-400">*</span></label>
              <input type="text" placeholder="Pérez" value={form.last_name}
                onChange={e => update('last_name', e.target.value)} required className={inputClass} />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className={labelClass}>Correo electrónico <span className="text-red-400">*</span></label>
            <input type="email" placeholder="correo@ejemplo.com" value={form.email}
              onChange={e => update('email', e.target.value)} required className={inputClass} />
          </div>

          {/* Password */}
          <div>
            <label className={labelClass}>Contraseña <span className="text-red-400">*</span></label>
            <input type="password" placeholder="Mínimo 8 caracteres" value={form.password}
              onChange={e => update('password', e.target.value)} required minLength={8} className={inputClass} />
          </div>

          {/* Tipo de identificación */}
          <div>
            <label className={labelClass}>Tipo de identificación <span className="text-red-400">*</span></label>
            <select value={form.tipo_identificacion} onChange={e => update('tipo_identificacion', e.target.value)}
              required className={`${inputClass} [color-scheme:dark]`} style={{ colorScheme: 'dark' }}>
              <option value="" style={{ background: '#1a1230', color: '#fff' }}>Selecciona un tipo</option>
              {TIPOS_ID.map(t => (
                <option key={t.value} value={t.value} style={{ background: '#1a1230', color: '#fff' }}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Número de identificación */}
          <div>
            <label className={labelClass}>Número de identificación <span className="text-red-400">*</span></label>
            <input type="text" placeholder="Ej: 1-2345-6789" value={form.numero_identificacion}
              onChange={e => update('numero_identificacion', e.target.value)} required className={inputClass} />
          </div>

          {/* Fecha de nacimiento */}
          <div>
            <label className={labelClass}>Fecha de nacimiento <span className="text-red-400">*</span></label>
            <input type="date" value={form.fecha_nacimiento}
              onChange={e => update('fecha_nacimiento', e.target.value)} required
              max={new Date(new Date().setFullYear(new Date().getFullYear() - 10)).toISOString().split('T')[0]}
              className={`${inputClass} [color-scheme:dark]`} />
          </div>

          {/* Teléfono */}
          <div>
            <label className={labelClass}>Teléfono <span className="text-red-400">*</span></label>
            <div className="flex gap-2">
              <div className="w-16 shrink-0 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white/60 text-sm flex items-center">+506</div>
              <input type="tel" placeholder="8888-8888" value={form.telefono}
                onChange={e => update('telefono', e.target.value)} required
                className="flex-1 min-w-0 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-[#b48af7]/60 text-sm transition-colors" />
            </div>
          </div>

          {/* Fecha de bautismo (opcional) */}
          <div>
            <label className={labelClass}>Fecha de bautismo <span className="text-white/30">(opcional)</span></label>
            <input type="date" value={form.fecha_bautismo}
              onChange={e => update('fecha_bautismo', e.target.value)}
              className={`${inputClass} [color-scheme:dark]`} />
          </div>

          {/* Ministerio (opcional) */}
          <div>
            <label className={labelClass}>Ministerio <span className="text-white/30">(opcional)</span></label>
            <input type="text" placeholder="Ej: Alabanza, Jóvenes..." value={form.ministerio}
              onChange={e => update('ministerio', e.target.value)} className={inputClass} />
          </div>

          <p className="text-xs text-white/30 leading-relaxed">
            Tu solicitud será revisada por un administrador. El acceso se habilita una vez aprobado.
          </p>

          {error && <p className="text-xs text-red-400 text-center">{error}</p>}

          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-xl bg-[#461a7a] hover:bg-[#5a239a] text-white font-semibold text-sm transition-colors disabled:opacity-50">
            {loading ? 'Enviando solicitud...' : 'Enviar solicitud'}
          </button>

          <p className="text-center text-xs text-white/30">
            ¿Ya tienes cuenta?{' '}
            <Link href="/es/asociados/login" className="text-[#b48af7] hover:underline">
              Iniciar sesión
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
