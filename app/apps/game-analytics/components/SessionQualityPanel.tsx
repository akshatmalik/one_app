'use client';

import { useMemo, useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, CartesianGrid,
} from 'recharts';
import {
  Smile, Flame, ThumbsUp, Meh, Zap, TrendingUp, TrendingDown,
  Moon, Swords, Map, BookOpen, Trophy, Users, Info,
} from 'lucide-react';
import { Game, SessionMood, SessionVibe } from '../lib/types';
import { getMoodAnalysis, parseLocalDate } from '../lib/calculations';
import clsx from 'clsx';

// ── Config ───────────────────────────────────────────────────────────────

const MOOD_CFG: Record<SessionMood, {
  icon: React.ReactNode;
  label: string;
  barColor: string;
  bg: string;
  border: string;
  text: string;
  ringBg: string;
}> = {
  great: {
    icon: <Flame size={14} />,
    label: 'Great',
    barColor: '#10b981',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    text: 'text-emerald-400',
    ringBg: 'bg-emerald-500',
  },
  good: {
    icon: <ThumbsUp size={14} />,
    label: 'Good',
    barColor: '#3b82f6',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    text: 'text-blue-400',
    ringBg: 'bg-blue-500',
  },
  meh: {
    icon: <Meh size={14} />,
    label: 'Meh',
    barColor: '#eab308',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/20',
    text: 'text-yellow-400',
    ringBg: 'bg-yellow-500',
  },
  grind: {
    icon: <Zap size={14} />,
    label: 'Grind',
    barColor: '#f97316',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/20',
    text: 'text-orange-400',
    ringBg: 'bg-orange-500',
  },
};

const VIBE_CFG: Record<SessionVibe, { icon: React.ReactNode; label: string; color: string }> = {
  'wind-down':           { icon: <Moon size={12} />,      label: 'Wind-down',         color: 'text-purple-400' },
  'competitive':         { icon: <Swords size={12} />,    label: 'Competitive',       color: 'text-red-400' },
  'exploration':         { icon: <Map size={12} />,       label: 'Exploration',       color: 'text-cyan-400' },
  'story':               { icon: <BookOpen size={12} />,  label: 'Story Mode',        color: 'text-indigo-400' },
  'achievement-hunting': { icon: <Trophy size={12} />,    label: 'Achievement Hunt',  color: 'text-yellow-400' },
  'social':              { icon: <Users size={12} />,     label: 'Social',            color: 'text-pink-400' },
};

function getJoyGrade(score: number): { grade: string; label: string; color: string } {
  if (score >= 85) return { grade: 'A+', label: 'You\'re loving it', color: 'text-emerald-400' };
  if (score >= 70) return { grade: 'A',  label: 'Mostly great sessions', color: 'text-emerald-400' };
  if (score >= 55) return { grade: 'B',  label: 'More good than bad', color: 'text-blue-400' };
  if (score >= 40) return { grade: 'C',  label: 'Mixed experience', color: 'text-yellow-400' };
  if (score >= 25) return { grade: 'D',  label: 'Feeling the grind', color: 'text-orange-400' };
  return            { grade: 'F',  label: 'Are you even having fun?', color: 'text-red-400' };
}

// ── Helpers ───────────────────────────────────────────────────────────────

function useWeeklyMoodTrend(games: Game[]) {
  return useMemo(() => {
    const now = new Date();
    return Array.from({ length: 12 }, (_, i) => {
      const weekIdx = 11 - i;
      const weekEnd = new Date(now);
      weekEnd.setDate(weekEnd.getDate() - weekIdx * 7);
      weekEnd.setHours(23, 59, 59, 999);
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() - 6);
      weekStart.setHours(0, 0, 0, 0);

      let total = 0;
      let positive = 0;
      games.forEach(game => {
        (game.playLogs || []).forEach(log => {
          if (!log.mood) return;
          const d = parseLocalDate(log.date);
          if (d >= weekStart && d <= weekEnd) {
            total++;
            if (log.mood === 'great' || log.mood === 'good') positive++;
          }
        });
      });

      return {
        week: weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        score: total > 0 ? Math.round((positive / total) * 100) : null,
        total,
      };
    });
  }, [games]);
}

