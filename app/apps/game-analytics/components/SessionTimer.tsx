'use client';

import { useState, useMemo, useEffect } from 'react';
import { X, Timer, Play, Pause, Square, Gamepad2, Search, ChevronDown } from 'lucide-react';
import { Game } from '../lib/types';
import { SessionTimerState } from '../hooks/useSessionTimer';
import clsx from 'clsx';

interface SessionTimerProps {
  games: Game[];
  state: SessionTimerState | null;
  onStart: (gameId: string, gameName: string) => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onDiscard: () => void;
}

function formatElapsed(ms: number): string {
  const secs = Math.floor(ms / 1000);
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function SessionTimer({
  games,
  state,
  onStart,
  onPause,
  onResume,
  onStop,
  onDiscard,
}: SessionTimerProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [showExpanded, setShowExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Collapse expanded view when timer is cleared
  useEffect(() => {
    if (!state) setShowExpanded(false);
  }, [state]);

  // Games available to time: owned, not abandoned
  const pickerGames = useMemo(() => {
    const owned = games.filter(
      g => g.status !== 'Wishlist' && g.status !== 'Abandoned'
    );
    const q = searchQuery.trim().toLowerCase();
    const filtered = q
      ? owned.filter(g => g.name.toLowerCase().includes(q) || (g.genre || '').toLowerCase().includes(q))
      : owned;
    return filtered.sort((a, b) => {
      if (a.status === 'In Progress' && b.status !== 'In Progress') return -1;
      if (b.status === 'In Progress' && a.status !== 'In Progress') return 1;
      return a.name.localeCompare(b.name);
    });
  }, [games, searchQuery]);

  const activeGameThumb = state
    ? (games.find(g => g.id === state.gameId)?.thumbnail ?? null)
    : null;

  const handleStart = (game: Game) => {
    onStart(game.id, game.name);
    setShowPicker(false);
    setSearchQuery('');
  };

  const handleStop = () => {
    onStop();
    setShowExpanded(false);
  };

  const handleDiscard = () => {
    if (window.confirm('Discard this session? The time will not be logged.')) {
      onDiscard();
      setShowExpanded(false);
    }
  };

  const elapsedHours = state ? state.elapsedMs / 3_600_000 : 0;
  const hoursLabel = elapsedHours >= 0.1 ? `${elapsedHours.toFixed(1)}h` : '';

  return (
    <>
      {/* ── Floating control pill ── */}
      {!state ? (
        <button
          onClick={() => setShowPicker(true)}
          className="fixed bottom-6 right-4 z-40 flex items-center gap-1.5 px-3 py-2 rounded-full bg-purple-600/80 hover:bg-purple-500/90 text-white text-xs font-semibold shadow-lg shadow-purple-900/40 backdrop-blur-sm transition-all active:scale-95 select-none"
          aria-label="Start a session timer"
        >
          <Timer className="w-3.5 h-3.5" />
          <span>Timer</span>
        </button>
      ) : (
        <button
          onClick={() => setShowExpanded(true)}
          className={clsx(
            'fixed bottom-6 right-4 z-40 flex items-center gap-2 pl-2.5 pr-3 py-2 rounded-full text-white text-xs font-semibold shadow-xl backdrop-blur-sm transition-all active:scale-95 select-none max-w-[200px]',
            state.isRunning
              ? 'bg-emerald-700/90 hover:bg-emerald-600/90 shadow-emerald-900/40'
              : 'bg-amber-700/90 hover:bg-amber-600/90 shadow-amber-900/40'
          )}
          aria-label="Open session timer"
        >
          <span
            className={clsx(
              'w-2 h-2 rounded-full flex-shrink-0',
              state.isRunning ? 'bg-emerald-300 animate-pulse' : 'bg-amber-300'
            )}
          />
          <span className="truncate">{state.gameName}</span>
          <span className="font-mono tabular-nums text-[11px] opacity-90 flex-shrink-0">
            {formatElapsed(state.elapsedMs)}
          </span>
        </button>
      )}

      {/* ── Game picker bottom sheet ── */}
      {showPicker && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm"
          onClick={e => e.target === e.currentTarget && setShowPicker(false)}
        >
          <div className="bg-[#13131a] rounded-t-2xl border-t border-white/10 max-h-[78vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-white/5">
              <div>
                <h3 className="text-sm font-semibold text-white">Start Session Timer</h3>
                <p className="text-[10px] text-white/30 mt-0.5">Choose a game to track</p>
              </div>
              <button
                onClick={() => setShowPicker(false)}
                className="p-1.5 rounded-lg text-white/40 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search */}
            <div className="px-4 py-3 border-b border-white/5">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                <input
                  type="text"
                  placeholder="Search games…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/50 transition-colors"
                  autoFocus
                />
              </div>
            </div>

            {/* Game list */}
            <div className="overflow-y-auto flex-1 pb-8">
              {pickerGames.length === 0 ? (
                <p className="text-center text-white/30 text-sm py-10">
                  {searchQuery ? 'No games match your search' : 'No games to time yet'}
                </p>
              ) : (
                <>
                  {/* In Progress header */}
                  {pickerGames.some(g => g.status === 'In Progress') && (
                    <p className="px-4 pt-3 pb-1 text-[9px] font-bold uppercase tracking-widest text-white/20">
                      Currently playing
                    </p>
                  )}
                  {pickerGames.map((game, i) => {
                    const prevStatus = i > 0 ? pickerGames[i - 1].status : null;
                    const showSeparator =
                      prevStatus === 'In Progress' && game.status !== 'In Progress';
                    return (
                      <div key={game.id}>
                        {showSeparator && (
                          <p className="px-4 pt-3 pb-1 text-[9px] font-bold uppercase tracking-widest text-white/20">
                            Other games
                          </p>
                        )}
                        <button
                          onClick={() => handleStart(game)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 active:bg-white/10 transition-colors text-left"
                        >
                          {game.thumbnail ? (
                            <img
                              src={game.thumbnail}
                              alt=""
                              className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-white/5"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center flex-shrink-0">
                              <Gamepad2 className="w-5 h-5 text-white/20" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white truncate">{game.name}</p>
                            <p className="text-[10px] text-white/30">{game.status}</p>
                          </div>
                          {game.status === 'In Progress' && (
                            <span className="text-[9px] px-1.5 py-0.5 bg-blue-500/15 text-blue-400 rounded-md font-medium flex-shrink-0">
                              Active
                            </span>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Expanded timer overlay ── */}
      {showExpanded && state && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/85 backdrop-blur-md">
          {/* Blurred game art background */}
          {activeGameThumb && (
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: `url(${activeGameThumb})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                filter: 'blur(28px) saturate(0.5)',
              }}
            />
          )}

          <div className="relative z-10 flex flex-col items-center gap-5 w-full max-w-xs px-6">
            {/* Top bar */}
            <div className="flex items-center justify-between w-full">
              <button
                onClick={() => setShowExpanded(false)}
                className="p-2 rounded-full text-white/40 hover:text-white transition-colors"
                aria-label="Collapse"
              >
                <ChevronDown className="w-5 h-5" />
              </button>
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/25">
                Session Timer
              </p>
              <div className="w-9" />
            </div>

            {/* Game art */}
            {activeGameThumb ? (
              <img
                src={activeGameThumb}
                alt={state.gameName}
                className="w-24 h-24 rounded-2xl object-cover shadow-2xl border border-white/10"
              />
            ) : (
              <div className="w-24 h-24 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                <Gamepad2 className="w-12 h-12 text-white/20" />
              </div>
            )}

            {/* Game name */}
            <p className="text-white/60 text-sm font-medium text-center truncate max-w-full px-4">
              {state.gameName}
            </p>

            {/* Clock */}
            <div className="text-center">
              <div className="font-mono text-[64px] font-bold text-white tracking-tight tabular-nums leading-none">
                {formatElapsed(state.elapsedMs)}
              </div>
              <p className="text-[10px] text-white/30 mt-2 uppercase tracking-[0.15em]">
                {state.isRunning ? '● Recording' : '⏸ Paused'}
              </p>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-4">
              {/* Pause / Resume */}
              <button
                onClick={state.isRunning ? onPause : onResume}
                className={clsx(
                  'w-14 h-14 rounded-full border-2 flex items-center justify-center text-white transition-all active:scale-95',
                  state.isRunning
                    ? 'border-white/20 hover:border-white/40'
                    : 'border-amber-400/40 hover:border-amber-400/70'
                )}
                aria-label={state.isRunning ? 'Pause' : 'Resume'}
              >
                {state.isRunning ? (
                  <Pause className="w-6 h-6" />
                ) : (
                  <Play className="w-6 h-6 ml-0.5" />
                )}
              </button>

              {/* Stop & Log */}
              <button
                onClick={handleStop}
                className="flex flex-col items-center justify-center w-24 h-14 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/50 transition-all active:scale-95"
                aria-label="Stop and log session"
              >
                <Square className="w-5 h-5" />
                <span className="text-[10px] font-semibold mt-0.5">
                  {hoursLabel ? `Log ${hoursLabel}` : 'Stop & Log'}
                </span>
              </button>
            </div>

            {/* Discard */}
            <button
              onClick={handleDiscard}
              className="text-xs text-white/20 hover:text-red-400/60 transition-colors py-1"
            >
              Discard session
            </button>
          </div>
        </div>
      )}
    </>
  );
}
