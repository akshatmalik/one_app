'use client';
import { Gamepad2, Square, X } from 'lucide-react';
import { LiveSession } from '../hooks/useLiveSession';

function formatTimer(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

interface LiveSessionBannerProps {
  session: LiveSession;
  elapsedSeconds: number;
  onStop: () => void;
  onCancel: () => void;
}

export function LiveSessionBanner({ session, elapsedSeconds, onStop, onCancel }: LiveSessionBannerProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-3 pb-3 pointer-events-none">
      <div className="max-w-6xl mx-auto pointer-events-auto">
        <div className="flex items-center gap-3 px-4 py-3 bg-[#0d0d1a]/95 backdrop-blur-xl border border-blue-500/30 rounded-2xl shadow-2xl shadow-blue-900/30">

          {/* Live pulse indicator */}
          <div className="relative flex-shrink-0">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping opacity-50" />
          </div>

          {/* Game thumbnail */}
          {session.thumbnail ? (
            <img
              src={session.thumbnail}
              alt=""
              className="w-9 h-9 rounded-lg object-cover flex-shrink-0 border border-white/10"
            />
          ) : (
            <div className="w-9 h-9 rounded-lg bg-blue-900/30 flex items-center justify-center flex-shrink-0 border border-blue-800/30">
              <Gamepad2 size={16} className="text-blue-400/60" />
            </div>
          )}

          {/* Game name */}
          <div className="flex-1 min-w-0">
            <div className="text-[9px] text-blue-400/50 font-bold uppercase tracking-widest leading-none mb-0.5">Live Session</div>
            <div className="text-sm font-bold text-white/90 truncate leading-tight">{session.gameName}</div>
          </div>

          {/* Timer — the star of the show */}
          <div
            className="font-mono font-black tabular-nums text-blue-300 flex-shrink-0"
            style={{ fontSize: '1.3rem', letterSpacing: '-0.02em' }}
          >
            {formatTimer(elapsedSeconds)}
          </div>

          {/* Stop button — logs the session */}
          <button
            onClick={onStop}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600/20 hover:bg-blue-600/35 active:bg-blue-600/50 border border-blue-500/30 text-blue-300 rounded-xl text-xs font-bold transition-all flex-shrink-0"
          >
            <Square size={10} fill="currentColor" />
            Stop
          </button>

          {/* Cancel — discards without logging */}
          <button
            onClick={onCancel}
            title="Cancel session without logging"
            className="w-7 h-7 flex items-center justify-center text-white/20 hover:text-white/50 transition-colors flex-shrink-0"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
