import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

process.env.YOUTUBE_API_KEY = 'test-key';
process.env.YOUTUBE_CHANNEL_ID = 'UCtest';
process.env.DIRECTUS_URL = 'http://directus:8055';
process.env.DIRECTUS_ADMIN_TOKEN = 'admin-token';

import { suggestFromTitle, buildThumbnailUrl } from '../../src/lib/sync-youtube';

describe('suggestFromTitle', () => {
  it('extracts series from known pattern', () => {
    const result = suggestFromTitle('Serie Romanos #3 — El llamado');
    expect(result.suggestedSeries).toBe('Romanos');
  });

  it('returns empty strings for generic titles', () => {
    const result = suggestFromTitle('Culto Domingo AM');
    expect(result.suggestedSeries).toBe('');
    expect(result.suggestedPreacher).toBe('');
  });

  it('extracts year-based series', () => {
    const result = suggestFromTitle('AVIVAMIENTO 2023 DIA 2');
    expect(result.suggestedSeries).toContain('2023');
  });
});

describe('buildThumbnailUrl', () => {
  it('builds maxresdefault URL from youtube_id', () => {
    const url = buildThumbnailUrl('dQw4w9WgXcQ');
    expect(url).toBe('https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg');
  });
});
