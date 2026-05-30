'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import {
  Timer, Play, Pause, Square, X, Search, Gamepad2,
  CheckCircle, AlertCircle, Zap, ChevronRight,
} from 'lucide-react';
import { Game, SessionMood } from '../lib/types';
import { SessionTimerApi } from '../hooks/useSessionTimer';
import { parseLocalDate } from '../lib/calculations';
import clsx from 'clsx';

interface SessionTimerProps {
  timer: SessionTimerApi;
  games: Game[];
  onSessionLogged: (gameId: string, hours: number, mood?: SessionMood, note?: string) => Promise<void>;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatClock(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatHours(hours: number): string {
  if (hours < 1 / 60) return '<1m';
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  return `${hours.toFixed(2)}h`;
}

function getLocalDateString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

const MOOD_OPTIONS: { value: SessionMood; label: string; emoji: string }[] = [
  { value: 'great', label: 'Great', emoji: '🔥' },
  { value: 'good',  label: 'Good',  emoji: '👍' },
  { value: 'meh',   label: 'Meh',   emoji: '😐' },
  { value: 'grind', label: 'Grind', emoji: '😤' },
];

// ── Pill (always-visible indicator when session is active) ────────────────────

interface ActivePillProps {
  timer: SessionTimerApi;
  onClick: () => void;
}

function ActivePill({ timer, onClick }: ActivePillProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/15 border border-emerald-500/30 rounded-full text-emerald-400 hover:bg-emerald-500/25 transition-all text-sm font-medium"
      title="Active session — tap to manage"
    >
      {/* Pulsing dot */}
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
      </span>
      <span className="hidden sm:inline max-w-[120px] truncate text-xs">{timer.gameName}</span>
      <span className="text-xs tabular-nums text-emerald-300 font-mono">{formatClock(timer.elapsedSeconds)}</span>
    </button>
  );
}

// ── Game Picker ───────────────────────────────────────────────────────────────

interface GamePickerProps {
  games: Game[];
  onSelect: (game: Game) => void;
  onCancel: () => void;
}

function GamePicker({ games, onSelect, onCancel }: GamePickerProps) {
  const [search, setSearch] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => searchRef.current?.focus(), 100);
  }, []);

  const sorted = useMemo(() => {
    return [...games]
      .filter(g => g.status !== 'Wishlist')
      .sort((a, b) => {
        const aDate = a.playLogs?.[0]?.date ? parseLocalDate(a.playLogs[0].date).getTime() : 0;
        const bDate = b.playLogs?.[0]?.date ? parseLocalDate(b.playLogs[0].date).getTime() : 0;
        return bDate - aDate;
      });
  }, [games]);

  const filtered = search.trim()
    ? sorted.filter(g => g.name.toLowerCase().includes(search.toLowerCase()))
    : sorted;

  const STATUS_DOT: Record<string, string> = {
    'In Progress': 'bg-blue-400',
    'Not Started': 'bg-white/20',
    'Completed':   'bg-emerald-400',
    'Abandoned':   'bg-red-400',
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-5 pt-5 pb-4">
        <div>
          <h2 className="text-lg font-bold text-white">Start Session</h2>
          <p className="text-xs text-white/40 mt-0.5">Which game are you playing?</p>
        </div>
        <button onClick={onCancel} className="p-2 text-white/40 hover:text-white/70 transition-colors">
          <X size={18} />
        </button>
      </div>

      {/* Search */}
      <div className="px-5 mb-3">
        <div className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-xl border border-white/8">
          <Search size={14} className="text-white/30 flex-shrink-0" />
          <input
            ref={searchRef}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search games…"
            className="flex-1 bg-transparent text-sm text-white/80 placeholder-white/25 outline-none"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-white/30 hover:text-white/60">
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Game list */}
      <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-1.5">
        {filtered.length === 0 ? (
          <div className="text-center py-10 text-white/30 text-sm">
            {games.filter(g => g.status !== 'Wishlist').length === 0
              ? 'Add some games to your library first'
              : 'No games match your search'}
          </div>
        ) : (
          filtered.map(game => (
            <button
              key={game.id}
              onClick={() => onSelect(game)}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 hover:border-white/10 transition-all group text-left"
            >
              {game.thumbnail ? (
                <img src={game.thumbnail} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                  <Gamepad2 size={18} className="text-white/30" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white/85 truncate">{game.name}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={clsx('w-1.5 h-1.5 rounded-full', STATUS_DOT[game.status] ?? 'bg-white/20')} />
                  <span className="text-xs text-white/35">{game.status}</span>
                  {game.playLogs && game.playLogs.length > 0 && (
                    <>
                      <span className="text-white/20">·</span>
                      <span className="text-xs text-white/35">{game.playLogs.length} session{game.playLogs.length !== 1 ? 's' : ''}</span>
                    </>
                  )}
                </div>
              </div>
              <ChevronRight size={14} className="text-white/20 group-hover:text-white/40 flex-shrink-0 transition-colors" />
            </button>
          ))
        )}
      </div>
    </div>
  );
}

// ── Active Session View ───────────────────────────────────────────────────────

