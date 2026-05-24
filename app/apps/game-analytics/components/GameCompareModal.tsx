'use client';

import { useMemo, useState } from 'react';
import { X, Trophy, Clock, DollarSign, Star, TrendingUp, Activity, Gamepad2, ArrowLeftRight, ChevronRight } from 'lucide-react';
import { GameWithMetrics } from '../hooks/useAnalytics';
import { Game } from '../lib/types';
import {
  getCardRarity,
  getRelationshipStatus,
  getGameStreak,
  getROIRating,
} from '../lib/calculations';
import { RatingStars } from './RatingStars';
import clsx from 'clsx';

interface GameCompareModalProps {
  gameA: GameWithMetrics;
  gameB: GameWithMetrics;
  allGames: Game[];
  onClose: () => void;
  onSwap?: () => void;
}

interface MatchupCategory {
  id: string;
  label: string;
  icon: React.ReactNode;
  aRaw: number;
  bRaw: number;
  aDisplay: string;
  bDisplay: string;
  higherWins: boolean;
  color: string;
}

function formatCurrency(n: number): string {
  if (n === 0) return 'Free';
  return `$${n % 1 === 0 ? n.toFixed(0) : n.toFixed(2)}`;
}

function formatHours(h: number): string {
  if (h === 0) return '0h';
  if (h < 1) return `${Math.round(h * 60)}m`;
  return `${h.toFixed(1)}h`;
}

function getWinner(aRaw: number, bRaw: number, higherWins: boolean): 'a' | 'b' | 'tie' {
  if (aRaw === bRaw) return 'tie';
  if (higherWins) return aRaw > bRaw ? 'a' : 'b';
  // Lower wins (cost per hour, price)
  // Handle Infinity (no hours played)
  if (aRaw === Infinity && bRaw === Infinity) return 'tie';
  if (aRaw === Infinity) return 'b';
  if (bRaw === Infinity) return 'a';
  return aRaw < bRaw ? 'a' : 'b';
}

function getBarWidth(myRaw: number, theirRaw: number, higherWins: boolean): number {
  if (myRaw === Infinity && theirRaw === Infinity) return 50;
  if (myRaw === Infinity) return 0;
  if (theirRaw === Infinity) return 100;
  const total = myRaw + theirRaw;
  if (total === 0) return 50;
  const pct = higherWins
    ? (myRaw / total) * 100
    : (1 - myRaw / total) * 100;
  return Math.min(100, Math.max(5, pct));
}

const RARITY_STYLES: Record<string, { border: string; label: string; color: string }> = {
  legendary: { border: 'border-yellow-400/50',  label: 'Legendary', color: '#fbbf24' },
  epic:      { border: 'border-purple-400/50',  label: 'Epic',      color: '#c084fc' },
  rare:      { border: 'border-blue-400/50',    label: 'Rare',      color: '#60a5fa' },
  uncommon:  { border: 'border-emerald-400/40', label: 'Uncommon',  color: '#34d399' },
  common:    { border: 'border-white/10',       label: 'Common',    color: '#ffffff60' },
};

