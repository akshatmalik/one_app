'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Check, ChevronRight, X, Flame, Trophy } from 'lucide-react';
import { getDailyChallenge, getTodayHoursLogged, DailyChallenge } from '../lib/calculations';
import { Game } from '../lib/types';
import clsx from 'clsx';

interface DailyChallengeCardProps {
  games: Game[];
  userId?: string;
  onTabChange: (tab: string) => void;
  onOpenGameId?: (id: string) => void;
}

// ── Storage helpers ────────────────────────────────────────────────────────

function uid2key(suffix: string, uid: string) {
  return `daily-challenge-${suffix}-${uid}`;
}

function todayStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

interface ChallengeState {
  date: string;
  completed: boolean;
  completedAt?: string;
}

interface HistoryEntry {
  date: string;
  completed: boolean;
}

function ssLoad(uid: string): ChallengeState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(uid2key('state', uid));
    return raw ? (JSON.parse(raw) as ChallengeState) : null;
  } catch { return null; }
}

function ssSave(uid: string, s: ChallengeState) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(uid2key('state', uid), JSON.stringify(s)); } catch { /* quota */ }
}

function shLoad(uid: string): HistoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(uid2key('history', uid));
    return raw ? (JSON.parse(raw) as HistoryEntry[]) : [];
  } catch { return []; }
}

function shSave(uid: string, h: HistoryEntry[]) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(uid2key('history', uid), JSON.stringify(h.slice(-60))); } catch { /* quota */ }
}

// ── Streak ─────────────────────────────────────────────────────────────────

