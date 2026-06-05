export interface TrackedGame {
  id: string;
  name: string;
  developer: string;
  platform: string[];
  releaseWindow: string;
  price: number | null;
  preOrderAvailable: boolean;
  preOrderUrl?: string;
  youtubeSearchQuery: string;
  wikipediaSlug: string;
  genre: string;
  coverColor: string;
}

export interface YouTubeVideoData {
  videoId: string;
  title: string;
  channelTitle: string;
  views: number;
  likes: number;
  publishedAt: string; // ISO
}

export interface YouTubeBuzz {
  topVideos: YouTubeVideoData[];
  totalViews: number;
  totalLikes: number;
  likeRate: number;       // 0–1
  viewVelocity: number;   // views per day since oldest video
  buzzScore: number;      // composite model output
}

export interface GameSignals {
  gameId: string;
  // auto-fetched
  youtubeBuzz: YouTubeBuzz | null;
  wikipediaViews: number | null;
  lastYouTubeFetch: string | null;
  lastWikipediaFetch: string | null;
  // manual
  psStoreRank: number | null;
  subredditGrowth: number | null;
  trendsIndex: number | null;
  updatedAt: string;
}

export interface SignalWeights {
  youtubeBuzz: number;
  psStoreRank: number;
  subredditGrowth: number;
  trendsIndex: number;
  wikipediaViews: number;
}

export interface TrackerSettings {
  weights: SignalWeights;
}

export interface CompositeScore {
  gameId: string;
  normalized: {
    youtubeBuzz: number;
    psStoreRank: number;
    subredditGrowth: number;
    trendsIndex: number;
    wikipediaViews: number;
  };
  composite: number;
  confidence: number;
}
