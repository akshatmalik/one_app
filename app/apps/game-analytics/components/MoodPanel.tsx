'use client';

import { useMemo, useState } from 'react';
import {
  SmilePlus, Smile, Meh, Dumbbell, Wind, Gamepad2,
  ChevronDown, ChevronUp, Info,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as ReTooltip,
} from 'recharts';
import { Game, SessionMood, SessionVibe } from '../lib/types';
import { getMoodAnalysis, parseLocalDate } from '../lib/calculations';
import clsx from 'clsx';

interface MoodPanelProps {
  games: Game[];
}

// ─── Config ────────────────────────────────────────────────────────────────

const MOOD_CONFIG: Record<SessionMood, {
  emoji: string; label: string; color: string;
  bg: string; text: string; border: string; weight: number;
}> = {
  great: { emoji: '🔥', label: 'Great', color: '#10b981', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', weight: 4 },
  good:  { emoji: '👍', label: 'Good',  color: '#3b82f6', bg: 'bg-blue-500/10',    text: 'text-blue-400',    border: 'border-blue-500/20',    weight: 3 },
  meh:   { emoji: '😐', label: 'Meh',   color: '#f59e0b', bg: 'bg-yellow-500/10',  text: 'text-yellow-400',  border: 'border-yellow-500/20',  weight: 2 },
  grind: { emoji: '💪', label: 'Grind', color: '#f97316', bg: 'bg-orange-500/10',  text: 'text-orange-400',  border: 'border-orange-500/20',  weight: 1 },
};

const VIBE_CONFIG: Record<string, { emoji: string; label: string; color: string }> = {
  'wind-down':          { emoji: '🌙', label: 'Wind Down',       color: '#8b5cf6' },
  'exploration':        { emoji: '🗺️', label: 'Exploration',      color: '#06b6d4' },
  'story':              { emoji: '📖', label: 'Story Mode',       color: '#3b82f6' },
  'competitive':        { emoji: '⚔️', label: 'Competitive',      color: '#ef4444' },
  'achievement-hunting':{ emoji: '🏆', label: 'Achievement Hunt', color: '#f59e0b' },
  'social':             { emoji: '👥', label: 'Social',           color: '#10b981' },
};

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// ─── Helpers ────────────────────────────────────────────────────────────────

function weightedQualityScore(sessions: { weight: number }[], total: number): number {
  if (total === 0) return 0;
  const sum = sessions.reduce((s, x) => s + x.weight, 0);
  const max = total * 4;
  const min = total * 1;
  return Math.round(((sum - min) / (max - min)) * 100);
}

function getScoreLabel(score: number): { label: string; colorClass: string } {
  if (score >= 80) return { label: 'Thriving',   colorClass: 'text-emerald-400' };
  if (score >= 60) return { label: 'Enjoying',   colorClass: 'text-blue-400'    };
  if (score >= 40) return { label: 'Neutral',    colorClass: 'text-yellow-400'  };
  return              { label: 'Grinding',   colorClass: 'text-orange-400'  };
}

// ─── Custom Pie Tooltip ─────────────────────────────────────────────────────

function PieCustomTooltip({ active, payload }: { active?: boolean; payload?: { name: string; value: number; payload: { color: string; percent: number } }[] }) {
  if (!active || !payload?.length) return null;
  const { name, value, payload: { percent } } = payload[0];
  return (
    <div className="bg-[#1a1a2e] border border-white/10 rounded-lg px-3 py-2 text-xs shadow-xl">
      <span className="font-semibold text-white">{name}</span>
      <span className="text-white/50 ml-2">{value} sessions ({percent}%)</span>
    </div>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="text-center py-8 px-4">
      <div className="text-4xl mb-3">🎭</div>
      <h4 className="text-sm font-semibold text-white/80 mb-1">No mood data yet</h4>
      <p className="text-xs text-white/40 max-w-xs mx-auto mb-4">
        When you log play sessions, tap a mood — 🔥 Great, 👍 Good, 😐 Meh, or 💪 Grind. After a few sessions, this panel unlocks your personal gaming quality report.
      </p>
      <div className="flex justify-center gap-2 flex-wrap">
        {(['great','good','meh','grind'] as SessionMood[]).map(mood => (
          <div
            key={mood}
            className={clsx('px-3 py-1.5 rounded-full text-xs font-medium border', MOOD_CONFIG[mood].bg, MOOD_CONFIG[mood].text, MOOD_CONFIG[mood].border)}
          >
            {MOOD_CONFIG[mood].emoji} {MOOD_CONFIG[mood].label}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function MoodPanel({ games }: MoodPanelProps) {
  const [showAllGames, setShowAllGames] = useState(false);

  // ── Base analysis from calculations ──────────────────────────────────────
  const moodAnalysis = useMemo(() => getMoodAnalysis(games), [games]);

  // ── Overall quality score (0–100) ─────────────────────────────────────────
  const qualityScore = useMemo(() => {
    const { moodDistribution, totalTaggedSessions } = moodAnalysis;
    if (totalTaggedSessions === 0) return null;
    const sessions = moodDistribution.flatMap(d =>
      Array.from({ length: d.count }, () => ({ weight: MOOD_CONFIG[d.mood].weight }))
    );
    return weightedQualityScore(sessions, totalTaggedSessions);
  }, [moodAnalysis]);

  // ── Positive session rate (great + good) ─────────────────────────────────
  const positiveRate = useMemo(() => {
    const { moodDistribution, totalTaggedSessions } = moodAnalysis;
    if (totalTaggedSessions === 0) return 0;
    const pos = moodDistribution
      .filter(d => d.mood === 'great' || d.mood === 'good')
      .reduce((s, d) => s + d.count, 0);
    return Math.round((pos / totalTaggedSessions) * 100);
  }, [moodAnalysis]);

  // ── Vibe distribution ─────────────────────────────────────────────────────
  const vibeDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    let total = 0;
    games.forEach(game => {
      game.playLogs?.forEach(log => {
        if (log.vibe) { counts[log.vibe] = (counts[log.vibe] || 0) + 1; total++; }
      });
    });
    return Object.entries(counts)
      .map(([vibe, count]) => ({
        vibe,
        count,
        percent: total > 0 ? Math.round((count / total) * 100) : 0,
        cfg: VIBE_CONFIG[vibe as SessionVibe] ?? { emoji: '🎮', label: vibe, color: '#8b5cf6' },
      }))
      .sort((a, b) => b.count - a.count);
  }, [games]);

  // ── Per-game quality scores ───────────────────────────────────────────────
  const gameQualityScores = useMemo(() => {
    return games
      .filter(g => g.status !== 'Wishlist')
      .map(game => {
        const tagged = (game.playLogs ?? []).filter(l => l.mood);
        if (tagged.length < 2) return null;
        const score = weightedQualityScore(
          tagged.map(l => ({ weight: MOOD_CONFIG[l.mood!].weight })),
          tagged.length,
        );
        const positiveCount = tagged.filter(l => l.mood === 'great' || l.mood === 'good').length;
        const topMood = (['great','good','meh','grind'] as SessionMood[])
          .map(m => ({ mood: m, count: tagged.filter(l => l.mood === m).length }))
          .sort((a, b) => b.count - a.count)[0]?.mood ?? 'good';
        return {
          game,
          score,
          taggedSessions: tagged.length,
          positiveRate: Math.round((positiveCount / tagged.length) * 100),
          topMood,
        };
      })
      .filter(Boolean)
      .sort((a, b) => b!.score - a!.score) as {
        game: Game; score: number; taggedSessions: number; positiveRate: number; topMood: SessionMood;
      }[];
  }, [games]);

  // ── Day-of-week mood quality ──────────────────────────────────────────────
  const dayOfWeekMood = useMemo(() => {
    const data: Record<number, { total: number; count: number }> = {};
    for (let i = 0; i < 7; i++) data[i] = { total: 0, count: 0 };

    games.forEach(game => {
      game.playLogs?.forEach(log => {
        if (log.mood && log.date) {
          const d = parseLocalDate(log.date);
          const idx = (d.getDay() + 6) % 7; // Mon=0 … Sun=6
          data[idx].total += MOOD_CONFIG[log.mood].weight;
          data[idx].count++;
        }
      });
    });

    return Array.from({ length: 7 }, (_, i) => ({
      day: DAY_LABELS[i],
      score: data[i].count > 0
        ? Math.round(((data[i].total / data[i].count - 1) / 3) * 100)
        : null,
      sessions: data[i].count,
    }));
  }, [games]);

  const hasTaggedData = moodAnalysis.totalTaggedSessions > 0;
  const hasMeaningfulData = moodAnalysis.totalTaggedSessions >= 5;

  const pieData = moodAnalysis.moodDistribution.map(d => ({
    name: MOOD_CONFIG[d.mood].label,
    value: d.count,
    color: MOOD_CONFIG[d.mood].color,
    percent: d.percent,
    mood: d.mood,
    emoji: MOOD_CONFIG[d.mood].emoji,
  }));

  const visibleGames = showAllGames ? gameQualityScores : gameQualityScores.slice(0, 5);

  const tagRate = moodAnalysis.totalSessions > 0
    ? Math.round((moodAnalysis.totalTaggedSessions / moodAnalysis.totalSessions) * 100)
    : 0;

  // ── Dominant vibe label ───────────────────────────────────────────────────
  const dominantVibe = vibeDistribution[0];

  return (
    <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-5">
      {/* Header */}
      <h3 className="text-sm font-medium text-white/50 flex items-center gap-2">
        <SmilePlus size={14} className="text-purple-400" />
        Session Mood &amp; Vibe
      </h3>

      {!hasTaggedData ? (
        <EmptyState />
      ) : (
        <>
          {/* ── Hero Row ─────────────────────────────────────────────────── */}
          <div className="grid grid-cols-3 gap-3">
            {/* Quality Score */}
            {qualityScore !== null && (
              <div className="col-span-1 p-3 bg-gradient-to-br from-purple-500/10 to-indigo-500/10 border border-purple-500/15 rounded-xl text-center">
                <div className={clsx('text-3xl font-black tabular-nums', getScoreLabel(qualityScore).colorClass)}>
                  {qualityScore}
                </div>
                <div className="text-[10px] text-white/40 mt-0.5">quality score</div>
                <div className={clsx('text-[11px] font-semibold mt-1', getScoreLabel(qualityScore).colorClass)}>
                  {getScoreLabel(qualityScore).label}
                </div>
              </div>
            )}

            {/* Positive Rate */}
            <div className="col-span-1 p-3 bg-white/[0.03] border border-white/5 rounded-xl text-center">
              <div className="text-3xl font-black tabular-nums text-emerald-400">{positiveRate}%</div>
              <div className="text-[10px] text-white/40 mt-0.5">positive sessions</div>
              <div className="text-[11px] text-white/30 mt-1">great + good</div>
            </div>

            {/* Tagged count */}
            <div className="col-span-1 p-3 bg-white/[0.03] border border-white/5 rounded-xl text-center">
              <div className="text-3xl font-black tabular-nums text-white/80">{moodAnalysis.totalTaggedSessions}</div>
              <div className="text-[10px] text-white/40 mt-0.5">sessions tagged</div>
              <div className="text-[11px] text-white/30 mt-1">of {moodAnalysis.totalSessions} total ({tagRate}%)</div>
            </div>
          </div>

          {/* ── Mood Distribution ────────────────────────────────────────── */}
          <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl">
            <h4 className="text-xs font-medium text-white/50 mb-3 flex items-center gap-1.5">
              <Smile size={12} className="text-yellow-400" />
              Mood Breakdown
            </h4>
            <div className="flex items-center gap-4">
              {/* Donut */}
              <div className="shrink-0" style={{ width: 100, height: 100 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={28}
                      outerRadius={45}
                      dataKey="value"
                      paddingAngle={2}
                      startAngle={90}
                      endAngle={-270}
                    >
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} opacity={0.85} />
                      ))}
                    </Pie>
                    <ReTooltip content={<PieCustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legend */}
              <div className="flex-1 space-y-2">
                {moodAnalysis.moodDistribution.map(d => {
                  const cfg = MOOD_CONFIG[d.mood];
                  return (
                    <div key={d.mood} className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: cfg.color }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-white/70">{cfg.emoji} {cfg.label}</span>
                          <span className="text-xs font-semibold" style={{ color: cfg.color }}>{d.percent}%</span>
                        </div>
                        <div className="h-1 bg-white/5 rounded-full mt-0.5 overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${d.percent}%`, background: cfg.color, opacity: 0.7 }}
                          />
                        </div>
                      </div>
                      <span className="text-[10px] text-white/30 w-16 text-right shrink-0">
                        avg {d.avgHours}h/session
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Insight line */}
            {moodAnalysis.bestMoodForRating && (
              <p className="text-[11px] text-white/40 mt-3 border-t border-white/5 pt-3">
                💡 Your{' '}
                <span className={MOOD_CONFIG[moodAnalysis.bestMoodForRating.mood].text}>
                  {MOOD_CONFIG[moodAnalysis.bestMoodForRating.mood].label.toLowerCase()}
                </span>{' '}
                sessions correlate with your highest-rated games (avg{' '}
                {moodAnalysis.bestMoodForRating.avgGameRating}/10)
              </p>
            )}
          </div>

          {/* ── Happiest Games ───────────────────────────────────────────── */}
          {gameQualityScores.length > 0 && (
            <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl">
              <h4 className="text-xs font-medium text-white/50 mb-3 flex items-center gap-1.5">
                <Gamepad2 size={12} className="text-purple-400" />
                Happiest Games
                <span className="ml-auto text-[10px] text-white/30">by session quality</span>
              </h4>
              <div className="space-y-2.5">
                {visibleGames.map(({ game, score, taggedSessions, positiveRate: pr, topMood }, idx) => {
                  const cfg = MOOD_CONFIG[topMood];
                  const scoreColor = score >= 80 ? '#10b981' : score >= 60 ? '#3b82f6' : score >= 40 ? '#f59e0b' : '#f97316';
                  return (
                    <div key={game.id} className="flex items-center gap-3">
                      <span className="text-[10px] text-white/30 w-4 text-right shrink-0">#{idx + 1}</span>
                      {game.thumbnail ? (
                        <img
                          src={game.thumbnail}
                          alt=""
                          className="w-8 h-8 rounded-lg object-cover shrink-0"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                          <Gamepad2 size={12} className="text-white/30" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs text-white/80 truncate font-medium">{game.name}</span>
                          <span className="text-[10px] font-bold shrink-0" style={{ color: scoreColor }}>{score}/100</span>
                        </div>
                        <div className="h-1.5 bg-white/5 rounded-full mt-1 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${score}%`, background: scoreColor, opacity: 0.7 }}
                          />
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className={clsx('text-[10px] font-medium', cfg.text)}>{cfg.emoji} {cfg.label}</span>
                          <span className="text-[10px] text-white/25">·</span>
                          <span className="text-[10px] text-white/30">{pr}% positive</span>
                          <span className="text-[10px] text-white/25">·</span>
                          <span className="text-[10px] text-white/30">{taggedSessions} sessions tagged</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {gameQualityScores.length > 5 && (
                <button
                  onClick={() => setShowAllGames(v => !v)}
                  className="mt-3 flex items-center gap-1 text-[11px] text-white/40 hover:text-white/60 transition-colors w-full justify-center"
                >
                  {showAllGames ? <><ChevronUp size={12} /> Show less</> : <><ChevronDown size={12} /> Show all {gameQualityScores.length} games</>}
                </button>
              )}
            </div>
          )}

          {/* ── Vibe Breakdown ───────────────────────────────────────────── */}
          {vibeDistribution.length > 0 && (
            <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl">
              <h4 className="text-xs font-medium text-white/50 mb-3 flex items-center gap-1.5">
                <Wind size={12} className="text-cyan-400" />
                Gaming Vibe
                {dominantVibe && (
                  <span className="ml-auto text-[10px] text-white/30">
                    mostly {dominantVibe.cfg.emoji} {dominantVibe.cfg.label}
                  </span>
                )}
              </h4>
              <div className="space-y-2">
                {vibeDistribution.map(({ vibe, count, percent, cfg }) => (
                  <div key={vibe} className="flex items-center gap-2">
                    <span className="text-sm w-5 text-center shrink-0">{cfg.emoji}</span>
                    <span className="text-xs text-white/60 w-32 shrink-0">{cfg.label}</span>
                    <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${percent}%`, background: cfg.color, opacity: 0.7 }}
                      />
                    </div>
                    <span className="text-[10px] text-white/40 w-8 text-right shrink-0">{percent}%</span>
                    <span className="text-[10px] text-white/25 w-16 text-right shrink-0">{count}×</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Day of Week ──────────────────────────────────────────────── */}
          {(() => {
            const tagged = dayOfWeekMood.filter(d => d.sessions > 0);
            if (tagged.length < 3) return null;
            const maxScore = Math.max(...tagged.map(d => d.score ?? 0), 1);
            return (
              <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl">
                <h4 className="text-xs font-medium text-white/50 mb-4 flex items-center gap-1.5">
                  <Smile size={12} className="text-blue-400" />
                  Best Days to Game
                  <span className="ml-auto text-[10px] text-white/30">avg mood quality</span>
                </h4>
                <div className="flex items-end justify-between gap-1 h-20">
                  {dayOfWeekMood.map(({ day, score, sessions }) => {
                    const hasData = sessions > 0 && score !== null;
                    const barPct = hasData ? (score / 100) * 100 : 0;
                    const barColor = !hasData ? '#ffffff10'
                      : score! >= 75 ? '#10b981'
                      : score! >= 55 ? '#3b82f6'
                      : score! >= 35 ? '#f59e0b'
                      : '#f97316';
                    return (
                      <div key={day} className="flex-1 flex flex-col items-center gap-1 group">
                        <div
                          className="text-[9px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ color: barColor }}
                        >
                          {hasData ? score : '—'}
                        </div>
                        <div className="w-full h-16 bg-white/[0.03] rounded-md overflow-hidden flex items-end">
                          <div
                            className="w-full rounded-md transition-all"
                            style={{ height: `${Math.max(barPct, hasData ? 6 : 0)}%`, background: barColor, opacity: 0.75 }}
                          />
                        </div>
                        <div className="text-[9px] text-white/40">{day}</div>
                        {sessions > 0 && (
                          <div className="text-[8px] text-white/20">{sessions}×</div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {(() => {
                  const best = [...dayOfWeekMood].filter(d => d.score !== null).sort((a, b) => b.score! - a.score!)[0];
                  const worst = [...dayOfWeekMood].filter(d => d.score !== null).sort((a, b) => a.score! - b.score!)[0];
                  if (!best || best.day === worst?.day) return null;
                  return (
                    <p className="text-[11px] text-white/40 mt-3 border-t border-white/5 pt-3">
                      🎯 <span className="text-white/60">{best.day}</span> is your best gaming day — worst is{' '}
                      <span className="text-white/60">{worst.day}</span>
                    </p>
                  );
                })()}
              </div>
            );
          })()}

          {/* ── Longest session insight ──────────────────────────────────── */}
          {moodAnalysis.longestSessionMood && (
            <div className={clsx(
              'px-4 py-3 rounded-xl text-xs flex items-center gap-2 border',
              MOOD_CONFIG[moodAnalysis.longestSessionMood.mood].bg,
              MOOD_CONFIG[moodAnalysis.longestSessionMood.mood].border,
            )}>
              <Dumbbell size={12} className={MOOD_CONFIG[moodAnalysis.longestSessionMood.mood].text} />
              <span className="text-white/60">
                Your longest session ever ({moodAnalysis.longestSessionMood.hours}h on{' '}
                <span className="text-white/80 font-medium">{moodAnalysis.longestSessionMood.game}</span>){' '}
                was tagged as{' '}
                <span className={MOOD_CONFIG[moodAnalysis.longestSessionMood.mood].text}>
                  {MOOD_CONFIG[moodAnalysis.longestSessionMood.mood].emoji}{' '}
                  {MOOD_CONFIG[moodAnalysis.longestSessionMood.mood].label}
                </span>
              </span>
            </div>
          )}

          {/* ── Encourage more tagging ───────────────────────────────────── */}
          {tagRate < 50 && moodAnalysis.totalSessions >= 10 && (
            <div className="flex items-start gap-2.5 px-4 py-3 bg-white/[0.02] border border-white/5 rounded-xl">
              <Info size={13} className="text-white/30 mt-0.5 shrink-0" />
              <p className="text-[11px] text-white/35">
                Only <span className="text-white/55">{tagRate}%</span> of your sessions have mood tags.
                Tag more sessions when you log time for richer insights — it takes one tap.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
