'use client';
import { signIn } from 'next-auth/react';
import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';

const GOOGLE_ICON = (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

const inputClass = 'w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-[#b48af7]/60 text-sm transition-colors';

function LoginForm({ onError, onSwitchToRegistro }: { onError: (msg: string) => void; onSwitchToRegistro: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showRegistroCta, setShowRegistroCta] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    onError('');
    setShowRegistroCta(false);
    const res = await signIn('credentials', { email, password, redirect: false });
    setLoading(false);
    if (res?.error) {
      onError('Correo o contraseña incorrectos.');
      setShowRegistroCta(true);
    } else {
      window.location.href = '/es/asociados';
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input type="email" placeholder="Correo electrónico" value={email} onChange={e => setEmail(e.target.value)} required className={inputClass} />
      <input type="password" placeholder="Contraseña" value={password} onChange={e => setPassword(e.target.value)} required className={inputClass} />
      <button type="submit" disabled={loading}
        className="w-full py-3 rounded-xl bg-[#461a7a] hover:bg-[#5a239a] text-white font-semibold text-sm transition-colors disabled:opacity-50">
        {loading ? 'Ingresando...' : 'Ingresar'}
      </button>
      {showRegistroCta && (
        <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
          <p className="text-xs text-white/50 mb-2">¿No tienes una cuenta aún?</p>
          <button
            type="button"
            onClick={onSwitchToRegistro}
            className="text-xs text-[#b48af7] hover:underline font-medium"
          >
            Solicitar acceso como asociado →
          </button>
        </div>
      )}
    </form>
  );
}

function RegistroForm({ onDone }: { onDone: () => void }) {
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', password: '', cedula: '', telefono: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
        onDone();
      }
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <input type="text" placeholder="Nombre" value={form.first_name} onChange={e => update('first_name', e.target.value)} required className={inputClass} />
        <input type="text" placeholder="Apellido" value={form.last_name} onChange={e => update('last_name', e.target.value)} required className={inputClass} />
      </div>
      <input type="email" placeholder="Correo electrónico" value={form.email} onChange={e => update('email', e.target.value)} required className={inputClass} />
      <input type="password" placeholder="Contraseña (mínimo 8 caracteres)" value={form.password} onChange={e => update('password', e.target.value)} required minLength={8} className={inputClass} />
      <input type="text" placeholder="Número de cédula" value={form.cedula} onChange={e => update('cedula', e.target.value)} required className={inputClass} />
      <input type="tel" placeholder="Teléfono (opcional)" value={form.telefono} onChange={e => update('telefono', e.target.value)} className={inputClass} />
      <p className="text-xs text-white/30 leading-relaxed">
        Tu solicitud será revisada manualmente. El acceso se habilita una vez aprobado.
      </p>
      {error && <p className="text-xs text-red-400 text-center">{error}</p>}
      <button type="submit" disabled={loading}
        className="w-full py-3 rounded-xl bg-[#461a7a] hover:bg-[#5a239a] text-white font-semibold text-sm transition-colors disabled:opacity-50">
        {loading ? 'Enviando solicitud...' : 'Enviar solicitud'}
      </button>
    </form>
  );
}

function PortalContent() {
  const params = useSearchParams();
  const [tab, setTab] = useState<'login' | 'registro'>(
    params.get('tab') === 'registro' ? 'registro' : 'login'
  );
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const isSuspended = params.get('error') === 'suspended';

  if (done) {
    return (
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-[#461a7a]/40 border border-[#b48af7]/30 flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-[#b48af7]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
        </div>
        <h2 className="text-xl font-display font-semibold text-white mb-2">Solicitud enviada</h2>
        <p className="text-white/50 text-sm mb-6">
          Tu solicitud fue recibida. Un administrador revisará tu información y te notificará por correo cuando sea aprobada.
        </p>
        <button onClick={() => { setDone(false); setTab('login'); }} className="text-sm text-[#b48af7] hover:underline">
          Volver al inicio de sesión
        </button>
      </div>
    );
  }

  return (
    <>
      {isSuspended && (
        <div className="mb-4 p-3 rounded-xl bg-red-900/30 border border-red-500/30 text-sm text-red-300 text-center">
          Tu cuenta ha sido suspendida. Contacta al administrador.
        </div>
      )}

      {/* Tab switcher */}
      <div className="flex rounded-xl bg-white/5 border border-white/10 p-1 mb-5">
        <button
          onClick={() => { setTab('login'); setError(''); }}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
            tab === 'login'
              ? 'bg-[#461a7a] text-white'
              : 'text-white/40 hover:text-white/70'
          }`}
        >
          Ingresar
        </button>
        <button
          onClick={() => { setTab('registro'); setError(''); }}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
            tab === 'registro'
              ? 'bg-[#461a7a] text-white'
              : 'text-white/40 hover:text-white/70'
          }`}
        >
          Solicitar acceso
        </button>
      </div>

      {/* Google — funciona para login y registro */}
      <button
        onClick={() => signIn('google', { callbackUrl: '/es/asociados' })}
        className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl
                   bg-white text-gray-800 font-semibold text-sm
                   hover:bg-gray-100 transition-colors duration-150 mb-4"
      >
        {GOOGLE_ICON}
        {tab === 'login' ? 'Continuar con Google' : 'Registrarse con Google'}
      </button>

      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 h-px bg-white/10" />
        <span className="text-xs text-white/30">o con email</span>
        <div className="flex-1 h-px bg-white/10" />
      </div>

      {error && <p className="text-xs text-red-400 text-center mb-3">{error}</p>}

      {tab === 'login'
        ? <LoginForm onError={setError} onSwitchToRegistro={() => { setTab('registro'); setError(''); }} />
        : <RegistroForm onDone={() => setDone(true)} />
      }
    </>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#0d0a19] flex items-center justify-center p-4">
      <div className="w-full max-w-sm -mt-16">
        <div className="text-center mb-6">
          <Image src="/logo.webp" alt="Lirio de los Valles" width={56} height={56} className="mx-auto mb-4 opacity-90" />
          <h1 className="text-2xl font-display font-semibold text-white">Portal de Asociados</h1>
          <p className="text-sm text-white/40 mt-1">Iglesia Cristiana Lirio de los Valles</p>
        </div>
        <Suspense fallback={null}>
          <PortalContent />
        </Suspense>
      </div>
    </div>
  );
}
