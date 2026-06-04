'use client';

import { useState } from 'react';
import { Square, Trash2, Clock, ChevronUp, ChevronDown } from 'lucide-react';
import type { ActiveSession } from '../hooks/useActiveSession';

function formatElapsed(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function humanDuration(totalSeconds: number): string {
  const hours = totalSeconds / 3600;
  if (hours >= 0.1) return `${(Math.round(hours * 10) / 10).toFixed(1)}h`;
  return `${Math.max(1, Math.round(totalSeconds / 60))}m`;
}

interface ActiveSessionWidgetProps {
  session: ActiveSession;
  elapsedSeconds: number;
  onStop: (notes: string) => void;
  onAbandon: () => void;
}

export function ActiveSessionWidget({
  session,
  elapsedSeconds,
  onStop,
  onAbandon,
}: ActiveSessionWidgetProps) {
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState('');
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const handleStop = () => {
    onStop(notes.trim());
    setNotes('');
    setExpanded(false);
    setConfirmDiscard(false);
  };

  const handleDiscard = () => {
    onAbandon();
    setExpanded(false);
    setConfirmDiscard(false);
    setNotes('');
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[60] pointer-events-none">
      <div className="pointer-events-auto mx-auto max-w-xl px-3 pb-3">
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #0d1f17 0%, #0a1a14 100%)',
            border: '1px solid rgba(52, 211, 153, 0.2)',
            boxShadow: '0 -4px 32px rgba(16, 185, 129, 0.10), 0 12px 40px rgba(0,0,0,0.7)',
          }}
        >
          {/* ── Collapsed bar (always visible) ── */}
          <div
            className="flex items-center gap-3 px-3 py-2.5 cursor-pointer select-none"
            onClick={() => {
              setExpanded(!expanded);
              setConfirmDiscard(false);
            }}
          >
            {/* Game thumbnail */}
            <div className="relative shrink-0">
              {session.thumbnail ? (
                <img
                  src={session.thumbnail}
                  alt=""
                  className="w-9 h-9 rounded-lg object-cover ring-1 ring-emerald-500/20"
                />
              ) : (
                <div className="w-9 h-9 rounded-lg bg-emerald-900/30 flex items-center justify-center ring-1 ring-emerald-500/20">
                  <Clock size={14} className="text-emerald-400" />
                </div>
              )}
              {/* Pulsing live dot */}
              <span className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center">
                <span className="absolute h-3 w-3 animate-ping rounded-full bg-emerald-400 opacity-50" />
                <span className="relative h-2 w-2 rounded-full bg-emerald-400" />
              </span>
            </div>

            {/* Labels */}
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-semibold text-emerald-400/70 uppercase tracking-widest leading-none mb-0.5">
                Live Session
              </div>
              <div className="text-sm font-semibold text-white/90 truncate leading-tight">
                {session.gameName}
              </div>
            </div>

            {/* Elapsed timer */}
            <div className="font-mono text-base font-bold text-emerald-400 tabular-nums shrink-0">
              {formatElapsed(elapsedSeconds)}
            </div>

            {/* Quick stop */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleStop();
              }}
              className="shrink-0 flex items-center justify-center w-8 h-8 bg-emerald-600/20 hover:bg-emerald-600/35 active:bg-emerald-600/50 text-emerald-400 rounded-lg transition-colors"
              title="Stop and log"
            >
              <Square size={11} fill="currentColor" />
            </button>

            {/* Expand toggle */}
            <div className="shrink-0 text-white/20">
              {expanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            </div>
          </div>

          {/* ── Expanded panel ── */}
          {expanded && (
            <div className="border-t border-emerald-900/40 px-3 pb-3 pt-2.5">
              {confirmDiscard ? (
                // Abandon confirmation
                <div className="space-y-2.5">
                  <p className="text-xs text-white/50 text-center leading-relaxed">
                    Discard {formatElapsed(elapsedSeconds)} without logging?
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleDiscard}
                      className="flex-1 py-2.5 bg-red-500/15 hover:bg-red-500/25 text-red-400 text-xs font-bold rounded-xl transition-colors"
                    >
                      Yes, discard
                    </button>
                    <button
                      onClick={() => setConfirmDiscard(false)}
                      className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-white/50 text-xs font-semibold rounded-xl transition-colors"
                    >
                      Keep running
                    </button>
                  </div>
                </div>
              ) : (
                // Normal stop panel
                <div className="space-y-2">
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="How was the session? (optional)"
                    className="w-full bg-white/5 border border-white/8 rounded-xl px-3 py-2 text-sm text-white/90 placeholder-white/20 focus:outline-none focus:border-emerald-500/30 transition-colors"
                    onKeyDown={(e) => e.key === 'Enter' && handleStop()}
                    autoComplete="off"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleStop}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-colors"
                    >
                      <Square size={11} fill="currentColor" />
                      Log&nbsp;{humanDuration(elapsedSeconds)}
                    </button>
                    <button
                      onClick={() => setConfirmDiscard(true)}
                      title="Discard without logging"
                      className="px-3 py-2.5 bg-white/4 hover:bg-red-500/12 text-white/25 hover:text-red-400 rounded-xl transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