function useGameJoyRankings(games: Game[]) {
  return useMemo(() => {
    return games
      .filter(g => g.status !== 'Wishlist')
      .map(g => {
        const moodLogs = (g.playLogs || []).filter(l => l.mood);
        if (moodLogs.length < 2) return null;
        const positive = moodLogs.filter(l => l.mood === 'great' || l.mood === 'good').length;
        return {
          game: g,
          joyScore: Math.round((positive / moodLogs.length) * 100),
          sessionCount: moodLogs.length,
          positiveCount: positive,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => b.joyScore - a.joyScore);
  }, [games]);
}

function useVibeBreakdown(games: Game[]) {
  return useMemo(() => {
    const vibeData: Record<string, { count: number; hours: number }> = {};
    games.forEach(g => {
      (g.playLogs || []).forEach(log => {
        if (!log.vibe) return;
        if (!vibeData[log.vibe]) vibeData[log.vibe] = { count: 0, hours: 0 };
        vibeData[log.vibe].count++;
        vibeData[log.vibe].hours += log.hours;
      });
    });
    const total = Object.values(vibeData).reduce((s, v) => s + v.count, 0);
    return Object.entries(vibeData)
      .map(([vibe, data]) => ({
        vibe: vibe as SessionVibe,
        count: data.count,
        hours: data.hours,
        percent: total > 0 ? Math.round((data.count / total) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [games]);
}

// ── Tooltip ───────────────────────────────────────────────────────────────

function TrendTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload || payload[0]?.value == null) return null;
  return (
    <div className="px-2.5 py-1.5 bg-gray-900/95 border border-white/10 rounded-lg text-xs">
      <div className="text-white/50 mb-0.5">{label}</div>
      <div className="font-semibold text-emerald-400">{payload[0].value}% positive</div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────

interface SessionQualityPanelProps {
  games: Game[];
}

export function SessionQualityPanel({ games }: SessionQualityPanelProps) {
  const [activeSection, setActiveSection] = useState<'joy' | 'grind'>('joy');

  const moodAnalysis   = useMemo(() => getMoodAnalysis(games), [games]);
  const weeklyTrend    = useWeeklyMoodTrend(games);
  const gameRankings   = useGameJoyRankings(games);
  const vibeBreakdown  = useVibeBreakdown(games);

  const { moodDistribution, totalTaggedSessions, totalSessions, topGameByMood } = moodAnalysis;

  const positiveCount = moodDistribution
    .filter(m => m.mood === 'great' || m.mood === 'good')
    .reduce((s, m) => s + m.count, 0);

  const joyScoreRaw = totalTaggedSessions > 0
    ? Math.round((positiveCount / totalTaggedSessions) * 100)
    : 0;

  const { grade, label: gradeLabel, color: gradeColor } = getJoyGrade(joyScoreRaw);

  const taggingRate = totalSessions > 0
    ? Math.round((totalTaggedSessions / totalSessions) * 100)
    : 0;

  const trendData = weeklyTrend.map(w => ({
    week: w.week,
    score: w.score ?? undefined,
    total: w.total,
  }));

  const weeksWithData = trendData.filter(w => w.score != null).length;

  const joyGames   = gameRankings.slice(0, 3);
  const grindGames = [...gameRankings].sort((a, b) => a.joyScore - b.joyScore).slice(0, 3);

  const hasVibeData = vibeBreakdown.length > 0;

  // ── Empty state ──────────────────────────────────────────────────────
  if (totalTaggedSessions < 3) {
    return (
      <div className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl">
        <div className="flex items-center gap-2 mb-1">
          <Smile size={16} className="text-pink-400" />
          <h3 className="text-sm font-semibold text-white">Session Quality</h3>
        </div>
        <p className="text-xs text-white/30 mb-4">
          Track how you feel during gaming sessions to unlock mood insights.
        </p>

        <div className="p-4 bg-pink-500/5 border border-pink-500/15 rounded-xl text-center mb-4">
          <div className="text-3xl mb-2">😶</div>
          <div className="text-sm font-medium text-white/60 mb-1">
            {totalTaggedSessions === 0
              ? 'No sessions tagged with mood yet'
              : `${totalTaggedSessions} session${totalTaggedSessions === 1 ? '' : 's'} tagged — need at least 3`}
          </div>
          <div className="text-xs text-white/30">
            {totalSessions > 0
              ? `You have ${totalSessions} session${totalSessions === 1 ? '' : 's'} total — start tagging for insights`
              : 'Log sessions with mood to unlock this panel'}
          </div>
        </div>

        <div className="p-3 bg-white/[0.02] border border-white/5 rounded-lg flex gap-3">
          <Info size={14} className="text-white/30 mt-0.5 shrink-0" />
          <div className="text-xs text-white/40 leading-relaxed">
            When logging a session, tap a mood icon (🔥 Great, 👍 Good, 😐 Meh, 💪 Grind).
            After 3 tagged sessions, this panel shows your gaming joy score, mood trends, and which games make you happiest.
          </div>
        </div>
      </div>
    );
  }

  // ── Full panel ───────────────────────────────────────────────────────
  return (
    <div className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Smile size={16} className="text-pink-400" />
            <h3 className="text-sm font-semibold text-white">Session Quality</h3>
          </div>
          <p className="text-xs text-white/30">
            Based on {totalTaggedSessions} tagged session{totalTaggedSessions !== 1 ? 's' : ''}
            {taggingRate < 100 && ` (${taggingRate}% of all sessions)`}
          </p>
        </div>

        {/* Joy Grade */}
        <div className="text-right">
          <div className={clsx('text-3xl font-black leading-none', gradeColor)}>{grade}</div>
          <div className="text-[10px] text-white/30 mt-0.5">{gradeLabel}</div>
        </div>
      </div>

      {/* Joy Score Hero */}
      <div className="p-4 bg-gradient-to-br from-pink-500/10 to-rose-500/5 border border-pink-500/15 rounded-xl">
        <div className="flex items-end gap-3 mb-3">
          <div>
            <div className="text-4xl font-black text-white">{joyScoreRaw}%</div>
            <div className="text-xs text-white/40">of sessions were positive</div>
          </div>
          <div className="flex-1 text-right text-xs text-white/30 leading-relaxed">
            {positiveCount} positive
            <br />
            out of {totalTaggedSessions} tagged
          </div>
        </div>

        {/* Stacked mood bar */}
        <div className="h-3 flex rounded-full overflow-hidden gap-px">
          {(['great', 'good', 'meh', 'grind'] as SessionMood[]).map(mood => {
            const entry = moodDistribution.find(m => m.mood === mood);
            if (!entry || entry.percent === 0) return null;
            return (
              <div
                key={mood}
                style={{ width: `${entry.percent}%`, background: MOOD_CFG[mood].barColor }}
                title={`${MOOD_CFG[mood].label}: ${entry.percent}%`}
              />
            );
          })}
        </div>
        <div className="flex items-center gap-3 mt-2">
          {(['great', 'good', 'meh', 'grind'] as SessionMood[]).map(mood => {
            const entry = moodDistribution.find(m => m.mood === mood);
            if (!entry) return null;
            return (
              <div key={mood} className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ background: MOOD_CFG[mood].barColor }} />
                <span className="text-[10px] text-white/40">{entry.percent}% {MOOD_CFG[mood].label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mood breakdown cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {(['great', 'good', 'meh', 'grind'] as SessionMood[]).map(mood => {
          const entry = moodDistribution.find(m => m.mood === mood);
          const cfg = MOOD_CFG[mood];
          const top = topGameByMood[mood];
          return (
            <div
              key={mood}
              className={clsx('p-3 rounded-xl border', cfg.bg, cfg.border)}
            >
              <div className={clsx('flex items-center gap-1.5 mb-1.5', cfg.text)}>
                {cfg.icon}
                <span className="text-xs font-semibold">{cfg.label}</span>
              </div>
              {entry ? (
                <>
                  <div className="text-xl font-bold text-white">{entry.count}</div>
                  <div className="text-[10px] text-white/30">{entry.percent}% · {entry.avgHours}h avg</div>
                  {top && (
                    <div className="mt-1.5 text-[10px] text-white/40 truncate" title={top.game}>
                      📌 {top.game}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-xl font-bold text-white/20">—</div>
              )}
            </div>
          );
        })}
      </div>

      {/* 12-Week Trend */}
      {weeksWithData >= 3 && (
        <div>
          <h4 className="text-xs font-medium text-white/50 flex items-center gap-2 mb-3">
            <TrendingUp size={13} className="text-pink-400" />
            Joy Trend — Last 12 Weeks
          </h4>

          <div className="h-[120px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 4, right: 4, bottom: 0, left: -28 }}>
                <defs>
                  <linearGradient id="joyGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis
                  dataKey="week"
                  tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 9 }}
                  tickLine={false}
                  axisLine={false}
                  interval={2}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 9 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={v => `${v}%`}
                />
                <Tooltip content={<TrendTooltip />} />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="#ec4899"
                  strokeWidth={2}
                  fill="url(#joyGrad)"
                  connectNulls
                  dot={false}
                  activeDot={{ r: 3, fill: '#ec4899' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Game Joy Rankings */}
      {gameRankings.length >= 2 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="flex rounded-lg overflow-hidden border border-white/10 text-xs">
              <button
                onClick={() => setActiveSection('joy')}
                className={clsx(
                  'px-3 py-1.5 font-medium transition-colors',
                  activeSection === 'joy'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'text-white/30 hover:text-white/50'
                )}
              >
                🔥 Joy Boosters
              </button>
              <button
                onClick={() => setActiveSection('grind')}
                className={clsx(
                  'px-3 py-1.5 font-medium transition-colors',
                  activeSection === 'grind'
                    ? 'bg-orange-500/20 text-orange-400'
                    : 'text-white/30 hover:text-white/50'
                )}
              >
                💪 Grind Games
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {(activeSection === 'joy' ? joyGames : grindGames).map((item, idx) => {
              const isJoy = activeSection === 'joy';
              const score = item.joyScore;
              const borderColor = score >= 80 ? 'border-emerald-500/20' : score >= 60 ? 'border-blue-500/20' : score >= 40 ? 'border-yellow-500/20' : 'border-orange-500/20';
              const barColor = score >= 80 ? '#10b981' : score >= 60 ? '#3b82f6' : score >= 40 ? '#eab308' : '#f97316';
              return (
                <div
                  key={item.game.id}
                  className={clsx('p-3 bg-white/[0.02] border rounded-xl flex items-center gap-3', borderColor)}
                >
                  {/* Rank */}
                  <div className="w-6 text-center text-xs font-bold text-white/30">
                    {idx === 0 ? (isJoy ? '🥇' : '😓') : idx === 1 ? (isJoy ? '🥈' : '😤') : isJoy ? '🥉' : '😑'}
                  </div>

                  {/* Thumbnail */}
                  {item.game.thumbnail ? (
                    <img src={item.game.thumbnail} alt={item.game.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-white/5 shrink-0 flex items-center justify-center text-white/20 text-lg">
                      🎮
                    </div>
                  )}

                  {/* Name + bar */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate mb-1.5">{item.game.name}</div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${score}%`, background: barColor }}
                      />
                    </div>
                  </div>

                  {/* Score */}
                  <div className="text-right shrink-0">
                    <div className="text-lg font-bold text-white">{score}%</div>
                    <div className="text-[10px] text-white/30">{item.sessionCount} sessions</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Vibe Breakdown */}
      {hasVibeData && (
        <div>
          <h4 className="text-xs font-medium text-white/50 flex items-center gap-2 mb-3">
            <Zap size={13} className="text-violet-400" />
            Session Vibes
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {vibeBreakdown.map(entry => {
              const cfg = VIBE_CFG[entry.vibe];
              return (
                <div
                  key={entry.vibe}
                  className="p-3 bg-white/[0.02] border border-white/5 rounded-xl"
                >
                  <div className={clsx('flex items-center gap-1.5 mb-1', cfg.color)}>
                    {cfg.icon}
                    <span className="text-[11px] font-medium">{cfg.label}</span>
                  </div>
                  <div className="text-base font-bold text-white">{entry.count}</div>
                  <div className="text-[10px] text-white/30">{entry.percent}% · {entry.hours.toFixed(1)}h</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Insight from mood analysis */}
      {moodAnalysis.bestMoodForRating && (
        <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl flex gap-3">
          <div className="text-pink-400 mt-0.5 shrink-0">
            <Smile size={14} />
          </div>
          <p className="text-xs text-white/50 leading-relaxed">
            Your highest-rated games tend to be played in <span className="text-white/70 font-medium">{moodAnalysis.bestMoodForRating.mood}</span> sessions
            (avg game rating {moodAnalysis.bestMoodForRating.avgGameRating}/10).
            {moodAnalysis.longestSessionMood && (
              <> Your longest ever session was a <span className="text-white/70 font-medium">{moodAnalysis.longestSessionMood.mood}</span> one —
                {' '}{moodAnalysis.longestSessionMood.hours}h on {moodAnalysis.longestSessionMood.game}.</>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
