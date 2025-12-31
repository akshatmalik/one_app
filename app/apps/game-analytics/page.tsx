'use client';

import { useState, useEffect } from 'react';
import { Plus, Sparkles, Gamepad2, Clock, DollarSign, Star, TrendingUp, Eye, Trophy, Flame, Target } from 'lucide-react';
import { useGames } from './hooks/useGames';
import { useAnalytics, GameWithMetrics } from './hooks/useAnalytics';
import { GameForm } from './components/GameForm';
import { Game, GameStatus } from './lib/types';
import { gameRepository } from './lib/storage';
import { BASELINE_GAMES_2025 } from './data/baseline-games';
import { useAuthContext } from '@/lib/AuthContext';
import { useToast } from '@/components/Toast';
import clsx from 'clsx';

type ViewMode = 'all' | 'owned' | 'wishlist';

export default function GameAnalyticsPage() {
  const { user, loading: authLoading } = useAuthContext();
  const { showToast } = useToast();
  const { games, loading, error, addGame, updateGame, deleteGame, refresh } = useGames(user?.uid ?? null);
  const { gamesWithMetrics, summary } = useAnalytics(games);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<GameWithMetrics | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('all');

  const handleAddGame = async (gameData: Omit<Game, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    try {
      if (editingGame) {
        await updateGame(editingGame.id, gameData);
        setEditingGame(null);
        showToast('Game updated', 'success');
      } else {
        await addGame(gameData);
        showToast('Game added', 'success');
      }
      setIsFormOpen(false);
    } catch (e) {
      showToast(`Failed to save game: ${(e as Error).message}`, 'error');
    }
  };

  const handleEdit = (game: GameWithMetrics) => {
    setEditingGame(game);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingGame(null);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteGame(id);
      showToast('Game deleted', 'success');
    } catch (e) {
      showToast(`Failed to delete game: ${(e as Error).message}`, 'error');
    }
  };

  const handleSeedData = async () => {
    try {
      gameRepository.setUserId(user?.uid || 'local-user');
      for (const gameData of BASELINE_GAMES_2025) {
        await gameRepository.create(gameData);
      }
      showToast('Sample games loaded', 'success');
      await refresh();
    } catch (e) {
      showToast(`Failed to seed data: ${(e as Error).message}`, 'error');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-[calc(100vh-60px)] flex items-center justify-center">
        <p className="text-white/30">Loading...</p>
      </div>
    );
  }

  const filteredGames = gamesWithMetrics.filter(g => {
    if (viewMode === 'owned') return g.status !== 'Wishlist';
    if (viewMode === 'wishlist') return g.status === 'Wishlist';
    return true;
  });

  const getStatusColor = (status: GameStatus) => {
    switch (status) {
      case 'Completed': return 'bg-emerald-500/20 text-emerald-400';
      case 'In Progress': return 'bg-blue-500/20 text-blue-400';
      case 'Not Started': return 'bg-white/10 text-white/50';
      case 'Wishlist': return 'bg-purple-500/20 text-purple-400';
      case 'Abandoned': return 'bg-red-500/20 text-red-400';
      default: return 'bg-white/10 text-white/50';
    }
  };

  const getValueColor = (rating: string) => {
    switch (rating) {
      case 'Excellent': return 'text-emerald-400';
      case 'Good': return 'text-blue-400';
      case 'Fair': return 'text-yellow-400';
      case 'Poor': return 'text-red-400';
      default: return 'text-white/50';
    }
  };

  return (
    <div className="min-h-[calc(100vh-60px)] flex flex-col">
      {/* Header */}
      <div className="px-6 pt-8 pb-6 border-b border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">Games</h1>
              <p className="text-white/40 text-sm mt-1">Track your library and analyze value</p>
            </div>
            <div className="flex items-center gap-2">
              {games.length === 0 && (
                <button
                  onClick={handleSeedData}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-purple-400 hover:text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 rounded-lg transition-all"
                >
                  <Sparkles size={14} />
                  Load Samples
                </button>
              )}
              <button
                onClick={() => setIsFormOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-all text-sm font-medium"
              >
                <Plus size={16} />
                Add Game
              </button>
            </div>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <StatCard icon={<Gamepad2 size={16} />} label="Games" value={summary.gameCount} />
            <StatCard icon={<DollarSign size={16} />} label="Spent" value={`$${summary.totalSpent.toFixed(0)}`} />
            <StatCard icon={<Clock size={16} />} label="Hours" value={summary.totalHours.toFixed(0)} />
            <StatCard icon={<TrendingUp size={16} />} label="$/Hour" value={`$${summary.averageCostPerHour.toFixed(2)}`} />
            <StatCard icon={<Star size={16} />} label="Avg Rating" value={summary.averageRating.toFixed(1)} />
            <StatCard icon={<Eye size={16} />} label="Wishlist" value={summary.wishlistCount} accent />
          </div>

          {/* Highlights */}
          {(summary.bestValue || summary.mostPlayed || summary.highestRated) && (
            <div className="mt-4 flex flex-wrap gap-3">
              {summary.bestValue && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 rounded-lg">
                  <Trophy size={14} className="text-emerald-400" />
                  <span className="text-xs text-white/60">Best Value:</span>
                  <span className="text-xs text-emerald-400 font-medium">{summary.bestValue.name}</span>
                  <span className="text-xs text-white/40">${summary.bestValue.costPerHour.toFixed(2)}/hr</span>
                </div>
              )}
              {summary.mostPlayed && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 rounded-lg">
                  <Flame size={14} className="text-blue-400" />
                  <span className="text-xs text-white/60">Most Played:</span>
                  <span className="text-xs text-blue-400 font-medium">{summary.mostPlayed.name}</span>
                  <span className="text-xs text-white/40">{summary.mostPlayed.hours}h</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="px-6 py-3">
          <div className="max-w-6xl mx-auto">
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2 text-sm text-red-400">
              {error.message}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 px-6 py-6">
        <div className="max-w-6xl mx-auto">
          {/* View Mode Tabs */}
          <div className="flex items-center gap-1 mb-6 bg-white/[0.02] rounded-lg p-1 w-fit">
            {(['all', 'owned', 'wishlist'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={clsx(
                  'px-4 py-1.5 rounded-md text-sm font-medium transition-all capitalize',
                  viewMode === mode
                    ? 'bg-white/10 text-white'
                    : 'text-white/40 hover:text-white/60'
                )}
              >
                {mode}
              </button>
            ))}
          </div>

          {games.length === 0 ? (
            <div className="text-center py-16">
              <Gamepad2 size={48} className="mx-auto mb-4 text-white/10" />
              <p className="text-white/30 text-sm">No games in your library</p>
              <p className="text-white/20 text-xs mt-1">Add a game or load sample data to get started</p>
            </div>
          ) : filteredGames.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-white/30 text-sm">No games in this category</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredGames.map((game) => (
                <div
                  key={game.id}
                  onClick={() => handleEdit(game)}
                  className="group p-4 bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 hover:border-white/10 rounded-xl cursor-pointer transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-white/90 font-medium truncate">{game.name}</h3>
                        <span className={clsx('text-[10px] px-2 py-0.5 rounded-full font-medium', getStatusColor(game.status))}>
                          {game.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-white/40">
                        {game.platform && <span>{game.platform}</span>}
                        {game.genre && <span>{game.genre}</span>}
                        {game.hours > 0 && <span>{game.hours}h played</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-6 text-right">
                      <div>
                        <div className="text-white/80 font-medium">${game.price}</div>
                        {game.hours > 0 && (
                          <div className={clsx('text-xs', getValueColor(game.metrics.valueRating))}>
                            ${game.metrics.costPerHour.toFixed(2)}/hr
                          </div>
                        )}
                      </div>
                      <div className="w-12">
                        <div className="text-white/80 font-medium">{game.rating}/10</div>
                        <div className="text-xs text-white/40">rating</div>
                      </div>
                      {game.hours > 0 && (
                        <div className="w-16 hidden sm:block">
                          <div className="text-white/80 font-medium">{game.metrics.blendScore.toFixed(0)}</div>
                          <div className="text-xs text-white/40">blend</div>
                        </div>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(game.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-2 text-white/30 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Game Form Modal */}
      {isFormOpen && (
        <GameForm
          onSubmit={handleAddGame}
          onClose={handleCloseForm}
          initialGame={editingGame || undefined}
        />
      )}
    </div>
  );
}

function StatCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string | number; accent?: boolean }) {
  return (
    <div className={clsx(
      'p-3 rounded-xl border transition-all',
      accent
        ? 'bg-purple-500/10 border-purple-500/20'
        : 'bg-white/[0.02] border-white/5'
    )}>
      <div className="flex items-center gap-2 mb-1">
        <span className={accent ? 'text-purple-400' : 'text-white/40'}>{icon}</span>
        <span className="text-xs text-white/40">{label}</span>
      </div>
      <div className={clsx('text-lg font-semibold', accent ? 'text-purple-400' : 'text-white/90')}>
        {value}
      </div>
    </div>
  );
}
