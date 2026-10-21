import type { Metadata } from 'next';
import DocCard from './DocCard';

export const metadata: Metadata = {
  title: 'Manuales del Equipo',
  robots: { index: false, follow: false },
};

const DIRECTUS_URL = process.env.DIRECTUS_URL ?? 'http://directus:8055';
const ADMIN_TOKEN = process.env.DIRECTUS_ADMIN_TOKEN!;

export interface TeamDocument {
  id: string;
  title: string;
  description: string | null;
  category: string;
  file: string;
  file_type: string | null;
  status: string;
  visibility: string;
  access_token: string | null;
  date_created: string;
}

async function getTeamDocuments(): Promise<TeamDocument[]> {
  try {
    const res = await fetch(
      `${DIRECTUS_URL}/items/team_documents?filter[status][_eq]=published&sort[]=sort&sort[]=-date_created&fields=id,title,description,category,file,status,visibility,access_token,date_created`,
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
              <DocCard key={doc.id} doc={doc} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
