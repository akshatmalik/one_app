'use client';

import { useMemo, useState } from 'react';
import { Smile, Frown, Meh, Zap, ChevronDown, ChevronUp, Gamepad2, Heart, Tag } from 'lucide-react';
import { Game, SessionMood } from '../lib/types';
import { getMoodAnalysis, getVibeStats, getPerGameMoodStats } from '../lib/calculations';
import clsx from 'clsx';

interface SessionMoodPanelProps {
  games: Game[];
}

const MOOD_CONFIG: Record<SessionMood, { label: string; emoji: string; color: string; bg: string; icon: React.ReactNode }> = {
  great: { label: 'Great',  emoji: '🌟', color: '#10b981', bg: 'rgba(16,185,129,0.12)', icon: <Smile  size={14} className="text-emerald-400" /> },
  good:  { label: 'Good',   emoji: '👍', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', icon: <Heart  size={14} className="text-blue-400"    /> },
  meh:   { label: 'Meh',    emoji: '😐', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', icon: <Meh    size={14} className="text-yellow-400"  /> },
  grind: { label: 'Grind',  emoji: '😤', color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  icon: <Frown  size={14} className="text-red-400"     /> },
};

function TaggingNudge({ total, tagged }: { total: number; tagged: number }) {
  const rate = total > 0 ? Math.round((tagged / total) * 100) : 0;
  const barColor = rate >= 50 ? '#10b981' : rate >= 20 ? '#f59e0b' : '#6b7280';

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] text-white/40">Sessions tagged with mood</span>
          <span className="text-[11px] font-semibold" style={{ color: barColor }}>
            {tagged}/{total} ({rate}%)
          </span>
        </div>
        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${rate}%`, backgroundColor: barColor }}
          />
        </div>
      </div>
    </div>
  );
}

function MoodBar({ label, emoji, color, bg, count, percent, avgHours }: {
  label: string; emoji: string; color: string; bg: string;
  count: number; percent: number; avgHours: number;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="text-base w-5 shrink-0 text-center leading-none">{emoji}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-xs text-white/60">{label}</span>
          <span className="text-xs font-semibold" style={{ color }}>{percent}%</span>
        </div>
        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${percent}%`, backgroundColor: color }}
          />
        </div>
      </div>
      <div className="text-right shrink-0 w-14">
        <div className="text-[10px] text-white/50">{count} sessions</div>
        <div className="text-[9px] text-white/25">{avgHours}h avg</div>
      </div>
    </div>
  );
}

