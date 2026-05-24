'use client';

import { useMemo } from 'react';
import { X, Trophy, Star, Clock, DollarSign, TrendingUp, Gamepad2, Zap, BarChart2, Hash } from 'lucide-react';
import { GameWithMetrics } from '../hooks/useAnalytics';
import { Game } from '../lib/types';
import { getTotalHours, getCardRarity, getRelationshipStatus, getROIRating } from '../lib/calculations';
import clsx from 'clsx';

interface GameComparePanelProps {
  games: GameWithMetrics[];
  allGames: Game[];
  onClose: () => void;
}

// Per-game accent color for bars
const GAME_COLORS = [
  { bar: '#a855f7', bg: 'rgba(168,85,247,0.15)', text: 'text-purple-400', border: 'border-purple-500/30' },
  { bar: '#3b82f6', bg: 'rgba(59,130,246,0.15)', text: 'text-blue-400',   border: 'border-blue-500/30' },
  { bar: '#10b981', bg: 'rgba(16,185,129,0.15)', text: 'text-emerald-400', border: 'border-emerald-500/30' },
];

interface MetricDef {
  key: string;
  label: string;
  icon: React.ReactNode;
  getValue: (g: GameWithMetrics) => number | null;
  format: (v: number) => string;
  lowerIsBetter: boolean;
  weight: number;
  skipIfZero?: boolean; // skip comparing this metric if a game has 0 (e.g. hours)
}

function MetricIcon({ icon }: { icon: React.ReactNode }) {
  return <span className="w-4 h-4 flex items-center justify-center">{icon}</span>;
}

const METRICS: MetricDef[] = [
  {
    key: 'price',
    label: 'Price Paid',
    icon: <DollarSign size={12} className="text-white/40" />,
    getValue: (g) => g.price,
    format: (v) => v === 0 ? 'Free' : `$${v % 1 === 0 ? v.toFixed(0) : v.toFixed(2)}`,
    lowerIsBetter: true,
    weight: 1,
  },
  {
    key: 'hours',
    label: 'Total Hours',
    icon: <Clock size={12} className="text-white/40" />,
    getValue: (g) => g.totalHours,
    format: (v) => `${v}h`,
    lowerIsBetter: false,
    weight: 2,
    skipIfZero: true,
  },
  {
    key: 'costPerHour',
    label: 'Cost / Hour',
    icon: <TrendingUp size={12} className="text-white/40" />,
    getValue: (g) => g.price > 0 && g.totalHours > 0 ? g.metrics.costPerHour : null,
    format: (v) => `$${v.toFixed(2)}/hr`,
    lowerIsBetter: true,
    weight: 3,
  },
  {
    key: 'rating',
    label: 'Rating',
    icon: <Star size={12} className="text-white/40" />,
    getValue: (g) => g.rating > 0 ? g.rating : null,
    format: (v) => `${v}/10`,
    lowerIsBetter: false,
    weight: 3,
  },
  {
    key: 'roi',
    label: 'ROI Score',
    icon: <BarChart2 size={12} className="text-white/40" />,
    getValue: (g) => g.totalHours > 0 && g.rating > 0 ? g.metrics.roi : null,
    format: (v) => v.toFixed(1),
    lowerIsBetter: false,
    weight: 2,
  },
  {
    key: 'sessions',
    label: 'Sessions',
    icon: <Hash size={12} className="text-white/40" />,
    getValue: (g) => g.playLogs ? g.playLogs.length : 0,
    format: (v) => `${v}`,
    lowerIsBetter: false,
    weight: 1,
    skipIfZero: true,
  },
  {
    key: 'blendScore',
    label: 'Blend Score',
    icon: <Zap size={12} className="text-white/40" />,
    getValue: (g) => g.totalHours > 0 && g.rating > 0 ? g.metrics.blendScore : null,
    format: (v) => v.toFixed(1),
    lowerIsBetter: false,
    weight: 2,
  },
];

function getShortName(name: string): string {
  if (name.length <= 10) return name;
  // Try to get initials or first word
  const words = name.split(' ').filter(Boolean);
  if (words.length === 1) return name.slice(0, 8) + '…';
  return words.slice(0, 2).map(w => w[0].toUpperCase()).join('');
}

