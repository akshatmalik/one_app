'use client';

import { StopCircle, Timer, X } from 'lucide-react';

interface ActiveSessionBannerProps {
  gameName: string;
  gameThumbnail?: string;
  elapsedSeconds: number;
  onEnd: () => void;
  onCancel: () => void;
}

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function ActiveSessionBanner({
  gameName,
  gameThumbnail,
  elapsedSeconds,
  onEnd,
  onCancel,
}: ActiveSessionBannerProps) {
  return (
    <div className="flex items-center gap-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2.5 mb-3 select-none">
      {/* Pulsing live dot */}
      <span className="relative flex-shrink-0 w-2 h-2">
        <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-40" />
        <span className="relative w-2 h-2 rounded-full bg-emerald-500 block" />
      </span>

      {/* Thumbnail or icon */}
      {gameThumbnail ? (
        <img
          src={gameThumbnail}
          alt=""
          className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
        />
      ) : (
        <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
          <Timer size={14} className="text-white/50" />
        </div>
      )}

      {/* Game name */}
      <div className="flex-1 min-w-0">
        <p className="text-[9px] text-emerald-400/70 font-semibold uppercase tracking-wider leading-none mb-0.5">
          Live Session
        </p>
        <p className="text-sm font-semibold text-white/90 truncate leading-tight">{gameName}</p>
      </div>

      {/* Elapsed time */}
      <span className="font-mono text-lg font-black text-emerald-300 flex-shrink-0 tabular-nums">
        {formatElapsed(elapsedSeconds)}
      </span>

      {/* End session */}
      <button
        onClick={onEnd}
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-bold flex-shrink-0 active:bg-emerald-500/35 transition-colors"
      >
        <StopCircle size={13} />
        End
      </button>

      {/* Cancel (discard timer, don't log) */}
      <button
        onClick={onCancel}
        title="Cancel session without logging"
        className="w-6 h-6 flex items-center justify-center rounded-md text-white/20 active:text-white/50 flex-shrink-0 transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  );
}
