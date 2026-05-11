import { NextRequest, NextResponse } from 'next/server';
import { createDirectus, rest, createItem } from '@directus/sdk';

const directus = createDirectus(
  process.env.NEXT_PUBLIC_DIRECTUS_URL ?? 'http://directus:8055'
).with(rest());

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, message } = body as {
      name?: string;
      email?: string;
      message?: string;
    };

    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }

    await directus.request(
      createItem('contact_messages', {
        name: name.trim(),
        email: email.trim(),
        message: message.trim(),
        status: 'unread',
      })
    );

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
