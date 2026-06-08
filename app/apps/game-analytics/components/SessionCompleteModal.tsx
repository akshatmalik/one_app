'use client';
import { useState } from 'react';
import { Check, X, Clock } from 'lucide-react';
import { SessionMood } from '../lib/types';
import clsx from 'clsx';

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  if (m > 0) return `${m}m ${s > 0 ? ` ${s}s` : ''}`.trim();
  return `${s}s`;
}

function secondsToHours(seconds: number): number {
  // Round to nearest 0.1h, minimum 0.1
  return Math.max(0.1, Math.round(seconds / 360) / 10);
}

interface SessionCompleteModalProps {
  gameName: string;
  thumbnail?: string;
  elapsedSeconds: number;
  onLog: (hours: number, mood?: SessionMood) => void;
  onDiscard: () => void;
}

export function SessionCompleteModal({ gameName, thumbnail, elapsedSeconds, onLog, onDiscard }: SessionCompleteModalProps) {
  const [mood, setMood] = useState<SessionMood | undefined>();
  const hours = secondsToHours(elapsedSeconds);

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onDiscard} />

      {/* Modal */}
      <div className="relative w-full max-w-sm bg-[#13131a] border border-white/10 rounded-2xl p-5 shadow-2xl">

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          {thumbnail ? (
            <img src={thumbnail} alt="" className="w-12 h-12 rounded-xl object-cover border border-white/10 flex-shrink-0" />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-blue-900/20 flex items-center justify-center flex-shrink-0 border border-blue-800/20">
              <Clock size={20} className="text-blue-400/40" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-white/40 text-xs">Session complete</p>
            <h3 className="text-white font-bold text-base truncate">{gameName}</h3>
          </div>
          <button onClick={onDiscard} className="text-white/20 hover:text-white/50 transition-colors flex-shrink-0">
            <X size={18} />
          </button>
        </div>

        {/* Time display */}
        <div className="text-center py-5 mb-4 bg-blue-500/5 rounded-2xl border border-blue-500/10">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Clock size={13} className="text-blue-400/50" />
            <span className="text-[10px] text-blue-400/50 uppercase tracking-wider font-bold">Time Played</span>
          </div>
          <div className="text-4xl font-black text-blue-300 tracking-tight">{formatElapsed(elapsedSeconds)}</div>
          <div className="text-xs text-white/25 mt-2">{hours}h will be logged</div>
        </div>

        {/* Mood picker */}
        <p className="text-[10px] text-white/30 uppercase tracking-wider font-bold mb-2 px-1">How was it?</p>
        <div className="flex gap-2 mb-5">
          {([
            { value: 'great' as SessionMood, emoji: '🔥', name: 'Great' },
            { value: 'good'  as SessionMood, emoji: '👍', name: 'Good' },
            { value: 'meh'   as SessionMood, emoji: '😐', name: 'Meh' },
            { value: 'grind' as SessionMood, emoji: '💪', name: 'Grind' },
          ]).map(opt => (
            <button
              key={opt.value}
              onClick={() => setMood(mood === opt.value ? undefined : opt.value)}
              className={clsx(
                'flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl text-xs transition-all',
                mood === opt.value
                  ? 'bg-purple-500/15 border border-purple-500/25 text-purple-300'
                  : 'bg-white/[0.02] border border-transparent text-white/30 hover:bg-white/[0.04]',
              )}
            >
              <span className="text-xl">{opt.emoji}</span>
              <span className="text-[9px]">{opt.name}</span>
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => onLog(hours, mood)}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600/25 text-blue-300 text-sm font-bold border border-blue-500/20 active:bg-blue-600/45 transition-all"
          >
            <Check size={15} />
            Log {hours}h
          </button>
          <button
            onClick={onDiscard}
            className="px-4 py-3 rounded-xl bg-white/[0.03] text-white/30 text-sm transition-all active:bg-white/[0.06] border border-white/5"
          >
            Discard
          </button>
        </div>
      </div>
    </div>
  );
}
