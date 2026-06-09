'use client';

import { useMemo } from 'react';
import { Trophy, Flame, Calendar, Clock, Gamepad2, Zap, Star, Crown, Target } from 'lucide-react';
import { Game } from '../lib/types';
import {
  getBestGamingDay,
  getBestGamingWeek,
  getBestGamingMonth,
  getLongestGamingStreak,
  getCurrentGamingStreak,
  getFastestCompletion,
  getLongestSession,
  getBiggestGame,
  getValueChampion,
  getMostCompletedMonth,
  parseLocalDate,
} from '../lib/calculations';
import clsx from 'clsx';

interface GamingRecordsPanelProps {
  games: Game[];
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function fmtMonth(yyyyMM: string): string {
  const [year, m] = yyyyMM.split('-');
  return `${MONTHS[parseInt(m) - 1]} ${year}`;
}

function fmtDate(dateStr: string): string {
  const d = parseLocalDate(dateStr);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function fmtWeekRange(start: string, end: string): string {
  const s = parseLocalDate(start);
  const e = parseLocalDate(end);
  if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) {
    return `${MONTHS[s.getMonth()]} ${s.getDate()}–${e.getDate()}, ${s.getFullYear()}`;
  }
  return `${MONTHS[s.getMonth()]} ${s.getDate()} – ${MONTHS[e.getMonth()]} ${e.getDate()}, ${e.getFullYear()}`;
}

interface AtRiskProps {
  current: number;
  max: number;
  label: string;
}

function AtRiskBar({ current, max, label }: AtRiskProps) {
  const pct = Math.min(100, Math.round((current / max) * 100));
  if (pct < 50) return null;

  const barColor = pct >= 90 ? '#ef4444' : pct >= 75 ? '#f59e0b' : '#60a5fa';
  const textColor = pct >= 90 ? 'text-red-400' : pct >= 75 ? 'text-yellow-400' : 'text-blue-400';

  return (
    <div className="mt-2.5 pt-2.5 border-t border-white/[0.06]">
      <div className="flex justify-between items-center mb-1">
        <span className="text-[9px] text-white/35 truncate max-w-[80%]">{label}</span>
        <span className={clsx('text-[9px] font-semibold', textColor)}>{pct}%</span>
      </div>
      <div className="h-[3px] bg-white/[0.06] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${pct}%`, backgroundColor: barColor }}
        />
      </div>
      {pct >= 90 && (
        <div className="text-[8px] text-red-400/70 mt-0.5">🔥 Record alert!</div>
      )}
    </div>
  );
}

interface RecordCardProps {
  icon: React.ReactNode;
  accent: string;
  title: string;
  value: string;
  subtitle: string;
  date?: string;
  empty?: boolean;
  atRisk?: AtRiskProps | null;
}

function RecordCard({ icon, accent, title, value, subtitle, date, empty = false, atRisk }: RecordCardProps) {
  return (
    <div
      className={clsx(
        'relative p-3 rounded-xl border transition-all overflow-hidden',
        empty
          ? 'bg-white/[0.015] border-white/[0.05]'
          : 'bg-black/20 border-white/[0.08] hover:border-white/[0.15]'
      )}
      style={empty ? undefined : {
        borderLeftColor: accent,
        borderLeftWidth: '2px',
        borderTopColor: `${accent}22`,
        borderRightColor: 'rgba(255,255,255,0.08)',
        borderBottomColor: 'rgba(255,255,255,0.08)',
      }}
    >
      {/* Subtle background glow */}
      {!empty && (
        <div
          className="absolute top-0 left-0 w-16 h-16 rounded-full opacity-[0.04] pointer-events-none"
          style={{ background: accent, transform: 'translate(-30%, -30%)' }}
        />
      )}

      {/* Header row */}
      <div className="flex items-center gap-1.5 mb-2 relative">
        <span className={clsx(empty && 'opacity-25')}>{icon}</span>
        <span className={clsx(
          'text-[10px] font-semibold uppercase tracking-wider',
          empty ? 'text-white/20' : 'text-white/40'
        )}>
          {title}
        </span>
        {!empty && (
          <div
            className="absolute right-0 top-0.5 w-1.5 h-1.5 rounded-full opacity-50"
            style={{ backgroundColor: accent }}
          />
        )}
      </div>

      {/* Value */}
      <div className={clsx(
        'text-[22px] font-black tracking-tight leading-none mb-1',
        empty ? 'text-white/15' : 'text-white'
      )}>
        {value}
      </div>

      {/* Subtitle */}
      <div className={clsx(
        'text-[10px] leading-snug truncate',
        empty ? 'text-white/15' : 'text-white/50'
      )}>
        {subtitle}
      </div>

      {/* Date */}
      {date && !empty && (
        <div className="text-[9px] text-white/25 mt-0.5">{date}</div>
      )}

      {/* At Risk progress bar */}
      {atRisk && !empty && <AtRiskBar {...atRisk} />}
    </div>
  );
}

export function GamingRecordsPanel({ games }: GamingRecordsPanelProps) {
  const bestDay = useMemo(() => getBestGamingDay(games), [games]);
  const bestWeek = useMemo(() => getBestGamingWeek(games), [games]);
  const bestMonth = useMemo(() => getBestGamingMonth(games), [games]);
  const longestStreak = useMemo(() => getLongestGamingStreak(games), [games]);
  const currentStreak = useMemo(() => getCurrentGamingStreak(games), [games]);
  const fastestFinish = useMemo(() => getFastestCompletion(games), [games]);
  const longestSession = useMemo(() => getLongestSession(games), [games]);
  const biggestGame = useMemo(() => getBiggestGame(games), [games]);
  const bestValue = useMemo(() => getValueChampion(games), [games]);
  const mostCompleted = useMemo(() => getMostCompletedMonth(games), [games]);

  // Current week hours (for "at risk" on Best Week)
  const currentWeekHours = useMemo(() => {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 6);
    weekStart.setHours(0, 0, 0, 0);

    let hours = 0;
    for (const game of games) {
      for (const log of game.playLogs ?? []) {
        const d = parseLocalDate(log.date);
        if (d >= weekStart) hours += log.hours;
      }
    }
    return hours;
  }, [games]);

