'use client';

import { useMemo } from 'react';
import { Scale, TrendingUp, TrendingDown, Sparkles } from 'lucide-react';
import { Game } from '../lib/types';
import { useCriticComparison } from '../hooks/useCriticComparison';
import { getCriticAgreementSummary, CriticComparisonEntry } from '../lib/calculations';

interface CriticComparisonPanelProps {
  games: Game[];
}

function deltaColor(delta: number): string {
  if (delta > 25) return '#ec4899';
  if (delta > 8) return '#22c55e';
  if (delta < -25) return '#8b5cf6';
  if (delta < -8) return '#ef4444';
  return '#9ca3af';
}

function ComparisonRow({ entry }: { entry: CriticComparisonEntry }) {
  const color = deltaColor(entry.delta);
  return (
    <div className="flex items-center gap-2 p-2 bg-white/[0.03] rounded-lg">
      <div className="flex-1 min-w-0">
        <div className="text-xs text-white/70 truncate">{entry.gameName}</div>
        <div className="text-[10px] text-white/35">{entry.verdictLabel}</div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-[10px] text-white/40">
          You {entry.yourScore} · MC {entry.metacritic}
        </div>
        <div className="text-xs font-bold flex items-center justify-end gap-1" style={{ color }}>
          {entry.delta > 0 ? <TrendingUp size={11} /> : entry.delta < 0 ? <TrendingDown size={11} /> : null}
          {entry.delta > 0 ? '+' : ''}{entry.delta}
        </div>
      </div>
    </div>
  );
}

export function CriticComparisonPanel({ games }: CriticComparisonPanelProps) {
  const { comparisons, loading } = useCriticComparison(games);
  const summary = useMemo(() => getCriticAgreementSummary(comparisons), [comparisons]);

  if (!summary && !loading) return null;
  if (!summary) {
    return (
      <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl">
        <h4 className="text-sm font-medium text-white/70 flex items-center gap-2 mb-1">
          <Scale size={14} className="text-cyan-400" />
          You vs. The Critics
        </h4>
        <div className="text-xs text-white/30">Comparing your ratings against Metacritic…</div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-xl">
      <h4 className="text-sm font-medium text-white/70 flex items-center gap-2 mb-3">
        <Scale size={14} className="text-cyan-400" />
        You vs. The Critics
      </h4>

      <div className="text-center mb-3 p-3 bg-white/5 rounded-lg">
        <div className="text-lg font-bold text-cyan-400">{summary.personality}</div>
        <div className="text-xs text-white/50 mt-1">{summary.personalityDescription}</div>
        <div className="text-[10px] text-white/30 mt-2">
          {summary.agreementRate}% agreement with critics · avg delta {summary.avgDelta > 0 ? '+' : ''}{summary.avgDelta} pts
          across {summary.count} game{summary.count === 1 ? '' : 's'}
        </div>
      </div>

      {summary.biggestUnderrated && (
        <div className="mb-2">
          <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1 flex items-center gap-1">
            <Sparkles size={10} className="text-green-400" />
            Your Hidden Gem
          </div>
          <ComparisonRow entry={summary.biggestUnderrated} />
        </div>
      )}

      {summary.biggestOverrated && (
        <div className="mb-2">
          <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1 flex items-center gap-1">
            <Scale size={10} className="text-red-400" />
            Critics&apos; Darling You Didn&apos;t Buy Into
          </div>
          <ComparisonRow entry={summary.biggestOverrated} />
        </div>
      )}

      {summary.comparisons.length > 2 && (
        <details className="mt-2">
          <summary className="text-[10px] text-white/40 uppercase tracking-wider cursor-pointer hover:text-white/60">
            All {summary.comparisons.length} comparisons
          </summary>
          <div className="space-y-1.5 mt-2">
            {summary.comparisons.map(entry => (
              <ComparisonRow key={entry.gameId} entry={entry} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
