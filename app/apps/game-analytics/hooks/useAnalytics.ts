'use client';

import { useMemo } from 'react';
import { Game, GameMetrics, AnalyticsSummary } from '../lib/types';
import { calculateMetrics, calculateSummary } from '../lib/calculations';

export interface GameWithMetrics extends Game {
  metrics: GameMetrics;
}

export function useAnalytics(games: Game[]) {
  const gamesWithMetrics = useMemo<GameWithMetrics[]>(() => {
    return games.map(g => ({
      ...g,
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
