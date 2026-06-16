'use client';

import { useState, useMemo } from 'react';
import {
  Calendar, Clock, Filter, ChevronDown, ChevronUp, Flame, Star, Smile,
  Meh, Frown, Zap, Search, X, Gamepad2, BarChart2,
} from 'lucide-react';
import { Game, SessionMood } from '../lib/types';
import { getAllPlayLogs, parseLocalDate } from '../lib/calculations';
import clsx from 'clsx';

type PeriodFilter = '7d' | '30d' | '90d' | 'all';

const MOOD_CONFIG: Record<SessionMood, { icon: React.ReactNode; label: string; color: string }> = {
  great:  { icon: <Star size={12} />,  label: 'Great',  color: 'text-yellow-400' },
  good:   { icon: <Smile size={12} />, label: 'Good',   color: 'text-emerald-400' },
  meh:    { icon: <Meh size={12} />,   label: 'Meh',    color: 'text-white/50' },
  grind:  { icon: <Frown size={12} />, label: 'Grind',  color: 'text-orange-400' },
};

function formatHrs(h: number): string {
  if (h < 1) return `${Math.round(h * 60)} min`;
  if (h % 1 === 0) return `${h} hr${h !== 1 ? 's' : ''}`;
  return `${h.toFixed(1)} hrs`;
}

function formatDayHeader(dateStr: string): string {
  const d = parseLocalDate(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  d.setHours(0, 0, 0, 0);
  if (d.getTime() === today.getTime()) return 'Today';
  if (d.getTime() === yesterday.getTime()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined });
}

function relativeTime(dateStr: string): string {
  const d = parseLocalDate(dateStr);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'today';
  if (diff === 1) return 'yesterday';
  if (diff < 7) return `${diff}d ago`;
  if (diff < 30) return `${Math.floor(diff / 7)}w ago`;
  if (diff < 365) return `${Math.floor(diff / 30)}mo ago`;
  return `${Math.floor(diff / 365)}y ago`;
}

interface SessionLogPanelProps {
  games: Game[];
}

