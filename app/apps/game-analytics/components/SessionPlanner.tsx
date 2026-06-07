'use client';

import { useState, useMemo } from 'react';
import { X, Clock, ChevronRight, Sparkles, Zap } from 'lucide-react';
import { Game } from '../lib/types';
import {
  getSessionPlannerPicks,
  PlannerMood,
  SessionPlannerPick,
} from '../lib/calculations';
import clsx from 'clsx';

interface SessionPlannerProps {
  games: Game[];
  onClose: () => void;
  onSelectGame: (game: Game) => void;
}

const TIME_OPTIONS: { minutes: number; label: string }[] = [
  { minutes: 30, label: '30m' },
  { minutes: 60, label: '1h' },
  { minutes: 90, label: '90m' },
  { minutes: 120, label: '2h' },
  { minutes: 180, label: '3h' },
  { minutes: 240, label: '4h+' },
];

const MOOD_OPTIONS: {
  value: PlannerMood;
  label: string;
  emoji: string;
  hint: string;
}[] = [
  { value: 'chill',     label: 'Chill',     emoji: '😌', hint: 'Low stress' },
  { value: 'adventure', label: 'Adventure', emoji: '🗺️', hint: 'Explore' },
  { value: 'story',     label: 'Story',     emoji: '📖', hint: 'Narrative' },
  { value: 'quick',     label: 'Quick hit', emoji: '⚡', hint: 'Short burst' },
  { value: 'marathon',  label: 'Marathon',  emoji: '🏃', hint: 'Deep dive' },
];

const VALUE_COLORS: Record<string, string> = {
  Excellent: 'text-emerald-400',
  Good:      'text-blue-400',
  Fair:      'text-yellow-400',
  Poor:      'text-red-400',
};

function PickCard({
  pick,
  availableMinutes,
  onSelect,
}: {
  pick: SessionPlannerPick;
  availableMinutes: number;
  onSelect: () => void;
}) {
  const timeLabel =
    availableMinutes >= 60
      ? `${availableMinutes / 60}h`
      : `${availableMinutes}m`;

  return (
    <button
      onClick={onSelect}
      className={clsx(
        'w-full text-left rounded-xl border transition-all group',
        'hover:border-white/20 active:scale-[0.99]',
        pick.urgencyTier === 'high'
          ? 'border-amber-500/30 bg-amber-500/[0.04]'
          : 'border-white/8 bg-white/[0.02]'
      )}
    >
      <div className="flex items-start gap-3 p-3">
        {/* Thumbnail */}
        {pick.game.thumbnail ? (
          <img
            src={pick.game.thumbnail}
            alt=""
            className="w-12 h-12 rounded-lg object-cover shrink-0"
          />
        ) : (
          <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center shrink-0 text-xl">
            🎮
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-1">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white/90 truncate leading-tight">
                {pick.game.name}
              </p>
              <p className="text-[11px] text-white/40 mt-0.5 leading-snug">
                {pick.headline}
              </p>
            </div>
            <ChevronRight
              size={14}
              className="text-white/20 group-hover:text-white/50 transition-colors shrink-0 mt-0.5"
            />
          </div>

          {/* Value projection */}
          {pick.projectedCostPerHour !== null && pick.projectedValueRating && (
            <div className="mt-1.5 flex items-center gap-1.5">
              <span className="text-[10px] text-white/25">After {timeLabel}:</span>
              <span
                className={clsx(
                  'text-[10px] font-semibold',
                  VALUE_COLORS[pick.projectedValueRating] ?? 'text-white/50'
                )}
              >
                ${pick.projectedCostPerHour.toFixed(2)}/hr · {pick.projectedValueRating}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Reason tags */}
      {pick.reasons.length > 0 && (
        <div className="px-3 pb-3 flex flex-wrap gap-1.5">
          {pick.reasons.map((r, i) => (
            <span
              key={i}
              className={clsx(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px]',
                pick.urgencyTier === 'high' && r.emoji === '⚠️'
                  ? 'bg-amber-500/12 text-amber-400 border border-amber-500/20'
                  : 'bg-white/5 text-white/45'
              )}
            >
              <span>{r.emoji}</span>
              <span>{r.text}</span>
            </span>
          ))}
        </div>
      )}
    </button>
  );
}

export function SessionPlanner({ games, onClose, onSelectGame }: SessionPlannerProps) {
  const [selectedMinutes, setSelectedMinutes] = useState(120);
  const [selectedMoods, setSelectedMoods] = useState<PlannerMood[]>([]);

  const picks = useMemo(
    () => getSessionPlannerPicks(games, selectedMinutes, selectedMoods),
    [games, selectedMinutes, selectedMoods]
  );

  const playableCount = games.filter(
    g => g.status === 'Not Started' || g.status === 'In Progress'
  ).length;

  function toggleMood(mood: PlannerMood) {
    setSelectedMoods(prev =>
      prev.includes(mood) ? prev.filter(m => m !== mood) : [...prev, mood]
    );
  }

  return (
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#12121a] border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-500/15 flex items-center justify-center">
              <Sparkles size={15} className="text-purple-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Tonight's Plan</h2>
              <p className="text-[11px] text-white/35">
                {playableCount} game{playableCount !== 1 ? 's' : ''} in your library
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/35 hover:text-white/70 transition-colors rounded-lg hover:bg-white/5"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-5">
          {/* Time selector */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Clock size={13} className="text-white/35" />
              <span className="text-xs font-medium text-white/50 uppercase tracking-wide">
                Time available
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {TIME_OPTIONS.map(opt => (
                <button
                  key={opt.minutes}
                  onClick={() => setSelectedMinutes(opt.minutes)}
                  className={clsx(
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                    selectedMinutes === opt.minutes
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                      : 'bg-white/5 text-white/40 border border-transparent hover:bg-white/8 hover:text-white/60'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Mood selector */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Zap size={13} className="text-white/35" />
              <span className="text-xs font-medium text-white/50 uppercase tracking-wide">
                Vibe
                <span className="ml-1 text-white/25 normal-case font-normal">
                  (optional)
                </span>
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {MOOD_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => toggleMood(opt.value)}
                  className={clsx(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                    selectedMoods.includes(opt.value)
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                      : 'bg-white/5 text-white/40 border border-transparent hover:bg-white/8 hover:text-white/60'
                  )}
                >
                  <span>{opt.emoji}</span>
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Picks */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-medium text-white/50 uppercase tracking-wide">
                Top Picks
              </span>
              <span className="text-[10px] text-white/20">
                Tap to open
              </span>
            </div>

            {picks.length === 0 ? (
              <div className="rounded-xl border border-white/8 bg-white/[0.02] p-6 text-center">
                <p className="text-sm text-white/40">No playable games found</p>
                <p className="text-xs text-white/25 mt-1">
                  Add some games to your library first
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {picks.map((pick, i) => (
                  <div key={pick.game.id} className="relative">
                    {i === 0 && (
                      <div className="absolute -top-1 -right-1 z-10">
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/20">
                          Best Pick
                        </span>
                      </div>
                    )}
                    <PickCard
                      pick={pick}
                      availableMinutes={selectedMinutes}
                      onSelect={() => onSelectGame(pick.game)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