  // Current month completions (for "at risk" on Most Completed Month)
  const currentMonthCompletions = useMemo(() => {
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return games.filter(g => g.status === 'Completed' && g.endDate?.startsWith(thisMonth)).length;
  }, [games]);

  const hasAnyLogs = games.some(g => g.playLogs && g.playLogs.length > 0);
  const hasAnyGames = games.some(g => g.status !== 'Wishlist');

  if (!hasAnyGames) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-white/50 flex items-center gap-2">
        <Trophy size={14} className="text-yellow-400" />
        Personal Records
      </h3>

      <div className="p-4 rounded-xl border border-yellow-500/[0.08] bg-gradient-to-br from-yellow-500/[0.03] to-orange-500/[0.03]">

        {!hasAnyLogs && (
          <p className="text-xs text-white/30 text-center py-2 mb-4">
            Start logging play sessions to track your personal records.
          </p>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">

          {/* 1 · Best Gaming Day */}
          <RecordCard
            icon={<Zap size={13} className="text-orange-400" />}
            accent="#f97316"
            title="Best Day"
            value={bestDay ? `${bestDay.hours.toFixed(1)}h` : '—'}
            subtitle={
              bestDay
                ? bestDay.gameNames.slice(0, 2).join(', ') + (bestDay.gameNames.length > 2 ? ` +${bestDay.gameNames.length - 2}` : '')
                : 'Log a session to start'
            }
            date={bestDay ? fmtDate(bestDay.date) : undefined}
            empty={!bestDay}
          />

          {/* 2 · Best Gaming Week */}
          <RecordCard
            icon={<Flame size={13} className="text-red-400" />}
            accent="#ef4444"
            title="Best Week"
            value={bestWeek ? `${bestWeek.hours.toFixed(1)}h` : '—'}
            subtitle={bestWeek ? fmtWeekRange(bestWeek.weekStart, bestWeek.weekEnd) : 'No data yet'}
            empty={!bestWeek}
            atRisk={
              bestWeek && currentWeekHours >= bestWeek.hours * 0.5
                ? { current: currentWeekHours, max: bestWeek.hours, label: 'this week vs record' }
                : null
            }
          />

          {/* 3 · Best Gaming Month */}
          <RecordCard
            icon={<Calendar size={13} className="text-blue-400" />}
            accent="#3b82f6"
            title="Best Month"
            value={bestMonth ? `${bestMonth.hours.toFixed(1)}h` : '—'}
            subtitle={bestMonth ? fmtMonth(bestMonth.month) : 'No data yet'}
            empty={!bestMonth}
          />

          {/* 4 · Longest Streak */}
          <RecordCard
            icon={<Trophy size={13} className="text-yellow-400" />}
            accent="#eab308"
            title="Longest Streak"
            value={longestStreak > 0 ? `${longestStreak}d` : '—'}
            subtitle={longestStreak > 0 ? `${longestStreak} consecutive days` : 'No streak data'}
            empty={longestStreak === 0}
            atRisk={
              longestStreak > 0 && currentStreak >= Math.max(3, longestStreak * 0.5)
                ? { current: currentStreak, max: longestStreak, label: 'current streak vs record' }
                : null
            }
          />

          {/* 5 · Longest Single Session */}
          <RecordCard
            icon={<Clock size={13} className="text-cyan-400" />}
            accent="#06b6d4"
            title="Longest Session"
            value={longestSession ? `${longestSession.hours.toFixed(1)}h` : '—'}
            subtitle={longestSession ? longestSession.game.name : 'No sessions logged'}
            date={longestSession ? fmtDate(longestSession.date) : undefined}
            empty={!longestSession}
          />

          {/* 6 · Biggest Game (most total hours) */}
          <RecordCard
            icon={<Crown size={13} className="text-purple-400" />}
            accent="#a855f7"
            title="Biggest Game"
            value={biggestGame ? `${biggestGame.hours.toFixed(0)}h` : '—'}
            subtitle={biggestGame ? biggestGame.game.name : 'No games tracked'}
            empty={!biggestGame}
          />

          {/* 7 · Fastest Finish */}
          <RecordCard
            icon={<Gamepad2 size={13} className="text-emerald-400" />}
            accent="#10b981"
            title="Fastest Finish"
            value={fastestFinish ? `${fastestFinish.days}d` : '—'}
            subtitle={fastestFinish ? fastestFinish.game.name : 'Complete a game'}
            empty={!fastestFinish}
          />

          {/* 8 · Best Value Game */}
          <RecordCard
            icon={<Star size={13} className="text-yellow-300" />}
            accent="#fde047"
            title="Best Value"
            value={bestValue ? `$${bestValue.costPerHour.toFixed(2)}/hr` : '—'}
            subtitle={bestValue ? bestValue.game.name : 'Play a paid game'}
            empty={!bestValue}
          />

          {/* 9 · Most Games Completed in a Month */}
          <RecordCard
            icon={<Target size={13} className="text-pink-400" />}
            accent="#ec4899"
            title="Best Month (completions)"
            value={mostCompleted ? `${mostCompleted.count}` : '—'}
            subtitle={mostCompleted ? `${fmtMonth(mostCompleted.month)} · ${mostCompleted.gameNames.slice(0, 2).join(', ')}` : 'Complete a game'}
            empty={!mostCompleted}
            atRisk={
              mostCompleted && currentMonthCompletions >= Math.max(1, mostCompleted.count * 0.5)
                ? { current: currentMonthCompletions, max: mostCompleted.count, label: 'this month vs record' }
                : null
            }
          />

        </div>

        {/* Summary line */}
        {hasAnyLogs && (
          <p className="text-[10px] text-white/20 text-center mt-4">
            Records update automatically as you log sessions · at-risk bars appear when you&apos;re within striking distance
          </p>
        )}
      </div>
    </div>
  );
}
