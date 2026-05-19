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
  const { nombre, email, tipo_identificacion, numero_identificacion, fecha_nacimiento, fecha_bautismo, telefono, ministerio } = body;

  if (!nombre?.trim()) return NextResponse.json({ error: 'El nombre es requerido.' }, { status: 400 });
  if (!tipo_identificacion) return NextResponse.json({ error: 'El tipo de identificación es requerido.' }, { status: 400 });
  if (!numero_identificacion?.trim()) return NextResponse.json({ error: 'El número de identificación es requerido.' }, { status: 400 });
  if (!fecha_nacimiento) return NextResponse.json({ error: 'La fecha de nacimiento es requerida.' }, { status: 400 });
  if (!telefono?.trim()) return NextResponse.json({ error: 'El teléfono es requerido.' }, { status: 400 });

  try {
    // Find member_profile
    const res = await fetch(
      `${DIRECTUS_URL}/items/member_profiles?filter[user_id][_eq]=${session.user.id}&fields=id&limit=1`,
      { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` } }
    );
    const { data } = await res.json();
    if (!data?.length) {
      return NextResponse.json({ error: 'Perfil no encontrado.' }, { status: 404 });
    }
    const profileId = data[0].id;

    // Update member_profile with personal data
    await fetch(`${DIRECTUS_URL}/items/member_profiles/${profileId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: nombre.trim(),
        email: email?.trim() || null,
        tipo_identificacion,
        numero_identificacion: numero_identificacion.trim(),
        fecha_nacimiento,
        fecha_bautismo: fecha_bautismo || null,
        telefono: telefono.trim().startsWith('+') ? telefono.trim() : `+506${telefono.trim().replace(/^0+/, '')}`,
        ultima_actividad: new Date().toISOString(),
      }),
    });

    // Update member_access for asociados: status → pending
    const accessRes = await fetch(
      `${DIRECTUS_URL}/items/member_accesses?filter[profile_id][_eq]=${profileId}&filter[area][_eq]=asociados&fields=id&limit=1`,
      { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` } }
    );
    const { data: accessData } = await accessRes.json();
    if (accessData?.length) {
      await fetch(`${DIRECTUS_URL}/items/member_accesses/${accessData[0].id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${ADMIN_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'pending' }),
      });
    }

    // Handle ministerio text → member_ministerios
    if (ministerio?.trim()) {
      const mSearch = await fetch(
        `${DIRECTUS_URL}/items/ministerios?filter[nombre][_eq]=${encodeURIComponent(ministerio.trim())}&fields=id&limit=1`,
        { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` } }
      );
      const { data: mData } = await mSearch.json();
      let ministerioId = mData?.[0]?.id;
      if (!ministerioId) {
        const mCreate = await fetch(`${DIRECTUS_URL}/items/ministerios`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${ADMIN_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ nombre: ministerio.trim(), status: 'active', tiene_area_privada: false }),
        });
        ministerioId = (await mCreate.json()).data?.id;
      }
      if (ministerioId) {
        await fetch(`${DIRECTUS_URL}/items/member_ministerios`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${ADMIN_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ profile_id: profileId, ministerio_id: ministerioId, status: 'active', assigned_at: new Date().toISOString() }),
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Error interno. Intenta de nuevo.' }, { status: 500 });
  }
}
