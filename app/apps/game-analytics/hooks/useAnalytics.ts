'use client';

import { useMemo } from 'react';
import { Game, GameMetrics, AnalyticsSummary } from '../lib/types';
import { calculateMetrics, calculateSummary, getTotalHours } from '../lib/calculations';

export interface GameWithMetrics extends Game {
  metrics: GameMetrics;
  totalHours: number; // Baseline + logged hours
}

export function useAnalytics(games: Game[]) {
  const gamesWithMetrics = useMemo<GameWithMetrics[]>(() => {
    return games.map(g => ({
      ...g,
      totalHours: getTotalHours(g),
      metrics: calculateMetrics(g),
    }));
  }, [games]);

  const summary = useMemo<AnalyticsSummary>(() => {
    return calculateSummary(games);
  }, [games]);

  return {
    gamesWithMetrics,
    summary,
  };
}
