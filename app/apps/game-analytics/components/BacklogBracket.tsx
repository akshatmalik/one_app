'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { Crown, Filter, Gamepad2, X, Swords, RotateCcw, ListPlus, Eye, History } from 'lucide-react';
import { Game } from '../lib/types';
import { GameWithMetrics } from '../hooks/useAnalytics';
import { getPickerFilterOptions, RandomPickerFilters, getGameChemistry, getTotalHours } from '../lib/calculations';
import clsx from 'clsx';

interface BacklogBracketProps {
  games: Game[];
  gamesWithMetrics: GameWithMetrics[];
  onClose: () => void;
  onStartGame: (game: Game) => void;
  onAddToQueue: (gameId: string) => void;
  onViewDetails: (game: GameWithMetrics) => void;
  isInQueue: (gameId: string) => boolean;
}

const HISTORY_KEY = 'game-analytics-bracket-history';
const HISTORY_LIMIT = 5;
const BRACKET_SIZES = [4, 8, 16];

interface BracketHistoryEntry {
  id: string;
  name: string;
  date: string;
}

function loadHistory(): BracketHistoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(entries: BracketHistoryEntry[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, HISTORY_LIMIT)));
}

// Standard single-elimination seeding: avoids top seeds meeting until later rounds.
function seedOrder(n: number): number[] {
  let seeds = [1, 2];
  while (seeds.length < n) {
    const m = seeds.length * 2 + 1;
    const next: number[] = [];
    for (const s of seeds) next.push(s, m - s);
    seeds = next;
  }
  return seeds;
}

function roundName(gamesInRound: number): string {
  if (gamesInRound <= 2) return 'Final';
  if (gamesInRound === 4) return 'Semifinal';
  if (gamesInRound === 8) return 'Quarterfinal';
  return `Round of ${gamesInRound}`;
}

type Phase = 'setup' | 'playing' | 'champion';

