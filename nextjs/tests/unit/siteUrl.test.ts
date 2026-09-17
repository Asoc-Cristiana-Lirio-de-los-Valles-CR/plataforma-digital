import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockHeaders = vi.fn();
vi.mock('next/headers', () => ({ headers: () => mockHeaders() }));

import { getSiteUrl } from '../../src/lib/siteUrl';

function withHeaders(entries: Record<string, string>) {
  mockHeaders.mockResolvedValue(new Map(Object.entries(entries)));
}

describe('getSiteUrl', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    mockHeaders.mockReset();
  });

  it('se autorreferencia en el dominio .org', async () => {
    withHeaders({ host: 'liriodelosvalles.org' });
    expect(await getSiteUrl()).toBe('https://liriodelosvalles.org');
  });

  it('se autorreferencia en el dominio .cr', async () => {
    withHeaders({ host: 'liriodelosvallescr.org' });
    expect(await getSiteUrl()).toBe('https://liriodelosvallescr.org');
  });

  it('conserva el subdominio www tal cual llegó', async () => {
    withHeaders({ host: 'www.liriodelosvalles.org' });
    expect(await getSiteUrl()).toBe('https://www.liriodelosvalles.org');
  });

  it('prioriza x-forwarded-host sobre host', async () => {
    withHeaders({ 'x-forwarded-host': 'liriodelosvalles.org', host: 'nextjs:3000' });
    expect(await getSiteUrl()).toBe('https://liriodelosvalles.org');
  });

  it('usa NEXT_PUBLIC_SITE_URL cuando no hay headers de host', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://ejemplo.test');
    withHeaders({});
    expect(await getSiteUrl()).toBe('https://ejemplo.test');
  });

  it('cae al dominio institucional si no hay headers ni env', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', '');
    withHeaders({});
    expect(await getSiteUrl()).toBe('https://liriodelosvallescr.org');
  });

  it('ignora un host con caracteres inválidos y usa el fallback', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', '');
    withHeaders({ host: 'evil.com/path' });
    expect(await getSiteUrl()).toBe('https://liriodelosvallescr.org');
  });
});