function computeStreak(history: HistoryEntry[], today: string, todayCompleted: boolean): number {
  const completed = new Set(history.filter(h => h.completed).map(h => h.date));
  if (todayCompleted) completed.add(today);

  let count = 0;
  const d = new Date();
  while (true) {
    const s = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (completed.has(s)) {
      count++;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }
  return count;
}

// ── Component ──────────────────────────────────────────────────────────────

export function DailyChallengeCard({
  games,
  userId,
  onTabChange,
  onOpenGameId,
}: DailyChallengeCardProps) {
  const uid = userId || 'local';
  const today = todayStr();

  // Challenge is stable for the day — seeded by date + library size
  const challenge = useMemo<DailyChallenge>(
    () => getDailyChallenge(games, today),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [today, games.length]
  );

  // Persisted completion state
  const [state, setState] = useState<ChallengeState>(() => {
    const saved = ssLoad(uid);
    return saved?.date === today ? saved : { date: today, completed: false };
  });

  // History for the 7-day strip
  const [history, setHistory] = useState<HistoryEntry[]>(() => shLoad(uid));

  // UI state
  const [dismissed, setDismissed] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);

  // Auto-detect: session-logging challenges complete when hours threshold met
  const todayHours = useMemo(() => getTodayHoursLogged(games), [games]);
  const autoMet =
    !state.completed &&
    !!challenge.autoDetect &&
    todayHours >= (challenge.autoDetect.minHours ?? 0);

  const isCompleted = state.completed || autoMet;

  // Mark the challenge complete
  const complete = useCallback(
    (auto: boolean) => {
      if (state.completed) return;
      const now = new Date().toISOString();
      const newState: ChallengeState = { date: today, completed: true, completedAt: now };
      setState(newState);
      ssSave(uid, newState);

      const newHistory = [
        ...history.filter(h => h.date !== today),
        { date: today, completed: true },
      ];
      setHistory(newHistory);
      shSave(uid, newHistory);

      if (!auto) {
        setJustCompleted(true);
        setTimeout(() => setJustCompleted(false), 3000);
      }
    },
    [state.completed, today, uid, history]
  );

  // Auto-complete fires once when session data crosses threshold
  useEffect(() => {
    if (autoMet) {
      complete(true);
      setJustCompleted(true);
      setTimeout(() => setJustCompleted(false), 3000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoMet]);

  const handleCTA = () => {
    if (challenge.ctaTab) {
      onTabChange(challenge.ctaTab);
      complete(false);
    } else if (challenge.targetGameId && onOpenGameId) {
      onOpenGameId(challenge.targetGameId);
    } else {
      complete(false);
    }
  };

  // Streak
  const streak = computeStreak(history, today, isCompleted);

  // 7-day history dots
  const last7 = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const isToday = ds === today;
      const entry = history.find(h => h.date === ds);
      return {
        ds,
        isToday,
        completed: isToday ? isCompleted : (entry?.completed ?? false),
      };
    });
  }, [history, today, isCompleted]);

  if (dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="daily-challenge"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ type: 'spring', stiffness: 280, damping: 22 }}
        className="mb-4"
      >
        <div
          className={clsx(
            'relative rounded-xl border overflow-hidden',
            isCompleted
              ? 'bg-gradient-to-br from-emerald-500/8 to-green-500/5 border-emerald-500/20'
              : 'bg-gradient-to-br from-purple-500/8 to-indigo-500/5 border-purple-500/20'
          )}
        >
          {/* ── Header bar ── */}
          <div className="flex items-center justify-between px-4 pt-3 pb-0">
            <div className="flex items-center gap-1.5">
              <Zap
                size={11}
                className={isCompleted ? 'text-emerald-400' : 'text-purple-400'}
              />
              <span
                className={clsx(
                  'text-[10px] font-bold uppercase tracking-widest',
                  isCompleted ? 'text-emerald-400' : 'text-purple-400'
                )}
              >
                Daily Challenge
              </span>
            </div>

            <div className="flex items-center gap-2">
              {streak > 0 && (
                <motion.span
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  className="flex items-center gap-1 text-[10px] text-orange-400 font-semibold"
                >
                  <Flame size={10} className="text-orange-400" />
                  {streak}-day streak
                </motion.span>
              )}
              <button
                onClick={() => setDismissed(true)}
                className="p-1 text-white/20 hover:text-white/40 transition-colors"
                aria-label="Dismiss challenge"
              >
                <X size={11} />
              </button>
            </div>
          </div>

          {/* ── Challenge body ── */}
          <div className="px-4 py-3">
            <AnimatePresence mode="wait">
              {justCompleted ? (
                <motion.div
                  key="complete-flash"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-9 h-9 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                    <Trophy size={16} className="text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-emerald-300">
                      Challenge Complete! +{challenge.xp} XP
                    </p>
                    <p className="text-xs text-white/35 mt-0.5">
                      Come back tomorrow for a new challenge
                    </p>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="challenge-body"
                  initial={{ opacity: 1 }}
                  animate={{ opacity: 1 }}
                  className="flex items-start gap-3"
                >
                  {/* Icon */}
                  <div
                    className={clsx(
                      'w-9 h-9 rounded-lg flex items-center justify-center text-lg shrink-0 mt-0.5',
                      isCompleted ? 'bg-emerald-500/15' : 'bg-purple-500/12'
                    )}
                  >
                    {isCompleted ? '✅' : challenge.icon}
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Title + XP badge */}
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span
                        className={clsx(
                          'text-sm font-semibold',
                          isCompleted ? 'text-white/40 line-through' : 'text-white/90'
                        )}
                      >
                        {challenge.title}
                      </span>
                      <span
                        className={clsx(
                          'text-[9px] px-1.5 py-0.5 rounded font-bold shrink-0',
                          isCompleted
                            ? 'bg-emerald-500/15 text-emerald-500/70'
                            : 'bg-purple-500/15 text-purple-400'
                        )}
                      >
                        +{challenge.xp} XP
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-[11px] text-white/45 leading-relaxed">
                      {challenge.description}
                    </p>

                    {/* Target game thumbnail (for game-specific challenges) */}
                    {!isCompleted && challenge.targetGameThumbnail && (
                      <div className="flex items-center gap-2 mt-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={challenge.targetGameThumbnail}
                          alt={challenge.targetGameName ?? ''}
                          className="w-8 h-8 rounded-md object-cover opacity-70"
                          loading="lazy"
                        />
                        <span className="text-[10px] text-white/30 truncate max-w-[120px]">
                          {challenge.targetGameName}
                        </span>
                      </div>
                    )}

                    {/* Action buttons */}
                    {!isCompleted && (
                      <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                        <button
                          onClick={handleCTA}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600/75 hover:bg-purple-600 text-white text-xs font-medium rounded-lg transition-all active:scale-95"
                        >
                          {challenge.cta}
                          <ChevronRight size={11} />
                        </button>

                        {/* Manual "Done" for non-auto, non-tab challenges */}
                        {!challenge.autoDetect && !challenge.ctaTab && (
                          <button
                            onClick={() => complete(false)}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-white/5 hover:bg-white/10 text-white/35 hover:text-white/60 text-xs rounded-lg transition-all"
                          >
                            <Check size={10} />
                            Done
                          </button>
                        )}

                        {/* Progress hint for auto-detect */}
                        {challenge.autoDetect && challenge.autoDetect.minHours > 0 && (
                          <span className="text-[10px] text-white/25 ml-1">
                            {todayHours.toFixed(1)}h / {challenge.autoDetect.minHours}h today
                          </span>
                        )}
                      </div>
                    )}

                    {/* Completion timestamp */}
                    {isCompleted && !justCompleted && (
                      <p className="text-[10px] text-emerald-500/50 mt-1.5 flex items-center gap-1">
                        <Check size={9} strokeWidth={3} />
                        {state.completedAt
                          ? `Completed at ${new Date(state.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                          : 'Completed today'}
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── 7-day history strip ── */}
          <div className="px-4 pb-3 flex items-center gap-1">
            <span className="text-[9px] text-white/20 mr-1.5 shrink-0">7 days</span>
            {last7.map(({ ds, isToday, completed: dayDone }) => (
              <div
                key={ds}
                title={ds}
                className={clsx(
                  'w-4 h-4 rounded-[3px] flex items-center justify-center transition-all',
                  dayDone
                    ? 'bg-emerald-500/40'
                    : isToday
                      ? 'bg-purple-500/15 ring-1 ring-purple-500/30'
                      : 'bg-white/[0.03]'
                )}
              >
                {dayDone ? (
                  <Check size={8} strokeWidth={3} className="text-emerald-400" />
                ) : isToday ? (
                  <div className="w-1 h-1 rounded-full bg-purple-400/40" />
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
