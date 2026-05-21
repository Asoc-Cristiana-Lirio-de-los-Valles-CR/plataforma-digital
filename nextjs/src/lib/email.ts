import nodemailer from 'nodemailer';

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
const NOTIFY_ADDRS = [
  process.env.EMAIL_NOTIFY_ROOT ?? 'root@liriodelosvallescr.org',
  process.env.EMAIL_NOTIFY_ADMIN ?? 'admin@liriodelosvallescr.org',
];
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://liriodelosvallescr.org';
const ADMIN_URL = `${SITE_URL}/es/asociados/admin/solicitudes`;

export async function sendNewRequestNotification(nombre: string, email: string) {
  await transporter.sendMail({
    from: FROM,
    to: NOTIFY_ADDRS.join(', '),
    subject: '📋 Nueva solicitud de asociado — Lirio de los Valles',
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:auto">
        <h2 style="color:#6d28d9">Nueva solicitud de acceso al Portal de Asociados</h2>
        <p><strong>Nombre:</strong> ${nombre}</p>
        <p><strong>Correo:</strong> ${email}</p>
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

export async function sendApprovalNotification(nombre: string, email: string) {
  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: '✅ Tu solicitud fue aprobada — Portal de Asociados',
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:auto">
        <h2 style="color:#6d28d9">¡Bienvenido/a, ${nombre}!</h2>
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

export async function sendRejectionNotification(nombre: string, email: string, notes?: string) {
  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: 'Tu solicitud al Portal de Asociados — Lirio de los Valles',
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:auto">
        <h2 style="color:#6d28d9">Hola, ${nombre}</h2>
        <p>Tu solicitud de acceso al Portal de Asociados no pudo ser aprobada en este momento.</p>
        ${notes ? `<p><strong>Motivo:</strong> ${notes}</p>` : ''}
        <p>Si tienes preguntas puedes contactarnos en <a href="mailto:soporte@liriodelosvallescr.org">soporte@liriodelosvallescr.org</a>.</p>
        <p style="color:#888;font-size:12px;margin-top:32px">
          Asociación Cristiana Lirio de los Valles · liriodelosvallescr.org
        </p>
      </div>
    `,
  }).catch((err) => console.error('[email] sendRejectionNotification failed:', err));
}
