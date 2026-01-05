'use client';

import { useState } from 'react';
import { Clock, Gamepad2, Zap, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { Game } from '../lib/types';
import { getPeriodStats } from '../lib/calculations';
import clsx from 'clsx';

interface PeriodStatsPanelProps {
  games: Game[];
}

export function PeriodStatsPanel({ games }: PeriodStatsPanelProps) {
  const [showWeekGames, setShowWeekGames] = useState(false);
  const [showMonthGames, setShowMonthGames] = useState(false);

  const weekStats = getPeriodStats(games, 7);
  const monthStats = getPeriodStats(games, 30);

  // Get detailed game stats for each period
  const getGameStatsForPeriod = (days: number) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const gameStats: Map<string, { game: Game; hours: number; sessions: number }> = new Map();

    games.forEach(game => {
      if (game.playLogs) {
        game.playLogs.forEach(log => {
          const logDate = new Date(log.date);
          if (logDate >= cutoffDate) {
            const existing = gameStats.get(game.id) || { game, hours: 0, sessions: 0 };
            existing.hours += log.hours;
            existing.sessions += 1;
            gameStats.set(game.id, existing);
          }
        });
      }
    });

    return Array.from(gameStats.values()).sort((a, b) => b.hours - a.hours);
  };

  const weekGames = getGameStatsForPeriod(7);
  const monthGames = getGameStatsForPeriod(30);

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
              <div className="flex items-center gap-2 mb-2">
                <Gamepad2 size={14} className="text-white/40" />
                <span className="text-xs text-white/40">Most Played</span>
              </div>
              <div className="flex items-center gap-3">
                {weekStats.mostPlayedGame.thumbnail && (
                  <img
                    src={weekStats.mostPlayedGame.thumbnail}
                    alt={weekStats.mostPlayedGame.name}
                    className="w-12 h-12 object-cover rounded"
                    loading="lazy"
                  />
                )}
                <div className="flex-1 min-w-0 flex items-center justify-between">
                  <span className="text-sm font-medium text-white/90 truncate">{weekStats.mostPlayedGame.name}</span>
                  <span className="text-sm text-blue-400 font-semibold shrink-0 ml-2">{weekStats.mostPlayedGame.hours.toFixed(1)}h</span>
                </div>
              </div>
            </div>
          )}

          {/* Games List */}
          {weekGames.length > 0 && (
            <div className="mt-3 pt-3 border-t border-white/10">
              <button
                onClick={() => setShowWeekGames(!showWeekGames)}
                className="w-full flex items-center justify-between px-3 py-2 hover:bg-white/5 rounded-lg transition-all"
              >
                <div className="flex items-center gap-2">
                  <Gamepad2 size={14} className="text-white/40" />
                  <span className="text-sm text-white/70">Games Played ({weekGames.length})</span>
                </div>
                {showWeekGames ? <ChevronUp size={16} className="text-white/40" /> : <ChevronDown size={16} className="text-white/40" />}
              </button>
              {showWeekGames && (
                <div className="mt-2 space-y-1">
                  {weekGames.map(({ game, hours, sessions }) => (
                    <div key={game.id} className="flex items-center gap-3 px-3 py-2 bg-white/[0.03] rounded-lg">
                      {game.thumbnail && (
                        <img
                          src={game.thumbnail}
                          alt={game.name}
                          className="w-10 h-10 object-cover rounded shrink-0"
                          loading="lazy"
                        />
                      )}
                      <div className="flex-1 min-w-0 flex items-center justify-between">
                        <span className="text-sm text-white/80 truncate">{game.name}</span>
                        <div className="flex items-center gap-3 shrink-0 ml-3">
                          <span className="text-xs text-cyan-400">{sessions} session{sessions !== 1 ? 's' : ''}</span>
                          <span className="text-sm text-blue-400 font-medium">{hours.toFixed(1)}h</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
              <div className="flex items-center gap-2 mb-2">
                <Gamepad2 size={14} className="text-white/40" />
                <span className="text-xs text-white/40">Most Played</span>
              </div>
              <div className="flex items-center gap-3">
                {monthStats.mostPlayedGame.thumbnail && (
                  <img
                    src={monthStats.mostPlayedGame.thumbnail}
                    alt={monthStats.mostPlayedGame.name}
                    className="w-12 h-12 object-cover rounded"
                    loading="lazy"
                  />
                )}
                <div className="flex-1 min-w-0 flex items-center justify-between">
                  <span className="text-sm font-medium text-white/90 truncate">{monthStats.mostPlayedGame.name}</span>
                  <span className="text-sm text-purple-400 font-semibold shrink-0 ml-2">{monthStats.mostPlayedGame.hours.toFixed(1)}h</span>
                </div>
              </div>
            </div>
          )}

          {/* Games List */}
          {monthGames.length > 0 && (
            <div className="mt-3 pt-3 border-t border-white/10">
              <button
                onClick={() => setShowMonthGames(!showMonthGames)}
                className="w-full flex items-center justify-between px-3 py-2 hover:bg-white/5 rounded-lg transition-all"
              >
                <div className="flex items-center gap-2">
                  <Gamepad2 size={14} className="text-white/40" />
                  <span className="text-sm text-white/70">Games Played ({monthGames.length})</span>
                </div>
                {showMonthGames ? <ChevronUp size={16} className="text-white/40" /> : <ChevronDown size={16} className="text-white/40" />}
              </button>
              {showMonthGames && (
                <div className="mt-2 space-y-1">
                  {monthGames.map(({ game, hours, sessions }) => (
                    <div key={game.id} className="flex items-center gap-3 px-3 py-2 bg-white/[0.03] rounded-lg">
                      {game.thumbnail && (
                        <img
                          src={game.thumbnail}
                          alt={game.name}
                          className="w-10 h-10 object-cover rounded shrink-0"
                          loading="lazy"
                        />
                      )}
                      <div className="flex-1 min-w-0 flex items-center justify-between">
                        <span className="text-sm text-white/80 truncate">{game.name}</span>
                        <div className="flex items-center gap-3 shrink-0 ml-3">
                          <span className="text-xs text-cyan-400">{sessions} session{sessions !== 1 ? 's' : ''}</span>
                          <span className="text-sm text-purple-400 font-medium">{hours.toFixed(1)}h</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
