'use client';

import { useMemo, useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell,
} from 'recharts';
import {
  Smile, TrendingUp, TrendingDown, Minus, Gamepad2,
  Sun, Moon, Zap, Heart, Frown, AlertCircle, ChevronDown, ChevronUp,
} from 'lucide-react';
import { Game, SessionMood } from '../lib/types';
import {
  getMoodAnalysis, getMoodByDayOfWeek, getMoodBySessionLength,
  getMoodTrend, getGameMoodProfiles,
} from '../lib/calculations';
import clsx from 'clsx';

interface MoodVibePanelProps {
  games: Game[];
}

// ── Constants ──────────────────────────────────────────────

const MOOD_META: Record<SessionMood, { label: string; emoji: string; color: string; bg: string; bar: string }> = {
  great: { label: 'Great',  emoji: '🌟', color: '#10b981', bg: 'rgba(16,185,129,0.12)', bar: '#10b981' },
  good:  { label: 'Good',   emoji: '😊', color: '#60a5fa', bg: 'rgba(96,165,250,0.12)',  bar: '#60a5fa' },
  meh:   { label: 'Meh',    emoji: '😐', color: '#fbbf24', bg: 'rgba(251,191,36,0.12)',  bar: '#fbbf24' },
  grind: { label: 'Grind',  emoji: '😤', color: '#f87171', bg: 'rgba(248,113,113,0.12)', bar: '#f87171' },
};

const MOOD_ORDER: SessionMood[] = ['great', 'good', 'meh', 'grind'];

function getVibeLabel(score: number): { label: string; emoji: string; color: string } {
  if (score >= 80) return { label: 'On Cloud Nine',    emoji: '☁️',  color: '#10b981' };
  if (score >= 65) return { label: 'Good Vibes',        emoji: '✨',  color: '#60a5fa' };
  if (score >= 50) return { label: 'Mixed Bag',         emoji: '🌤️', color: '#fbbf24' };
  if (score >= 35) return { label: 'Mostly Meh',        emoji: '😐',  color: '#f59e0b' };
  return               { label: 'Grinding Through',   emoji: '😤',  color: '#f87171' };
}

// ── Sub-components ──────────────────────────────────────────

function MoodPill({ mood, count, total }: { mood: SessionMood; count: number; total: number }) {
  const meta = MOOD_META[mood];
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-sm">{meta.emoji}</span>
      <span className="text-xs text-white/70">{meta.label}</span>
      <span className="text-xs font-bold ml-auto" style={{ color: meta.color }}>{pct}%</span>
    </div>
  );
}

function MoodBar({ distribution, total }: {
  distribution: { mood: SessionMood; count: number }[];
  total: number;
}) {
  if (total === 0) return null;
  return (
    <div className="h-3 rounded-full overflow-hidden flex w-full">
      {MOOD_ORDER.map(mood => {
        const entry = distribution.find(d => d.mood === mood);
        const count = entry?.count ?? 0;
        const pct = (count / total) * 100;
        if (pct === 0) return null;
        return (
          <div
            key={mood}
            className="h-full transition-all"
            style={{ width: `${pct}%`, backgroundColor: MOOD_META[mood].color }}
            title={`${MOOD_META[mood].label}: ${Math.round(pct)}%`}
          />
        );
      })}
    </div>
  );
}

const CustomTrendTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  const score = payload[0].value;
  const vibe = getVibeLabel(score);
  return (
    <div className="bg-gray-900 border border-white/10 rounded-lg px-3 py-2 text-xs shadow-xl">
      <div className="text-white/50 mb-1">{label}</div>
      <div className="font-bold" style={{ color: vibe.color }}>{vibe.emoji} {score}/100</div>
      <div className="text-white/40">{vibe.label}</div>
    </div>
  );
};