function GameHeader({ game, allGames, side, isWinner }: {
  game: GameWithMetrics;
  allGames: Game[];
  side: 'left' | 'right';
  isWinner: boolean;
}) {
  const rarity  = useMemo(() => getCardRarity(game), [game]);
  const rel     = useMemo(() => getRelationshipStatus(game, allGames), [game, allGames]);
  const streak  = useMemo(() => getGameStreak(game), [game]);
  const style   = RARITY_STYLES[rarity.tier] ?? RARITY_STYLES.common;

  return (
    <div className={clsx(
      'flex flex-col items-center text-center p-3 rounded-xl border transition-all',
      style.border,
      isWinner ? 'bg-white/[0.06]' : 'bg-white/[0.02]',
      side === 'left' ? 'border-l-2' : 'border-r-2',
    )}>
      {/* Trophy badge */}
      {isWinner && (
        <div className="mb-1 flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-400/15 border border-yellow-400/30">
          <Trophy size={10} className="text-yellow-400" />
          <span className="text-[9px] font-bold text-yellow-400 uppercase tracking-wider">Winner</span>
        </div>
      )}

      {/* Thumbnail */}
      <div className="relative mb-2">
        {game.thumbnail ? (
          <img
            src={game.thumbnail}
            alt={game.name}
            className={clsx(
              'w-16 h-16 rounded-xl object-cover',
              !isWinner && 'opacity-70 saturate-50',
            )}
          />
        ) : (
          <div className={clsx(
            'w-16 h-16 rounded-xl bg-white/5 flex items-center justify-center',
            !isWinner && 'opacity-50',
          )}>
            <Gamepad2 size={24} className="text-white/20" />
          </div>
        )}
        {streak.isActive && streak.days >= 3 && (
          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center">
            <span className="text-[9px] font-bold text-white">{streak.days}</span>
          </div>
        )}
      </div>

      {/* Name */}
      <p className="text-xs font-bold text-white/90 leading-tight mb-1 line-clamp-2">{game.name}</p>

      {/* Platform / genre */}
      {(game.platform || game.genre) && (
        <p className="text-[9px] text-white/30 mb-2">
          {[game.platform, game.genre].filter(Boolean).join(' · ')}
        </p>
      )}

      {/* Rarity + relationship row */}
      <div className="flex items-center gap-1 flex-wrap justify-center">
        <span
          className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full border"
          style={{ color: style.color, borderColor: `${style.color}40`, backgroundColor: `${style.color}10` }}
        >
          {rarity.label}
        </span>
        {rel && (
          <span
            className="text-[9px] px-1.5 py-0.5 rounded-full border"
            style={{ color: rel.color, borderColor: `${rel.color}40`, backgroundColor: `${rel.color}10` }}
          >
            {rel.label}
          </span>
        )}
      </div>
    </div>
  );
}

