'use client';
import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const params = useSearchParams();
  const isSuspended = params.get('error') === 'suspended';

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await signIn('credentials', { email, password, redirect: false });
    setLoading(false);
    if (res?.error) {
      setError('Correo o contraseña incorrectos.');
    } else {
      window.location.href = '/es/asociados';
    }
  }

  return (
    <div className="min-h-screen bg-[#0d0a19] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Image src="/logo.webp" alt="Lirio de los Valles" width={56} height={56} className="mx-auto mb-4 opacity-90" />
          <h1 className="text-2xl font-display font-semibold text-white">Portal de Asociados</h1>
          <p className="text-sm text-white/40 mt-1">Iglesia Cristiana Lirio de los Valles</p>
        </div>

        {isSuspended && (
          <div className="mb-4 p-3 rounded-xl bg-red-900/30 border border-red-500/30 text-sm text-red-300 text-center">
            Tu cuenta ha sido suspendida. Contacta al administrador.
          </div>
        )}

        <div className="space-y-3">
          {/* Google */}
          <button
            onClick={() => signIn('google', { callbackUrl: '/es/asociados' })}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl
                       bg-white text-gray-800 font-semibold text-sm
                       hover:bg-gray-100 transition-colors duration-150"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continuar con Google
          </button>

          <div className="flex items-center gap-3 my-2">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-xs text-white/30">o con email</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Email/Password */}
          <form onSubmit={handleCredentials} className="space-y-3">
            <input
              type="email"
              placeholder="Correo electrónico"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white
                         placeholder:text-white/30 focus:outline-none focus:border-[#b48af7]/60
                         text-sm transition-colors"
            />
            <input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white
                         placeholder:text-white/30 focus:outline-none focus:border-[#b48af7]/60
                         text-sm transition-colors"
            />
            {error && <p className="text-xs text-red-400 text-center">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-[#461a7a] hover:bg-[#5a239a] text-white
                         font-semibold text-sm transition-colors disabled:opacity-50"
            >
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>

          <p className="text-center text-xs text-white/30 pt-2">
            ¿No tienes acceso?{' '}
            <a href="/es/asociados/registro" className="text-[#b48af7] hover:underline">
              Solicitar acceso
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
