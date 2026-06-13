'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp, Zap, Check, Trophy, Clock } from 'lucide-react';
import { Game } from '../lib/types';
import {
  Challenge,
  ChallengeProgress,
  loadOrGenerateChallenges,
  computeProgress,
  awardPoints,
} from '../lib/challenge-engine';
import clsx from 'clsx';

interface DailyChallengesProps {
  games: Game[];
  /** Open the play-log modal for a specific game */
  onLogTime: (game: Game) => void;
  /** Open the game detail sheet */
  onOpenDetail: (game: Game) => void;
}

// ── Visual config per category ────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, { bar: string; badge: string; glow: string }> = {
  session:    { bar: 'bg-purple-500',   badge: 'bg-purple-500/15 text-purple-300',   glow: 'shadow-purple-500/20' },
  streak:     { bar: 'bg-orange-500',   badge: 'bg-orange-500/15 text-orange-300',   glow: 'shadow-orange-500/20' },
  focus:      { bar: 'bg-blue-500',     badge: 'bg-blue-500/15 text-blue-300',       glow: 'shadow-blue-500/20'   },
  rescue:     { bar: 'bg-red-500',      badge: 'bg-red-500/15 text-red-300',         glow: 'shadow-red-500/20'    },
  milestone:  { bar: 'bg-cyan-500',     badge: 'bg-cyan-500/15 text-cyan-300',       glow: 'shadow-cyan-500/20'   },
  review:     { bar: 'bg-yellow-500',   badge: 'bg-yellow-500/15 text-yellow-300',   glow: 'shadow-yellow-500/20' },
  discovery:  { bar: 'bg-emerald-500',  badge: 'bg-emerald-500/15 text-emerald-300', glow: 'shadow-emerald-500/20' },
  completion: { bar: 'bg-amber-500',    badge: 'bg-amber-500/15 text-amber-300',     glow: 'shadow-amber-500/20'  },
  variety:    { bar: 'bg-indigo-500',   badge: 'bg-indigo-500/15 text-indigo-300',   glow: 'shadow-indigo-500/20' },
  hours:      { bar: 'bg-teal-500',     badge: 'bg-teal-500/15 text-teal-300',       glow: 'shadow-teal-500/20'   },
  comeback:   { bar: 'bg-rose-500',     badge: 'bg-rose-500/15 text-rose-300',       glow: 'shadow-rose-500/20'   },
};

function getCategoryColor(category: string) {
  return CATEGORY_COLORS[category] ?? CATEGORY_COLORS.session;
}

// Countdown until midnight
function useTimeUntilMidnight(): string {
  const [label, setLabel] = useState('');
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setDate(midnight.getDate() + 1);
      midnight.setHours(0, 0, 0, 0);
      const diff = midnight.getTime() - now.getTime();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setLabel(`${h}h ${m}m`);
    };
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, []);
  return label;
}

// ── Single challenge card ─────────────────────────────────────────────────────

interface ChallengeCardProps {
  challenge: Challenge;
  progress: ChallengeProgress;
  onCta?: () => void;
  ctaLabel?: string;
}

