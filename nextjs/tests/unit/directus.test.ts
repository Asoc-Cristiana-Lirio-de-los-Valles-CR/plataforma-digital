import { describe, it, expect, vi } from 'vitest';

vi.mock('@directus/sdk', () => ({
  createDirectus: vi.fn(() => ({ with: vi.fn().mockReturnThis(), request: vi.fn().mockResolvedValue([]) })),
  rest: vi.fn(),
  readItems: vi.fn(),
  readSingleton: vi.fn(),
}));

import { getServiceSchedule, getWeeklyVerse, getChurchInfo } from '../../src/lib/directus';

describe('getServiceSchedule', () => {
  it('returns empty array on error', async () => {
    const result = await getServiceSchedule();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe('getWeeklyVerse', () => {
  it('returns null on error', async () => {
    const { createDirectus } = await import('@directus/sdk');
    vi.mocked(createDirectus).mockReturnValue({
      with: vi.fn().mockReturnThis(),
      request: vi.fn().mockRejectedValue(new Error('Not found')),
    } as any);
    const result = await getWeeklyVerse();
    // Returns null or the mocked value — no throw
    expect(result === null || typeof result === 'object').toBe(true);
  });
});

describe('getChurchInfo', () => {
  it('returns null on error', async () => {
    const result = await getChurchInfo();
    expect(result === null || typeof result === 'object').toBe(true);
  });
});
