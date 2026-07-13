import { auth } from '@/auth';
import { type Session } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { sendComunicadoEmail } from '@/lib/sendComunicadoEmail';

const DIRECTUS_URL = process.env.DIRECTUS_URL ?? 'http://directus:8055';
const ADMIN_TOKEN = process.env.DIRECTUS_ADMIN_TOKEN!;

function requireAdmin(session: Session | null) {
  if (!session?.user?.id) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  if (!session.user.isAdmin) return NextResponse.json({ error: 'Sin permisos.' }, { status: 403 });
  return null;
}

export async function GET() {
  const session = await auth() as Session | null;
  const deny = requireAdmin(session);
  if (deny) return deny;

  try {
    const res = await fetch(
      `${DIRECTUS_URL}/items/announcements?sort=-date_created&fields=id,title,body,priority,visibility,status,date_created&limit=100`,
      { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }, cache: 'no-store' }
    );
    const { data } = await res.json();
    return NextResponse.json({ data: data ?? [] });
  } catch {
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth() as Session | null;
  const deny = requireAdmin(session);
  if (deny) return deny;

  const body = await request.json();
  const { title, body: content, priority, visibility } = body;

  if (!title?.trim() || !content?.trim()) {
    return NextResponse.json({ error: 'Título y contenido son requeridos.' }, { status: 400 });
  }

  try {
    const res = await fetch(`${DIRECTUS_URL}/items/announcements`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: title.trim(),
        body: content.trim(),
        priority: priority || 'normal',
        visibility: visibility || 'asociados',
        status: 'published',
      }),
    });

    if (!res.ok) return NextResponse.json({ error: 'Error al publicar.' }, { status: 400 });
    const { data } = await res.json();
    return NextResponse.json({ ok: true, id: data.id }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}

// PUT — reenviar comunicado por email a todos los asociados activos
export async function PUT(request: NextRequest) {
  const session = await auth() as Session | null;
  const deny = requireAdmin(session);
  if (deny) return deny;

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: 'ID requerido.' }, { status: 400 });

  try {
    // Obtener el comunicado
    const annRes = await fetch(`${DIRECTUS_URL}/items/announcements/${id}?fields=title,body,status`, {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
    });
    const { data: ann } = await annRes.json();
    if (!ann) return NextResponse.json({ error: 'Comunicado no encontrado.' }, { status: 404 });
    if (ann.status !== 'published') return NextResponse.json({ error: 'Solo se pueden reenviar comunicados publicados.' }, { status: 400 });

    const sent = await sendComunicadoEmail(ann.title, ann.body);
    if (sent === 0) return NextResponse.json({ error: 'No hay asociados activos con email.' }, { status: 400 });
    return NextResponse.json({ ok: true, sent });
  } catch {
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await auth() as Session | null;
  const deny = requireAdmin(session);
  if (deny) return deny;

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: 'ID requerido.' }, { status: 400 });

  try {
    const res = await fetch(`${DIRECTUS_URL}/items/announcements/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
    });
    if (!res.ok && res.status !== 204) return NextResponse.json({ error: 'Error al eliminar.' }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await auth() as Session | null;
  const deny = requireAdmin(session);
  if (deny) return deny;

  const { id, status } = await request.json();
  if (!id || !['published', 'draft', 'archived'].includes(status)) {
    return NextResponse.json({ error: 'Parámetros inválidos.' }, { status: 400 });
  }

  try {
    await fetch(`${DIRECTUS_URL}/items/announcements/${id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}
