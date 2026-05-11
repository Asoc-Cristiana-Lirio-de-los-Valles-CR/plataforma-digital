import type { VideoItem } from './types';

const YT_API_BASE = 'https://www.googleapis.com/youtube/v3';

export async function getLiveStream(): Promise<VideoItem | null> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  const channelId = process.env.YOUTUBE_CHANNEL_ID;
  if (!apiKey || !channelId) return null;

  const url = `${YT_API_BASE}/search?part=snippet&channelId=${channelId}&eventType=live&type=video&key=${apiKey}`;

  try {
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.items?.length) return null;

    const item = data.items[0];
    return {
      videoId: item.id.videoId,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails?.medium?.url ?? '',
    };
  } catch {
    return null;
  }
}

export async function getRecentStreams(maxResults = 6): Promise<VideoItem[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  const channelId = process.env.YOUTUBE_CHANNEL_ID;
  if (!apiKey || !channelId) return [];

  const url = `${YT_API_BASE}/search?part=snippet&channelId=${channelId}&type=video&order=date&maxResults=${maxResults}&key=${apiKey}`;

  try {
    const res = await fetch(url, { next: { revalidate: 1800 } });
    if (!res.ok) return [];
    const data = await res.json();

    return (data.items ?? []).map((item: Record<string, unknown>) => {
      const id = item.id as { videoId: string };
      const snippet = item.snippet as {
        title: string;
        publishedAt: string;
        thumbnails: { medium: { url: string } };
      };
      return {
        videoId: id.videoId,
        title: snippet.title,
        thumbnail: snippet.thumbnails?.medium?.url ?? '',
        publishedAt: snippet.publishedAt,
      };
    });
  } catch {
    return [];
  }
}
