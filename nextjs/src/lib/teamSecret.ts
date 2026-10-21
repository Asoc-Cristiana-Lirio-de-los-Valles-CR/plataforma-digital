const DIRECTUS_URL = process.env.DIRECTUS_URL ?? 'http://directus:8055';
const ADMIN_TOKEN = process.env.DIRECTUS_ADMIN_TOKEN!;

// globalThis cache works in both Edge Runtime and Node.js
const g = globalThis as typeof globalThis & {
  _teamSecretCache?: { value: string; expires: number };
};

export async function getTeamSecret(): Promise<string | null> {
  if (g._teamSecretCache && Date.now() < g._teamSecretCache.expires) {
    return g._teamSecretCache.value;
  }
  try {
    const res = await fetch(
      `${DIRECTUS_URL}/items/team_settings?fields=team_secret`,
      { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` } }
    );
    if (res.ok) {
      const { data } = await res.json() as { data: { team_secret: string | null } };
      const secret = data?.team_secret || process.env.TEAM_SECRET || null;
      if (secret) {
        g._teamSecretCache = { value: secret, expires: Date.now() + 60_000 };
        return secret;
      }
    }
  } catch {
    // fallback to env var
  }
  return process.env.TEAM_SECRET ?? null;
}
