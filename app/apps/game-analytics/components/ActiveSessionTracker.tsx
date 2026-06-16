'use client';

import { useState } from 'react';
import { Play, Pause, Square, X, Clock, Check } from 'lucide-react';
import { SessionMood } from '../lib/types';
import { ActiveSessionState } from '../hooks/useActiveSession';
import clsx from 'clsx';

function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const MOODS = [
  { value: 'great' as SessionMood, emoji: '🔥', name: 'Fire' },
  { value: 'good' as SessionMood, emoji: '👍', name: 'Good' },
  { value: 'meh' as SessionMood, emoji: '😐', name: 'Meh' },
  { value: 'grind' as SessionMood, emoji: '💪', name: 'Grind' },
];

interface ActiveSessionTrackerProps {
  activeSession: ActiveSessionState | null;
  elapsedMs: number;
  isPaused: boolean;
  onPause: () => void;
  onResume: () => void;
  onStop: (hours: number, mood?: SessionMood, notes?: string) => void;
  onCancel: () => void;
}

export function ActiveSessionTracker({
  activeSession,
  elapsedMs,
  isPaused,
  onPause,
  onResume,
  onStop,
  onCancel,
}: ActiveSessionTrackerProps) {
  const [showStopDialog, setShowStopDialog] = useState(false);
  const [mood, setMood] = useState<SessionMood | undefined>();
  const [notes, setNotes] = useState('');

  if (!activeSession) return null;

  const loggedHours = Math.max(0.1, Math.round((elapsedMs / (1000 * 3600)) * 10) / 10);

  const handleConfirm = () => {
    onStop(loggedHours, mood, notes.trim() || undefined);
    setShowStopDialog(false);
    setMood(undefined);
    setNotes('');
  };

  // ── Stop confirmation modal ────────────────────────────────────
  if (showStopDialog) {
    return (
      <div
        className="fixed inset-0 z-[200] flex items-end pb-4 px-4"
        style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
      >
        <div
          className="w-full max-w-md mx-auto rounded-2xl overflow-hidden border border-white/10 shadow-2xl"
          style={{ background: '#16182a' }}
        >
          {/* Header — game + duration */}
          <div className="flex items-center gap-3 p-4 border-b border-white/5">
            {activeSession.thumbnail ? (
              <img
                src={activeSession.thumbnail}
                alt=""
                className="w-12 h-12 rounded-xl object-cover flex-none"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center flex-none">
                <Clock size={20} className="text-white/40" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">
                Session complete
              </p>
              <p className="text-base font-bold text-white/90 truncate">
                {activeSession.gameName}
              </p>
            </div>
            <div className="text-right flex-none">
              <p className="text-2xl font-mono font-bold text-emerald-400">{loggedHours}h</p>
              <p className="text-[10px] text-white/30 font-mono">{formatElapsed(elapsedMs)}</p>
            </div>
          </div>

          {/* Mood picker */}
          <div className="p-4 border-b border-white/5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-3">
              How was the session?
            </p>
            <div className="flex gap-2">
              {MOODS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setMood(mood === opt.value ? undefined : opt.value)}
                  className={clsx(
                    'flex-1 flex flex-col items-center gap-1 py-3 rounded-xl text-xs font-medium transition-all',
                    mood === opt.value
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                      : 'bg-white/[0.03] text-white/30 border border-white/5'
                  )}
                >
                  <span className="text-xl">{opt.emoji}</span>
                  <span>{opt.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="p-4 border-b border-white/5">
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Quick note (optional)…"
              className="w-full bg-white/[0.03] border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-purple-500/40"
              maxLength={200}
              autoComplete="off"
            />
          </div>

          {/* CTA */}
          <div className="flex gap-2 p-4">
            <button
              onClick={() => setShowStopDialog(false)}
              className="px-4 py-3 rounded-xl bg-white/[0.03] text-white/40 text-sm font-medium border border-white/5 flex-none active:bg-white/[0.06]"
            >
              Keep playing
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500/20 text-emerald-400 text-sm font-bold border border-emerald-500/30 active:bg-emerald-500/35 transition-colors"
            >
              <Check size={16} />
              Log {loggedHours}h — Done!
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Persistent "now playing" banner ───────────────────────────
  return (
    <div className="fixed bottom-0 left-0 right-0 z-[150] px-3 pb-3 pointer-events-none">
      <div
        className={clsx(
          'max-w-md mx-auto rounded-2xl border shadow-2xl pointer-events-auto overflow-hidden',
          isPaused ? 'border-white/10' : 'border-emerald-500/25'
        )}
        style={{
          background: isPaused
            ? 'rgba(14,14,24,0.97)'
            : 'rgba(4,18,10,0.97)',
          backdropFilter: 'blur(14px)',
        }}
      >
        <div className="flex items-center gap-3 px-4 py-3">
          {/* Thumbnail + live pulse dot */}
          <div className="relative flex-none">
            {activeSession.thumbnail ? (
              <img
                src={activeSession.thumbnail}
                alt=""
                className="w-10 h-10 rounded-lg object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                <Clock size={18} className="text-white/40" />
              </div>
            )}
            {!isPaused && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full">
                <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-60" />
              </span>
            )}
          </div>

          {/* Game name + status label */}
          <div className="flex-1 min-w-0">
            <p
              className={clsx(
                'text-[10px] font-bold uppercase tracking-widest',
                isPaused ? 'text-white/30' : 'text-emerald-500/80'
              )}
            >
              {isPaused ? 'Paused' : 'Now playing'}
            </p>
            <p className="text-sm font-bold text-white/90 truncate">
              {activeSession.gameName}
            </p>
          </div>

          {/* Live elapsed timer */}
          <div
            className={clsx(
              'font-mono text-xl font-bold tabular-nums flex-none',
              isPaused ? 'text-white/40' : 'text-emerald-400'
            )}
          >
            {formatElapsed(elapsedMs)}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1 flex-none ml-1">
            {isPaused ? (
              <button
                onClick={onResume}
                className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 active:bg-emerald-500/30 transition-colors"
                title="Resume session"
              >
                <Play size={16} fill="currentColor" />
              </button>
            ) : (
              <button
                onClick={onPause}
                className="p-2 rounded-xl bg-white/5 text-white/50 active:bg-white/10 transition-colors"
                title="Pause session"
              >
                <Pause size={16} />
              </button>
            )}

            <button
              onClick={() => setShowStopDialog(true)}
              className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 active:bg-emerald-500/35 transition-colors"
              title="Stop and log session"
            >
              <Square size={16} fill="currentColor" />
            </button>

            <button
              onClick={onCancel}
              className="p-2 rounded-xl bg-white/[0.02] text-white/20 active:bg-white/[0.06] transition-colors"
              title="Cancel — don't log this session"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
