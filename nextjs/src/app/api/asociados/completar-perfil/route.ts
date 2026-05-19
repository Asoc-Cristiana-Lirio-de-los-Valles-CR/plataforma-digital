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
  const { nombre, email, tipo_identificacion, numero_identificacion, fecha_nacimiento, telefono, ministerio } = body;

  if (!nombre?.trim()) return NextResponse.json({ error: 'El nombre es requerido.' }, { status: 400 });
  if (!tipo_identificacion) return NextResponse.json({ error: 'El tipo de identificación es requerido.' }, { status: 400 });
  if (!numero_identificacion?.trim()) return NextResponse.json({ error: 'El número de identificación es requerido.' }, { status: 400 });
  if (!fecha_nacimiento) return NextResponse.json({ error: 'La fecha de nacimiento es requerida.' }, { status: 400 });
  if (!telefono?.trim()) return NextResponse.json({ error: 'El teléfono es requerido.' }, { status: 400 });

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
        nombre: nombre.trim(),
        email: email?.trim() || null,
        tipo_identificacion,
        numero_identificacion: numero_identificacion.trim(),
        fecha_nacimiento,
        telefono: telefono.trim(),
        ministerio: ministerio?.trim() || null,
        ultima_actividad: new Date().toISOString(),
      }),
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Error interno. Intenta de nuevo.' }, { status: 500 });
  }
}
