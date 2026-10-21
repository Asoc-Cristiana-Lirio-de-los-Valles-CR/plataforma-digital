// Guarda del E2E aislado: solo permite el stack de docker-compose.e2e.yml (loopback y puertos exclusivos).
export const E2E_SENTINEL = 'LIRIO-E2E-AISLADO';

const LOOPBACK = new Set(['localhost', '127.0.0.1', '[::1]']);
const ALLOWED_PORT = { directusUrl: '8065', baseUrl: '4100', redisUrl: '6390' } as const;

export interface IsolatedConfig {
  isolatedFlag?: string;
  directusUrl: string;
  baseUrl: string;
  redisUrl: string;
}

export function assertIsolatedE2E(config: IsolatedConfig): void {
  if (config.isolatedFlag !== '1') throw new Error('E2E aislado bloqueado: falta E2E_ISOLATED=1');
  for (const field of Object.keys(ALLOWED_PORT) as (keyof typeof ALLOWED_PORT)[]) {
    const raw = config[field];
    if (/liriodelosvalles/i.test(raw)) throw new Error(`E2E aislado bloqueado: ${field} apunta a producción (${raw})`);
    const url = new URL(raw);
    if (!LOOPBACK.has(url.hostname)) throw new Error(`E2E aislado bloqueado: ${field} no es loopback (${raw})`);
    if (url.port !== ALLOWED_PORT[field]) {
      throw new Error(`E2E aislado bloqueado: ${field} debe usar el puerto ${ALLOWED_PORT[field]} del stack lirio-e2e (${raw})`);
    }
  }
}

export function assertIsolatedDirectusState(state: { projectName: string | null; sermonCount: number }): void {
  if (state.projectName !== E2E_SENTINEL && state.sermonCount > 0) {
    throw new Error('E2E aislado bloqueado: el Directus destino tiene sermones y no lleva el centinela del stack lirio-e2e');
  }
}

export function isolatedConfigFromEnv(): IsolatedConfig {
  return {
    isolatedFlag: process.env.E2E_ISOLATED,
    directusUrl: process.env.E2E_DIRECTUS_URL ?? 'http://localhost:8065',
    baseUrl: process.env.BASE_URL ?? 'http://localhost:3000',
    redisUrl: process.env.E2E_REDIS_URL ?? 'redis://127.0.0.1:6390',
  };
}
