'use client';

import { useState, useEffect } from 'react';
import { Square, X } from 'lucide-react';

interface LiveSessionTimerProps {
  gameName: string;
  thumbnail?: string;
  startTime: number; // Date.now() ms
  onStop: (hours: number) => void;
  onAbandon: () => void;
}

function formatElapsed(ms: number): string {
  const totalSecs = Math.floor(ms / 1000);
  const hrs = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;
  if (hrs > 0) return `${hrs}h ${String(mins).padStart(2, '0')}m`;
  if (mins > 0) return `${mins}m ${String(secs).padStart(2, '0')}s`;
  return `0m ${String(secs).padStart(2, '0')}s`;
}

function msToHours(ms: number): number {
  const h = ms / (1000 * 3600);
  if (h < 0.1) return 0.1;
  // Round to nearest 0.1, cap at 99
  return Math.min(99, Math.round(h * 10) / 10);
}

export function LiveSessionTimer({ gameName, thumbnail, startTime, onStop, onAbandon }: LiveSessionTimerProps) {
  const [elapsed, setElapsed] = useState(() => Date.now() - startTime);

  useEffect(() => {
    const id = setInterval(() => setElapsed(Date.now() - startTime), 1000);
    return () => clearInterval(id);
  }, [startTime]);

  const hours = msToHours(elapsed);

  const handleStop = () => onStop(hours);

  return (
    <div className="mb-4 rounded-xl border border-emerald-500/25 bg-emerald-500/5 overflow-hidden">
      <div className="flex items-center gap-3 px-3 py-2.5">
        {/* Pulsing live dot */}
        <div className="relative shrink-0 flex items-center justify-center w-4 h-4">
          <span className="absolute inline-flex w-3 h-3 rounded-full bg-emerald-500/30 animate-ping" />
          <span className="relative inline-flex w-2 h-2 rounded-full bg-emerald-400" />
        </div>

        {/* Game identity */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {thumbnail ? (
            <img
              src={thumbnail}
              alt=""
              className="w-7 h-7 rounded-md object-cover shrink-0 ring-1 ring-emerald-500/20"
            />
          ) : (
            <div className="w-7 h-7 rounded-md bg-emerald-500/10 shrink-0 flex items-center justify-center">
              <span className="text-emerald-400 text-[10px]">🎮</span>
            </div>
          )}
          <div className="min-w-0">
            <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-400/60">Live Session</p>
            <p className="text-sm font-semibold text-white/90 truncate leading-tight">{gameName}</p>
          </div>
        </div>

        {/* Elapsed time */}
        <div className="text-right shrink-0">
          <p className="text-base font-mono font-bold tabular-nums text-emerald-300 leading-none">{formatElapsed(elapsed)}</p>
          <p className="text-[9px] text-white/30 mt-0.5">≈ {hours}h to log</p>
        </div>

        {/* Stop & Log */}
        <button
          onClick={handleStop}
          className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold hover:bg-emerald-500/30 active:scale-95 transition-all"
        >
          <Square size={9} fill="currentColor" />
          Stop & Log
        </button>

        {/* Abandon */}
        <button
          onClick={onAbandon}
          title="Cancel without logging"
          className="shrink-0 text-white/20 hover:text-white/50 transition-colors ml-0.5"
        >
          <X size={13} />
        </button>
      </div>
    </div>
  );
}
