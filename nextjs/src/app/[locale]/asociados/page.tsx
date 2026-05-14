import { auth } from '@/auth';

export default async function AsociadosDashboard() {
  const session = await auth();
  const name = session?.user?.name?.split(' ')[0] ?? 'Asociado';

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

      <div className="mt-8 p-4 rounded-2xl bg-white/3 border border-white/5">
        <p className="text-xs text-white/30 text-center">
          Iglesia Cristiana Lirio de los Valles — Portal exclusivo para asociados
        </p>
      </div>
    </div>
  );
}
