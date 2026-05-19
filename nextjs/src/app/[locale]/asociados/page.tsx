import { auth } from '@/auth';

export default async function AsociadosDashboard() {
  const session = await auth() as { user?: { name?: string; isAdmin?: boolean } } | null;
  const name = session?.user?.name?.split(' ')[0] ?? 'Asociado';
  const isAdmin = session?.user?.isAdmin === true;

  const cards = [
    {
      href: '/es/asociados/documentos',
      icon: '📄',
      title: 'Documentos',
      desc: 'Estados financieros, actas y reglamentos',
      color: 'from-violet-900/40 to-violet-900/10',
      border: 'border-violet-500/20',
    },
    {
      href: '/es/asociados/comunicados',
      icon: '📢',
      title: 'Comunicados',
      desc: 'Anuncios y noticias de la iglesia',
      color: 'from-blue-900/40 to-blue-900/10',
      border: 'border-blue-500/20',
    },
    {
      href: '/es/asociados/perfil',
      icon: '👤',
      title: 'Mi perfil',
      desc: 'Información personal y membresía',
      color: 'from-emerald-900/40 to-emerald-900/10',
      border: 'border-emerald-500/20',
    },
  ];

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-8">
        <p className="text-white/40 text-sm mb-1">Bienvenido</p>
        <h1 className="text-2xl font-display font-semibold text-white">{name} 👋</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cards.map(card => (
          <a
            key={card.href}
            href={card.href}
            className={`block p-5 rounded-2xl bg-gradient-to-br ${card.color} border ${card.border}
                        hover:scale-[1.02] transition-transform duration-150`}
          >
            <span className="text-3xl block mb-3">{card.icon}</span>
            <h2 className="font-semibold text-white text-sm mb-1">{card.title}</h2>
            <p className="text-xs text-white/40 leading-relaxed">{card.desc}</p>
          </a>
        ))}
      </div>

      {isAdmin && (
        <div className="mt-6">
          <p className="text-xs text-white/30 uppercase tracking-widest mb-3">Administración</p>
          <a
            href="/es/asociados/admin/solicitudes"
            className="flex items-center gap-4 p-5 rounded-2xl bg-gradient-to-br from-amber-900/30 to-amber-900/10 border border-amber-500/20 hover:scale-[1.02] transition-transform duration-150"
          >
            <svg className="w-8 h-8 text-amber-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
            </svg>
            <div>
              <h2 className="font-semibold text-amber-300 text-sm mb-1">Solicitudes de membresía</h2>
              <p className="text-xs text-white/40">Aprobar o rechazar solicitudes pendientes</p>
            </div>
          </a>
        </div>
      )}

      <div className="mt-8 p-4 rounded-2xl bg-white/3 border border-white/5">
        <p className="text-xs text-white/30 text-center">
          Iglesia Cristiana Lirio de los Valles — Portal exclusivo para asociados
        </p>
      </div>
    </div>
  );
}
