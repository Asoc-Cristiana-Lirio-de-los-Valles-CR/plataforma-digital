import { auth } from '@/auth';
import { type Session } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

const DIRECTUS_URL = process.env.DIRECTUS_URL ?? 'http://directus:8055';
const ADMIN_TOKEN = process.env.DIRECTUS_ADMIN_TOKEN!;

function requireAdmin(session: Session | null) {
  if (!session?.user?.id) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  if (!session.user.isAdmin) return NextResponse.json({ error: 'Sin permisos.' }, { status: 403 });
  return null;
}

export interface DocCategory {
  id: number;
  key: string;
  label: string;
  icon: string | null;
  status: 'active' | 'archived';
  sort: number | null;
}

// GET — all categories (active + archived for admin)
export async function GET() {
  try {
    const res = await fetch(
      `${DIRECTUS_URL}/items/document_categories?sort=sort,label&limit=200`,
      { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }, cache: 'no-store' }
    );
    const { data } = await res.json();
    return NextResponse.json({ data: data ?? [] });
  } catch {
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}

// POST — create category
export async function POST(request: NextRequest) {
  const session = await auth() as Session | null;
  const deny = requireAdmin(session);
  if (deny) return deny;

  const { key, label, icon } = await request.json();
  if (!key?.trim() || !label?.trim()) {
    return NextResponse.json({ error: 'Clave y nombre son requeridos.' }, { status: 400 });
  }

  // Validate key format: lowercase letters, numbers, underscores only
  if (!/^[a-z0-9_]+$/.test(key.trim())) {
    return NextResponse.json({ error: 'Clave solo puede tener letras minúsculas, números y guiones bajos.' }, { status: 400 });
  }

  try {
    const res = await fetch(`${DIRECTUS_URL}/items/document_categories`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: key.trim(), label: label.trim(), icon: icon?.trim() || null, status: 'active' }),
    });
    if (!res.ok) {
      const err = await res.json();
      const msg = err?.errors?.[0]?.message ?? 'Error al crear categoría.';
      return NextResponse.json({ error: msg.includes('unique') ? 'Ya existe una categoría con esa clave.' : msg }, { status: 400 });
    }
    const { data } = await res.json();
    return NextResponse.json({ ok: true, data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}

// PATCH — edit label/icon or change status
export async function PATCH(request: NextRequest) {
  const session = await auth() as Session | null;
  const deny = requireAdmin(session);
  if (deny) return deny;

  const body = await request.json();
  const { id, label, icon, status } = body;
  if (!id) return NextResponse.json({ error: 'ID requerido.' }, { status: 400 });

  // Soft delete: check no active documents use this category
  if (status === 'archived') {
    const catRes = await fetch(
      `${DIRECTUS_URL}/items/document_categories/${id}?fields=key`,
      { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` } }
    );
    const { data: cat } = await catRes.json();
    if (cat?.key) {
      const docsRes = await fetch(
        `${DIRECTUS_URL}/items/asociados_documents?filter[category][_eq]=${cat.key}&filter[status][_eq]=active&limit=1&fields=id`,
        { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` } }
      );
      const { data: docs } = await docsRes.json();
      if (docs?.length > 0) {
        return NextResponse.json({ error: 'No se puede archivar: hay documentos activos con esta categoría.' }, { status: 400 });
      }
    }
  }

  const payload: Record<string, unknown> = {};
  if (label !== undefined) payload.label = label.trim();
  if (icon !== undefined) payload.icon = icon?.trim() || null;
  if (status !== undefined) payload.status = status;

  try {
    await fetch(`${DIRECTUS_URL}/items/document_categories/${id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}
