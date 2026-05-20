import { auth } from '@/auth';

function formatDate() {
  return new Date().toLocaleDateString('es-CR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

const CARDS = [
  {
    href: '/es/asociados/documentos',
    title: 'Documentos',
    desc: 'Estados financieros, actas y reglamentos',
    accent: 'border-violet-500/25 hover:border-violet-500/50',
    iconBg: 'bg-violet-500/10',
    iconColor: 'text-violet-400',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
      </svg>
    ),
  },
  {
    href: '/es/asociados/comunicados',
    title: 'Comunicados',
    desc: 'Anuncios y noticias de la asociación',
    accent: 'border-sky-500/25 hover:border-sky-500/50',
    iconBg: 'bg-sky-500/10',
    iconColor: 'text-sky-400',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 1 1 0-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 0 1-1.44-4.282m3.102.069a18.03 18.03 0 0 1-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 0 1 8.835 2.535M10.34 6.66a23.847 23.847 0 0 1 8.835-2.535m0 0A23.74 23.74 0 0 1 18.795 3m.38 1.125a23.91 23.91 0 0 1 1.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 0 0 1.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 0 1 0 3.46" />
      </svg>
    ),
  },
  {
    href: '/es/asociados/perfil',
    title: 'Mi Perfil',
    desc: 'Información personal y membresía',
    accent: 'border-emerald-500/25 hover:border-emerald-500/50',
    iconBg: 'bg-emerald-500/10',
    iconColor: 'text-emerald-400',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
      </svg>
    ),
  },
];

export default async function AsociadosDashboard() {
  const session = await auth() as { user?: { name?: string; isAdmin?: boolean } } | null;
  const name = session?.user?.name?.split(' ')[0] ?? 'Asociado';
  const isAdmin = session?.user?.isAdmin === true;
  const dateStr = formatDate();

  return (
    <div className="p-6 max-w-2xl mx-auto">

      {/* Header */}
      <div className="mb-8 pb-6 border-b border-white/8">
        <p className="text-[11px] text-white/30 uppercase tracking-[0.15em] mb-3">{dateStr}</p>
        <h1 className="text-2xl font-display font-semibold text-white leading-tight">
          Bienvenido, {name}
        </h1>
        <p className="text-sm text-white/40 mt-1.5">
          Portal exclusivo para asociados de la Asociación Cristiana Lirio de los Valles
        </p>
      </div>

      {/* Nav cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        {CARDS.map(card => (
          <a
            key={card.href}
            href={card.href}
            className={`group flex flex-col gap-4 p-5 rounded-xl bg-white/[0.03] border ${card.accent}
                        transition-all duration-200 hover:bg-white/[0.05]`}
          >
            <div className={`w-9 h-9 rounded-lg ${card.iconBg} ${card.iconColor} flex items-center justify-center`}>
              {card.icon}
            </div>
            <div>
              <h2 className="font-medium text-white text-sm mb-0.5">{card.title}</h2>
              <p className="text-xs text-white/35 leading-relaxed">{card.desc}</p>
            </div>
          </a>
        ))}
      </div>

      {/* Admin section */}
      {isAdmin && (
        <div className="mt-6">
          <p className="text-[10px] text-white/20 uppercase tracking-[0.15em] mb-3">Administración</p>
          <a
            href="/es/asociados/admin/solicitudes"
            className="flex items-center gap-4 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20
                       hover:bg-amber-500/10 hover:border-amber-500/35 transition-all duration-200"
          >
            <div className="w-9 h-9 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
              </svg>
            </div>
            <div>
              <h2 className="font-medium text-amber-300 text-sm mb-0.5">Solicitudes de membresía</h2>
              <p className="text-xs text-white/35">Revisar y aprobar solicitudes pendientes</p>
            </div>
            <svg className="w-4 h-4 text-amber-500/40 ml-auto shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </a>
        </div>
      )}

    </div>
  );
}
