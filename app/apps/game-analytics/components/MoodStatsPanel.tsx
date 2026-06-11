'use client';

import { useMemo } from 'react';
import {
  Smile, TrendingUp, TrendingDown, Tag, Heart,
  AlertTriangle, Minus,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { Game, SessionMood } from '../lib/types';
import { getMoodAnalysis, MoodAnalysis, parseLocalDate } from '../lib/calculations';
import clsx from 'clsx';

// ─────────────────────────────────────────
// Config
// ─────────────────────────────────────────

const MOOD_CONFIG: Record<SessionMood, {
  label: string; emoji: string; color: string;
  bg: string; border: string; text: string;
}> = {
  great: {
    label: 'Great', emoji: '🔥', color: '#10b981',
    bg: 'bg-emerald-500/15', border: 'border-emerald-500/20', text: 'text-emerald-400',
  },
  good: {
    label: 'Good', emoji: '👍', color: '#3b82f6',
    bg: 'bg-blue-500/15', border: 'border-blue-500/20', text: 'text-blue-400',
  },
  meh: {
    label: 'Meh', emoji: '😐', color: '#f59e0b',
    bg: 'bg-amber-500/15', border: 'border-amber-500/20', text: 'text-amber-400',
  },
  grind: {
    label: 'Grind', emoji: '💪', color: '#ef4444',
    bg: 'bg-red-500/15', border: 'border-red-500/20', text: 'text-red-400',
  },
};

// ─────────────────────────────────────────
// Per-game mood breakdown
// ─────────────────────────────────────────

interface GameMoodBreakdown {
  game: Game;
  totalTagged: number;
  great: number;
  good: number;
  meh: number;
  grind: number;
  positivePercent: number; // great + good
  grindPercent: number;
}

function computeGameBreakdowns(games: Game[]): GameMoodBreakdown[] {
  const result: GameMoodBreakdown[] = [];
  games
    .filter(g => g.status !== 'Wishlist')
    .forEach(game => {
      const tagged = (game.playLogs ?? []).filter(l => l.mood);
      if (tagged.length < 3) return; // need at least 3 tagged sessions
      const counts = { great: 0, good: 0, meh: 0, grind: 0 };
      tagged.forEach(l => { if (l.mood) counts[l.mood]++; });
      const total = tagged.length;
      result.push({
        game,
        totalTagged: total,
        ...counts,
        positivePercent: Math.round(((counts.great + counts.good) / total) * 100),
        grindPercent: Math.round((counts.grind / total) * 100),
      });
    });
  return result;
}

// ─────────────────────────────────────────
// Weekly trend (last 8 weeks, ≥ 2 tagged sessions)
// ─────────────────────────────────────────

interface WeekPoint {
  label: string;
  positivePercent: number;
  sessions: number;
}

function computeWeeklyTrend(games: Game[]): WeekPoint[] {
  const now = new Date();
  const points: WeekPoint[] = [];
  for (let w = 7; w >= 0; w--) {
    const weekEnd = new Date(now);
    weekEnd.setDate(now.getDate() - w * 7);
    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekEnd.getDate() - 7);
    let pos = 0, total = 0;
    games.forEach(g => {
      (g.playLogs ?? []).forEach(log => {
        if (!log.mood || !log.date) return;
        try {
          const d = parseLocalDate(log.date);
          if (d >= weekStart && d < weekEnd) {
            total++;
            if (log.mood === 'great' || log.mood === 'good') pos++;
          }
        } catch { /* ignore unparseable dates */ }
      });
    });
    if (total >= 2) {
      points.push({
        label: `W${8 - w}`,
        positivePercent: Math.round((pos / total) * 100),
        sessions: total,
      });
    }
  }
  return points;
}

function barFill(pct: number): string {
  if (pct >= 75) return '#10b981';
  if (pct >= 50) return '#3b82f6';
  if (pct >= 30) return '#f59e0b';
  return '#ef4444';
}

// ─────────────────────────────────────────
// Component
// ─────────────────────────────────────────

interface MoodStatsPanelProps {
  games: Game[];
}

