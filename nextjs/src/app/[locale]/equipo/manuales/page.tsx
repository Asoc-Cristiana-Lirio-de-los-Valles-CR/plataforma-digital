import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Manuales del Equipo',
  robots: { index: false, follow: false },
};

const DIRECTUS_URL = process.env.DIRECTUS_URL ?? 'http://directus:8055';
const ADMIN_TOKEN = process.env.DIRECTUS_ADMIN_TOKEN!;

const CATEGORY_LABELS: Record<string, string> = {
  manual: 'Manual',
  politica: 'Política',
  recurso: 'Recurso',
  otro: 'Otro',
};

const CATEGORY_COLORS: Record<string, string> = {
  manual: 'bg-brand-900/40 text-brand-300 border-brand-500/20',
  politica: 'bg-blue-900/40 text-blue-300 border-blue-500/20',
  recurso: 'bg-emerald-900/40 text-emerald-300 border-emerald-500/20',
  otro: 'bg-white/10 text-white/50 border-white/10',
};

const FILE_ICON: Record<string, string> = {
  'application/pdf': '📄',
  'image/jpeg': '🖼️',
  'image/png': '🖼️',
  'video/mp4': '🎬',
  'video/quicktime': '🎬',
};

interface TeamDocument {
  id: string;
  title: string;
  description: string | null;
  category: string;
  file: string;
  file_type: string | null;
  status: string;
  date_created: string;
}

async function getTeamDocuments(): Promise<TeamDocument[]> {
  try {
    const res = await fetch(
      `${DIRECTUS_URL}/items/team_documents?filter[status][_eq]=published&sort[]=sort&sort[]=-date_created&fields=id,title,description,category,file,status,date_created`,
      { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }, cache: 'no-store' }
    );
    const data = await res.json();
    return data?.data ?? [];
  } catch {
    return [];
  }
}

export default async function ManualesPage() {
  const documents = await getTeamDocuments();

  return (
    <div className="min-h-screen bg-brand-950 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-lg bg-brand-800/60 border border-brand-700/40 flex items-center justify-center">
              <svg className="w-4 h-4 text-brand-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
              </svg>
            </div>
            <h1 className="text-xl font-display font-semibold text-white">Manuales del Equipo</h1>
          </div>
          <p className="text-sm text-white/30 ml-11">Documentos internos — solo lectura</p>
        </div>

        {documents.length === 0 ? (
          <div className="text-center py-20 text-white/20">
            <span className="text-5xl block mb-3">📂</span>
            <p className="text-sm">No hay documentos disponibles aún</p>
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="p-4 rounded-2xl bg-white/4 border border-white/8 hover:bg-white/6 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="text-base">{FILE_ICON[doc.file_type ?? ''] ?? '📎'}</span>
                      {doc.category && (
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${CATEGORY_COLORS[doc.category] ?? CATEGORY_COLORS.otro}`}>
                          {CATEGORY_LABELS[doc.category] ?? doc.category}
                        </span>
                      )}
                    </div>
                    <h3 className="font-medium text-white text-sm leading-snug">{doc.title}</h3>
                    {doc.description && (
                      <p className="text-xs text-white/35 mt-1 line-clamp-2">{doc.description}</p>
                    )}
                    <p className="text-[10px] text-white/20 mt-2">
                      {new Date(doc.date_created).toLocaleDateString('es-CR', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                  </div>

                  <a
                    href={`/api/equipo/documents/${doc.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-none flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                               bg-brand-800/60 hover:bg-brand-700/60 border border-brand-700/40
                               text-brand-300 text-xs font-medium transition-colors whitespace-nowrap"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    </svg>
                    Ver
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
