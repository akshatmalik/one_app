'use client';

import { Play, Pause, X, Timer } from 'lucide-react';
import { ActiveTimer } from '../hooks/useSessionTimer';
import clsx from 'clsx';

interface SessionTimerBannerProps {
  timer: ActiveTimer;
  formattedTime: string;
  elapsedHours: number;
  isRunning: boolean;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onDiscard: () => void;
}

export function SessionTimerBanner({
  timer,
  formattedTime,
  elapsedHours,
  isRunning,
  onPause,
  onResume,
  onStop,
  onDiscard,
}: SessionTimerBannerProps) {
  const hoursLabel = elapsedHours >= 1
    ? `${elapsedHours.toFixed(1)}h`
    : `${Math.round(elapsedHours * 60)}m`;

  return (
    <div
      className={clsx(
        'flex items-center gap-3 px-4 py-3 rounded-xl border mb-4 transition-all duration-300',
        isRunning
          ? 'bg-emerald-500/10 border-emerald-500/25'
          : 'bg-white/[0.03] border-white/10',
      )}
    >
      {/* Thumbnail */}
      <div className="shrink-0">
        {timer.thumbnail ? (
          <img
            src={timer.thumbnail}
            alt=""
            className="w-10 h-10 rounded-lg object-cover opacity-80"
          />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
            <Timer size={18} className="text-white/40" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          {isRunning ? (
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          ) : (
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-white/20 shrink-0" />
          )}
          <p className="text-[11px] text-white/50 truncate">{timer.gameName}</p>
        </div>
        <p
          className={clsx(
            'text-2xl font-mono font-bold tracking-wider leading-none',
            isRunning ? 'text-emerald-400' : 'text-white/40',
          )}
        >
          {formattedTime}
        </p>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Pause / Resume */}
        {isRunning ? (
          <button
            onClick={onPause}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/70 transition-all"
            title="Pause timer"
          >
            <Pause size={14} />
          </button>
        ) : (
          <button
            onClick={onResume}
            className="p-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-all"
            title="Resume timer"
          >
            <Play size={14} />
          </button>
        )}

        {/* Stop & Log */}
        <button
          onClick={onStop}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 text-xs font-semibold transition-all"
          title={`Stop and log ${hoursLabel}`}
        >
          Stop &amp; Log
          <span className="text-emerald-300/70 font-normal">{hoursLabel}</span>
        </button>

        {/* Discard */}
        <button
          onClick={onDiscard}
          className="p-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.06] text-white/25 hover:text-white/50 transition-all"
          title="Discard session"
        >
          <X size={12} />
        </button>
      </div>
    </div>
  );
}