export function MoodStatsPanel({ games }: MoodStatsPanelProps) {
  const analysis = useMemo(() => getMoodAnalysis(games), [games]);
  const gameMoods = useMemo(() => computeGameBreakdowns(games), [games]);
  const weeklyTrend = useMemo(() => computeWeeklyTrend(games), [games]);

  const taggingRate = analysis.totalSessions > 0
    ? Math.round((analysis.totalTaggedSessions / analysis.totalSessions) * 100)
    : 0;

  const goodVibesScore = useMemo(() => {
    if (analysis.totalTaggedSessions === 0) return 0;
    const great = analysis.moodDistribution.find(m => m.mood === 'great')?.count ?? 0;
    const good  = analysis.moodDistribution.find(m => m.mood === 'good')?.count ?? 0;
    return Math.round(((great + good) / analysis.totalTaggedSessions) * 100);
  }, [analysis]);

  const feelGoodGames = useMemo(
    () => gameMoods.filter(g => g.positivePercent >= 60).sort((a, b) => b.positivePercent - a.positivePercent).slice(0, 3),
    [gameMoods],
  );

  const grindGames = useMemo(
    () => gameMoods.filter(g => g.grindPercent >= 40).sort((a, b) => b.grindPercent - a.grindPercent).slice(0, 2),
    [gameMoods],
  );

  // trend direction: last week vs 3 weeks ago
  const trendDelta = weeklyTrend.length >= 3
    ? weeklyTrend[weeklyTrend.length - 1].positivePercent - weeklyTrend[weeklyTrend.length - 3].positivePercent
    : 0;

  // ── Empty state ──────────────────────────────────────────────
  if (analysis.totalTaggedSessions === 0) {
    return (
      <div className="p-4 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl">
        <h3 className="text-sm font-medium text-white/50 flex items-center gap-2 mb-4">
          <Smile size={14} className="text-pink-400" />
          Session Vibes
        </h3>
        <div className="text-center py-5">
          <div className="text-4xl mb-3">😶</div>
          <p className="text-white/70 text-sm font-medium mb-1">Your vibes are hiding</p>
          <p className="text-white/40 text-xs max-w-xs mx-auto mb-5">
            When logging a session, pick a mood to discover which games light you up — and which ones are secretly a grind.
          </p>
          <div className="flex justify-center gap-6">
            {(['great', 'good', 'meh', 'grind'] as SessionMood[]).map(m => (
              <div key={m} className="flex flex-col items-center gap-1">
                <span className="text-2xl">{MOOD_CONFIG[m].emoji}</span>
                <span className={clsx('text-xs font-medium', MOOD_CONFIG[m].text)}>{MOOD_CONFIG[m].label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const vibeLabel =
    goodVibesScore >= 75 ? '🔥 On fire' :
    goodVibesScore >= 60 ? '✨ Solid run' :
    goodVibesScore >= 40 ? '😐 Mixed bag' :
    '💪 Rough patch';

  const vibeColor =
    goodVibesScore >= 75 ? 'text-emerald-400' :
    goodVibesScore >= 60 ? 'text-blue-400' :
    goodVibesScore >= 40 ? 'text-amber-400' :
    'text-red-400';

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-white/50 flex items-center gap-2">
        <Smile size={14} className="text-pink-400" />
        Session Vibes
      </h3>

      {/* ── Hero: Good Vibes Score ───────────────────────── */}
      <div className="p-4 bg-gradient-to-br from-pink-500/10 to-purple-500/10 border border-pink-500/20 rounded-xl">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className={clsx('text-5xl font-black tracking-tight', vibeColor)}>
              {goodVibesScore}%
            </div>
            <div className="text-xs text-white/40 mt-0.5">good vibes</div>
          </div>
          <div className="text-right">
            <div className={clsx('text-sm font-medium', vibeColor)}>{vibeLabel}</div>
            <div className="text-xs text-white/40 mt-0.5">{analysis.totalTaggedSessions} tagged sessions</div>
            {analysis.bestMoodForRating && (
              <div className="text-xs text-white/30 mt-1">
                {MOOD_CONFIG[analysis.bestMoodForRating.mood].emoji} sessions avg {analysis.bestMoodForRating.avgGameRating}/10 rating
              </div>
            )}
          </div>
        </div>

        {/* Mood distribution bar */}
        <div className="flex h-4 rounded-full overflow-hidden gap-[2px]">
          {(['great', 'good', 'meh', 'grind'] as SessionMood[]).map(mood => {
            const entry = analysis.moodDistribution.find(m => m.mood === mood);
            if (!entry || entry.percent === 0) return null;
            return (
              <div
                key={mood}
                style={{ width: `${entry.percent}%`, backgroundColor: MOOD_CONFIG[mood].color, opacity: 0.85 }}
                title={`${MOOD_CONFIG[mood].emoji} ${MOOD_CONFIG[mood].label}: ${entry.percent}% (${entry.count} sessions)`}
              />
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5">
          {analysis.moodDistribution.map(entry => (
            <span key={entry.mood} className="text-xs text-white/50 flex items-center gap-1.5">
              <span>{MOOD_CONFIG[entry.mood].emoji}</span>
              <span>{entry.percent}%</span>
              <span className="text-white/25">({entry.count})</span>
            </span>
          ))}
        </div>

        {/* Longest session callout */}
        {analysis.longestSessionMood && (
          <div className="mt-3 pt-3 border-t border-white/5 text-xs text-white/40">
            Longest session ever ({analysis.longestSessionMood.hours}h on{' '}
            <span className="text-white/60">{analysis.longestSessionMood.game}</span>) was logged as{' '}
            <span className={MOOD_CONFIG[analysis.longestSessionMood.mood].text}>
              {MOOD_CONFIG[analysis.longestSessionMood.mood].emoji} {MOOD_CONFIG[analysis.longestSessionMood.mood].label}
            </span>
          </div>
        )}
      </div>

      {/* ── Weekly trend chart ───────────────────────────── */}
      {weeklyTrend.length >= 3 && (
        <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-medium text-white/50 flex items-center gap-1.5">
              {trendDelta >= 5 ? (
                <TrendingUp size={12} className="text-emerald-400" />
              ) : trendDelta <= -5 ? (
                <TrendingDown size={12} className="text-red-400" />
              ) : (
                <Minus size={12} className="text-white/30" />
              )}
              Vibe Trend — last {weeklyTrend.length} weeks
            </h4>
            {Math.abs(trendDelta) >= 5 && (
              <span className={clsx('text-xs font-medium', trendDelta >= 5 ? 'text-emerald-400' : 'text-red-400')}>
                {trendDelta >= 5 ? '↑ Improving' : '↓ Declining'}
              </span>
            )}
          </div>
          <div className="h-[90px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyTrend} barSize={16} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <XAxis
                  dataKey="label"
                  tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis domain={[0, 100]} hide />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.[0]) return null;
                    const d = payload[0].payload as WeekPoint;
                    return (
                      <div className="bg-[#1a1a24] border border-white/10 rounded px-2 py-1 text-xs">
                        <span className="text-white/80">{d.positivePercent}% good vibes</span>
                        <span className="text-white/40 ml-2">({d.sessions} sessions)</span>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="positivePercent" radius={[3, 3, 0, 0]}>
                  {weeklyTrend.map((entry, i) => (
                    <Cell key={i} fill={barFill(entry.positivePercent)} fillOpacity={0.75} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Feel-good champions ──────────────────────────── */}
      {feelGoodGames.length > 0 && (
        <div className="p-4 bg-gradient-to-br from-emerald-500/10 to-green-500/10 border border-emerald-500/20 rounded-xl">
          <h4 className="text-xs font-medium text-white/50 flex items-center gap-1.5 mb-3">
            <Heart size={12} className="text-emerald-400" />
            Feel-Good Champions
          </h4>
          <div className="space-y-2.5">
            {feelGoodGames.map((g, i) => (
              <div key={g.game.id} className="flex items-center gap-3">
                <span className="text-white/25 text-xs w-4 shrink-0">{i + 1}</span>
                {g.game.thumbnail ? (
                  <img
                    src={g.game.thumbnail}
                    alt=""
                    className="w-8 h-8 rounded object-cover shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 rounded bg-white/10 shrink-0 flex items-center justify-center text-sm">🎮</div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white/80 font-medium truncate">{g.game.name}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{ width: `${g.positivePercent}%` }}
                      />
                    </div>
                    <span className="text-xs text-emerald-400 font-medium shrink-0">{g.positivePercent}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Grind watch ──────────────────────────────────── */}
      {grindGames.length > 0 && (
        <div className="p-4 bg-gradient-to-br from-red-500/10 to-orange-500/10 border border-red-500/20 rounded-xl">
          <h4 className="text-xs font-medium text-white/50 flex items-center gap-1.5 mb-2">
            <AlertTriangle size={12} className="text-red-400" />
            Grind Watch
          </h4>
          <p className="text-xs text-white/35 mb-3">
            Mostly feel like effort — worth a break or an honest gut-check.
          </p>
          <div className="space-y-2">
            {grindGames.map(g => (
              <div key={g.game.id} className="flex items-center gap-3">
                {g.game.thumbnail ? (
                  <img src={g.game.thumbnail} alt="" className="w-7 h-7 rounded object-cover shrink-0" />
                ) : (
                  <div className="w-7 h-7 rounded bg-white/10 shrink-0 flex items-center justify-center text-sm">🎮</div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white/70 truncate">{g.game.name}</div>
                </div>
                <span className="text-xs text-red-400 font-medium shrink-0">{g.grindPercent}% grind</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Top game per vibe ─────────────────────────────── */}
      {Object.keys(analysis.topGameByMood).length > 0 && (
        <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl">
          <h4 className="text-xs font-medium text-white/50 mb-3">Your game for each vibe</h4>
          <div className="grid grid-cols-2 gap-2">
            {(['great', 'good', 'meh', 'grind'] as SessionMood[]).map(mood => {
              const top = analysis.topGameByMood[mood];
              if (!top) return null;
              return (
                <div
                  key={mood}
                  className={clsx('p-2.5 rounded-lg border', MOOD_CONFIG[mood].bg, MOOD_CONFIG[mood].border)}
                >
                  <div className={clsx('text-xs font-medium mb-1 flex items-center gap-1', MOOD_CONFIG[mood].text)}>
                    <span>{MOOD_CONFIG[mood].emoji}</span>
                    {MOOD_CONFIG[mood].label}
                  </div>
                  <div className="text-xs text-white/70 font-medium truncate">{top.game}</div>
                  <div className="text-xs text-white/30">{top.hours}h logged</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Tagging rate nudge ────────────────────────────── */}
      {taggingRate < 40 && analysis.totalSessions >= 5 && (
        <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl flex items-center gap-3">
          <Tag size={13} className="text-white/25 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-xs text-white/35 mb-1">
              {taggingRate}% of sessions tagged — tag more for sharper insights
            </div>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-purple-500/50 transition-all"
                style={{ width: `${taggingRate}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
