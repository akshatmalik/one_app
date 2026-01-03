'use client';

import { useState } from 'react';
import { Plus, Sparkles, Gamepad2, Clock, DollarSign, Star, TrendingUp, Eye, Trophy, Flame, BarChart3, Calendar, List } from 'lucide-react';
import { useGames } from './hooks/useGames';
import { useAnalytics, GameWithMetrics } from './hooks/useAnalytics';
import { useBudget } from './hooks/useBudget';
import { GameForm } from './components/GameForm';
import { PlayLogModal } from './components/PlayLogModal';
import { TimelineView } from './components/TimelineView';
import { StatsView } from './components/StatsView';
import { Game, GameStatus, PlayLog } from './lib/types';
import { gameRepository } from './lib/storage';
import { BASELINE_GAMES_2025 } from './data/baseline-games';
import { useAuthContext } from '@/lib/AuthContext';
import { useToast } from '@/components/Toast';
import { getROIRating } from './lib/calculations';
import clsx from 'clsx';

type ViewMode = 'all' | 'owned' | 'wishlist';
type TabMode = 'games' | 'timeline' | 'stats';

export default function GameAnalyticsPage() {
  const { user, loading: authLoading } = useAuthContext();
  const { showToast } = useToast();
  const { games, loading, error, addGame, updateGame, deleteGame, refresh } = useGames(user?.uid ?? null);
  const { gamesWithMetrics, summary } = useAnalytics(games);
  const { budgets, setBudget } = useBudget(user?.uid ?? null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<GameWithMetrics | null>(null);
  const [playLogGame, setPlayLogGame] = useState<GameWithMetrics | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [tabMode, setTabMode] = useState<TabMode>('games');
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'hours' | 'rating' | 'costPerHour' | 'dateAdded' | 'recentlyPlayed'>('recentlyPlayed');

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

  const handleOpenPlayLog = (game: GameWithMetrics) => {
    setPlayLogGame(game);
  };

  const handleSavePlayLogs = async (playLogs: PlayLog[]) => {
    if (!playLogGame) return;
    const totalHours = playLogs.reduce((sum, log) => sum + log.hours, 0);
    await updateGame(playLogGame.id, {
      playLogs,
      hours: Math.max(playLogGame.hours, totalHours), // Keep manual hours if higher
    });
    setPlayLogGame(null);
    showToast('Play sessions saved', 'success');
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

  const filteredGames = gamesWithMetrics
    .filter(g => {
      if (viewMode === 'owned') return g.status !== 'Wishlist';
      if (viewMode === 'wishlist') return g.status === 'Wishlist';
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'price':
          return b.price - a.price;
        case 'hours':
          return b.hours - a.hours;
        case 'rating':
          return b.rating - a.rating;
        case 'costPerHour':
          // Handle cases where hours might be 0
          const aCost = a.hours > 0 ? a.metrics.costPerHour : Infinity;
          const bCost = b.hours > 0 ? b.metrics.costPerHour : Infinity;
          return aCost - bCost;
        case 'recentlyPlayed':
          // Sort by most recent play log date (most recent first)
          const aLastPlayed = a.playLogs && a.playLogs.length > 0
            ? new Date(a.playLogs[0].date).getTime()
            : 0;
          const bLastPlayed = b.playLogs && b.playLogs.length > 0
            ? new Date(b.playLogs[0].date).getTime()
            : 0;
          return bLastPlayed - aLastPlayed;
        case 'dateAdded':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
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
            <StatCard icon={<Gamepad2 size={16} />} label="Games" value={summary.totalGames} />
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
          {/* Tab Navigation */}
          <div className="space-y-4 mb-6">
            {/* Tabs Row */}
            <div className="flex items-center gap-1 bg-white/[0.02] rounded-lg p-1 w-fit">
              {([
                { id: 'games', label: 'Games', icon: <List size={14} /> },
                { id: 'timeline', label: 'Timeline', icon: <Calendar size={14} /> },
                { id: 'stats', label: 'Stats', icon: <BarChart3 size={14} /> },
              ] as const).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setTabMode(tab.id)}
                  className={clsx(
                    'flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all',
                    tabMode === tab.id
                      ? 'bg-white/10 text-white'
                      : 'text-white/40 hover:text-white/60'
                  )}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* View Mode Filter & Sort (only for games tab) */}
            {tabMode === 'games' && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="flex items-center gap-1 bg-white/[0.02] rounded-lg p-1">
                  {(['all', 'owned', 'wishlist'] as ViewMode[]).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setViewMode(mode)}
                      className={clsx(
                        'px-3 py-1 rounded-md text-xs font-medium transition-all capitalize',
                        viewMode === mode
                          ? 'bg-white/10 text-white'
                          : 'text-white/40 hover:text-white/60'
                      )}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/40">Sort by:</span>
                  <select
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value as typeof sortBy)}
                    className="px-3 py-1 bg-white/[0.02] border border-white/10 text-white text-xs rounded-lg focus:outline-none focus:border-purple-500/50 cursor-pointer"
                  >
                    <option value="recentlyPlayed">Recently Played</option>
                    <option value="dateAdded">Date Added</option>
                    <option value="name">Name</option>
                    <option value="price">Price (High to Low)</option>
                    <option value="hours">Hours (High to Low)</option>
                    <option value="rating">Rating (High to Low)</option>
                    <option value="costPerHour">Value (Best First)</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Tab Content */}
          {tabMode === 'games' && (
            <>
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
                      {/* Header: Name + Status + Actions */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-white/90 font-medium">{game.name}</h3>
                            <span className={clsx('text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0', getStatusColor(game.status))}>
                              {game.status}
                            </span>
                          </div>
                        </div>
                        {/* Action Buttons - Always visible on mobile */}
                        <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-all shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenPlayLog(game);
                            }}
                            className="p-2 text-white/30 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all"
                            title="Log Play Session"
                          >
                            <Clock size={14} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(game.id);
                            }}
                            className="p-2 text-white/30 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                            title="Delete Game"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* Tags Row */}
                      <div className="flex items-center gap-2 flex-wrap text-xs text-white/40 mb-3">
                        {game.platform && <span className="px-2 py-0.5 bg-white/5 rounded">{game.platform}</span>}
                        {game.genre && <span className="px-2 py-0.5 bg-white/5 rounded">{game.genre}</span>}
                        {game.purchaseSource && <span className="px-2 py-0.5 bg-white/5 rounded">{game.purchaseSource}</span>}
                        {/* Value Badge */}
                        {game.hours > 0 && (
                          <span className={clsx(
                            'px-2 py-0.5 rounded font-medium',
                            game.metrics.valueRating === 'Excellent' && 'bg-emerald-500/20 text-emerald-400',
                            game.metrics.valueRating === 'Good' && 'bg-blue-500/20 text-blue-400',
                            game.metrics.valueRating === 'Fair' && 'bg-yellow-500/20 text-yellow-400',
                            game.metrics.valueRating === 'Poor' && 'bg-red-500/20 text-red-400'
                          )}>
                            {game.metrics.valueRating} Value
                          </span>
                        )}
                        {/* Discount Badge */}
                        {game.originalPrice && game.originalPrice > game.price && (
                          <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded font-medium">
                            {(((game.originalPrice - game.price) / game.originalPrice) * 100).toFixed(0)}% off
                          </span>
                        )}
                        {/* Free Badge */}
                        {game.acquiredFree && (
                          <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded font-medium">
                            FREE
                          </span>
                        )}
                      </div>

                      {/* Stats Row */}
                      <div className="grid grid-cols-5 gap-2 text-center">
                        <div className="p-2 bg-white/[0.02] rounded-lg">
                          <div className="flex flex-col items-center gap-0.5">
                            {game.originalPrice && game.originalPrice > game.price ? (
                              <>
                                <div className="text-white/30 line-through text-xs">${game.originalPrice}</div>
                                <div className="text-emerald-400 font-medium text-sm">${game.price}</div>
                              </>
                            ) : (
                              <div className="text-white/80 font-medium text-sm">${game.price}</div>
                            )}
                          </div>
                          <div className="text-[10px] text-white/30">
                            {game.acquiredFree ? 'free' : 'price'}
                          </div>
                        </div>
                        <div className="p-2 bg-white/[0.02] rounded-lg">
                          <div className="text-white/80 font-medium text-sm">{game.hours}h</div>
                          <div className="text-[10px] text-white/30">played</div>
                        </div>
                        <div className="p-2 bg-white/[0.02] rounded-lg">
                          <div className="text-white/80 font-medium text-sm">{game.rating}/10</div>
                          <div className="text-[10px] text-white/30">rating</div>
                        </div>
                        <div className="p-2 bg-white/[0.02] rounded-lg">
                          {game.hours > 0 ? (
                            <>
                              <div className={clsx('font-medium text-sm', getValueColor(game.metrics.valueRating))}>
                                ${game.metrics.costPerHour.toFixed(2)}
                              </div>
                              <div className="text-[10px] text-white/30">per hr</div>
                            </>
                          ) : (
                            <>
                              <div className="text-white/30 font-medium text-sm">-</div>
                              <div className="text-[10px] text-white/30">per hr</div>
                            </>
                          )}
                        </div>
                        <div className="p-2 bg-white/[0.02] rounded-lg">
                          {game.hours > 0 ? (
                            <>
                              <div className={clsx('font-medium text-sm', getValueColor(getROIRating(game.metrics.roi)))}>
                                {game.metrics.roi.toFixed(1)}
                              </div>
                              <div className="text-[10px] text-white/30">{getROIRating(game.metrics.roi)} ROI</div>
                            </>
                          ) : (
                            <>
                              <div className="text-white/30 font-medium text-sm">-</div>
                              <div className="text-[10px] text-white/30">ROI</div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Review Preview */}
                      {game.review && (
                        <div className="mt-3 pt-3 border-t border-white/5">
                          <p className="text-xs text-white/40 line-clamp-2">{game.review}</p>
                        </div>
                      )}

                      {/* Play Logs Summary */}
                      {game.playLogs && game.playLogs.length > 0 && (
                        <div className={clsx('mt-3 pt-3 border-t border-white/5', !game.review && 'mt-3')}>
                          <div className="flex items-center gap-2 text-xs text-white/30">
                            <Clock size={10} />
                            <span>{game.playLogs.length} sessions logged</span>
                            <span className="text-white/10">•</span>
                            <span>Last: {new Date(game.playLogs[0].date).toLocaleDateString()}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {tabMode === 'timeline' && (
            <TimelineView
              games={games}
              onLogTime={(game) => {
                const gameWithMetrics = gamesWithMetrics.find(g => g.id === game.id);
                if (gameWithMetrics) {
                  handleOpenPlayLog(gameWithMetrics);
                }
              }}
              onQuickAddTime={async (gameId, playLog) => {
                const game = games.find(g => g.id === gameId);
                if (game) {
                  const existingLogs = game.playLogs || [];
                  const updatedLogs = [...existingLogs, playLog];
                  const totalHours = updatedLogs.reduce((sum, log) => sum + log.hours, 0);
                  await updateGame(gameId, {
                    playLogs: updatedLogs,
                    hours: Math.max(game.hours, totalHours),
                  });
                  showToast('Play session added', 'success');
                }
              }}
            />
          )}

          {tabMode === 'stats' && games.length > 0 && (
            <StatsView
              games={gamesWithMetrics}
              summary={summary}
              budgets={budgets}
              onSetBudget={async (year, amount) => {
                try {
                  await setBudget(year, amount);
                  showToast('Budget updated', 'success');
                } catch (e) {
                  showToast(`Failed to save budget: ${(e as Error).message}`, 'error');
                }
              }}
            />
          )}

          {tabMode === 'stats' && games.length === 0 && (
            <div className="text-center py-16">
              <BarChart3 size={48} className="mx-auto mb-4 text-white/10" />
              <p className="text-white/30 text-sm">No stats to display</p>
              <p className="text-white/20 text-xs mt-1">Add some games to see analytics</p>
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
          existingFranchises={Array.from(new Set(games.map(g => g.franchise).filter(Boolean) as string[]))}
        />
      )}

      {/* Play Log Modal */}
      {playLogGame && (
        <PlayLogModal
          game={playLogGame}
          onSave={handleSavePlayLogs}
          onClose={() => setPlayLogGame(null)}
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
