import { GameSignals, SignalWeights, CompositeScore } from './types';

export type { CompositeScore } from './types';

// Min-max normalize a value within a set of values. Returns 0 if all values equal.
function minMaxNormalize(values: (number | null)[], value: number | null): number {
  const valid = values.filter((v): v is number => v !== null);
  if (valid.length === 0 || value === null) return 0;
  const min = Math.min(...valid);
  const max = Math.max(...valid);
  if (max === min) return valid.length === 1 ? 0.5 : 0;
  return (value - min) / (max - min);
}

// PS Store rank: lower is better, so we invert
function normalizeRank(values: (number | null)[], value: number | null): number {
  const valid = values.filter((v): v is number => v !== null);
  if (valid.length === 0 || value === null) return 0;
  const min = Math.min(...valid);
  const max = Math.max(...valid);
  if (max === min) return 0.5;
  return 1 - (value - min) / (max - min);
}

export function computeScores(
  signals: GameSignals[],
  weights: SignalWeights
): CompositeScore[] {
  const trailerViews = signals.map(s => s.trailerViews);
  const psStoreRanks = signals.map(s => s.psStoreRank);
  const subredditGrowths = signals.map(s => s.subredditGrowth);
  const trendsIndexes = signals.map(s => s.trendsIndex);
  const wikiViews = signals.map(s => s.wikipediaViews);

  const totalWeight =
    weights.trailerViews +
    weights.psStoreRank +
    weights.subredditGrowth +
    weights.trendsIndex +
    weights.wikipediaViews;

  return signals.map((s, i) => {
    const n = {
      trailerViews: minMaxNormalize(trailerViews, trailerViews[i]),
      psStoreRank: normalizeRank(psStoreRanks, psStoreRanks[i]),
      subredditGrowth: minMaxNormalize(subredditGrowths, subredditGrowths[i]),
      trendsIndex: minMaxNormalize(trendsIndexes, trendsIndexes[i]),
      wikipediaViews: minMaxNormalize(wikiViews, wikiViews[i]),
    };

    // Count how many signals have real data
    const signalValues = [s.trailerViews, s.psStoreRank, s.subredditGrowth, s.trendsIndex, s.wikipediaViews];
    const filledCount = signalValues.filter(v => v !== null).length;
    const confidence = filledCount / 5;

    // Weighted composite, scaled 0-100
    const weighted =
      n.trailerViews * weights.trailerViews +
      n.psStoreRank * weights.psStoreRank +
      n.subredditGrowth * weights.subredditGrowth +
      n.trendsIndex * weights.trendsIndex +
      n.wikipediaViews * weights.wikipediaViews;

    const composite = totalWeight > 0 ? (weighted / totalWeight) * 100 : 0;

    return { gameId: s.gameId, normalized: n, composite: Math.round(composite * 10) / 10, confidence };
  });
}

export function formatViews(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

export function formatLastFetch(iso: string | null): string {
  if (!iso) return 'Never';
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  return `${Math.floor(diffHrs / 24)}d ago`;
}
