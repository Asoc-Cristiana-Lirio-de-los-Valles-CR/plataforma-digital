import nodemailer from 'nodemailer';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_SMTP_USER,
    pass: process.env.EMAIL_SMTP_PASSWORD,
  },
});

const FROM = process.env.EMAIL_FROM ?? 'notificaciones@liriodelosvallescr.org';
const DIRECTUS_URL = process.env.DIRECTUS_URL ?? 'http://directus:8055';
const ADMIN_TOKEN = process.env.DIRECTUS_ADMIN_TOKEN!;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://liriodelosvallescr.org';
const ADMIN_URL = `${SITE_URL}/es/asociados/admin/solicitudes`;

async function getNotifyAddrs(): Promise<string[]> {
  try {
    const res = await fetch(
      `${DIRECTUS_URL}/items/notification_recipients?filter[activo][_eq]=true&fields=email&limit=50`,
      { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }, cache: 'no-store' }
    );
    const { data } = await res.json();
    const emails = (data ?? []).map((r: { email: string }) => r.email).filter(Boolean);
    if (emails.length === 0) {
      console.warn('[email] notification_recipients vacío — no se envía notificación');
    }
    return emails;
  } catch (err) {
    console.error('[email] getNotifyAddrs failed:', err);
    return [];
  }
}

export async function sendNewRequestNotification(nombre: string, email: string): Promise<void> {
  const addrs = await getNotifyAddrs();
  if (addrs.length === 0) return;
  const safeName = escapeHtml(nombre);
  const safeEmail = escapeHtml(email);
  void transporter.sendMail({
    from: FROM,
    to: addrs.join(', '),
    subject: '📋 Nueva solicitud de asociado — Lirio de los Valles',
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:auto">
        <h2 style="color:#6d28d9">Nueva solicitud de acceso al Portal de Asociados</h2>
        <p><strong>Nombre:</strong> ${safeName}</p>
        <p><strong>Correo:</strong> ${safeEmail}</p>
        <p style="margin-top:24px">
          <a href="${ADMIN_URL}"
             style="background:#6d28d9;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block">
            Ver solicitudes pendientes
          </a>
        </p>
        <p style="color:#888;font-size:12px;margin-top:32px">
          Asociación Cristiana Lirio de los Valles · liriodelosvallescr.org
        </p>
      </div>
    `,
  }).catch((err) => console.error('[email] sendNewRequestNotification failed:', err));
}

export function sendApprovalNotification(nombre: string, email: string): void {
  const safeName = escapeHtml(nombre);
  void transporter.sendMail({
    from: FROM,
    to: email,
    subject: '✅ Tu solicitud fue aprobada — Portal de Asociados',
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:auto">
        <h2 style="color:#6d28d9">¡Bienvenido/a, ${safeName}!</h2>
        <p>Tu solicitud de acceso al Portal de Asociados de la Asociación Cristiana Lirio de los Valles ha sido <strong>aprobada</strong>.</p>
        <p style="margin-top:24px">
          <a href="${SITE_URL}/es/asociados"
             style="background:#6d28d9;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block">
            Ingresar al portal
          </a>
        </p>
        <p style="color:#888;font-size:12px;margin-top:32px">
          Asociación Cristiana Lirio de los Valles · liriodelosvallescr.org
        </p>
      </div>
    `,
  }).catch((err) => console.error('[email] sendApprovalNotification failed:', err));
}

export function sendRejectionNotification(nombre: string, email: string, notes?: string): void {
  const safeName = escapeHtml(nombre);
  const safeNotes = notes ? escapeHtml(notes) : '';
  void transporter.sendMail({
    from: FROM,
    to: email,
    subject: 'Tu solicitud al Portal de Asociados — Lirio de los Valles',
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:auto">
        <h2 style="color:#6d28d9">Hola, ${safeName}</h2>
        <p>Tu solicitud de acceso al Portal de Asociados no pudo ser aprobada en este momento.</p>
        ${safeNotes ? `<p><strong>Motivo:</strong> ${safeNotes}</p>` : ''}
        <p>Si tienes preguntas puedes contactarnos en <a href="mailto:soporte@liriodelosvallescr.org">soporte@liriodelosvallescr.org</a>.</p>
        <p style="color:#888;font-size:12px;margin-top:32px">
          Asociación Cristiana Lirio de los Valles · liriodelosvallescr.org
        </p>
      </div>
    `,
  }).catch((err) => console.error('[email] sendRejectionNotification failed:', err));
}
