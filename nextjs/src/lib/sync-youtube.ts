const YT_API_BASE = 'https://www.googleapis.com/youtube/v3';

export interface SyncResult {
  inserted: number;
  updated: number;
  errors: string[];
}

export interface YouTubeVideoItem {
  id: { videoId: string };
  snippet: {
    title: string;
    description: string;
    publishedAt: string;
    thumbnails: {
      maxres?: { url: string };
      high?: { url: string };
      medium?: { url: string };
    };
  };
  contentDetails?: { duration: string };
  statistics?: { viewCount: string };
}

const SERIES_PATTERNS = [
  /serie[:\s]+([a-záéíóúüñ0-9\s]+?)(?:\s+#\d+|\s+parte|\s+cap|$|[\|\-—])/i,
  /avivamiento\s+(\d{4})/i,
  /retiro\s+(\d{4})/i,
];

const PREACHER_PATTERNS = [
  /(?:pastor|pastora|hno|hnao?|hermano|hermana)[.\s]+([a-záéíóúüñ\s]+?)(?:\s*[\|\-—]|$)/i,
  /[\|\-—]\s*(?:pastor|pastora)?[.\s]*([A-ZÁÉÍÓÚÜÑ][a-záéíóúüñ]+(?:\s+[A-ZÁÉÍÓÚÜÑ][a-záéíóúüñ]+)?)\s*$/,
];

export function suggestFromTitle(title: string): { suggestedSeries: string; suggestedPreacher: string } {
  let suggestedSeries = '';
  let suggestedPreacher = '';

  for (const pattern of SERIES_PATTERNS) {
    const match = title.match(pattern);
    if (match) {
      suggestedSeries = match[1].trim();
      break;
    }
  }

  for (const pattern of PREACHER_PATTERNS) {
    const match = title.match(pattern);
    if (match) {
      suggestedPreacher = match[1].trim();
      break;
    }
  }

  return { suggestedSeries, suggestedPreacher };
}

export function buildThumbnailUrl(youtubeId: string): string {
  return `https://i.ytimg.com/vi/${youtubeId}/maxresdefault.jpg`;
}

function parseDuration(iso: string): number {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  return (parseInt(match[1] ?? '0') * 3600) + (parseInt(match[2] ?? '0') * 60) + parseInt(match[3] ?? '0');
}

function generateSlug(title: string, youtubeId: string): string {
  const base = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60);
  return `${base}-${youtubeId.slice(-4)}`;
}

async function fetchYouTubePage(
  apiKey: string,
  channelId: string,
  pageToken?: string,
  publishedAfter?: string
): Promise<{ items: YouTubeVideoItem[]; nextPageToken?: string }> {
  let url = `${YT_API_BASE}/search?part=snippet&channelId=${channelId}&type=video&order=date&maxResults=50&key=${apiKey}`;
  if (pageToken) url += `&pageToken=${pageToken}`;
  if (publishedAfter) url += `&publishedAfter=${encodeURIComponent(publishedAfter)}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`YouTube API error: ${res.status}`);
  const data = await res.json();

  const videoIds = (data.items ?? []).map((i: YouTubeVideoItem) => i.id.videoId).join(',');
  let enriched = data.items ?? [];
  if (videoIds) {
    const detailsUrl = `${YT_API_BASE}/videos?part=contentDetails,statistics&id=${videoIds}&key=${apiKey}`;
    const detailsRes = await fetch(detailsUrl);
    if (detailsRes.ok) {
      const details = await detailsRes.json();
      const detailMap = new Map((details.items ?? []).map((d: Record<string, unknown>) => [d.id, d]));
      enriched = enriched.map((item: YouTubeVideoItem) => ({
        ...item,
        contentDetails: (detailMap.get(item.id.videoId) as Record<string, unknown>)?.contentDetails,
        statistics: (detailMap.get(item.id.videoId) as Record<string, unknown>)?.statistics,
      }));
    }
  }

  return { items: enriched, nextPageToken: data.nextPageToken };
}

async function upsertSermon(
  directusUrl: string,
  adminToken: string,
  video: YouTubeVideoItem,
  existingId: string | null,
  lastSyncedAt: string
): Promise<'inserted' | 'updated' | 'error'> {
  const { id: { videoId }, snippet, contentDetails, statistics } = video;
  const thumbnailUrl = buildThumbnailUrl(videoId);
  const durationSeconds = contentDetails?.duration ? parseDuration(contentDetails.duration) : null;
  const viewCount = statistics?.viewCount ? parseInt(statistics.viewCount) : 0;

  if (existingId) {
    const res = await fetch(`${directusUrl}/items/sermons/${existingId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        youtube_status: 'available',
        view_count: viewCount,
        duration_seconds: durationSeconds,
        last_synced_at: lastSyncedAt,
      }),
    });
    return res.ok ? 'updated' : 'error';
  }

  const { suggestedSeries, suggestedPreacher } = suggestFromTitle(snippet.title);
  const slug = generateSlug(snippet.title, videoId);

  const res = await fetch(`${directusUrl}/items/sermons`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: snippet.title,
      raw_youtube_title: snippet.title,
      slug,
      youtube_id: videoId,
      youtube_status: 'available',
      visibility: 'public',
      featured: false,
      description: snippet.description?.slice(0, 2000) || null,
      thumbnail_url: thumbnailUrl,
      duration_seconds: durationSeconds,
      view_count: viewCount,
      youtube_published_at: snippet.publishedAt,
      sermon_date: snippet.publishedAt?.split('T')[0] ?? null,
      suggested_series: suggestedSeries || null,
      suggested_preacher: suggestedPreacher || null,
      imported_at: lastSyncedAt,
      last_synced_at: lastSyncedAt,
    }),
  });
  return res.ok ? 'inserted' : 'error';
}

export async function runYoutubeSync(options: {
  full?: boolean;
  publishedAfter?: string;
}): Promise<SyncResult> {
  const apiKey = process.env.YOUTUBE_API_KEY!;
  const channelId = process.env.YOUTUBE_CHANNEL_ID!;
  const directusUrl = process.env.DIRECTUS_URL ?? 'http://directus:8055';
  const adminToken = process.env.DIRECTUS_ADMIN_TOKEN!;

  const result: SyncResult = { inserted: 0, updated: 0, errors: [] };
  const syncedAt = new Date().toISOString();

  let pageToken: string | undefined;

  do {
    const { items, nextPageToken } = await fetchYouTubePage(
      apiKey, channelId, pageToken, options.full ? undefined : options.publishedAfter
    );

    for (const video of items) {
      try {
        const videoId = video.id.videoId;
        const checkRes = await fetch(
          `${directusUrl}/items/sermons?filter[youtube_id][_eq]=${videoId}&fields=id&limit=1`,
          { headers: { Authorization: `Bearer ${adminToken}` } }
        );
        const checkData = await checkRes.json();
        const existingId = checkData?.data?.[0]?.id ?? null;

        const outcome = await upsertSermon(directusUrl, adminToken, video, existingId, syncedAt);
        if (outcome === 'inserted') result.inserted++;
        else if (outcome === 'updated') result.updated++;
        else result.errors.push(videoId);
      } catch (err) {
        result.errors.push(`${video.id.videoId}: ${String(err)}`);
      }
    }

    pageToken = nextPageToken;
  } while (pageToken && options.full);

  return result;
}
