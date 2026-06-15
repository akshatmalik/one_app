'use client';

import { useState } from 'react';
import { Check, Clock } from 'lucide-react';
import { SessionMood } from '../lib/types';
import clsx from 'clsx';

interface EndSessionModalProps {
  gameName: string;
  gameThumbnail?: string;
  /** Raw elapsed seconds from the timer */
  elapsedSeconds: number;
  onSave: (hours: number, mood?: SessionMood) => void;
  onCancel: () => void;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0 && m === 0) return '<1m';
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function secondsToHours(seconds: number): number {
  // Round to nearest 0.1h
  return Math.round(seconds / 360) / 10;
}

const MOOD_OPTIONS: { value: SessionMood; emoji: string; label: string }[] = [
  { value: 'great', emoji: '🔥', label: 'Great' },
  { value: 'good', emoji: '👍', label: 'Good' },
  { value: 'meh', emoji: '😐', label: 'Meh' },
  { value: 'grind', emoji: '💪', label: 'Grind' },
];

export function EndSessionModal({
  gameName,
  gameThumbnail,
  elapsedSeconds,
  onSave,
  onCancel,
}: EndSessionModalProps) {
  const timerHours = Math.max(0.1, secondsToHours(elapsedSeconds));
  const [hours, setHours] = useState(timerHours);
  const [mood, setMood] = useState<SessionMood | undefined>();

  const sliderMax = Math.max(12, timerHours + 1);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-lg bg-[#0f0f17] border-t border-x border-white/10 rounded-t-2xl p-5 pb-8 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3">
          {gameThumbnail ? (
            <img
              src={gameThumbnail}
              alt=""
              className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
              <Clock size={20} className="text-white/30" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs text-emerald-400 font-semibold mb-0.5">Session complete</p>
            <p className="text-base font-bold text-white/90 truncate">{gameName}</p>
          </div>
          {/* Timer badge */}
          <div className="text-right flex-shrink-0">
            <span className="text-2xl font-black text-emerald-300 font-mono tabular-nums block">
              {formatDuration(elapsedSeconds)}
            </span>
            <span className="text-[10px] text-white/30">timed</span>
          </div>
        </div>

        <div className="h-px bg-white/5" />

        {/* Hours adjuster */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-white/40">Adjust hours logged</span>
            <span className="text-white/70 font-mono font-bold">{hours}h</span>
          </div>
          <input
            type="range"
            min="0.1"
            max={sliderMax}
            step="0.1"
            value={hours}
            onChange={(e) => setHours(parseFloat(e.target.value))}
            className="w-full accent-emerald-500"
          />
          <div className="flex justify-between text-[10px] text-white/20 mt-0.5">
            <span>0.1h</span>
            <span className="text-emerald-500/50">timer: {timerHours}h</span>
            <span>{sliderMax}h</span>
          </div>
        </div>

        {/* Mood */}
        <div>
          <p className="text-xs text-white/40 mb-2">
            How was it? <span className="text-white/20">(optional)</span>
          </p>
          <div className="flex gap-2">
            {MOOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setMood(mood === opt.value ? undefined : opt.value)}
                className={clsx(
                  'flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl text-xs transition-all border',
                  mood === opt.value
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                    : 'bg-white/[0.03] text-white/30 border-white/5 active:bg-white/5'
                )}
              >
                <span className="text-lg">{opt.emoji}</span>
                <span className="text-[9px] font-medium">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-3 rounded-xl bg-white/5 text-white/40 text-sm font-medium flex-shrink-0 active:bg-white/10 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(hours, mood)}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500/20 text-emerald-300 text-sm font-bold active:bg-emerald-500/30 transition-colors"
          >
            <Check size={16} />
            Log {hours}h
          </button>
        </div>
      </div>
    </div>
  );
}