function StatusBadge({ status }: { status: Game['status'] }) {
  const cfg: Record<Game['status'], { color: string; label: string }> = {
    'Completed':   { color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', label: '✓ Done' },
    'In Progress': { color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',           label: '▶ Playing' },
    'Not Started': { color: 'bg-white/5 text-white/30 border-white/10',                  label: '○ Unstarted' },
    'Abandoned':   { color: 'bg-red-500/20 text-red-400 border-red-500/30',              label: '✗ Abandoned' },
    'Wishlist':    { color: 'bg-purple-500/20 text-purple-400 border-purple-500/30',     label: '♡ Wishlist' },
  };
  const c = cfg[status] ?? cfg['Not Started'];
  return (
    <span className={clsx('text-[9px] font-semibold px-1.5 py-0.5 rounded border', c.color)}>
      {c.label}
    </span>
  );
}

function RarityBadge({ game }: { game: Game }) {
  const rarity = getCardRarity(game);
  const colors: Record<string, string> = {
    legendary: 'text-yellow-400',
    epic:      'text-purple-400',
    rare:      'text-blue-400',
    uncommon:  'text-emerald-400',
    common:    'text-white/30',
  };
  return (
    <span className={clsx('text-[9px] font-bold uppercase tracking-wider', colors[rarity.tier] ?? 'text-white/30')}>
      {rarity.label}
    </span>
  );
}

interface MetricRowProps {
  metric: MetricDef;
  games: GameWithMetrics[];
  winnerIndex: number | null;
}

function MetricRow({ metric, games, winnerIndex }: MetricRowProps) {
  const values = games.map(g => metric.getValue(g));
  const nonNullValues = values.filter((v): v is number => v !== null);

  if (nonNullValues.length === 0) return null;

  // For skipIfZero: skip if all non-null values are 0
  if (metric.skipIfZero && nonNullValues.every(v => v === 0)) return null;

  // Compute bar widths
  const maxVal = Math.max(...nonNullValues);
  const minVal = Math.min(...nonNullValues);

  const getBarWidth = (v: number | null): number => {
    if (v === null) return 0;
    if (maxVal === 0) return 0;
    if (metric.lowerIsBetter) {
      // Invert: best (lowest) gets 100%, worst gets smaller
      if (minVal === maxVal) return 100;
      return Math.round(((maxVal - v) / (maxVal - minVal)) * 80) + 20; // min 20% for visibility
    }
    return maxVal > 0 ? Math.round((v / maxVal) * 100) : 0;
  };

  return (
    <div className="px-4 py-3 border-b border-white/5 last:border-0">
      <div className="flex items-center gap-1.5 mb-2">
        {metric.icon}
        <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">{metric.label}</span>
      </div>
      <div className="space-y-2">
        {games.map((game, idx) => {
          const val = values[idx];
          const barW = getBarWidth(val);
          const color = GAME_COLORS[idx] ?? GAME_COLORS[0];
          const isWinner = winnerIndex === idx;
          const isNA = val === null || (metric.skipIfZero && val === 0);

          return (
            <div key={game.id} className="flex items-center gap-2">
              {/* Short name */}
              <span className={clsx('text-[10px] font-bold w-[52px] truncate flex-shrink-0', color.text)}>
                {getShortName(game.name)}
              </span>
              {/* Bar + value */}
              <div className="flex-1 flex items-center gap-2 min-w-0">
                {isNA ? (
                  <span className="text-[10px] text-white/20 italic">N/A</span>
                ) : (
                  <>
                    {/* Bar */}
                    <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${barW}%`, backgroundColor: isWinner ? '#10b981' : color.bar, opacity: isWinner ? 1 : 0.5 }}
                      />
                    </div>
                    {/* Value */}
                    <span className={clsx('text-[11px] font-mono font-semibold flex-shrink-0', isWinner ? 'text-emerald-400' : 'text-white/60')}>
                      {metric.format(val)}
                    </span>
                    {/* Trophy */}
                    {isWinner && (
                      <Trophy size={11} className="text-yellow-400 flex-shrink-0" />
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Compute winner index for a given metric across games
function getWinnerIndex(metric: MetricDef, games: GameWithMetrics[]): number | null {
  const values = games.map(g => metric.getValue(g));
  const nonNullIndices = values.map((v, i) => ({ v, i })).filter(({ v }) => v !== null && !(metric.skipIfZero && v === 0));
  if (nonNullIndices.length <= 1) return null;

  if (metric.lowerIsBetter) {
    const best = nonNullIndices.reduce((a, b) => (a.v as number) < (b.v as number) ? a : b);
    // Only declare a winner if there's a clear difference
    const sorted = [...nonNullIndices].sort((a, b) => (a.v as number) - (b.v as number));
    if (sorted[0].v === sorted[1].v) return null;
    return best.i;
  } else {
    const best = nonNullIndices.reduce((a, b) => (a.v as number) > (b.v as number) ? a : b);
    const sorted = [...nonNullIndices].sort((a, b) => (b.v as number) - (a.v as number));
    if (sorted[0].v === sorted[1].v) return null;
    return best.i;
  }
}

export function GameComparePanel({ games, allGames, onClose }: GameComparePanelProps) {
  // Compute winners per metric and tally verdict
  const metricWinners = useMemo(
    () => METRICS.map(m => getWinnerIndex(m, games)),
    [games]
  );

  const verdictScores = useMemo(() => {
    const scores = games.map(() => 0);
    METRICS.forEach((metric, mi) => {
      const winner = metricWinners[mi];
      if (winner !== null) {
        scores[winner] += metric.weight;
      }
    });
    return scores;
  }, [games, metricWinners]);

  const overallWinner = useMemo(() => {
    const max = Math.max(...verdictScores);
    if (max === 0) return null;
    const indices = verdictScores.map((s, i) => ({ s, i })).filter(({ s }) => s === max);
    if (indices.length > 1) return null; // tie
    return indices[0].i;
  }, [verdictScores]);

  const totalWeight = METRICS.reduce((sum, m) => sum + m.weight, 0);

  // Relationship labels
  const relationshipLabels = useMemo(
    () => games.map(g => getRelationshipStatus(g, allGames)),
    [games, allGames]
  );

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative mt-auto w-full max-w-2xl mx-auto bg-[#0d0d14] border-t border-white/10 rounded-t-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: '92dvh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mt-3 flex-shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Gamepad2 size={16} className="text-purple-400" />
            <span className="text-sm font-bold text-white">Compare Games</span>
            <span className="text-[10px] text-white/30 bg-white/5 px-1.5 py-0.5 rounded">{games.length} selected</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all"
          >
            <X size={16} />
          </button>
        </div>

        {/* Game columns header */}
        <div className="flex border-b border-white/10 bg-white/[0.02] flex-shrink-0">
          {games.map((game, idx) => {
            const color = GAME_COLORS[idx] ?? GAME_COLORS[0];
            const rel = relationshipLabels[idx];
            const isOverallWinner = overallWinner === idx;

            return (
              <div
                key={game.id}
                className={clsx(
                  'flex-1 p-3 flex flex-col items-center text-center gap-1.5 relative',
                  idx < games.length - 1 && 'border-r border-white/5'
                )}
                style={{ borderTop: isOverallWinner ? `2px solid ${color.bar}` : undefined }}
              >
                {isOverallWinner && (
                  <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 -translate-y-full">
                    <span className="text-[9px] font-bold text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                      🏆 Winner
                    </span>
                  </div>
                )}

                {/* Thumbnail */}
                {game.thumbnail ? (
                  <img
                    src={game.thumbnail}
                    alt={game.name}
                    className="w-12 h-12 rounded-lg object-cover"
                    style={{ boxShadow: `0 0 12px ${color.bar}40` }}
                  />
                ) : (
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-xl"
                    style={{ background: `linear-gradient(135deg, ${color.bar}30, ${color.bar}10)` }}
                  >
                    🎮
                  </div>
                )}

                {/* Name */}
                <span className={clsx('text-[11px] font-bold leading-tight', color.text)} style={{ maxWidth: '90px' }}>
                  {game.name.length > 18 ? game.name.slice(0, 16) + '…' : game.name}
                </span>

                {/* Rarity */}
                <RarityBadge game={game} />

                {/* Status */}
                <StatusBadge status={game.status} />

                {/* Relationship */}
                {rel && (
                  <span className="text-[9px] text-white/30 italic leading-tight max-w-[80px]">
                    {rel.label}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Scrollable metrics */}
        <div className="overflow-y-auto flex-1">
          {METRICS.map((metric, mi) => (
            <MetricRow
              key={metric.key}
              metric={metric}
              games={games}
              winnerIndex={metricWinners[mi]}
            />
          ))}

          {/* Verdict */}
          <div className="px-4 py-4 border-t border-white/10 bg-white/[0.015]">
            <div className="flex items-center gap-2 mb-3">
              <Trophy size={14} className="text-yellow-400" />
              <span className="text-xs font-bold text-white/60 uppercase tracking-wider">Overall Verdict</span>
            </div>

            <div className="space-y-2">
              {games.map((game, idx) => {
                const color = GAME_COLORS[idx] ?? GAME_COLORS[0];
                const score = verdictScores[idx];
                const isWinner = overallWinner === idx;
                const pct = totalWeight > 0 ? (score / totalWeight) * 100 : 0;

                return (
                  <div key={game.id} className="flex items-center gap-3">
                    <span className={clsx('text-[11px] font-bold w-[70px] truncate flex-shrink-0', color.text)}>
                      {getShortName(game.name)}
                    </span>
                    <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: isWinner ? '#fbbf24' : color.bar,
                          opacity: isWinner ? 1 : 0.5,
                        }}
                      />
                    </div>
                    <span className={clsx('text-[10px] font-mono flex-shrink-0', isWinner ? 'text-yellow-400 font-bold' : 'text-white/30')}>
                      {score}/{totalWeight}
                    </span>
                    {isWinner && <Trophy size={12} className="text-yellow-400 flex-shrink-0" />}
                  </div>
                );
              })}

              {overallWinner !== null ? (
                <p className="text-xs text-white/40 pt-2 border-t border-white/5">
                  <span className={clsx('font-semibold', (GAME_COLORS[overallWinner] ?? GAME_COLORS[0]).text)}>
                    {games[overallWinner].name}
                  </span>{' '}
                  wins on the key metrics — better rating, value, and engagement.
                </p>
              ) : (
                <p className="text-xs text-white/30 pt-2 border-t border-white/5 italic">
                  Too close to call — these games are evenly matched.
                </p>
              )}
            </div>
          </div>

          {/* Spacer for scroll padding */}
          <div className="h-6" />
        </div>
      </div>
    </div>
  );
}
