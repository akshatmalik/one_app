'use client';

import { Clock, Gamepad2, Zap, Calendar } from 'lucide-react';
import { Game } from '../lib/types';
import { getPeriodStats } from '../lib/calculations';
import clsx from 'clsx';

interface PeriodStatsPanelProps {
  games: Game[];
}

export function PeriodStatsPanel({ games }: PeriodStatsPanelProps) {
  const weekStats = getPeriodStats(games, 7);
  const monthStats = getPeriodStats(games, 30);

  // If no recent activity, don't show the panel
  if (weekStats.totalHours === 0 && monthStats.totalHours === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* This Week */}
      {weekStats.totalHours > 0 && (
        <div className="p-5 bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-2xl">
          <div className="flex items-center gap-2 mb-4">
            <Zap size={18} className="text-blue-400" />
            <h3 className="text-base font-semibold text-white">This Week</h3>
            <span className="text-xs text-white/40">Last 7 days</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="p-3 bg-white/5 rounded-xl">
              <div className="text-2xl font-bold text-blue-400">{weekStats.totalHours.toFixed(1)}h</div>
              <div className="text-xs text-white/40">hours played</div>
            </div>
            <div className="p-3 bg-white/5 rounded-xl">
              <div className="text-2xl font-bold text-purple-400">{weekStats.uniqueGames}</div>
              <div className="text-xs text-white/40">games played</div>
            </div>
            <div className="p-3 bg-white/5 rounded-xl">
              <div className="text-2xl font-bold text-cyan-400">{weekStats.totalSessions}</div>
              <div className="text-xs text-white/40">sessions</div>
            </div>
            <div className="p-3 bg-white/5 rounded-xl">
              <div className="text-2xl font-bold text-emerald-400">{weekStats.averageSessionLength.toFixed(1)}h</div>
              <div className="text-xs text-white/40">avg session</div>
            </div>
          </div>

          {weekStats.mostPlayedGame && (
            <div className="p-3 bg-white/5 rounded-xl">
              <div className="flex items-center gap-2 mb-1">
                <Gamepad2 size={14} className="text-white/40" />
                <span className="text-xs text-white/40">Most Played</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-white/90">{weekStats.mostPlayedGame.name}</span>
                <span className="text-sm text-blue-400">{weekStats.mostPlayedGame.hours.toFixed(1)}h</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* This Month */}
      {monthStats.totalHours > 0 && (
        <div className="p-5 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-2xl">
          <div className="flex items-center gap-2 mb-4">
            <Calendar size={18} className="text-purple-400" />
            <h3 className="text-base font-semibold text-white">This Month</h3>
            <span className="text-xs text-white/40">Last 30 days</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="p-3 bg-white/5 rounded-xl">
              <div className="text-2xl font-bold text-purple-400">{monthStats.totalHours.toFixed(1)}h</div>
              <div className="text-xs text-white/40">hours played</div>
            </div>
            <div className="p-3 bg-white/5 rounded-xl">
              <div className="text-2xl font-bold text-pink-400">{monthStats.uniqueGames}</div>
              <div className="text-xs text-white/40">games played</div>
            </div>
            <div className="p-3 bg-white/5 rounded-xl">
              <div className="text-2xl font-bold text-cyan-400">{monthStats.totalSessions}</div>
              <div className="text-xs text-white/40">sessions</div>
            </div>
            <div className="p-3 bg-white/5 rounded-xl">
              <div className="text-2xl font-bold text-emerald-400">{monthStats.averageSessionLength.toFixed(1)}h</div>
              <div className="text-xs text-white/40">avg session</div>
            </div>
          </div>

          {monthStats.mostPlayedGame && (
            <div className="p-3 bg-white/5 rounded-xl">
              <div className="flex items-center gap-2 mb-1">
                <Gamepad2 size={14} className="text-white/40" />
                <span className="text-xs text-white/40">Most Played</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-white/90">{monthStats.mostPlayedGame.name}</span>
                <span className="text-sm text-purple-400">{monthStats.mostPlayedGame.hours.toFixed(1)}h</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