interface ActiveViewProps {
  timer: SessionTimerApi;
  onStop: (hours: number, gameId: string, gameName: string, thumbnail?: string) => void;
  onAbandon: () => void;
}

function ActiveView({ timer, onStop, onAbandon }: ActiveViewProps) {
  const handleStop = () => {
    // Capture identity before stop() clears state
    const gameId = timer.gameId ?? '';
    const gameName = timer.gameName ?? '';
    const thumbnail = timer.gameThumbnail;
    const hours = timer.stop();
    onStop(hours, gameId, gameName, thumbnail);
  };

  const handleAbandon = () => {
    if (window.confirm('Abandon this session? Time will not be logged.')) {
      timer.abandon();
      onAbandon();
    }
  };

  return (
    <div className="flex flex-col items-center px-6 pt-6 pb-8 h-full">
      {/* Game info */}
      <div className="flex items-center gap-3 mb-8 w-full">
        {timer.gameThumbnail ? (
          <img src={timer.gameThumbnail} alt="" className="w-14 h-14 rounded-xl object-cover shadow-lg" />
        ) : (
          <div className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center">
            <Gamepad2 size={24} className="text-white/30" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-white/40 uppercase tracking-wider mb-0.5">Now playing</p>
          <p className="text-base font-bold text-white/90 truncate">{timer.gameName}</p>
        </div>
        {/* Status indicator */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
          <span className="relative flex h-1.5 w-1.5">
            {timer.isRunning && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            )}
            <span className={clsx('relative inline-flex rounded-full h-1.5 w-1.5', timer.isRunning ? 'bg-emerald-400' : 'bg-yellow-400')} />
          </span>
          <span className={clsx('text-xs font-medium', timer.isRunning ? 'text-emerald-400' : 'text-yellow-400')}>
            {timer.isRunning ? 'Running' : 'Paused'}
          </span>
        </div>
      </div>

      {/* Clock */}
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div
            className={clsx(
              'text-6xl sm:text-7xl font-mono font-bold tracking-tighter tabular-nums transition-colors',
              timer.isRunning ? 'text-white' : 'text-white/50',
            )}
          >
            {formatClock(timer.elapsedSeconds)}
          </div>
          <p className="text-sm text-white/30 mt-3">
            {timer.isRunning ? 'Session in progress' : 'Paused — tap Resume to continue'}
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="w-full space-y-3">
        <div className="flex gap-3">
          <button
            onClick={timer.isPaused ? timer.resume : timer.pause}
            className={clsx(
              'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-sm transition-all',
              timer.isPaused
                ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30'
                : 'bg-white/8 text-white/60 hover:bg-white/12 border border-white/8',
            )}
          >
            {timer.isPaused ? <Play size={16} /> : <Pause size={16} />}
            {timer.isPaused ? 'Resume' : 'Pause'}
          </button>
          <button
            onClick={handleStop}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-purple-600 text-white hover:bg-purple-500 font-medium text-sm transition-all border border-purple-500/30"
          >
            <Square size={14} fill="currentColor" />
            Stop &amp; Log
          </button>
        </div>
        <button
          onClick={handleAbandon}
          className="w-full py-2 text-xs text-white/25 hover:text-white/50 transition-colors"
        >
          Abandon session (don&apos;t log)
        </button>
      </div>
    </div>
  );
}

// ── Log Confirmation View ─────────────────────────────────────────────────────

interface ConfirmViewProps {
  gameId: string;
  gameName: string;
  gameThumbnail?: string;
  hours: number;
  onConfirm: (hours: number, mood?: SessionMood, note?: string) => Promise<void>;
  onDiscard: () => void;
}

function ConfirmView({ gameId, gameName, gameThumbnail, hours, onConfirm, onDiscard }: ConfirmViewProps) {
  const [note, setNote] = useState('');
  const [mood, setMood] = useState<SessionMood | undefined>();
  const [customHours, setCustomHours] = useState(parseFloat(hours.toFixed(2)));
  const [saving, setSaving] = useState(false);

  const handleConfirm = async () => {
    setSaving(true);
    try {
      await onConfirm(customHours, mood, note.trim() || undefined);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col px-5 pt-5 pb-6 h-full">
      <div className="flex items-center gap-3 mb-6">
        {gameThumbnail ? (
          <img src={gameThumbnail} alt="" className="w-12 h-12 rounded-xl object-cover" />
        ) : (
          <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
            <Gamepad2 size={20} className="text-white/30" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-white/40 uppercase tracking-wider">Log session</p>
          <p className="text-sm font-bold text-white/90 truncate">{gameName}</p>
        </div>
        <div className="flex items-center gap-1.5 text-emerald-400">
          <CheckCircle size={16} />
          <span className="text-sm font-semibold">{formatHours(hours)}</span>
        </div>
      </div>

      {/* Hours adjuster */}
      <div className="mb-4">
        <label className="text-xs text-white/40 uppercase tracking-wider mb-2 block">Hours</label>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCustomHours(h => Math.max(0.01, parseFloat((h - 0.25).toFixed(2))))}
            className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/5 text-white/60 hover:bg-white/10 text-lg font-medium transition-all"
          >
            −
          </button>
          <input
            type="number"
            min="0.01"
            step="0.25"
            value={customHours}
            onChange={e => setCustomHours(parseFloat(e.target.value) || 0)}
            className="flex-1 text-center py-2 px-3 bg-white/5 border border-white/10 rounded-xl text-white/90 text-sm outline-none focus:border-purple-500/50"
          />
          <button
            onClick={() => setCustomHours(h => parseFloat((h + 0.25).toFixed(2)))}
            className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/5 text-white/60 hover:bg-white/10 text-lg font-medium transition-all"
          >
            +
          </button>
        </div>
      </div>

      {/* Mood */}
      <div className="mb-4">
        <label className="text-xs text-white/40 uppercase tracking-wider mb-2 block">How was it?</label>
        <div className="flex gap-2">
          {MOOD_OPTIONS.map(m => (
            <button
              key={m.value}
              onClick={() => setMood(prev => prev === m.value ? undefined : m.value)}
              className={clsx(
                'flex-1 flex flex-col items-center gap-1 py-2 rounded-xl border text-xs transition-all',
                mood === m.value
                  ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                  : 'bg-white/[0.03] border-white/8 text-white/40 hover:bg-white/[0.06] hover:text-white/60',
              )}
            >
              <span className="text-base">{m.emoji}</span>
              <span>{m.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Note */}
      <div className="mb-6">
        <label className="text-xs text-white/40 uppercase tracking-wider mb-2 block">Note (optional)</label>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="How was the session? Any highlights?"
          rows={2}
          className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/8 rounded-xl text-sm text-white/80 placeholder-white/25 outline-none focus:border-purple-500/40 resize-none"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 mt-auto">
        <button
          onClick={onDiscard}
          className="flex-1 py-3 rounded-xl bg-white/5 text-white/50 hover:bg-white/8 text-sm font-medium transition-all"
        >
          Discard
        </button>
        <button
          onClick={handleConfirm}
          disabled={saving || customHours <= 0}
          className="flex-1 py-3 rounded-xl bg-purple-600 text-white hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-all"
        >
          {saving ? 'Logging…' : 'Log Session'}
        </button>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

type ModalView = 'picker' | 'active' | 'confirm';

interface PendingLog {
  gameId: string;
  gameName: string;
  gameThumbnail?: string;
  hours: number;
}

export function SessionTimer({ timer, games, onSessionLogged }: SessionTimerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<ModalView>('picker');
  const [pendingLog, setPendingLog] = useState<PendingLog | null>(null);

  const handleOpen = () => {
    setView(timer.isActive ? 'active' : 'picker');
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    setPendingLog(null);
  };

  const handleSelectGame = (game: Game) => {
    timer.start(game.id, game.name, game.thumbnail);
    setView('active');
  };

  const handleStop = (hours: number, gameId: string, gameName: string, thumbnail?: string) => {
    setPendingLog({ gameId, gameName, gameThumbnail: thumbnail, hours });
    setView('confirm');
  };

  const handleSessionLogged = async (hours: number, mood?: SessionMood, note?: string) => {
    if (!pendingLog) return;
    await onSessionLogged(pendingLog.gameId, hours, mood, note);
    setPendingLog(null);
    setIsOpen(false);
  };

  const handleDiscard = () => {
    setPendingLog(null);
    setIsOpen(false);
  };

  const handleAbandon = () => {
    setIsOpen(false);
  };

  return (
    <>
      {/* Header trigger */}
      {timer.isActive ? (
        <ActivePill timer={timer} onClick={handleOpen} />
      ) : (
        <button
          onClick={handleOpen}
          className="flex items-center gap-1.5 px-3 py-2 bg-white/5 text-white/55 hover:text-white/80 hover:bg-white/8 rounded-lg transition-all text-sm"
          title="Start a gaming session timer"
        >
          <Timer size={14} />
          <span className="hidden sm:inline text-[12px]">Track</span>
        </button>
      )}

      {/* Modal overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

          {/* Sheet */}
          <div className="relative z-10 w-full sm:max-w-md bg-[#131320] border border-white/10 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
            {/* Drag handle (mobile) */}
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1 rounded-full bg-white/15" />
            </div>

            {/* Modal height */}
            <div className="h-[520px] sm:h-[500px] flex flex-col">
              {view === 'picker' && (
                <GamePicker
                  games={games}
                  onSelect={handleSelectGame}
                  onCancel={handleClose}
                />
              )}
              {view === 'active' && (
                <>
                  <div className="flex justify-end px-4 pt-4">
                    <button onClick={handleClose} className="p-1 text-white/30 hover:text-white/60 transition-colors">
                      <X size={16} />
                    </button>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <ActiveView
                      timer={timer}
                      onStop={handleStop}
                      onAbandon={handleAbandon}
                    />
                  </div>
                </>
              )}
              {view === 'confirm' && pendingLog && (
                <ConfirmView
                  gameId={pendingLog.gameId}
                  gameName={pendingLog.gameName}
                  gameThumbnail={pendingLog.gameThumbnail}
                  hours={pendingLog.hours}
                  onConfirm={handleSessionLogged}
                  onDiscard={handleDiscard}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
