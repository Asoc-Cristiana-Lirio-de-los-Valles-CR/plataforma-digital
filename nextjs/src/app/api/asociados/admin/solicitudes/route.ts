import { auth } from '@/auth';
import { type Session } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { sendApprovalNotification, sendRejectionNotification } from '@/lib/email';

const DIRECTUS_URL = process.env.DIRECTUS_URL ?? 'http://directus:8055';
const ADMIN_TOKEN = process.env.DIRECTUS_ADMIN_TOKEN!;

function requireAdmin(session: Session | null) {
  if (!session?.user?.id) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  if (!session.user.isAdmin) return NextResponse.json({ error: 'Sin permisos.' }, { status: 403 });
  return null;
}

// GET — list pending member requests
export async function GET() {
  const session = await auth() as Session | null;
  const deny = requireAdmin(session);
  if (deny) return deny;

  try {
    // Paso 1: obtener accesses pendientes
    const res = await fetch(
      `${DIRECTUS_URL}/items/member_accesses` +
      `?filter[area][_eq]=asociados&filter[status][_in]=pending,incomplete` +
      `&fields=id,status,requested_at,approved_at,notes,profile_id` +
      `&sort=-requested_at&limit=100`,
      { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }, cache: 'no-store' }
    );
    const { data: accesses } = await res.json();
    if (!accesses?.length) return NextResponse.json({ data: [] });

    // Paso 2: obtener perfiles de esos IDs
    const profileIds = accesses.map((a: { profile_id: number }) => a.profile_id).filter(Boolean);
    const profileRes = await fetch(
      `${DIRECTUS_URL}/items/member_profiles?filter[id][_in]=${profileIds.join(',')}&fields=id,nombre,email,tipo_identificacion,numero_identificacion,fecha_nacimiento,fecha_bautismo,telefono,ultima_actividad&limit=100`,
      { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }, cache: 'no-store' }
    );
    const { data: profiles } = await profileRes.json();
    const profileMap = Object.fromEntries((profiles ?? []).map((p: { id: number }) => [p.id, p]));

    // Combinar
    const data = accesses.map((a: { profile_id: number; [key: string]: unknown }) => ({
      ...a,
      profile_id: profileMap[a.profile_id] ?? null,
    }));

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}

// PATCH — approve or reject a member_access
export async function PATCH(request: NextRequest) {
  const session = await auth() as Session | null;
  const deny = requireAdmin(session);
  if (deny) return deny;

  const body = await request.json();
  const { id, action, notes } = body;

  if (!id || !['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'Parámetros inválidos.' }, { status: 400 });
  }

  const newStatus = action === 'approve' ? 'active' : 'suspended';

  try {
    // Obtener perfil del solicitante para notificación por email
    const accessRes = await fetch(
      `${DIRECTUS_URL}/items/member_accesses/${id}?fields=profile_id`,
      { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` } }
    );
    const { data: accessData } = await accessRes.json();
    let profileNombre = '';
    let profileEmail = '';
    if (accessData?.profile_id) {
      const profileRes = await fetch(
        `${DIRECTUS_URL}/items/member_profiles/${accessData.profile_id}?fields=nombre,email`,
        { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` } }
      );
      const { data: profileData } = await profileRes.json();
      profileNombre = profileData?.nombre ?? '';
      profileEmail = profileData?.email ?? '';
    }

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

    if (profileEmail) {
      if (action === 'approve') {
        sendApprovalNotification(profileNombre, profileEmail);
      } else {
        sendRejectionNotification(profileNombre, profileEmail, notes);
      }
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}