function MatchupRow({ category, winner }: { category: MatchupCategory; winner: 'a' | 'b' | 'tie' }) {
  const aWins = winner === 'a';
  const bWins = winner === 'b';
  const tied  = winner === 'tie';

  const aBarW = getBarWidth(category.aRaw, category.bRaw, category.higherWins);
  const bBarW = getBarWidth(category.bRaw, category.aRaw, category.higherWins);

  return (
    <div className="py-2.5 border-b border-white/[0.04] last:border-0">
      {/* Label row */}
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-white/30" style={{ color: category.color }}>{category.icon}</span>
        <span className="text-[10px] font-medium text-white/50 uppercase tracking-wider">{category.label}</span>
        {tied && <span className="ml-auto text-[9px] text-white/25 italic">Tie</span>}
      </div>

      {/* Bar + values row */}
      <div className="flex items-center gap-2">
        {/* A side */}
        <div className="flex-1 flex flex-col items-end gap-1">
          <span className={clsx(
            'text-sm font-bold tabular-nums',
            aWins ? 'text-white' : 'text-white/35',
          )}>{category.aDisplay}</span>
          <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden flex justify-end">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${aBarW}%`,
                backgroundColor: aWins ? category.color : '#ffffff20',
              }}
            />
          </div>
        </div>

        {/* Trophy or dot */}
        <div className="w-8 flex items-center justify-center flex-shrink-0">
          {aWins ? (
            <Trophy size={12} style={{ color: category.color }} />
          ) : bWins ? (
            <Trophy size={12} style={{ color: category.color }} className="scale-x-[-1]" />
          ) : (
            <span className="text-[8px] text-white/20">—</span>
          )}
        </div>

        {/* B side */}
        <div className="flex-1 flex flex-col items-start gap-1">
          <span className={clsx(
            'text-sm font-bold tabular-nums',
            bWins ? 'text-white' : 'text-white/35',
          )}>{category.bDisplay}</span>
          <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${bBarW}%`,
                backgroundColor: bWins ? category.color : '#ffffff20',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function getVerdictText(aName: string, bName: string, aWins: number, bWins: number): {
  winner: 'a' | 'b' | 'tie';
  headline: string;
  summary: string;
} {
  if (aWins === bWins) {
    return {
      winner: 'tie',
      headline: 'Dead Heat',
      summary: `${aName} and ${bName} are evenly matched — different strengths, same overall value.`,
    };
  }
  const [winnerName, loserName, wWins, lWins] = aWins > bWins
    ? [aName, bName, aWins, bWins]
    : [bName, aName, bWins, aWins];
  const margin = wWins - lWins;
  if (margin >= 4) {
    return {
      winner: aWins > bWins ? 'a' : 'b',
      headline: `${winnerName} dominates`,
      summary: `A commanding ${wWins}-${lWins} victory. ${winnerName} is the clear winner across almost every metric.`,
    };
  }
  if (margin >= 2) {
    return {
      winner: aWins > bWins ? 'a' : 'b',
      headline: `${winnerName} wins`,
      summary: `${winnerName} takes ${wWins} of ${wWins + lWins} categories, edging out ${loserName} on balance.`,
    };
  }
  return {
    winner: aWins > bWins ? 'a' : 'b',
    headline: `${winnerName} edges it`,
    summary: `A close ${wWins}-${lWins} contest. Both games have real strengths — ${winnerName} just shades it overall.`,
  };
}

export function GameCompareModal({ gameA, gameB, allGames, onClose, onSwap }: GameCompareModalProps) {
  const categories = useMemo<MatchupCategory[]>(() => {
    const totalHoursA = gameA.totalHours;
    const totalHoursB = gameB.totalHours;
    const cphA = totalHoursA > 0 ? gameA.metrics.costPerHour : Infinity;
    const cphB = totalHoursB > 0 ? gameB.metrics.costPerHour : Infinity;
    const sessionsA = gameA.playLogs?.length ?? 0;
    const sessionsB = gameB.playLogs?.length ?? 0;

    return [
      {
        id: 'hours',
        label: 'Hours Played',
        icon: <Clock size={12} />,
        aRaw: totalHoursA,
        bRaw: totalHoursB,
        aDisplay: formatHours(totalHoursA),
        bDisplay: formatHours(totalHoursB),
        higherWins: true,
        color: '#818cf8',
      },
      {
        id: 'rating',
        label: 'Your Rating',
        icon: <Star size={12} />,
        aRaw: gameA.rating,
        bRaw: gameB.rating,
        aDisplay: `${gameA.rating}/10`,
        bDisplay: `${gameB.rating}/10`,
        higherWins: true,
        color: '#f59e0b',
      },
      {
        id: 'cost',
        label: 'Cost per Hour',
        icon: <DollarSign size={12} />,
        aRaw: cphA,
        bRaw: cphB,
        aDisplay: cphA === Infinity ? 'No data' : `$${cphA.toFixed(2)}/h`,
        bDisplay: cphB === Infinity ? 'No data' : `$${cphB.toFixed(2)}/h`,
        higherWins: false,
        color: '#10b981',
      },
      {
        id: 'roi',
        label: 'ROI Score',
        icon: <TrendingUp size={12} />,
        aRaw: gameA.metrics.roi,
        bRaw: gameB.metrics.roi,
        aDisplay: gameA.metrics.roi.toFixed(1),
        bDisplay: gameB.metrics.roi.toFixed(1),
        higherWins: true,
        color: '#06b6d4',
      },
      {
        id: 'sessions',
        label: 'Sessions Logged',
        icon: <Activity size={12} />,
        aRaw: sessionsA,
        bRaw: sessionsB,
        aDisplay: String(sessionsA),
        bDisplay: String(sessionsB),
        higherWins: true,
        color: '#ec4899',
      },
      {
        id: 'price',
        label: 'Price Paid',
        icon: <DollarSign size={12} />,
        aRaw: gameA.price,
        bRaw: gameB.price,
        aDisplay: formatCurrency(gameA.price),
        bDisplay: formatCurrency(gameB.price),
        higherWins: false,
        color: '#a78bfa',
      },
    ];
  }, [gameA, gameB]);

  const { categoryWinners, aWins, bWins } = useMemo(() => {
    let a = 0;
    let b = 0;
    const winners: Record<string, 'a' | 'b' | 'tie'> = {};
    for (const cat of categories) {
      const w = getWinner(cat.aRaw, cat.bRaw, cat.higherWins);
      winners[cat.id] = w;
      if (w === 'a') a++;
      else if (w === 'b') b++;
    }
    return { categoryWinners: winners, aWins: a, bWins: b };
  }, [categories]);

  const verdict = useMemo(
    () => getVerdictText(gameA.name, gameB.name, aWins, bWins),
    [gameA.name, gameB.name, aWins, bWins],
  );

  const overallWinner = verdict.winner;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full sm:max-w-lg bg-[#0f0f1a] rounded-t-2xl sm:rounded-2xl border border-white/10 shadow-2xl max-h-[92vh] overflow-y-auto overscroll-contain">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#0f0f1a]/95 backdrop-blur-sm flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <ArrowLeftRight size={14} className="text-purple-400" />
            <span className="text-sm font-semibold text-white/80">Head-to-Head</span>
          </div>
          <div className="flex items-center gap-2">
            {onSwap && (
              <button
                onClick={onSwap}
                className="flex items-center gap-1 px-2.5 py-1 text-[10px] text-white/40 hover:text-white/70 bg-white/[0.03] hover:bg-white/[0.06] rounded-lg transition-all"
                title="Pick different games"
              >
                <ArrowLeftRight size={10} />
                Change
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-white/30 hover:text-white/70 transition-colors rounded-lg hover:bg-white/[0.06]"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Game headers — side by side */}
          <div className="grid grid-cols-2 gap-2">
            <GameHeader
              game={gameA}
              allGames={allGames}
              side="left"
              isWinner={overallWinner === 'a'}
            />
            <GameHeader
              game={gameB}
              allGames={allGames}
              side="right"
              isWinner={overallWinner === 'b'}
            />
          </div>

          {/* Score summary */}
          <div className="flex items-center justify-center gap-3 py-1">
            <span className={clsx(
              'text-2xl font-black tabular-nums',
              overallWinner === 'a' ? 'text-white' : 'text-white/30',
            )}>{aWins}</span>
            <span className="text-xs text-white/20 font-medium">vs</span>
            <span className={clsx(
              'text-2xl font-black tabular-nums',
              overallWinner === 'b' ? 'text-white' : 'text-white/30',
            )}>{bWins}</span>
          </div>

          {/* Matchup categories */}
          <div className="bg-white/[0.02] rounded-xl px-3 py-1 border border-white/[0.04]">
            <div className="text-[9px] font-bold text-white/25 uppercase tracking-widest text-center py-2 border-b border-white/[0.04] mb-1">
              Category Breakdown
            </div>
            {categories.map(cat => (
              <MatchupRow
                key={cat.id}
                category={cat}
                winner={categoryWinners[cat.id]}
              />
            ))}
          </div>

          {/* Value ratings */}
          <div className="grid grid-cols-2 gap-2">
            {([gameA, gameB] as const).map((g, i) => {
              const label = g.metrics.valueRating;
              const colors: Record<string, string> = {
                Excellent: '#10b981',
                Good: '#3b82f6',
                Fair: '#f59e0b',
                Poor: '#ef4444',
              };
              const roiLabel = getROIRating(g.metrics.roi);
              return (
                <div key={i} className="p-2.5 bg-white/[0.02] rounded-lg border border-white/[0.04] space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-white/30 uppercase tracking-wider">Value</span>
                    <span className="text-[10px] font-semibold" style={{ color: colors[label] }}>{label}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-white/30 uppercase tracking-wider">ROI</span>
                    <span className="text-[10px] font-semibold" style={{ color: colors[roiLabel] }}>{roiLabel}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-white/30 uppercase tracking-wider">Status</span>
                    <span className="text-[10px] text-white/60">{g.status}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Verdict */}
          <div className={clsx(
            'p-4 rounded-xl border text-center',
            overallWinner === 'tie'
              ? 'bg-white/[0.03] border-white/10'
              : 'bg-gradient-to-br from-purple-500/10 to-indigo-500/10 border-purple-500/20',
          )}>
            {overallWinner !== 'tie' && (
              <div className="flex items-center justify-center gap-1.5 mb-2">
                <Trophy size={14} className="text-yellow-400" />
                <span className="text-[10px] font-bold text-yellow-400 uppercase tracking-wider">
                  {overallWinner === 'a' ? gameA.name : gameB.name} wins
                </span>
                <Trophy size={14} className="text-yellow-400" />
              </div>
            )}
            <p className="text-sm font-bold text-white/90 mb-1">{verdict.headline}</p>
            <p className="text-xs text-white/40 leading-relaxed">{verdict.summary}</p>
          </div>

          {/* Bottom spacing */}
          <div className="h-2" />
        </div>
      </div>
    </div>
  );
}
