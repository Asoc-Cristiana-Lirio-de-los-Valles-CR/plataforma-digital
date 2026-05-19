import { auth } from '@/auth';
import { NextRequest, NextResponse } from 'next/server';

const DIRECTUS_URL = process.env.DIRECTUS_URL ?? 'http://directus:8055';
const ADMIN_TOKEN = process.env.DIRECTUS_ADMIN_TOKEN!;

function requireAdmin(session: Awaited<ReturnType<typeof auth>>) {
  if (!session?.user?.id) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  if (!session.user.isAdmin) return NextResponse.json({ error: 'Sin permisos.' }, { status: 403 });
  return null;
}

// GET — list pending member requests
export async function GET() {
  const session = await auth();
  const deny = requireAdmin(session);
  if (deny) return deny;

  try {
    const res = await fetch(
      `${DIRECTUS_URL}/items/member_accesses` +
      `?filter[area][_eq]=asociados&filter[status][_in]=pending,incomplete` +
      `&fields=id,status,requested_at,approved_at,notes,profile_id.id,profile_id.nombre,profile_id.email,profile_id.tipo_identificacion,profile_id.numero_identificacion,profile_id.fecha_nacimiento,profile_id.fecha_bautismo,profile_id.telefono,profile_id.ultima_actividad` +
      `&sort=-requested_at&limit=100`,
      { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }, cache: 'no-store' }
    );
    const { data } = await res.json();
    return NextResponse.json({ data: data ?? [] });
  } catch {
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}

// PATCH — approve or reject a member_access
export async function PATCH(request: NextRequest) {
  const session = await auth();
  const deny = requireAdmin(session);
  if (deny) return deny;

  const body = await request.json();
  const { id, action, notes } = body;

  if (!id || !['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'Parámetros inválidos.' }, { status: 400 });
  }

  const newStatus = action === 'approve' ? 'active' : 'suspended';

  try {
    await fetch(`${DIRECTUS_URL}/items/member_accesses/${id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: newStatus,
        approved_at: new Date().toISOString(),
        approved_by: session!.user.id,
        ...(notes ? { notes } : {}),
      }),
    });

    await fetch(`${DIRECTUS_URL}/items/activity_logs`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: session!.user.id,
        action: action === 'approve' ? 'member_approved' : 'member_rejected',
        metadata: { access_id: id, notes },
      }),
    }).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}
