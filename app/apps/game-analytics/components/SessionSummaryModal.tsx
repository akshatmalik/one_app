'use client';

import { useEffect, useState } from 'react';
import { Check, Flame, ChevronRight, X, Zap } from 'lucide-react';
import { Game, PlayLog } from '../lib/types';
import { calculateCostPerHour, getValueRating, getCurrentGamingStreak } from '../lib/calculations';
import clsx from 'clsx';

const HOUR_MILESTONES = [5, 10, 25, 50, 100, 200, 500, 1000];

// Thresholds matching getValueRating: Excellent ≤1, Good ≤3, Fair ≤5, Poor >5
const VALUE_TIER_THRESHOLDS: Record<string, number | null> = {
  Poor: 5,
  Fair: 3,
  Good: 1,
  Excellent: null,
};

const VALUE_TIER_COLORS: Record<string, string> = {
  Excellent: 'text-emerald-400',
  Good: 'text-blue-400',
  Fair: 'text-yellow-400',
  Poor: 'text-red-400',
};

const VALUE_TIER_ORDER = ['Poor', 'Fair', 'Good', 'Excellent'] as const;

function getHoursToNextTier(price: number, currentHours: number, currentTier: string): number | null {
  const threshold = VALUE_TIER_THRESHOLDS[currentTier];
  if (threshold === null || threshold === undefined) return null;
  const needed = price / threshold;
  const remaining = needed - currentHours;
  return remaining > 0 ? Math.round(remaining * 10) / 10 : null;
}

export interface SessionSummaryData {
  game: Game;
  previousLogs: PlayLog[];
  newLogs: PlayLog[];
  isFirstSession: boolean;
}

interface SessionSummaryModalProps {
  data: SessionSummaryData;
  allGames: Game[];
  onClose: () => void;
}

