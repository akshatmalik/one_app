'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, TrendingDown, Flame, Star, Zap } from 'lucide-react';
import { Game } from '../lib/types';
import { getTotalHours, calculateCostPerHour, getValueRating, getGameStreak } from '../lib/calculations';

interface SessionImpactCardProps {
  /** The game object BEFORE the session was logged (used to compute before state). */
  gameBefore: Game;
  /** The session hours that were just logged. */
  hoursLogged: number;
  onDismiss: () => void;
}

type ValueTier = 'Excellent' | 'Good' | 'Fair' | 'Poor';

const TIER_ORDER: ValueTier[] = ['Poor', 'Fair', 'Good', 'Excellent'];
const TIER_THRESHOLD: Record<ValueTier, number> = {
  Excellent: 1,
  Good: 3,
  Fair: 5,
  Poor: Infinity,
};

const TIER_COLOR: Record<ValueTier, string> = {
  Excellent: 'text-emerald-400',
  Good: 'text-blue-400',
  Fair: 'text-yellow-400',
  Poor: 'text-red-400',
};

const TIER_BG: Record<ValueTier, string> = {
  Excellent: 'bg-emerald-400/10 border-emerald-400/20',
  Good: 'bg-blue-400/10 border-blue-400/20',
  Fair: 'bg-yellow-400/10 border-yellow-400/20',
  Poor: 'bg-red-400/10 border-red-400/20',
};

const TIER_ICON: Record<ValueTier, string> = {
  Excellent: '⭐',
  Good: '✅',
  Fair: '🟡',
  Poor: '🔴',
};

const DISMISS_DURATION_S = 6;

function hoursToNextTier(price: number, currentHours: number, currentTier: ValueTier): { label: string; hours: number; progress: number } | null {
  if (price <= 0) return null;
  const idx = TIER_ORDER.indexOf(currentTier);
  if (idx >= TIER_ORDER.length - 1) return null; // already Excellent
  const nextTier = TIER_ORDER[idx + 1];
  const threshold = TIER_THRESHOLD[nextTier]; // cost/hr threshold
  const hoursNeeded = price / threshold; // hours needed to hit that threshold
  const remaining = Math.ceil(hoursNeeded - currentHours);
  if (remaining <= 0) return null;
  const progress = Math.min(1, currentHours / hoursNeeded);
  return { label: nextTier, hours: remaining, progress };
}

