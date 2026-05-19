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

// GET — list all documents (admin view, includes inactive)
export async function GET() {
  const session = await auth() as Session | null;
  const deny = requireAdmin(session);
  if (deny) return deny;

  try {
    const res = await fetch(
      `${DIRECTUS_URL}/items/asociados_documents?sort=-date_created&fields=id,title,description,category,status,allow_download,version,date_created&limit=200`,
      { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }, cache: 'no-store' }
    );
    const { data } = await res.json();
    return NextResponse.json({ data: data ?? [] });
  } catch {
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}

// POST — upload file + create document record
export async function POST(request: NextRequest) {
  const session = await auth() as Session | null;
  const deny = requireAdmin(session);
  if (deny) return deny;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const category = formData.get('category') as string;
    const allow_download = formData.get('allow_download') === 'true';
    const version = formData.get('version') as string;

    if (!file || !title || !category) {
      return NextResponse.json({ error: 'Archivo, título y categoría son requeridos.' }, { status: 400 });
    }

    // Upload file to Directus Files
    const uploadForm = new FormData();
    uploadForm.append('file', file, file.name);
    uploadForm.append('title', title);
    uploadForm.append('folder', ''); // root folder

    const fileRes = await fetch(`${DIRECTUS_URL}/files`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
      body: uploadForm,
    });

    if (!fileRes.ok) {
      const err = await fileRes.json();
      return NextResponse.json({ error: err?.errors?.[0]?.message ?? 'Error al subir archivo.' }, { status: 400 });
    }

    const { data: fileData } = await fileRes.json();

    // Create document record
    const docRes = await fetch(`${DIRECTUS_URL}/items/asociados_documents`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        description: description || null,
        category,
        file: fileData.id,
        status: 'active',
        allow_download,
        version: version || null,
        uploaded_by: session!.user.id,
        document_scope: 'asociados',
      }),
    });

    if (!docRes.ok) {
      return NextResponse.json({ error: 'Error al crear documento.' }, { status: 400 });
    }

    const { data: doc } = await docRes.json();

    // Log activity
    fetch(`${DIRECTUS_URL}/items/activity_logs`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: session!.user.id,
        action: 'document_uploaded',
        metadata: { document_id: doc.id, title, category },
      }),
    }).catch(() => {});

    // Auto-crear comunicado y notificar por email
    const CATEGORY_LABEL: Record<string, string> = {
      financial_report: 'Informe financiero',
      minutes: 'Acta',
      regulation: 'Reglamento',
      announcement: 'Anuncio',
      other: 'Documento',
    };
    const docLabel = CATEGORY_LABEL[category] ?? 'Documento';
    const announcementTitle = `Nuevo ${docLabel} disponible: ${title}`;
    const announcementBody = description?.trim()
      ? `Se ha publicado un nuevo documento para asociados:\n\n${title}\n\n${description}\n\nAccede al portal para consultarlo.`
      : `Se ha publicado un nuevo documento para asociados:\n\n${title}\n\nAccede al portal para consultarlo y descargarlo.`;

    Promise.all([
      fetch(`${DIRECTUS_URL}/items/announcements`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${ADMIN_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: announcementTitle,
          body: announcementBody,
          priority: 'normal',
          visibility: 'asociados',
          status: 'published',
        }),
      }),
      sendComunicadoEmail(announcementTitle, announcementBody),
    ]).catch(() => {});

    return NextResponse.json({ ok: true, id: doc.id }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}

// DELETE — remove document record and file from Directus
export async function DELETE(request: NextRequest) {
  const session = await auth() as Session | null;
  const deny = requireAdmin(session);
  if (deny) return deny;

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: 'ID requerido.' }, { status: 400 });

  try {
    // Get file ID before deleting the record
    const docRes = await fetch(`${DIRECTUS_URL}/items/asociados_documents/${id}?fields=file`, {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
    });
    const { data: doc } = await docRes.json();

    // Delete document record
    await fetch(`${DIRECTUS_URL}/items/asociados_documents/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
    });

    // Delete the file from Directus storage
    if (doc?.file) {
      await fetch(`${DIRECTUS_URL}/files/${doc.file}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
      });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}

// PATCH — update document status (activate/deactivate)
export async function PATCH(request: NextRequest) {
  const session = await auth() as Session | null;
  const deny = requireAdmin(session);
  if (deny) return deny;

  const { id, status } = await request.json();
  if (!id || !['active', 'inactive'].includes(status)) {
    return NextResponse.json({ error: 'Parámetros inválidos.' }, { status: 400 });
  }

  try {
    await fetch(`${DIRECTUS_URL}/items/asociados_documents/${id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}
