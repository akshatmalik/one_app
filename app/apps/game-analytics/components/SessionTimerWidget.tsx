'use client';

import { useState } from 'react';
import { Play, Pause, Square, X, Clock } from 'lucide-react';
import { SessionTimerState } from '../hooks/useSessionTimer';
import { SessionMood } from '../lib/types';
import clsx from 'clsx';

interface Props {
  timerState: SessionTimerState;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onClear: () => void;
  onLogSession: (params: { gameId: string; hours: number; mood?: SessionMood }) => void;
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatHours(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} min`;
  const h = seconds / 3600;
  return `${h.toFixed(1)}h`;
}

const MOODS: { value: SessionMood; label: string; emoji: string }[] = [
  { value: 'great', label: 'Great', emoji: '🔥' },
  { value: 'good', label: 'Good', emoji: '😊' },
  { value: 'meh', label: 'Meh', emoji: '😐' },
  { value: 'grind', label: 'Grind', emoji: '😤' },
];

export function SessionTimerWidget({ timerState, onPause, onResume, onStop, onClear, onLogSession }: Props) {
  const [selectedMood, setSelectedMood] = useState<SessionMood>('good');
  const { status, gameId, gameName, gameThumbnail, elapsedSeconds } = timerState;

  if (status === 'idle') return null;

  const timeDisplay = formatTime(elapsedSeconds);
  const hoursLabel = formatHours(elapsedSeconds);
  const hoursDecimal = elapsedSeconds / 3600;

  // ── Completed: show log prompt ──────────────────────────────
  if (status === 'completed') {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-[200] bg-slate-950 border-t border-purple-500/30 shadow-2xl shadow-black/60">
        <div className="max-w-lg mx-auto px-4 pt-3 pb-5">
          {/* Header */}
          <div className="flex items-center gap-3 mb-3">
            {gameThumbnail ? (
              <img src={gameThumbnail} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0 shadow-lg" />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-purple-600/20 flex items-center justify-center flex-shrink-0">
                <Clock size={20} className="text-purple-400" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-white/40 text-xs">Session complete</p>
              <p className="text-white font-semibold truncate leading-tight">{gameName}</p>
            </div>
            <div className="text-right">
              <p className="font-mono text-2xl font-bold text-purple-300 leading-none">{timeDisplay}</p>
              <p className="text-white/30 text-xs mt-0.5">{hoursLabel}</p>
            </div>
          </div>

          {/* Mood selector */}
          <p className="text-[10px] text-white/30 uppercase tracking-wider font-semibold mb-2">How was it?</p>
          <div className="grid grid-cols-4 gap-1.5 mb-3">
            {MOODS.map(m => (
              <button
                key={m.value}
                onClick={() => setSelectedMood(m.value)}
                className={clsx(
                  'py-2 rounded-xl text-xs font-medium transition-all',
                  selectedMood === m.value
                    ? 'bg-purple-600/40 border border-purple-500/60 text-white'
                    : 'bg-white/5 border border-white/0 text-white/40 active:bg-white/10'
                )}
              >
                <span className="block text-base leading-none mb-0.5">{m.emoji}</span>
                {m.label}
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={onClear}
              className="flex-1 py-2.5 text-white/35 text-sm rounded-xl border border-white/10 active:bg-white/5 transition-all"
            >
              Discard
            </button>
            <button
              onClick={() => {
                if (gameId) {
                  onLogSession({ gameId, hours: Math.max(1 / 60, hoursDecimal), mood: selectedMood });
                }
              }}
              className="py-2.5 bg-purple-600 active:bg-purple-700 text-white text-sm rounded-xl font-semibold px-6 transition-all flex items-center gap-1.5"
              style={{ flex: 2 }}
            >
              <span>Log {hoursLabel}</span>
              <span className="text-purple-200 text-base">✓</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Running / Paused: floating timer bar ────────────────────
  return (
    <div className="fixed bottom-0 left-0 right-0 z-[200] bg-slate-950/95 backdrop-blur-sm border-t border-white/8 shadow-2xl shadow-black/40">
      <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
        {/* Thumbnail with status dot */}
        <div className="relative flex-shrink-0">
          {gameThumbnail ? (
            <img src={gameThumbnail} alt="" className="w-10 h-10 rounded-lg object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-purple-600/20 flex items-center justify-center">
              <Clock size={16} className="text-purple-400" />
            </div>
          )}
          <div
            className={clsx(
              'absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-slate-950',
              status === 'running' ? 'bg-green-500 health-pulse-fast' : 'bg-yellow-500'
            )}
          />
        </div>

        {/* Game name + status label */}
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-white/35 uppercase tracking-wider leading-none mb-0.5">
            {status === 'running' ? '⏱ Session live' : '⏸ Paused'}
          </p>
          <p className="text-white font-medium text-sm truncate leading-tight">{gameName}</p>
        </div>

        {/* Elapsed time */}
        <div className="font-mono text-xl font-bold text-white tabular-nums mr-1">{timeDisplay}</div>

        {/* Pause / Resume */}
        {status === 'running' ? (
          <button
            onClick={onPause}
            className="w-8 h-8 rounded-lg bg-white/8 flex items-center justify-center text-white/50 active:bg-white/15 transition-all"
            aria-label="Pause session"
          >
            <Pause size={14} />
          </button>
        ) : (
          <button
            onClick={onResume}
            className="w-8 h-8 rounded-lg bg-green-500/15 flex items-center justify-center text-green-400 active:bg-green-500/25 transition-all"
            aria-label="Resume session"
          >
            <Play size={14} />
          </button>
        )}

        {/* Stop */}
        <button
          onClick={onStop}
          className="w-8 h-8 rounded-lg bg-purple-600/20 flex items-center justify-center text-purple-400 active:bg-purple-600/35 transition-all"
          aria-label="Stop and log"
        >
          <Square size={14} />
        </button>

        {/* Discard */}
        <button
          onClick={onClear}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-white/20 active:text-white/50 transition-all"
          aria-label="Discard timer"
        >
          <X size={12} />
        </button>
      </div>
    </div>
  );
}
