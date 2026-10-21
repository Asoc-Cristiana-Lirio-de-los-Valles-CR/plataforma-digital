import { auth } from '@/auth';
import { NextResponse } from 'next/server';

const DIRECTUS_URL = process.env.DIRECTUS_URL ?? 'http://directus:8055';
const ADMIN_TOKEN = process.env.DIRECTUS_ADMIN_TOKEN!;

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });

  try {
    const res = await fetch(
      `${DIRECTUS_URL}/items/asociados_documents?filter[status][_eq]=active&sort=-date_created&fields=id,title,description,category,allow_download,version,document_date,date_created&limit=200`,
      { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }, cache: 'no-store' }
    );
    const { data } = await res.json();
    return NextResponse.json({ data: data ?? [] });
  } catch {
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}
