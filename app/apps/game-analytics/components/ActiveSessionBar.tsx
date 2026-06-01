'use client';

import { useState, useEffect } from 'react';
import { X, Check, Play, Timer } from 'lucide-react';
import { SessionMood } from '../lib/types';
import clsx from 'clsx';

export interface ActiveSession {
  gameId: string;
  gameName: string;
  thumbnailUrl?: string;
  startTime: string; // ISO string
  mood?: SessionMood;
}

export const ACTIVE_SESSION_KEY = 'ga-active-session';

interface ActiveSessionBarProps {
  session: ActiveSession;
  onStop: (elapsedHours: number, mood?: SessionMood) => void;
  onAbandon: () => void;
  onMoodChange: (mood: SessionMood) => void;
}

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

const MOODS: { key: SessionMood; emoji: string; label: string; activeBg: string }[] = [
  { key: 'great', emoji: '🔥', label: 'Great', activeBg: 'rgba(249,115,22,0.15)' },
  { key: 'good',  emoji: '👍', label: 'Good',  activeBg: 'rgba(59,130,246,0.15)' },
  { key: 'meh',   emoji: '😐', label: 'Meh',   activeBg: 'rgba(234,179,8,0.15)'  },
  { key: 'grind', emoji: '😤', label: 'Grind', activeBg: 'rgba(239,68,68,0.15)'  },
];

export function ActiveSessionBar({ session, onStop, onAbandon, onMoodChange }: ActiveSessionBarProps) {
  const [elapsed, setElapsed] = useState(0);
  const [confirmAbandon, setConfirmAbandon] = useState(false);

  useEffect(() => {
    const startMs = new Date(session.startTime).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - startMs) / 1000));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [session.startTime]);

  const elapsedHours = elapsed / 3600;
  const elapsedDisplay = formatElapsed(elapsed);
  const currentMood = session.mood;

  const handleStop = () => {
    // Round to 1 decimal place, minimum 0.1h
    const roundedHours = Math.max(0.1, Math.round(elapsedHours * 10) / 10);
    onStop(roundedHours, currentMood);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-3 pb-3" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
      <div className="max-w-lg mx-auto">
        <div
          className="border border-green-500/20 rounded-2xl overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(13,13,22,0.97) 0%, rgba(5,20,12,0.97) 100%)',
            boxShadow: '0 -4px 32px rgba(0,0,0,0.7), 0 0 0 1px rgba(74,222,128,0.08)',
          }}
        >
          {/* Animated shimmer bar at top */}
          <div className="h-[2px] session-shimmer-bar" />

          <div className="px-4 py-3">
            {confirmAbandon ? (
              /* Abandon confirmation */
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white/70">Discard this session?</p>
                  <p className="text-xs text-white/30 mt-0.5">Your {elapsedDisplay} of play won&apos;t be logged.</p>
                </div>
                <button
                  onClick={() => setConfirmAbandon(false)}
                  className="px-3 py-1.5 text-xs text-white/40 rounded-lg transition-all"
                >
                  Keep going
                </button>
                <button
                  onClick={onAbandon}
                  className="px-3 py-1.5 text-xs bg-red-500/15 text-red-400 active:bg-red-500/25 rounded-lg font-semibold transition-all"
                >
                  Discard
                </button>
              </div>
            ) : (
              <>
                {/* Main info row */}
                <div className="flex items-center gap-3 mb-2.5">
                  {/* Thumbnail with live dot */}
                  <div className="relative flex-shrink-0">
                    {session.thumbnailUrl ? (
                      <img
                        src={session.thumbnailUrl}
                        alt={session.gameName}
                        className="w-10 h-10 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                        <Play size={14} className="text-white/20" />
                      </div>
                    )}
                    {/* Live pulse dot */}
                    <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-green-400 border-2 border-[#0d0d16] health-pulse-fast" />
                  </div>

                  {/* Name + label */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <Timer size={10} className="text-green-400 flex-shrink-0" />
                      <span className="text-[10px] font-bold text-green-400 uppercase tracking-widest">Live Session</span>
                    </div>
                    <div className="text-sm font-bold text-white/90 truncate">{session.gameName}</div>
                  </div>

                  {/* Timer display */}
                  <div className="text-right flex-shrink-0">
                    <div
                      className="text-2xl font-mono font-black tabular-nums leading-none tracking-tight text-white"
                    >
                      {elapsedDisplay}
                    </div>
                    <div className="text-[9px] text-white/25 text-right mt-0.5">
                      {elapsedHours >= 0.1 ? `≈ ${elapsedHours.toFixed(1)}h` : 'just started'}
                    </div>
                  </div>
                </div>

                {/* Bottom row: mood + actions */}
                <div className="flex items-center gap-2">
                  {/* Mood selector */}
                  <div className="flex gap-1">
                    {MOODS.map(m => (
                      <button
                        key={m.key}
                        onClick={() => onMoodChange(m.key)}
                        title={m.label}
                        className={clsx(
                          'w-7 h-7 flex items-center justify-center rounded-lg text-base transition-all duration-150',
                          currentMood === m.key
                            ? 'scale-110 shadow-inner'
                            : 'opacity-30 active:opacity-60'
                        )}
                        style={currentMood === m.key ? { backgroundColor: m.activeBg } : undefined}
                      >
                        {m.emoji}
                      </button>
                    ))}
                  </div>

                  <div className="flex-1" />

                  {/* Abandon */}
                  <button
                    onClick={() => setConfirmAbandon(true)}
                    className="p-1.5 text-white/20 active:text-white/50 rounded-lg transition-all"
                    title="Abandon session"
                  >
                    <X size={14} />
                  </button>

                  {/* Stop & Log */}
                  <button
                    onClick={handleStop}
                    className="flex items-center gap-1.5 px-4 py-2 bg-green-600 active:bg-green-700 text-white text-sm font-bold rounded-xl transition-all shadow-[0_2px_12px_rgba(22,163,74,0.4)]"
                  >
                    <Check size={14} />
                    Stop &amp; Log
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