export function MoodVibePanel({ games }: MoodVibePanelProps) {
  const [showAll, setShowAll] = useState(false);

  const moodAnalysis    = useMemo(() => getMoodAnalysis(games), [games]);
  const dayData         = useMemo(() => getMoodByDayOfWeek(games), [games]);
  const lengthData      = useMemo(() => getMoodBySessionLength(games), [games]);
  const trendData       = useMemo(() => getMoodTrend(games), [games]);
  const gameProfiles    = useMemo(() => getGameMoodProfiles(games), [games]);

  // Only render when user has mood-tagged sessions
  if (moodAnalysis.totalTaggedSessions < 3) {
    return (
      <div className="p-4 bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 border border-violet-500/20 rounded-xl">
        <h3 className="text-sm font-medium text-white/70 flex items-center gap-2 mb-3">
          <Smile size={14} className="text-violet-400" />
          Session Vibe Intelligence
        </h3>
        <div className="flex items-start gap-3 text-sm text-white/40">
          <AlertCircle size={16} className="shrink-0 mt-0.5 text-violet-400/50" />
          <div>
            <p>Start tagging your session moods when you log play time — tap <strong className="text-white/60">😊 Great / 👍 Good / 😐 Meh / 😤 Grind</strong> — and your vibe patterns will appear here.</p>
          </div>
        </div>
      </div>
    );
  }

  const totalTagged = moodAnalysis.totalTaggedSessions;
  const dist = moodAnalysis.moodDistribution;
  const vibe = getVibeLabel(trendData.overallScore);
  const trend = trendData.recentTrend;

  // Trend icon/color
  const trendIcon = trend === 'improving'
    ? <TrendingUp size={14} className="text-emerald-400" />
    : trend === 'declining'
    ? <TrendingDown size={14} className="text-red-400" />
    : <Minus size={14} className="text-white/40" />;

  const trendLabel = trend === 'improving' ? 'Improving' : trend === 'declining' ? 'Declining' : 'Stable';
  const trendColor = trend === 'improving' ? '#10b981' : trend === 'declining' ? '#f87171' : '#6b7280';

  // Top 3 happiest / saddest games
  const happiest = gameProfiles.slice(0, 3);
  const saddest  = [...gameProfiles].reverse().slice(0, 3).filter(p => p.happinessScore < 70);

  // Day chart data
  const dayChartData = dayData.days.map(d => ({
    name: d.dayName,
    sessions: d.totalSessions,
    positiveRate: Math.round(d.positiveRate),
    fill: d.totalSessions === 0
      ? 'rgba(255,255,255,0.05)'
      : d.positiveRate >= 70 ? '#10b981'
      : d.positiveRate >= 50 ? '#60a5fa'
      : d.positiveRate >= 30 ? '#fbbf24'
      : '#f87171',
  }));

  // Length chart data
  const lengthChartData = lengthData.buckets
    .filter(b => b.totalSessions > 0)
    .map(b => ({
      name: b.label,
      sessions: b.totalSessions,
      positiveRate: Math.round(b.positiveRate),
      fill: b.positiveRate >= 70 ? '#10b981'
        : b.positiveRate >= 50 ? '#60a5fa'
        : b.positiveRate >= 30 ? '#fbbf24'
        : '#f87171',
    }));

  // Trend chart data (last 12 weeks, keep only weeks with activity or spaced well)
  const trendChartData = trendData.weeks.map(w => ({
    label: w.label,
    score: w.taggedSessions > 0 ? w.score : null,
    sessions: w.taggedSessions,
  }));

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-white/50 flex items-center gap-2">
        <Smile size={14} className="text-violet-400" />
        Session Vibe Intelligence
      </h3>

      {/* Hero card: overall vibe score + distribution */}
      <div className="p-4 bg-gradient-to-br from-violet-500/15 to-fuchsia-500/10 border border-violet-500/20 rounded-xl">
        <div className="flex items-start gap-4 mb-4">
          {/* Big score */}
          <div className="text-center shrink-0">
            <div className="text-4xl font-black tracking-tight" style={{ color: vibe.color }}>
              {trendData.overallScore}
            </div>
            <div className="text-[10px] text-white/40 uppercase tracking-wider mt-0.5">Vibe Score</div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base">{vibe.emoji}</span>
              <span className="font-semibold text-white/90 text-sm">{vibe.label}</span>
              <span className="flex items-center gap-1 text-[11px] ml-auto" style={{ color: trendColor }}>
                {trendIcon}
                {trendLabel}
              </span>
            </div>
            <div className="text-[11px] text-white/40 mb-3">
              {totalTagged} tagged sessions
              {trendData.tagRate < 80 && (
                <span className="ml-1 text-violet-400/60">({trendData.tagRate}% of all sessions tagged)</span>
              )}
            </div>

            {/* Mood distribution bar */}
            <MoodBar distribution={dist} total={totalTagged} />
          </div>
        </div>

        {/* Mood breakdown pills */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          {MOOD_ORDER.map(mood => {
            const entry = dist.find(d => d.mood === mood);
            if (!entry) return null;
            return (
              <div key={mood} className="flex items-center gap-2">
                <span className="text-xs">{MOOD_META[mood].emoji}</span>
                <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${entry.percent}%`, backgroundColor: MOOD_META[mood].color }}
                  />
                </div>
                <span className="text-[11px] font-mono tabular-nums" style={{ color: MOOD_META[mood].color }}>
                  {entry.percent}%
                </span>
              </div>
            );
          })}
        </div>

        {/* Key insight */}
        {(dayData.bestDay || lengthData.sweetSpot) && (
          <div className="mt-3 pt-3 border-t border-white/5 text-[11px] text-white/50 flex items-center gap-1.5">
            <Zap size={11} className="text-violet-400 shrink-0" />
            <span>
              {dayData.bestDay && lengthData.sweetSpot
                ? `Your happiest sessions happen on ${dayData.bestDay}s in ${lengthData.sweetSpot} stints`
                : dayData.bestDay
                ? `Your happiest gaming day is ${dayData.bestDay}`
                : `Your sweet spot session length is ${lengthData.sweetSpot}`
              }
            </span>
          </div>
        )}
      </div>

      {/* 12-week vibe trend */}
      {trendData.weeks.some(w => w.taggedSessions > 0) && (
        <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl">
          <h4 className="text-xs font-medium text-white/50 mb-3 flex items-center gap-1.5">
            <TrendingUp size={12} className="text-violet-400" />
            12-Week Vibe Trend
          </h4>
          <div className="h-[120px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendChartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="vibeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }}
                  axisLine={false}
                  tickLine={false}
                  interval={2}
                />
                <YAxis domain={[0, 100]} tick={false} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTrendTooltip />} />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  fill="url(#vibeGrad)"
                  connectNulls={false}
                  dot={(props) => {
                    const { cx, cy, payload } = props;
                    if (!payload.score) return <g key={props.key} />;
                    return <circle key={props.key} cx={cx} cy={cy} r={3} fill="#8b5cf6" stroke="transparent" />;
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-between text-[9px] text-white/20 mt-1">
            <span>Grind (0)</span>
            <span>Perfect (100)</span>
          </div>
        </div>
      )}

      {/* Game mood rankings */}
      {(happiest.length > 0 || saddest.length > 0) && (
        <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl">
          <h4 className="text-xs font-medium text-white/50 mb-3 flex items-center gap-1.5">
            <Gamepad2 size={12} className="text-violet-400" />
            Game Happiness Leaderboard
          </h4>

          <div className="space-y-1.5">
            {/* Best games */}
            {happiest.map((profile, i) => {
              const barPct = profile.happinessScore;
              const vibe = getVibeLabel(profile.happinessScore);
              return (
                <div key={profile.game.id} className="flex items-center gap-2.5">
                  <span className="text-[11px] text-white/30 w-4 tabular-nums text-right">{i + 1}</span>
                  {profile.game.thumbnail ? (
                    <img src={profile.game.thumbnail} alt="" className="w-7 h-7 rounded object-cover shrink-0" />
                  ) : (
                    <div className="w-7 h-7 rounded bg-white/5 shrink-0 flex items-center justify-center">
                      <Gamepad2 size={10} className="text-white/20" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] text-white/70 truncate">{profile.game.name}</div>
                    <div className="h-1.5 mt-0.5 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${barPct}%`, backgroundColor: vibe.color }}
                      />
                    </div>
                  </div>
                  <span className="text-[11px] font-mono tabular-nums shrink-0" style={{ color: vibe.color }}>
                    {profile.happinessScore}
                  </span>
                  <span className="text-sm shrink-0">{profile.dominantMood ? MOOD_META[profile.dominantMood].emoji : ''}</span>
                </div>
              );
            })}

            {/* Separator + worst games */}
            {saddest.length > 0 && (
              <>
                <div className="border-t border-white/5 my-2" />
                {saddest.map((profile) => {
                  const barPct = profile.happinessScore;
                  const vibe = getVibeLabel(profile.happinessScore);
                  return (
                    <div key={profile.game.id} className="flex items-center gap-2.5 opacity-70">
                      <span className="text-[11px] text-white/20 w-4" />
                      {profile.game.thumbnail ? (
                        <img src={profile.game.thumbnail} alt="" className="w-7 h-7 rounded object-cover shrink-0 grayscale" />
                      ) : (
                        <div className="w-7 h-7 rounded bg-white/5 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] text-white/50 truncate">{profile.game.name}</div>
                        <div className="h-1.5 mt-0.5 rounded-full bg-white/5 overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${barPct}%`, backgroundColor: vibe.color }}
                          />
                        </div>
                      </div>
                      <span className="text-[11px] font-mono tabular-nums shrink-0" style={{ color: vibe.color }}>
                        {profile.happinessScore}
                      </span>
                      <span className="text-sm shrink-0">{profile.dominantMood ? MOOD_META[profile.dominantMood].emoji : ''}</span>
                    </div>
                  );
                })}
              </>
            )}
          </div>

          {/* Show more if there are more games */}
          {gameProfiles.length > 6 && (
            <button
              className="mt-3 w-full text-[11px] text-white/30 hover:text-white/50 flex items-center justify-center gap-1 transition-colors"
              onClick={() => setShowAll(prev => !prev)}
            >
              {showAll ? <><ChevronUp size={11} /> Show less</> : <><ChevronDown size={11} /> {gameProfiles.length - 6} more games</>}
            </button>
          )}
          {showAll && gameProfiles.slice(3, gameProfiles.length - 3).map((profile, i) => {
            const barPct = profile.happinessScore;
            const vibe = getVibeLabel(profile.happinessScore);
            return (
              <div key={profile.game.id} className="flex items-center gap-2.5 mt-1.5">
                <span className="text-[11px] text-white/20 w-4" />
                {profile.game.thumbnail ? (
                  <img src={profile.game.thumbnail} alt="" className="w-7 h-7 rounded object-cover shrink-0" />
                ) : (
                  <div className="w-7 h-7 rounded bg-white/5 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] text-white/60 truncate">{profile.game.name}</div>
                  <div className="h-1.5 mt-0.5 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${barPct}%`, backgroundColor: vibe.color }}
                    />
                  </div>
                </div>
                <span className="text-[11px] font-mono tabular-nums shrink-0" style={{ color: vibe.color }}>
                  {profile.happinessScore}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Day-of-week vibe pattern */}
      {dayChartData.some(d => d.sessions > 0) && (
        <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-medium text-white/50 flex items-center gap-1.5">
              <Sun size={12} className="text-amber-400" />
              Best Gaming Days
            </h4>
            {dayData.bestDay && (
              <span className="text-[11px] text-emerald-400 font-medium">{dayData.bestDay} is your best day</span>
            )}
          </div>

          <div className="h-[90px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dayChartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }} barSize={28}>
                <XAxis
                  dataKey="name"
                  tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const d = dayChartData.find(x => x.name === label);
                    if (!d || d.sessions === 0) return null;
                    return (
                      <div className="bg-gray-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs shadow-xl">
                        <div className="font-medium text-white/80 mb-0.5">{label}</div>
                        <div className="text-white/40">{d.sessions} sessions</div>
                        <div style={{ color: d.fill }}>{d.positiveRate}% positive</div>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="sessions" radius={[4, 4, 0, 0]}>
                  {dayChartData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} fillOpacity={entry.sessions === 0 ? 0.2 : 0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center gap-3 mt-2 justify-end">
            {[
              { color: '#10b981', label: '70%+ positive' },
              { color: '#60a5fa', label: '50–70%' },
              { color: '#fbbf24', label: '30–50%' },
              { color: '#f87171', label: '<30%' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: item.color }} />
                <span className="text-[9px] text-white/30">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Session length sweet spot */}
      {lengthChartData.length > 1 && (
        <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-medium text-white/50 flex items-center gap-1.5">
              <Moon size={12} className="text-indigo-400" />
              Session Length Sweet Spot
            </h4>
            {lengthData.sweetSpot && (
              <span className="text-[11px] text-emerald-400 font-medium">{lengthData.sweetSpot} = happiest</span>
            )}
          </div>

          <div className="h-[90px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={lengthChartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }} barSize={36}>
                <XAxis
                  dataKey="name"
                  tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const d = lengthChartData.find(x => x.name === label);
                    if (!d) return null;
                    return (
                      <div className="bg-gray-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs shadow-xl">
                        <div className="font-medium text-white/80 mb-0.5">{label} sessions</div>
                        <div className="text-white/40">{d.sessions} logged</div>
                        <div style={{ color: d.fill }}>{d.positiveRate}% positive</div>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="sessions" radius={[4, 4, 0, 0]}>
                  {lengthChartData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Top game per mood row */}
      {Object.keys(moodAnalysis.topGameByMood).length > 1 && (
        <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl">
          <h4 className="text-xs font-medium text-white/50 mb-3 flex items-center gap-1.5">
            <Heart size={12} className="text-pink-400" />
            Top Game per Mood
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {MOOD_ORDER.map(mood => {
              const top = moodAnalysis.topGameByMood[mood];
              if (!top) return null;
              const meta = MOOD_META[mood];
              return (
                <div
                  key={mood}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg"
                  style={{ background: meta.bg, border: `1px solid ${meta.color}20` }}
                >
                  <span className="text-base shrink-0">{meta.emoji}</span>
                  <div className="min-w-0">
                    <div className="text-[10px] text-white/40 uppercase tracking-wide">{meta.label}</div>
                    <div className="text-[11px] text-white/80 font-medium truncate">{top.game}</div>
                    <div className="text-[10px]" style={{ color: meta.color }}>{top.hours}h total</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
