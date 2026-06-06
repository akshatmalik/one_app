'use client';

import { useEffect, useState } from 'react';
import { X, Clock, TrendingUp, Target, Zap } from 'lucide-react';
import { Game } from '../lib/types';
import {
  getTotalHours,
  getGameStreak,
  getNextMilestone,
  getContextualWhisper,
  getValueRating,
} from '../lib/calculations';
import clsx from 'clsx';

export interface SessionDebriefPayload {
  game: Game;
  allGames: Game[];
  sessionHours: number;
  beforeHours: number;
  isFirstSession?: boolean;
}

const VALUE_CONFIG: Record<string, { color: string; bg: string; border: string; bar: string }> = {
  Excellent: {
    color: 'text-emerald-400',
    bg: 'bg-emerald-400/10',
    border: 'border-emerald-400/30',
    bar: 'bg-emerald-400/50',
  },
  Good: {
    color: 'text-blue-400',
    bg: 'bg-blue-400/10',
    border: 'border-blue-400/30',
    bar: 'bg-blue-400/50',
  },
  Fair: {
    color: 'text-yellow-400',
    bg: 'bg-yellow-400/10',
    border: 'border-yellow-400/30',
    bar: 'bg-yellow-400/50',
  },
  Poor: {
    color: 'text-red-400',
    bg: 'bg-red-400/10',
    border: 'border-red-400/30',
    bar: 'bg-red-400/50',
  },
};

const TIER_ORDER = ['Excellent', 'Good', 'Fair', 'Poor'] as const;

const AUTO_DISMISS_MS = 7000;

function fmtHours(h: number) {
  return h % 1 === 0 ? `${h}` : h.toFixed(1);
}