/** Subtract one day from a YYYY-MM-DD string without UTC timezone drift. */
function subtractOneDay(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d); // local time construction
  date.setDate(date.getDate() - 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getGameStreakAfterLog(gameBefore: Game, todayStr: string): number {
  // Simulate the game having today's session included
  const existingDates = new Set((gameBefore.playLogs || []).map(l => l.date));
  existingDates.add(todayStr);
  const sorted = [...existingDates].sort().reverse();

  let streak = 0;
  let checkStr = todayStr;
  for (const dateStr of sorted) {
    if (dateStr === checkStr) {
      streak++;
      checkStr = subtractOneDay(checkStr);
    } else if (dateStr < checkStr) {
      break;
    }
  }
  return streak;
}

export function SessionImpactCard({ gameBefore, hoursLogged, onDismiss }: SessionImpactCardProps) {
  const [timeLeft, setTimeLeft] = useState(DISMISS_DURATION_S);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(interval);
          handleDismiss();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(onDismiss, 350);
  };

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const stats = useMemo(() => {
    const beforeHours = getTotalHours(gameBefore);
    const afterHours = beforeHours + hoursLogged;
    const price = gameBefore.price;

    const beforeCph = price > 0 && beforeHours > 0 ? calculateCostPerHour(price, beforeHours) : null;
    const afterCph = price > 0 && afterHours > 0 ? calculateCostPerHour(price, afterHours) : null;

    const beforeTier: ValueTier | null = beforeCph != null ? getValueRating(beforeCph) : null;
    const afterTier: ValueTier | null = afterCph != null ? getValueRating(afterCph) : null;

    const tierImproved = beforeTier && afterTier && TIER_ORDER.indexOf(afterTier) > TIER_ORDER.indexOf(beforeTier);
    const tierUnchanged = beforeTier && afterTier && beforeTier === afterTier;

    const cphDelta = (beforeCph != null && afterCph != null) ? beforeCph - afterCph : null;
    const cphPct = (beforeCph != null && beforeCph > 0 && cphDelta != null) ? (cphDelta / beforeCph) * 100 : null;

    const nextTierInfo = afterTier ? hoursToNextTier(price, afterHours, afterTier) : null;

    const streakAfter = getGameStreakAfterLog(gameBefore, todayStr);
    const streakBefore = getGameStreak(gameBefore).days;
    const streakGained = streakAfter > streakBefore;

    return {
      beforeHours,
      afterHours,
      beforeCph,
      afterCph,
      beforeTier,
      afterTier,
      tierImproved,
      tierUnchanged,
      cphDelta,
      cphPct,
      nextTierInfo,
      streakAfter,
      streakGained,
      showCph: price > 0 && afterHours > 0,
    };
  }, [gameBefore, hoursLogged, todayStr]);

  const progressPct = ((DISMISS_DURATION_S - timeLeft) / DISMISS_DURATION_S) * 100;

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
            onClick={handleDismiss}
          />

          {/* Card */}
          <motion.div
            key="card"
            initial={{ opacity: 0, scale: 0.85, y: 60 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 40 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            className="fixed inset-x-4 top-[50%] -translate-y-[50%] z-[61] mx-auto max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="rounded-2xl bg-[#121220] border border-white/10 shadow-2xl overflow-hidden">
              {/* Auto-dismiss progress bar */}
              <div className="h-0.5 bg-white/5 relative overflow-hidden">
                <motion.div
                  className="absolute left-0 top-0 h-full bg-purple-500/70"
                  initial={{ width: '0%' }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 1, ease: 'linear' }}
                />
              </div>

              {/* Header */}
              <div className="flex items-center gap-3 px-4 pt-4 pb-3">
                {gameBefore.thumbnail ? (
                  <img
                    src={gameBefore.thumbnail}
                    alt={gameBefore.name}
                    className="w-12 h-12 rounded-xl object-cover shrink-0 ring-1 ring-white/10"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-purple-900/40 flex items-center justify-center shrink-0">
                    <Zap size={20} className="text-purple-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-purple-400/80">Session Logged</p>
                  <p className="text-sm font-bold text-white truncate">{gameBefore.name}</p>
                  <p className="text-xs text-white/40">+{hoursLogged}h · {stats.afterHours.toFixed(1)}h total</p>
                </div>
                <button
                  onClick={handleDismiss}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-white/30 hover:text-white/60 transition-colors shrink-0"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Divider */}
              <div className="h-px bg-white/5 mx-4" />

              {/* Body */}
              <div className="px-4 py-3 space-y-3">
                {/* Cost per hour */}
                {stats.showCph && stats.afterCph != null && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-1.5">Cost Per Hour</p>
                    <div className="flex items-center gap-2">
                      {stats.beforeCph != null ? (
                        <>
                          <span className="text-base font-mono font-semibold text-white/40 line-through">
                            ${stats.beforeCph.toFixed(2)}
                          </span>
                          <TrendingDown size={14} className="text-emerald-400 shrink-0" />
                        </>
                      ) : null}
                      <motion.span
                        initial={{ scale: 1.2, color: '#a78bfa' }}
                        animate={{ scale: 1, color: '#ffffff' }}
                        transition={{ delay: 0.3, duration: 0.4 }}
                        className="text-2xl font-mono font-bold"
                      >
                        ${stats.afterCph.toFixed(2)}
                      </motion.span>
                      <span className="text-xs text-white/30">/hr</span>
                      {stats.cphPct != null && stats.cphPct > 0 && (
                        <span className="ml-auto text-xs font-semibold text-emerald-400">
                          ↓ {stats.cphPct.toFixed(0)}% better
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Value tier */}
                {stats.afterTier && (
                  <div>
                    {stats.tierImproved ? (
                      <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.2, type: 'spring', stiffness: 300 }}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${TIER_BG[stats.afterTier]}`}
                      >
                        <span className="text-xl">{TIER_ICON[stats.afterTier]}</span>
                        <div>
                          <p className="text-xs font-bold text-white">
                            Value tier improved!{' '}
                            <span className={TIER_COLOR[stats.beforeTier!]}>{stats.beforeTier}</span>
                            {' → '}
                            <span className={TIER_COLOR[stats.afterTier]}>{stats.afterTier}</span>
                          </p>
                          <p className="text-[10px] text-white/40">You unlocked better value territory</p>
                        </div>
                      </motion.div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{TIER_ICON[stats.afterTier]}</span>
                        <span className="text-xs text-white/50">Value: <span className={`font-semibold ${TIER_COLOR[stats.afterTier]}`}>{stats.afterTier}</span></span>
                        {stats.tierUnchanged && stats.beforeCph != null && stats.afterCph != null && (
                          <span className="ml-auto text-[10px] text-white/25">
                            {stats.beforeCph === 0 ? '' : `was $${stats.beforeCph.toFixed(2)}`}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Streak */}
                {stats.streakAfter >= 2 && (
                  <div className="flex items-center gap-2">
                    <Flame
                      size={16}
                      className={stats.streakAfter >= 7 ? 'text-red-400' : stats.streakAfter >= 5 ? 'text-orange-400' : 'text-amber-400'}
                    />
                    <span className="text-xs text-white/60">
                      <span className="font-bold text-white">{stats.streakAfter}-day streak</span> on this game
                      {stats.streakGained && stats.streakAfter === 2 && (
                        <span className="ml-1 text-amber-400">— streak started!</span>
                      )}
                      {stats.streakAfter === 7 && (
                        <span className="ml-1 text-red-400">🔥 one week!</span>
                      )}
                    </span>
                  </div>
                )}

                {/* Progress to next tier */}
                {stats.showCph && stats.nextTierInfo && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-white/30 uppercase tracking-widest">To {stats.nextTierInfo.label} value</span>
                      <span className="text-[10px] text-white/50 font-medium">+{stats.nextTierInfo.hours}h left</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${stats.nextTierInfo.progress * 100}%` }}
                        transition={{ delay: 0.4, duration: 0.8, ease: 'easeOut' }}
                        className={`h-full rounded-full ${
                          stats.nextTierInfo.label === 'Excellent' ? 'bg-emerald-500' :
                          stats.nextTierInfo.label === 'Good' ? 'bg-blue-500' : 'bg-yellow-500'
                        }`}
                      />
                    </div>
                  </div>
                )}

                {/* Free game / already excellent */}
                {stats.afterTier === 'Excellent' && stats.afterHours > 0 && (
                  <div className="flex items-center gap-2">
                    <Star size={14} className="text-emerald-400" />
                    <span className="text-xs text-emerald-400">Excellent value — one of your best-value games</span>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-4 pb-4">
                <button
                  onClick={handleDismiss}
                  className="w-full py-2 rounded-xl bg-white/5 text-white/40 text-xs font-medium hover:bg-white/10 hover:text-white/60 transition-colors"
                >
                  Dismiss ({timeLeft}s)
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
