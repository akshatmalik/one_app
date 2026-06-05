export interface TrackedGame {
  id: string;
  name: string;
  developer: string;
  platform: string[];
  releaseWindow: string;
  price: number | null;
  preOrderAvailable: boolean;
  preOrderUrl?: string;
  youtubeVideoId: string;
  wikipediaSlug: string;
  genre: string;
  coverColor: string;
}

export interface GameSignals {
  gameId: string;
  // auto-fetched
  trailerViews: number | null;
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
  trailerViews: number;
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
    trailerViews: number;
    psStoreRank: number;
    subredditGrowth: number;
    trendsIndex: number;
    wikipediaViews: number;
  };
  composite: number;
  confidence: number; // 0-1, how many signals have real data
}
