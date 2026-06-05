'use client';

import { GameSignals, TrackerSettings, SignalWeights } from './types';
import { TRACKED_GAMES } from './games';

const SIGNALS_KEY = 'game-interest-tracker-signals';
const SETTINGS_KEY = 'game-interest-tracker-settings';

const DEFAULT_WEIGHTS: SignalWeights = {
  trailerViews: 30,
  psStoreRank: 20,
  subredditGrowth: 15,
  trendsIndex: 20,
  wikipediaViews: 15,
};

function defaultSignals(): GameSignals[] {
  return TRACKED_GAMES.map(g => ({
    gameId: g.id,
    trailerViews: null,
    wikipediaViews: null,
    lastYouTubeFetch: null,
    lastWikipediaFetch: null,
    psStoreRank: null,
    subredditGrowth: null,
    trendsIndex: null,
    updatedAt: new Date().toISOString(),
  }));
}

export function loadSignals(): GameSignals[] {
  if (typeof window === 'undefined') return defaultSignals();
  try {
    const raw = localStorage.getItem(SIGNALS_KEY);
    if (!raw) return defaultSignals();
    const parsed = JSON.parse(raw) as GameSignals[];
    // Merge to ensure all games are present
    return TRACKED_GAMES.map(g => {
      const existing = parsed.find(s => s.gameId === g.id);
      return existing ?? {
        gameId: g.id,
        trailerViews: null,
        wikipediaViews: null,
        lastYouTubeFetch: null,
        lastWikipediaFetch: null,
        psStoreRank: null,
        subredditGrowth: null,
        trendsIndex: null,
        updatedAt: new Date().toISOString(),
      };
    });
  } catch {
    return defaultSignals();
  }
}

export function saveSignals(signals: GameSignals[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SIGNALS_KEY, JSON.stringify(signals));
}

export function updateSignal(
  signals: GameSignals[],
  gameId: string,
  updates: Partial<GameSignals>
): GameSignals[] {
  return signals.map(s =>
    s.gameId === gameId ? { ...s, ...updates, updatedAt: new Date().toISOString() } : s
  );
}

export function loadSettings(): TrackerSettings {
  if (typeof window === 'undefined') return { youtubeApiKey: '', weights: DEFAULT_WEIGHTS };
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { youtubeApiKey: '', weights: DEFAULT_WEIGHTS };
    const parsed = JSON.parse(raw) as Partial<TrackerSettings>;
    return {
      youtubeApiKey: parsed.youtubeApiKey ?? '',
      weights: { ...DEFAULT_WEIGHTS, ...(parsed.weights ?? {}) },
    };
  } catch {
    return { youtubeApiKey: '', weights: DEFAULT_WEIGHTS };
  }
}

export function saveSettings(settings: TrackerSettings): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
