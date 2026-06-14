'use client';

import { useRef, useState } from 'react';
import { Square, X, Gamepad2 } from 'lucide-react';
import { SessionMood } from '../lib/types';
import { LiveSession } from '../hooks/useLiveSession';
import clsx from 'clsx';

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
}

const MOOD_OPTIONS: { mood: SessionMood; emoji: string; label: string; activeClass: string }[] = [
  { mood: 'great', emoji: '😊', label: 'Great',  activeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
  { mood: 'good',  emoji: '🙂', label: 'Good',   activeClass: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
  { mood: 'meh',   emoji: '😐', label: 'Meh',    activeClass: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40' },
  { mood: 'grind', emoji: '😤', label: 'Grind',  activeClass: 'bg-red-500/20 text-red-300 border-red-500/40' },
];

interface LiveSessionTrackerProps {
  session: LiveSession | null;
  elapsedSeconds: number;
  onStop: (hours: number, mood?: SessionMood, notes?: string) => Promise<void> | void;
  onDiscard: () => void;
}

export function LiveSessionTracker({ session, elapsedSeconds, onStop, onDiscard }: LiveSessionTrackerProps) {
  const [showStopSheet, setShowStopSheet] = useState(false);
  const [selectedMood, setSelectedMood] = useState<SessionMood | undefined>();
  const [notes, setNotes] = useState('');
  const [logging, setLogging] = useState(false);
  const [loggedDone, setLoggedDone] = useState(false);
  // Capture hours at the moment Stop is pressed (not at Log button press)
  const capturedHoursRef = useRef(0);

  if (!session) return null;

  function handleStop(e: React.MouseEvent) {
    e.stopPropagation();
    capturedHoursRef.current = Math.max(0.1, Math.round((elapsedSeconds / 3600) * 100) / 100);
    setShowStopSheet(true);
  }

  async function handleLog() {
    if (logging) return;
    setLogging(true);
    try {
      await onStop(capturedHoursRef.current, selectedMood, notes.trim() || undefined);
      setLoggedDone(true);
      setTimeout(() => {
        setShowStopSheet(false);
        setLoggedDone(false);
        setSelectedMood(undefined);
        setNotes('');
      }, 900);
    } finally {
      setLogging(false);
    }
  }

  function handleDiscard() {
    setShowStopSheet(false);
    setSelectedMood(undefined);
    setNotes('');
    onDiscard();
  }

  const startedAt = new Date(session.startTime).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <>
      {/* Floating pill — visible whenever a session is running */}
      {!showStopSheet && (
        <div className="fixed bottom-5 left-0 right-0 z-40 flex justify-center pointer-events-none px-4">
          <div className="pointer-events-auto w-full max-w-sm">
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl shadow-black/60"
              style={{
                background: 'linear-gradient(135deg, rgba(15,15,28,0.97) 0%, rgba(20,20,40,0.97) 100%)',
                border: '1px solid rgba(239,68,68,0.25)',
                backdropFilter: 'blur(16px)',
              }}
            >
              {/* Pulsing live dot */}
              <div className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0 health-pulse-fast" />

              {/* Thumbnail */}
              {session.thumbnail ? (
                <img
                  src={session.thumbnail}
                  alt=""
                  className="w-9 h-9 rounded-lg object-cover shrink-0 shadow-md"
                />
              ) : (
                <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                  <Gamepad2 size={16} className="text-white/40" />
                </div>
              )}

              {/* Game info + timer */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white/90 truncate leading-tight">{session.gameName}</p>
                <p className="text-[11px] text-red-400/80 font-mono tabular-nums leading-tight mt-0.5">
                  {formatElapsed(elapsedSeconds)}
                </p>
              </div>

              {/* Stop button */}
              <button
                onClick={handleStop}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/15 text-red-400 text-xs font-bold border border-red-500/20 hover:bg-red-500/25 active:bg-red-500/35 transition-all shrink-0"
              >
                <Square size={9} fill="currentColor" />
                Stop
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stop sheet overlay */}
      {showStopSheet && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end" onClick={() => setShowStopSheet(false)}>
          <div
            className="w-full bg-[#10101c] border-t border-white/8 rounded-t-3xl overflow-hidden animate-bottom-sheet-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-white/15 rounded-full" />
            </div>

            <div className="px-5 py-4 pb-8 max-h-[88dvh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-sm font-bold text-white/85">Session complete</span>
                </div>
                <button
                  onClick={() => setShowStopSheet(false)}
                  className="w-7 h-7 flex items-center justify-center rounded-full bg-white/8 text-white/40 hover:text-white/70 transition-colors"
                >
                  <X size={13} />
                </button>
              </div>

              {/* Game + duration */}
              <div className="flex items-center gap-4 mb-6 p-4 bg-white/[0.03] rounded-2xl border border-white/5">
                {session.thumbnail ? (
                  <img
                    src={session.thumbnail}
                    alt=""
                    className="w-16 h-16 rounded-xl object-cover shrink-0 shadow-lg"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-white/8 flex items-center justify-center shrink-0">
                    <Gamepad2 size={24} className="text-white/30" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-base font-bold text-white/90 mb-0.5 truncate">{session.gameName}</p>
                  <p className="text-xs text-white/35 mb-2">Started at {startedAt}</p>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xl font-bold text-white/90">{formatDuration(elapsedSeconds)}</span>
                    <span className="text-xs text-white/35 font-mono">({capturedHoursRef.current.toFixed(2)}h)</span>
                  </div>
                </div>
              </div>

              {/* Mood picker */}
              <div className="mb-5">
                <p className="text-[11px] font-semibold text-white/40 uppercase tracking-widest mb-3">How was it?</p>
                <div className="grid grid-cols-4 gap-2">
                  {MOOD_OPTIONS.map(opt => (
                    <button
                      key={opt.mood}
                      onClick={() => setSelectedMood(selectedMood === opt.mood ? undefined : opt.mood)}
                      className={clsx(
                        'flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs font-semibold transition-all active:scale-95',
                        selectedMood === opt.mood
                          ? opt.activeClass
                          : 'border-white/5 bg-white/[0.025] text-white/30 hover:bg-white/[0.05]'
                      )}
                    >
                      <span className="text-xl leading-none">{opt.emoji}</span>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div className="mb-6">
                <p className="text-[11px] font-semibold text-white/40 uppercase tracking-widest mb-2">Quick note</p>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Anything worth remembering? (optional)"
                  rows={2}
                  className="w-full bg-white/[0.03] border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white/75 placeholder-white/20 resize-none focus:outline-none focus:border-white/20 transition-colors"
                />
              </div>

              {/* Actions */}
              <div className="space-y-2.5">
                <button
                  onClick={handleLog}
                  disabled={logging || loggedDone}
                  className={clsx(
                    'w-full py-4 rounded-2xl font-bold text-base transition-all',
                    loggedDone
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20'
                      : logging
                        ? 'bg-blue-600/50 text-white/50'
                        : 'bg-blue-600 text-white hover:bg-blue-500 active:bg-blue-700'
                  )}
                >
                  {loggedDone ? '✓ Logged!' : logging ? 'Logging…' : `Log ${capturedHoursRef.current.toFixed(2)} hours`}
                </button>
                <button
                  onClick={handleDiscard}
                  className="w-full py-3 rounded-xl text-sm text-white/25 hover:text-white/50 transition-colors"
                >
                  Discard session
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
