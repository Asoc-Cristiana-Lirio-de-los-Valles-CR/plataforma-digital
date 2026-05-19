import NextAuth, { type DefaultSession } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';

const DIRECTUS_URL = process.env.DIRECTUS_URL ?? 'http://directus:8055';
const PROFILE_CHECK_INTERVAL_MS = 5 * 60 * 1000;

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      directusToken: string;
      asociadosStatus: 'incomplete' | 'pending' | 'active' | 'suspended' | null;
      equipoStatus: 'active' | 'pending' | 'suspended' | null;
    } & DefaultSession['user'];
  }
  interface User {
    directusToken?: string;
    asociadosStatus?: 'incomplete' | 'pending' | 'active' | 'suspended' | null;
    equipoStatus?: 'active' | 'pending' | 'suspended' | null;
  }
}

interface MemberAccess {
  area: string;
  status: string;
}

interface MemberProfile {
  id: number;
  accesses?: MemberAccess[];
}

async function getMemberProfile(userId: string, adminToken: string): Promise<MemberProfile | null> {
  try {
    const res = await fetch(
      `${DIRECTUS_URL}/items/member_profiles?filter[user_id][_eq]=${userId}&fields=id&limit=1`,
      { headers: { Authorization: `Bearer ${adminToken}` }, cache: 'no-store' }
    );
    const data = await res.json();
    const profile = data?.data?.[0];
    if (!profile) return null;

    const accessRes = await fetch(
      `${DIRECTUS_URL}/items/member_accesses?filter[profile_id][_eq]=${profile.id}&fields=area,status`,
      { headers: { Authorization: `Bearer ${adminToken}` }, cache: 'no-store' }
    );
    const accessData = await accessRes.json();
    return { id: profile.id, accesses: accessData?.data ?? [] };
  } catch {
    return null;
  }
}

function extractStatus(accesses: MemberAccess[], area: string) {
  const access = accesses.find(a => a.area === area);
  return (access?.status ?? null) as 'incomplete' | 'pending' | 'active' | 'suspended' | null;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
    CredentialsProvider({
      name: 'Email',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Contraseña', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        try {
          const res = await fetch(`${DIRECTUS_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: credentials.email, password: credentials.password }),
          });
          if (!res.ok) return null;
          const { data } = await res.json();
          const token = data?.access_token;
          if (!token) return null;

          const meRes = await fetch(`${DIRECTUS_URL}/users/me?fields=id,email,first_name,last_name`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const me = await meRes.json();
          const user = me?.data;
          if (!user) return null;

          const adminToken = process.env.DIRECTUS_ADMIN_TOKEN!;
          const profile = await getMemberProfile(user.id, adminToken);

          return {
            id: user.id,
            email: user.email,
            name: `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim(),
            directusToken: token,
            asociadosStatus: profile ? extractStatus(profile.accesses ?? [], 'asociados') : null,
            equipoStatus: profile ? extractStatus(profile.accesses ?? [], 'equipo') as 'active' | 'pending' | 'suspended' | null : null,
          };
        } catch {
          return null;
        }
      },
    }),
  ],

  session: { strategy: 'jwt', maxAge: 7 * 24 * 60 * 60 },

  callbacks: {
    async jwt({ token, user, account }) {
      const adminToken = process.env.DIRECTUS_ADMIN_TOKEN!;

      // First sign-in: populate from user object
      if (user) {
        token.sub = user.id;
        token.directusToken = user.directusToken;
        token.asociadosStatus = user.asociadosStatus;
        token.equipoStatus = user.equipoStatus;
        (token as Record<string, unknown>).profileCheckedAt = Date.now();
      }

      // Google OAuth: sync user with Directus on first login
      if (account?.provider === 'google' && user?.email) {
        const { directusToken, directusUserId } = await syncGoogleUserWithDirectus(user, adminToken);
        token.directusToken = directusToken;
        if (directusUserId) {
          token.sub = directusUserId;
          const profile = await getMemberProfile(directusUserId, adminToken);
          token.asociadosStatus = profile ? extractStatus(profile.accesses ?? [], 'asociados') : null;
          token.equipoStatus = profile ? extractStatus(profile.accesses ?? [], 'equipo') as 'active' | 'pending' | 'suspended' | null : null;
          (token as Record<string, unknown>).profileCheckedAt = Date.now();
          // Update last activity
          if (profile?.id) {
            fetch(`${DIRECTUS_URL}/items/member_profiles/${profile.id}`, {
              method: 'PATCH',
              headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ ultima_actividad: new Date().toISOString() }),
            }).catch(() => {});
          }
        }
      }

      // Re-check statuses every 5 minutes
      const lastCheck = (token.profileCheckedAt as number | undefined) ?? 0;
      if (token.sub && adminToken && Date.now() - lastCheck > PROFILE_CHECK_INTERVAL_MS) {
        const profile = await getMemberProfile(token.sub, adminToken);
        token.asociadosStatus = profile ? extractStatus(profile.accesses ?? [], 'asociados') : null;
        token.equipoStatus = profile ? extractStatus(profile.accesses ?? [], 'equipo') as 'active' | 'pending' | 'suspended' | null : null;
        (token as Record<string, unknown>).profileCheckedAt = Date.now();
      }

      return token;
    },

    async session({ session, token }) {
      session.user.id = token.sub!;
      session.user.directusToken = token.directusToken as string;
      session.user.asociadosStatus = token.asociadosStatus as 'incomplete' | 'pending' | 'active' | 'suspended' | null;
      session.user.equipoStatus = token.equipoStatus as 'active' | 'pending' | 'suspended' | null;
      return session;
    },
  },

  pages: {
    signIn: '/es/asociados/login',
    error: '/es/asociados/login',
  },
});

