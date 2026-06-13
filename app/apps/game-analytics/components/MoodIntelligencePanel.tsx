'use client';

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  ReferenceLine,
} from 'recharts';
import { Brain, Zap, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { Game } from '../lib/types';
import {
  getMoodAnalysis,
  getDayOfWeekMoodPattern,
  getMoodTrendByWeek,
  getMoodByGame,
  getContextMoodBreakdown,
  getVibeMoodBreakdown,
  MOOD_COLORS,
  MOOD_LABELS,
  MOOD_SCORE_MAP,
  DayOfWeekMoodData,
  MoodWeekTrend,
} from '../lib/calculations';

interface Props {
  games: Game[];
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function scoreToColor(score: number): string {
  if (score >= 3.5) return '#10b981';
  if (score >= 2.7) return '#3b82f6';
  if (score >= 2.0) return '#f59e0b';
  return '#ef4444';
}

function scoreToLabel(score: number): string {
  if (score >= 3.5) return 'Great';
  if (score >= 2.7) return 'Good';
  if (score >= 2.0) return 'Meh';
  return 'Grind';
}

function toWellness(avg: number): number {
  return Math.round(((avg - 1) / 3) * 100);
}

function wellnessLabel(w: number): string {
  if (w >= 85) return 'In the Zone 🔥';
  if (w >= 70) return 'Good Times 😊';
  if (w >= 55) return 'Mixed Bag 😐';
  if (w >= 40) return 'Grinding It 😤';
  return 'Grind Season 💀';
}

function wellnessColor(w: number): string {
  if (w >= 70) return 'text-emerald-400';
  if (w >= 55) return 'text-blue-400';
  if (w >= 40) return 'text-amber-400';
  return 'text-red-400';
}

// ─── inline tooltip components ────────────────────────────────────────────────

interface DayTTProps {
  active?: boolean;
  payload?: Array<{ payload: DayOfWeekMoodData }>;
}
function DayTooltip({ active, payload }: DayTTProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  if (d.count === 0) return null;
  return (
    <div className="bg-gray-900/95 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs shadow-lg">
      <div className="text-white/70 font-medium mb-0.5">{d.day}</div>
      <div style={{ color: scoreToColor(d.score) }}>
        {scoreToLabel(d.score)} ({d.score.toFixed(1)})
      </div>
      <div className="text-white/35 mt-0.5">
        {d.count} session{d.count !== 1 ? 's' : ''}
      </div>
    </div>
  );
}

interface TrendTTProps {
  active?: boolean;
  payload?: Array<{ payload: MoodWeekTrend }>;
}
function TrendTooltip({ active, payload }: TrendTTProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  if (d.count === 0) return null;
  return (
    <div className="bg-gray-900/95 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs shadow-lg">
      <div className="text-white/70 font-medium mb-0.5">Week of {d.weekLabel}</div>
      <div style={{ color: scoreToColor(d.score) }}>
        {scoreToLabel(d.score)} ({d.score.toFixed(2)})
      </div>
      <div className="text-white/35 mt-0.5">
        {d.count} session{d.count !== 1 ? 's' : ''}
      </div>
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

export function MoodIntelligencePanel({ games }: Props) {
  const analysis = useMemo(() => getMoodAnalysis(games), [games]);
  const dayPattern = useMemo(() => getDayOfWeekMoodPattern(games), [games]);
  const weekTrend = useMemo(() => getMoodTrendByWeek(games, 10), [games]);
  const byGame = useMemo(() => getMoodByGame(games), [games]);
  const byContext = useMemo(() => getContextMoodBreakdown(games), [games]);
  const byVibe = useMemo(() => getVibeMoodBreakdown(games), [games]);

  if (analysis.totalSessions === 0) return null;

  // Empty state — sessions exist but none have mood tags yet
  if (analysis.totalTaggedSessions === 0) {
    return (
      <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl">
        <h3 className="text-sm font-medium text-white/50 flex items-center gap-2 mb-3">
          <Brain size={14} className="text-pink-400" />
          Mood Intelligence
        </h3>
        <div className="text-center py-6 space-y-2">
          <p className="text-white/40 text-sm">No mood data yet</p>
          <p className="text-white/25 text-xs max-w-xs mx-auto">
            When logging a play session, pick a mood — Great, Good, Meh, or Grind — to unlock insights about which games and days bring out your best gaming.
          </p>
        </div>
      </div>
    );
  }

  // Avg mood score from the distribution
  const totalWeighted = analysis.moodDistribution.reduce(
    (s, d) => s + MOOD_SCORE_MAP[d.mood] * d.count,
    0,
  );
  const avgScore = totalWeighted / analysis.totalTaggedSessions;
  const wellness = toWellness(avgScore);
  const tagRate = Math.round(
    (analysis.totalTaggedSessions / analysis.totalSessions) * 100,
  );

  // Day-of-week insight
  const daysWithData = dayPattern.filter(d => d.count > 0);
  const bestDay =
    daysWithData.length > 0
      ? daysWithData.reduce((b, d) => (d.score > b.score ? d : b))
      : null;
  const worstDay =
    daysWithData.length > 1
      ? daysWithData.reduce((w, d) => (d.score < w.score ? d : w))
      : null;

  // Week trend direction
  const activeWeeks = weekTrend.filter(w => w.count > 0);
  const half = Math.floor(activeWeeks.length / 2);
  const earlyAvg =
    half > 0
      ? activeWeeks.slice(0, half).reduce((s, w) => s + w.score, 0) / half
      : 0;
  const lateAvg =
    half > 0
      ? activeWeeks.slice(-half).reduce((s, w) => s + w.score, 0) / half
      : 0;
  const trending =
    lateAvg > earlyAvg + 0.1 ? 'up' : lateAvg < earlyAvg - 0.1 ? 'down' : 'flat';

  const topFlow = byGame.slice(0, 4);
  const drainGames =
    byGame.length > 4 ? [...byGame].slice(-3).reverse() : [];
  const showDrain =
    drainGames.length > 0 && drainGames[0].avgScore < 2.8;

  const showBothContextVibe = byContext.length >= 2 && byVibe.length >= 2;

  return (
    <div className="space-y-4">
      {/* Header */}
      <h3 className="text-sm font-medium text-white/50 flex items-center gap-2">
        <Brain size={14} className="text-pink-400" />
        Mood Intelligence
        <span className="text-white/20 text-xs font-normal">
          {analysis.totalTaggedSessions} / {analysis.totalSessions} sessions tagged
          {tagRate > 0 && ` (${tagRate}%)`}
        </span>
      </h3>

      {/* Wellness Score + Mood Distribution */}
      <div className="grid grid-cols-2 gap-3">
        {/* Wellness number */}
        <div className="p-4 bg-gradient-to-br from-pink-500/10 to-purple-500/10 border border-pink-500/20 rounded-xl flex flex-col items-center justify-center text-center gap-0.5">
          <div className={`text-5xl font-bold leading-none ${wellnessColor(wellness)}`}>
            {wellness}
          </div>
          <div className="text-white/30 text-xs">/ 100</div>
          <div className="text-white/65 text-xs font-medium mt-1.5">
            {wellnessLabel(wellness)}
          </div>
          <div className="text-white/25 text-xs">Gaming Wellness</div>
        </div>

        {/* Mood breakdown bars */}
        <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl">
          <div className="text-white/35 text-xs mb-3">Session moods</div>
          <div className="space-y-2.5">
            {(['great', 'good', 'meh', 'grind'] as const).map(mood => {
              const d = analysis.moodDistribution.find(x => x.mood === mood);
              const pct = d?.percent ?? 0;
              if (pct === 0) return null;
              return (
                <div key={mood}>
                  <div className="flex justify-between text-xs mb-0.5">
                    <span className="text-white/60">{MOOD_LABELS[mood]}</span>
                    <span className="text-white/35">{pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/5">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: MOOD_COLORS[mood],
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Day of Week Pattern */}
      {daysWithData.length >= 3 && (
        <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl">
          <h4 className="text-xs font-medium text-white/60 mb-1">Day of Week Patterns</h4>
          {bestDay && (
            <p className="text-white/30 text-xs mb-3">
              {worstDay && worstDay.day !== bestDay.day
                ? `Best mood on ${bestDay.day}s, roughest on ${worstDay.day}s.`
                : 'Consistent mood across the week.'}
            </p>
          )}
          <div className="h-[110px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={dayPattern}
                barSize={18}
                margin={{ top: 4, right: 4, bottom: 0, left: -28 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.04)"
                  vertical={false}
                />
                <XAxis
                  dataKey="shortDay"
                  tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 4]}
                  ticks={[1, 2, 3, 4]}
                  tick={{ fill: 'rgba(255,255,255,0.20)', fontSize: 9 }}
                  tickFormatter={(v: number) =>
                    ({ 1: '😤', 2: '😐', 3: '😊', 4: '🔥' } as Record<number, string>)[v] ?? ''
                  }
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip cursor={false} content={<DayTooltip />} />
                <Bar dataKey="score" radius={[3, 3, 0, 0]}>
                  {dayPattern.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={
                        entry.count === 0
                          ? 'rgba(255,255,255,0.06)'
                          : scoreToColor(entry.score)
                      }
                      fillOpacity={entry.count === 0 ? 1 : 0.85}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Flow State / Drain Games */}
      {byGame.length >= 2 && (
        <div className={showDrain ? 'grid grid-cols-2 gap-3' : ''}>
          {/* Flow State */}
          <div className="p-3 bg-emerald-500/5 border border-emerald-500/15 rounded-xl">
            <div className="flex items-center gap-1.5 mb-2.5">
              <Zap size={11} className="text-emerald-400" />
              <span className="text-xs font-medium text-emerald-400/90">Flow State Games</span>
            </div>
            <div className="space-y-2">
              {topFlow.map((g, i) => (
                <div key={g.gameId} className="flex items-center gap-2 min-w-0">
                  <span className="text-white/25 text-xs w-3 flex-shrink-0">{i + 1}</span>
                  {g.thumbnail ? (
                    <img
                      src={g.thumbnail}
                      alt=""
                      className="w-5 h-5 rounded object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-5 h-5 rounded bg-white/10 flex-shrink-0" />
                  )}
                  <span className="text-white/70 text-xs truncate flex-1">{g.gameName}</span>
                  <span
                    className="text-xs font-medium flex-shrink-0"
                    style={{ color: scoreToColor(g.avgScore) }}
                  >
                    {scoreToLabel(g.avgScore)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Drain Games */}
          {showDrain && (
            <div className="p-3 bg-red-500/5 border border-red-500/15 rounded-xl">
              <div className="flex items-center gap-1.5 mb-2.5">
                <AlertTriangle size={11} className="text-red-400" />
                <span className="text-xs font-medium text-red-400/90">Feels Like Work</span>
              </div>
              <div className="space-y-2">
                {drainGames.map((g, i) => (
                  <div key={g.gameId} className="flex items-center gap-2 min-w-0">
                    <span className="text-white/25 text-xs w-3 flex-shrink-0">{i + 1}</span>
                    {g.thumbnail ? (
                      <img
                        src={g.thumbnail}
                        alt=""
                        className="w-5 h-5 rounded object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-5 h-5 rounded bg-white/10 flex-shrink-0" />
                    )}
                    <span className="text-white/70 text-xs truncate flex-1">{g.gameName}</span>
                    <span className="text-xs font-medium text-red-400 flex-shrink-0">
                      {scoreToLabel(g.avgScore)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Context + Vibe Breakdown */}
      {(byContext.length >= 2 || byVibe.length >= 2) && (
        <div className={showBothContextVibe ? 'grid grid-cols-2 gap-3' : ''}>
          {byContext.length >= 2 && (
            <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl">
              <div className="text-white/35 text-xs mb-2.5">By play context</div>
              <div className="space-y-2">
                {byContext.map(c => (
                  <div key={c.context} className="flex items-center gap-2 min-w-0">
                    <span className="text-xs flex-shrink-0">{c.icon}</span>
                    <span className="text-white/60 text-xs flex-1 truncate">{c.label}</span>
                    <div className="w-14 h-1 rounded-full bg-white/5 flex-shrink-0">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${((c.avgScore - 1) / 3) * 100}%`,
                          backgroundColor: scoreToColor(c.avgScore),
                        }}
                      />
                    </div>
                    <span className="text-white/35 text-xs flex-shrink-0 w-10 text-right">
                      {scoreToLabel(c.avgScore)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {byVibe.length >= 2 && (
            <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl">
              <div className="text-white/35 text-xs mb-2.5">By session vibe</div>
              <div className="space-y-2">
                {byVibe.map(v => (
                  <div key={v.vibe} className="flex items-center gap-2 min-w-0">
                    <span className="text-white/60 text-xs flex-1 truncate">{v.label}</span>
                    <div className="w-14 h-1 rounded-full bg-white/5 flex-shrink-0">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${((v.avgScore - 1) / 3) * 100}%`,
                          backgroundColor: scoreToColor(v.avgScore),
                        }}
                      />
                    </div>
                    <span className="text-white/35 text-xs flex-shrink-0 w-7 text-right">
                      {v.count}×
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 10-Week Mood Trend */}
      {activeWeeks.length >= 4 && (
        <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl">
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-xs font-medium text-white/60">10-Week Mood Trend</h4>
            {trending === 'up' && (
              <span className="text-emerald-400 text-xs flex items-center gap-1">
                <TrendingUp size={10} /> Improving
              </span>
            )}
            {trending === 'down' && (
              <span className="text-red-400 text-xs flex items-center gap-1">
                <TrendingDown size={10} /> Declining
              </span>
            )}
          </div>
          <p className="text-white/25 text-xs mb-3">Average mood per week from session logs</p>
          <div className="h-[90px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={activeWeeks}
                margin={{ top: 4, right: 4, bottom: 4, left: -30 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.04)"
                />
                <XAxis
                  dataKey="weekLabel"
                  tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 9 }}
                  interval={Math.max(0, Math.floor(activeWeeks.length / 4) - 1)}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[1, 4]}
                  ticks={[1, 2, 3, 4]}
                  tick={{ fill: 'rgba(255,255,255,0.20)', fontSize: 9 }}
                  tickFormatter={(v: number) =>
                    ({ 1: '😤', 2: '😐', 3: '😊', 4: '🔥' } as Record<number, string>)[v] ?? ''
                  }
                  axisLine={false}
                  tickLine={false}
                />
                <ReferenceLine
                  y={3}
                  stroke="rgba(59,130,246,0.15)"
                  strokeDasharray="4 4"
                />
                <Tooltip cursor={false} content={<TrendTooltip />} />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#ec4899"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: '#ec4899', stroke: 'none' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