export function SessionDebrief({
  payload,
  onClose,
}: {
  payload: SessionDebriefPayload;
  onClose: () => void;
}) {
  const { game, allGames, sessionHours, beforeHours, isFirstSession } = payload;
  const [visible, setVisible] = useState(false);
  const [timeLeft, setTimeLeft] = useState(100);

  const afterHours = getTotalHours(game);
  const streak = getGameStreak(game);
  const nextMilestone = getNextMilestone(game, allGames);
  const whisper = allGames.length > 1 ? getContextualWhisper(game, allGames) : null;

  const hasPricedValue = game.price > 0 && !game.acquiredFree && afterHours > 0;
  const afterCph = hasPricedValue ? game.price / afterHours : 0;
  const beforeCph = hasPricedValue && beforeHours > 0 ? game.price / beforeHours : 0;
  const afterTier = hasPricedValue ? getValueRating(afterCph) : null;
  const beforeTier =
    hasPricedValue && beforeCph > 0 ? getValueRating(beforeCph) : null;
  const tierUpgraded =
    afterTier &&
    beforeTier &&
    afterTier !== beforeTier &&
    TIER_ORDER.indexOf(afterTier) < TIER_ORDER.indexOf(beforeTier);

  // Progress bar toward next value tier threshold
  let valueBarPercent = 0;
  if (hasPricedValue && afterCph > 0) {
    const THRESHOLDS = [1, 3, 5] as const;
    const nextThreshold = THRESHOLDS.find(t => afterCph > t) ?? null;
    if (nextThreshold !== null) {
      const hoursNeeded = game.price / nextThreshold;
      valueBarPercent = Math.min(99, Math.round((afterHours / hoursNeeded) * 100));
    } else {
      valueBarPercent = 100;
    }
  }

  const tierConfig = afterTier ? VALUE_CONFIG[afterTier] : null;

  useEffect(() => {
    const showTimer = setTimeout(() => setVisible(true), 40);
    const step = 100 / (AUTO_DISMISS_MS / 50);
    const interval = setInterval(() => {
      setTimeLeft(p => Math.max(0, p - step));
    }, 50);
    const dismissTimer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300);
    }, AUTO_DISMISS_MS);
    return () => {
      clearTimeout(showTimer);
      clearInterval(interval);
      clearTimeout(dismissTimer);
    };
  }, [onClose]);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 300);
  };

  return (
    <div
      className={clsx(
        'fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-4',
        'bg-black/75 backdrop-blur-sm transition-opacity duration-300',
        visible ? 'opacity-100' : 'opacity-0 pointer-events-none',
      )}
      onClick={handleClose}
    >
      <div
        className={clsx(
          'relative w-full max-w-sm overflow-hidden rounded-2xl shadow-2xl',
          'border border-white/10 bg-[#0f0f14]',
          'transition-all duration-300',
          visible ? 'translate-y-0 scale-100' : 'translate-y-6 scale-95',
        )}
        onClick={e => e.stopPropagation()}
      >
        {/* Game thumbnail header */}
        <div className="relative h-28 overflow-hidden">
          {game.thumbnail ? (
            <img
              src={game.thumbnail}
              alt={game.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-violet-800 to-indigo-900">
              <span className="text-5xl">🎮</span>
            </div>
          )}
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f14] via-[#0f0f14]/30 to-transparent" />

          {/* Labels */}
          <div className="absolute bottom-3 left-4 right-10">
            <div
              className={clsx(
                'mb-0.5 text-[10px] font-bold uppercase tracking-widest',
                isFirstSession ? 'text-yellow-400' : 'text-emerald-400',
              )}
            >
              {isFirstSession ? '🎮 First Session!' : '✓ Session Logged'}
            </div>
            <div className="truncate pr-2 text-base font-bold leading-tight text-white">
              {game.name}
            </div>
          </div>

          <button
            onClick={handleClose}
            className="absolute right-2.5 top-2.5 rounded-lg bg-black/30 p-1.5 text-white/60 transition-colors hover:bg-black/50 hover:text-white"
          >
            <X size={14} />
          </button>
        </div>

        {/* Session hours hero row */}
        <div className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-3">
          <div className="flex items-baseline gap-1.5">
            <Clock size={14} className="mb-0.5 shrink-0 text-emerald-400" />
            <span className="text-3xl font-black tabular-nums text-emerald-400">
              +{fmtHours(sessionHours)}h
            </span>
          </div>
          <div className="ml-auto text-right">
            <div className="text-[10px] uppercase tracking-wide text-white/30">Total</div>
            <div className="text-sm font-semibold tabular-nums text-white/55">
              {fmtHours(afterHours)}h
            </div>
          </div>
        </div>

        <div className="space-y-2.5 px-4 py-3">

          {/* ── Value progress ── */}
          {hasPricedValue && tierConfig && (
            <div
              className={clsx(
                'rounded-xl border p-3',
                tierConfig.bg,
                tierConfig.border,
              )}
            >
              <div className="mb-1.5 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-white/45">
                  <TrendingUp size={12} />
                  <span>Cost per hour</span>
                </div>
                {tierUpgraded && (
                  <span
                    className={clsx(
                      'animate-pulse text-[10px] font-bold uppercase tracking-wide',
                      tierConfig.color,
                    )}
                  >
                    ↑ Tier upgrade!
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {beforeCph > 0 && Math.abs(beforeCph - afterCph) > 0.01 && (
                  <span className="text-sm text-white/25 line-through">
                    ${beforeCph.toFixed(2)}/hr
                  </span>
                )}
                <span className={clsx('text-xl font-black tabular-nums', tierConfig.color)}>
                  ${afterCph.toFixed(2)}/hr
                </span>
                <span
                  className={clsx(
                    'ml-auto rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                    tierConfig.bg,
                    tierConfig.border,
                    tierConfig.color,
                  )}
                >
                  {afterTier}
                </span>
              </div>

              {valueBarPercent < 100 && (
                <div className="mt-2">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className={clsx('h-full rounded-full', tierConfig.bar)}
                      style={{
                        width: `${valueBarPercent}%`,
                        transition: 'width 1.2s ease-out',
                      }}
                    />
                  </div>
                  <div className="mt-1 text-[10px] text-white/25">
                    {valueBarPercent}% toward next tier
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Active streak ── */}
          {streak.isActive && streak.days >= 2 && (
            <div className="flex items-center gap-3 rounded-xl border border-orange-500/20 bg-orange-500/10 p-3">
              <span className="text-2xl">
                {streak.days >= 7 ? '🔥🔥🔥' : streak.days >= 4 ? '🔥🔥' : '🔥'}
              </span>
              <div>
                <div className="text-sm font-bold text-orange-400">
                  {streak.days}-day streak
                </div>
                <div className="text-[11px] text-white/35">
                  {streak.days >= 7
                    ? 'Legendary consistency!'
                    : streak.days >= 4
                    ? 'Keep the momentum!'
                    : 'Keep it going!'}
                </div>
              </div>
              {/* Mini dot chain */}
              <div className="ml-auto flex gap-0.5">
                {Array.from({ length: Math.min(streak.days, 7) }).map((_, i) => (
                  <div
                    key={i}
                    className="h-2 w-2 rounded-full bg-orange-400/60"
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── Next milestone ── */}
          {nextMilestone && (
            <div className="rounded-xl border border-white/8 bg-white/[0.04] p-3">
              <div className="mb-1.5 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-white/40">
                  <Target size={12} className="text-purple-400" />
                  <span>Next milestone</span>
                </div>
                <span className="text-[11px] font-bold text-purple-400">
                  {nextMilestone.remaining}h to go
                </span>
              </div>
              <div className="mb-1.5 text-sm font-semibold text-white/75">
                {nextMilestone.description}
              </div>
              <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-purple-500/50"
                  style={{
                    width: `${nextMilestone.progressPercent}%`,
                    transition: 'width 1.2s ease-out 0.25s',
                  }}
                />
              </div>
            </div>
          )}

          {/* ── Contextual whisper ── */}
          {whisper && whisper.priority >= 5 && (
            <div className="flex items-start gap-2 px-1 pb-0.5">
              <Zap size={11} className="mt-0.5 shrink-0 text-yellow-400" />
              <p className="text-[11px] italic leading-relaxed text-white/30">
                {whisper.text}
              </p>
            </div>
          )}

        </div>

        {/* Auto-dismiss progress bar */}
        <div className="h-0.5 bg-white/[0.04]">
          <div
            className="h-full bg-white/20"
            style={{ width: `${timeLeft}%`, transition: 'none' }}
          />
        </div>
      </div>
    </div>
  );
}
