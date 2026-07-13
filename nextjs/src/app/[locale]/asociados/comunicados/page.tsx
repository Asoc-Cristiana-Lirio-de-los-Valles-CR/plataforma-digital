import { auth } from '@/auth';

const DIRECTUS_URL = process.env.DIRECTUS_URL ?? 'http://directus:8055';
const ADMIN_TOKEN = process.env.DIRECTUS_ADMIN_TOKEN!;

async function getAnnouncements() {
  try {
    const res = await fetch(
      `${DIRECTUS_URL}/items/announcements?filter[status][_eq]=published&filter[visibility][_in]=all,asociados&sort=-date_created&fields=id,title,body,priority,visibility,date_created&limit=50`,
      { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }, cache: 'no-store' }
    );
    return (await res.json())?.data ?? [];
  } catch {
    return [];
  }
}

const PRIORITY_BADGE: Record<string, string> = {
  normal: 'bg-white/10 text-white/50',
  high: 'bg-amber-900/40 text-amber-300',
  important: 'bg-amber-900/40 text-amber-300',
  urgent: 'bg-red-900/40 text-red-300',
};

const PRIORITY_LABELS: Record<string, string> = { normal: 'Normal', high: 'Importante', important: 'Importante', urgent: 'Urgente' };

export default async function ComunicadosPage() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const items = await getAnnouncements();

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-display font-semibold text-white">Comunicados</h1>
        <p className="text-sm sm:text-base text-white/40 mt-1">Anuncios y noticias de la iglesia</p>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-16 text-white/30">
          <svg className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 1 1 0-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 0 1-1.44-4.282m3.102.069a18.03 18.03 0 0 1-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 0 1 8.835 2.535M10.34 6.66a23.847 23.847 0 0 1 8.835-2.535m0 0A23.74 23.74 0 0 1 18.795 3m.38 1.125a23.91 23.91 0 0 1 1.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 0 0 1.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 0 1 0 3.46" />
          </svg>
          <p className="text-base">No hay comunicados por el momento</p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item: any) => (
            <article key={item.id} className="p-4 sm:p-5 rounded-2xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${PRIORITY_BADGE[item.priority] ?? PRIORITY_BADGE.normal}`}>
                  {PRIORITY_LABELS[item.priority] ?? item.priority}
                </span>
                {item.visibility === 'public' && (
                  <span className="text-xs text-white/25">Público</span>
                )}
              </div>
              <h2 className="font-semibold text-white text-base mb-2">{item.title}</h2>
              {item.body && (
                <div
                  className="text-sm text-white/60 leading-relaxed prose-sm prose-invert"
                  dangerouslySetInnerHTML={{ __html: item.body }}
                />
              )}
              <p className="text-xs text-white/25 mt-3">
                {new Date(item.date_created).toLocaleDateString('es-CR', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
