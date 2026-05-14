import Image from 'next/image';

export default function PendientePage() {
  return (
    <div className="min-h-screen bg-[#0d0a19] flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center">
        <div className="w-20 h-20 rounded-full bg-amber-900/30 border border-amber-500/30 flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-amber-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
        </div>

        <Image src="/logo.webp" alt="Lirio" width={40} height={40} className="mx-auto mb-4 opacity-60" />

        <h1 className="text-xl font-display font-semibold text-white mb-3">Solicitud en revisión</h1>
        <p className="text-white/50 text-sm leading-relaxed mb-6">
          Tu solicitud de acceso fue recibida y está siendo revisada por el equipo de administración.
          Recibirás una notificación por correo cuando sea aprobada.
        </p>

        <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-left mb-6">
          <p className="text-xs text-white/40 font-semibold uppercase tracking-wider mb-2">¿Qué sigue?</p>
          <ul className="space-y-2 text-sm text-white/60">
            <li className="flex items-start gap-2">
              <span className="text-amber-400 mt-0.5">1.</span>
              Un administrador revisará tu información
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-400 mt-0.5">2.</span>
              Recibirás un correo de confirmación
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-400 mt-0.5">3.</span>
              Podrás acceder al portal con tus credenciales
            </li>
          </ul>
        </div>

        <a href="/" className="text-sm text-[#b48af7] hover:underline">
          Volver al sitio principal
        </a>
      </div>
    </div>
  );
}