export function BacklogBracket({ games, gamesWithMetrics, onClose, onStartGame, onAddToQueue, onViewDetails, isInQueue }: BacklogBracketProps) {
  const [phase, setPhase] = useState<Phase>('setup');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<RandomPickerFilters>({
    includeNotStarted: true,
    includeInProgress: true,
  });
  const [bracketSize, setBracketSize] = useState(8);
  const [bracket, setBracket] = useState<Game[]>([]);
  const [round, setRound] = useState<Game[]>([]);
  const [nextRound, setNextRound] = useState<Game[]>([]);
  const [matchIdx, setMatchIdx] = useState(0);
  const [flashId, setFlashId] = useState<string | null>(null);
  const [champion, setChampion] = useState<Game | null>(null);
  const [history, setHistory] = useState<BracketHistoryEntry[]>([]);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  const filterOptions = useMemo(() => getPickerFilterOptions(games), [games]);

  const eligible = useMemo(() => {
    let candidates = games.filter(g => g.status === 'Not Started' || g.status === 'In Progress');
    if (filters.includeNotStarted === false) candidates = candidates.filter(g => g.status !== 'Not Started');
    if (filters.includeInProgress === false) candidates = candidates.filter(g => g.status !== 'In Progress');
    if (filters.genre) candidates = candidates.filter(g => g.genre === filters.genre);
    if (filters.platform) candidates = candidates.filter(g => g.platform === filters.platform);
    return candidates;
  }, [games, filters]);

  const availableSizes = BRACKET_SIZES.filter(size => size <= eligible.length);

  const startBracket = useCallback((size: number) => {
    // Seed by chemistry score so closer matches happen early, blowouts happen late.
    const ranked = [...eligible]
      .map(g => ({ game: g, score: getGameChemistry(g, games).score }))
      .sort((a, b) => b.score - a.score)
      .slice(0, size)
      .map(r => r.game);

    const order = seedOrder(size);
    const seeded = order.map(seedNum => ranked[seedNum - 1]);

    setBracket(seeded);
    setRound(seeded);
    setNextRound([]);
    setMatchIdx(0);
    setChampion(null);
    setPhase('playing');
  }, [eligible, games]);

  const pick = useCallback((winner: Game, loser: Game) => {
    setFlashId(winner.id);
    setTimeout(() => {
      const updatedNext = [...nextRound, winner];
      const isLastMatchInRound = matchIdx + 2 >= round.length;

      if (isLastMatchInRound) {
        if (updatedNext.length === 1) {
          setChampion(updatedNext[0]);
          const entry: BracketHistoryEntry = { id: updatedNext[0].id, name: updatedNext[0].name, date: new Date().toISOString() };
          const newHistory = [entry, ...history].slice(0, HISTORY_LIMIT);
          setHistory(newHistory);
          saveHistory(newHistory);
          setPhase('champion');
        } else {
          setRound(updatedNext);
          setNextRound([]);
          setMatchIdx(0);
        }
      } else {
        setNextRound(updatedNext);
        setMatchIdx(matchIdx + 2);
      }
      setFlashId(null);
    }, 380);
  }, [nextRound, matchIdx, round, history]);

  const reset = useCallback(() => {
    setPhase('setup');
    setBracket([]);
    setRound([]);
    setNextRound([]);
    setMatchIdx(0);
    setChampion(null);
  }, []);

  const gameA = round[matchIdx];
  const gameB = round[matchIdx + 1];
  const totalMatchesThisRound = Math.floor(round.length / 2);
  const matchNum = Math.floor(matchIdx / 2) + 1;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#12121a] border border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Crown size={20} className="text-amber-400" />
            <h2 className="text-lg font-semibold text-white">Backlog Bracket</h2>
          </div>
          <button onClick={onClose} className="p-1 text-white/40 hover:text-white/80 transition-colors">
            <X size={18} />
          </button>
        </div>

        {phase === 'setup' && (
          <>
            <p className="text-sm text-white/50 mb-4">
              Tournament-bracket your backlog. Pick a winner each round until one game survives.
            </p>

            {/* Filter toggle */}
            <div className="mb-4">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 text-xs text-white/40 hover:text-white/60 transition-colors"
              >
                <Filter size={12} />
                Filters ({eligible.length} eligible)
              </button>

              {showFilters && (
                <div className="mt-2 p-3 bg-white/5 rounded-lg space-y-2">
                  {filterOptions.genres.length > 0 && (
                    <div>
                      <label className="text-[10px] text-white/30 uppercase">Genre</label>
                      <select
                        value={filters.genre || ''}
                        onChange={e => setFilters(f => ({ ...f, genre: e.target.value || undefined }))}
                        className="w-full mt-1 bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white/80"
                      >
                        <option value="">Any Genre</option>
                        {filterOptions.genres.map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </div>
                  )}

                  {filterOptions.platforms.length > 0 && (
                    <div>
                      <label className="text-[10px] text-white/30 uppercase">Platform</label>
                      <select
                        value={filters.platform || ''}
                        onChange={e => setFilters(f => ({ ...f, platform: e.target.value || undefined }))}
                        className="w-full mt-1 bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white/80"
                      >
                        <option value="">Any Platform</option>
                        {filterOptions.platforms.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <label className="flex items-center gap-1.5 text-xs text-white/50">
                      <input
                        type="checkbox"
                        checked={filters.includeNotStarted}
                        onChange={e => setFilters(f => ({ ...f, includeNotStarted: e.target.checked }))}
                        className="rounded bg-white/10 border-white/20"
                      />
                      Not Started
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-white/50">
                      <input
                        type="checkbox"
                        checked={filters.includeInProgress}
                        onChange={e => setFilters(f => ({ ...f, includeInProgress: e.target.checked }))}
                        className="rounded bg-white/10 border-white/20"
                      />
                      In Progress
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Bracket size picker */}
            {availableSizes.length > 0 ? (
              <div className="mb-4">
                <label className="text-[10px] text-white/30 uppercase">Bracket Size</label>
                <div className="flex gap-2 mt-1.5">
                  {BRACKET_SIZES.map(size => (
                    <button
                      key={size}
                      onClick={() => setBracketSize(size)}
                      disabled={size > eligible.length}
                      className={clsx(
                        'flex-1 py-2 rounded-lg text-sm font-medium transition-all',
                        size > eligible.length
                          ? 'bg-white/5 text-white/20 cursor-not-allowed'
                          : bracketSize === size
                            ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300'
                            : 'bg-white/5 border border-white/10 text-white/60 hover:bg-white/10'
                      )}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-red-400/60 text-center mb-4">
                Need at least 4 eligible games to start a bracket.
              </p>
            )}

            {/* Past champions */}
            {history.length > 0 && (
              <div className="mb-4 p-3 bg-white/[0.02] border border-white/5 rounded-lg">
                <div className="flex items-center gap-1.5 text-[10px] text-white/30 uppercase mb-2">
                  <History size={11} /> Past Champions
                </div>
                <div className="space-y-1">
                  {history.map((h, i) => (
                    <div key={`${h.id}-${h.date}`} className="flex items-center justify-between text-xs">
                      <span className="text-white/60 truncate">{i === 0 && <Crown size={10} className="inline text-amber-400 mr-1" />}{h.name}</span>
                      <span className="text-white/25 shrink-0 ml-2">{new Date(h.date).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => startBracket(Math.min(bracketSize, availableSizes[availableSizes.length - 1] || bracketSize))}
              disabled={availableSizes.length === 0}
              className={clsx(
                'w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all text-sm',
                availableSizes.length === 0
                  ? 'bg-white/5 text-white/20 cursor-not-allowed'
                  : 'bg-amber-600 text-white hover:bg-amber-500 active:scale-95'
              )}
            >
              <Swords size={16} />
              Start Bracket
            </button>
          </>
        )}

        {phase === 'playing' && gameA && gameB && (
          <>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs text-white/40">{roundName(round.length)}</span>
              <span className="text-xs text-white/40">Match {matchNum} of {totalMatchesThisRound}</span>
            </div>

            <div className="space-y-3">
              {[gameA, gameB].map(g => (
                <button
                  key={g.id}
                  onClick={() => pick(g, g.id === gameA.id ? gameB : gameA)}
                  disabled={flashId !== null}
                  className={clsx(
                    'w-full p-4 rounded-xl border text-left transition-all flex items-center gap-3',
                    flashId === g.id
                      ? 'bg-emerald-500/20 border-emerald-500/50 scale-[1.02]'
                      : flashId !== null
                        ? 'bg-white/[0.02] border-white/5 opacity-50'
                        : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.06] hover:border-amber-500/30 active:scale-[0.98]'
                  )}
                >
                  {g.thumbnail ? (
                    <img src={g.thumbnail} alt={g.name} className="w-12 h-12 object-cover rounded-lg shrink-0" loading="lazy" />
                  ) : (
                    <div className="w-12 h-12 bg-white/5 rounded-lg shrink-0 flex items-center justify-center">
                      <Gamepad2 size={20} className="text-white/20" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-white text-sm truncate">{g.name}</div>
                    <div className="flex items-center gap-2 text-[11px] text-white/40 mt-0.5">
                      {g.genre && <span>{g.genre}</span>}
                      <span>{getTotalHours(g)}h played</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-4 text-center text-xs text-white/30">
              Tap the one you'd rather play right now
            </div>
          </>
        )}

        {phase === 'champion' && champion && (
          <div className="text-center">
            <div className="trophy-toast-bounce inline-block mb-3">
              <Crown size={40} className="text-amber-400 mx-auto" />
            </div>
            <div className="trophy-toast-sparkle">
              {champion.thumbnail ? (
                <img src={champion.thumbnail} alt={champion.name} className="w-24 h-24 object-cover rounded-xl mx-auto mb-4 trophy-toast-shine" loading="lazy" />
              ) : (
                <div className="w-24 h-24 bg-white/5 rounded-xl mx-auto mb-4 flex items-center justify-center">
                  <Gamepad2 size={36} className="text-white/20" />
                </div>
              )}
            </div>
            <div className="text-xs text-amber-400 uppercase tracking-wider mb-1">Champion</div>
            <h3 className="text-xl font-bold text-white mb-1">{champion.name}</h3>
            <p className="text-xs text-white/40 mb-6">Survived {bracket.length === 4 ? 2 : bracket.length === 8 ? 3 : 4} rounds against {bracket.length - 1} other games</p>

            <div className="space-y-2">
              {champion.status === 'Not Started' && (
                <button
                  onClick={() => { onStartGame(champion); onClose(); }}
                  className="w-full py-3 rounded-xl bg-amber-600 text-white font-medium text-sm hover:bg-amber-500 active:scale-95 transition-all"
                >
                  Start Playing
                </button>
              )}
              {!isInQueue(champion.id) && (
                <button
                  onClick={() => onAddToQueue(champion.id)}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white/10 text-white font-medium text-sm hover:bg-white/15 active:scale-95 transition-all"
                >
                  <ListPlus size={16} /> Add to Up Next
                </button>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const withMetrics = gamesWithMetrics.find(g => g.id === champion.id);
                    if (withMetrics) onViewDetails(withMetrics);
                    onClose();
                  }}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/5 text-white/70 text-sm hover:bg-white/10 transition-all"
                >
                  <Eye size={14} /> View Details
                </button>
                <button
                  onClick={reset}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/5 text-white/70 text-sm hover:bg-white/10 transition-all"
                >
                  <RotateCcw size={14} /> New Bracket
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