function ChallengeCard({ challenge, progress, onCta, ctaLabel }: ChallengeCardProps) {
  const colors = getCategoryColor(challenge.category);
  const { current, isComplete, pct } = progress;

  // Format progress text
  let progressText = '';
  if (challenge.unit === 'hours') {
    progressText = `${current.toFixed(1)} / ${challenge.targetValue.toFixed(1)}h`;
  } else if (challenge.unit === 'session' || challenge.unit === 'rating') {
    progressText = isComplete ? 'Done' : '0 / 1';
  } else {
    progressText = `${current} / ${challenge.targetValue} ${challenge.unit}`;
  }

  return (
    <div
      className={clsx(
        'relative rounded-xl border p-3 transition-all duration-300',
        isComplete
          ? 'border-emerald-500/30 bg-emerald-500/5'
          : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.03]',
      )}
    >
      <div className="flex items-start gap-3">
        {/* Completion ring / emoji */}
        <div className="flex-shrink-0 mt-0.5">
          {isComplete ? (
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
              <Check size={14} className="text-emerald-400" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-base leading-none">
              {challenge.emoji}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          {/* Header row */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                {/* Game thumbnail if present */}
                {challenge.thumbnail && !isComplete && (
                  <img
                    src={challenge.thumbnail}
                    alt=""
                    className="w-4 h-4 rounded object-cover flex-shrink-0 opacity-80"
                    loading="lazy"
                  />
                )}
                <span className={clsx('text-sm font-medium', isComplete ? 'text-white/40 line-through' : 'text-white/85')}>
                  {challenge.title}
                </span>
              </div>
              {!isComplete && (
                <p className="text-[11px] text-white/40 mt-0.5 leading-relaxed">{challenge.description}</p>
              )}
              {isComplete && (
                <p className="text-[11px] text-emerald-400/60 mt-0.5">Completed ✓</p>
              )}
            </div>

            {/* Points badge */}
            <div className={clsx('flex-shrink-0 flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-semibold', colors.badge)}>
              <Zap size={9} />
              +{challenge.points}
            </div>
          </div>

          {/* Progress bar */}
          {!isComplete && (
            <div className="mt-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-white/30">{progressText}</span>
                <span className="text-[10px] text-white/25">{pct}%</span>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div
                  className={clsx('h-full rounded-full transition-all duration-700', colors.bar)}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )}

          {/* CTA */}
          {!isComplete && onCta && ctaLabel && (
            <button
              onClick={onCta}
              className="mt-2 text-[11px] font-medium text-purple-400/80 hover:text-purple-300 transition-colors"
            >
              {ctaLabel} →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function DailyChallenges({ games, onLogTime, onOpenDetail }: DailyChallengesProps) {
  const countdown = useTimeUntilMidnight();

  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('ga-challenges-collapsed') !== 'false';
  });

  // State managed from localStorage
  const [allTimePoints, setAllTimePoints] = useState(0);
  const [awardedIds, setAwardedIds] = useState<string[]>([]);
  const [daily, setDaily] = useState<Challenge[]>([]);
  const [weekly, setWeekly] = useState<Challenge | null>(null);
  const initialised = useRef(false);

  // Load / generate challenges once on mount, then keep refreshing progress live
  useEffect(() => {
    if (!initialised.current) {
      const { daily: d, weekly: w, allTimePoints: pts, awardedIds: awarded } = loadOrGenerateChallenges(games);
      setDaily(d);
      setWeekly(w);
      setAllTimePoints(pts);
      setAwardedIds(awarded);
      initialised.current = true;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Compute live progress for every challenge
  const dailyProgress = useMemo(
    () => daily.map(c => computeProgress(c, games)),
    [daily, games],
  );
  const weeklyProgress = useMemo(
    () => weekly ? computeProgress(weekly, games) : null,
    [weekly, games],
  );

  // Detect newly completed challenges and award points
  useEffect(() => {
    if (!initialised.current || daily.length === 0) return;
    let pts = allTimePoints;
    let ids = [...awardedIds];

    [...daily, ...(weekly ? [weekly] : [])].forEach((c, i) => {
      const prog = i < daily.length ? dailyProgress[i] : weeklyProgress;
      if (prog?.isComplete && !ids.includes(c.id)) {
        const result = awardPoints(c.id, c.points, ids, pts);
        pts = result.allTimePoints;
        ids = result.awardedIds;
      }
    });

    if (pts !== allTimePoints || ids.length !== awardedIds.length) {
      setAllTimePoints(pts);
      setAwardedIds(ids);
    }
  }, [dailyProgress, weeklyProgress]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('ga-challenges-collapsed', String(!next));
  };

  // Summary numbers for the collapsed bar
  const dailyDone = dailyProgress.filter(p => p.isComplete).length;
  const weeklyDone = weeklyProgress?.isComplete ? 1 : 0;
  const todayPoints = [...daily, ...(weekly ? [weekly] : [])]
    .filter(c => awardedIds.includes(c.id))
    .reduce((s, c) => s + c.points, 0);

  if (games.length === 0) return null;

  // Helper to find a game for a challenge
  const findGame = (id?: string) => id ? games.find(g => g.id === id) : undefined;

  return (
    <div className="mb-4">
      {/* Collapse toggle row */}
      <button
        onClick={toggleCollapsed}
        className="w-full flex items-center justify-between px-3 py-2 bg-white/[0.02] hover:bg-white/[0.03] rounded-xl border border-white/5 transition-all"
        aria-expanded={!collapsed}
      >
        <div className="flex items-center gap-2">
          <Trophy size={13} className="text-amber-400" />
          <span className="text-xs font-medium text-white/70">Daily Challenges</span>
          {dailyDone > 0 && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400">
              <Check size={8} /> {dailyDone}/{daily.length}
            </span>
          )}
          {weeklyDone > 0 && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-400">
              <Trophy size={8} /> Weekly done!
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {todayPoints > 0 && (
            <span className="text-[10px] text-amber-400/80 font-semibold">+{todayPoints} pts today</span>
          )}
          {allTimePoints > 0 && (
            <span className="text-[10px] text-white/25">{allTimePoints} total</span>
          )}
          {collapsed
            ? <ChevronDown size={13} className="text-white/30" />
            : <ChevronUp size={13} className="text-white/30" />
          }
        </div>
      </button>

      {/* Expanded panel */}
      {!collapsed && (
        <div className="mt-2 space-y-3">
          {/* Daily section */}
          {daily.length > 0 && (
            <div>
              <div className="flex items-center justify-between px-1 mb-2">
                <span className="text-[10px] font-semibold text-white/30 uppercase tracking-wider">Today</span>
                <div className="flex items-center gap-1 text-[10px] text-white/20">
                  <Clock size={9} />
                  <span>Refreshes in {countdown}</span>
                </div>
              </div>
              <div className="space-y-2">
                {daily.map((challenge, i) => {
                  const prog = dailyProgress[i];
                  const linkedGame = findGame(challenge.gameId);
                  const showCta = !prog.isComplete && !!linkedGame;

                  return (
                    <ChallengeCard
                      key={challenge.id}
                      challenge={challenge}
                      progress={prog}
                      onCta={showCta ? () => onLogTime(linkedGame!) : undefined}
                      ctaLabel={showCta ? 'Log time' : undefined}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Weekly section */}
          {weekly && weeklyProgress && (
            <div>
              <div className="flex items-center px-1 mb-2">
                <span className="text-[10px] font-semibold text-white/30 uppercase tracking-wider">This Week</span>
              </div>
              <ChallengeCard
                challenge={weekly}
                progress={weeklyProgress}
                onCta={
                  !weeklyProgress.isComplete && weekly.gameId && findGame(weekly.gameId)
                    ? () => onOpenDetail(findGame(weekly.gameId)!)
                    : undefined
                }
                ctaLabel={weekly.gameId ? 'View game' : undefined}
              />
            </div>
          )}

          {/* All-time points footer */}
          {allTimePoints > 0 && (
            <div className="flex items-center justify-end gap-1.5 px-1">
              <Zap size={10} className="text-amber-400/50" />
              <span className="text-[10px] text-white/20">{allTimePoints} challenge points earned all time</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
