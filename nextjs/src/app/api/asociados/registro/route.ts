import { NextRequest, NextResponse } from 'next/server';

const DIRECTUS_URL = process.env.DIRECTUS_URL ?? 'http://directus:8055';
const ADMIN_TOKEN = process.env.DIRECTUS_ADMIN_TOKEN!;
const ASOCIADO_ROLE_ID = '7da07205-4811-45fb-b8c4-c6d0170b4d39';

// Rate limit: max 3 registrations per IP per hour
const regLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRegLimit(ip: string): boolean {
  const now = Date.now();
  const entry = regLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    regLimitMap.set(ip, { count: 1, resetAt: now + 3_600_000 });
    return true;
  }
  if (entry.count >= 3) return false;
  entry.count++;
  return true;
}

export async function POST(request: NextRequest) {
  // CSRF: only accept requests from the same origin
  const origin = request.headers.get('origin');
  const siteUrl = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? '';
  if (!origin || (siteUrl && !origin.startsWith(siteUrl))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const ip = request.headers.get('x-forwarded-for') ?? '';
  if (!checkRegLimit(ip)) {
    return NextResponse.json({ error: 'Demasiados intentos. Intenta más tarde.' }, { status: 429 });
  }

  const body = await request.json();
  const { first_name, last_name, email, password, tipo_identificacion, numero_identificacion, fecha_nacimiento, telefono, isGoogleUser } = body;

  if (!first_name || !last_name || !email || !tipo_identificacion || !numero_identificacion || !fecha_nacimiento || !telefono) {
    return NextResponse.json({ error: 'Faltan campos obligatorios.' }, { status: 400 });
  }
  if (!isGoogleUser && (!password || password.length < 8)) {
    return NextResponse.json({ error: 'La contraseña debe tener al menos 8 caracteres.' }, { status: 400 });
  }

  try {
    // Check if email already exists
    const checkRes = await fetch(
      `${DIRECTUS_URL}/users?filter[email][_eq]=${encodeURIComponent(email)}&fields=id`,
      { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` } }
    );
    const { data: existing } = await checkRes.json();
    if (existing?.length > 0) {
      return NextResponse.json({ error: 'Ya existe una cuenta con ese correo.' }, { status: 409 });
    }

    // Create Directus user with Asociado role
    const createRes = await fetch(`${DIRECTUS_URL}/users`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        first_name,
        last_name,
        email,
        ...(password ? { password } : { password: crypto.randomUUID() + crypto.randomUUID() }),
        role: ASOCIADO_ROLE_ID,
        status: 'active',
      }),
    });
    if (!createRes.ok) {
      const err = await createRes.json();
      return NextResponse.json({ error: err?.errors?.[0]?.message ?? 'Error al crear usuario.' }, { status: 400 });
    }
    const { data: newUser } = await createRes.json();

    // Create asociados_profile with pending status
    await fetch(`${DIRECTUS_URL}/items/asociados_profiles`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: newUser.id,
        status: 'pending',
        nombre: `${first_name} ${last_name}`.trim(),
        email,
        tipo_identificacion,
        numero_identificacion,
        fecha_nacimiento,
        telefono,
        ultima_actividad: new Date().toISOString(),
        email_verified_at: new Date().toISOString(),
      }),
    });

    // Log activity
    await fetch(`${DIRECTUS_URL}/items/activity_logs`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: newUser.id,
        action: 'profile_updated',
        metadata: { event: 'registration', provider: 'credentials' },
        ip_address: ip,
      }),
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    console.error('Registro error:', err);
    return NextResponse.json({ error: 'Error interno. Intenta de nuevo.' }, { status: 500 });
  }
}
