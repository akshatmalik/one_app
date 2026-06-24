'use client';

import { useMemo } from 'react';
import { Sparkles, Tag } from 'lucide-react';
import clsx from 'clsx';
import { Game } from '../lib/types';
import { getMoodAnalysis, getSocialGamingStats, getVibeAnalysis } from '../lib/calculations';

interface SessionVibesPanelProps {
  games: Game[];
}

const MOOD_META: Record<string, { label: string; emoji: string; barColor: string; textColor: string }> = {
  great: { label: 'Great', emoji: '🔥', barColor: 'bg-emerald-500', textColor: 'text-emerald-400' },
  good: { label: 'Good', emoji: '👍', barColor: 'bg-blue-500', textColor: 'text-blue-400' },
  meh: { label: 'Meh', emoji: '😐', barColor: 'bg-yellow-500', textColor: 'text-yellow-400' },
  grind: { label: 'Grind', emoji: '💪', barColor: 'bg-orange-500', textColor: 'text-orange-400' },
};

const VIBE_COLORS: Record<string, { barColor: string; textColor: string }> = {
  'wind-down': { barColor: 'bg-indigo-500', textColor: 'text-indigo-400' },
  competitive: { barColor: 'bg-rose-500', textColor: 'text-rose-400' },
  exploration: { barColor: 'bg-teal-500', textColor: 'text-teal-400' },
  story: { barColor: 'bg-amber-500', textColor: 'text-amber-400' },
  'achievement-hunting': { barColor: 'bg-yellow-500', textColor: 'text-yellow-400' },
  social: { barColor: 'bg-cyan-500', textColor: 'text-cyan-400' },
};

const SOCIAL_COLORS: Record<string, { barColor: string; textColor: string }> = {
  solo: { barColor: 'bg-white/30', textColor: 'text-white/60' },
  'co-op': { barColor: 'bg-pink-500', textColor: 'text-pink-400' },
  online: { barColor: 'bg-purple-500', textColor: 'text-purple-400' },
  'couch-co-op': { barColor: 'bg-lime-500', textColor: 'text-lime-400' },
  stream: { barColor: 'bg-red-500', textColor: 'text-red-400' },
};

function BreakdownBar({
  emoji,
  label,
  percent,
  valueLabel,
  barColor,
  textColor,
}: {
  emoji: string;
  label: string;
  percent: number;
  valueLabel: string;
  barColor: string;
  textColor: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className={clsx('font-medium', textColor)}>{emoji} {label}</span>
        <span className="text-white/40">{valueLabel} · {percent}%</span>
      </div>
      <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
        <div className={clsx('h-full rounded-full', barColor)} style={{ width: `${Math.max(percent, 2)}%` }} />
      </div>
    </div>
  );
}

function EmptyTeaser({ text }: { text: string }) {
  return (
    <p className="text-[11px] text-white/25 flex items-center gap-1.5">
      <Tag size={11} className="text-white/15" />
      {text}
    </p>
  );
}

export function SessionVibesPanel({ games }: SessionVibesPanelProps) {
  const mood = useMemo(() => getMoodAnalysis(games), [games]);
  const vibe = useMemo(() => getVibeAnalysis(games), [games]);
  const social = useMemo(() => getSocialGamingStats(games), [games]);

  const anyTagged = mood.totalTaggedSessions > 0 || vibe.taggedSessions > 0 || social.taggedSessions > 0;
  const allEmpty = mood.totalTaggedSessions === 0 && vibe.taggedSessions === 0 && social.taggedSessions === 0;

  // Nothing to show and no logged sessions at all to encourage tagging — skip entirely.
  if (mood.totalSessions === 0) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-white/50 flex items-center gap-2">
        <Sparkles size={14} className="text-violet-400" />
        Session Vibes
      </h3>

      {allEmpty ? (
        <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl text-center">
          <p className="text-sm text-white/40">
            When you log a session, tag its mood, vibe, and who you played with — this panel turns those tags into a picture of what kind of sessions you actually have.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Mood */}
          <div className="p-4 bg-white/[0.03] border border-white/5 rounded-xl space-y-3">
            <div className="text-[11px] font-medium text-white/40 uppercase tracking-wide">Mood</div>
            {mood.moodDistribution.length > 0 ? (
              <div className="space-y-2.5">
                {mood.moodDistribution
                  .slice()
                  .sort((a, b) => b.count - a.count)
                  .map(m => (
                    <BreakdownBar
                      key={m.mood}
                      emoji={MOOD_META[m.mood].emoji}
                      label={MOOD_META[m.mood].label}
                      percent={m.percent}
                      valueLabel={`avg ${m.avgHours}h`}
                      barColor={MOOD_META[m.mood].barColor}
                      textColor={MOOD_META[m.mood].textColor}
                    />
                  ))}
                {mood.bestMoodForRating && (
                  <p className="text-[11px] text-white/35 pt-1">
                    {MOOD_META[mood.bestMoodForRating.mood].emoji} {MOOD_META[mood.bestMoodForRating.mood].label} sessions land on your best-rated games (avg {mood.bestMoodForRating.avgGameRating}/10).
                  </p>
                )}
              </div>
            ) : (
              <EmptyTeaser text="Tag a session's mood (🔥👍😐💪) to unlock this." />
            )}
          </div>

          {/* Vibe */}
          <div className="p-4 bg-white/[0.03] border border-white/5 rounded-xl space-y-3">
            <div className="text-[11px] font-medium text-white/40 uppercase tracking-wide">Vibe</div>
            {vibe.hasData ? (
              <div className="space-y-2.5">
                {vibe.breakdown.map(v => (
                  <BreakdownBar
                    key={v.vibe}
                    emoji={v.emoji}
                    label={v.label}
                    percent={v.percent}
                    valueLabel={`${v.hours}h`}
                    barColor={VIBE_COLORS[v.vibe].barColor}
                    textColor={VIBE_COLORS[v.vibe].textColor}
                  />
                ))}
                <p className="text-[11px] text-white/35 pt-1">{vibe.insight}</p>
              </div>
            ) : (
              <EmptyTeaser text="Tag a session's vibe (🌙⚔️🗺️📖🏆👥) to unlock this." />
            )}
          </div>

          {/* Social */}
          <div className="p-4 bg-white/[0.03] border border-white/5 rounded-xl space-y-3">
            <div className="text-[11px] font-medium text-white/40 uppercase tracking-wide">Who You Play With</div>
            {social.hasData ? (
              <div className="space-y-2.5">
                {social.breakdown.map(s => (
                  <BreakdownBar
                    key={s.context}
                    emoji={s.emoji}
                    label={s.label}
                    percent={s.percent}
                    valueLabel={`${s.hours}h`}
                    barColor={SOCIAL_COLORS[s.context].barColor}
                    textColor={SOCIAL_COLORS[s.context].textColor}
                  />
                ))}
                <p className="text-[11px] text-white/35 pt-1">{social.insight}</p>
              </div>
            ) : (
              <EmptyTeaser text="Tag who you played with to unlock this." />
            )}
          </div>
        </div>
      )}

      {anyTagged && !allEmpty && (
        <p className="text-[11px] text-white/25 text-center">
          Based on tagged sessions only — keep tagging in Log Time for a fuller picture.
        </p>
      )}
    </div>
  );
}
