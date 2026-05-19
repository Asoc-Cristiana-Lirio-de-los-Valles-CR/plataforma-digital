import { auth } from '@/auth';
import { NextRequest, NextResponse } from 'next/server';

const DIRECTUS_URL = process.env.DIRECTUS_URL ?? 'http://directus:8055';
const DOCUMENTS_TOKEN = process.env.DIRECTUS_DOCUMENTS_TOKEN!;
const ADMIN_TOKEN = process.env.DIRECTUS_ADMIN_TOKEN!;

// Simple in-memory rate limiter (resets on cold start — sufficient for this use case)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 20) return false;
  entry.count++;
  return true;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Auth check
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.user.asociadosStatus !== 'active') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Rate limit
  if (!checkRateLimit(session.user.id)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const { id } = await params;
  const isView = request.nextUrl.searchParams.get('view') === '1';

  try {
    // Get document metadata (using scoped token)
    const docRes = await fetch(
      `${DIRECTUS_URL}/items/asociados_documents/${id}?fields=id,title,file,status,allow_download`,
      { headers: { Authorization: `Bearer ${DOCUMENTS_TOKEN}` } }
    );
    if (!docRes.ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const { data: doc } = await docRes.json();
    if (!doc || doc.status !== 'active') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (!isView && !doc.allow_download) {
      return NextResponse.json({ error: 'Download not allowed' }, { status: 403 });
    }

    // Get file asset (using scoped token)
    const fileRes = await fetch(
      `${DIRECTUS_URL}/assets/${doc.file}`,
      { headers: { Authorization: `Bearer ${DOCUMENTS_TOKEN}` } }
    );
    if (!fileRes.ok) return NextResponse.json({ error: 'File not found' }, { status: 404 });

    // Log activity (fire and forget)
    const action = isView ? 'document_viewed' : 'document_downloaded';
    fetch(`${DIRECTUS_URL}/items/activity_logs`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: session.user.id,
        action,
        metadata: { document_id: id, document_title: doc.title },
        ip_address: request.headers.get('x-forwarded-for') ?? '',
      }),
    }).catch(() => {});

    // Stream file
    const contentType = fileRes.headers.get('content-type') ?? 'application/octet-stream';
    const disposition = isView
      ? 'inline'
      : `attachment; filename="${doc.title}.pdf"`;

    return new NextResponse(fileRes.body, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': disposition,
        'Cache-Control': 'private, no-store',
        'X-Robots-Tag': 'noindex',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'no-referrer',
        'Content-Security-Policy': "default-src 'none'",
      },
    });
  } catch (err) {
    console.error('Document proxy error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
