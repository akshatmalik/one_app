'use client';

import { useState } from 'react';
import { Play, Pause, Square, X, Check, Gamepad2 } from 'lucide-react';
import { LiveSession } from '../hooks/useSessionTimer';
import { SessionMood } from '../lib/types';
import clsx from 'clsx';

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

interface SessionTimerProps {
  session: LiveSession;
  elapsedSeconds: number;
  isPaused: boolean;
  onPause: () => void;
  onResume: () => void;
  onStop: (hours: number, mood?: SessionMood, notes?: string) => void;
  onCancel: () => void;
}

export function SessionTimer({
  session,
  elapsedSeconds,
  isPaused,
  onPause,
  onResume,
  onStop,
  onCancel,
}: SessionTimerProps) {
  const [showLogDialog, setShowLogDialog] = useState(false);
  const [logHours, setLogHours] = useState(0.1);
  const [logMood, setLogMood] = useState<SessionMood | undefined>();
  const [logNotes, setLogNotes] = useState('');

  const openLogDialog = () => {
    const hours = Math.max(0.1, parseFloat((elapsedSeconds / 3600).toFixed(2)));
    setLogHours(hours);
    setShowLogDialog(true);
  };

  const handleConfirmLog = () => {
    onStop(logHours, logMood, logNotes || undefined);
    setShowLogDialog(false);
    setLogNotes('');
    setLogMood(undefined);
  };

  const handleSkip = () => {
    setShowLogDialog(false);
    onCancel();
  };

  const handleBackdropClick = () => {
    // Close dialog but keep timer running
    setShowLogDialog(false);
  };

  const sliderMax = Math.max(1, Math.ceil(elapsedSeconds / 3600) + 2);

  return (
    <>
      {/* Fixed bottom timer bar */}
      <div
        className={clsx(
          'fixed bottom-0 left-0 right-0 z-40 border-t transition-colors',
          isPaused
            ? 'bg-[#18150a] border-yellow-500/20'
            : 'bg-[#09130c] border-emerald-500/20',
        )}
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center gap-3">
          {/* Live indicator dot */}
          <div className="relative w-2 h-2 flex-shrink-0">
            {isPaused ? (
              <div className="w-2 h-2 rounded-full bg-yellow-400" />
            ) : (
              <>
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <div className="absolute inset-0 w-2 h-2 rounded-full bg-emerald-400 animate-ping opacity-40" />
              </>
            )}
          </div>

          {/* Thumbnail */}
          {session.gameThumbnail ? (
            <img
              src={session.gameThumbnail}
              alt=""
              className="w-8 h-8 rounded-md object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-md bg-white/5 flex items-center justify-center flex-shrink-0">
              <Gamepad2 size={12} className="text-white/20" />
            </div>
          )}

          {/* Game info */}
          <div className="flex-1 min-w-0">
            <div className="text-[10px] text-white/30 leading-none mb-0.5">
              {isPaused ? 'Paused' : 'Live session'}
            </div>
            <div className="text-sm font-semibold text-white/80 truncate leading-none">
              {session.gameName}
            </div>
          </div>

          {/* Timer display */}
          <div
            className={clsx(
              'font-mono text-base font-bold tabular-nums flex-shrink-0 tracking-tight',
              isPaused ? 'text-yellow-400' : 'text-emerald-400',
            )}
          >
            {formatDuration(elapsedSeconds)}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {isPaused ? (
              <button
                onClick={onResume}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 active:scale-90 transition-all"
                title="Resume"
              >
                <Play size={13} fill="currentColor" />
              </button>
            ) : (
              <button
                onClick={onPause}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 active:scale-90 transition-all"
                title="Pause"
              >
                <Pause size={13} />
              </button>
            )}

            <button
              onClick={openLogDialog}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 active:scale-90 transition-all"
              title="Stop &amp; log"
            >
              <Square size={13} fill="currentColor" />
            </button>

            <button
              onClick={() => {
                if (elapsedSeconds > 60) {
                  if (!window.confirm('Discard this session without logging?')) return;
                }
                onCancel();
              }}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 text-white/25 hover:bg-white/10 hover:text-white/50 active:scale-90 transition-all"
              title="Discard session"
            >
              <X size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Log dialog — bottom sheet */}
      {showLogDialog && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={handleBackdropClick}
          />
          <div className="relative z-10 w-full max-w-sm mx-4 bg-[#111119] border border-white/10 rounded-t-2xl shadow-2xl p-6 pb-8">
            {/* Summary header */}
            <div className="flex items-center gap-3 mb-5">
              {session.gameThumbnail ? (
                <img
                  src={session.gameThumbnail}
                  alt=""
                  className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
                  <Gamepad2 size={20} className="text-white/20" />
                </div>
              )}
              <div className="min-w-0">
                <div className="text-[10px] text-white/30 uppercase tracking-wide mb-0.5">
                  Session complete
                </div>
                <div className="text-base font-bold text-white/90 truncate">
                  {session.gameName}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-emerald-400 font-mono text-sm">
                    {formatDuration(elapsedSeconds)}
                  </span>
                  <span className="text-white/20 text-xs">·</span>
                  <span className="text-white/40 text-xs tabular-nums">
                    {logHours}h
                  </span>
                </div>
              </div>
            </div>

            {/* Hours adjustment */}
            <div className="mb-5">
              <div className="flex justify-between text-xs text-white/30 mb-1.5">
                <span>Hours to log</span>
                <span className="text-white/60 font-medium tabular-nums">{logHours}h</span>
              </div>
              <input
                type="range"
                min="0.1"
                max={sliderMax}
                step="0.1"
                value={logHours}
                onChange={e => setLogHours(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            {/* Mood picker */}
            <div className="mb-4">
              <div className="text-xs text-white/30 mb-2">How was it?</div>
              <div className="flex gap-2">
                {([
                  { v: 'great' as SessionMood, e: '🔥', l: 'Great' },
                  { v: 'good'  as SessionMood, e: '👍', l: 'Good'  },
                  { v: 'meh'   as SessionMood, e: '😐', l: 'Meh'   },
                  { v: 'grind' as SessionMood, e: '💪', l: 'Grind' },
                ]).map(opt => (
                  <button
                    key={opt.v}
                    onClick={() => setLogMood(logMood === opt.v ? undefined : opt.v)}
                    className={clsx(
                      'flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl text-xs transition-all',
                      logMood === opt.v
                        ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                        : 'bg-white/[0.03] text-white/30 border border-white/5',
                    )}
                  >
                    <span className="text-base">{opt.e}</span>
                    <span className="text-[9px]">{opt.l}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <textarea
              placeholder="Notes? (optional)"
              value={logNotes}
              onChange={e => setLogNotes(e.target.value)}
              rows={2}
              className="w-full mb-4 px-3 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-sm text-white/70 placeholder-white/20 resize-none focus:outline-none focus:border-white/20 transition-colors"
            />

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={handleSkip}
                className="flex-1 py-3 rounded-xl bg-white/5 text-white/40 text-sm font-medium hover:bg-white/8 transition-all"
              >
                Skip
              </button>
              <button
                onClick={handleConfirmLog}
                className="flex-1 py-3 rounded-xl bg-emerald-600/25 text-emerald-300 text-sm font-bold hover:bg-emerald-600/35 active:bg-emerald-600/45 transition-all flex items-center justify-center gap-2"
              >
                <Check size={15} />
                Log {logHours}h
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
