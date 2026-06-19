'use client';

import { useState } from 'react';
import { Play, Pause, Square, X, Gamepad2, Check } from 'lucide-react';
import clsx from 'clsx';
import { SessionMood } from '../lib/types';
import { formatClock } from '../lib/format';

interface LiveSessionBarProps {
  gameName: string;
  thumbnail?: string;
  elapsedMs: number;
  isPaused: boolean;
  onPause: () => void;
  onResume: () => void;
  onStopAndLog: (hours: number, mood?: SessionMood) => void;
  onDiscard: () => void;
}

const MOOD_OPTIONS: { value: SessionMood; label: string; name: string }[] = [
  { value: 'great', label: '🔥', name: 'Great' },
  { value: 'good', label: '👍', name: 'Good' },
  { value: 'meh', label: '😐', name: 'Meh' },
  { value: 'grind', label: '💪', name: 'Grind' },
];

export function LiveSessionBar({
  gameName,
  thumbnail,
  elapsedMs,
  isPaused,
  onPause,
  onResume,
  onStopAndLog,
  onDiscard,
}: LiveSessionBarProps) {
  const [expanded, setExpanded] = useState(false);
  const [mood, setMood] = useState<SessionMood | undefined>();
  const [hours, setHours] = useState(0);

  const liveHours = Math.round((elapsedMs / 3_600_000) * 10) / 10;

  const handleStop = () => {
    setHours(liveHours);
    setExpanded(true);
  };

  const handleConfirmStop = () => {
    onStopAndLog(Math.max(0.1, hours), mood);
  };

  return (
    <div className="fixed bottom-3 inset-x-3 sm:bottom-4 sm:inset-x-auto sm:right-4 sm:w-80 z-50">
      <div className="rounded-2xl border border-purple-500/30 bg-[#15121f]/95 backdrop-blur-md shadow-2xl shadow-purple-900/30 overflow-hidden transition-all duration-200">
        {!expanded ? (
          <div className="flex items-center gap-3 p-3">
            {thumbnail ? (
              <img src={thumbnail} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                <Gamepad2 size={18} className="text-purple-300" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-wide text-purple-300/70 font-semibold flex items-center gap-1">
                <span className={clsx('w-1.5 h-1.5 rounded-full', isPaused ? 'bg-white/30' : 'bg-emerald-400 animate-pulse')} />
                {isPaused ? 'Paused' : 'Now Playing'}
              </p>
              <p className="text-sm font-bold text-white/90 truncate">{gameName}</p>
            </div>
            <p className="text-lg font-mono font-bold text-white/90 tabular-nums">{formatClock(elapsedMs)}</p>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={isPaused ? onResume : onPause}
                className="p-2 rounded-lg bg-white/5 text-white/70 active:bg-white/10 transition-colors"
                title={isPaused ? 'Resume' : 'Pause'}
              >
                {isPaused ? <Play size={16} /> : <Pause size={16} />}
              </button>
              <button
                onClick={handleStop}
                className="p-2 rounded-lg bg-purple-500/20 text-purple-300 active:bg-purple-500/30 transition-colors"
                title="Stop & log"
              >
                <Square size={16} />
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-white/90">Stop & Log Session</p>
              <button
                onClick={() => setExpanded(false)}
                className="p-1 rounded-lg text-white/40 active:bg-white/10 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <p className="text-xs text-white/40 mb-3 truncate">{gameName}</p>

            <div className="mb-4">
              <div className="flex items-center justify-between text-xs text-white/30 mb-1">
                <span>Hours played</span>
                <span className="text-white/70 font-semibold">{hours}h</span>
              </div>
              <input
                type="range"
                min="0.1"
                max={Math.max(12, Math.ceil(liveHours))}
                step="0.1"
                value={hours}
                onChange={(e) => setHours(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            <div className="flex gap-2 mb-4">
              {MOOD_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setMood(mood === opt.value ? undefined : opt.value)}
                  className={clsx(
                    'flex-1 flex flex-col items-center gap-0.5 py-2 rounded-lg text-xs transition-colors',
                    mood === opt.value
                      ? 'bg-purple-500/15 text-purple-400 border border-purple-500/20'
                      : 'bg-white/[0.02] text-white/30 border border-transparent'
                  )}
                >
                  <span className="text-base">{opt.label}</span>
                  <span className="text-[9px]">{opt.name}</span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleConfirmStop}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold bg-purple-600/30 text-purple-300 active:bg-purple-600/50 transition-colors"
              >
                <Check size={16} /> Save {hours}h
              </button>
              <button
                onClick={onDiscard}
                className="p-3 rounded-xl bg-white/5 text-white/30 active:bg-white/10 transition-colors"
                title="Discard session"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
