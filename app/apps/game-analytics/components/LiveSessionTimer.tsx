'use client';

import { useState, useCallback } from 'react';
import { Square, X, Zap, Clock } from 'lucide-react';
import { ActiveSession, formatElapsed, roundToLogHours } from '../hooks/useSessionTimer';
import type { SessionMood } from '../lib/types';
import clsx from 'clsx';

const MOOD_OPTIONS: { value: SessionMood; label: string; emoji: string; color: string }[] = [
  { value: 'great',  label: 'Great',  emoji: '🔥', color: 'bg-orange-500/20 border-orange-500/40 text-orange-300' },
  { value: 'good',   label: 'Good',   emoji: '😊', color: 'bg-green-500/20 border-green-500/40 text-green-300' },
  { value: 'meh',    label: 'Meh',    emoji: '😐', color: 'bg-yellow-500/20 border-yellow-500/40 text-yellow-300' },
  { value: 'grind',  label: 'Grind',  emoji: '😤', color: 'bg-red-500/20 border-red-500/40 text-red-300' },
];

interface LiveSessionTimerProps {
  session: ActiveSession;
  elapsed: number; // seconds
  onStop: (mood?: SessionMood, notes?: string) => void;
  onAbandon: () => void;
}

export function LiveSessionTimer({ session, elapsed, onStop, onAbandon }: LiveSessionTimerProps) {
  const [confirmStop, setConfirmStop] = useState(false);
  const [confirmAbandon, setConfirmAbandon] = useState(false);
  const [selectedMood, setSelectedMood] = useState<SessionMood | undefined>(undefined);
  const [notes, setNotes] = useState('');

  const hours = roundToLogHours(elapsed);

  const handleStopClick = useCallback(() => {
    setConfirmStop(true);
    setConfirmAbandon(false);
  }, []);

  const handleConfirmStop = useCallback(() => {
    onStop(selectedMood, notes.trim() || undefined);
    setConfirmStop(false);
    setSelectedMood(undefined);
    setNotes('');
  }, [onStop, selectedMood, notes]);

  const handleAbandonClick = useCallback(() => {
    setConfirmAbandon(true);
    setConfirmStop(false);
  }, []);

  const handleConfirmAbandon = useCallback(() => {
    onAbandon();
    setConfirmAbandon(false);
  }, [onAbandon]);

  const handleCancel = useCallback(() => {
    setConfirmStop(false);
    setConfirmAbandon(false);
  }, []);

  return (
    <div className="fixed bottom-20 right-3 z-40 flex flex-col items-end gap-2 select-none">

      {/* Stop & Log confirmation sheet */}
      {confirmStop && (
        <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl p-4 shadow-2xl w-72 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white/60 uppercase tracking-wider">Log Session</span>
            <button onClick={handleCancel} className="text-white/30 hover:text-white/60 transition-colors">
              <X size={14} />
            </button>
          </div>

          {/* Duration summary */}
          <div className="bg-white/5 rounded-xl p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/5 flex-shrink-0">
              {session.gameThumbnail ? (
                <img src={session.gameThumbnail} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/20">
                  <Clock size={16} />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">{session.gameName}</p>
              <p className="text-lg font-bold text-purple-300 font-mono leading-tight">
                {formatElapsed(elapsed)}
              </p>
              <p className="text-[10px] text-white/40">≈ {hours}h will be logged</p>
            </div>
          </div>

          {/* Mood selector */}
          <div>
            <p className="text-[10px] text-white/40 mb-1.5 uppercase tracking-wider">How was it?</p>
            <div className="grid grid-cols-4 gap-1.5">
              {MOOD_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setSelectedMood(prev => prev === opt.value ? undefined : opt.value)}
                  className={clsx(
                    'border rounded-lg py-1.5 text-center transition-all',
                    selectedMood === opt.value ? opt.color : 'border-white/10 text-white/30 hover:border-white/20'
                  )}
                >
                  <div className="text-base leading-none">{opt.emoji}</div>
                  <div className="text-[9px] mt-0.5">{opt.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Optional notes */}
          <div>
            <input
              type="text"
              placeholder="Quick note (optional)"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleConfirmStop()}
              maxLength={120}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-purple-500/50"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              className="flex-1 py-2 rounded-lg border border-white/10 text-xs text-white/50 hover:text-white/70 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmStop}
              className="flex-1 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-xs font-semibold text-white transition-colors"
            >
              Save Session
            </button>
          </div>
        </div>
      )}

      {/* Abandon confirmation */}
      {confirmAbandon && (
        <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl p-4 shadow-2xl w-64 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <p className="text-xs text-white/60">Discard this session without logging?</p>
          <div className="flex gap-2">
            <button onClick={handleCancel} className="flex-1 py-2 rounded-lg border border-white/10 text-xs text-white/50 hover:text-white/70 transition-colors">
              Keep going
            </button>
            <button onClick={handleConfirmAbandon} className="flex-1 py-2 rounded-lg bg-red-600/80 hover:bg-red-500 text-xs font-semibold text-white transition-colors">
              Discard
            </button>
          </div>
        </div>
      )}

      {/* Main timer pill */}
      {!confirmStop && !confirmAbandon && (
        <div className="bg-[#1a1a2e]/95 backdrop-blur-md border border-purple-500/30 rounded-2xl shadow-2xl overflow-hidden">
          {/* Pulsing top bar */}
          <div className="h-0.5 bg-gradient-to-r from-purple-600 via-fuchsia-500 to-purple-600 timer-bar-pulse" />

          <div className="flex items-center gap-3 px-4 py-3">
            {/* Thumbnail */}
            <div className="relative flex-shrink-0">
              <div className="w-9 h-9 rounded-lg overflow-hidden bg-white/5">
                {session.gameThumbnail ? (
                  <img src={session.gameThumbnail} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Zap size={14} className="text-purple-400" />
                  </div>
                )}
              </div>
              {/* Live indicator */}
              <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-green-400 border-2 border-[#1a1a2e] health-pulse-fast" />
            </div>

            {/* Game name + timer */}
            <div className="min-w-0">
              <p className="text-[10px] text-white/40 truncate max-w-[120px]">{session.gameName}</p>
              <p className="text-lg font-bold text-white font-mono leading-tight tracking-tight">
                {formatElapsed(elapsed)}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {/* Stop & Log */}
              <button
                onClick={handleStopClick}
                className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-500 active:scale-95 rounded-xl px-3 py-2 transition-all"
                title="Stop & log session"
              >
                <Square size={12} className="text-white fill-white" />
                <span className="text-[11px] font-semibold text-white">Log</span>
              </button>

              {/* Abandon */}
              <button
                onClick={handleAbandonClick}
                className="w-8 h-8 flex items-center justify-center rounded-xl text-white/30 hover:text-red-400 hover:bg-red-500/10 active:scale-95 transition-all"
                title="Abandon without logging"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
