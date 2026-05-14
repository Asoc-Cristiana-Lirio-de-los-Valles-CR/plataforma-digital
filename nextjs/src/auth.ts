import NextAuth, { type DefaultSession } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';

const DIRECTUS_URL = process.env.DIRECTUS_URL ?? 'http://directus:8055';

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

async function getDirectusProfile(userId: string, token: string) {
  try {
    const res = await fetch(
      `${DIRECTUS_URL}/items/asociados_profiles?filter[user_id][_eq]=${userId}&fields=status,approved_at&limit=1`,
      { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }
    );
    const data = await res.json();
    return data?.data?.[0] ?? null;
  } catch {
    return null;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
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

          // Get user info
          const meRes = await fetch(`${DIRECTUS_URL}/users/me?fields=id,email,first_name,last_name`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const me = await meRes.json();
          const user = me?.data;
          if (!user) return null;

          const profile = await getDirectusProfile(user.id, token);

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

  session: { strategy: 'jwt', maxAge: 7 * 24 * 60 * 60 }, // 7 days

  callbacks: {
    async jwt({ token, user, account, trigger }) {
      // First sign-in
      if (user) {
        token.sub = user.id;
        token.directusToken = user.directusToken;
        token.profileStatus = user.profileStatus;
      }

      // Google OAuth: sync user with Directus on first login
      if (account?.provider === 'google' && user?.email) {
        token.directusToken = await syncGoogleUserWithDirectus(user);
        if (token.directusToken) {
          const profile = await getDirectusProfile(token.sub!, token.directusToken as string);
          token.profileStatus = profile?.status ?? null;
        }
      }

      // Re-validate profile status on every request (catches suspensions)
      if (trigger === 'update' || (!user && token.directusToken)) {
        const profile = await getDirectusProfile(token.sub!, token.directusToken as string);
        token.profileStatus = profile?.status ?? null;
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

async function syncGoogleUserWithDirectus(user: { id?: string; email?: string | null; name?: string | null; image?: string | null }): Promise<string | undefined> {
  const adminToken = process.env.DIRECTUS_ADMIN_TOKEN;
  if (!adminToken || !user.email) return undefined;

  try {
    // Check if user exists
    const searchRes = await fetch(
      `${DIRECTUS_URL}/users?filter[email][_eq]=${encodeURIComponent(user.email)}&fields=id`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    const { data: existing } = await searchRes.json();

    let directusUserId: string;

    if (existing?.length > 0) {
      directusUserId = existing[0].id;
    } else {
      // Create new user with Asociado role
      const [firstName, ...rest] = (user.name ?? user.email).split(' ');
      const createRes = await fetch(`${DIRECTUS_URL}/users`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          first_name: firstName,
          last_name: rest.join(' ') || '',
          role: '7da07205-4811-45fb-b8c4-c6d0170b4d39', // Asociado role ID
          status: 'active',
          provider: 'google',
          external_identifier: user.id,
        }),
      });
      const created = await createRes.json();
      directusUserId = created?.data?.id;
      if (!directusUserId) return undefined;

      // Create profile with pending status
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

    // Log activity
    await fetch(`${DIRECTUS_URL}/items/activity_logs`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: directusUserId, action: 'login', metadata: { provider: 'google' } }),
    });

    // Get short-lived token for this user via impersonation
    // Directus admin can generate tokens for users
    const tokenRes = await fetch(`${DIRECTUS_URL}/users/${directusUserId}/token`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const tokenData = await tokenRes.json();
    return tokenData?.data?.token ?? adminToken;
  } catch {
    return undefined;
  }
}
