'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Plus, Sparkles, Gamepad2, Clock, DollarSign, Star, TrendingUp, Eye, Trophy, Flame, BarChart3, Calendar, List, MessageCircle, ListOrdered, ListPlus, Check, Heart, ChevronUp, ChevronDown, Compass, Zap, Target, ArrowUpRight, ArrowDownRight, Minus, Shield, MoreVertical, Download, Gift } from 'lucide-react';
import { useGames } from './hooks/useGames';
import { useAnalytics, GameWithMetrics } from './hooks/useAnalytics';
import { useBudget } from './hooks/useBudget';
import { useGameThumbnails } from './hooks/useGameThumbnails';
import { useGameQueue } from './hooks/useGameQueue';
import { useGameColors } from './hooks/useGameColors';
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
import { getROIRating, getWeekStatsForOffset, getGamesPlayedInTimeRange, getCompletionProbability, getGameHealthDot, getRelativeTime, getDaysContext, getSessionMomentum, getValueTrajectory, getGameSmartOneLiner, getFranchiseInfo, getProgressPercent, getShelfLife, parseLocalDate, getCardRarity, getRelationshipStatus, getGameStreak, getHeroNumber, getCardFreshness, getGameSections, getCardBackData, getContextualWhisper, getLibraryRank, getCardMoodPulse, getProgressRingData, getStatPopoverData, getWeekRecapData, getSmartNudges, getGamingCreditScore, getRotationStats, getSpendingForecast, getSpendingByMonth } from './lib/calculations';
import { OnThisDayCard } from './components/OnThisDayCard';
import { ActivityPulse } from './components/ActivityPulse';
import { RandomPicker } from './components/RandomPicker';
import { BulkWishlistModal } from './components/BulkWishlistModal';
import { GameBottomSheet } from './components/GameBottomSheet';
import { DiscoverTab } from './components/DiscoverTab';
import { RatingStars } from './components/RatingStars';
import { MomentumDots } from './components/MomentumDots';
import { ProgressRing } from './components/ProgressRing';
import { ExportPanel } from './components/ExportPanel';
import { YearlyWrapped } from './components/YearlyWrapped';
import clsx from 'clsx';

