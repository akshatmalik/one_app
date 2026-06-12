'use client';

import { useMemo, useState } from 'react';
import { SmilePlus, Smile, Meh, Frown, BookOpen, ChevronDown, Sparkles } from 'lucide-react';
import { Game, SessionMood } from '../lib/types';
import { getMoodAnalysis, parseLocalDate } from '../lib/calculations';
import clsx from 'clsx';

interface SessionMoodPanelProps {
  games: Game[];
}

const MOOD_META: Record<SessionMood, { emoji: string; label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
  great: {
    emoji: '😄',
    label: 'Great',
    color: '#10b981',
    bg: 'rgba(16,185,129,0.10)',
    border: 'rgba(16,185,129,0.25)',
    icon: <SmilePlus size={14} />,
  },
  good: {
    emoji: '🙂',
    label: 'Good',
    color: '#3b82f6',
    bg: 'rgba(59,130,246,0.10)',
    border: 'rgba(59,130,246,0.25)',
    icon: <Smile size={14} />,
  },
  meh: {
    emoji: '😐',
    label: 'Meh',
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.10)',
    border: 'rgba(245,158,11,0.25)',
    icon: <Meh size={14} />,
  },
  grind: {
    emoji: '😤',
    label: 'Grind',
    color: '#ef4444',
    bg: 'rgba(239,68,68,0.10)',
    border: 'rgba(239,68,68,0.25)',
    icon: <Frown size={14} />,
  },
};

function formatDate(dateStr: string): string {
  const date = parseLocalDate(dateStr);
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

  if (dateStr === todayStr) return 'Today';
  if (dateStr === yesterdayStr) return 'Yesterday';

  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: now.getFullYear() !== date.getFullYear() ? 'numeric' : undefined,
  });
}

// Build a one-line data-driven insight from mood analysis
function buildInsight(
  distribution: { mood: SessionMood; count: number; percent: number; avgHours: number }[],
): string | null {
  if (distribution.length < 2) return null;

  const great = distribution.find(d => d.mood === 'great');
  const grind = distribution.find(d => d.mood === 'grind');
  const good = distribution.find(d => d.mood === 'good');
  const meh = distribution.find(d => d.mood === 'meh');

  // Insight: grind sessions are longer (sunk cost)
  if (great && grind && grind.avgHours > great.avgHours * 1.3) {
    const pct = Math.round(((grind.avgHours - great.avgHours) / great.avgHours) * 100);
    return `Your Grind sessions last ${pct}% longer than Great sessions — you push through even when it isn't fun.`;
  }

  // Insight: great sessions are the longest (flow state)
  if (great && grind && great.avgHours > grind.avgHours * 1.3) {
    const pct = Math.round(((great.avgHours - grind.avgHours) / grind.avgHours) * 100);
    return `When you're having a Great time, sessions last ${pct}% longer — you lose track of time.`;
  }

  // Insight: mostly positive
  const positiveTotal = (great?.percent ?? 0) + (good?.percent ?? 0);
  if (positiveTotal >= 70) {
    return `${positiveTotal}% of your sessions are Great or Good — you're picking games you actually enjoy.`;
  }

  // Insight: a lot of grind
  if (grind && grind.percent >= 25) {
    return `${grind.percent}% of sessions feel like a grind. It might be time to try something fresh.`;
  }

  // Insight: lots of meh
  if (meh && meh.percent >= 30) {
    return `${meh.percent}% of sessions are Meh — your library might have a few games that don't spark joy.`;
  }

  // Generic fallback
  const top = distribution[0];
  const meta = MOOD_META[top.mood];
  return `Your most common session mood is ${meta.emoji} ${meta.label} (${top.percent}% of sessions).`;
}

