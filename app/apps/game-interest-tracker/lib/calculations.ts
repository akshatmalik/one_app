import { GameSignals, SignalWeights, CompositeScore } from './types';

export type { CompositeScore } from './types';

function minMaxNormalize(values: (number | null)[], value: number | null): number {
  const valid = values.filter((v): v is number => v !== null);
  if (valid.length === 0 || value === null) return 0;
  const min = Math.min(...valid);
  const max = Math.max(...valid);
  if (max === min) return valid.length === 1 ? 0.5 : 0;
  return (value - min) / (max - min);
}

// Lower rank = better, so invert
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
  const buzzScores = signals.map(s => s.youtubeBuzz?.buzzScore ?? null);
  const psStoreRanks = signals.map(s => s.psStoreRank);
  const subredditGrowths = signals.map(s => s.subredditGrowth);
  const trendsIndexes = signals.map(s => s.trendsIndex);
  const wikiViews = signals.map(s => s.wikipediaViews);

  const totalWeight =
    weights.youtubeBuzz +
    weights.psStoreRank +
    weights.subredditGrowth +
    weights.trendsIndex +
    weights.wikipediaViews;

  return signals.map((s, i) => {
    const n = {
      youtubeBuzz: minMaxNormalize(buzzScores, buzzScores[i]),
      psStoreRank: normalizeRank(psStoreRanks, psStoreRanks[i]),
      subredditGrowth: minMaxNormalize(subredditGrowths, subredditGrowths[i]),
      trendsIndex: minMaxNormalize(trendsIndexes, trendsIndexes[i]),
      wikipediaViews: minMaxNormalize(wikiViews, wikiViews[i]),
    };

    const signalValues = [
      s.youtubeBuzz?.buzzScore ?? null,
      s.psStoreRank,
      s.subredditGrowth,
      s.trendsIndex,
      s.wikipediaViews,
    ];
    const confidence = signalValues.filter(v => v !== null).length / 5;

    const weighted =
      n.youtubeBuzz * weights.youtubeBuzz +
      n.psStoreRank * weights.psStoreRank +
      n.subredditGrowth * weights.subredditGrowth +
      n.trendsIndex * weights.trendsIndex +
      n.wikipediaViews * weights.wikipediaViews;

    const composite = totalWeight > 0 ? (weighted / totalWeight) * 100 : 0;
    return { gameId: s.gameId, normalized: n, composite: Math.round(composite * 10) / 10, confidence };
  });
}

export function formatViews(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

export function formatLastFetch(iso: string | null): string {
  if (!iso) return 'Never';
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  return `${Math.floor(diffHrs / 24)}d ago`;
}

export function formatLikeRate(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}
