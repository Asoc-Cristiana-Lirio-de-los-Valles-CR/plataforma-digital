// Doble de YouTube Data API v3 (channels, playlistItems, videos) con la forma real de las respuestas.
export interface FakeVideo {
  id: string;
  title: string;
  description?: string;
  publishedAt: string;
  duration?: string;
  viewCount?: number;
  /** En la playlist de subidas (público). Por defecto true. */
  listed?: boolean;
  /** Devuelto por videos.list (público o no listado). Por defecto true. */
  available?: boolean;
  /** Aparece en la playlist como "Private video" pero videos.list no lo devuelve (caso real de YouTube). */
  placeholder?: boolean;
}

export interface FakeFailure {
  endpoint: 'channels' | 'playlistItems' | 'videos';
  status: number;
  times: number;
  /** Solo para videos: falla únicamente cuando part coincide (p. ej. 'id'). */
  part?: string;
}

const PAGE_SIZE = 50;
const UPLOADS_PLAYLIST = 'UUfake-uploads';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

export function createFakeYouTube(initial: FakeVideo[] = []) {
  const videos = new Map<string, FakeVideo>(initial.map(v => [v.id, { ...v }]));
  const failures: FakeFailure[] = [];
  const calls = { channels: 0, playlistItems: 0, videos: 0 };
  const options = { repeatPageToken: false };

  const isAvailable = (v: FakeVideo) => v.available !== false && !v.placeholder;
  const isListed = (v: FakeVideo) => v.placeholder || (isAvailable(v) && v.listed !== false);

  function takeFailure(endpoint: FakeFailure['endpoint'], part: string | null): number | null {
    const f = failures.find(x => x.endpoint === endpoint && x.times > 0 && (!x.part || x.part === part));
    if (!f) return null;
    f.times--;
    return f.status;
  }

  function videoResource(v: FakeVideo) {
    return {
      kind: 'youtube#video',
      id: v.id,
      snippet: {
        publishedAt: v.publishedAt,
        channelId: 'UCfake',
        title: v.title,
        description: v.description ?? '',
        thumbnails: { high: { url: `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg` } },
        liveBroadcastContent: 'none',
      },
      contentDetails: { duration: v.duration ?? 'PT1H30M' },
      statistics: { viewCount: String(v.viewCount ?? 0) },
    };
  }

  async function handle(url: URL): Promise<Response> {
    const endpoint = url.pathname.split('/').pop() as FakeFailure['endpoint'];
    if (!['channels', 'playlistItems', 'videos'].includes(endpoint)) return json({ error: { code: 404 } }, 404);
    calls[endpoint]++;
    if (!url.searchParams.get('key')) return json({ error: { code: 403, message: 'missing key' } }, 403);

    const part = url.searchParams.get('part');
    const failStatus = takeFailure(endpoint, part);
    if (failStatus) return json({ error: { code: failStatus, message: 'injected failure' } }, failStatus);

    if (endpoint === 'channels') {
      return json({ items: [{ id: url.searchParams.get('id'), contentDetails: { relatedPlaylists: { uploads: UPLOADS_PLAYLIST } } }] });
    }

    if (endpoint === 'playlistItems') {
      if (url.searchParams.get('playlistId') !== UPLOADS_PLAYLIST) return json({ error: { code: 404 } }, 404);
      const listed = [...videos.values()].filter(isListed);
      const offset = Number(url.searchParams.get('pageToken') ?? '0');
      const page = listed.slice(offset, offset + PAGE_SIZE);
      const next = options.repeatPageToken
        ? String(PAGE_SIZE)
        : offset + PAGE_SIZE < listed.length ? String(offset + PAGE_SIZE) : undefined;
      return json({
        items: page.map(v => ({
          kind: 'youtube#playlistItem',
          snippet: {
            publishedAt: v.publishedAt,
            title: v.placeholder ? 'Private video' : v.title.trim(),
            description: v.placeholder ? 'This video is private.' : v.description ?? '',
          },
          contentDetails: { videoId: v.id, videoPublishedAt: v.publishedAt },
        })),
        nextPageToken: next,
        pageInfo: { totalResults: listed.length, resultsPerPage: PAGE_SIZE },
      });
    }

    const ids = (url.searchParams.get('id') ?? '').split(',').filter(Boolean);
    if (ids.length > PAGE_SIZE) return json({ error: { code: 400, message: 'too many ids' } }, 400);
    // La documentación de videos.list no admite maxResults junto con id.
    if (url.searchParams.has('maxResults')) return json({ error: { code: 400, message: 'maxResults not supported with id' } }, 400);
    const found = ids.map(id => videos.get(id)).filter((v): v is FakeVideo => !!v && isAvailable(v));
    return json({ items: part === 'id' ? found.map(v => ({ kind: 'youtube#video', id: v.id })) : found.map(videoResource) });
  }

  return {
    videos,
    failures,
    calls,
    options,
    handles: (url: URL) => url.hostname === 'www.googleapis.com' && url.pathname.startsWith('/youtube/v3/'),
    handle,
  };
}