export function SessionSummaryModal({ data, allGames, onClose }: SessionSummaryModalProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const showTimer = setTimeout(() => setVisible(true), 30);
    const dismissTimer = setTimeout(() => handleClose(), 9000);
    return () => { clearTimeout(showTimer); clearTimeout(dismissTimer); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 320);
  };

  const { game, previousLogs, newLogs, isFirstSession } = data;

  // Compute hours before and after
  const prevLogHours = previousLogs.reduce((s, l) => s + l.hours, 0);
  const newLogHours = newLogs.reduce((s, l) => s + l.hours, 0);
  const prevTotalHours = game.hours + prevLogHours;
  const newTotalHours = game.hours + newLogHours;
  const addedHours = Math.max(0, newTotalHours - prevTotalHours);

  // Value tier before/after (only meaningful if game has a price)
  const hasPrice = game.price > 0;
  const prevCPH = hasPrice ? calculateCostPerHour(game.price, prevTotalHours) : 0;
  const newCPH = hasPrice ? calculateCostPerHour(game.price, newTotalHours) : 0;
  const prevTier = getValueRating(prevCPH);
  const newTier = getValueRating(newCPH);
  const tierImproved =
    hasPrice &&
    newTotalHours > 0 &&
    prevTier !== newTier &&
    VALUE_TIER_ORDER.indexOf(newTier) > VALUE_TIER_ORDER.indexOf(prevTier);

  // Hours milestones crossed
  const hitMilestone = HOUR_MILESTONES.find(m => prevTotalHours < m && newTotalHours >= m);

  // Next hours milestone
  const nextMilestone = HOUR_MILESTONES.find(m => m > newTotalHours);
  const prevMilestone = nextMilestone
    ? HOUR_MILESTONES[HOUR_MILESTONES.indexOf(nextMilestone) - 1] ?? 0
    : null;
  const milestoneProgress =
    nextMilestone !== undefined && prevMilestone !== null
      ? Math.min(
          100,
          ((newTotalHours - prevMilestone) / (nextMilestone - prevMilestone)) * 100,
        )
      : null;

  // Hours needed to reach next value tier
  const hoursToNextTier = hasPrice && newTotalHours > 0 ? getHoursToNextTier(game.price, newTotalHours, newTier) : null;

  // Gaming streak
  const streak = getCurrentGamingStreak(allGames);

  // Don't render if nothing meaningful was added
  if (addedHours <= 0) return null;

  const addedLabel =
    addedHours < 1 ? `${Math.round(addedHours * 60)} min` : `${addedHours % 1 === 0 ? addedHours : addedHours.toFixed(1)}h`;

  return (
    <div
      className={clsx(
        'fixed inset-x-0 bottom-0 z-[9999] transition-transform duration-300 ease-out pointer-events-none',
        visible ? 'translate-y-0' : 'translate-y-full',
      )}
    >
      <div className="pointer-events-auto mx-auto max-w-lg">
        <div className="bg-[#0d0d18] border border-white/10 border-b-0 rounded-t-2xl shadow-2xl px-4 pt-4 pb-6">

          {/* Header row */}
          <div className="flex items-center gap-3 mb-4">
            {game.thumbnail ? (
              <img
                src={game.thumbnail}
                alt=""
                className="w-10 h-10 rounded-lg object-cover flex-shrink-0 ring-1 ring-white/10"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                <span className="text-xl">🎮</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <Check size={13} className="text-emerald-400" />
                <span className="text-[11px] font-medium text-emerald-400 uppercase tracking-wide">Session logged</span>
              </div>
              <p className="text-sm font-bold text-white/90 truncate">{game.name}</p>
            </div>
            <button
              onClick={handleClose}
              className="p-1 text-white/20 hover:text-white/60 transition-colors flex-shrink-0"
              aria-label="Dismiss"
            >
              <X size={15} />
            </button>
          </div>

          {/* Main hero: hours added */}
          <div className="text-center mb-4">
            <div className="text-4xl font-black text-white tracking-tight">+{addedLabel}</div>
            <div className="text-xs text-white/35 mt-0.5">
              {newTotalHours % 1 === 0 ? newTotalHours : newTotalHours.toFixed(1)}h total on this game
            </div>
          </div>

          {/* Milestone badges */}
          {(isFirstSession || hitMilestone !== undefined || tierImproved) && (
            <div className="flex flex-wrap gap-1.5 justify-center mb-4">
              {isFirstSession && (
                <span className="px-3 py-1 bg-purple-500/20 border border-purple-500/30 text-purple-300 text-[11px] font-medium rounded-full">
                  🎮 Journey begins!
                </span>
              )}
              {hitMilestone !== undefined && (
                <span className="px-3 py-1 bg-yellow-500/15 border border-yellow-500/25 text-yellow-300 text-[11px] font-medium rounded-full">
                  ⏱️ {hitMilestone}h milestone!
                </span>
              )}
              {tierImproved && (
                <span className={clsx(
                  'px-3 py-1 border text-[11px] font-medium rounded-full',
                  newTier === 'Excellent'
                    ? 'bg-emerald-500/15 border-emerald-500/25 text-emerald-300'
                    : newTier === 'Good'
                      ? 'bg-blue-500/15 border-blue-500/25 text-blue-300'
                      : 'bg-yellow-500/15 border-yellow-500/25 text-yellow-300',
                )}>
                  {newTier === 'Excellent' ? '💎' : newTier === 'Good' ? '⬆️' : '📈'} Crossed to {newTier} value!
                </span>
              )}
            </div>
          )}

          {/* Value update row */}
          {hasPrice && prevTotalHours > 0 && (
            <div className="flex items-center justify-between px-3 py-2.5 bg-white/[0.03] rounded-xl mb-2.5">
              <span className="text-xs text-white/35">Cost / hr</span>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-white/25 line-through">${prevCPH.toFixed(2)}</span>
                <ChevronRight size={11} className="text-white/15" />
                <span className={clsx('text-sm font-bold', VALUE_TIER_COLORS[newTier])}>
                  ${newCPH.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {/* Streak */}
          {streak >= 2 && (
            <div className="flex items-center gap-2 px-3 py-2.5 bg-orange-500/5 border border-orange-500/10 rounded-xl mb-2.5">
              <Flame size={14} className="text-orange-400 flex-shrink-0" />
              <span className="text-sm text-white/60">{streak}-day gaming streak</span>
            </div>
          )}

          {/* Progress toward next milestone */}
          {(milestoneProgress !== null || hoursToNextTier !== null) && (
            <div className="space-y-1.5">
              {/* Next hours milestone */}
              {milestoneProgress !== null && nextMilestone !== undefined && (
                <div>
                  <div className="flex justify-between text-[10px] text-white/25 mb-1">
                    <span className="flex items-center gap-1">
                      <Zap size={9} />
                      Next milestone: {nextMilestone}h
                    </span>
                    <span>{(nextMilestone - newTotalHours).toFixed(1)}h to go</span>
                  </div>
                  <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-500/60 rounded-full transition-all duration-1000"
                      style={{ width: `${milestoneProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Hours to next value tier */}
              {hoursToNextTier !== null && !tierImproved && (
                <p className="text-[10px] text-white/25 text-center">
                  {hoursToNextTier}h more to reach{' '}
                  {VALUE_TIER_ORDER[VALUE_TIER_ORDER.indexOf(newTier as typeof VALUE_TIER_ORDER[number]) + 1] ?? ''}{' '}
                  value
                </p>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