type ViewMode = 'all' | 'owned' | 'wishlist';
type TabMode = 'games' | 'timeline' | 'stats' | 'ai-coach' | 'up-next' | 'discover';
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
  const gameColors = useGameColors(games);
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
  const [showExport, setShowExport] = useState(false);
  const [wrappedYear, setWrappedYear] = useState<number | null>(null);
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
  const [recapCollapsed, setRecapCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('ga-recap-collapsed') === 'true';
  });
  const [showCommandPalette, setShowCommandPalette] = useState(false);

  // Week recap data for header strip
  const weekRecap = useMemo(() => {
    if (games.length === 0) return null;
    return getWeekRecapData(games);
  }, [games]);

  // Smart nudges for the title subtitle
  const smartNudges = useMemo(() => getSmartNudges(games), [games]);
  const [nudgeIndex, setNudgeIndex] = useState(0);
  // Rotate nudges every 8 seconds
  useEffect(() => {
    if (smartNudges.length <= 1) return;
    const interval = setInterval(() => {
      setNudgeIndex(prev => (prev + 1) % smartNudges.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [smartNudges.length]);

  // Gaming credit score for stats grid
  const creditScore = useMemo(() => {
    if (games.length === 0) return null;
    return getGamingCreditScore(games);
  }, [games]);

  // Rotation stats for highlights
  const rotationStats = useMemo(() => {
    if (games.length === 0) return null;
    return getRotationStats(games);
  }, [games]);

  // This month's spending
  const monthSpending = useMemo(() => {
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const byMonth = getSpendingByMonth(games);
    return byMonth[monthKey] || 0;
  }, [games]);

  // Spending forecast
  const forecast = useMemo(() => {
    if (games.length === 0) return null;
    const year = new Date().getFullYear();
    const currentBudget = budgets.find(b => b.year === year);
    return getSpendingForecast(games, year, currentBudget?.yearlyBudget);
  }, [games, budgets]);

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
          {/* Title Row — Dynamic */}
          <div className="flex items-center justify-between mb-4">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                {games.length > 0 ? (
                  <>Your <span className="text-purple-400">{summary.totalGames}</span>-Game Collection</>
                ) : (
                  'Games'
                )}
              </h1>
              <div className="flex items-center gap-3 mt-1 min-w-0">
                {smartNudges.length > 0 ? (
                  <p className="text-white/40 text-sm italic truncate transition-opacity duration-500">
                    {smartNudges[nudgeIndex % smartNudges.length]?.text}
                  </p>
                ) : (
                  <p className="text-white/40 text-sm">Track your library and analyze value</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {games.length === 0 && (
                <button
                  onClick={handleSeedData}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-purple-400 hover:text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 rounded-lg transition-all"
                >
                  <Sparkles size={14} />
                  Load Samples
                </button>
              )}
              {/* Command Palette */}
              <div className="relative">
                <button
                  onClick={() => setShowCommandPalette(!showCommandPalette)}
                  className="flex items-center gap-2 px-3 py-2 bg-white/5 text-white/60 hover:text-white/80 rounded-lg transition-all text-sm"
                  title="More actions"
                >
                  <MoreVertical size={16} />
                </button>
                {showCommandPalette && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowCommandPalette(false)} />
                    <div className="absolute right-0 top-full mt-1 z-50 bg-[#1a1a2e] border border-white/10 rounded-xl shadow-2xl py-1 min-w-[180px]">
                      {games.filter(g => g.status !== 'Wishlist' && g.status !== 'Completed' && g.status !== 'Abandoned').length > 0 && (
                        <button
                          onClick={() => { setShowRandomPicker(true); setShowCommandPalette(false); }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-all"
                        >
                          <Sparkles size={14} /> Random Pick
                        </button>
                      )}
                      <button
                        onClick={() => { setShowBulkWishlist(true); setShowCommandPalette(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-all"
                      >
                        <Heart size={14} /> Bulk Wishlist
                      </button>
                      {games.length === 0 && (
                        <button
                          onClick={() => { handleSeedData(); setShowCommandPalette(false); }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-all"
                        >
                          <Sparkles size={14} /> Load Samples
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
              <button
                onClick={() => setIsFormOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-all text-sm font-medium"
              >
                <Plus size={16} />
                <span className="hidden sm:inline">Add Game</span>
              </button>
            </div>
          </div>

          {/* Tier 1: This Week Recap Strip — Collapsible */}
          {games.length > 0 && weekRecap && (
            <div className="mb-4">
              <button
                onClick={() => {
                  const next = !recapCollapsed;
                  setRecapCollapsed(next);
                  localStorage.setItem('ga-recap-collapsed', String(next));
                }}
                className="flex items-center gap-2 text-xs text-white/40 hover:text-white/60 transition-colors mb-2"
              >
                {recapCollapsed ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
                <span>{recapCollapsed ? 'Show recap' : 'This Week'}</span>
              </button>

              {recapCollapsed ? (
                /* Collapsed: single-line Activity Pulse summary */
                <div className="flex items-center gap-3 px-3 py-2 bg-white/[0.02] rounded-lg border border-white/5">
                  <div className="relative flex items-center justify-center">
                    <div
                      className={clsx('w-2.5 h-2.5 rounded-full', {
                        'animate-pulse': weekRecap.pulse.pulseSpeed === 'slow',
                      })}
                      style={{ backgroundColor: weekRecap.pulse.color }}
                    />
                    {weekRecap.pulse.pulseSpeed === 'fast' && (
                      <div className="absolute w-2.5 h-2.5 rounded-full animate-ping" style={{ backgroundColor: weekRecap.pulse.color, opacity: 0.5 }} />
                    )}
                    {weekRecap.pulse.pulseSpeed === 'medium' && (
                      <div className="absolute w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: weekRecap.pulse.color, opacity: 0.3 }} />
                    )}
                  </div>
                  <span className="text-xs text-white/50">{weekRecap.pulse.level}</span>
                  <span className="text-xs text-white/30">·</span>
                  <span className="text-xs text-white/50">{weekRecap.thisWeek.totalHours.toFixed(1)}h this week</span>
                  {weekRecap.streak > 0 && (
                    <>
                      <span className="text-xs text-white/30">·</span>
                      <span className="text-xs text-orange-400/80">{weekRecap.streak}d streak</span>
                    </>
                  )}
                </div>
              ) : (
                /* Expanded: full recap strip */
                <div className="bg-gradient-to-r from-white/[0.03] to-white/[0.01] rounded-xl border border-white/5 p-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4">
                    {/* Activity Pulse */}
                    <div className="flex items-center gap-3">
                      <div className="relative flex items-center justify-center">
                        <div
                          className={clsx('w-3 h-3 rounded-full', {
                            'animate-pulse': weekRecap.pulse.pulseSpeed === 'slow',
                          })}
                          style={{ backgroundColor: weekRecap.pulse.color }}
                        />
                        {weekRecap.pulse.pulseSpeed === 'fast' && (
                          <div className="absolute w-3 h-3 rounded-full animate-ping" style={{ backgroundColor: weekRecap.pulse.color, opacity: 0.5 }} />
                        )}
                        {weekRecap.pulse.pulseSpeed === 'medium' && (
                          <div className="absolute w-3 h-3 rounded-full animate-pulse" style={{ backgroundColor: weekRecap.pulse.color, opacity: 0.3 }} />
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white/80" style={{ color: weekRecap.pulse.color }}>
                          {weekRecap.pulse.level}
                        </div>
                        <div className="text-[10px] text-white/30">{weekRecap.pulse.daysActive}d active this week</div>
                      </div>
                    </div>

                    {/* Hours this week + delta */}
                    <div>
                      <div className="text-lg font-semibold text-white/90">
                        {weekRecap.thisWeek.totalHours.toFixed(1)}h
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-white/30">vs last week</span>
                        {weekRecap.hoursDelta !== 0 && (
                          <span className={clsx('text-[10px] font-medium flex items-center', weekRecap.hoursDelta > 0 ? 'text-emerald-400' : 'text-red-400')}>
                            {weekRecap.hoursDelta > 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                            {Math.abs(weekRecap.hoursDelta).toFixed(1)}h
                          </span>
                        )}
                        {weekRecap.hoursDelta === 0 && <span className="text-[10px] text-white/20"><Minus size={10} /></span>}
                      </div>
                    </div>

                    {/* Games + Sessions */}
                    <div>
                      <div className="text-lg font-semibold text-white/90">
                        {weekRecap.thisWeek.uniqueGames} <span className="text-xs text-white/30 font-normal">games</span>
                      </div>
                      <div className="text-[10px] text-white/30">
                        {weekRecap.thisWeek.totalSessions} session{weekRecap.thisWeek.totalSessions !== 1 ? 's' : ''}
                        {weekRecap.sessionsDelta !== 0 && (
                          <span className={clsx('ml-1', weekRecap.sessionsDelta > 0 ? 'text-emerald-400/60' : 'text-red-400/60')}>
                            ({weekRecap.sessionsDelta > 0 ? '+' : ''}{weekRecap.sessionsDelta})
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Streak */}
                    <div>
                      <div className="flex items-center gap-1.5">
                        {weekRecap.streak > 0 && <Flame size={14} className="text-orange-400" />}
                        <span className="text-lg font-semibold text-white/90">
                          {weekRecap.streak > 0 ? `${weekRecap.streak}d` : '—'}
                        </span>
                      </div>
                      <div className="text-[10px] text-white/30">
                        {weekRecap.streak > 0 ? 'streak' : 'no streak'}
                      </div>
                    </div>

                    {/* Top game this week */}
                    {weekRecap.thisWeek.mostPlayedGame && (
                      <div className="col-span-2 sm:col-span-1 flex items-center gap-2">
                        {weekRecap.thisWeek.mostPlayedGame.thumbnail && (
                          <img
                            src={weekRecap.thisWeek.mostPlayedGame.thumbnail}
                            alt=""
                            className="w-8 h-8 rounded-md object-cover flex-shrink-0"
                          />
                        )}
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-white/70 truncate">
                            {weekRecap.thisWeek.mostPlayedGame.name}
                          </div>
                          <div className="text-[10px] text-white/30">
                            {weekRecap.thisWeek.mostPlayedGame.hours.toFixed(1)}h this week
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tier 2: Redesigned Stats Grid — Collapsible */}
          <div>
            <button
              onClick={() => {
                const next = !statsCollapsed;
                setStatsCollapsed(next);
                localStorage.setItem('ga-stats-collapsed', String(next));
              }}
              className="flex items-center gap-2 text-xs text-white/40 hover:text-white/60 transition-colors mb-2"
            >
              {statsCollapsed ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
              <span>{statsCollapsed ? 'Show stats' : 'Stats'}</span>
            </button>

            {!statsCollapsed && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  {/* Hours — with weekly/monthly context */}
                  <div className="p-3 rounded-xl border bg-white/[0.02] border-white/5">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white/40"><Clock size={16} /></span>
                      <span className="text-xs text-white/40">Hours</span>
                    </div>
                    <div className="text-lg font-semibold text-white/90">{summary.totalHours.toFixed(0)}</div>
                    {weekRecap && (
                      <div className="text-[10px] text-white/30 mt-0.5">
                        +{weekRecap.thisWeek.totalHours.toFixed(1)}h this week · {weekRecap.thisMonth.totalHours.toFixed(0)}h this month
                      </div>
                    )}
                  </div>

                  {/* Spent — with monthly context + forecast */}
                  <div className="p-3 rounded-xl border bg-white/[0.02] border-white/5">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white/40"><DollarSign size={16} /></span>
                      <span className="text-xs text-white/40">Spent</span>
                    </div>
                    <div className="text-lg font-semibold text-white/90">${summary.totalSpent.toFixed(0)}</div>
                    <div className="text-[10px] text-white/30 mt-0.5">
                      ${monthSpending.toFixed(0)} this month
                      {forecast && <> · ~${forecast.projectedAnnual.toFixed(0)} projected</>}
                    </div>
                  </div>

                  {/* Collection — with status breakdown */}
                  <div className="p-3 rounded-xl border bg-white/[0.02] border-white/5">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white/40"><Gamepad2 size={16} /></span>
                      <span className="text-xs text-white/40">Collection</span>
                    </div>
                    <div className="text-lg font-semibold text-white/90">{summary.totalGames}</div>
                    <div className="text-[10px] text-white/30 mt-0.5">
                      {summary.inProgressCount} active · {summary.completedCount} done · {summary.notStartedCount} backlog
                    </div>
                  </div>

                  {/* Value — with trend */}
                  <div className="p-3 rounded-xl border bg-white/[0.02] border-white/5">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white/40"><TrendingUp size={16} /></span>
                      <span className="text-xs text-white/40">Value</span>
                    </div>
                    <div className="text-lg font-semibold text-white/90">${summary.averageCostPerHour.toFixed(2)}<span className="text-xs text-white/30 font-normal">/hr</span></div>
                    <div className="text-[10px] text-white/30 mt-0.5">
                      {summary.averageCostPerHour <= 3.5 ? (
                        <span className="text-emerald-400/60">Better than movies ($12/hr)</span>
                      ) : summary.averageCostPerHour <= 5 ? (
                        <span className="text-yellow-400/60">Fair — room to improve</span>
                      ) : (
                        <span className="text-red-400/60">Above average cost</span>
                      )}
                    </div>
                  </div>

                  {/* Completion — with recent */}
                  <div className="p-3 rounded-xl border bg-white/[0.02] border-white/5">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white/40"><Check size={16} /></span>
                      <span className="text-xs text-white/40">Completion</span>
                    </div>
                    <div className="text-lg font-semibold text-white/90">{(summary.completionRate * 100).toFixed(0)}%</div>
                    <div className="text-[10px] text-white/30 mt-0.5">
                      {summary.completedCount} of {summary.ownedCount} owned
                      {summary.abandonedCount > 0 && <> · {summary.abandonedCount} abandoned</>}
                    </div>
                  </div>

                  {/* Gaming Score — credit score */}
                  {creditScore ? (
                    <div className="p-3 rounded-xl border bg-white/[0.02] border-white/5">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-white/40"><Shield size={16} /></span>
                        <span className="text-xs text-white/40">Score</span>
                      </div>
                      <div className="text-lg font-semibold" style={{ color: creditScore.color }}>{creditScore.score}</div>
                      <div className="text-[10px] text-white/30 mt-0.5">
                        {creditScore.label}
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl border bg-purple-500/10 border-purple-500/20">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-purple-400"><Eye size={16} /></span>
                        <span className="text-xs text-purple-400/60">Wishlist</span>
                      </div>
                      <div className="text-lg font-semibold text-purple-400">{summary.wishlistCount}</div>
                    </div>
                  )}
                </div>

                {/* Tier 3: Enhanced Highlights Row */}
                <div className="mt-4 flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
                  {summary.bestValue && (
                    <div className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 rounded-lg">
                      <Trophy size={14} className="text-emerald-400" />
                      <span className="text-xs text-white/50">Best Value:</span>
                      <span className="text-xs text-emerald-400 font-medium">{summary.bestValue.name}</span>
                      <span className="text-xs text-white/30">${summary.bestValue.costPerHour.toFixed(2)}/hr</span>
                    </div>
                  )}
                  {weekRecap?.thisWeek.mostPlayedGame && (
                    <div className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 rounded-lg">
                      <Flame size={14} className="text-blue-400" />
                      <span className="text-xs text-white/50">Top This Week:</span>
                      <span className="text-xs text-blue-400 font-medium">{weekRecap.thisWeek.mostPlayedGame.name}</span>
                      <span className="text-xs text-white/30">{weekRecap.thisWeek.mostPlayedGame.hours.toFixed(1)}h</span>
                    </div>
                  )}
                  {weekRecap && weekRecap.streak >= 3 && (
                    <div className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 bg-orange-500/10 rounded-lg">
                      <Flame size={14} className="text-orange-400" />
                      <span className="text-xs text-white/50">Streak:</span>
                      <span className="text-xs text-orange-400 font-medium">{weekRecap.streak} days</span>
                    </div>
                  )}
                  {rotationStats && (
                    <div className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 bg-purple-500/10 rounded-lg">
                      <Target size={14} className="text-purple-400" />
                      <span className="text-xs text-white/50">Rotation:</span>
                      <span className="text-xs text-purple-400 font-medium">{rotationStats.rotationHealth}</span>
                      <span className="text-xs text-white/30">{rotationStats.gamesInRotation} game{rotationStats.gamesInRotation !== 1 ? 's' : ''}</span>
                    </div>
                  )}
                  {forecast && forecast.budgetAmount && (
                    <div className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 bg-yellow-500/10 rounded-lg">
                      <DollarSign size={14} className="text-yellow-400" />
                      <span className="text-xs text-white/50">Budget:</span>
                      <span className={clsx('text-xs font-medium', forecast.onTrack === 'under' ? 'text-emerald-400' : forecast.onTrack === 'close' ? 'text-yellow-400' : 'text-red-400')}>
                        {Math.round((forecast.currentYearSpent / forecast.budgetAmount) * 100)}% used
                      </span>
                    </div>
                  )}
                  {summary.wishlistCount > 0 && creditScore && (
                    <div className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 bg-purple-500/10 rounded-lg">
                      <Eye size={14} className="text-purple-400" />
                      <span className="text-xs text-white/50">Wishlist:</span>
                      <span className="text-xs text-purple-400 font-medium">{summary.wishlistCount} games</span>
                    </div>
                  )}
                </div>
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

              {/* Second Row: AI Coach, Up Next, Discover, Export */}
              <div className="flex items-center gap-2">
                {([
                  { id: 'ai-coach', label: 'AI Coach', icon: <MessageCircle size={14} /> },
                  { id: 'up-next', label: 'Up Next', icon: <ListOrdered size={14} /> },
                  { id: 'discover', label: 'Discover', icon: <Compass size={14} /> },
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
                {/* Export button */}
                <button
                  onClick={() => setShowExport(true)}
                  className="p-2.5 rounded-lg bg-white/[0.02] text-white/30 hover:text-white/60 transition-all"
                  title="Export data"
                >
                  <Download size={14} />
                </button>
                {/* Yearly Wrapped button */}
                <button
                  onClick={() => setWrappedYear(new Date().getFullYear())}
                  className="p-2.5 rounded-lg bg-white/[0.02] text-purple-400/50 hover:text-purple-400 transition-all"
                  title="Yearly Wrapped"
                >
                  <Gift size={14} />
                </button>
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
                  sortBy={sortBy}
                  gameColors={gameColors}
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

          {tabMode === 'discover' && (
            <DiscoverTab
              games={games}
              userId={user?.uid ?? null}
              onAddGame={addGame}
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

      {/* Export Panel */}
      {showExport && (
        <ExportPanel
          games={games}
          onClose={() => setShowExport(false)}
        />
      )}

      {/* Yearly Wrapped */}
      {wrappedYear && (
        <YearlyWrapped
          games={games}
          year={wrappedYear}
          onClose={() => setWrappedYear(null)}
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
// StatPopover — contextual tooltip for micro-stat interactions
// ============================================================

function StatPopover({ text, visible }: { text: string; visible: boolean }) {
  if (!visible) return null;
  return (
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 border border-white/10 rounded-lg shadow-xl z-50 whitespace-nowrap text-[11px] text-white/70 pointer-events-none animate-fade-in">
      {text}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
    </div>
  );
}

function useStatPopover() {
  const [active, setActive] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toggle = useCallback((stat: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActive(prev => prev === stat ? null : stat);
    // Auto-dismiss after 3 seconds
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setActive(null), 3000);
  }, []);

  const close = useCallback(() => {
    setActive(null);
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return { active, toggle, close };
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
  sortBy?: string;
  gameColors: Map<string, string>;
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
  sortBy = 'hours',
  gameColors,
}: GameCardListProps) {
  const sections = useMemo(() => groupBySection ? getGameSections(allGames) : [], [allGames, groupBySection]);

  // Track entering cards for animation (E17: Animated Card Transitions)
  const prevGameIdsRef = useRef<Set<string>>(new Set());
  const [enteringCards, setEnteringCards] = useState<Set<string>>(new Set());

  useEffect(() => {
    const currentIds = new Set(games.map(g => g.id));
    const prevIds = prevGameIdsRef.current;

    if (prevIds.size > 0) {
      const newCards = new Set<string>();
      currentIds.forEach(id => {
        if (!prevIds.has(id)) newCards.add(id);
      });
      if (newCards.size > 0) {
        setEnteringCards(newCards);
        const timer = setTimeout(() => setEnteringCards(new Set()), 350);
        prevGameIdsRef.current = currentIds;
        return () => clearTimeout(timer);
      }
    }

    prevGameIdsRef.current = currentIds;
  }, [games]);

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
    const isEntering = enteringCards.has(game.id);
    const animClass = `game-card-animate${isEntering ? ' game-card-enter' : ''}`;
    if (cardViewMode === 'poster') {
      return (
        <div key={game.id} className={animClass}>
          <PosterCard game={game} allGames={allGames} idx={idx} onClick={() => onCardClick(game)} onQuickLog={(h) => onQuickLog(game, h)} isInQueue={isInQueue(game.id)} sortBy={sortBy} tintColor={gameColors.get(game.id)} />
        </div>
      );
    }
    return (
      <div key={game.id} className={animClass}>
        <CompactCard game={game} allGames={allGames} idx={idx} onClick={() => onCardClick(game)} onLogTime={() => onLogTime(game)} onToggleQueue={() => onToggleQueue(game)} onDelete={() => onDelete(game)} isInQueue={isInQueue(game.id)} sortBy={sortBy} tintColor={gameColors.get(game.id)} />
      </div>
    );
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
                <div key={g.id} className={`game-card-animate${enteringCards.has(g.id) ? ' game-card-enter' : ''}`}>
                  <NowPlayingCard game={g} allGames={allGames} onClick={() => onCardClick(g)} onQuickLog={(h) => onQuickLog(g, h)} sortBy={sortBy} tintColor={gameColors.get(g.id)} />
                </div>
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
              <div key={g.id} className={`game-card-animate${enteringCards.has(g.id) ? ' game-card-enter' : ''}`}>
                <NowPlayingCard game={g} allGames={allGames} onClick={() => onCardClick(g)} onQuickLog={(h) => onQuickLog(g, h)} />
              </div>
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

function NowPlayingCard({ game, allGames, onClick, onQuickLog, sortBy = 'hours', tintColor }: {
  game: GameWithMetrics;
  allGames: Game[];
  onClick: () => void;
  onQuickLog: (hours: number) => void;
  sortBy?: string;
  tintColor?: string;
}) {
  const [isFlipped, setIsFlipped] = useState(false);
  const rarity = getCardRarity(game);
  const relationship = getRelationshipStatus(game, allGames);
  const streak = getGameStreak(game);
  const heroNum = getHeroNumber(game);
  const freshness = getCardFreshness(game);
  const smartLine = getGameSmartOneLiner(game, allGames);
  const momentum = getSessionMomentum(game);
  const whisper = getContextualWhisper(game, allGames);
  const libraryRank = getLibraryRank(game, allGames, sortBy);
  const moodPulse = getCardMoodPulse(game);
  const progressRing = getProgressRingData(game, allGames);
  const avgSession = game.playLogs && game.playLogs.length > 0
    ? Math.round(game.playLogs.reduce((s, l) => s + l.hours, 0) / game.playLogs.length * 10) / 10
    : 2;

  const handleFlip = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFlipped(!isFlipped);
  };

  return (
    <div className="card-flip-container">
      <div className={clsx('card-flip-inner', isFlipped && 'flipped')}>
        {/* === FRONT FACE === */}
        <div
          onClick={onClick}
          className={clsx(
            'card-flip-front overflow-hidden rounded-xl border cursor-pointer transition-all relative now-playing-glow',
            rarity.borderClass || 'border-blue-500/20',
          )}
          style={{
            opacity: freshness.opacity,
            backgroundColor: relationship.cardTint || (tintColor ? `${tintColor}08` : undefined),
            backgroundImage: relationship.cardTint && tintColor ? `linear-gradient(${relationship.cardTint}, ${tintColor}06)` : undefined,
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
              <div className="h-20 bg-gradient-to-r from-blue-900/10 to-purple-900/10 flex items-center justify-center">
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

            {/* Library rank badge */}
            {libraryRank.rank > 0 && (() => {
              const pos: React.CSSProperties = streak.isActive ? { left: 52 } : rarity.tier === 'common' ? { right: 8 } : { left: 8 };
              return (
                <div
                  className="absolute top-2 text-[9px] px-1.5 py-0.5 bg-black/60 backdrop-blur-sm rounded font-bold text-white/50"
                  style={pos}
                >
                  {libraryRank.label}
                </div>
              );
            })()}

            {/* Hero number with progress ring */}
            <div className="absolute bottom-2 right-3">
              <ProgressRing progress={progressRing.progress} color={progressRing.color} size={44} strokeWidth={2}>
                <div className="text-right">
                  <div className="text-lg font-black leading-none" style={{ color: heroNum.color }}>{heroNum.value}</div>
                </div>
              </ProgressRing>
              <div className="text-[9px] text-white/30 text-right -mt-0.5">{heroNum.label}</div>
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

          {/* Stats bar with momentum dots */}
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
            {momentum.length >= 2 && <MomentumDots sessions={momentum} />}
            {game.platform && <span className="text-[9px] px-1.5 py-0.5 bg-white/5 rounded text-white/30">{game.platform}</span>}
          </div>

          {/* Smart one-liner + contextual whisper */}
          <div className="px-3 pb-1 -mt-1 space-y-0.5">
            {smartLine && (
              <p className="text-[10px] text-white/25 italic truncate">{smartLine}</p>
            )}
            {whisper.text && whisper.text !== smartLine && (
              <p className="text-[10px] text-white/20 italic truncate">{whisper.text}</p>
            )}
          </div>

          {/* Check-in button row */}
          <div className="px-3 pb-2.5 pt-1">
            <button
              onClick={(e) => { e.stopPropagation(); onQuickLog(avgSession); }}
              className="w-full px-4 py-2 bg-blue-600/20 text-blue-300 rounded-lg text-xs font-bold active:bg-blue-600/40 transition-all flex items-center justify-center gap-1.5 border border-blue-500/10"
            >
              <Clock size={12} /> Check In
            </button>
          </div>

          {/* Mood pulse strip */}
          {moodPulse.level !== 'never' && (
            <div
              className="h-[2px] mood-pulse-strip"
              style={{ backgroundColor: moodPulse.color }}
            />
          )}

          {/* Flip button */}
          <button
            onClick={handleFlip}
            className="absolute bottom-[42px] right-2 w-5 h-5 rounded-full bg-white/5 flex items-center justify-center text-white/20 hover:text-white/50 hover:bg-white/10 transition-all z-10"
            title="Flip card"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 1l4 4-4 4" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><path d="M7 23l-4-4 4-4" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
            </svg>
          </button>
        </div>

        {/* === BACK FACE === */}
        <PosterCardBack game={game} allGames={allGames} onFlip={handleFlip} rarity={rarity} freshness={freshness} relationship={relationship} />
      </div>
    </div>
  );
}

// --- Poster Card ---

function PosterCard({ game, allGames, idx, onClick, onQuickLog, isInQueue, sortBy = 'hours', tintColor }: {
  game: GameWithMetrics;
  allGames: Game[];
  idx: number;
  onClick: () => void;
  onQuickLog: (hours: number) => void;
  isInQueue: boolean;
  sortBy?: string;
  tintColor?: string;
}) {
  const [isFlipped, setIsFlipped] = useState(false);
  const rarity = getCardRarity(game);
  const relationship = getRelationshipStatus(game, allGames);
  const streak = getGameStreak(game);
  const heroNum = getHeroNumber(game);
  const freshness = getCardFreshness(game);
  const smartLine = getGameSmartOneLiner(game, allGames);
  const momentum = getSessionMomentum(game);
  const whisper = getContextualWhisper(game, allGames);
  const libraryRank = getLibraryRank(game, allGames, sortBy);
  const moodPulse = getCardMoodPulse(game);
  const progressRing = getProgressRingData(game, allGames);

  const handleFlip = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFlipped(!isFlipped);
  };

  return (
    <div
      className="card-flip-container card-enter"
      style={{ animationDelay: `${idx * 40}ms` }}
    >
      <div className={clsx('card-flip-inner', isFlipped && 'flipped')}>
        {/* === FRONT FACE === */}
        <div
          onClick={onClick}
          className={clsx(
            'card-flip-front overflow-hidden rounded-xl border cursor-pointer transition-all relative',
            rarity.borderClass || 'border-white/5',
          )}
          style={{
            opacity: freshness.opacity,
            backgroundColor: relationship.cardTint || (tintColor ? `${tintColor}08` : undefined),
            backgroundImage: relationship.cardTint && tintColor ? `linear-gradient(${relationship.cardTint}, ${tintColor}06)` : undefined,
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

            {/* Library rank badge — positioned to avoid overlap */}
            {libraryRank.rank > 0 && (() => {
              const pos: React.CSSProperties = streak.isActive ? { left: 52 } : rarity.tier === 'common' ? { right: 8 } : { left: 8 };
              return (
                <div
                  className="absolute top-2 text-[9px] px-1.5 py-0.5 bg-black/60 backdrop-blur-sm rounded font-bold text-white/50"
                  style={pos}
                >
                  {libraryRank.label}
                </div>
              );
            })()}

            {/* Hero number with progress ring */}
            <div className="absolute bottom-2 right-3">
              <ProgressRing progress={progressRing.progress} color={progressRing.color} size={44} strokeWidth={2}>
                <div className="text-right">
                  <div className="text-lg font-black leading-none" style={{ color: heroNum.color }}>{heroNum.value}</div>
                </div>
              </ProgressRing>
              <div className="text-[9px] text-white/30 text-right -mt-0.5">{heroNum.label}</div>
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

          {/* Stats bar with momentum dots */}
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
            {/* Momentum sparkline */}
            {momentum.length >= 2 && <MomentumDots sessions={momentum} />}
            {game.platform && <span className="text-[9px] px-1.5 py-0.5 bg-white/5 rounded text-white/30">{game.platform}</span>}
          </div>

          {/* Smart one-liner + contextual whisper */}
          <div className="px-3 pb-2.5 -mt-1 space-y-0.5">
            {smartLine && (
              <p className="text-[10px] text-white/25 italic truncate">{smartLine}</p>
            )}
            {whisper.text && whisper.text !== smartLine && (
              <p className="text-[10px] text-white/20 italic truncate">{whisper.text}</p>
            )}
          </div>

          {/* Mood pulse strip */}
          {moodPulse.level !== 'never' && (
            <div
              className="h-[2px] mood-pulse-strip"
              style={{ backgroundColor: moodPulse.color }}
            />
          )}

          {/* Flip button */}
          <button
            onClick={handleFlip}
            className="absolute bottom-[42px] right-2 w-5 h-5 rounded-full bg-white/5 flex items-center justify-center text-white/20 hover:text-white/50 hover:bg-white/10 transition-all z-10"
            title="Flip card"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 1l4 4-4 4" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><path d="M7 23l-4-4 4-4" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
            </svg>
          </button>
        </div>

        {/* === BACK FACE === */}
        <PosterCardBack game={game} allGames={allGames} onFlip={handleFlip} rarity={rarity} freshness={freshness} relationship={relationship} />
      </div>
    </div>
  );
}

// Back face content for poster card
function PosterCardBack({ game, allGames, onFlip, rarity, freshness, relationship }: {
  game: GameWithMetrics;
  allGames: Game[];
  onFlip: (e: React.MouseEvent) => void;
  rarity: ReturnType<typeof getCardRarity>;
  freshness: ReturnType<typeof getCardFreshness>;
  relationship: ReturnType<typeof getRelationshipStatus>;
}) {
  const backData = getCardBackData(game, allGames);

  return (
    <div
      className={clsx(
        'card-flip-back overflow-hidden rounded-xl border p-3 flex flex-col',
        rarity.borderClass || 'border-white/5',
      )}
      style={{
        opacity: freshness.opacity,
        backgroundColor: relationship.cardTint || 'rgba(10,10,15,0.95)',
      }}
    >
      {/* Header: game name + flip-back button */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-white/80 font-bold text-sm truncate flex-1">{game.name}</h3>
        <button
          onClick={onFlip}
          className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center text-white/30 hover:text-white/60 transition-all shrink-0 ml-2"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 1l4 4-4 4" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><path d="M7 23l-4-4 4-4" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
          </svg>
        </button>
      </div>

      {/* AI Whisper */}
      {backData.whisper && (
        <p className="text-[11px] text-white/50 italic mb-2.5 leading-relaxed">{backData.whisper}</p>
      )}

      {/* Mini sparkline: 30-day session dots */}
      {backData.sparkline.length > 0 && (
        <div className="mb-2.5">
          <div className="text-[9px] text-white/25 mb-1">Last 30 days</div>
          <div className="flex items-end gap-[2px] h-4">
            {backData.sparkline.map((s, i) => {
              const maxH = Math.max(...backData.sparkline.map(d => d.hours), 1);
              const height = Math.max(2, (s.hours / maxH) * 14);
              return (
                <div key={i} className="rounded-full bg-blue-400/60 shrink-0" style={{ width: 4, height }} />
              );
            })}
          </div>
        </div>
      )}

      {/* Library rank */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] text-white/30">📊</span>
        <span className="text-[11px] text-white/50">{backData.rank.label}</span>
        <span className="text-[10px] text-white/20">{backData.rank.detail}</span>
      </div>

      {/* Next milestone progress */}
      {backData.nextMilestone && (
        <div className="mb-2.5">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[10px]">{backData.nextMilestone.icon}</span>
            <span className="text-[10px] text-white/40">{backData.nextMilestone.name}</span>
            <span className="text-[10px] text-white/20 ml-auto">{backData.nextMilestone.label}</span>
          </div>
          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500/60 rounded-full transition-all"
              style={{ width: `${backData.nextMilestone.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Quick verdicts */}
      {backData.verdicts.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-auto pt-2">
          {backData.verdicts.map((v, i) => (
            <span key={i} className="text-[9px] px-2 py-0.5 rounded-full bg-white/5 font-medium" style={{ color: v.color }}>
              {v.category}: {v.verdict}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Compact Card (original layout, fixed) ---

function CompactCard({ game, allGames, idx, onClick, onLogTime, onToggleQueue, onDelete, isInQueue, sortBy = 'hours', tintColor }: {
  game: GameWithMetrics;
  allGames: Game[];
  idx: number;
  onClick: () => void;
  onLogTime: () => void;
  onToggleQueue: () => void;
  onDelete: () => void;
  isInQueue: boolean;
  sortBy?: string;
  tintColor?: string;
}) {
  const [isFlipped, setIsFlipped] = useState(false);
  const rarity = getCardRarity(game);
  const relationship = getRelationshipStatus(game, allGames);
  const streak = getGameStreak(game);
  const heroNum = getHeroNumber(game);
  const freshness = getCardFreshness(game);
  const daysCtx = getDaysContext(game);
  const franchise = getFranchiseInfo(game, allGames);
  const smartLine = getGameSmartOneLiner(game, allGames);
  const momentum = getSessionMomentum(game);
  const whisper = getContextualWhisper(game, allGames);
  const libraryRank = getLibraryRank(game, allGames, sortBy);
  const moodPulse = getCardMoodPulse(game);
  const progressRing = getProgressRingData(game, allGames);
  const lastPlayedStr = game.playLogs && game.playLogs.length > 0
    ? (() => {
        const sorted = [...game.playLogs].sort((a, b) => parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime());
        return getRelativeTime(sorted[0].date);
      })()
    : null;

  const handleFlip = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFlipped(!isFlipped);
  };

  return (
    <div
      className="card-flip-container card-enter"
      style={{ animationDelay: `${idx * 40}ms` }}
    >
      <div className={clsx('card-flip-inner', isFlipped && 'flipped')}>
        {/* === FRONT FACE === */}
        <div
          onClick={onClick}
          className={clsx(
            'card-flip-front p-4 rounded-xl border cursor-pointer transition-all relative',
            rarity.borderClass || 'border-white/5',
          )}
          style={{
            opacity: freshness.opacity,
            backgroundColor: relationship.cardTint || (tintColor ? `${tintColor}08` : undefined),
            backgroundImage: relationship.cardTint && tintColor ? `linear-gradient(${relationship.cardTint}, ${tintColor}06)` : undefined,
          }}
        >
          {/* Row 1: Thumbnail + Name + Hero Number with Progress Ring */}
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
                {/* Library rank badge */}
                {libraryRank.rank > 0 && (
                  <span className="text-[9px] px-1.5 py-0.5 bg-white/5 rounded text-white/35 font-medium shrink-0">
                    {libraryRank.label}
                  </span>
                )}
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

            {/* Hero number with progress ring */}
            <div className="shrink-0 text-right">
              <ProgressRing progress={progressRing.progress} color={progressRing.color} size={40} strokeWidth={2}>
                <div className="text-lg font-black leading-none" style={{ color: heroNum.color }}>{heroNum.value}</div>
              </ProgressRing>
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

          {/* Row 3: Stats grid with momentum dots */}
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

          {/* Momentum sparkline between stats and one-liner */}
          {momentum.length >= 2 && (
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[9px] text-white/20">Sessions:</span>
              <MomentumDots sessions={momentum} />
            </div>
          )}

          {/* Row 4: Smart one-liner + whisper */}
          <div className="mb-2 space-y-0.5">
            {smartLine && (
              <p className="text-[10px] text-white/25 italic truncate">{smartLine}</p>
            )}
            {whisper.text && whisper.text !== smartLine && (
              <p className="text-[10px] text-white/20 italic truncate">{whisper.text}</p>
            )}
          </div>

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
            {/* Flip button */}
            <button
              onClick={handleFlip}
              className="p-1.5 text-white/20 hover:text-white/50 rounded-lg transition-all"
              title="Flip card"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 1l4 4-4 4" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><path d="M7 23l-4-4 4-4" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
              </svg>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="p-1.5 text-white/20 active:text-red-400 rounded-lg transition-all"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          </div>

          {/* Mood pulse strip */}
          {moodPulse.level !== 'never' && (
            <div
              className="absolute bottom-0 left-0 right-0 h-[2px] rounded-b-xl mood-pulse-strip"
              style={{ backgroundColor: moodPulse.color }}
            />
          )}
        </div>

        {/* === BACK FACE === */}
        <CompactCardBack game={game} allGames={allGames} onFlip={handleFlip} rarity={rarity} freshness={freshness} relationship={relationship} />
      </div>
    </div>
  );
}

// Back face content for compact card
function CompactCardBack({ game, allGames, onFlip, rarity, freshness, relationship }: {
  game: GameWithMetrics;
  allGames: Game[];
  onFlip: (e: React.MouseEvent) => void;
  rarity: ReturnType<typeof getCardRarity>;
  freshness: ReturnType<typeof getCardFreshness>;
  relationship: ReturnType<typeof getRelationshipStatus>;
}) {
  const backData = getCardBackData(game, allGames);

  return (
    <div
      className={clsx(
        'card-flip-back rounded-xl border p-4 flex flex-col',
        rarity.borderClass || 'border-white/5',
      )}
      style={{
        opacity: freshness.opacity,
        backgroundColor: relationship.cardTint || 'rgba(10,10,15,0.95)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2.5">
        <h3 className="text-white/80 font-bold text-sm truncate flex-1">{game.name}</h3>
        <button
          onClick={onFlip}
          className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-white/30 hover:text-white/60 transition-all shrink-0 ml-2"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 1l4 4-4 4" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><path d="M7 23l-4-4 4-4" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
          </svg>
        </button>
      </div>

      {/* AI Whisper */}
      {backData.whisper && (
        <p className="text-[11px] text-white/50 italic mb-3 leading-relaxed">{backData.whisper}</p>
      )}

      {/* Mini sparkline */}
      {backData.sparkline.length > 0 && (
        <div className="mb-3">
          <div className="text-[9px] text-white/25 mb-1">Last 30 days</div>
          <div className="flex items-end gap-[2px] h-4">
            {backData.sparkline.map((s, i) => {
              const maxH = Math.max(...backData.sparkline.map(d => d.hours), 1);
              const height = Math.max(2, (s.hours / maxH) * 14);
              return (
                <div key={i} className="rounded-full bg-blue-400/60 shrink-0" style={{ width: 4, height }} />
              );
            })}
          </div>
        </div>
      )}

      {/* Library rank */}
      <div className="flex items-center gap-2 mb-2.5">
        <span className="text-[10px] text-white/30">📊</span>
        <span className="text-[11px] text-white/50">{backData.rank.label}</span>
        <span className="text-[10px] text-white/20">{backData.rank.detail}</span>
      </div>

      {/* Next milestone */}
      {backData.nextMilestone && (
        <div className="mb-3">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[10px]">{backData.nextMilestone.icon}</span>
            <span className="text-[10px] text-white/40">{backData.nextMilestone.name}</span>
            <span className="text-[10px] text-white/20 ml-auto">{backData.nextMilestone.label}</span>
          </div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500/60 rounded-full transition-all"
              style={{ width: `${backData.nextMilestone.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Quick verdicts */}
      {backData.verdicts.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-auto pt-2">
          {backData.verdicts.map((v, i) => (
            <span key={i} className="text-[9px] px-2 py-0.5 rounded-full bg-white/5 font-medium" style={{ color: v.color }}>
              {v.category}: {v.verdict}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
