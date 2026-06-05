export interface YouTubeViewResult {
  videoId: string;
  viewCount: number | null;
  error?: string;
}

export async function fetchTrailerViews(
  videoIds: string[],
  apiKey: string
): Promise<YouTubeViewResult[]> {
  if (!apiKey) {
    return videoIds.map(id => ({ videoId: id, viewCount: null, error: 'No API key' }));
  }

  const ids = videoIds.join(',');
  const url = `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${ids}&key=${apiKey}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const message = body?.error?.message ?? `HTTP ${res.status}`;
      return videoIds.map(id => ({ videoId: id, viewCount: null, error: message }));
    }

    const data = await res.json();
    const items: { id: string; statistics: { viewCount?: string } }[] = data.items ?? [];

    return videoIds.map(id => {
      const item = items.find(i => i.id === id);
      if (!item) return { videoId: id, viewCount: null, error: 'Video not found' };
      const views = item.statistics?.viewCount;
      return { videoId: id, viewCount: views ? parseInt(views, 10) : null };
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Network error';
    return videoIds.map(id => ({ videoId: id, viewCount: null, error: msg }));
  }
}
