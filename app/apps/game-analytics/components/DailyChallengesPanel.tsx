'use client';

import { useMemo, useState } from 'react';
import { Zap, CheckCircle2, Circle, ChevronDown, ChevronUp } from 'lucide-react';
import { Game } from '../lib/types';
import { getTotalHours, parseLocalDate } from '../lib/calculations';
import clsx from 'clsx';

// ── Types ──────────────────────────────────────────────────────────────────

type ChallengeType =
  | 'log_session'
  | 'deep_session'
  | 'return_to_game'
  | 'start_new_game'
  | 'hit_milestone'
  | 'value_milestone'
  | 'weekly_sessions'
  | 'marathon';

interface Challenge {
  id: string;
  type: ChallengeType;
  emoji: string;
  title: string;
  desc: string;
  xp: number;
  done: boolean;
  tier: 1 | 2 | 3; // 1=Easy, 2=Medium, 3=Hard
}

// ── Pure helpers ───────────────────────────────────────────────────────────

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Deterministic integer in [0, max) from a seed. */
function pick(seed: number, salt: number, max: number): number {
  const h = ((seed + salt) * 1664525 + 1013904223) & 0x7fffffff;
  return h % max;
}

function dateSeed(): number {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

/** Days elapsed since a date string (YYYY-MM-DD). */
function daysSince(dateStr: string): number {
  try {
    const d = parseLocalDate(dateStr);
    return Math.floor((Date.now() - d.getTime()) / 86400000);
  } catch {
    return 0;
  }
}

// ── Challenge generation ───────────────────────────────────────────────────

function buildChallenges(games: Game[]): Challenge[] {
  const today = todayStr();
  const seed = dateSeed();
  const owned = games.filter(g => g.status !== 'Wishlist');

  if (owned.length === 0) return [];

  // ── Shared detection helpers ────────────────────────────────────────────

  const loggedToday = owned.some(g =>
    (g.playLogs ?? []).some(l => l.date === today)
  );

  const deepToday = owned.some(g =>
    (g.playLogs ?? []).some(l => l.date === today && l.hours >= 2)
  );

  const marathonToday = owned.some(g =>
    (g.playLogs ?? []).some(l => l.date === today && l.hours >= 3)
  );

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekSessions = owned.reduce((n, g) =>
    n + (g.playLogs ?? []).filter(l => {
      try { return parseLocalDate(l.date) >= weekAgo; } catch { return false; }
    }).length
  , 0);

  // ── Challenge 1 — Easy: Always "log a session today" ───────────────────

  const c1: Challenge = {
    id: 'log-today',
    type: 'log_session',
    emoji: '⏱️',
    title: 'Show up',
    desc: 'Log any gaming session today',
    xp: 10,
    done: loggedToday,
    tier: 1,
  };

  // ── Challenge 2 — Medium: rotates daily ────────────────────────────────

  let c2: Challenge;

  const medPick = pick(seed, 42, 4);

  if (medPick === 0) {
    // Deep focus: 2+ hour session
    c2 = {
      id: 'deep-session',
      type: 'deep_session',
      emoji: '🎯',
      title: 'Deep focus',
      desc: 'Log a single session of 2+ hours',
      xp: 25,
      done: deepToday,
      tier: 2,
    };
  } else if (medPick === 1) {
    // Return to a stalled In Progress game
    const stalled = owned.filter(g => {
      if (g.status !== 'In Progress') return false;
      const logs = g.playLogs ?? [];
      if (logs.length === 0) return true;
      const last = logs.reduce((a, b) => (a.date > b.date ? a : b));
      return daysSince(last.date) >= 7;
    });

    if (stalled.length > 0) {
      const target = stalled[pick(seed, 100, stalled.length)];
      const playedTarget = (target.playLogs ?? []).some(l => l.date === today);
      c2 = {
        id: `return-${target.id}`,
        type: 'return_to_game',
        emoji: '🔄',
        title: 'Return visit',
        desc: `Catch up with ${target.name}`,
        xp: 20,
        done: playedTarget,
        tier: 2,
      };
    } else {
      // Fallback: deep session
      c2 = {
        id: 'deep-session-fb',
        type: 'deep_session',
        emoji: '🎯',
        title: 'Deep focus',
        desc: 'Log a single session of 2+ hours',
        xp: 25,
        done: deepToday,
        tier: 2,
      };
    }
  } else if (medPick === 2) {
    // Start a not-started game
    const unstarted = owned.filter(g => g.status === 'Not Started');
    if (unstarted.length > 0) {
      const maxChoices = Math.min(unstarted.length, 6);
      const target = unstarted[pick(seed, 200, maxChoices)];
      const nowStarted = (target.playLogs ?? []).some(l => l.date === today);
      c2 = {
        id: `start-${target.id}`,
        type: 'start_new_game',
        emoji: '🚀',
        title: 'First move',
        desc: `Start ${target.name} — it's been waiting`,
        xp: 25,
        done: nowStarted,
        tier: 2,
      };
    } else {
      c2 = {
        id: 'deep-session-fb2',
        type: 'deep_session',
        emoji: '🎯',
        title: 'Deep focus',
        desc: 'Log a single session of 2+ hours',
        xp: 25,
        done: deepToday,
        tier: 2,
      };
    }
  } else {
    // Weekly pace: 3 sessions this week
    c2 = {
      id: 'week-3',
      type: 'weekly_sessions',
      emoji: '📅',
      title: 'Steady pace',
      desc: `Log 3 sessions this week (${Math.min(weekSessions, 3)}/3 done)`,
      xp: 20,
      done: weekSessions >= 3,
      tier: 2,
    };
  }

  // ── Challenge 3 — Hard: milestone / bigger task ─────────────────────────

  let c3: Challenge;

  const hardPick = pick(seed, 99, 5);

  if (hardPick === 0) {
    // Century Club approaching (85–99 h)
    const approaching = owned.filter(g => {
      const h = getTotalHours(g);
      return h >= 85 && h < 100;
    });
    if (approaching.length > 0) {
      const target = approaching[pick(seed, 300, approaching.length)];
      const currentH = getTotalHours(target);
      const remaining = Math.max(0, 100 - currentH).toFixed(1);
      c3 = {
        id: `century-${target.id}`,
        type: 'hit_milestone',
        emoji: '💯',
        title: 'Century Club calling',
        desc: `${remaining}h left to hit 100h on ${target.name}`,
        xp: 50,
        done: getTotalHours(owned.find(x => x.id === target.id) ?? target) >= 100,
        tier: 3,
      };
    } else {
      c3 = marathonFallback(today, owned, marathonToday);
    }
  } else if (hardPick === 1) {
    // Hit Good value (≤ $3/hr) on a game that's close
    const closeToGood = owned.filter(g => {
      const h = getTotalHours(g);
      if (h === 0 || g.price <= 0) return false;
      const cph = g.price / h;
      const hrsNeeded = g.price / 3 - h;
      return cph > 3 && hrsNeeded > 0 && hrsNeeded <= 6;
    });
    if (closeToGood.length > 0) {
      const maxChoices = Math.min(closeToGood.length, 4);
      const target = closeToGood[pick(seed, 400, maxChoices)];
      const hrsNeeded = Math.max(0, target.price / 3 - getTotalHours(target)).toFixed(1);
      c3 = {
        id: `value-${target.id}`,
        type: 'value_milestone',
        emoji: '💰',
        title: "Money well spent",
        desc: `${hrsNeeded}h to reach Good value (≤$3/hr) on ${target.name}`,
        xp: 40,
        done: getTotalHours(owned.find(x => x.id === target.id) ?? target) >= target.price / 3,
        tier: 3,
      };
    } else {
      c3 = marathonFallback(today, owned, marathonToday);
    }
  } else if (hardPick === 2) {
    // Complete an In Progress game you've played 15+ hours on
    const nearEnd = owned.filter(g => {
      if (g.status !== 'In Progress') return false;
      return getTotalHours(g) >= 15;
    });
    if (nearEnd.length > 0) {
      const maxChoices = Math.min(nearEnd.length, 4);
      const target = nearEnd[pick(seed, 500, maxChoices)];
      c3 = {
        id: `complete-${target.id}`,
        type: 'hit_milestone',
        emoji: '🏆',
        title: 'See it through',
        desc: `Finish ${target.name} — you've already put in ${getTotalHours(target).toFixed(0)}h`,
        xp: 60,
        done: (owned.find(x => x.id === target.id)?.status ?? '') === 'Completed',
        tier: 3,
      };
    } else {
      c3 = marathonFallback(today, owned, marathonToday);
    }
  } else if (hardPick === 3) {
    // 5 sessions this week
    c3 = {
      id: 'week-5',
      type: 'weekly_sessions',
      emoji: '🔥',
      title: 'Week warrior',
      desc: `Log 5 sessions this week (${Math.min(weekSessions, 5)}/5 done)`,
      xp: 45,
      done: weekSessions >= 5,
      tier: 3,
    };
  } else {
    c3 = marathonFallback(today, owned, marathonToday);
  }

  return [c1, c2, c3];
}

function marathonFallback(_today: string, _owned: Game[], marathonToday: boolean): Challenge {
  return {
    id: 'marathon',
    type: 'marathon',
    emoji: '🏃',
    title: 'Marathon runner',
    desc: 'Log 3+ hours in a single session today',
    xp: 50,
    done: marathonToday,
    tier: 3,
  };
}

// ── UI constants ───────────────────────────────────────────────────────────

const TIER_LABELS = ['', 'Easy', 'Medium', 'Hard'] as const;
const TIER_COLORS: Record<1 | 2 | 3, string> = {
  1: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  2: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  3: 'text-red-400 bg-red-400/10 border-red-400/20',
};

// ── Component ──────────────────────────────────────────────────────────────

interface DailyChallengesPanelProps {
  games: Game[];
}

export function DailyChallengesPanel({ games }: DailyChallengesPanelProps) {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('ga-daily-challenges-collapsed') === 'true';
  });

  const challenges = useMemo(() => buildChallenges(games), [games]);

  if (challenges.length === 0) return null;

  const completed = challenges.filter(c => c.done).length;
  const earnedXP = challenges.filter(c => c.done).reduce((n, c) => n + c.xp, 0);
  const totalXP = challenges.reduce((n, c) => n + c.xp, 0);
  const allDone = completed === challenges.length;

  const toggle = () => {
    setCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem('ga-daily-challenges-collapsed', String(next)); } catch {}
      return next;
    });
  };

  return (
    <div className={clsx(
      'mb-4 rounded-xl border transition-all',
      allDone
        ? 'bg-gradient-to-br from-emerald-500/10 to-cyan-500/8 border-emerald-500/20'
        : 'bg-white/[0.02] border-white/5'
    )}>
      {/* Header — always visible */}
      <button
        onClick={toggle}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2.5">
          <Zap
            size={14}
            className={allDone ? 'text-emerald-400' : 'text-yellow-400'}
          />
          <span className="text-sm font-medium text-white/80">Daily Challenges</span>
          <span className="text-[10px] text-white/30">
            {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* XP earned */}
          <div className="flex items-center gap-1.5">
            <span className={clsx(
              'text-xs font-semibold tabular-nums',
              allDone ? 'text-emerald-400' : earnedXP > 0 ? 'text-yellow-400' : 'text-white/20'
            )}>
              {earnedXP}/{totalXP} XP
            </span>
          </div>
          {/* Count badge */}
          <span className={clsx(
            'text-[11px] font-medium px-1.5 py-0.5 rounded',
            allDone ? 'text-emerald-400 bg-emerald-400/15' : 'text-white/40 bg-white/5'
          )}>
            {completed}/{challenges.length}
          </span>
          {collapsed ? <ChevronDown size={14} className="text-white/30" /> : <ChevronUp size={14} className="text-white/30" />}
        </div>
      </button>

      {!collapsed && (
        <div className="px-4 pb-4">
          {/* Progress bar */}
          <div className="h-[3px] bg-white/5 rounded-full overflow-hidden mb-4">
            <div
              className={clsx(
                'h-full rounded-full transition-all duration-700',
                allDone ? 'bg-emerald-500' : 'bg-gradient-to-r from-purple-500 to-blue-500'
              )}
              style={{ width: `${(completed / Math.max(challenges.length, 1)) * 100}%` }}
            />
          </div>

          {/* Challenge cards */}
          <div className="space-y-2">
            {challenges.map(c => (
              <div
                key={c.id}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all',
                  c.done
                    ? 'bg-emerald-500/8 border-emerald-500/15'
                    : 'bg-white/[0.02] border-white/[0.05]'
                )}
              >
                {/* Emoji */}
                <span className="text-lg w-7 text-center shrink-0 leading-none">{c.emoji}</span>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={clsx(
                      'text-sm font-medium',
                      c.done ? 'text-white/40 line-through' : 'text-white/85'
                    )}>
                      {c.title}
                    </span>
                    <span className={clsx(
                      'text-[9px] px-1.5 py-0.5 rounded border font-medium shrink-0',
                      TIER_COLORS[c.tier]
                    )}>
                      {TIER_LABELS[c.tier]}
                    </span>
                  </div>
                  <p className={clsx(
                    'text-[11px] mt-0.5 leading-snug',
                    c.done ? 'text-white/25' : 'text-white/40'
                  )}>
                    {c.desc}
                  </p>
                </div>

                {/* XP + status */}
                <div className="shrink-0 flex items-center gap-2">
                  <span className={clsx(
                    'text-[10px] font-medium',
                    c.done ? 'text-yellow-400' : 'text-white/20'
                  )}>
                    +{c.xp}
                  </span>
                  {c.done
                    ? <CheckCircle2 size={17} className="text-emerald-400" />
                    : <Circle size={17} className="text-white/15" />
                  }
                </div>
              </div>
            ))}
          </div>

          {/* Completion celebration */}
          {allDone && (
            <div className="mt-3 text-center">
              <p className="text-xs text-emerald-400 font-medium">
                All done! 🎉 &nbsp;Come back tomorrow for new challenges.
              </p>
            </div>
          )}

          {/* Tip */}
          {!allDone && completed === 0 && (
            <p className="mt-3 text-[10px] text-white/20 text-center">
              Challenges auto-complete when you take the action in the app.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