async function syncGoogleUserWithDirectus(
  user: { id?: string; email?: string | null; name?: string | null; image?: string | null },
  adminToken: string
): Promise<{ directusToken?: string; directusUserId?: string }> {
  if (!adminToken || !user.email) return {};

  try {
    const searchRes = await fetch(
      `${DIRECTUS_URL}/users?filter[email][_eq]=${encodeURIComponent(user.email)}&fields=id`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    const { data: existing } = await searchRes.json();

    let directusUserId: string;

    if (existing?.length > 0) {
      directusUserId = existing[0].id;
      // Ensure member_profile exists
      const profileCheck = await fetch(
        `${DIRECTUS_URL}/items/member_profiles?filter[user_id][_eq]=${directusUserId}&fields=id&limit=1`,
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      const { data: profileData } = await profileCheck.json();
      if (!profileData?.length) {
        const mpRes = await fetch(`${DIRECTUS_URL}/items/member_profiles`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: directusUserId,
            nombre: user.name ?? '',
            email: user.email,
            email_verified_at: new Date().toISOString(),
          }),
        });
        const mpData = await mpRes.json();
        const profileId = mpData.data?.id;
        if (profileId) {
          await fetch(`${DIRECTUS_URL}/items/member_accesses`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ profile_id: profileId, area: 'asociados', status: 'incomplete', requested_at: new Date().toISOString() }),
          });
        }
      }
    } else {
      const [firstName, ...rest] = (user.name ?? user.email).split(' ');
      const createRes = await fetch(`${DIRECTUS_URL}/users`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          first_name: firstName,
          last_name: rest.join(' ') || '',
          role: '7da07205-4811-45fb-b8c4-c6d0170b4d39',
          status: 'active',
          provider: 'google',
          external_identifier: user.id,
        }),
      });
      const created = await createRes.json();
      directusUserId = created?.data?.id;
      if (!directusUserId) return {};

      const mpRes = await fetch(`${DIRECTUS_URL}/items/member_profiles`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: directusUserId,
          nombre: user.name ?? '',
          email: user.email,
          email_verified_at: new Date().toISOString(),
        }),
      });
      const mpData = await mpRes.json();
      const profileId = mpData.data?.id;
      if (profileId) {
        await fetch(`${DIRECTUS_URL}/items/member_accesses`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ profile_id: profileId, area: 'asociados', status: 'incomplete', requested_at: new Date().toISOString() }),
        });
      }
    }

    // Log Google login
    await fetch(`${DIRECTUS_URL}/items/activity_logs`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: directusUserId!, action: 'login', metadata: { provider: 'google' } }),
    }).catch(() => {});

    const tokenRes = await fetch(`${DIRECTUS_URL}/users/${directusUserId!}/token`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const tokenData = await tokenRes.json();
    return { directusToken: tokenData?.data?.token ?? undefined, directusUserId };
  } catch {
    return {};
  }
}
