import { YouTubeVideoData, YouTubeBuzz } from './types';

const BASE = 'https://www.googleapis.com/youtube/v3';

interface SearchItem {
  id: { videoId: string };
  snippet: { title: string; channelTitle: string; publishedAt: string };
}

interface VideoItem {
  id: string;
  snippet: { title: string; channelTitle: string; publishedAt: string };
  statistics: { viewCount?: string; likeCount?: string };
}

async function searchVideos(query: string, apiKey: string): Promise<string[]> {
  const url =
    `${BASE}/search?part=snippet&q=${encodeURIComponent(query)}` +
    `&type=video&maxResults=10&order=relevance&key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message ?? `Search HTTP ${res.status}`);
  }
  const data = await res.json();
  return (data.items as SearchItem[]).map(i => i.id.videoId).filter(Boolean);
}

async function fetchVideoStats(
  videoIds: string[],
  apiKey: string
): Promise<YouTubeVideoData[]> {
  if (videoIds.length === 0) return [];
  const url =
    `${BASE}/videos?part=snippet,statistics&id=${videoIds.join(',')}` +
    `&key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message ?? `Stats HTTP ${res.status}`);
  }
  const data = await res.json();
  return (data.items as VideoItem[]).map(item => ({
    videoId: item.id,
    title: item.snippet.title,
    channelTitle: item.snippet.channelTitle,
    publishedAt: item.snippet.publishedAt,
    views: parseInt(item.statistics.viewCount ?? '0', 10),
    likes: parseInt(item.statistics.likeCount ?? '0', 10),
  }));
}

function buildBuzzScore(videos: YouTubeVideoData[]): YouTubeBuzz {
  const totalViews = videos.reduce((s, v) => s + v.views, 0);
  const totalLikes = videos.reduce((s, v) => s + v.likes, 0);
  const likeRate = totalViews > 0 ? totalLikes / totalViews : 0;

  // Velocity: total views divided by days since the oldest video in the set
  const timestamps = videos.map(v => new Date(v.publishedAt).getTime());
  const oldestMs = Math.min(...timestamps);
  const daysSince = Math.max(1, (Date.now() - oldestMs) / 86_400_000);
  const viewVelocity = totalViews / daysSince;

  // Buzz score formula:
  //   base   = sqrt(totalViews)             — big numbers, dampened
  //   boost  = 1 + likeRate * 4             — engaged audience multiplier (max ~5x at 100% like rate)
  //   recency = log10(max(1, viewVelocity)) — rewards fast-accumulating buzz
  const buzzScore =
    Math.sqrt(totalViews) * (1 + likeRate * 4) * Math.log10(Math.max(10, viewVelocity));

  return {
    topVideos: videos.sort((a, b) => b.views - a.views),
    totalViews,
    totalLikes,
    likeRate,
    viewVelocity,
    buzzScore: Math.round(buzzScore),
  };
}

export interface YouTubeFetchResult {
  gameId: string;
  buzz: YouTubeBuzz | null;
  error?: string;
}

export async function fetchYouTubeBuzz(
  gameId: string,
  searchQuery: string,
  apiKey: string
): Promise<YouTubeFetchResult> {
  if (!apiKey) return { gameId, buzz: null, error: 'No API key' };
  try {
    const videoIds = await searchVideos(searchQuery, apiKey);
    if (videoIds.length === 0) return { gameId, buzz: null, error: 'No videos found' };
    const videos = await fetchVideoStats(videoIds, apiKey);
    if (videos.length === 0) return { gameId, buzz: null, error: 'No stats returned' };
    return { gameId, buzz: buildBuzzScore(videos) };
  } catch (e) {
    return { gameId, buzz: null, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function fetchAllYouTubeBuzz(
  games: { id: string; youtubeSearchQuery: string }[],
  apiKey: string
): Promise<YouTubeFetchResult[]> {
  // Sequential to avoid hammering quota
  const results: YouTubeFetchResult[] = [];
  for (const game of games) {
    results.push(await fetchYouTubeBuzz(game.id, game.youtubeSearchQuery, apiKey));
  }
  return results;
}
