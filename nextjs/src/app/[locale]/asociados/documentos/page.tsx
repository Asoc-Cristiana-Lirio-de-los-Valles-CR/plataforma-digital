import { auth } from '@/auth';

const DIRECTUS_URL = process.env.DIRECTUS_URL ?? 'http://directus:8055';

async function getDocuments(token: string) {
  try {
    const res = await fetch(
      `${DIRECTUS_URL}/items/asociados_documents?filter[status][_eq]=active&sort=-date_created&fields=id,title,description,category,allow_download,requires_ack,version,date_created`,
      { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }
    );
    const data = await res.json();
    return data?.data ?? [];
  } catch {
    return [];
  }
}

const CATEGORY_LABELS: Record<string, string> = {
  financial_report: 'Estado Financiero',
  minutes: 'Acta',
  announcement: 'Comunicado',
  regulation: 'Reglamento',
  other: 'Otro',
};

const CATEGORY_COLORS: Record<string, string> = {
  financial_report: 'bg-emerald-900/40 text-emerald-300 border-emerald-500/20',
  minutes: 'bg-blue-900/40 text-blue-300 border-blue-500/20',
  announcement: 'bg-amber-900/40 text-amber-300 border-amber-500/20',
  regulation: 'bg-violet-900/40 text-violet-300 border-violet-500/20',
  other: 'bg-white/10 text-white/50 border-white/10',
};

export default async function DocumentosPage() {
  const session = await auth();
  const token = session?.user?.directusToken;
  const documents = token ? await getDocuments(token) : [];

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-display font-semibold text-white">Documentos</h1>
        <p className="text-sm text-white/40 mt-1">Documentos privados de la asociación</p>
      </div>

      {documents.length === 0 ? (
        <div className="text-center py-16 text-white/30">
          <span className="text-4xl block mb-3">📂</span>
          <p className="text-sm">No hay documentos disponibles por el momento</p>
        </div>
      ) : (
        <div className="space-y-3">
          {documents.map((doc: any) => (
            <div key={doc.id} className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/8 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {doc.category && (
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${CATEGORY_COLORS[doc.category] ?? CATEGORY_COLORS.other}`}>
                        {CATEGORY_LABELS[doc.category] ?? doc.category}
                      </span>
                    )}
                    {doc.version && (
                      <span className="text-[10px] text-white/30">v{doc.version}</span>
                    )}
                  </div>
                  <h3 className="font-medium text-white text-sm">{doc.title}</h3>
                  {doc.description && (
                    <p className="text-xs text-white/40 mt-1 line-clamp-2">{doc.description}</p>
                  )}
                  <p className="text-[10px] text-white/25 mt-2">
                    {new Date(doc.date_created).toLocaleDateString('es-CR', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <a
                    href={`/api/asociados/documents/${doc.id}?view=1`}
                    target="_blank"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#461a7a]/60 hover:bg-[#461a7a]
                               text-[#b48af7] text-xs font-medium transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    </svg>
                    Ver
                  </a>
                  {doc.allow_download && (
                    <a
                      href={`/api/asociados/documents/${doc.id}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10
                                 text-white/60 text-xs font-medium transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                      </svg>
                      Descargar
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
