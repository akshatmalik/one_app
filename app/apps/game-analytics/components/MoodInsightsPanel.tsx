'use client';

import { useMemo } from 'react';
import { Smile, Flame, Clock3 } from 'lucide-react';
import { Game } from '../lib/types';
import { getMoodAnalysis } from '../lib/calculations';

interface MoodInsightsPanelProps {
  games: Game[];
}

const MOOD_META: Record<string, { emoji: string; label: string; color: string; bar: string }> = {
  great: { emoji: '🔥', label: 'Great', color: '#34d399', bar: 'bg-emerald-400' },
  good: { emoji: '👍', label: 'Good', color: '#60a5fa', bar: 'bg-blue-400' },
  meh: { emoji: '😐', label: 'Meh', color: '#fbbf24', bar: 'bg-yellow-400' },
  grind: { emoji: '💪', label: 'Grind', color: '#fb923c', bar: 'bg-orange-400' },
};

export function MoodInsightsPanel({ games }: MoodInsightsPanelProps) {
  const analysis = useMemo(() => getMoodAnalysis(games), [games]);

  if (analysis.totalTaggedSessions === 0) {
    return (
      <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl">
        <h4 className="text-sm font-medium text-white/70 flex items-center gap-2 mb-1">
          <Smile size={14} className="text-pink-400" />
          Session Vibe Check
        </h4>
        <div className="text-xs text-white/30">
          Tag a play session with a mood (great / good / meh / grind) via Quick Check-In or the play log to unlock this panel.
        </div>
      </div>
    );
  }

  const taggedPercent = analysis.totalSessions > 0
    ? Math.round((analysis.totalTaggedSessions / analysis.totalSessions) * 100)
    : 0;

  return (
    <div className="p-4 bg-gradient-to-br from-pink-500/10 to-purple-500/10 border border-pink-500/20 rounded-xl">
      <h4 className="text-sm font-medium text-white/70 flex items-center gap-2 mb-3">
        <Smile size={14} className="text-pink-400" />
        Session Vibe Check
      </h4>

      <div className="space-y-1.5 mb-3">
        {analysis.moodDistribution.map(entry => {
          const meta = MOOD_META[entry.mood];
          return (
            <div key={entry.mood} className="flex items-center gap-2">
              <div className="w-14 text-xs text-white/60 flex items-center gap-1 shrink-0">
                <span>{meta.emoji}</span>
                {meta.label}
              </div>
              <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                <div
                  className={`h-full ${meta.bar} rounded-full`}
                  style={{ width: `${entry.percent}%` }}
                />
              </div>
              <div className="w-20 text-right text-[10px] text-white/40 shrink-0">
                {entry.percent}% · {entry.avgHours}h avg
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-[10px] text-white/30 mb-3">
        {analysis.totalTaggedSessions} of {analysis.totalSessions} sessions tagged ({taggedPercent}%)
      </div>

      {analysis.bestMoodForRating && (
        <div className="flex items-center gap-2 p-2 bg-white/[0.03] rounded-lg mb-2">
          <Flame size={12} className="text-pink-400 shrink-0" />
          <div className="text-xs text-white/60">
            Sessions tagged{' '}
            <span style={{ color: MOOD_META[analysis.bestMoodForRating.mood].color }}>
              {MOOD_META[analysis.bestMoodForRating.mood].emoji} {MOOD_META[analysis.bestMoodForRating.mood].label}
            </span>{' '}
            skew toward your highest-rated games — avg rating {analysis.bestMoodForRating.avgGameRating}/10.
          </div>
        </div>
      )}

      {analysis.longestSessionMood && (
        <div className="flex items-center gap-2 p-2 bg-white/[0.03] rounded-lg">
          <Clock3 size={12} className="text-pink-400 shrink-0" />
          <div className="text-xs text-white/60">
            Longest tagged session: <span className="text-white/80">{analysis.longestSessionMood.hours}h</span> on{' '}
            <span className="text-white/80">{analysis.longestSessionMood.game}</span>, feeling{' '}
            <span style={{ color: MOOD_META[analysis.longestSessionMood.mood].color }}>
              {MOOD_META[analysis.longestSessionMood.mood].emoji} {MOOD_META[analysis.longestSessionMood.mood].label}
            </span>
            .
          </div>
        </div>
      )}
    </div>
  );
}
