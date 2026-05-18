import NextAuth, { type DefaultSession } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';

const DIRECTUS_URL = process.env.DIRECTUS_URL ?? 'http://directus:8055';
// Profile status re-check interval: 5 minutes
const PROFILE_CHECK_INTERVAL_MS = 5 * 60 * 1000;

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      directusToken: string;
      profileStatus: 'pending' | 'active' | 'suspended' | null;
    } & DefaultSession['user'];
  }
  interface User {
    directusToken?: string;
    profileStatus?: 'pending' | 'active' | 'suspended' | null;
  }
}


async function getDirectusProfile(userId: string, adminToken: string) {
  try {
    const res = await fetch(
      `${DIRECTUS_URL}/items/asociados_profiles?filter[user_id][_eq]=${userId}&fields=status&limit=1`,
      { headers: { Authorization: `Bearer ${adminToken}` }, cache: 'no-store' }
    );
    const data = await res.json();
    return data?.data?.[0] ?? null;
  } catch {
    return null;
  }
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
          const profile = await getDirectusProfile(user.id, adminToken);

          return {
            id: user.id,
            email: user.email,
            name: `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim(),
            directusToken: token,
            profileStatus: profile?.status ?? null,
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
        token.profileStatus = user.profileStatus;
        (token as Record<string, unknown>).profileCheckedAt = Date.now();
      }

      // Google OAuth: sync user with Directus on first login
      if (account?.provider === 'google' && user?.email) {
        const { directusToken, directusUserId } = await syncGoogleUserWithDirectus(user, adminToken);
        token.directusToken = directusToken;
        if (directusUserId) {
          token.sub = directusUserId; // overwrite Google subject ID with Directus UUID
          const profile = await getDirectusProfile(directusUserId, adminToken);
          token.profileStatus = profile?.status ?? null;
          (token as Record<string, unknown>).profileCheckedAt = Date.now();
        }
      }

      // Re-check profile status at most every 5 minutes (catches suspensions without hammering Directus)
      const lastCheck = (token.profileCheckedAt as number | undefined) ?? 0;
      if (token.sub && adminToken && Date.now() - lastCheck > PROFILE_CHECK_INTERVAL_MS) {
        const profile = await getDirectusProfile(token.sub, adminToken);
        token.profileStatus = profile?.status ?? null;
        (token as Record<string, unknown>).profileCheckedAt = Date.now();
      }

      return token;
    },

    async session({ session, token }) {
      session.user.id = token.sub!;
      session.user.directusToken = token.directusToken as string;
      session.user.profileStatus = token.profileStatus as 'pending' | 'active' | 'suspended' | null;
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
      // Ensure asociados_profile exists — create pending if missing
      const profileCheck = await fetch(
        `${DIRECTUS_URL}/items/asociados_profiles?filter[user_id][_eq]=${directusUserId}&fields=id&limit=1`,
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      const { data: profileData } = await profileCheck.json();
      if (!profileData?.length) {
        await fetch(`${DIRECTUS_URL}/items/asociados_profiles`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: directusUserId,
            status: 'pending',
            email_verified_at: new Date().toISOString(),
          }),
        });
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

      await fetch(`${DIRECTUS_URL}/items/asociados_profiles`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: directusUserId,
          status: 'pending',
          email_verified_at: new Date().toISOString(),
        }),
      });
    }

    // Log Google login
    await fetch(`${DIRECTUS_URL}/items/activity_logs`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: directusUserId, action: 'login', metadata: { provider: 'google' } }),
    }).catch(() => {});

    // Return static token for Google users: admin token scoped via profile read
    // Directus user token via static token endpoint
    const tokenRes = await fetch(`${DIRECTUS_URL}/users/${directusUserId}/token`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const tokenData = await tokenRes.json();
    return { directusToken: tokenData?.data?.token ?? undefined, directusUserId };
  } catch {
    return {};
  }
}

