'use client';
import { useState } from 'react';
import Image from 'next/image';
import { signIn } from 'next-auth/react';

export default function RegistroPage() {
  const [step, setStep] = useState<'form' | 'done'>('form');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', password: '',
    cedula: '', telefono: '',
  });

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
        setStep('done');
      }
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    }
    setLoading(false);
  }

  if (step === 'done') {
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
          <a href="/es/asociados/login" className="text-sm text-[#b48af7] hover:underline">
            Volver al inicio de sesión
          </a>
        </div>
      </div>
    );
  }

  const inputClass = 'w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-[#b48af7]/60 text-sm';

  return (
    <div className="min-h-screen bg-[#0d0a19] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <Image src="/logo.webp" alt="Lirio" width={48} height={48} className="mx-auto mb-3 opacity-90" />
          <h1 className="text-xl font-display font-semibold text-white">Solicitar acceso</h1>
          <p className="text-xs text-white/40 mt-1">Tu solicitud será revisada manualmente</p>
        </div>

        {/* Google */}
        <button
          type="button"
          onClick={() => signIn('google', { callbackUrl: '/es/asociados' })}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl
                     bg-white text-gray-800 font-semibold text-sm
                     hover:bg-gray-100 transition-colors duration-150 mb-3"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continuar con Google
        </button>

        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-xs text-white/30">o con email y contraseña</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input type="text" placeholder="Nombre" value={form.first_name} onChange={e => update('first_name', e.target.value)} required className={inputClass} />
            <input type="text" placeholder="Apellido" value={form.last_name} onChange={e => update('last_name', e.target.value)} required className={inputClass} />
          </div>
          <input type="email" placeholder="Correo electrónico" value={form.email} onChange={e => update('email', e.target.value)} required className={inputClass} />
          <input type="password" placeholder="Contraseña (mínimo 8 caracteres)" value={form.password} onChange={e => update('password', e.target.value)} required minLength={8} className={inputClass} />
          <input type="text" placeholder="Número de cédula" value={form.cedula} onChange={e => update('cedula', e.target.value)} required className={inputClass} />
          <input type="tel" placeholder="Teléfono" value={form.telefono} onChange={e => update('telefono', e.target.value)} className={inputClass} />

          <p className="text-xs text-white/30 leading-relaxed">
            Al registrarte aceptas que tus datos sean usados para verificar tu membresía. El acceso será habilitado una vez aprobado.
          </p>

          {error && <p className="text-xs text-red-400 text-center">{error}</p>}

          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-xl bg-[#461a7a] hover:bg-[#5a239a] text-white font-semibold text-sm transition-colors disabled:opacity-50">
            {loading ? 'Enviando solicitud...' : 'Enviar solicitud'}
          </button>

          <p className="text-center text-xs text-white/30">
            ¿Ya tienes acceso?{' '}
            <a href="/es/asociados/login" className="text-[#b48af7] hover:underline">Ingresar</a>
          </p>
        </form>
      </div>
    </div>
  );
}
