import nodemailer from 'nodemailer';

const DIRECTUS_URL = process.env.DIRECTUS_URL ?? 'http://directus:8055';
const ADMIN_TOKEN = process.env.DIRECTUS_ADMIN_TOKEN!;

export async function sendComunicadoEmail(title: string, body: string): Promise<number> {
  const accessRes = await fetch(
    `${DIRECTUS_URL}/items/member_accesses?filter[area][_eq]=asociados&filter[status][_eq]=active&fields=profile_id&limit=500`,
    { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` } }
  );
  const { data: accesses } = await accessRes.json();
  const profileIds: number[] = (accesses ?? []).map((a: { profile_id: number }) => a.profile_id).filter(Boolean);
  if (profileIds.length === 0) return 0;

  const profileRes = await fetch(
    `${DIRECTUS_URL}/items/member_profiles?filter[id][_in]=${profileIds.join(',')}&fields=email&limit=500`,
    { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` } }
  );
  const { data: profiles } = await profileRes.json();
  const emails: string[] = (profiles ?? []).map((p: { email?: string }) => p.email).filter(Boolean);
  if (emails.length === 0) return 0;

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_SMTP_USER,
      pass: process.env.EMAIL_SMTP_PASSWORD,
    },
  });

  await transporter.sendMail({
    from: process.env.EMAIL_FROM ?? process.env.EMAIL_SMTP_USER,
    bcc: emails,
    subject: `Comunicado: ${title}`,
    text: `${title}\n\n${body}\n\n---\nPortal de Asociados — Iglesia Cristiana Lirio de los Valles\nhttps://liriodelosvallescr.org/es/asociados/comunicados`,
    html: `<h2>${title}</h2><p style="white-space:pre-wrap">${body}</p><hr><p><em>Portal de Asociados — Iglesia Cristiana Lirio de los Valles</em><br><a href="https://liriodelosvallescr.org/es/asociados/comunicados">Ver todos los comunicados</a></p>`,
  });

  return emails.length;
}
