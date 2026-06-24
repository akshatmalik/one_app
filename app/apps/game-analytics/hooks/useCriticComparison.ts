'use client';

import { useEffect, useState } from 'react';
import { Game } from '../lib/types';
import { batchFetchRAWGData } from '../lib/rawg-api';
import { buildCriticComparisons, CriticComparisonEntry } from '../lib/calculations';

/**
 * Fetches Metacritic scores for owned, rated games via the existing RAWG
 * cache (the same lookups useGameThumbnails already triggers, so most names
 * resolve from cache instantly) and builds the "you vs. critics" comparison.
 */
export function useCriticComparison(games: Game[]) {
  const [comparisons, setComparisons] = useState<CriticComparisonEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const ratedGames = games.filter(g => g.status !== 'Wishlist' && g.rating > 0);
    if (ratedGames.length === 0) {
      setComparisons([]);
      return;
    }

    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const results = await batchFetchRAWGData(ratedGames.map(g => g.name));
        if (cancelled) return;

        const metacriticByName = new Map<string, number | null>();
        results.forEach((data, name) => {
          metacriticByName.set(name.toLowerCase().trim(), data?.metacritic ?? null);
        });

        setComparisons(buildCriticComparisons(ratedGames, metacriticByName));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [games.length]);

  return { comparisons, loading };
}
