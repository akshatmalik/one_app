'use client';

import { useState, useCallback, useEffect } from 'react';
import { Pause, Play, Square, Check, Gamepad2 } from 'lucide-react';
import { ActiveSession } from '../hooks/useLiveSession';
import { SessionMood } from '../lib/types';
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

const MOOD_OPTIONS: { value: SessionMood; emoji: string; label: string }[] = [
  { value: 'great', emoji: '🔥', label: 'Fire' },
  { value: 'good', emoji: '👍', label: 'Good' },
  { value: 'meh', emoji: '😐', label: 'Meh' },
  { value: 'grind', emoji: '😤', label: 'Grind' },
];

interface LiveSessionTrackerProps {
  activeSession: ActiveSession | null;
  elapsedSeconds: number;
  isPaused: boolean;
  onPause: () => void;
  onResume: () => void;
  onStop: () => { gameId: string; hours: number } | null;
  onCancel: () => void;
  onLogSession: (gameId: string, hours: number, mood?: SessionMood) => Promise<void>;
  gamePrice?: number;
  gameTotalHours?: number;
}

type Phase = 'active' | 'confirming' | 'logged';

export function LiveSessionTracker({
  activeSession,
  elapsedSeconds,
  isPaused,
  onPause,
  onResume,
  onStop,
  onCancel,
  onLogSession,
  gamePrice = 0,
  gameTotalHours = 0,
}: LiveSessionTrackerProps) {
  const [phase, setPhase] = useState<Phase>('active');
  const [pendingLog, setPendingLog] = useState<{ gameId: string; hours: number } | null>(null);
  const [pendingGameName, setPendingGameName] = useState('');
  const [logHours, setLogHours] = useState(0.5);
  const [selectedMood, setSelectedMood] = useState<SessionMood | null>(null);
  const [isLogging, setIsLogging] = useState(false);

  // Reset to active when a new session starts
  useEffect(() => {
    if (activeSession) {
      setPhase('active');
      setPendingLog(null);
      setSelectedMood(null);
    }
  }, [activeSession?.gameId]);

  const handleStop = useCallback(() => {
    // Capture game name before activeSession is cleared by onStop()
    const name = activeSession?.gameName ?? '';
    const result = onStop();
    if (!result) return;
    setLogHours(result.hours);
    setPendingLog(result);
    setPendingGameName(name);
    setSelectedMood(null);
    setPhase('confirming');
  }, [onStop, activeSession]);

  const handleLog = useCallback(async () => {
    if (isLogging || !pendingLog) return;
    setIsLogging(true);
    try {
      await onLogSession(pendingLog.gameId, logHours, selectedMood ?? undefined);
      setPhase('logged');
      setTimeout(() => {
        setPhase('active');
        setPendingLog(null);
        setIsLogging(false);
      }, 1800);
    } catch {
      setIsLogging(false);
    }
  }, [isLogging, pendingLog, logHours, selectedMood, onLogSession]);

  const handleDiscard = useCallback(() => {
    onCancel();
    setPhase('active');
    setPendingLog(null);
  }, [onCancel]);

  const visible = activeSession !== null || phase === 'confirming' || phase === 'logged';
  if (!visible) return null;

  // Live cost-per-hour calculation
  const sessionHours = elapsedSeconds / 3600;
  const totalWithSession = gameTotalHours + sessionHours;
  const liveCph = gamePrice > 0 && totalWithSession > 0 ? gamePrice / totalWithSession : null;
  const beforeCph = gamePrice > 0 && gameTotalHours > 0 ? gamePrice / gameTotalHours : null;
  const showLiveCph = liveCph !== null && sessionHours > 0.01;

  const thumbnail = activeSession?.thumbnail;

  return (
    <>
      {/* Backdrop dim — subtle */}
      <div className="fixed inset-0 z-40 pointer-events-none" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.3) 0%, transparent 30%)' }} />

      {/* Floating bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 live-session-slide-up">
        <div className="mx-3 mb-3 rounded-2xl overflow-hidden border border-white/10 shadow-2xl"
          style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' }}>

          {/* Active phase */}
          {phase === 'active' && activeSession && (
            <div>
              {/* Top row */}
              <div className="flex items-center gap-3 px-4 pt-3.5 pb-2">
                {/* Thumbnail */}
                {thumbnail ? (
                  <img src={thumbnail} alt={activeSession.gameName} className="w-9 h-9 object-cover rounded-lg shrink-0" />
                ) : (
                  <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                    <Gamepad2 size={16} className="text-white/30" />
                  </div>
                )}

                {/* Game name + timer */}
                <div className="flex-1 min-w-0">
                  <p className="text-white/90 font-semibold text-sm leading-tight truncate">{activeSession.gameName}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {isPaused ? (
                      <span className="text-[10px] text-yellow-400/70 font-medium">Paused</span>
                    ) : (
                      <span className="text-[10px] text-emerald-400/70 font-medium flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
                        Live
                      </span>
                    )}
                    {showLiveCph && beforeCph !== null && (
                      <span className="text-[10px] text-white/30">
                        <span className="text-white/40">${liveCph!.toFixed(2)}/hr</span>
                        {liveCph! < beforeCph - 0.05 && (
                          <span className="text-emerald-400/60 ml-1">↓</span>
                        )}
                      </span>
                    )}
                    {showLiveCph && beforeCph === null && (
                      <span className="text-[10px] text-white/30">${liveCph!.toFixed(2)}/hr</span>
                    )}
                  </div>
                </div>

                {/* Timer */}
                <div className={clsx(
                  'font-mono font-bold text-lg tracking-widest tabular-nums shrink-0',
                  isPaused ? 'text-yellow-300/70' : 'text-white'
                )}>
                  {formatElapsed(elapsedSeconds)}
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-2 px-4 pb-3.5">
                <button
                  onClick={isPaused ? onResume : onPause}
                  className={clsx(
                    'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium transition-all',
                    isPaused
                      ? 'bg-emerald-500/20 text-emerald-300 active:bg-emerald-500/30'
                      : 'bg-white/8 text-white/60 active:bg-white/15'
                  )}
                >
                  {isPaused ? <><Play size={14} />Resume</> : <><Pause size={14} />Pause</>}
                </button>
                <button
                  onClick={handleStop}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-purple-600/30 text-purple-300 text-sm font-medium active:bg-purple-600/50 transition-all border border-purple-500/20"
                >
                  <Square size={12} fill="currentColor" />
                  Stop &amp; Log
                </button>
              </div>
            </div>
          )}

          {/* Confirming phase */}
          {phase === 'confirming' && (
            <div>
              <div className="px-4 pt-3.5 pb-2">
                <p className="text-white/70 text-sm font-medium mb-2.5">
                  Log session for <span className="text-white">{pendingGameName || 'game'}</span>?
                </p>
                {/* Hours adjuster */}
                <div className="flex items-center gap-2 mb-3">
                  <button
                    onClick={() => setLogHours(h => Math.max(0.1, Math.round((h - 0.1) * 10) / 10))}
                    className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/8 text-white/60 text-base font-bold active:bg-white/15 transition-all"
                  >−</button>
                  <div className="flex-1 text-center">
                    <span className="text-white font-bold text-lg">{logHours}h</span>
                    <span className="text-white/30 text-xs ml-1.5">
                      ({Math.floor(logHours * 60)} min)
                    </span>
                  </div>
                  <button
                    onClick={() => setLogHours(h => Math.round((h + 0.1) * 10) / 10)}
                    className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/8 text-white/60 text-base font-bold active:bg-white/15 transition-all"
                  >+</button>
                </div>
                {/* Mood picker */}
                <div className="flex items-center gap-1.5 mb-3">
                  <span className="text-[10px] text-white/30 shrink-0">Vibe:</span>
                  {MOOD_OPTIONS.map(m => (
                    <button
                      key={m.value}
                      onClick={() => setSelectedMood(prev => prev === m.value ? null : m.value)}
                      className={clsx(
                        'flex-1 py-1.5 rounded-lg text-sm transition-all',
                        selectedMood === m.value
                          ? 'bg-purple-500/30 border border-purple-400/40 scale-105'
                          : 'bg-white/5 border border-transparent active:bg-white/10'
                      )}
                      title={m.label}
                    >
                      {m.emoji}
                    </button>
                  ))}
                </div>
              </div>
              {/* Action buttons */}
              <div className="flex gap-2 px-4 pb-3.5">
                <button
                  onClick={handleDiscard}
                  className="flex-1 py-2 rounded-xl bg-white/5 text-white/40 text-sm font-medium active:bg-white/10 transition-all"
                >
                  Discard
                </button>
                <button
                  onClick={handleLog}
                  disabled={isLogging}
                  className="flex-[2] py-2 rounded-xl bg-purple-600 text-white text-sm font-bold active:bg-purple-500 transition-all disabled:opacity-60 flex items-center justify-center gap-1.5"
                >
                  <Check size={14} />
                  {isLogging ? 'Logging…' : 'Log Session'}
                </button>
              </div>
            </div>
          )}

          {/* Logged phase */}
          {phase === 'logged' && (
            <div className="flex items-center justify-center gap-2 px-4 py-5">
              <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <Check size={14} className="text-emerald-400" />
              </div>
              <span className="text-white/80 font-medium text-sm">Session logged!</span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
