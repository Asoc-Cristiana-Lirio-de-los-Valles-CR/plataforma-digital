'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useSession } from 'next-auth/react';

export default function RegistroPage() {
  const { data: session } = useSession();
  const [step, setStep] = useState<'form' | 'done'>('form');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', password: '',
    cedula: '', telefono: '',
  });

  // Pre-fill from Google session if available
  const isGoogleUser = !!session?.user?.email;
  useEffect(() => {
    if (session?.user) {
      const [first, ...rest] = (session.user.name ?? '').split(' ');
      setForm(f => ({
        ...f,
        first_name: first ?? f.first_name,
        last_name: rest.join(' ') || f.last_name,
        email: session.user.email ?? f.email,
      }));
    }
  }, [session]);

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
        body: JSON.stringify({ ...form, isGoogleUser }),
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

  const inputClass = 'w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-[#b48af7]/60 text-sm';
  const readonlyClass = 'w-full px-3 py-2.5 rounded-xl bg-white/3 border border-white/6 text-white/50 text-sm cursor-default';

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

  return (
    <div className="min-h-screen bg-[#0d0a19] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <Image src="/logo.webp" alt="Lirio" width={48} height={48} className="mx-auto mb-3 opacity-90" />
          <h1 className="text-xl font-display font-semibold text-white">Solicitar acceso</h1>
          <p className="text-xs text-white/40 mt-1">Tu solicitud será revisada manualmente</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {isGoogleUser ? (
              <>
                <div className={readonlyClass}>{form.first_name || 'Nombre'}</div>
                <div className={readonlyClass}>{form.last_name || 'Apellido'}</div>
              </>
            ) : (
              <>
                <input type="text" placeholder="Nombre" value={form.first_name} onChange={e => update('first_name', e.target.value)} required className={inputClass} />
                <input type="text" placeholder="Apellido" value={form.last_name} onChange={e => update('last_name', e.target.value)} required className={inputClass} />
              </>
            )}
          </div>

          {isGoogleUser ? (
            <div className={readonlyClass}>{form.email}</div>
          ) : (
            <input type="email" placeholder="Correo electrónico" value={form.email} onChange={e => update('email', e.target.value)} required className={inputClass} />
          )}

          {!isGoogleUser && (
            <input type="password" placeholder="Contraseña (mínimo 8 caracteres)" value={form.password} onChange={e => update('password', e.target.value)} required minLength={8} className={inputClass} />
          )}

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
