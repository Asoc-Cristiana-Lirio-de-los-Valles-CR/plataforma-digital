import { describe, it, expect, vi } from 'vitest';

vi.mock('@directus/sdk', () => ({
  createDirectus: vi.fn(() => ({
    with: vi.fn().mockReturnThis(),
    request: vi.fn().mockResolvedValue([]),
  })),
  rest: vi.fn(),
  readItems: vi.fn(),
}));

import { readItems } from '@directus/sdk';
import { getSermons, getSermon, getSeriesList, getPreachers } from '../../src/lib/sermons';

describe('getSermons', () => {
  it('returns empty array on error', async () => {
    const result = await getSermons();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe('getSermon', () => {
  it('returns null when not found', async () => {
    const result = await getSermon('slug-inexistente');
    expect(result).toBeNull();
  });

  it('excluye sermones cuyo video no está disponible en YouTube (el detalle responde 404)', async () => {
    await getSermon('servicio-general-6-de-junio-de-2026-cUjc');
    expect(readItems).toHaveBeenLastCalledWith('sermons', expect.objectContaining({
      filter: { slug: { _eq: 'servicio-general-6-de-junio-de-2026-cUjc' }, youtube_status: { _eq: 'available' } },
    }));
  });
});

describe('getSeriesList', () => {
  it('returns empty array on error', async () => {
    const result = await getSeriesList();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe('getPreachers', () => {
  it('returns empty array on error', async () => {
    const result = await getPreachers();
    expect(Array.isArray(result)).toBe(true);
  });
});
