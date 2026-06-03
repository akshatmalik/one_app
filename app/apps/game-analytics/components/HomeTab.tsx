'use client';

import { useMemo, useState } from 'react';
import {
  Flame, Clock, DollarSign, Gamepad2, ChevronRight,
  TrendingUp, TrendingDown, Minus, Sparkles, Calendar,
  Zap, Target, Trophy, BarChart3, Check, Layers
} from 'lucide-react';
import { Game } from '../lib/types';
import { GameWithMetrics } from '../hooks/useAnalytics';
import {
  getTotalHours,
  getGameStreak,
  getNextMilestone,
  getDailyFortune,
  getOnThisDay,
  getGameChemistry,
  getWeekRecapData,
  getCurrentGamingStreak,
  parseLocalDate,
  NextMilestoneData,
  OnThisDayEvent,
  GameChemistryResult,
  GameStreakData,
} from '../lib/calculations';
import { ProgressRing } from './ProgressRing';
import clsx from 'clsx';

type TabId = 'games' | 'timeline' | 'stats' | 'ai-coach' | 'up-next' | 'discover' | 'leaderboard' | 'buy-queue';

interface HomeTabProps {
  games: Game[];
  gamesWithMetrics: GameWithMetrics[];
  onOpenGame: (game: GameWithMetrics) => void;
  onQuickLog: (gameId: string, hours: number) => void;
  onSwitchTab: (tab: TabId) => void;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 5) return 'Up late';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Evening, gamer';
}

function getDayString(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

function getLastPlayedDate(game: Game): Date | null {
  const logs = game.playLogs;
  if (!logs || logs.length === 0) return null;
  const sorted = [...logs].sort(
    (a, b) => parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime()
  );
  return parseLocalDate(sorted[0].date);
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffH = diffMs / (1000 * 60 * 60);
  const diffD = Math.floor(diffH / 24);
  if (diffD === 0) return 'today';
  if (diffD === 1) return 'yesterday';
  if (diffD < 7) return `${diffD}d ago`;
  if (diffD < 30) return `${Math.floor(diffD / 7)}w ago`;
  return `${Math.floor(diffD / 30)}mo ago`;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function DeltaChip({
  delta,
  unit,
  higherIsBetter = true,
}: {
  delta: number;
  unit: string;
  higherIsBetter?: boolean;
}) {
  if (Math.abs(delta) < 0.05) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] text-white/25">
        <Minus size={7} />
        same
      </span>
    );
  }
  const positive = higherIsBetter ? delta > 0 : delta < 0;
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-0.5 text-[10px]',
        positive ? 'text-emerald-400/80' : 'text-red-400/80',
      )}
    >
      {delta > 0 ? <TrendingUp size={8} /> : <TrendingDown size={8} />}
      {delta > 0 ? '+' : ''}
      {Math.abs(delta) % 1 !== 0
        ? Math.abs(delta).toFixed(1)
        : Math.abs(delta)}
      {unit}
    </span>
  );
}

function SectionHeader({
  icon,
  title,
  action,
  onAction,
}: {
  icon: React.ReactNode;
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <span className="text-white/40">{icon}</span>
        <span className="text-xs font-semibold text-white/50 uppercase tracking-widest">
          {title}
        </span>
      </div>
      {action && onAction && (
        <button
          onClick={onAction}
          className="text-[11px] text-purple-400/70 hover:text-purple-400 transition-colors flex items-center gap-0.5"
        >
          {action}
          <ChevronRight size={10} />
        </button>
      )}
    </div>
  );
}

// ─── Quick Log Card ──────────────────────────────────────────────────────────

const HOUR_PRESETS = [0.5, 1, 1.5, 2, 3, 4, 6];