export function SessionLogPanel({ games }: SessionLogPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [period, setPeriod] = useState<PeriodFilter>('30d');
  const [moodFilter, setMoodFilter] = useState<SessionMood | 'all'>('all');
  const [gameFilter, setGameFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // All sessions from all games
  const allSessions = useMemo(() => getAllPlayLogs(games), [games]);

  // Cut-off date based on period filter
  const cutoff = useMemo(() => {
    if (period === 'all') return null;
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const d = new Date();
    d.setDate(d.getDate() - days);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [period]);

  // Unique games that have sessions (for the game filter dropdown)
  const gamesWithSessions = useMemo(() => {
    const ids = new Set(allSessions.map(s => s.game.id));
    return games.filter(g => ids.has(g.id)).sort((a, b) => a.name.localeCompare(b.name));
  }, [allSessions, games]);

  // Apply filters
  const filtered = useMemo(() => {
    return allSessions.filter(({ game, log }) => {
      if (cutoff && parseLocalDate(log.date) < cutoff) return false;
      if (moodFilter !== 'all' && log.mood !== moodFilter) return false;
      if (gameFilter !== 'all' && game.id !== gameFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inGame = game.name.toLowerCase().includes(q);
        const inNotes = log.notes?.toLowerCase().includes(q) ?? false;
        if (!inGame && !inNotes) return false;
      }
      return true;
    });
  }, [allSessions, cutoff, moodFilter, gameFilter, searchQuery]);

  // Summary stats
  const stats = useMemo(() => {
    const totalSessions = filtered.length;
    const totalHours = filtered.reduce((sum, s) => sum + s.log.hours, 0);
    const avgLen = totalSessions > 0 ? totalHours / totalSessions : 0;
    // Best day (most hours)
    const byDay: Record<string, number> = {};
    for (const { log } of filtered) {
      byDay[log.date] = (byDay[log.date] || 0) + log.hours;
    }
    const bestDay = Object.entries(byDay).sort((a, b) => b[1] - a[1])[0];
    return { totalSessions, totalHours, avgLen, bestDay };
  }, [filtered]);

  // Group sessions by day
  const byDay = useMemo(() => {
    const map: Record<string, typeof filtered> = {};
    for (const s of filtered) {
      const key = s.log.date;
      if (!map[key]) map[key] = [];
      map[key].push(s);
    }
    return Object.entries(map).sort((a, b) => parseLocalDate(b[0]).getTime() - parseLocalDate(a[0]).getTime());
  }, [filtered]);

  // Max hours in a single session (for relative bar widths)
  const maxSessionHours = useMemo(
    () => Math.max(...filtered.map(s => s.log.hours), 0.1),
    [filtered]
  );

  const activeFilters = moodFilter !== 'all' || gameFilter !== 'all' || searchQuery.trim() !== '';

  if (allSessions.length === 0) return null;

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between p-5 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/15 flex items-center justify-center">
            <Calendar size={16} className="text-indigo-400" />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-semibold text-white">Session Log</h3>
            <p className="text-xs text-white/40">
              {allSessions.length} session{allSessions.length !== 1 ? 's' : ''} across {gamesWithSessions.length} game{gamesWithSessions.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        {collapsed ? <ChevronDown size={16} className="text-white/30" /> : <ChevronUp size={16} className="text-white/30" />}
      </button>

      {!collapsed && (
        <div className="px-5 pb-5 space-y-4">
          {/* Summary stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { icon: <BarChart2 size={13} />, label: 'Sessions', value: stats.totalSessions.toString(), color: 'text-indigo-400' },
              { icon: <Clock size={13} />,     label: 'Total hours', value: formatHrs(stats.totalHours), color: 'text-blue-400' },
              { icon: <Zap size={13} />,       label: 'Avg length', value: formatHrs(stats.avgLen), color: 'text-purple-400' },
              { icon: <Flame size={13} />,     label: 'Best day', value: stats.bestDay ? formatHrs(stats.bestDay[1]) : '—', color: 'text-orange-400' },
            ].map(({ icon, label, value, color }) => (
              <div key={label} className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.06]">
                <div className={clsx('flex items-center gap-1.5 mb-1', color)}>{icon}<span className="text-[10px] uppercase tracking-wide font-medium">{label}</span></div>
                <div className="text-base font-bold text-white">{value}</div>
              </div>
            ))}
          </div>

          {/* Filter bar */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Period */}
            <div className="flex items-center gap-1 bg-white/[0.03] rounded-lg p-1">
              {(['7d', '30d', '90d', 'all'] as PeriodFilter[]).map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={clsx(
                    'px-2.5 py-1 rounded-md text-[11px] font-medium transition-all',
                    period === p ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'
                  )}
                >
                  {p === 'all' ? 'All time' : p}
                </button>
              ))}
            </div>

            {/* Filter toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all border',
                activeFilters
                  ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300'
                  : 'bg-white/[0.03] border-white/10 text-white/40 hover:text-white/60'
              )}
            >
              <Filter size={11} />
              Filter{activeFilters ? ' (active)' : ''}
            </button>
          </div>

          {/* Expanded filters */}
          {showFilters && (
            <div className="bg-white/[0.02] rounded-xl p-3 border border-white/[0.06] space-y-2">
              {/* Search */}
              <div className="relative">
                <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search game or notes…"
                  className="w-full pl-8 pr-8 py-2 bg-white/[0.03] border border-white/10 text-white text-xs rounded-lg placeholder:text-white/25 focus:outline-none focus:border-indigo-500/40 transition-all"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                    <X size={12} />
                  </button>
                )}
              </div>

              <div className="flex gap-2 flex-wrap">
                {/* Mood filter */}
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-white/30 uppercase tracking-wide">Mood</span>
                  {(['all', 'great', 'good', 'meh', 'grind'] as const).map(m => (
                    <button
                      key={m}
                      onClick={() => setMoodFilter(m)}
                      className={clsx(
                        'px-2 py-1 rounded text-[10px] font-medium transition-all capitalize',
                        moodFilter === m ? 'bg-white/15 text-white' : 'text-white/30 hover:text-white/60'
                      )}
                    >
                      {m === 'all' ? 'All' : (
                        <span className={MOOD_CONFIG[m as SessionMood].color}>
                          {MOOD_CONFIG[m as SessionMood].label}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Game filter */}
                <select
                  value={gameFilter}
                  onChange={e => setGameFilter(e.target.value)}
                  className="px-2 py-1 bg-white/[0.03] border border-white/10 text-white text-[11px] rounded-lg focus:outline-none focus:border-indigo-500/30 cursor-pointer"
                >
                  <option value="all">All games</option>
                  {gamesWithSessions.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Session feed */}
          {filtered.length === 0 ? (
            <div className="text-center py-8">
              <Gamepad2 size={24} className="mx-auto text-white/20 mb-2" />
              <p className="text-sm text-white/30">No sessions match your filters</p>
            </div>
          ) : (
            <div className="space-y-5">
              {byDay.map(([dayKey, sessions]) => {
                const dayTotal = sessions.reduce((sum, s) => sum + s.log.hours, 0);
                const isBigDay = dayTotal >= 4;
                return (
                  <div key={dayKey}>
                    {/* Day header */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-semibold text-white/60">{formatDayHeader(dayKey)}</span>
                      <div className="flex-1 h-px bg-white/[0.06]" />
                      <span className={clsx('text-[10px] font-medium', isBigDay ? 'text-orange-400' : 'text-white/30')}>
                        {isBigDay && <Flame size={10} className="inline mr-0.5 mb-0.5" />}
                        {formatHrs(dayTotal)}
                        {sessions.length > 1 && ` · ${sessions.length} sessions`}
                      </span>
                    </div>

                    {/* Session cards */}
                    <div className="space-y-2">
                      {sessions.map(({ game, log }) => {
                        const barWidth = Math.round((log.hours / maxSessionHours) * 100);
                        const mood = log.mood ? MOOD_CONFIG[log.mood] : null;
                        return (
                          <div
                            key={log.id}
                            className="bg-white/[0.025] rounded-xl border border-white/[0.06] p-3 hover:bg-white/[0.04] transition-colors"
                          >
                            <div className="flex items-start gap-3">
                              {/* Thumbnail */}
                              <div className="flex-shrink-0 w-10 h-10 rounded-lg overflow-hidden bg-white/[0.05] border border-white/[0.08]">
                                {game.thumbnail ? (
                                  <img src={game.thumbnail} alt={game.name} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <Gamepad2 size={16} className="text-white/20" />
                                  </div>
                                )}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-xs font-semibold text-white truncate">{game.name}</span>
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    {mood && (
                                      <span className={clsx('flex items-center gap-0.5 text-[10px]', mood.color)}>
                                        {mood.icon}
                                        <span>{mood.label}</span>
                                      </span>
                                    )}
                                    <span className="text-xs font-bold text-white">{formatHrs(log.hours)}</span>
                                  </div>
                                </div>

                                {/* Session length bar */}
                                <div className="mt-1.5 h-1 bg-white/[0.05] rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-indigo-500/60 rounded-full transition-all"
                                    style={{ width: `${barWidth}%` }}
                                  />
                                </div>

                                {/* Notes */}
                                {log.notes && (
                                  <p className="mt-1.5 text-[11px] text-white/40 line-clamp-2 italic">"{log.notes}"</p>
                                )}

                                {/* Footer */}
                                <div className="mt-1.5 flex items-center gap-2">
                                  {game.platform && (
                                    <span className="text-[10px] text-white/20">{game.platform}</span>
                                  )}
                                  <span className="text-[10px] text-white/20">{relativeTime(log.date)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Load-more hint for "all time" with many sessions */}
              {filtered.length > 50 && period !== 'all' && (
                <p className="text-center text-[11px] text-white/25 pb-1">
                  Showing {filtered.length} sessions · Switch to "All time" to see everything
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
