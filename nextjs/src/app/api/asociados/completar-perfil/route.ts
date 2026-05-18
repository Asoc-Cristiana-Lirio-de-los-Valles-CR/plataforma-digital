import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

const DIRECTUS_URL = process.env.DIRECTUS_URL ?? 'http://directus:8055';
const ADMIN_TOKEN = process.env.DIRECTUS_ADMIN_TOKEN!;

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  }

  const body = await request.json();
  const { cedula, telefono, congregacion, ministerio, fecha_bautismo } = body;

  if (!cedula?.trim()) {
    return NextResponse.json({ error: 'La cédula es requerida.' }, { status: 400 });
  }

  try {
    const res = await fetch(
      `${DIRECTUS_URL}/items/asociados_profiles?filter[user_id][_eq]=${session.user.id}&limit=1`,
      { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` } }
    );
    const { data } = await res.json();
    if (!data?.length) {
      return NextResponse.json({ error: 'Perfil no encontrado.' }, { status: 404 });
    }

    const profileId = data[0].id;
    await fetch(`${DIRECTUS_URL}/items/asociados_profiles/${profileId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'pending',
        cedula: cedula.trim(),
        telefono: telefono?.trim() || null,
        congregacion: congregacion?.trim() || null,
        ministerio: ministerio?.trim() || null,
        fecha_bautismo: fecha_bautismo || null,
      }),
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Error interno. Intenta de nuevo.' }, { status: 500 });
  }
}