export function SessionMoodPanel({ games }: SessionMoodPanelProps) {
  const [showAllNotes, setShowAllNotes] = useState(false);
  const NOTES_PAGE = 5;

  const analysis = useMemo(() => getMoodAnalysis(games), [games]);

  // Extract sessions with notes (newest first)
  const sessionsWithNotes = useMemo(() => {
    return games
      .filter(g => g.status !== 'Wishlist')
      .flatMap(game =>
        (game.playLogs ?? [])
          .filter(log => log.notes && log.notes.trim().length > 0)
          .map(log => ({ game, log }))
      )
      .sort((a, b) => b.log.date.localeCompare(a.log.date));
  }, [games]);

  const hasMoodData = analysis.totalTaggedSessions >= 3;
  const hasNotes = sessionsWithNotes.length > 0;

  // No play sessions at all — don't render
  const ownedWithLogs = games.filter(g => g.status !== 'Wishlist' && g.playLogs && g.playLogs.length > 0);
  if (ownedWithLogs.length === 0) return null;

  const insight = hasMoodData ? buildInsight(analysis.moodDistribution) : null;
  const visibleNotes = showAllNotes ? sessionsWithNotes : sessionsWithNotes.slice(0, NOTES_PAGE);

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-white/50 flex items-center gap-2">
        <Sparkles size={14} className="text-pink-400" />
        Session Vibes
      </h3>

      {/* ── Mood Analytics ── */}
      {hasMoodData ? (
        <div className="p-4 bg-gradient-to-br from-pink-500/10 to-purple-500/10 border border-pink-500/20 rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-white/70">How Gaming Makes You Feel</h4>
            <span className="text-[10px] text-white/30">
              {analysis.totalTaggedSessions} of {analysis.totalSessions} sessions tagged
            </span>
          </div>

          {/* Mood bar */}
          <div className="h-3 flex rounded-full overflow-hidden gap-[2px]">
            {analysis.moodDistribution.map(d => {
              const meta = MOOD_META[d.mood];
              return (
                <div
                  key={d.mood}
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${d.percent}%`,
                    backgroundColor: meta.color,
                    opacity: 0.85,
                    minWidth: d.percent > 0 ? '4px' : '0',
                  }}
                  title={`${meta.label}: ${d.percent}%`}
                />
              );
            })}
          </div>

          {/* Mood tiles */}
          <div className="grid grid-cols-2 gap-2">
            {analysis.moodDistribution.map(d => {
              const meta = MOOD_META[d.mood];
              const topGame = analysis.topGameByMood[d.mood];
              return (
                <div
                  key={d.mood}
                  className="p-3 rounded-xl border"
                  style={{ backgroundColor: meta.bg, borderColor: meta.border }}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-base">{meta.emoji}</span>
                    <span className="text-xs font-semibold" style={{ color: meta.color }}>
                      {meta.label}
                    </span>
                    <span className="ml-auto text-xs font-bold" style={{ color: meta.color }}>
                      {d.percent}%
                    </span>
                  </div>
                  <div className="text-[11px] text-white/50">
                    {d.count} session{d.count !== 1 ? 's' : ''} · avg {d.avgHours}h
                  </div>
                  {topGame && (
                    <div className="text-[10px] text-white/30 truncate mt-0.5">
                      Most: {topGame.game}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Key insight */}
          {insight && (
            <div className="px-3 py-2 bg-white/5 rounded-lg border border-white/5">
              <p className="text-xs text-white/60 italic">{insight}</p>
            </div>
          )}

          {/* Best mood for high ratings */}
          {analysis.bestMoodForRating && (
            <div className="flex items-center gap-2 text-xs text-white/50">
              <span>{MOOD_META[analysis.bestMoodForRating.mood as SessionMood].emoji}</span>
              <span>
                You rate games higher when sessions feel{' '}
                <span
                  className="font-medium"
                  style={{ color: MOOD_META[analysis.bestMoodForRating.mood as SessionMood].color }}
                >
                  {MOOD_META[analysis.bestMoodForRating.mood as SessionMood].label}
                </span>
                {' '}(avg {analysis.bestMoodForRating.avgGameRating}/10)
              </span>
            </div>
          )}
        </div>
      ) : (
        // Partial data or zero: nudge + preview
        <div className="p-4 bg-gradient-to-br from-pink-500/8 to-purple-500/8 border border-pink-500/15 rounded-xl">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-pink-500/15 rounded-xl flex items-center justify-center shrink-0">
              <span className="text-xl">😄</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white/70 mb-1">How does gaming make you feel?</p>
              <p className="text-xs text-white/40 leading-relaxed">
                Tag sessions as Great / Good / Meh / Grind when logging time.
                Once you have 3+ tagged sessions, you&apos;ll see which games energise you,
                how long different moods last, and what to play when your energy is low.
              </p>
              {analysis.totalTaggedSessions > 0 && (
                <p className="text-[11px] text-pink-400/70 mt-2">
                  {analysis.totalTaggedSessions} session{analysis.totalTaggedSessions !== 1 ? 's' : ''} tagged so far —
                  keep going!
                </p>
              )}
            </div>
          </div>

          {/* Preview of mood tiles (greyed out) */}
          <div className="mt-4 grid grid-cols-4 gap-2 opacity-30 pointer-events-none select-none">
            {(['great', 'good', 'meh', 'grind'] as SessionMood[]).map(mood => {
              const meta = MOOD_META[mood];
              return (
                <div
                  key={mood}
                  className="p-2 rounded-xl border text-center"
                  style={{ backgroundColor: meta.bg, borderColor: meta.border }}
                >
                  <div className="text-lg mb-0.5">{meta.emoji}</div>
                  <div className="text-[10px] font-medium" style={{ color: meta.color }}>{meta.label}</div>
                  <div className="text-[9px] text-white/40">— sessions</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Session Notes Journal ── */}
      {hasNotes && (
        <div className="p-4 bg-gradient-to-br from-blue-500/8 to-indigo-500/8 border border-blue-500/15 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-white/70 flex items-center gap-2">
              <BookOpen size={14} className="text-blue-400" />
              Session Notes
            </h4>
            <span className="text-[10px] text-white/30">
              {sessionsWithNotes.length} note{sessionsWithNotes.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="space-y-2">
            {visibleNotes.map(({ game, log }) => {
              const moodMeta = log.mood ? MOOD_META[log.mood] : null;
              return (
                <div
                  key={log.id}
                  className="flex gap-3 p-3 bg-white/[0.03] rounded-xl border border-white/5"
                >
                  {/* Thumbnail */}
                  <div className="w-9 h-9 rounded-lg overflow-hidden bg-white/5 shrink-0">
                    {game.thumbnail ? (
                      <img src={game.thumbnail} alt="" className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/20 text-xs font-bold">
                        {game.name.charAt(0)}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-medium text-white/70 truncate flex-1">{game.name}</span>
                      {moodMeta && (
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0"
                          style={{ color: moodMeta.color, backgroundColor: moodMeta.bg }}
                        >
                          {moodMeta.emoji} {moodMeta.label}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-white/50 leading-relaxed line-clamp-2">{log.notes}</p>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-white/25">
                      <span>{formatDate(log.date)}</span>
                      <span>·</span>
                      <span>{log.hours}h</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {sessionsWithNotes.length > NOTES_PAGE && (
            <button
              onClick={() => setShowAllNotes(v => !v)}
              className="w-full mt-3 py-2 flex items-center justify-center gap-1.5 text-xs text-white/40 hover:text-white/60 transition-colors"
            >
              <ChevronDown
                size={13}
                className={clsx('transition-transform', showAllNotes && 'rotate-180')}
              />
              {showAllNotes
                ? 'Show fewer notes'
                : `Show ${sessionsWithNotes.length - NOTES_PAGE} more notes`}
            </button>
          )}
        </div>
      )}

    </div>
  );
}
