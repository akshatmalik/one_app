'use client';

import { useState } from 'react';
import { Pause, Play, Square, X, Timer } from 'lucide-react';
import { ActiveSession } from '../hooks/useActiveSession';
import clsx from 'clsx';

interface SessionTimerBannerProps {
  session: ActiveSession;
  elapsedSeconds: number;
  elapsedHours: number;
  isPaused: boolean;
  onPause: () => void;
  onResume: () => void;
  onStop: (hours: number) => void;
  onDiscard: () => void;
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatHoursLabel(seconds: number): string {
  const h = seconds / 3600;
  if (h < 1) return `${Math.round(h * 60)}m`;
  return `${h.toFixed(1)}h`;
}

export function SessionTimerBanner({
  session,
  elapsedSeconds,
  elapsedHours,
  isPaused,
  onPause,
  onResume,
  onStop,
  onDiscard,
}: SessionTimerBannerProps) {
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const handleStop = () => {
    onStop(elapsedHours);
  };

  const handleDiscard = () => {
    if (confirmDiscard) {
      onDiscard();
      setConfirmDiscard(false);
    } else {
      setConfirmDiscard(true);
      // Auto-cancel the confirmation after 3s
      setTimeout(() => setConfirmDiscard(false), 3000);
    }
  };

  return (
    <div
      className={clsx(
        'fixed bottom-0 left-0 right-0 z-50 safe-area-pb',
        'bg-[#0e0e1a]/95 backdrop-blur-md border-t',
        isPaused ? 'border-yellow-500/30' : 'border-blue-500/25',
      )}
    >
      <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
        {/* Pulse indicator */}
        <div className="shrink-0 relative flex items-center justify-center w-8 h-8">
          {!isPaused && (
            <div className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping" />
          )}
          <div
            className={clsx(
              'w-5 h-5 rounded-full flex items-center justify-center',
              isPaused ? 'bg-yellow-500/20' : 'bg-blue-500/15',
            )}
          >
            <Timer size={10} className={isPaused ? 'text-yellow-400' : 'text-blue-400'} />
          </div>
        </div>

        {/* Game info */}
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          {session.thumbnail && (
            <img
              src={session.thumbnail}
              alt=""
              className="w-8 h-8 rounded-md object-cover shrink-0 border border-white/10"
            />
          )}
          <div className="min-w-0">
            <p className="text-xs text-white/40 leading-none mb-0.5">
              {isPaused ? 'Session paused' : 'Session in progress'}
            </p>
            <p className="text-sm font-semibold text-white/90 truncate leading-tight">{session.gameName}</p>
          </div>
        </div>

        {/* Timer display */}
        <div className="shrink-0 text-right">
          <div
            className={clsx(
              'text-xl font-black tabular-nums leading-none',
              isPaused ? 'text-yellow-400/80' : 'text-blue-300',
            )}
          >
            {formatTime(elapsedSeconds)}
          </div>
          <div className="text-[10px] text-white/30 mt-0.5 text-right">
            {formatHoursLabel(elapsedSeconds)}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Pause / Resume */}
          <button
            onClick={isPaused ? onResume : onPause}
            className={clsx(
              'w-9 h-9 rounded-xl flex items-center justify-center transition-all',
              isPaused
                ? 'bg-yellow-500/15 text-yellow-400 active:bg-yellow-500/30'
                : 'bg-white/8 text-white/50 active:bg-white/15',
            )}
            title={isPaused ? 'Resume' : 'Pause'}
          >
            {isPaused ? <Play size={14} fill="currentColor" /> : <Pause size={14} />}
          </button>

          {/* Stop & Log */}
          <button
            onClick={handleStop}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600/25 text-blue-300 active:bg-blue-600/40 text-xs font-bold transition-all border border-blue-500/20"
            title="Stop and log session"
          >
            <Square size={11} fill="currentColor" />
            <span className="hidden sm:inline">Stop &amp; Log</span>
            <span className="sm:hidden">Save</span>
          </button>

          {/* Discard */}
          <button
            onClick={handleDiscard}
            className={clsx(
              'w-9 h-9 rounded-xl flex items-center justify-center transition-all text-xs font-bold',
              confirmDiscard
                ? 'bg-red-500/20 text-red-400 active:bg-red-500/40 border border-red-500/30'
                : 'bg-white/5 text-white/25 active:bg-white/10',
            )}
            title={confirmDiscard ? 'Tap again to discard' : 'Discard session'}
          >
            {confirmDiscard ? '!' : <X size={12} />}
          </button>
        </div>
      </div>
    </div>
  );
}
