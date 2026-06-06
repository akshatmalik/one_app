'use client';

import { useState } from 'react';
import { Square, X, Timer } from 'lucide-react';
import { SessionMood } from '../lib/types';
import { ActiveSession } from '../hooks/useSessionTimer';
import clsx from 'clsx';

const MOODS: { value: SessionMood; label: string; emoji: string }[] = [
  { value: 'great', label: 'Great', emoji: '🔥' },
  { value: 'good', label: 'Good', emoji: '😊' },
  { value: 'meh', label: 'Meh', emoji: '😐' },
  { value: 'grind', label: 'Grind', emoji: '😤' },
];

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

interface SessionTimerWidgetProps {
  session: ActiveSession;
  elapsedSeconds: number;
  sessionHours: number;
  onStop: (mood?: SessionMood) => void;
  onCancel: () => void;
}

export function SessionTimerWidget({
  session,
  elapsedSeconds,
  sessionHours,
  onStop,
  onCancel,
}: SessionTimerWidgetProps) {
  const [expanded, setExpanded] = useState(false);
  const [selectedMood, setSelectedMood] = useState<SessionMood | undefined>();
  const [confirming, setConfirming] = useState(false);

  const game = session.game;
  const timeStr = formatTime(elapsedSeconds);

  const handleEndSession = () => setConfirming(true);

  const handleConfirmEnd = () => {
    onStop(selectedMood);
    setExpanded(false);
    setConfirming(false);
    setSelectedMood(undefined);
  };

  const handleDiscard = () => {
    onCancel();
    setExpanded(false);
    setConfirming(false);
    setSelectedMood(undefined);
  };

  // Live cost-per-hour: game.price / (existing hours + session hours)
  const existingHours = game.hours ?? 0;
  const liveTotalHours = existingHours + sessionHours;
  const liveCph = game.price > 0 && liveTotalHours > 0.05 ? game.price / liveTotalHours : null;

  /* ── Compact pill (shown in header) ──────────────────────────── */
  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/15 border border-emerald-500/30 rounded-full text-xs font-medium text-emerald-400 hover:bg-emerald-500/20 transition-all"
        title={`Timer running: ${game.name}`}
      >
        <span className="relative flex items-center justify-center">
          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
          <span className="absolute w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping opacity-60" />
        </span>
        <span className="font-mono tracking-tight">{timeStr}</span>
        <span className="text-white/30 hidden sm:inline">·</span>
        <span className="text-white/50 hidden sm:inline truncate max-w-[90px]">{game.name}</span>
      </button>
    );
  }

  /* ── Expanded modal ───────────────────────────────────────────── */
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
        onClick={() => { if (!confirming) setExpanded(false); }}
      />

      {/* Sheet — slides up from bottom on mobile, centered on desktop */}
      <div className="fixed z-50 bottom-0 left-0 right-0 sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:-translate-y-1/2 sm:-translate-x-1/2 sm:w-[380px]">
        <div className="bg-[#0e0e16] border border-white/10 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden">

          {!confirming ? (
            <>
              {/* Hero */}
              <div
                className="relative h-32 flex items-end"
                style={game.thumbnail ? {
                  backgroundImage: `linear-gradient(to bottom, rgba(14,14,22,0.3) 0%, rgba(14,14,22,0.92) 100%), url(${game.thumbnail})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center top',
                } : { background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' }}
              >
                <div className="px-5 pb-4 flex-1 min-w-0">
                  <p className="text-[10px] text-emerald-400/70 uppercase tracking-widest mb-0.5 flex items-center gap-1.5">
                    <span className="relative flex">
                      <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                      <span className="absolute w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping opacity-60" />
                    </span>
                    Now Playing
                  </p>
                  <h3 className="text-xl font-bold text-white truncate">{game.name}</h3>
                  {game.genre && <p className="text-xs text-white/40">{game.genre}</p>}
                </div>
                <button
                  onClick={() => setExpanded(false)}
                  className="absolute top-3 right-3 p-1.5 bg-black/40 text-white/40 hover:text-white/70 rounded-full transition-colors"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Timer */}
              <div className="px-5 pt-5 pb-2">
                <div className="text-center mb-5">
                  <div className="text-6xl font-mono font-bold text-white tracking-tight tabular-nums">
                    {timeStr}
                  </div>
                  <p className="text-xs text-white/30 mt-1.5">
                    {sessionHours < 0.02
                      ? 'warming up…'
                      : `${sessionHours.toFixed(2)}h this session`}
                  </p>
                </div>

                {/* Live stats */}
                {(liveCph !== null || existingHours > 0) && (
                  <div className="flex items-center justify-center gap-0 mb-5 rounded-xl overflow-hidden border border-white/5">
                    {liveCph !== null && (
                      <div className="flex-1 text-center py-3 px-2 bg-white/[0.03]">
                        <p className="text-[10px] text-white/30 mb-0.5">Live $/hr</p>
                        <p className="text-base font-bold text-emerald-400">${liveCph.toFixed(2)}</p>
                      </div>
                    )}
                    {liveCph !== null && existingHours > 0 && (
                      <div className="w-px self-stretch bg-white/5" />
                    )}
                    {existingHours > 0 && (
                      <div className="flex-1 text-center py-3 px-2 bg-white/[0.03]">
                        <p className="text-[10px] text-white/30 mb-0.5">Total hours</p>
                        <p className="text-base font-bold text-white">{liveTotalHours.toFixed(1)}h</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="px-5 pb-5 flex gap-2">
                <button
                  onClick={handleEndSession}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 active:bg-emerald-500/40 rounded-xl font-semibold text-sm transition-all"
                >
                  <Square size={15} fill="currentColor" />
                  End Session
                </button>
                <button
                  onClick={handleDiscard}
                  className="px-4 py-3 bg-white/[0.04] text-white/30 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
                  title="Discard session (don't log)"
                >
                  <X size={18} />
                </button>
              </div>
            </>
          ) : (
            /* ── Confirm + Mood ──────────────────────────────────── */
            <div className="p-5">
              <div className="text-center mb-5">
                <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center mx-auto mb-3">
                  <Timer size={22} className="text-emerald-400" />
                </div>
                <h3 className="text-base font-bold text-white mb-1">Session Complete!</h3>
                <p className="text-sm text-white/50">
                  <span className="text-white font-mono font-semibold">{timeStr}</span>
                  {' '}on <span className="text-white/70">{game.name}</span>
                </p>
              </div>

              {/* Mood picker */}
              <div className="mb-5">
                <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2.5 text-center">
                  How was the session? <span className="text-white/20">(optional)</span>
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {MOODS.map(m => (
                    <button
                      key={m.value}
                      onClick={() => setSelectedMood(selectedMood === m.value ? undefined : m.value)}
                      className={clsx(
                        'flex flex-col items-center gap-1.5 py-3 rounded-xl text-xs transition-all border',
                        selectedMood === m.value
                          ? 'bg-purple-500/20 border-purple-500/30 text-purple-300'
                          : 'bg-white/[0.03] border-white/5 text-white/40 hover:border-white/10 hover:text-white/60'
                      )}
                    >
                      <span className="text-lg leading-none">{m.emoji}</span>
                      <span>{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleConfirmEnd}
                className="w-full py-3 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded-xl font-semibold text-sm transition-all mb-2"
              >
                Save {sessionHours >= 0.02
                  ? `${sessionHours.toFixed(1)}h`
                  : 'Session'}
              </button>
              <button
                onClick={() => setConfirming(false)}
                className="w-full py-2 text-xs text-white/25 hover:text-white/50 transition-colors"
              >
                ← Keep timer running
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
