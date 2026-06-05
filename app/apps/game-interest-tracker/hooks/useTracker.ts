'use client';

import { useState, useEffect, useCallback } from 'react';
import { GameSignals, TrackerSettings } from '../lib/types';
import { loadSignals, saveSignals, loadSettings, saveSettings, updateSignal } from '../lib/storage';
import { fetchTrailerViews } from '../lib/youtube-api';
import { fetchAllWikipediaViews } from '../lib/wikipedia-api';
import { TRACKED_GAMES } from '../lib/games';
import { computeScores, CompositeScore } from '../lib/calculations';

export type FetchState = 'idle' | 'fetching' | 'done' | 'error';

declare const process: { env: Record<string, string | undefined> };
const YT_API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY ?? '';

export function useTracker() {
  const [signals, setSignals] = useState<GameSignals[]>([]);
  const [settings, setSettings] = useState<TrackerSettings>({ weights: { trailerViews: 30, psStoreRank: 20, subredditGrowth: 15, trendsIndex: 20, wikipediaViews: 15 } });
  const [scores, setScores] = useState<CompositeScore[]>([]);
  const [fetchState, setFetchState] = useState<FetchState>('idle');
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setSignals(loadSignals());
    setSettings(loadSettings());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      setScores(computeScores(signals, settings.weights));
    }
  }, [signals, settings.weights, mounted]);

  const refreshAutoSignals = useCallback(async () => {
    setFetchState('fetching');
    setFetchError(null);

    try {
      const videoIds = TRACKED_GAMES.map(g => g.youtubeVideoId);
      const slugs = TRACKED_GAMES.map(g => g.wikipediaSlug);

      const [ytResults, wikiResults] = await Promise.all([
        fetchTrailerViews(videoIds, YT_API_KEY),
        fetchAllWikipediaViews(slugs),
      ]);

      const now = new Date().toISOString();
      let updated = loadSignals();

      TRACKED_GAMES.forEach((game, i) => {
        const yt = ytResults.find(r => r.videoId === game.youtubeVideoId);
        const wiki = wikiResults[i];
        const patches: Partial<GameSignals> = {};

        if (yt?.viewCount !== undefined && yt.viewCount !== null) {
          patches.trailerViews = yt.viewCount;
          patches.lastYouTubeFetch = now;
        }
        if (wiki?.dailyAvg !== null) {
          patches.wikipediaViews = wiki.dailyAvg;
          patches.lastWikipediaFetch = now;
        }

        updated = updateSignal(updated, game.id, patches);
      });

      saveSignals(updated);
      setSignals(updated);

      const ytErrors = ytResults.filter(r => r.error);
      if (ytErrors.length > 0 && ytErrors.length === ytResults.length) {
        setFetchError(`YouTube: ${ytErrors[0]?.error}`);
        setFetchState('error');
      } else {
        setFetchState('done');
      }
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : 'Unknown error');
      setFetchState('error');
    }
  }, []);

  const updateManualSignal = useCallback((gameId: string, field: 'psStoreRank' | 'subredditGrowth' | 'trendsIndex', value: number | null) => {
    setSignals(prev => {
      const updated = updateSignal(prev, gameId, { [field]: value });
      saveSignals(updated);
      return updated;
    });
  }, []);

  const updateSettings = useCallback((newSettings: TrackerSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
  }, []);

  return {
    signals,
    settings,
    scores,
    fetchState,
    fetchError,
    hasYouTubeKey: !!YT_API_KEY,
    mounted,
    refreshAutoSignals,
    updateManualSignal,
    updateSettings,
  };
}
