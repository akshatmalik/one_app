'use client';

import { useState, useCallback, useMemo } from 'react';
import { Shuffle, Filter, Gamepad2, Dice5, X } from 'lucide-react';
import { Game } from '../lib/types';
import { getRandomGamePick, getPickerFilterOptions, RandomPickerFilters, getTotalHours, getCompletionProbability } from '../lib/calculations';
import clsx from 'clsx';

interface RandomPickerProps {
  games: Game[];
  onClose: () => void;
}

export function RandomPicker({ games, onClose }: RandomPickerProps) {
  const [picked, setPicked] = useState<Game | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<RandomPickerFilters>({
    includeNotStarted: true,
    includeInProgress: true,
  });

  const filterOptions = useMemo(() => getPickerFilterOptions(games), [games]);
  const candidateCount = useMemo(() => {
    let candidates = games.filter(g => g.status !== 'Wishlist' && g.status !== 'Completed' && g.status !== 'Abandoned');
    if (!filters.includeNotStarted) candidates = candidates.filter(g => g.status !== 'Not Started');
    if (!filters.includeInProgress) candidates = candidates.filter(g => g.status !== 'In Progress');
    if (filters.genre) candidates = candidates.filter(g => g.genre === filters.genre);
    if (filters.platform) candidates = candidates.filter(g => g.platform === filters.platform);
    return candidates.length;
  }, [games, filters]);

  const handleSpin = useCallback(() => {
    setIsSpinning(true);
    setPicked(null);

    // Animate through random games for fun
    let count = 0;
    const interval = setInterval(() => {
      const randomGame = getRandomGamePick(games, filters);
      setPicked(randomGame);
      count++;
      if (count >= 12) {
        clearInterval(interval);
        setIsSpinning(false);
        // Final pick
        const finalPick = getRandomGamePick(games, filters);
        setPicked(finalPick);
      }
    }, 120);
  }, [games, filters]);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#12121a] border border-white/10 rounded-2xl max-w-sm w-full p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Dice5 size={20} className="text-purple-400" />
            <h2 className="text-lg font-semibold text-white">What Should I Play?</h2>
          </div>
          <button onClick={onClose} className="p-1 text-white/40 hover:text-white/80 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Filter toggle */}
        <div className="mb-4">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 text-xs text-white/40 hover:text-white/60 transition-colors"
          >
            <Filter size={12} />
            Filters ({candidateCount} eligible)
          </button>

          {showFilters && (
            <div className="mt-2 p-3 bg-white/5 rounded-lg space-y-2">
              {/* Genre filter */}
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

              {/* Platform filter */}
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

              {/* Status filters */}
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

        {/* Result */}
        <div className={clsx(
          'mb-6 p-5 rounded-xl border text-center transition-all min-h-[180px] flex flex-col items-center justify-center',
          picked
            ? 'bg-gradient-to-br from-purple-500/20 to-blue-500/20 border-purple-500/30'
            : 'bg-white/[0.02] border-white/5',
          isSpinning && 'animate-pulse'
        )}>
          {picked ? (
            <>
              {picked.thumbnail ? (
                <img
                  src={picked.thumbnail}
                  alt={picked.name}
                  className={clsx(
                    'w-16 h-16 object-cover rounded-lg mb-3 transition-transform',
                    isSpinning ? 'scale-90 opacity-60' : 'scale-100'
                  )}
                  loading="lazy"
                />
              ) : (
                <div className="w-16 h-16 bg-white/5 rounded-lg mb-3 flex items-center justify-center">
                  <Gamepad2 size={24} className="text-white/20" />
                </div>
              )}
              <div className={clsx(
                'text-lg font-bold text-white transition-all',
                isSpinning && 'blur-[1px]'
              )}>
                {picked.name}
              </div>
              {!isSpinning && (
                <div className="mt-2 space-y-1">
                  <div className="flex items-center justify-center gap-3 text-xs text-white/40">
                    {picked.genre && <span>{picked.genre}</span>}
                    {picked.platform && <span>{picked.platform}</span>}
                    <span>{getTotalHours(picked)}h played</span>
                  </div>
                  {(picked.status === 'In Progress' || picked.status === 'Not Started') && (
                    <div className="text-xs text-purple-400">
                      {getCompletionProbability(picked, games).probability}% completion chance
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="text-white/20">
              <Shuffle size={32} className="mx-auto mb-2" />
              <p className="text-sm">Press spin to pick a game!</p>
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleSpin}
            disabled={isSpinning || candidateCount === 0}
            className={clsx(
              'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all text-sm',
              isSpinning
                ? 'bg-purple-500/30 text-purple-300 cursor-wait'
                : candidateCount === 0
                  ? 'bg-white/5 text-white/20 cursor-not-allowed'
                  : 'bg-purple-600 text-white hover:bg-purple-500 active:scale-95'
            )}
          >
            <Shuffle size={16} className={clsx(isSpinning && 'animate-spin')} />
            {isSpinning ? 'Spinning...' : picked ? 'Spin Again' : 'Spin!'}
          </button>
        </div>

        {candidateCount === 0 && (
          <p className="text-xs text-red-400/60 text-center mt-2">
            No eligible games match your filters
          </p>
        )}
      </div>
    </div>
  );
}