function GameMoodCard({ game, showGreat }: {
  game: ReturnType<typeof getPerGameMoodStats>[number];
  showGreat: boolean;
}) {
  const rate = showGreat ? game.greatRate : game.grindRate;
  const color = showGreat ? '#10b981' : '#ef4444';
  const pct = Math.round(rate * 100);

  return (
    <div className="flex items-center gap-2.5 p-2.5 bg-white/[0.02] border border-white/5 rounded-xl">
      {game.thumbnail ? (
        <img src={game.thumbnail} alt={game.gameName} className="w-9 h-9 rounded-lg object-cover shrink-0" loading="lazy" />
      ) : (
        <div className="w-9 h-9 rounded-lg bg-white/5 shrink-0 flex items-center justify-center">
          <Gamepad2 size={14} className="text-white/20" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="text-xs text-white/80 truncate font-medium">{game.gameName}</div>
        <div className="text-[10px] text-white/40">{game.taggedSessions} tagged session{game.taggedSessions !== 1 ? 's' : ''}</div>
      </div>
      <div
        className="text-sm font-bold tabular-nums shrink-0"
        style={{ color }}
      >
        {pct}%
      </div>
    </div>
  );
}

export function SessionMoodPanel({ games }: SessionMoodPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [showAllVibes, setShowAllVibes] = useState(false);

  const moodAnalysis = useMemo(() => getMoodAnalysis(games), [games]);
  const vibeStats    = useMemo(() => getVibeStats(games),    [games]);
  const perGame      = useMemo(() => getPerGameMoodStats(games), [games]);

  const ownedGames = games.filter(g => g.status !== 'Wishlist');
  if (ownedGames.length === 0) return null;

  const hasData      = moodAnalysis.totalTaggedSessions >= 3;
  const hasVibeData  = vibeStats.totalTaggedWithVibe >= 2;
  const happiest     = [...perGame].sort((a, b) => b.greatRate  - a.greatRate ).slice(0, 3);
  const grindiest    = [...perGame].filter(g => g.grindCount > 0).sort((a, b) => b.grindRate - a.grindRate).slice(0, 3);
  const visibleVibes = showAllVibes ? vibeStats.vibeDistribution : vibeStats.vibeDistribution.slice(0, 3);

  // Compute a headline sentence
  const topMood = moodAnalysis.moodDistribution[0];
  const headline = topMood
    ? `${topMood.percent}% of your sessions are ${topMood.mood} ${MOOD_CONFIG[topMood.mood].emoji}`
    : null;

  return (
    <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
      {/* Header */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="w-full flex items-center justify-between mb-3"
      >
        <div className="flex items-center gap-2">
          <Smile size={16} className="text-emerald-400" />
          <span className="text-sm font-semibold text-white/80">Session Mood Intelligence</span>
          {hasData && headline && (
            <span className="hidden sm:inline text-[11px] text-white/30 italic truncate max-w-[220px]">
              — {headline}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {moodAnalysis.totalTaggedSessions > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {moodAnalysis.totalTaggedSessions} tagged
            </span>
          )}
          {collapsed
            ? <ChevronDown size={14} className="text-white/30" />
            : <ChevronUp   size={14} className="text-white/30" />
          }
        </div>
      </button>

      {!collapsed && (
        <div className="space-y-4">

          {/* Empty state — no or too little mood data */}
          {!hasData && (
            <div className="text-center py-6 space-y-3">
              <div className="text-4xl">🎭</div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-white/60">
                  Unlock how your sessions <em>feel</em>
                </p>
                <p className="text-[12px] text-white/35 max-w-xs mx-auto leading-relaxed">
                  When you log a play session, tap <strong className="text-white/50">Mood</strong> to tag it as
                  Great / Good / Meh / Grind. After a few tags, this panel comes alive with patterns:
                  which games energise you, which are a grind, and what your dominant gaming vibe is.
                </p>
              </div>
              <div className="flex justify-center gap-3 pt-1">
                {(['great', 'good', 'meh', 'grind'] as SessionMood[]).map(m => {
                  const cfg = MOOD_CONFIG[m];
                  return (
                    <span
                      key={m}
                      className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg"
                      style={{ color: cfg.color, backgroundColor: cfg.bg }}
                    >
                      {cfg.emoji} {cfg.label}
                    </span>
                  );
                })}
              </div>
              {moodAnalysis.totalTaggedSessions > 0 && (
                <p className="text-[11px] text-white/30 pt-1">
                  {moodAnalysis.totalTaggedSessions} session{moodAnalysis.totalTaggedSessions !== 1 ? 's' : ''} tagged so far —
                  keep going!
                </p>
              )}
            </div>
          )}

          {/* Full data view */}
          {hasData && (
            <>
              {/* Tagging rate */}
              <TaggingNudge
                total={moodAnalysis.totalSessions}
                tagged={moodAnalysis.totalTaggedSessions}
              />

              {/* Mood distribution bars */}
              <div className="p-3 bg-white/[0.02] rounded-xl space-y-2.5">
                <p className="text-[11px] text-white/40 font-medium uppercase tracking-wide mb-1">Mood distribution</p>
                {moodAnalysis.moodDistribution.map(item => {
                  const cfg = MOOD_CONFIG[item.mood];
                  return (
                    <MoodBar
                      key={item.mood}
                      label={cfg.label}
                      emoji={cfg.emoji}
                      color={cfg.color}
                      bg={cfg.bg}
                      count={item.count}
                      percent={item.percent}
                      avgHours={item.avgHours}
                    />
                  );
                })}
              </div>

              {/* Insight row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {moodAnalysis.bestMoodForRating && (
                  <div className="p-3 bg-white/[0.02] rounded-xl">
                    <div className="text-[10px] text-white/30 mb-1">Best rated game mood</div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-lg">{MOOD_CONFIG[moodAnalysis.bestMoodForRating.mood].emoji}</span>
                      <div>
                        <div className="text-xs font-semibold text-white/70">
                          {MOOD_CONFIG[moodAnalysis.bestMoodForRating.mood].label}
                        </div>
                        <div className="text-[10px] text-white/30">
                          avg game rating {moodAnalysis.bestMoodForRating.avgGameRating}/10
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {moodAnalysis.longestSessionMood && (
                  <div className="p-3 bg-white/[0.02] rounded-xl">
                    <div className="text-[10px] text-white/30 mb-1">Longest session mood</div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-lg">{MOOD_CONFIG[moodAnalysis.longestSessionMood.mood].emoji}</span>
                      <div>
                        <div className="text-xs font-semibold text-white/70">
                          {MOOD_CONFIG[moodAnalysis.longestSessionMood.mood].label}
                        </div>
                        <div className="text-[10px] text-white/30 truncate max-w-[120px]">
                          {moodAnalysis.longestSessionMood.hours}h · {moodAnalysis.longestSessionMood.game}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {moodAnalysis.topGameByMood['great'] && (
                  <div className="p-3 bg-white/[0.02] rounded-xl">
                    <div className="text-[10px] text-white/30 mb-1">Top game when 🌟 Great</div>
                    <div className="text-xs font-semibold text-white/70 truncate">
                      {moodAnalysis.topGameByMood['great'].game}
                    </div>
                    <div className="text-[10px] text-white/30">
                      {moodAnalysis.topGameByMood['great'].hours}h great sessions
                    </div>
                  </div>
                )}
              </div>

              {/* Happiest games */}
              {happiest.length > 0 && (
                <div>
                  <p className="text-[11px] text-white/40 font-medium uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <span>🌟</span> Happiest games
                  </p>
                  <div className="space-y-1.5">
                    {happiest.map(g => (
                      <GameMoodCard key={g.gameId} game={g} showGreat={true} />
                    ))}
                  </div>
                </div>
              )}

              {/* Grindiest games */}
              {grindiest.length > 0 && (
                <div>
                  <p className="text-[11px] text-white/40 font-medium uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <span>😤</span> Honest grinds
                  </p>
                  <div className="space-y-1.5">
                    {grindiest.map(g => (
                      <GameMoodCard key={g.gameId} game={g} showGreat={false} />
                    ))}
                  </div>
                </div>
              )}

              {/* Vibe breakdown */}
              {hasVibeData && (
                <div>
                  <p className="text-[11px] text-white/40 font-medium uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <Zap size={11} className="text-yellow-400" /> Your gaming vibes
                  </p>
                  <div className="space-y-2">
                    {visibleVibes.map(v => (
                      <div key={v.vibe} className="flex items-center gap-2.5">
                        <span className="text-sm w-5 text-center leading-none">{v.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-xs text-white/60">{v.label}</span>
                            <span className="text-xs font-semibold" style={{ color: v.color }}>{v.percent}%</span>
                          </div>
                          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${v.percent}%`, backgroundColor: v.color }}
                            />
                          </div>
                        </div>
                        <span className="text-[10px] text-white/30 w-12 text-right shrink-0">
                          {v.count} sessions
                        </span>
                      </div>
                    ))}
                    {vibeStats.vibeDistribution.length > 3 && (
                      <button
                        onClick={() => setShowAllVibes(v => !v)}
                        className="text-[11px] text-white/30 hover:text-white/60 transition-colors pt-1"
                      >
                        {showAllVibes ? 'Show less' : `Show ${vibeStats.vibeDistribution.length - 3} more vibes`}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Footer nudge for low tagging rate */}
              {moodAnalysis.totalTaggedSessions < moodAnalysis.totalSessions * 0.3 && (
                <div className="flex items-start gap-2 p-3 bg-white/[0.02] rounded-xl">
                  <Tag size={12} className="text-white/30 mt-0.5 shrink-0" />
                  <p className="text-[11px] text-white/35 leading-relaxed">
                    Tag more sessions with a mood to get richer insights. Open any game&apos;s play log
                    and tap the mood buttons when logging your next session.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
