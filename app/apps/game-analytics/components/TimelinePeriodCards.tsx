'use client';

import { Clock, Gamepad2, Zap, Calendar, TrendingUp } from 'lucide-react';
import { Game } from '../lib/types';
import { getPeriodStats, getLastWeekStats, getLastMonthStats } from '../lib/calculations';
import clsx from 'clsx';

interface TimelinePeriodCardsProps {
  games: Game[];
}

export function TimelinePeriodCards({ games }: TimelinePeriodCardsProps) {
  const thisWeekStats = getPeriodStats(games, 7);
  const lastWeekStats = getLastWeekStats(games);
  const thisMonthStats = getPeriodStats(games, 30);
  const lastMonthStats = getLastMonthStats(games);

  const hasAnyActivity = thisWeekStats.totalHours > 0 || lastWeekStats.totalHours > 0 ||
                        thisMonthStats.totalHours > 0 || lastMonthStats.totalHours > 0;

  if (!hasAnyActivity) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      {/* This Week */}
      <PeriodCard
        title="This Week"
        subtitle="Last 7 days"
        icon={<Zap size={16} />}
        hours={thisWeekStats.totalHours}
        games={thisWeekStats.uniqueGames}
        sessions={thisWeekStats.totalSessions}
        mostPlayed={thisWeekStats.mostPlayedGame}
        gradient="from-blue-500/10 to-cyan-500/10"
        border="border-blue-500/20"
        iconColor="text-blue-400"
        hoursColor="text-blue-400"
      />

      {/* Last Week */}
      {lastWeekStats.totalHours > 0 && (
        <PeriodCard
          title="Last Week"
          subtitle="Previous 7 days"
          icon={<Calendar size={16} />}
          hours={lastWeekStats.totalHours}
          games={lastWeekStats.uniqueGames}
          sessions={lastWeekStats.totalSessions}
          mostPlayed={lastWeekStats.mostPlayedGame}
          gradient="from-indigo-500/10 to-blue-500/10"
          border="border-indigo-500/20"
          iconColor="text-indigo-400"
          hoursColor="text-indigo-400"
        />
      )}

      {/* This Month */}
      <PeriodCard
        title="This Month"
        subtitle="Last 30 days"
        icon={<TrendingUp size={16} />}
        hours={thisMonthStats.totalHours}
        games={thisMonthStats.uniqueGames}
        sessions={thisMonthStats.totalSessions}
        mostPlayed={thisMonthStats.mostPlayedGame}
        gradient="from-purple-500/10 to-pink-500/10"
        border="border-purple-500/20"
        iconColor="text-purple-400"
        hoursColor="text-purple-400"
      />

      {/* Last Month */}
      {lastMonthStats.totalHours > 0 && (
        <PeriodCard
          title="Last Month"
          subtitle="Previous 30 days"
          icon={<Calendar size={16} />}
          hours={lastMonthStats.totalHours}
          games={lastMonthStats.uniqueGames}
          sessions={lastMonthStats.totalSessions}
          mostPlayed={lastMonthStats.mostPlayedGame}
          gradient="from-violet-500/10 to-purple-500/10"
          border="border-violet-500/20"
          iconColor="text-violet-400"
          hoursColor="text-violet-400"
        />
      )}
    </div>
  );
}

interface PeriodCardProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  hours: number;
  games: number;
  sessions: number;
  mostPlayed: { name: string; hours: number } | null;
  gradient: string;
  border: string;
  iconColor: string;
  hoursColor: string;
}

function PeriodCard({
  title,
  subtitle,
  icon,
  hours,
  games,
  sessions,
  mostPlayed,
  gradient,
  border,
  iconColor,
  hoursColor,
}: PeriodCardProps) {
  return (
    <div className={clsx('p-4 rounded-xl border bg-gradient-to-br', gradient, border)}>
      <div className="flex items-center gap-2 mb-3">
        <span className={iconColor}>{icon}</span>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          <p className="text-xs text-white/40">{subtitle}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="text-center">
          <div className={clsx('text-lg font-bold', hoursColor)}>{hours.toFixed(1)}h</div>
          <div className="text-[10px] text-white/30">played</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-white/80">{games}</div>
          <div className="text-[10px] text-white/30">games</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-white/80">{sessions}</div>
          <div className="text-[10px] text-white/30">sessions</div>
        </div>
      </div>

      {mostPlayed && (
        <div className="pt-2 border-t border-white/5">
          <div className="flex items-center gap-1.5 text-xs">
            <Gamepad2 size={10} className="text-white/30" />
            <span className="text-white/40 truncate flex-1" title={mostPlayed.name}>
              {mostPlayed.name.length > 18 ? `${mostPlayed.name.slice(0, 18)}...` : mostPlayed.name}
            </span>
            <span className={clsx('font-medium', hoursColor)}>{mostPlayed.hours.toFixed(1)}h</span>
          </div>
        </div>
      )}
    </div>
  );
}
