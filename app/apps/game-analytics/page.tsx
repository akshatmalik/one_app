'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Plus, Sparkles, Gamepad2, Clock, DollarSign, Star, TrendingUp, Eye, Trophy, Flame, BarChart3, Calendar, List, MessageCircle, ListOrdered, ListPlus, Check, Heart, ChevronUp, ChevronDown } from 'lucide-react';
import { useGames } from './hooks/useGames';
import { useAnalytics, GameWithMetrics } from './hooks/useAnalytics';
import { useBudget } from './hooks/useBudget';
import { useGameThumbnails } from './hooks/useGameThumbnails';
import { useGameQueue } from './hooks/useGameQueue';
import { GameForm } from './components/GameForm';
import { PlayLogModal } from './components/PlayLogModal';
import { TimelineView } from './components/TimelineView';
import { StatsView } from './components/StatsView';
import { AIChatTab } from './components/AIChatTab';
import { UpNextTab } from './components/UpNextTab';
import { Game, GameStatus, PlayLog } from './lib/types';
import { gameRepository } from './lib/storage';
import { BASELINE_GAMES_2025 } from './data/baseline-games';
import { useAuthContext } from '@/lib/AuthContext';
import { useToast } from '@/components/Toast';
import { getROIRating, getWeekStatsForOffset, getGamesPlayedInTimeRange, getCompletionProbability, getGameHealthDot, getRelativeTime, getDaysContext, getSessionMomentum, getValueTrajectory, getGameSmartOneLiner, getFranchiseInfo, getProgressPercent, getShelfLife, parseLocalDate, getCardRarity, getRelationshipStatus, getGameStreak, getHeroNumber, getCardFreshness, getGameSections } from './lib/calculations';
import { OnThisDayCard } from './components/OnThisDayCard';
import { ActivityPulse } from './components/ActivityPulse';
import { RandomPicker } from './components/RandomPicker';
import { BulkWishlistModal } from './components/BulkWishlistModal';
import { GameBottomSheet } from './components/GameBottomSheet';
import { RatingStars } from './components/RatingStars';
import clsx from 'clsx';

type ViewMode = 'all' | 'owned' | 'wishlist';
type TabMode = 'games' | 'timeline' | 'stats' | 'ai-coach' | 'up-next';
type CardViewMode = 'poster' | 'compact';

function getValueColor(rating: string): string {
  switch (rating) {
    case 'Excellent': return 'text-emerald-400';
    case 'Good': return 'text-blue-400';
    case 'Fair': return 'text-yellow-400';
    case 'Poor': return 'text-red-400';
    default: return 'text-white/50';
  }
}