function QuickLogCard({
  game,
  streak,
  onQuickLog,
  onOpenGame,
}: {
  game: GameWithMetrics;
  streak: GameStreakData;
  onQuickLog: (hours: number) => void;
  onOpenGame: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [logged, setLogged] = useState<number | null>(null);

  const lastPlayed = getLastPlayedDate(game);
  const timeAgo = lastPlayed ? formatTimeAgo(lastPlayed) : 'never';

  const avgSession = useMemo(() => {
    const logs = game.playLogs || [];
    if (logs.length === 0) return 2;
    const total = logs.reduce((s, l) => s + l.hours, 0);
    return Math.round((total / logs.length) * 2) / 2;
  }, [game.playLogs]);

  const handleLog = (hours: number) => {
    onQuickLog(hours);
    setLogged(hours);
    setExpanded(false);
    setTimeout(() => setLogged(null), 2500);
  };

  return (
    <div
      className={clsx(
        'rounded-xl border transition-all duration-200',
        expanded
          ? 'bg-white/[0.05] border-purple-500/20'
          : 'bg-white/[0.03] border-white/[0.06] hover:border-white/10',
      )}
    >
      {/* Game row */}
      <div className="flex items-center gap-3 p-3">
        {/* Thumbnail */}
        <button onClick={onOpenGame} className="shrink-0 relative">
          <div className="w-12 h-12 rounded-lg overflow-hidden bg-white/5">
            {game.thumbnail ? (
              <img
                src={game.thumbnail}
                alt=""
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Gamepad2 size={20} className="text-white/20" />
              </div>
            )}
          </div>
          {streak.isActive && streak.days >= 3 && (
            <div className="absolute -top-1 -right-1 flex items-center gap-0.5 bg-amber-500/90 rounded-full px-1 py-0.5 text-[9px] font-bold text-black leading-none">
              <Flame size={8} />
              {streak.days}
            </div>
          )}
        </button>

        {/* Info */}
        <div className="flex-1 min-w-0" onClick={() => setExpanded(e => !e)}>
          <p className="text-sm font-medium text-white/90 truncate leading-tight">
            {game.name}
          </p>
          <p className="text-[11px] text-white/35 mt-0.5">
            {timeAgo} · {getTotalHours(game).toFixed(1)}h total
          </p>
        </div>

        {/* Action */}
        {logged !== null ? (
          <div className="shrink-0 flex items-center gap-1 text-emerald-400 text-xs font-medium">
            <Check size={14} />
            {logged}h
          </div>
        ) : (
          <button
            onClick={() => setExpanded(e => !e)}
            className={clsx(
              'shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
              expanded
                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                : 'bg-white/[0.06] text-white/50 hover:bg-white/10 hover:text-white/70',
            )}
          >
            Log
          </button>
        )}
      </div>

      {/* Hour presets (expanded) */}
      {expanded && (
        <div className="px-3 pb-3">
          <p className="text-[10px] text-white/30 mb-2">
            How long did you play? (avg: {avgSession}h)
          </p>
          <div className="flex flex-wrap gap-1.5">
            {HOUR_PRESETS.map(h => (
              <button
                key={h}
                onClick={() => handleLog(h)}
                className={clsx(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                  Math.abs(h - avgSession) < 0.01
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                    : 'bg-white/[0.04] text-white/50 hover:bg-white/10 hover:text-white/80',
                )}
              >
                {h}h
              </button>
            ))}
            <button
              onClick={onOpenGame}
              className="px-3 py-1.5 rounded-lg text-xs text-white/30 hover:text-white/60 transition-colors"
            >
              More →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tonight's Pick Card ─────────────────────────────────────────────────────

function TonightsPickCard({
  game,
  chemistry,
  streakData,
  onOpenGame,
  onQuickLog,
}: {
  game: GameWithMetrics;
  chemistry: GameChemistryResult;
  streakData: GameStreakData;
  onOpenGame: () => void;
  onQuickLog: (hours: number) => void;
}) {
  const [showHours, setShowHours] = useState(false);
  const [logged, setLogged] = useState<number | null>(null);

  const handleLog = (hours: number) => {
    onQuickLog(hours);
    setLogged(hours);
    setShowHours(false);
    setTimeout(() => setLogged(null), 2500);
  };

  const gradeColor = {
    S: 'text-yellow-400',
    A: 'text-emerald-400',
    B: 'text-blue-400',
    C: 'text-purple-400',
    D: 'text-orange-400',
  }[chemistry.grade] ?? 'text-white/40';

  return (
    <div className="rounded-xl overflow-hidden border border-white/[0.07] bg-white/[0.03]">
      {/* Hero image */}
      {game.thumbnail && (
        <div className="relative h-28 overflow-hidden">
          <img
            src={game.thumbnail}
            alt=""
            className="w-full h-full object-cover opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0f0f1a]" />

          {/* Chemistry badge */}
          <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/60 backdrop-blur-sm rounded-full px-2 py-1">
            <Sparkles size={10} className={gradeColor} />
            <span className={clsx('text-xs font-bold', gradeColor)}>
              {chemistry.grade} match
            </span>
          </div>

          {/* Streak badge */}
          {streakData.isActive && streakData.days >= 3 && (
            <div className="absolute top-2 left-2 flex items-center gap-1 bg-amber-500/80 backdrop-blur-sm rounded-full px-2 py-1">
              <Flame size={10} className="text-black" />
              <span className="text-[10px] font-bold text-black">{streakData.days}d streak</span>
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="p-3">
        <button onClick={onOpenGame} className="text-left w-full mb-2">
          <p className="text-sm font-bold text-white/90">{game.name}</p>
          <p className="text-[11px] text-white/40 mt-0.5 leading-snug">
            {chemistry.justification}
          </p>
        </button>

        {/* Stats row */}
        <div className="flex items-center gap-3 text-[11px] text-white/30 mb-3">
          <span className="flex items-center gap-1">
            <Clock size={10} />
            {getTotalHours(game).toFixed(1)}h
          </span>
          {game.metrics.costPerHour > 0 && (
            <span className="flex items-center gap-1">
              <DollarSign size={10} />
              ${game.metrics.costPerHour.toFixed(2)}/hr
            </span>
          )}
          <span className="flex items-center gap-1">
            <Zap size={10} />
            {game.status}
          </span>
        </div>

        {/* Action */}
        {logged !== null ? (
          <div className="flex items-center gap-1 text-emerald-400 text-sm font-medium">
            <Check size={14} />
            {logged}h logged!
          </div>
        ) : showHours ? (
          <div>
            <p className="text-[10px] text-white/30 mb-2">How long?</p>
            <div className="flex flex-wrap gap-1.5">
              {[0.5, 1, 2, 3, 4, 6].map(h => (
                <button
                  key={h}
                  onClick={() => handleLog(h)}
                  className="px-3 py-1.5 rounded-lg text-xs bg-purple-500/15 text-purple-300 border border-purple-500/25 hover:bg-purple-500/25 transition-all"
                >
                  {h}h
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHours(true)}
              className="flex-1 py-2 rounded-lg bg-purple-500/15 text-purple-400 text-sm font-medium hover:bg-purple-500/25 transition-all border border-purple-500/20"
            >
              Log Session
            </button>
            <button
              onClick={onOpenGame}
              className="px-3 py-2 rounded-lg bg-white/[0.04] text-white/40 text-sm hover:bg-white/[0.08] transition-all"
            >
              View
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Milestone Card ──────────────────────────────────────────────────────────

function MilestoneCard({
  game,
  milestone,
  onOpenGame,
}: {
  game: GameWithMetrics;
  milestone: NextMilestoneData;
  onOpenGame: () => void;
}) {
  return (
    <button
      onClick={onOpenGame}
      className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:border-white/10 transition-all w-full text-left"
    >
      <ProgressRing
        progress={milestone.progressPercent}
        color="#a855f7"
        size={40}
        strokeWidth={3}
      >
        <span className="text-[10px] font-bold text-purple-400">
          {milestone.progressPercent}%
        </span>
      </ProgressRing>

      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-white/70 truncate">{game.name}</p>
        <p className="text-[11px] text-white/40 truncate">{milestone.description}</p>
      </div>

      <div className="shrink-0 text-right">
        <p className="text-xs font-semibold text-purple-400">
          {milestone.remaining.toFixed(1)}h
        </p>
        <p className="text-[10px] text-white/25">to go</p>
      </div>
    </button>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function HomeTab({
  games,
  gamesWithMetrics,
  onOpenGame,
  onQuickLog,
  onSwitchTab,
}: HomeTabProps) {
  // ── Data ──────────────────────────────────────────────────────────────
  const weekData = useMemo(() => getWeekRecapData(games), [games]);
  const fortune = useMemo(() => (games.length > 0 ? getDailyFortune(games) : null), [games]);
  const onThisDay = useMemo(() => getOnThisDay(games), [games]);
  const globalStreak = useMemo(() => getCurrentGamingStreak(games), [games]);

  // Recently played games (sorted by last session date, owned only)
  const recentlyPlayed = useMemo(() => {
    return gamesWithMetrics
      .filter(g => g.status !== 'Wishlist' && (g.playLogs?.length ?? 0) > 0)
      .sort((a, b) => {
        const aDate = getLastPlayedDate(a)?.getTime() ?? 0;
        const bDate = getLastPlayedDate(b)?.getTime() ?? 0;
        return bDate - aDate;
      })
      .slice(0, 4);
  }, [gamesWithMetrics]);

  // Streaks
  const activeStreaks = useMemo(() => {
    return gamesWithMetrics
      .map(g => ({ game: g, streak: getGameStreak(g) }))
      .filter(({ streak }) => streak.isActive && streak.days >= 3)
      .sort((a, b) => b.streak.days - a.streak.days)
      .slice(0, 3);
  }, [gamesWithMetrics]);

  // Streaks at risk: last played yesterday, in progress
  const streaksAtRisk = useMemo(() => {
    const now = new Date();
    const yesterdayStr = (() => {
      const d = new Date(now.getTime() - 86400000);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    })();
    return gamesWithMetrics
      .filter(g => {
        if (!g.playLogs?.length) return false;
        const streak = getGameStreak(g);
        if (!streak.isActive || streak.days < 2) return false;
        // last played date is yesterday (not yet today)
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const logs = [...(g.playLogs || [])].sort(
          (a, b) => parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime(),
        );
        const lastDate = logs[0]?.date;
        return lastDate === yesterdayStr && lastDate !== todayStr;
      })
      .map(g => ({ game: g, streak: getGameStreak(g) }))
      .slice(0, 2);
  }, [gamesWithMetrics]);

  // Tonight's pick: best chemistry from in-progress + queue
  const tonightsPick = useMemo(():
    | { game: GameWithMetrics; chemistry: GameChemistryResult; streak: GameStreakData }
    | null => {
    if (games.length === 0) return null;

    const candidates = gamesWithMetrics.filter(
      g => g.status === 'In Progress' || g.status === 'Not Started',
    );
    if (candidates.length === 0) return null;

    let best: { game: GameWithMetrics; chemistry: GameChemistryResult; streak: GameStreakData } | null =
      null;
    let bestScore = -1;

    for (const game of candidates) {
      const chemistry = getGameChemistry(game, games);
      const streak = getGameStreak(game);
      // Boost for active streaks
      const streakBonus = streak.isActive ? streak.days * 5 : 0;
      const effectiveScore = chemistry.score + streakBonus;
      if (effectiveScore > bestScore) {
        bestScore = effectiveScore;
        best = { game, chemistry, streak };
      }
    }
    return best;
  }, [games, gamesWithMetrics]);

  // Upcoming milestones (closest 3 across all in-progress games)
  const upcomingMilestones = useMemo(() => {
    const results: { game: GameWithMetrics; milestone: NextMilestoneData }[] = [];
    for (const game of gamesWithMetrics) {
      if (game.status === 'Wishlist') continue;
      const m = getNextMilestone(game, games);
      if (m) results.push({ game, milestone: m });
    }
    return results
      .sort((a, b) => a.milestone.remaining - b.milestone.remaining)
      .slice(0, 3);
  }, [games, gamesWithMetrics]);

  // ── Streak map for QuickLog ───────────────────────────────────────────
  const streakMap = useMemo(() => {
    const map = new Map<string, GameStreakData>();
    for (const g of gamesWithMetrics) map.set(g.id, getGameStreak(g));
    return map;
  }, [gamesWithMetrics]);

  // ── Empty state ───────────────────────────────────────────────────────
  if (games.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-purple-500/10 flex items-center justify-center mb-4">
          <Gamepad2 size={28} className="text-purple-400/60" />
        </div>
        <h2 className="text-lg font-semibold text-white/70 mb-2">Your dashboard is waiting</h2>
        <p className="text-sm text-white/35 max-w-xs">
          Add your first game to unlock your daily gaming companion — streaks, milestones, tonight's
          pick, and more.
        </p>
        <button
          onClick={() => onSwitchTab('games')}
          className="mt-6 px-5 py-2.5 rounded-xl bg-purple-500/20 text-purple-400 text-sm font-medium border border-purple-500/30 hover:bg-purple-500/30 transition-all"
        >
          Add games
        </button>
      </div>
    );
  }

  const { thisWeek, hoursDelta, gamesDelta, sessionsDelta } = weekData;
  const currentYearSpent = useMemo(
    () =>
      games
        .filter(g => {
          if (g.status === 'Wishlist') return false;
          const y = g.datePurchased ? new Date(g.datePurchased).getFullYear() : null;
          return y === new Date().getFullYear();
        })
        .reduce((s, g) => s + g.price, 0),
    [games],
  );

  return (
    <div className="space-y-6 pb-8">
      {/* ── Greeting ──────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-white/90">
            {getGreeting()}
            {globalStreak > 0 && (
              <span className="ml-2 text-amber-400 text-base">🔥</span>
            )}
          </h2>
          <p className="text-sm text-white/35 mt-0.5">{getDayString()}</p>
        </div>

        {globalStreak > 0 && (
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-1 text-amber-400">
              <Flame size={16} />
              <span className="text-lg font-bold">{globalStreak}</span>
            </div>
            <p className="text-[10px] text-white/25">day streak</p>
          </div>
        )}
      </div>

      {/* ── This Week ─────────────────────────────────────────────────── */}
      <div>
        <SectionHeader
          icon={<BarChart3 size={13} />}
          title="This Week"
          action="Full stats"
          onAction={() => onSwitchTab('stats')}
        />
        <div className="grid grid-cols-3 gap-2">
          {/* Hours */}
          <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.05]">
            <div className="flex items-center gap-1 text-white/30 mb-1">
              <Clock size={11} />
              <span className="text-[10px]">Hours</span>
            </div>
            <p className="text-xl font-bold text-white/90">
              {thisWeek.totalHours.toFixed(1)}
            </p>
            <DeltaChip delta={hoursDelta} unit="h" />
          </div>

          {/* Sessions */}
          <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.05]">
            <div className="flex items-center gap-1 text-white/30 mb-1">
              <Zap size={11} />
              <span className="text-[10px]">Sessions</span>
            </div>
            <p className="text-xl font-bold text-white/90">{thisWeek.totalSessions}</p>
            <DeltaChip delta={sessionsDelta} unit="" />
          </div>

          {/* Games this week */}
          <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.05]">
            <div className="flex items-center gap-1 text-white/30 mb-1">
              <Gamepad2 size={11} />
              <span className="text-[10px]">Games</span>
            </div>
            <p className="text-xl font-bold text-white/90">{thisWeek.uniqueGames}</p>
            <DeltaChip delta={gamesDelta} unit="" />
          </div>
        </div>
      </div>

      {/* ── Streak Alerts ─────────────────────────────────────────────── */}
      {(activeStreaks.length > 0 || streaksAtRisk.length > 0) && (
        <div>
          <SectionHeader
            icon={<Flame size={13} />}
            title="Streaks"
          />
          <div className="space-y-2">
            {/* At-risk first */}
            {streaksAtRisk.map(({ game, streak }) => (
              <button
                key={game.id}
                onClick={() => onOpenGame(game)}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 hover:border-amber-500/30 transition-all text-left"
              >
                <div className="w-9 h-9 rounded-lg overflow-hidden bg-white/5 shrink-0">
                  {game.thumbnail ? (
                    <img src={game.thumbnail} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Gamepad2 size={16} className="m-auto mt-1.5 text-white/20" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white/80 truncate">{game.name}</p>
                  <p className="text-[11px] text-amber-400/80">
                    {streak.days}d streak — play today to keep it alive!
                  </p>
                </div>
                <Flame size={16} className="shrink-0 text-amber-400 animate-pulse" />
              </button>
            ))}

            {/* Active streaks */}
            {activeStreaks
              .filter(({ game }) => !streaksAtRisk.find(r => r.game.id === game.id))
              .map(({ game, streak }) => (
                <button
                  key={game.id}
                  onClick={() => onOpenGame(game)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:border-white/10 transition-all text-left"
                >
                  <div className="w-9 h-9 rounded-lg overflow-hidden bg-white/5 shrink-0">
                    {game.thumbnail ? (
                      <img src={game.thumbnail} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Gamepad2 size={16} className="m-auto mt-1.5 text-white/20" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-white/70 truncate">{game.name}</p>
                    <p className="text-[11px] text-white/30">
                      {streak.days}-day streak going strong
                    </p>
                  </div>
                  <div className="shrink-0 flex items-center gap-1 text-amber-400">
                    <Flame size={14} />
                    <span className="text-sm font-bold">{streak.days}</span>
                  </div>
                </button>
              ))}
          </div>
        </div>
      )}

      {/* ── Quick Log ─────────────────────────────────────────────────── */}
      {recentlyPlayed.length > 0 && (
        <div>
          <SectionHeader
            icon={<Clock size={13} />}
            title="Quick Log"
            action="All games"
            onAction={() => onSwitchTab('games')}
          />
          <div className="space-y-2">
            {recentlyPlayed.map(game => (
              <QuickLogCard
                key={game.id}
                game={game}
                streak={streakMap.get(game.id) ?? { days: 0, level: 'none', isActive: false }}
                onQuickLog={(hours) => onQuickLog(game.id, hours)}
                onOpenGame={() => onOpenGame(game)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Tonight's Pick ────────────────────────────────────────────── */}
      {tonightsPick && (
        <div>
          <SectionHeader
            icon={<Sparkles size={13} />}
            title="Tonight's Pick"
          />
          <TonightsPickCard
            game={tonightsPick.game}
            chemistry={tonightsPick.chemistry}
            streakData={tonightsPick.streak}
            onOpenGame={() => onOpenGame(tonightsPick.game)}
            onQuickLog={(hours) => onQuickLog(tonightsPick.game.id, hours)}
          />
        </div>
      )}

      {/* ── Next Milestones ───────────────────────────────────────────── */}
      {upcomingMilestones.length > 0 && (
        <div>
          <SectionHeader
            icon={<Target size={13} />}
            title="Next Milestones"
          />
          <div className="space-y-2">
            {upcomingMilestones.map(({ game, milestone }) => (
              <MilestoneCard
                key={`${game.id}-${milestone.description}`}
                game={game}
                milestone={milestone}
                onOpenGame={() => onOpenGame(game)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── On This Day ───────────────────────────────────────────────── */}
      {onThisDay.length > 0 && (
        <div>
          <SectionHeader icon={<Calendar size={13} />} title="On This Day" />
          <div className="space-y-2">
            {onThisDay.slice(0, 3).map((event, i) => {
              const gwm = gamesWithMetrics.find(g => g.id === event.game.id);
              const eventLabels: Record<OnThisDayEvent['eventType'], string> = {
                purchased: 'You bought',
                started: 'You started',
                completed: 'You completed',
                played: 'You played',
                abandoned: 'You abandoned',
              };
              const eventColors: Record<OnThisDayEvent['eventType'], string> = {
                purchased: 'text-emerald-400/80',
                started: 'text-blue-400/80',
                completed: 'text-yellow-400/80',
                played: 'text-purple-400/80',
                abandoned: 'text-red-400/80',
              };
              return (
                <button
                  key={i}
                  onClick={() => gwm && onOpenGame(gwm)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:border-white/10 transition-all text-left"
                >
                  <div className="w-9 h-9 rounded-lg overflow-hidden bg-white/5 shrink-0">
                    {event.game.thumbnail ? (
                      <img
                        src={event.game.thumbnail}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <Calendar size={14} className="m-auto mt-2.5 text-white/20" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-white/35 leading-tight">
                      <span className={eventColors[event.eventType]}>
                        {eventLabels[event.eventType]}
                      </span>{' '}
                      <span className="text-white/70 font-medium">{event.game.name}</span>
                    </p>
                    <p className="text-[10px] text-white/25 mt-0.5">{event.timeAgo}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Daily Fortune ─────────────────────────────────────────────── */}
      {fortune && (
        <div>
          <SectionHeader icon={<Sparkles size={13} />} title="Today's Fortune" />
          <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/10">
            <p className="text-sm text-white/60 leading-relaxed italic">
              "{fortune.text}"
            </p>
            <p className="text-[10px] text-white/25 mt-2 flex items-center gap-1">
              <span>{fortune.icon}</span>
              <span>{fortune.dataPoint}</span>
            </p>
          </div>
        </div>
      )}

      {/* ── Quick Nav Links ───────────────────────────────────────────── */}
      <div>
        <SectionHeader icon={<Layers size={13} />} title="Go to" />
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              { id: 'timeline' as TabId, label: 'Timeline', icon: <Calendar size={14} />, color: 'text-blue-400' },
              { id: 'stats' as TabId, label: 'Stats', icon: <BarChart3 size={14} />, color: 'text-purple-400' },
              { id: 'up-next' as TabId, label: 'Up Next', icon: <Trophy size={14} />, color: 'text-emerald-400' },
              { id: 'discover' as TabId, label: 'Discover', icon: <Sparkles size={14} />, color: 'text-amber-400' },
            ] as const
          ).map(item => (
            <button
              key={item.id}
              onClick={() => onSwitchTab(item.id)}
              className="flex items-center gap-2 p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:border-white/10 hover:bg-white/[0.04] transition-all text-left"
            >
              <span className={item.color}>{item.icon}</span>
              <span className="text-sm text-white/60">{item.label}</span>
              <ChevronRight size={12} className="ml-auto text-white/20" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
