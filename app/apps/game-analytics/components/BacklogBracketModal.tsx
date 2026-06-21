'use client';

import { useState } from 'react';
import { X, Crown, Gamepad2, Trophy, ListPlus, Play, RotateCcw, History } from 'lucide-react';
import clsx from 'clsx';
import { Game } from '../lib/types';
import { BRACKET_SIZES, BracketSize, useBacklogBracket } from '../hooks/useBacklogBracket';

interface BacklogBracketModalProps {
  games: Game[];
  userId: string;
  onClose: () => void;
  onStartGame: (gameId: string) => Promise<void>;
  onAddToQueue: (gameId: string) => Promise<void>;
}

function GameThumb({ game, size = 'w-20 h-20' }: { game: Game; size?: string }) {
  return (
    <div className={clsx(size, 'rounded-xl overflow-hidden bg-white/5 flex-shrink-0')}>
      {game.thumbnail ? (
        <img src={game.thumbnail} alt={game.name} className="w-full h-full object-cover" loading="lazy" />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <Gamepad2 size={24} className="text-white/20" />
        </div>
      )}
    </div>
  );
}

export function BacklogBracketModal({ games, userId, onClose, onStartGame, onAddToQueue }: BacklogBracketModalProps) {
  const { eligibleGames, active, history, currentMatch, roundLabel, champion, startBracket, pickWinner, cancelBracket, gamesById } =
    useBacklogBracket(games, userId);

  const [pickedId, setPickedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const handlePick = (winnerId: string) => {
    if (pickedId) return;
    setPickedId(winnerId);
    setTimeout(() => {
      pickWinner(winnerId);
      setPickedId(null);
    }, 380);
  };

  const handleStartPlaying = async () => {
    if (!champion) return;
    setBusy(true);
    try {
      await onStartGame(champion.id);
      cancelBracket();
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const handleAddToQueue = async () => {
    if (!champion) return;
    setBusy(true);
    try {
      await onAddToQueue(champion.id);
      cancelBracket();
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const fieldSizeUnavailable = eligibleGames.length < 4;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#12121a] border border-white/10 rounded-2xl max-w-sm w-full p-5 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Crown size={18} className="text-amber-400" />
            <h2 className="text-base font-semibold text-white">Backlog Bracket</h2>
          </div>
          <button onClick={onClose} className="p-1 text-white/40 hover:text-white/80 transition-colors" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* ── No active bracket: setup screen ──────────────────────── */}
        {!active && (
          <>
            {fieldSizeUnavailable ? (
              <div className="py-10 text-center">
                <Trophy size={32} className="mx-auto mb-3 text-white/20" />
                <p className="text-sm text-white/70 font-medium">Need at least 4 backlog games.</p>
                <p className="text-xs text-white/40 mt-1">Add a few more games to run a bracket.</p>
              </div>
            ) : (
              <>
                <p className="text-xs text-white/50 leading-relaxed mb-4">
                  Can&apos;t decide what to play next? Seed a single-elimination bracket from your backlog —
                  weighted toward the games that have been waiting longest — and tap your way to a champion.
                </p>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {BRACKET_SIZES.map(size => {
                    const disabled = eligibleGames.length < Math.min(size, 4);
                    return (
                      <button
                        key={size}
                        disabled={disabled}
                        onClick={() => startBracket(size as BracketSize)}
                        className={clsx(
                          'flex flex-col items-center gap-1 py-3 rounded-xl border transition-all active:scale-95',
                          disabled
                            ? 'border-white/5 text-white/20 cursor-not-allowed'
                            : 'border-amber-500/20 bg-amber-500/5 text-amber-300 hover:bg-amber-500/15'
                        )}
                      >
                        <span className="text-lg font-bold">{size}</span>
                        <span className="text-[10px] text-white/40">games</span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-white/25 text-center mb-2">
                  {eligibleGames.length} backlog game{eligibleGames.length === 1 ? '' : 's'} eligible. Smaller fields are used if you don&apos;t have enough.
                </p>
              </>
            )}

            {history.length > 0 && (
              <div className="mt-2 border-t border-white/5 pt-3">
                <button
                  onClick={() => setShowHistory(v => !v)}
                  className="w-full flex items-center justify-between text-xs text-white/40 hover:text-white/60 transition-colors"
                >
                  <span className="flex items-center gap-1.5"><History size={13} /> Hall of Champions ({history.length})</span>
                  <span>{showHistory ? '−' : '+'}</span>
                </button>
                {showHistory && (
                  <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto">
                    {history.map(h => (
                      <div key={h.id} className="flex items-center justify-between text-xs bg-white/[0.02] rounded-lg px-3 py-2">
                        <span className="text-white/70 truncate">{h.championName}</span>
                        <span className="text-white/25 text-[10px] flex-shrink-0 ml-2">{h.size}-game bracket</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ── Champion screen ───────────────────────────────────────── */}
        {active && champion && (
          <div className="py-4 text-center">
            <div className="trophy-toast-bounce inline-block mb-3">
              <Crown size={40} className="text-amber-400 mx-auto" />
            </div>
            <p className="text-[11px] uppercase tracking-wide text-amber-400/70 font-semibold mb-3">Champion</p>
            <div className="flex justify-center mb-3">
              <GameThumb game={champion} size="w-28 h-28" />
            </div>
            <p className="text-lg font-bold text-white mb-1">{champion.name}</p>
            <p className="text-xs text-white/40 mb-6">Won a {active.size}-game bracket</p>

            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                onClick={handleStartPlaying}
                disabled={busy}
                className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 active:scale-95 transition-all disabled:opacity-40"
              >
                <Play size={18} />
                <span className="text-[11px] font-medium">Start Playing</span>
              </button>
              <button
                onClick={handleAddToQueue}
                disabled={busy}
                className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 active:scale-95 transition-all disabled:opacity-40"
              >
                <ListPlus size={18} />
                <span className="text-[11px] font-medium">Add to Up Next</span>
              </button>
            </div>
            <button
              onClick={() => { cancelBracket(); }}
              className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-white/30 hover:text-white/50 transition-colors"
            >
              <RotateCcw size={12} /> Run another bracket
            </button>
          </div>
        )}

        {/* ── In-progress round screen ─────────────────────────────── */}
        {active && !champion && currentMatch && (() => {
          const gameA = currentMatch.gameAId ? gamesById.get(currentMatch.gameAId) : undefined;
          const gameB = currentMatch.gameBId ? gamesById.get(currentMatch.gameBId) : undefined;
          if (!gameA || !gameB) return null;
          const totalRounds = Math.log2(active.size);
          return (
            <>
              <div className="flex items-center justify-between text-[11px] text-white/40 mb-3">
                <span>{roundLabel}</span>
                <span>Round {active.currentRound + 1} of {totalRounds}</span>
              </div>

              <div className="relative mb-4">
                <div className="grid grid-cols-2 gap-3">
                  {[gameA, gameB].map(g => {
                    const isWinner = pickedId === g.id;
                    const isLoser = pickedId !== null && pickedId !== g.id;
                    return (
                      <button
                        key={g.id}
                        onClick={() => handlePick(g.id)}
                        disabled={pickedId !== null}
                        className={clsx(
                          'relative flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all duration-200',
                          'bg-white/[0.02] border-white/10',
                          pickedId === null && 'hover:bg-white/[0.06] hover:border-amber-400/40 active:scale-[0.97]',
                          isWinner && 'border-emerald-400/50 bg-emerald-500/[0.08] scale-[1.02]',
                          isLoser && 'opacity-30 scale-[0.97]'
                        )}
                      >
                        <GameThumb game={g} />
                        <p className="text-xs font-semibold text-white/90 text-center leading-snug line-clamp-2">{g.name}</p>
                        {(g.genre || g.platform) && (
                          <span className="text-[10px] text-white/30 text-center truncate w-full">
                            {[g.genre, g.platform].filter(Boolean).join(' · ')}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                  <div className="w-9 h-9 rounded-full bg-[#1a1a2e] border-2 border-white/10 flex items-center justify-center">
                    <span className="text-[11px] font-black text-white/50">VS</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => cancelBracket()}
                className="w-full py-2 text-[11px] text-white/25 hover:text-white/40 transition-colors"
              >
                Cancel bracket
              </button>
            </>
          );
        })()}
      </div>
    </div>
  );
}
