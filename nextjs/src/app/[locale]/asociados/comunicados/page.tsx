import { auth } from '@/auth';

const DIRECTUS_URL = process.env.DIRECTUS_URL ?? 'http://directus:8055';

async function getAnnouncements(token: string) {
  try {
    const res = await fetch(
      `${DIRECTUS_URL}/items/announcements?filter[status][_eq]=published&filter[visibility][_in]=public,asociados&sort=-date_created&fields=id,title,body,priority,visibility,date_created`,
      { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }
    );
    return (await res.json())?.data ?? [];
  } catch {
    return [];
  }
}

const PRIORITY_BADGE: Record<string, string> = {
  normal: 'bg-white/10 text-white/50',
  important: 'bg-amber-900/40 text-amber-300',
  urgent: 'bg-red-900/40 text-red-300',
};

const PRIORITY_LABELS: Record<string, string> = { normal: 'Normal', important: 'Importante', urgent: 'Urgente' };

export default async function ComunicadosPage() {
  const session = await auth();
  const token = session?.user?.directusToken;
  const items = token ? await getAnnouncements(token) : [];

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-display font-semibold text-white">Comunicados</h1>
        <p className="text-sm text-white/40 mt-1">Anuncios y noticias de la iglesia</p>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-16 text-white/30">
          <span className="text-4xl block mb-3">📢</span>
          <p className="text-sm">No hay comunicados por el momento</p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item: any) => (
            <article key={item.id} className="p-5 rounded-2xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${PRIORITY_BADGE[item.priority] ?? PRIORITY_BADGE.normal}`}>
                  {PRIORITY_LABELS[item.priority] ?? item.priority}
                </span>
                {item.visibility === 'public' && (
                  <span className="text-[10px] text-white/25">Público</span>
                )}
              </div>
              <h2 className="font-semibold text-white text-sm mb-2">{item.title}</h2>
              {item.body && (
                <div
                  className="text-sm text-white/60 leading-relaxed prose-sm prose-invert"
                  dangerouslySetInnerHTML={{ __html: item.body }}
                />
              )}
              <p className="text-[10px] text-white/25 mt-3">
                {new Date(item.date_created).toLocaleDateString('es-CR', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
