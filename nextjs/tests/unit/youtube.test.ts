import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Needed for env vars
process.env.YOUTUBE_API_KEY = 'test-api-key';
process.env.YOUTUBE_CHANNEL_ID = 'UCtest123';

import { getLiveStream, getRecentStreams } from '../../src/lib/youtube';

beforeEach(() => {
  mockFetch.mockReset();
});

describe('getLiveStream', () => {
  it('returns null when no active stream', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ items: [] }),
    });
    const result = await getLiveStream();
    expect(result).toBeNull();
  });

  it('returns video item when stream is active', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [{
          id: { videoId: 'live123' },
          snippet: {
            title: 'Culto en vivo',
            thumbnails: { medium: { url: 'https://img.youtube.com/live.jpg' } },
          },
        }],
      }),
    });
    const result = await getLiveStream();
    expect(result).not.toBeNull();
    expect(result?.videoId).toBe('live123');
    expect(result?.title).toBe('Culto en vivo');
  });

  it('returns null on fetch error', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));
    const result = await getLiveStream();
    expect(result).toBeNull();
  });
});

describe('getRecentStreams', () => {
  it('returns empty array when API fails', async () => {
    mockFetch.mockResolvedValue({ ok: false });
    const result = await getRecentStreams();
    expect(result).toEqual([]);
  });

  it('maps response to VideoItem array', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [{
          id: { videoId: 'abc123' },
          snippet: {
            title: 'Predicación dominical',
            publishedAt: '2026-05-11T18:00:00Z',
            thumbnails: { medium: { url: 'https://img.youtube.com/thumb.jpg' } },
          },
        }],
      }),
    });
    const result = await getRecentStreams(5);
    expect(Array.isArray(result)).toBe(true);
    expect(result[0].videoId).toBe('abc123');
    expect(result[0].title).toBe('Predicación dominical');
    expect(result[0].publishedAt).toBe('2026-05-11T18:00:00Z');
  });
});