export default function GameAnalyticsPage() {
  const { user, loading: authLoading } = useAuthContext();
  const { showToast } = useToast();
  const { games, loading, error, addGame, updateGame, deleteGame, refresh } = useGames(user?.uid ?? null);
  const { gamesWithMetrics, summary } = useAnalytics(games);
  const { budgets, setBudget } = useBudget(user?.uid ?? null);
  const { loading: thumbnailsLoading, fetchedCount } = useGameThumbnails(games, updateGame);
  const {
    queuedGames,
    availableGames,
    hideFinished,
    setHideFinished,
    addToQueue,
    removeFromQueue,
    reorderQueue,
    isInQueue,
  } = useGameQueue(games, updateGame);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<GameWithMetrics | null>(null);
  const [playLogGame, setPlayLogGame] = useState<GameWithMetrics | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [tabMode, setTabMode] = useState<TabMode>('games');
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'hours' | 'rating' | 'costPerHour' | 'dateAdded' | 'recentlyPlayed'>('recentlyPlayed');
  const [showRandomPicker, setShowRandomPicker] = useState(false);
  const [showBulkWishlist, setShowBulkWishlist] = useState(false);
  const [detailGame, setDetailGame] = useState<GameWithMetrics | null>(null);
  const [statsCollapsed, setStatsCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('ga-stats-collapsed') === 'true';
  });
  const [cardViewMode, setCardViewMode] = useState<CardViewMode>(() => {
    if (typeof window === 'undefined') return 'poster';
    return (localStorage.getItem('ga-card-view-mode') as CardViewMode) || 'poster';
  });
  const [groupBySection, setGroupBySection] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('ga-group-sections') === 'true';
  });

  // Calculate week and month data for AI chat
  const weekData = useMemo(() => {
    try {
      return getWeekStatsForOffset(games, -1); // Current week
    } catch (e) {
      return null;
    }
  }, [games]);

  const monthGames = useMemo(() => {
    const now = new Date();
    const monthAgo = new Date(now);
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    return getGamesPlayedInTimeRange(games, monthAgo, now);
  }, [games]);

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

  const handleDelete = async (id: string, gameName: string) => {
    // Show confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to delete "${gameName}"?\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

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

    // Check if this is the first play session for a backlog game
    const isFirstSession = playLogGame.status === 'Not Started' &&
                          (!playLogGame.playLogs || playLogGame.playLogs.length === 0) &&
                          playLogs.length > 0;

    const updates: Partial<Game> = {
      playLogs,
    };

    // Auto-start game on first play session
    if (isFirstSession) {
      // Find the earliest date from the new logs
      const earliestLog = playLogs.reduce((earliest, log) => {
        return parseLocalDate(log.date) < parseLocalDate(earliest.date) ? log : earliest;
      });

      updates.status = 'In Progress';
      updates.startDate = earliestLog.date;
    }

    await updateGame(playLogGame.id, updates);
    setPlayLogGame(null);
    showToast(isFirstSession ? 'Game started! Sessions saved' : 'Play sessions saved', 'success');
  };

  const handleQuickLog = async (game: GameWithMetrics, hours: number) => {
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const newLog: PlayLog = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      date: dateStr,
      hours,
    };
    const existingLogs = game.playLogs || [];
    const updates: Partial<Game> = { playLogs: [...existingLogs, newLog] };

    if (game.status === 'Not Started' && existingLogs.length === 0) {
      updates.status = 'In Progress';
      updates.startDate = dateStr;
    }

    await updateGame(game.id, updates);
    showToast(`Logged ${hours}h`, 'success');
  };

  const toggleCardViewMode = () => {
    const next = cardViewMode === 'poster' ? 'compact' : 'poster';
    setCardViewMode(next);
    localStorage.setItem('ga-card-view-mode', next);
  };

  const toggleGroupBySection = () => {
    const next = !groupBySection;
    setGroupBySection(next);
    localStorage.setItem('ga-group-sections', String(next));
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

  const handleBulkWishlist = async (gamesToAdd: Omit<Game, 'id' | 'userId' | 'createdAt' | 'updatedAt'>[]) => {
    try {
      for (const gameData of gamesToAdd) {
        await addGame(gameData);
      }
      showToast(`${gamesToAdd.length} game${gamesToAdd.length !== 1 ? 's' : ''} added to wishlist`, 'success');
      setShowBulkWishlist(false);
    } catch (e) {
      showToast(`Failed to add games: ${(e as Error).message}`, 'error');
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
          return b.totalHours - a.totalHours;
        case 'rating':
          return b.rating - a.rating;
        case 'costPerHour':
          // Handle cases where hours might be 0
          const aCost = a.totalHours > 0 ? a.metrics.costPerHour : Infinity;
          const bCost = b.totalHours > 0 ? b.metrics.costPerHour : Infinity;
          return aCost - bCost;
        case 'recentlyPlayed':
          // Sort by most recent play log date (most recent first)
          const aLastPlayed = a.playLogs && a.playLogs.length > 0
            ? parseLocalDate(a.playLogs[0].date).getTime()
            : 0;
          const bLastPlayed = b.playLogs && b.playLogs.length > 0
            ? parseLocalDate(b.playLogs[0].date).getTime()
            : 0;
          return bLastPlayed - aLastPlayed;
        case 'dateAdded':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

  return (
    <div className="min-h-[calc(100vh-60px)] flex flex-col">
      {/* Header */}
      <div className="px-6 pt-8 pb-6 border-b border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">Games</h1>
              <div className="flex items-center gap-3 mt-1">
                <p className="text-white/40 text-sm">Track your library and analyze value</p>
                {games.length > 0 && <ActivityPulse games={games} />}
              </div>
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
              {games.filter(g => g.status !== 'Wishlist' && g.status !== 'Completed' && g.status !== 'Abandoned').length > 0 && (
                <button
                  onClick={() => setShowRandomPicker(true)}
                  className="flex items-center gap-2 px-3 py-2 bg-white/5 text-white/60 hover:text-purple-400 hover:bg-purple-500/10 rounded-lg transition-all text-sm font-medium"
                  title="What should I play?"
                >
                  <Sparkles size={16} />
                </button>
              )}
              <button
                onClick={() => setShowBulkWishlist(true)}
                className="flex items-center gap-2 px-3 py-2 bg-white/5 text-white/60 hover:text-purple-400 hover:bg-purple-500/10 rounded-lg transition-all text-sm font-medium"
                title="Bulk add to wishlist"
              >
                <Heart size={16} />
                <span className="hidden sm:inline">Wishlist</span>
              </button>
              <button
                onClick={() => setIsFormOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-all text-sm font-medium"
              >
                <Plus size={16} />
                Add Game
              </button>
            </div>
          </div>

          {/* Stats Overview — Collapsible */}
          <div>
            <button
              onClick={() => {
                const next = !statsCollapsed;
                setStatsCollapsed(next);
                localStorage.setItem('ga-stats-collapsed', String(next));
              }}
              className="flex items-center gap-2 text-xs text-white/40 hover:text-white/60 transition-colors mb-2"
            >
              {statsCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
              <span>{statsCollapsed ? 'Show stats' : 'Hide stats'}</span>
            </button>

            {!statsCollapsed && (
              <>
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
              </>
            )}
          </div>
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
          {/* On This Day */}
          {games.length > 0 && <OnThisDayCard games={games} />}

          {/* Tab Navigation */}
          <div className="space-y-4 mb-6">
            {/* Tabs - Two Rows */}
            <div className="space-y-2">
              {/* First Row: Games, Timeline, Stats */}
              <div className="flex items-center gap-2">
                {([
                  { id: 'games', label: 'Games', icon: <List size={14} /> },
                  { id: 'timeline', label: 'Timeline', icon: <Calendar size={14} /> },
                  { id: 'stats', label: 'Stats', icon: <BarChart3 size={14} /> },
                ] as const).map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setTabMode(tab.id)}
                    className={clsx(
                      'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all',
                      tabMode === tab.id
                        ? 'bg-white/10 text-white'
                        : 'bg-white/[0.02] text-white/40 hover:text-white/60'
                    )}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Second Row: AI Coach, Up Next */}
              <div className="flex items-center gap-2">
                {([
                  { id: 'ai-coach', label: 'AI Coach', icon: <MessageCircle size={14} /> },
                  { id: 'up-next', label: 'Up Next', icon: <ListOrdered size={14} /> },
                ] as const).map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setTabMode(tab.id)}
                    className={clsx(
                      'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all',
                      tabMode === tab.id
                        ? 'bg-white/10 text-white'
                        : 'bg-white/[0.02] text-white/40 hover:text-white/60'
                    )}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </div>
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
                <div className="flex items-center gap-2 flex-wrap">
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
                  {/* Card view toggle */}
                  <button
                    onClick={toggleCardViewMode}
                    className="px-2 py-1 bg-white/[0.02] border border-white/10 text-white/40 text-[10px] rounded-lg"
                    title={cardViewMode === 'poster' ? 'Switch to compact' : 'Switch to poster'}
                  >
                    {cardViewMode === 'poster' ? 'Compact' : 'Poster'}
                  </button>
                  {/* Group toggle */}
                  <button
                    onClick={toggleGroupBySection}
                    className={clsx(
                      'px-2 py-1 border text-[10px] rounded-lg',
                      groupBySection ? 'bg-purple-500/10 border-purple-500/20 text-purple-400' : 'bg-white/[0.02] border-white/10 text-white/40'
                    )}
                  >
                    Sections
                  </button>
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
                <GameCardList
                  games={filteredGames}
                  allGames={games}
                  cardViewMode={cardViewMode}
                  groupBySection={groupBySection}
                  onCardClick={(game) => setDetailGame(game)}
                  onLogTime={(game) => handleOpenPlayLog(game)}
                  onQuickLog={handleQuickLog}
                  onToggleQueue={async (game) => {
                    try {
                      if (isInQueue(game.id)) {
                        await removeFromQueue(game.id);
                        showToast('Removed from queue', 'success');
                      } else {
                        await addToQueue(game.id);
                        showToast('Added to queue', 'success');
                      }
                    } catch (err) {
                      showToast('Failed to update queue', 'error');
                    }
                  }}
                  onToggleSpecial={async (game) => {
                    try {
                      await updateGame(game.id, { isSpecial: !game.isSpecial });
                      showToast(game.isSpecial ? 'Removed special tag' : 'Marked as special', 'success');
                    } catch (err) {
                      showToast('Failed to update', 'error');
                    }
                  }}
                  onDelete={(game) => handleDelete(game.id, game.name)}
                  isInQueue={isInQueue}
                />
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
                  // Only update playLogs - hours field remains as baseline
                  await updateGame(gameId, {
                    playLogs: updatedLogs,
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

          {tabMode === 'ai-coach' && (
            <AIChatTab
              weekData={weekData}
              monthGames={monthGames}
              allGames={games}
              onBack={() => setTabMode('games')}
            />
          )}

          {tabMode === 'up-next' && (
            <UpNextTab
              queuedGames={queuedGames.map(game => {
                const gameWithMetrics = gamesWithMetrics.find(g => g.id === game.id);
                return gameWithMetrics || game as GameWithMetrics;
              })}
              availableGames={availableGames}
              allGames={games}
              hideFinished={hideFinished}
              onToggleHideFinished={() => setHideFinished(!hideFinished)}
              onAddToQueue={async (gameId) => {
                try {
                  await addToQueue(gameId);
                  showToast('Game added to queue', 'success');
                } catch (e) {
                  showToast(`Failed to add game: ${(e as Error).message}`, 'error');
                }
              }}
              onRemoveFromQueue={async (gameId) => {
                try {
                  await removeFromQueue(gameId);
                  showToast('Game removed from queue', 'success');
                } catch (e) {
                  showToast(`Failed to remove game: ${(e as Error).message}`, 'error');
                }
              }}
              onReorderQueue={async (gameId, newPosition) => {
                try {
                  await reorderQueue(gameId, newPosition);
                } catch (e) {
                  showToast(`Failed to reorder queue: ${(e as Error).message}`, 'error');
                }
              }}
              onLogTime={(game) => {
                const gameWithMetrics = gamesWithMetrics.find(g => g.id === game.id);
                if (gameWithMetrics) {
                  handleOpenPlayLog(gameWithMetrics);
                }
              }}
            />
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

      {/* Random Game Picker */}
      {showRandomPicker && (
        <RandomPicker
          games={games}
          onClose={() => setShowRandomPicker(false)}
        />
      )}

      {/* Bulk Wishlist Modal */}
      {showBulkWishlist && (
        <BulkWishlistModal
          onAddGames={handleBulkWishlist}
          onClose={() => setShowBulkWishlist(false)}
          existingGameNames={games.map(g => g.name)}
          existingGames={games}
        />
      )}

      {/* Game Detail Bottom Sheet */}
      {detailGame && (
        <GameBottomSheet
          game={detailGame}
          allGames={games}
          onClose={() => setDetailGame(null)}
          onEdit={() => {
            handleEdit(detailGame);
            setDetailGame(null);
          }}
          onDelete={() => {
            handleDelete(detailGame.id, detailGame.name);
            setDetailGame(null);
          }}
          onLogTime={(hours) => {
            if (hours) {
              handleQuickLog(detailGame, hours);
            } else {
              handleOpenPlayLog(detailGame);
              setDetailGame(null);
            }
          }}
          onOpenPlayLog={() => {
            handleOpenPlayLog(detailGame);
            setDetailGame(null);
          }}
          onToggleQueue={async () => {
            try {
              if (isInQueue(detailGame.id)) {
                await removeFromQueue(detailGame.id);
                showToast('Removed from queue', 'success');
              } else {
                await addToQueue(detailGame.id);
                showToast('Added to queue', 'success');
              }
            } catch (err) {
              showToast('Failed to update queue', 'error');
            }
          }}
          onToggleSpecial={async () => {
            try {
              await updateGame(detailGame.id, { isSpecial: !detailGame.isSpecial });
              showToast(detailGame.isSpecial ? 'Removed special tag' : 'Marked as special', 'success');
              setDetailGame(null);
            } catch (err) {
              showToast('Failed to update', 'error');
            }
          }}
          isInQueue={isInQueue(detailGame.id)}
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

// ============================================================
// GameCardList — Poster + Compact card views with sections
// ============================================================

interface GameCardListProps {
  games: GameWithMetrics[];
  allGames: Game[];
  cardViewMode: CardViewMode;
  groupBySection: boolean;
  onCardClick: (game: GameWithMetrics) => void;
  onLogTime: (game: GameWithMetrics) => void;
  onQuickLog: (game: GameWithMetrics, hours: number) => void;
  onToggleQueue: (game: GameWithMetrics) => void;
  onToggleSpecial: (game: GameWithMetrics) => void;
  onDelete: (game: GameWithMetrics) => void;
  isInQueue: (id: string) => boolean;
}

function GameCardList({
  games,
  allGames,
  cardViewMode,
  groupBySection,
  onCardClick,
  onLogTime,
  onQuickLog,
  onToggleQueue,
  onToggleSpecial,
  onDelete,
  isInQueue,
}: GameCardListProps) {
  const sections = useMemo(() => groupBySection ? getGameSections(allGames) : [], [allGames, groupBySection]);

  // Now Playing: all In Progress games, sorted by most recently played
  const nowPlayingGames = useMemo(() => {
    return games
      .filter(g => g.status === 'In Progress')
      .sort((a, b) => {
        const aLogs = a.playLogs || [];
        const bLogs = b.playLogs || [];
        const aLast = aLogs.length > 0 ? Math.max(...aLogs.map(l => parseLocalDate(l.date).getTime())) : 0;
        const bLast = bLogs.length > 0 ? Math.max(...bLogs.map(l => parseLocalDate(l.date).getTime())) : 0;
        return bLast - aLast;
      });
  }, [games]);

  const nowPlayingIds = useMemo(() => new Set(nowPlayingGames.map(g => g.id)), [nowPlayingGames]);

  const renderCard = (game: GameWithMetrics, idx: number) => {
    if (cardViewMode === 'poster') {
      return <PosterCard key={game.id} game={game} allGames={allGames} idx={idx} onClick={() => onCardClick(game)} onQuickLog={(h) => onQuickLog(game, h)} isInQueue={isInQueue(game.id)} />;
    }
    return <CompactCard key={game.id} game={game} allGames={allGames} idx={idx} onClick={() => onCardClick(game)} onLogTime={() => onLogTime(game)} onToggleQueue={() => onToggleQueue(game)} onDelete={() => onDelete(game)} isInQueue={isInQueue(game.id)} />;
  };

  if (groupBySection && sections.length > 0) {
    // Map game IDs to games for lookup
    const gameMap = new Map(games.map(g => [g.id, g]));

    return (
      <div className="space-y-6">
        {/* Now Playing */}
        {nowPlayingGames.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-blue-500 health-pulse-fast" />
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Now Playing</span>
              <span className="text-[10px] text-white/20">{nowPlayingGames.length}</span>
            </div>
            <div className="space-y-3">
              {nowPlayingGames.map(g => (
                <NowPlayingCard key={g.id} game={g} allGames={allGames} onClick={() => onCardClick(g)} onQuickLog={(h) => onQuickLog(g, h)} />
              ))}
            </div>
          </div>
        )}

        {sections.map(section => {
          const sectionGames = (section.gameIds.map(id => gameMap.get(id)).filter(Boolean) as GameWithMetrics[]).filter(g => !nowPlayingIds.has(g.id));
          if (sectionGames.length === 0) return null;

          return (
            <div key={section.id} className="section-enter">
              <div className="flex items-center gap-3 mb-3">
                <SectionIcon id={section.id} />
                <div>
                  <h3 className="text-sm font-bold text-white/80">{section.label}</h3>
                  <p className="text-[10px] text-white/30">{section.insight}</p>
                </div>
              </div>
              <div className="grid gap-3">
                {sectionGames.map((game, idx) => renderCard(game, idx))}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Now Playing */}
      {nowPlayingGames.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-blue-500 health-pulse-fast" />
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Now Playing</span>
            <span className="text-[10px] text-white/20">{nowPlayingGames.length}</span>
          </div>
          <div className="space-y-3">
            {nowPlayingGames.map(g => (
              <NowPlayingCard key={g.id} game={g} allGames={allGames} onClick={() => onCardClick(g)} onQuickLog={(h) => onQuickLog(g, h)} />
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-3">
        {games.filter(game => !nowPlayingIds.has(game.id)).map((game, idx) => renderCard(game, idx))}
      </div>
    </div>
  );
}

function SectionIcon({ id }: { id: string }) {
  const icons: Record<string, { emoji: string; color: string }> = {
    'on-fire': { emoji: '🔥', color: '#f97316' },
    'cooling-off': { emoji: '❄️', color: '#3b82f6' },
    'collection': { emoji: '🏆', color: '#10b981' },
    'waiting-room': { emoji: '⏳', color: '#6b7280' },
    'the-shelf': { emoji: '💜', color: '#a855f7' },
    'graveyard': { emoji: '🪦', color: '#6b7280' },
    'in-progress': { emoji: '🎮', color: '#3b82f6' },
  };
  const config = icons[id] || { emoji: '📁', color: '#6b7280' };
  return <span className="text-lg">{config.emoji}</span>;
}

// --- Now Playing Card ---

function NowPlayingCard({ game, allGames, onClick, onQuickLog }: {
  game: GameWithMetrics;
  allGames: Game[];
  onClick: () => void;
  onQuickLog: (hours: number) => void;
}) {
  const relationship = getRelationshipStatus(game, allGames);
  const streak = getGameStreak(game);
  const avgSession = game.playLogs && game.playLogs.length > 0
    ? Math.round(game.playLogs.reduce((s, l) => s + l.hours, 0) / game.playLogs.length * 10) / 10
    : 2;

  return (
    <div>
      <div
        onClick={onClick}
        className="relative overflow-hidden rounded-xl border border-blue-500/20 now-playing-glow cursor-pointer"
      >
        {/* Banner image */}
        {game.thumbnail && (
          <div className="relative h-28 overflow-hidden">
            <img src={game.thumbnail} alt={game.name} className="w-full h-full object-cover opacity-40 poster-reveal" loading="lazy" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/60 to-transparent" />
          </div>
        )}

        <div className={clsx('p-4', game.thumbnail ? '-mt-10 relative' : '')}>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-bold text-white">{game.name}</h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ color: relationship.color, backgroundColor: relationship.bgColor }}>
              {relationship.label}
            </span>
            {streak.isActive && (
              <span className="text-[10px] px-1.5 py-0.5 bg-orange-500/20 text-orange-400 rounded font-bold flex items-center gap-0.5 streak-flame">
                🔥 {streak.days}
              </span>
            )}
          </div>

          <div className="flex items-center gap-4 mt-2">
            <div className="text-center">
              <div className="text-white/80 font-bold text-sm">{game.totalHours}h</div>
              <div className="text-[9px] text-white/30">played</div>
            </div>
            <div className="text-center">
              <RatingStars rating={game.rating} size={10} />
              <div className="text-[9px] text-white/30 mt-0.5">{game.rating}/10</div>
            </div>
            <div className="flex-1" />
            <button
              onClick={(e) => { e.stopPropagation(); onQuickLog(avgSession); }}
              className="px-4 py-2 bg-blue-600/30 text-blue-300 rounded-lg text-xs font-bold active:bg-blue-600/50 transition-all flex items-center gap-1.5"
            >
              <Clock size={12} /> Check In
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Poster Card ---

function PosterCard({ game, allGames, idx, onClick, onQuickLog, isInQueue }: {
  game: GameWithMetrics;
  allGames: Game[];
  idx: number;
  onClick: () => void;
  onQuickLog: (hours: number) => void;
  isInQueue: boolean;
}) {
  const rarity = getCardRarity(game);
  const relationship = getRelationshipStatus(game, allGames);
  const streak = getGameStreak(game);
  const heroNum = getHeroNumber(game);
  const freshness = getCardFreshness(game);
  const smartLine = getGameSmartOneLiner(game, allGames);

  return (
    <div
      onClick={onClick}
      className={clsx(
        'overflow-hidden rounded-xl border cursor-pointer transition-all card-enter',
        rarity.borderClass || 'border-white/5',
      )}
      style={{
        animationDelay: `${idx * 40}ms`,
        opacity: freshness.opacity,
        backgroundColor: relationship.cardTint,
      }}
    >
      {/* Poster image */}
      <div className="relative">
        {game.thumbnail ? (
          <div className="relative h-28 overflow-hidden">
            <img
              src={game.thumbnail}
              alt={game.name}
              className="w-full h-full object-cover poster-reveal"
              loading="lazy"
              style={{ filter: `saturate(${freshness.saturation})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/40 to-transparent" />
          </div>
        ) : (
          <div className="h-20 bg-gradient-to-r from-purple-900/10 to-blue-900/10 flex items-center justify-center">
            <Gamepad2 size={28} className="text-white/10" />
          </div>
        )}

        {/* Streak flame badge */}
        {streak.isActive && (
          <div className="absolute top-2 left-2 text-[10px] px-1.5 py-0.5 bg-black/60 backdrop-blur-sm text-orange-400 rounded font-bold flex items-center gap-0.5 streak-flame">
            🔥 {streak.days}
          </div>
        )}

        {/* Rarity badge */}
        {rarity.tier !== 'common' && (
          <div className="absolute top-2 right-2 text-[9px] px-1.5 py-0.5 bg-black/60 backdrop-blur-sm rounded font-bold uppercase tracking-wider"
            style={{
              color: rarity.tier === 'legendary' ? '#fbbf24'
                : rarity.tier === 'epic' ? '#a855f7'
                : rarity.tier === 'rare' ? '#3b82f6'
                : '#22c55e',
            }}
          >
            {rarity.label}
          </div>
        )}

        {/* Hero number */}
        <div className="absolute bottom-2 right-3">
          <div className="text-right">
            <div className="text-xl font-black" style={{ color: heroNum.color }}>{heroNum.value}</div>
            <div className="text-[9px] text-white/30 -mt-0.5">{heroNum.label}</div>
          </div>
        </div>

        {/* Name + Relationship overlay */}
        <div className="absolute bottom-2 left-3 right-16">
          <h3 className="text-white font-bold text-base leading-tight truncate">{game.name}</h3>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span
              className="text-[10px] px-2 py-0.5 rounded-full font-bold"
              style={{ color: relationship.color, backgroundColor: relationship.bgColor }}
            >
              {relationship.label}
            </span>
            {game.genre && <span className="text-[10px] text-white/30">{game.genre}</span>}
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="px-3 py-2.5 flex items-center gap-3">
        <div className="flex items-center gap-1 text-xs text-white/50">
          <DollarSign size={10} className="text-white/30" />
          <span>{game.acquiredFree ? 'Free' : `$${game.price}`}</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-white/50">
          <Clock size={10} className="text-white/30" />
          <span>{game.totalHours}h</span>
        </div>
        <div className="flex items-center gap-0.5">
          <RatingStars rating={game.rating} size={9} />
        </div>
        {game.totalHours > 0 && game.price > 0 && (
          <span className={clsx('text-xs font-medium', getValueColor(game.metrics.valueRating))}>
            ${game.metrics.costPerHour.toFixed(2)}/hr
          </span>
        )}
        <div className="flex-1" />
        {/* Tags that fit */}
        {game.platform && <span className="text-[9px] px-1.5 py-0.5 bg-white/5 rounded text-white/30">{game.platform}</span>}
      </div>

      {/* Smart one-liner */}
      {smartLine && (
        <div className="px-3 pb-2.5 -mt-1">
          <p className="text-[10px] text-white/25 italic truncate">{smartLine}</p>
        </div>
      )}
    </div>
  );
}

// --- Compact Card (original layout, fixed) ---

function CompactCard({ game, allGames, idx, onClick, onLogTime, onToggleQueue, onDelete, isInQueue }: {
  game: GameWithMetrics;
  allGames: Game[];
  idx: number;
  onClick: () => void;
  onLogTime: () => void;
  onToggleQueue: () => void;
  onDelete: () => void;
  isInQueue: boolean;
}) {
  const rarity = getCardRarity(game);
  const relationship = getRelationshipStatus(game, allGames);
  const streak = getGameStreak(game);
  const heroNum = getHeroNumber(game);
  const freshness = getCardFreshness(game);
  const daysCtx = getDaysContext(game);
  const franchise = getFranchiseInfo(game, allGames);
  const smartLine = getGameSmartOneLiner(game, allGames);
  const lastPlayedStr = game.playLogs && game.playLogs.length > 0
    ? (() => {
        const sorted = [...game.playLogs].sort((a, b) => parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime());
        return getRelativeTime(sorted[0].date);
      })()
    : null;

  return (
    <div
      onClick={onClick}
      className={clsx(
        'p-4 rounded-xl border cursor-pointer transition-all card-enter',
        rarity.borderClass || 'border-white/5',
      )}
      style={{
        animationDelay: `${idx * 40}ms`,
        opacity: freshness.opacity,
        backgroundColor: relationship.cardTint,
      }}
    >
      {/* Row 1: Thumbnail + Name + Hero Number */}
      <div className="flex items-start gap-3 mb-2">
        <div className="shrink-0 relative">
          {game.thumbnail ? (
            <img
              src={game.thumbnail}
              alt={game.name}
              className="w-14 h-14 object-cover rounded-lg"
              loading="lazy"
              style={{ filter: `saturate(${freshness.saturation})` }}
            />
          ) : (
            <div className="w-14 h-14 bg-white/5 rounded-lg flex items-center justify-center">
              <Gamepad2 size={20} className="text-white/20" />
            </div>
          )}
          {/* Streak flame */}
          {streak.isActive && (
            <div className="absolute -top-1 -left-1 text-[9px] px-1 py-0.5 bg-orange-500/20 text-orange-400 rounded font-bold streak-flame">
              🔥{streak.days}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
            <h3 className="text-white/90 font-medium text-sm truncate">{game.name}</h3>
            <span
              className="text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0"
              style={{ color: relationship.color, backgroundColor: relationship.bgColor }}
            >
              {relationship.label}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-white/30">
            <span>{daysCtx}</span>
            {lastPlayedStr && (
              <>
                <span className="text-white/10">·</span>
                <span>Last {lastPlayedStr}</span>
              </>
            )}
          </div>
        </div>

        {/* Hero number */}
        <div className="shrink-0 text-right">
          <div className="text-lg font-black leading-none" style={{ color: heroNum.color }}>{heroNum.value}</div>
          <div className="text-[9px] text-white/25">{heroNum.label}</div>
        </div>
      </div>

      {/* Row 2: Tags — full width */}
      <div className="flex items-center gap-1.5 flex-wrap mb-2">
        {game.platform && <span className="text-[10px] px-2 py-0.5 bg-white/5 rounded text-white/40">{game.platform}</span>}
        {game.genre && <span className="text-[10px] px-2 py-0.5 bg-white/5 rounded text-white/40">{game.genre}</span>}
        {game.purchaseSource && <span className="text-[10px] px-2 py-0.5 bg-white/5 rounded text-white/40">{game.purchaseSource}</span>}
        {franchise && (
          <span className="text-[10px] px-2 py-0.5 bg-purple-500/10 text-purple-400 rounded font-medium">
            {franchise.franchiseName} #{franchise.position}/{franchise.gamesInFranchise}
          </span>
        )}
        {game.totalHours > 0 && (
          <span className={clsx(
            'text-[10px] px-2 py-0.5 rounded font-medium',
            game.metrics.valueRating === 'Excellent' && 'bg-emerald-500/20 text-emerald-400',
            game.metrics.valueRating === 'Good' && 'bg-blue-500/20 text-blue-400',
            game.metrics.valueRating === 'Fair' && 'bg-yellow-500/20 text-yellow-400',
            game.metrics.valueRating === 'Poor' && 'bg-red-500/20 text-red-400'
          )}>
            {game.metrics.valueRating}
          </span>
        )}
        {rarity.tier !== 'common' && (
          <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase"
            style={{
              color: rarity.tier === 'legendary' ? '#fbbf24' : rarity.tier === 'epic' ? '#a855f7' : rarity.tier === 'rare' ? '#3b82f6' : '#22c55e',
              backgroundColor: rarity.tier === 'legendary' ? 'rgba(251,191,36,0.1)' : rarity.tier === 'epic' ? 'rgba(168,85,247,0.1)' : rarity.tier === 'rare' ? 'rgba(59,130,246,0.1)' : 'rgba(34,197,94,0.1)',
            }}
          >
            {rarity.label}
          </span>
        )}
        {game.acquiredFree && <span className="text-[10px] px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded font-medium">FREE</span>}
        {game.isSpecial && (
          <span className="text-[10px] px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded font-medium flex items-center gap-0.5">
            <Heart size={8} className="fill-amber-400" /> Special
          </span>
        )}
      </div>

      {/* Row 3: Stats grid */}
      <div className="grid grid-cols-4 gap-2 text-center mb-2">
        <div className="p-1.5 bg-white/[0.02] rounded-lg">
          <div className="text-white/80 font-medium text-xs">{game.acquiredFree ? 'Free' : `$${game.price}`}</div>
          <div className="text-[9px] text-white/25">price</div>
        </div>
        <div className="p-1.5 bg-white/[0.02] rounded-lg">
          <div className="text-white/80 font-medium text-xs">{game.totalHours}h</div>
          <div className="text-[9px] text-white/25">played</div>
        </div>
        <div className="p-1.5 bg-white/[0.02] rounded-lg">
          <div className="flex justify-center"><RatingStars rating={game.rating} size={9} /></div>
          <div className="text-[9px] text-white/25">{game.rating}/10</div>
        </div>
        <div className="p-1.5 bg-white/[0.02] rounded-lg">
          {game.totalHours > 0 && game.price > 0 ? (
            <div className={clsx('font-medium text-xs', getValueColor(game.metrics.valueRating))}>
              ${game.metrics.costPerHour.toFixed(2)}
            </div>
          ) : (
            <div className="text-white/30 font-medium text-xs">-</div>
          )}
          <div className="text-[9px] text-white/25">per hr</div>
        </div>
      </div>

      {/* Row 4: Smart one-liner */}
      {smartLine && (
        <p className="text-[10px] text-white/25 italic truncate mb-2">{smartLine}</p>
      )}

      {/* Row 5: Action buttons — always visible */}
      <div className="flex items-center gap-1.5 pt-2 border-t border-white/5">
        <button
          onClick={(e) => { e.stopPropagation(); onLogTime(); }}
          className="flex items-center gap-1 px-2.5 py-1.5 text-white/30 active:text-blue-400 active:bg-blue-500/10 rounded-lg transition-all text-xs"
        >
          <Clock size={12} /> Log
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onToggleQueue(); }}
          className={clsx(
            'px-2.5 py-1.5 rounded-lg transition-all text-xs flex items-center gap-1',
            isInQueue ? 'text-purple-400 bg-purple-500/10' : 'text-white/30'
          )}
        >
          {isInQueue ? <Check size={12} /> : <ListPlus size={12} />}
          {isInQueue ? 'Queued' : 'Queue'}
        </button>
        <div className="flex-1" />
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="p-1.5 text-white/20 active:text-red-400 rounded-lg transition-all"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      </div>
    </div>
  );
}
