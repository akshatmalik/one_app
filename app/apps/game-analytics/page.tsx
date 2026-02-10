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
import { getROIRating, getWeekStatsForOffset, getGamesPlayedInTimeRange, getCompletionProbability, getGameHealthDot, getRelativeTime, getDaysContext, getSessionMomentum, getValueTrajectory, getGameSmartOneLiner, getFranchiseInfo, getProgressPercent, getShelfLife, parseLocalDate } from './lib/calculations';
import { OnThisDayCard } from './components/OnThisDayCard';
import { ActivityPulse } from './components/ActivityPulse';
import { RandomPicker } from './components/RandomPicker';
import { BulkWishlistModal } from './components/BulkWishlistModal';
import { GameDetailPanel } from './components/GameDetailPanel';
import clsx from 'clsx';

type ViewMode = 'all' | 'owned' | 'wishlist';
type TabMode = 'games' | 'timeline' | 'stats' | 'ai-coach' | 'up-next';

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
                  {filteredGames.map((game, idx) => {
                    const healthDot = getGameHealthDot(game);
                    const daysCtx = getDaysContext(game);
                    const shelfLifeData = getShelfLife(game);
                    const valTraj = getValueTrajectory(game);
                    const momentum = getSessionMomentum(game, 5);
                    const maxMom = momentum.length > 0 ? Math.max(...momentum) : 0;
                    const smartLine = getGameSmartOneLiner(game, games);
                    const franchise = getFranchiseInfo(game, games);
                    const progressPct = getProgressPercent(game);
                    const lastPlayedStr = game.playLogs && game.playLogs.length > 0
                      ? (() => {
                          const sorted = [...game.playLogs].sort((a, b) => parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime());
                          return getRelativeTime(sorted[0].date);
                        })()
                      : null;
                    const avgSession = game.playLogs && game.playLogs.length > 0
                      ? Math.round(game.playLogs.reduce((s, l) => s + l.hours, 0) / game.playLogs.length)
                      : 2;

                    return (
                    <div
                      key={game.id}
                      onClick={() => setDetailGame(game)}
                      className={clsx(
                        'group p-4 bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 hover:border-white/10 rounded-xl cursor-pointer transition-all card-enter',
                        game.status === 'In Progress' && 'in-progress-glow',
                        game.status === 'Completed' && 'completed-shimmer',
                      )}
                      style={{ animationDelay: `${idx * 50}ms` }}
                    >
                      {/* Row 1: Thumbnail + Info + Actions */}
                      <div className="flex items-start gap-3 mb-3">
                        {/* Thumbnail with Health Dot + Progress Ring */}
                        <div className="shrink-0 relative">
                          {game.thumbnail ? (
                            <div className="relative w-16 h-16">
                              <img
                                src={game.thumbnail}
                                alt={game.name}
                                className="w-16 h-16 object-cover rounded-lg"
                                loading="lazy"
                              />
                              {/* Progress ring overlay */}
                              {progressPct > 0 && progressPct < 100 && (
                                <svg className="absolute inset-0 w-16 h-16 -rotate-90 pointer-events-none" viewBox="0 0 64 64">
                                  <circle cx="32" cy="32" r="30" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2.5" />
                                  <circle
                                    cx="32" cy="32" r="30" fill="none"
                                    stroke={game.status === 'In Progress' ? '#3b82f6' : '#8b5cf6'}
                                    strokeWidth="2.5"
                                    strokeDasharray={`${(progressPct / 100) * 188.5} 188.5`}
                                    strokeLinecap="round"
                                    className="progress-ring-animate"
                                  />
                                </svg>
                              )}
                              {/* Health dot */}
                              {healthDot.level !== 'none' && (
                                <div
                                  className={clsx(
                                    'absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-[#0a0a0f]',
                                    healthDot.level === 'active' && 'health-pulse-fast',
                                    healthDot.level === 'healthy' && 'health-pulse-medium',
                                    healthDot.level === 'cooling' && 'health-pulse-slow',
                                  )}
                                  style={{ backgroundColor: healthDot.color }}
                                  title={healthDot.label}
                                />
                              )}
                            </div>
                          ) : (
                            <div className="relative w-16 h-16 bg-white/5 rounded-lg flex items-center justify-center">
                              <Gamepad2 size={24} className="text-white/20" />
                              {healthDot.level !== 'none' && (
                                <div
                                  className={clsx(
                                    'absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-[#0a0a0f]',
                                    healthDot.level === 'active' && 'health-pulse-fast',
                                  )}
                                  style={{ backgroundColor: healthDot.color }}
                                  title={healthDot.label}
                                />
                              )}
                            </div>
                          )}
                        </div>

                        {/* Name + Badges + Days Context */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                            <h3 className="text-white/90 font-medium text-base">{game.name}</h3>
                            <span className={clsx('text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0', getStatusColor(game.status))}>
                              {game.status}
                            </span>
                            {shelfLifeData.level !== 'fresh' && shelfLifeData.label && (
                              <span className="text-[10px] px-2 py-0.5 rounded font-medium dust-float" style={{ color: shelfLifeData.color, backgroundColor: `${shelfLifeData.color}15` }}>
                                {shelfLifeData.label}
                              </span>
                            )}
                          </div>

                          {/* Days context + last played */}
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[11px] text-white/35">{daysCtx}</span>
                            {lastPlayedStr && (
                              <>
                                <span className="text-white/10 text-[10px]">·</span>
                                <span className="text-[11px] text-white/30">Last played {lastPlayedStr}</span>
                              </>
                            )}
                          </div>

                          {/* Tags Row */}
                          <div className="flex items-center gap-1.5 flex-wrap">
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

                            {(game.status === 'In Progress' || game.status === 'Not Started') && (() => {
                              const prob = getCompletionProbability(game, games);
                              return (
                                <span className={clsx(
                                  'text-[10px] px-2 py-0.5 rounded font-medium',
                                  prob.probability >= 70 && 'bg-emerald-500/20 text-emerald-400',
                                  prob.probability >= 40 && prob.probability < 70 && 'bg-yellow-500/20 text-yellow-400',
                                  prob.probability < 40 && 'bg-red-500/20 text-red-400',
                                )} title={prob.verdict}>
                                  {prob.probability}% finish
                                </span>
                              );
                            })()}

                            {game.originalPrice && game.originalPrice > game.price && (
                              <span className="text-[10px] px-2 py-0.5 bg-green-500/20 text-green-400 rounded font-medium">
                                {(((game.originalPrice - game.price) / game.originalPrice) * 100).toFixed(0)}% off
                              </span>
                            )}

                            {game.acquiredFree && (
                              <span className="text-[10px] px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded font-medium">
                                FREE
                              </span>
                            )}

                            {game.isSpecial && (
                              <span className="text-[10px] px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded font-medium flex items-center gap-0.5">
                                <Heart size={8} className="fill-amber-400" /> Special
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-all shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenPlayLog(game);
                            }}
                            className="flex items-center gap-1 px-2 py-1.5 text-white/30 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all text-xs"
                            title="Log Play Session"
                          >
                            <Clock size={12} />
                            <span className="hidden sm:inline">+{avgSession}h</span>
                          </button>
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (isInQueue(game.id)) {
                                try {
                                  await removeFromQueue(game.id);
                                  showToast('Removed from queue', 'success');
                                } catch (err) {
                                  showToast('Failed to remove from queue', 'error');
                                }
                              } else {
                                try {
                                  await addToQueue(game.id);
                                  showToast('Added to queue', 'success');
                                } catch (err) {
                                  showToast('Failed to add to queue', 'error');
                                }
                              }
                            }}
                            className={clsx(
                              'p-2 rounded-lg transition-all',
                              isInQueue(game.id)
                                ? 'text-purple-400 bg-purple-500/10 hover:text-purple-300 hover:bg-purple-500/20'
                                : 'text-white/30 hover:text-purple-400 hover:bg-purple-500/10'
                            )}
                            title={isInQueue(game.id) ? 'Remove from Up Next' : 'Add to Up Next'}
                          >
                            {isInQueue(game.id) ? <Check size={14} /> : <ListPlus size={14} />}
                          </button>
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                await updateGame(game.id, { isSpecial: !game.isSpecial });
                                showToast(game.isSpecial ? 'Removed special tag' : 'Marked as special', 'success');
                              } catch (err) {
                                showToast('Failed to update', 'error');
                              }
                            }}
                            className={clsx(
                              'p-2 rounded-lg transition-all',
                              game.isSpecial
                                ? 'text-amber-400 bg-amber-500/10 hover:text-amber-300 hover:bg-amber-500/20'
                                : 'text-white/30 hover:text-amber-400 hover:bg-amber-500/10'
                            )}
                            title={game.isSpecial ? 'Remove special tag' : 'Mark as special'}
                          >
                            <Heart size={14} className={game.isSpecial ? 'fill-amber-400' : ''} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(game.id, game.name);
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

                      {/* Row 2: Stats Grid */}
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
                          <div className="text-[10px] text-white/30">{game.acquiredFree ? 'free' : 'price'}</div>
                        </div>

                        <div className="p-2 bg-white/[0.02] rounded-lg">
                          <div className="text-white/80 font-medium text-sm">{game.totalHours}h</div>
                          <div className="text-[10px] text-white/30">played</div>
                        </div>

                        <div className="p-2 bg-white/[0.02] rounded-lg">
                          <div className="text-white/80 font-medium text-sm">{game.rating}/10</div>
                          <div className="text-[10px] text-white/30">rating</div>
                        </div>

                        {/* Cost/hr with value trajectory arrow */}
                        <div className="p-2 bg-white/[0.02] rounded-lg">
                          {game.totalHours > 0 ? (
                            <>
                              <div className="flex items-center justify-center gap-1">
                                <span className={clsx('font-medium text-sm', getValueColor(game.metrics.valueRating))}>
                                  ${game.metrics.costPerHour.toFixed(2)}
                                </span>
                                <span className="text-[10px]" style={{ color: valTraj.color }} title={valTraj.label}>
                                  {valTraj.icon}
                                </span>
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
                          {game.totalHours > 0 ? (
                            <>
                              <div className={clsx('font-medium text-sm', getValueColor(getROIRating(game.metrics.roi)))}>
                                {game.metrics.roi.toFixed(1)}
                              </div>
                              <div className="text-[10px] text-white/30">
                                {(() => {
                                  const r = getROIRating(game.metrics.roi);
                                  const m = Math.floor(game.metrics.roi / 10);
                                  return r === 'Excellent' && m >= 2 ? `${m}x Excellent` : `${r} ROI`;
                                })()}
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="text-white/30 font-medium text-sm">-</div>
                              <div className="text-[10px] text-white/30">ROI</div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Row 3: Smart one-liner + Momentum sparkline */}
                      {(smartLine || momentum.length >= 3) && (
                        <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between gap-3">
                          {smartLine && (
                            <p className="text-[11px] text-white/30 italic flex-1">{smartLine}</p>
                          )}
                          {momentum.length >= 3 && (
                            <div className="flex items-end gap-px h-4 shrink-0" title={`Last ${momentum.length} sessions: ${momentum.map(h => h + 'h').join(', ')}`}>
                              {momentum.map((hours, i) => (
                                <div
                                  key={i}
                                  className="w-1.5 rounded-sm spark-grow"
                                  style={{
                                    height: `${maxMom > 0 ? Math.max(20, (hours / maxMom) * 100) : 20}%`,
                                    backgroundColor: i === momentum.length - 1 ? '#3b82f6' : 'rgba(255,255,255,0.15)',
                                    animationDelay: `${i * 100}ms`,
                                  }}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Review Preview */}
                      {game.review && (
                        <div className="mt-3 pt-3 border-t border-white/5">
                          <p className="text-xs text-white/40 line-clamp-2">{game.review}</p>
                        </div>
                      )}

                      {/* Play Logs Summary with relative time + last note */}
                      {game.playLogs && game.playLogs.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-white/5">
                          <div className="flex items-center gap-2 text-xs text-white/30">
                            <Clock size={10} />
                            <span>{game.playLogs.length} sessions</span>
                            {lastPlayedStr && (
                              <>
                                <span className="text-white/10">·</span>
                                <span>Last: {lastPlayedStr}</span>
                              </>
                            )}
                            {(() => {
                              const sorted = [...game.playLogs].sort((a, b) => parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime());
                              return sorted[0].notes ? (
                                <>
                                  <span className="text-white/10">·</span>
                                  <span className="text-white/25 italic truncate max-w-[200px]">&ldquo;{sorted[0].notes}&rdquo;</span>
                                </>
                              ) : null;
                            })()}
                          </div>
                        </div>
                      )}
                    </div>
                    );
                  })}
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

      {/* Game Detail Panel */}
      {detailGame && (
        <GameDetailPanel
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
          onLogTime={() => {
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
