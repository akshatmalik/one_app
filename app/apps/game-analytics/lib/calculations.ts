import { Game, GameStatus, GameMetrics, AnalyticsSummary, TasteProfile, SessionMood } from './types';

/**
 * Parse a YYYY-MM-DD date string as local time instead of UTC.
 * new Date("2025-02-10") parses as UTC midnight, which shifts to the
 * previous day in western timezones. This function avoids that by using
 * the Date constructor with numeric arguments (which uses local time).
 */
export function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

const BASELINE_COST = 3.5;

/**
 * Calculate total hours for a game: baseline hours + logged session hours
 * This allows tracking historical hours while adding new detailed play sessions
 */
export function getTotalHours(game: Game): number {
  const loggedHours = game.playLogs?.reduce((sum, log) => sum + log.hours, 0) || 0;
  return game.hours + loggedHours;
}

export function calculateCostPerHour(price: number, hours: number): number {
  return hours > 0 ? price / hours : 0;
}

function calculateBlendScore(rating: number, costPerHour: number): number {
  const normalizedCost = Math.min(costPerHour / BASELINE_COST, 1);
  return (rating * 10) + (10 - normalizedCost * 10);
}

export function getValueRating(costPerHour: number): 'Excellent' | 'Good' | 'Fair' | 'Poor' {
  if (costPerHour === 0) return 'Excellent';
  if (costPerHour <= 1) return 'Excellent';
  if (costPerHour <= 3) return 'Good';
  if (costPerHour <= 5) return 'Fair';
  return 'Poor';
}

/**
 * Get exponential rating weight for ROI calculation
 * 10 → 20.0 (double of 9)
 * 9 → 10.0 (1.5x of 8)
 * 8 → 6.7
 * Lower ratings receive progressively less weight
 */
function getRatingWeight(rating: number): number {
  const weights: { [key: number]: number } = {
    10: 20.0,
    9: 10.0,
    8: 6.7,
    7: 4.8,
    6: 3.4,
    5: 2.4,
    4: 1.7,
    3: 1.2,
    2: 0.8,
    1: 0.6,
    0: 0.3,
  };

  // Round to nearest integer for lookup
  const roundedRating = Math.round(rating);
  return weights[roundedRating] || weights[5]; // Default to 5 if not found
}

/**
 * Calculate ROI (Return on Investment) with exponential rating weight
 * Formula calibrated so: $70, 15h, 9/10 = ROI of 10
 * High ratings are weighted exponentially to reflect their true value
 *
 * Examples:
 * - $70, 15h, 9/10 = 10.0 (Excellent baseline)
 * - $70, 15h, 10/10 = 20.0 (Perfect game)
 * - $70, 50h, 6/10 = 11.3 (Long but mediocre)
 * - $70, 10h, 9/10 = 6.7 (Good but short)
 */
function calculateROI(rating: number, hours: number, price: number): number {
  if (price === 0) return getRatingWeight(rating) * hours; // Free games get massive ROI
  const weight = getRatingWeight(rating);
  const roi = (weight * hours * 4.67) / price;
  return Math.round(roi * 10) / 10; // Round to 1 decimal place
}

function calculateDaysToComplete(startDate?: string, endDate?: string): number | null {
  if (!startDate || !endDate) return null;
  const start = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function calculateMetrics(game: Game): GameMetrics {
  const totalHours = getTotalHours(game);
  const costPerHour = calculateCostPerHour(game.price, totalHours);
  const normalizedCost = costPerHour / BASELINE_COST;
  return {
    costPerHour,
    blendScore: calculateBlendScore(game.rating, costPerHour),
    normalizedCost,
    valueRating: getValueRating(costPerHour),
    roi: calculateROI(game.rating, totalHours, game.price),
    daysToComplete: calculateDaysToComplete(game.startDate, game.endDate),
  };
}

export function calculateSummary(games: Game[]): AnalyticsSummary {
  const ownedGames = games.filter(g => g.status !== 'Wishlist');
  const wishlistGames = games.filter(g => g.status === 'Wishlist');
  const completedGames = ownedGames.filter(g => g.status === 'Completed');
  const inProgressGames = ownedGames.filter(g => g.status === 'In Progress');
  const notStartedGames = ownedGames.filter(g => g.status === 'Not Started');
  const abandonedGames = ownedGames.filter(g => g.status === 'Abandoned');
  const playedGames = ownedGames.filter(g => getTotalHours(g) > 0);

  // Financial calculations
  const totalSpent = ownedGames.reduce((sum, g) => sum + g.price, 0);
  const wishlistValue = wishlistGames.reduce((sum, g) => sum + g.price, 0);
  const backlogValue = notStartedGames.reduce((sum, g) => sum + g.price, 0);
  const averagePrice = ownedGames.length > 0 ? totalSpent / ownedGames.length : 0;

  // Discount savings (for paid games that have originalPrice set)
  const gamesWithDiscount = ownedGames.filter(g =>
    !g.acquiredFree && g.originalPrice && g.originalPrice > g.price
  );
  const totalDiscountSavings = gamesWithDiscount.reduce((sum, g) =>
    sum + ((g.originalPrice || 0) - g.price), 0
  );
  const averageDiscount = gamesWithDiscount.length > 0
    ? gamesWithDiscount.reduce((sum, g) => {
        const discount = ((g.originalPrice || 0) - g.price) / (g.originalPrice || 1) * 100;
        return sum + discount;
      }, 0) / gamesWithDiscount.length
    : 0;

  // Time calculations
  const totalHours = ownedGames.reduce((sum, g) => sum + getTotalHours(g), 0);
  const averageHoursPerGame = playedGames.length > 0 ? totalHours / playedGames.length : 0;
  const averageCostPerHour = totalHours > 0 ? totalSpent / totalHours : 0;

  // Rating calculations
  const ratedGames = ownedGames.filter(g => getTotalHours(g) > 0);
  const averageRating = ratedGames.length > 0
    ? ratedGames.reduce((sum, g) => sum + g.rating, 0) / ratedGames.length
    : 0;

  // Completion time calculations
  const gamesWithCompletionTime = completedGames.filter(g => g.startDate && g.endDate);
  const completionTimes = gamesWithCompletionTime.map(g => calculateDaysToComplete(g.startDate, g.endDate)!);
  const averageDaysToComplete = completionTimes.length > 0
    ? completionTimes.reduce((sum, d) => sum + d, 0) / completionTimes.length
    : null;

  // Completion rate
  const completionRate = ownedGames.length > 0
    ? (completedGames.length / ownedGames.length) * 100
    : 0;

  // Find highlights
  let bestValue: { name: string; costPerHour: number } | null = null;
  let worstValue: { name: string; costPerHour: number } | null = null;
  let mostPlayed: { name: string; hours: number } | null = null;
  let highestRated: { name: string; rating: number } | null = null;
  let bestROI: { name: string; roi: number } | null = null;

  if (playedGames.length > 0) {
    // Best value (min 5 hours, exclude free games)
    const qualifiedForValue = playedGames.filter(g => getTotalHours(g) >= 5 && !g.acquiredFree);
    if (qualifiedForValue.length > 0) {
      const sortedByValue = [...qualifiedForValue].sort((a, b) =>
        calculateCostPerHour(a.price, getTotalHours(a)) - calculateCostPerHour(b.price, getTotalHours(b))
      );
      const best = sortedByValue[0];
      bestValue = { name: best.name, costPerHour: calculateCostPerHour(best.price, getTotalHours(best)) };

      // Worst value (min 2 hours, exclude free games)
      const paidGames = qualifiedForValue.filter(g => g.price > 0 && getTotalHours(g) >= 2);
      if (paidGames.length > 0) {
        const worst = [...paidGames].sort((a, b) =>
          calculateCostPerHour(b.price, getTotalHours(b)) - calculateCostPerHour(a.price, getTotalHours(a))
        )[0];
        worstValue = { name: worst.name, costPerHour: calculateCostPerHour(worst.price, getTotalHours(worst)) };
      }
    }

    // Most played
    const sortedByHours = [...playedGames].sort((a, b) => getTotalHours(b) - getTotalHours(a));
    mostPlayed = { name: sortedByHours[0].name, hours: getTotalHours(sortedByHours[0]) };

    // Highest rated
    const sortedByRating = [...ratedGames].sort((a, b) => b.rating - a.rating);
    if (sortedByRating.length > 0) {
      highestRated = { name: sortedByRating[0].name, rating: sortedByRating[0].rating };
    }

    // Best ROI (exclude free games)
    const paidGamesWithROI = playedGames
      .filter(g => g.price > 0 && !g.acquiredFree)
      .map(g => ({
        ...g,
        roi: calculateROI(g.rating, getTotalHours(g), g.price)
      }))
      .sort((a, b) => b.roi - a.roi);
    if (paidGamesWithROI.length > 0) {
      bestROI = { name: paidGamesWithROI[0].name, roi: paidGamesWithROI[0].roi };
    }
  }

  // Spending breakdowns
  const spendingByGenre: Record<string, number> = {};
  const spendingByPlatform: Record<string, number> = {};
  const spendingBySource: Record<string, number> = {};
  const spendingByYear: Record<string, number> = {};
  const hoursByGenre: Record<string, number> = {};
  const spendingByFranchise: Record<string, number> = {};
  const hoursByFranchise: Record<string, number> = {};
  const gamesByFranchise: Record<string, number> = {};

  ownedGames.forEach(game => {
    // By genre
    const genre = game.genre || 'Unknown';
    spendingByGenre[genre] = (spendingByGenre[genre] || 0) + game.price;
    hoursByGenre[genre] = (hoursByGenre[genre] || 0) + getTotalHours(game);

    // By platform
    const platform = game.platform || 'Unknown';
    spendingByPlatform[platform] = (spendingByPlatform[platform] || 0) + game.price;

    // By source
    const source = game.purchaseSource || 'Unknown';
    spendingBySource[source] = (spendingBySource[source] || 0) + game.price;

    // By year
    if (game.datePurchased) {
      const year = game.datePurchased.split('-')[0];
      spendingByYear[year] = (spendingByYear[year] || 0) + game.price;
    }

    // By franchise
    if (game.franchise) {
      spendingByFranchise[game.franchise] = (spendingByFranchise[game.franchise] || 0) + game.price;
      hoursByFranchise[game.franchise] = (hoursByFranchise[game.franchise] || 0) + getTotalHours(game);
      gamesByFranchise[game.franchise] = (gamesByFranchise[game.franchise] || 0) + 1;
    }
  });

  // Subscription/Free game stats
  const freeGames = ownedGames.filter(g => g.acquiredFree);
  const freeGamesCount = freeGames.length;
  const totalSaved = freeGames.reduce((sum, g) => sum + (g.originalPrice || 0), 0);

  const hoursBySubscription: Record<string, number> = {};
  const savedBySubscription: Record<string, number> = {};
  const gamesBySubscription: Record<string, number> = {};

  freeGames.forEach(game => {
    const source = game.subscriptionSource || 'Other';
    hoursBySubscription[source] = (hoursBySubscription[source] || 0) + getTotalHours(game);
    savedBySubscription[source] = (savedBySubscription[source] || 0) + (game.originalPrice || 0);
    gamesBySubscription[source] = (gamesBySubscription[source] || 0) + 1;
  });

  return {
    // Counts
    totalGames: games.length,
    ownedCount: ownedGames.length,
    wishlistCount: wishlistGames.length,
    completedCount: completedGames.length,
    inProgressCount: inProgressGames.length,
    notStartedCount: notStartedGames.length,
    abandonedCount: abandonedGames.length,

    // Financial
    totalSpent,
    wishlistValue,
    backlogValue,
    averagePrice,
    averageCostPerHour,
    totalDiscountSavings,
    averageDiscount,

    // Time
    totalHours,
    averageHoursPerGame,
    averageRating,
    averageDaysToComplete,

    // Completion
    completionRate,

    // Highlights
    bestValue,
    worstValue,
    mostPlayed,
    highestRated,
    bestROI,

    // Breakdowns
    spendingByGenre,
    spendingByPlatform,
    spendingBySource,
    spendingByYear,
    hoursByGenre,

    // Franchise stats
    spendingByFranchise,
    hoursByFranchise,
    gamesByFranchise,

    // Subscription/Free game stats
    freeGamesCount,
    totalSaved,
    hoursBySubscription,
    savedBySubscription,
    gamesBySubscription,
  };
}

// Helper to get all play logs across all games, sorted by date
export function getAllPlayLogs(games: Game[]): Array<{ game: Game; log: NonNullable<Game['playLogs']>[0] }> {
  const allLogs: Array<{ game: Game; log: NonNullable<Game['playLogs']>[0] }> = [];

  games.forEach(game => {
    if (game.playLogs) {
      game.playLogs.forEach(log => {
        allLogs.push({ game, log });
      });
    }
  });

  return allLogs.sort((a, b) => parseLocalDate(b.log.date).getTime() - parseLocalDate(a.log.date).getTime());
}

// Get hours played per month from play logs
export function getHoursByMonth(games: Game[]): Record<string, number> {
  const hoursByMonth: Record<string, number> = {};

  games.forEach(game => {
    if (game.playLogs) {
      game.playLogs.forEach(log => {
        const monthKey = log.date.substring(0, 7); // YYYY-MM
        hoursByMonth[monthKey] = (hoursByMonth[monthKey] || 0) + log.hours;
      });
    }
  });

  return hoursByMonth;
}

// Get spending by month from purchase dates
export function getSpendingByMonth(games: Game[]): Record<string, number> {
  const spendingByMonth: Record<string, number> = {};

  games.filter(g => g.status !== 'Wishlist').forEach(game => {
    if (game.datePurchased) {
      const monthKey = game.datePurchased.substring(0, 7); // YYYY-MM
      spendingByMonth[monthKey] = (spendingByMonth[monthKey] || 0) + game.price;
    }
  });

  return spendingByMonth;
}

// Get cumulative spending over time
export function getCumulativeSpending(games: Game[]): Array<{ month: string; total: number; cumulative: number }> {
  const spendingByMonth = getSpendingByMonth(games);
  const months = Object.keys(spendingByMonth).sort();

  let cumulative = 0;
  return months.map(month => {
    cumulative += spendingByMonth[month];
    return {
      month,
      total: spendingByMonth[month],
      cumulative,
    };
  });
}

// ========================================
// PERIOD-BASED STATS (WEEKLY/MONTHLY)
// ========================================

export interface PeriodStats {
  gamesPlayed: Game[];
  totalHours: number;
  totalSessions: number;
  mostPlayedGame: { name: string; hours: number; thumbnail?: string } | null;
  averageSessionLength: number;
  uniqueGames: number;
}

export function getPeriodStats(games: Game[], days: number): PeriodStats {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const gamesWithRecentActivity: Map<string, { game: Game; hours: number; sessions: number }> = new Map();
  let totalHours = 0;
  let totalSessions = 0;

  games.forEach(game => {
    if (game.playLogs) {
      game.playLogs.forEach(log => {
        const logDate = parseLocalDate(log.date);
        if (logDate >= cutoffDate) {
          const existing = gamesWithRecentActivity.get(game.id) || { game, hours: 0, sessions: 0 };
          existing.hours += log.hours;
          existing.sessions += 1;
          gamesWithRecentActivity.set(game.id, existing);
          totalHours += log.hours;
          totalSessions += 1;
        }
      });
    }
  });

  const gamesPlayed = Array.from(gamesWithRecentActivity.values()).map(g => g.game);
  const mostPlayedEntry = Array.from(gamesWithRecentActivity.values())
    .sort((a, b) => b.hours - a.hours)[0];

  return {
    gamesPlayed,
    totalHours,
    totalSessions,
    mostPlayedGame: mostPlayedEntry ? { name: mostPlayedEntry.game.name, hours: mostPlayedEntry.hours, thumbnail: mostPlayedEntry.game.thumbnail } : null,
    averageSessionLength: totalSessions > 0 ? totalHours / totalSessions : 0,
    uniqueGames: gamesPlayed.length,
  };
}

// Get stats for a specific date range
function getPeriodStatsForRange(games: Game[], startDate: Date, endDate: Date): PeriodStats {
  const gamesWithActivity: Map<string, { game: Game; hours: number; sessions: number }> = new Map();
  let totalHours = 0;
  let totalSessions = 0;

  games.forEach(game => {
    if (game.playLogs) {
      game.playLogs.forEach(log => {
        const logDate = parseLocalDate(log.date);
        if (logDate >= startDate && logDate <= endDate) {
          const existing = gamesWithActivity.get(game.id) || { game, hours: 0, sessions: 0 };
          existing.hours += log.hours;
          existing.sessions += 1;
          gamesWithActivity.set(game.id, existing);
          totalHours += log.hours;
          totalSessions += 1;
        }
      });
    }
  });

  const gamesPlayed = Array.from(gamesWithActivity.values()).map(g => g.game);
  const mostPlayedEntry = Array.from(gamesWithActivity.values())
    .sort((a, b) => b.hours - a.hours)[0];

  return {
    gamesPlayed,
    totalHours,
    totalSessions,
    mostPlayedGame: mostPlayedEntry ? { name: mostPlayedEntry.game.name, hours: mostPlayedEntry.hours, thumbnail: mostPlayedEntry.game.thumbnail } : null,
    averageSessionLength: totalSessions > 0 ? totalHours / totalSessions : 0,
    uniqueGames: gamesPlayed.length,
  };
}

// Get last week stats (7 days before this week)
export function getLastWeekStats(games: Game[]): PeriodStats {
  const today = new Date();
  const endDate = new Date(today);
  endDate.setDate(today.getDate() - 7);
  endDate.setHours(23, 59, 59, 999);

  const startDate = new Date(endDate);
  startDate.setDate(endDate.getDate() - 6);
  startDate.setHours(0, 0, 0, 0);

  return getPeriodStatsForRange(games, startDate, endDate);
}

// Get last month stats (30 days before this month)
export function getLastMonthStats(games: Game[]): PeriodStats {
  const today = new Date();
  const endDate = new Date(today);
  endDate.setDate(today.getDate() - 30);
  endDate.setHours(23, 59, 59, 999);

  const startDate = new Date(endDate);
  startDate.setDate(endDate.getDate() - 29);
  startDate.setHours(0, 0, 0, 0);

  return getPeriodStatsForRange(games, startDate, endDate);
}

// ========================================
// FUN & CREATIVE STATS
// ========================================

export interface HiddenGem {
  game: Game;
  score: number; // Calculated value score
}

// Find "Hidden Gems" - games with amazing value (low price, high hours, high rating)
export function findHiddenGems(games: Game[]): HiddenGem[] {
  const playedGames = games.filter(g => getTotalHours(g) >= 10 && g.status !== 'Wishlist' && !g.acquiredFree);

  return playedGames
    .map(game => {
      const totalHours = getTotalHours(game);
      const costPerHour = calculateCostPerHour(game.price, totalHours);
      const valueScore = (game.rating * 10) / (costPerHour + 0.1); // Higher is better
      return { game, score: valueScore };
    })
    .filter(g => g.game.price <= 20 && g.game.rating >= 7)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

export interface RegretPurchase {
  game: Game;
  regretScore: number; // Higher = more regret
}

// Find "Regret Purchases" - expensive games with low playtime
export function findRegretPurchases(games: Game[]): RegretPurchase[] {
  const ownedGames = games.filter(g => g.status !== 'Wishlist' && !g.acquiredFree && g.price > 20);

  return ownedGames
    .map(game => {
      // Regret score: high price, low hours relative to purchase date
      const daysSincePurchase = game.datePurchased
        ? Math.max(1, (Date.now() - parseLocalDate(game.datePurchased).getTime()) / (1000 * 60 * 60 * 24))
        : 365;
      const expectedHours = Math.min(daysSincePurchase * 0.5, 50); // Expect at least 0.5h per day, max 50h
      const totalHours = getTotalHours(game);
      const hourDeficit = Math.max(0, expectedHours - totalHours);
      const regretScore = (game.price / 10) * hourDeficit;
      return { game, regretScore };
    })
    .filter(g => g.regretScore > 5)
    .sort((a, b) => b.regretScore - a.regretScore)
    .slice(0, 5);
}

export interface ShelfWarmer {
  game: Game;
  daysSitting: number;
}

// Find "Shelf Warmers" - not started games gathering dust
export function findShelfWarmers(games: Game[]): ShelfWarmer[] {
  const backlogGames = games.filter(g =>
    g.status === 'Not Started' && g.datePurchased && g.price > 0
  );

  return backlogGames
    .map(game => {
      const daysSitting = game.datePurchased
        ? (Date.now() - parseLocalDate(game.datePurchased).getTime()) / (1000 * 60 * 60 * 24)
        : 0;
      return { game, daysSitting };
    })
    .filter(g => g.daysSitting > 30)
    .sort((a, b) => b.daysSitting - a.daysSitting)
    .slice(0, 5);
}

// Gaming velocity - hours per day over the last period
export function getGamingVelocity(games: Game[], days: number): number {
  const stats = getPeriodStats(games, days);
  return stats.totalHours / days;
}

// Find the best gaming month (most hours logged)
export function getBestGamingMonth(games: Game[]): { month: string; hours: number } | null {
  const hoursByMonth = getHoursByMonth(games);
  const entries = Object.entries(hoursByMonth);
  if (entries.length === 0) return null;

  const best = entries.sort((a, b) => b[1] - a[1])[0];
  return { month: best[0], hours: best[1] };
}

// Calculate gaming streak (consecutive days with play logs)
export function getCurrentGamingStreak(games: Game[]): number {
  const allLogs = getAllPlayLogs(games);
  if (allLogs.length === 0) return 0;

  const uniqueDates = Array.from(new Set(allLogs.map(l => l.log.date))).sort().reverse();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let streak = 0;
  let checkDate = new Date(today);

  for (const dateStr of uniqueDates) {
    const logDate = parseLocalDate(dateStr);
    logDate.setHours(0, 0, 0, 0);

    const diffDays = Math.round((checkDate.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === streak) {
      streak++;
    } else if (diffDays > streak) {
      break;
    }
  }

  return streak;
}

// Completion velocity - average days to complete games
export function getCompletionVelocity(games: Game[]): number | null {
  const completed = games.filter(g =>
    g.status === 'Completed' && g.startDate && g.endDate
  );

  if (completed.length === 0) return null;

  const times = completed.map(g => calculateDaysToComplete(g.startDate, g.endDate)!);
  return times.reduce((sum, days) => sum + days, 0) / times.length;
}

// Platform preference score (0-100 based on hours played per platform)
export function getPlatformPreference(games: Game[]): Array<{ platform: string; score: number; hours: number }> {
  const platformHours: Record<string, number> = {};
  const playedGames = games.filter(g => getTotalHours(g) > 0);

  playedGames.forEach(game => {
    const platform = game.platform || 'Unknown';
    platformHours[platform] = (platformHours[platform] || 0) + getTotalHours(game);
  });

  const totalHours = Object.values(platformHours).reduce((sum, h) => sum + h, 0);

  return Object.entries(platformHours)
    .map(([platform, hours]) => ({
      platform,
      hours,
      score: totalHours > 0 ? (hours / totalHours) * 100 : 0,
    }))
    .sort((a, b) => b.hours - a.hours);
}

// Get discount effectiveness - how much you saved per game on average

/**
 * Get ROI rating category based on exponential rating weight formula
 * New formula heavily weights rating quality: (ratingWeight × hours × 4.67) / price
 *
 * Calibrated thresholds:
 * - Excellent: ≥10 (e.g., $70, 15h, 9/10 = 10.0 or $70, 10h, 10/10 = 13.3)
 * - Good: 5-9.9 (e.g., $70, 15h, 8/10 = 6.7 or $70, 10h, 9/10 = 6.7)
 * - Fair: 2-4.9 (e.g., $70, 15h, 6/10 = 3.4 or $70, 15h, 7/10 = 4.8)
 * - Poor: <2 (e.g., very short playtime or low ratings)
 */
export function getROIRating(roi: number): 'Excellent' | 'Good' | 'Fair' | 'Poor' {
  if (roi >= 10) return 'Excellent';  // High-quality games with solid playtime
  if (roi >= 5) return 'Good';        // Good value overall
  if (roi >= 2) return 'Fair';        // Decent but could be better
  return 'Poor';                      // Low value
}

// Get longest gaming streak ever
export function getLongestGamingStreak(games: Game[]): number {
  const allLogs = getAllPlayLogs(games);
  if (allLogs.length === 0) return 0;

  const uniqueDates = Array.from(new Set(allLogs.map(l => l.log.date))).sort();
  let longestStreak = 1;
  let currentStreak = 1;

  for (let i = 1; i < uniqueDates.length; i++) {
    const prevDate = parseLocalDate(uniqueDates[i - 1]);
    const currDate = parseLocalDate(uniqueDates[i]);
    const diffDays = Math.round((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      currentStreak++;
      longestStreak = Math.max(longestStreak, currentStreak);
    } else {
      currentStreak = 1;
    }
  }

  return longestStreak;
}


// Calculate impulse buyer stat (average days between purchase and first play)
export function getImpulseBuyerStat(games: Game[]): number | null {
  const gamesWithData = games.filter(g =>
    g.datePurchased && g.playLogs && g.playLogs.length > 0 && g.status !== 'Wishlist'
  );

  if (gamesWithData.length === 0) return null;

  const delays = gamesWithData.map(game => {
    const purchaseDate = parseLocalDate(game.datePurchased!);
    const firstPlayDate = parseLocalDate(game.playLogs![0].date);
    return Math.max(0, (firstPlayDate.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24));
  });

  return delays.reduce((sum, d) => sum + d, 0) / delays.length;
}

// Calculate backlog in days (total unplayed hours / 24)
export function getBacklogInDays(games: Game[]): number {
  const unplayedGames = games.filter(g => g.status === 'Not Started' && getTotalHours(g) === 0);
  // Estimate 20 hours per unplayed game
  const estimatedHours = unplayedGames.length * 20;
  return estimatedHours / 24;
}

// Calculate genre diversity (number of unique genres played / total genres)
export function getGenreDiversity(games: Game[]): { uniqueGenres: number; percentage: number } {
  const playedGames = games.filter(g => getTotalHours(g) > 0 && g.genre);
  const uniqueGenres = new Set(playedGames.map(g => g.genre)).size;
  const totalGenres = new Set(games.filter(g => g.genre).map(g => g.genre)).size;

  return {
    uniqueGenres,
    percentage: totalGenres > 0 ? (uniqueGenres / totalGenres) * 100 : 0,
  };
}

// Calculate commitment score (% of library with >10 hours)
export function getCommitmentScore(games: Game[]): number {
  const ownedGames = games.filter(g => g.status !== 'Wishlist');
  if (ownedGames.length === 0) return 0;

  const committedGames = ownedGames.filter(g => getTotalHours(g) >= 10);
  return (committedGames.length / ownedGames.length) * 100;
}

// Get fastest completion (shortest days to complete)
export function getFastestCompletion(games: Game[]): { game: Game; days: number } | null {
  const completed = games.filter(g =>
    g.status === 'Completed' && g.startDate && g.endDate
  );

  if (completed.length === 0) return null;

  const withDays = completed.map(g => ({
    game: g,
    days: calculateDaysToComplete(g.startDate, g.endDate)!,
  })).sort((a, b) => a.days - b.days);

  return withDays[0];
}

// Get slowest/longest completion
export function getSlowestCompletion(games: Game[]): { game: Game; days: number } | null {
  const completed = games.filter(g =>
    g.status === 'Completed' && g.startDate && g.endDate
  );

  if (completed.length === 0) return null;

  const withDays = completed.map(g => ({
    game: g,
    days: calculateDaysToComplete(g.startDate, g.endDate)!,
  })).sort((a, b) => b.days - a.days);

  return withDays[0];
}

// Get longest single session
export function getLongestSession(games: Game[]): { game: Game; hours: number; date: string } | null {
  let longest: { game: Game; hours: number; date: string } | null = null;

  games.forEach(game => {
    if (game.playLogs) {
      game.playLogs.forEach(log => {
        if (!longest || log.hours > longest.hours) {
          longest = { game, hours: log.hours, date: log.date };
        }
      });
    }
  });

  return longest;
}

// Get "Century Club" games (100+ hours)
export function getCenturyClubGames(games: Game[]): Game[] {
  return games.filter(g => getTotalHours(g) >= 100 && g.status !== 'Wishlist')
    .sort((a, b) => getTotalHours(b) - getTotalHours(a));
}

// Get "Quick Fix" games (completed in <10 hours)
export function getQuickFixGames(games: Game[]): Game[] {
  return games.filter(g =>
    g.status === 'Completed' && getTotalHours(g) > 0 && getTotalHours(g) < 10
  ).sort((a, b) => getTotalHours(a) - getTotalHours(b));
}

// Get patient gamer stats (games bought at 30%+ discount)
export function getPatientGamerStats(games: Game[]): { count: number; avgDiscount: number; totalSaved: number } {
  const patientGames = games.filter(g =>
    !g.acquiredFree &&
    g.originalPrice &&
    g.originalPrice > g.price &&
    ((g.originalPrice - g.price) / g.originalPrice) >= 0.3 &&
    g.status !== 'Wishlist'
  );

  if (patientGames.length === 0) {
    return { count: 0, avgDiscount: 0, totalSaved: 0 };
  }

  const totalSaved = patientGames.reduce((sum, g) => sum + ((g.originalPrice || 0) - g.price), 0);
  const avgDiscount = patientGames.reduce((sum, g) => {
    const discount = ((g.originalPrice || 0) - g.price) / (g.originalPrice || 1) * 100;
    return sum + discount;
  }, 0) / patientGames.length;

  return { count: patientGames.length, avgDiscount, totalSaved };
}

// Get completionist rate (completed vs abandoned)
export function getCompletionistRate(games: Game[]): {
  completionRate: number;
  abandonRate: number;
  completedCount: number;
  abandonedCount: number;
} {
  const finishedGames = games.filter(g =>
    g.status === 'Completed' || g.status === 'Abandoned'
  );

  if (finishedGames.length === 0) {
    return { completionRate: 0, abandonRate: 0, completedCount: 0, abandonedCount: 0 };
  }

  const completedCount = games.filter(g => g.status === 'Completed').length;
  const abandonedCount = games.filter(g => g.status === 'Abandoned').length;

  return {
    completionRate: (completedCount / finishedGames.length) * 100,
    abandonRate: (abandonedCount / finishedGames.length) * 100,
    completedCount,
    abandonedCount,
  };
}

// Get hidden gems (cheap games with high value)
// Get most invested franchise
export function getMostInvestedFranchise(games: Game[]): {
  franchise: string;
  spent: number;
  hours: number;
  games: number
} | null {
  const franchiseStats: Record<string, { spent: number; hours: number; games: number }> = {};

  games.filter(g => g.franchise && g.status !== 'Wishlist').forEach(game => {
    const f = game.franchise!;
    if (!franchiseStats[f]) {
      franchiseStats[f] = { spent: 0, hours: 0, games: 0 };
    }
    franchiseStats[f].spent += game.price;
    franchiseStats[f].hours += getTotalHours(game);
    franchiseStats[f].games += 1;
  });

  const entries = Object.entries(franchiseStats);
  if (entries.length === 0) return null;

  const best = entries.sort((a, b) => b[1].hours - a[1].hours)[0];
  return { franchise: best[0], ...best[1] };
}

// Get value champion (best cost per hour across all played games)
export function getValueChampion(games: Game[]): { game: Game; costPerHour: number } | null {
  const playedGames = games.filter(g =>
    getTotalHours(g) >= 5 &&
    g.status !== 'Wishlist' &&
    !g.acquiredFree
  );

  if (playedGames.length === 0) return null;

  const best = playedGames.sort((a, b) =>
    calculateCostPerHour(a.price, getTotalHours(a)) - calculateCostPerHour(b.price, getTotalHours(b))
  )[0];

  return { game: best, costPerHour: calculateCostPerHour(best.price, getTotalHours(best)) };
}

// Calculate average discount percentage
export function getAverageDiscount(games: Game[]): number {
  const discountedGames = games.filter(g =>
    !g.acquiredFree &&
    g.originalPrice &&
    g.originalPrice > g.price &&
    g.status !== 'Wishlist'
  );

  if (discountedGames.length === 0) return 0;

  const avgDiscount = discountedGames.reduce((sum, g) => {
    const discount = ((g.originalPrice || 0) - g.price) / (g.originalPrice || 1) * 100;
    return sum + discount;
  }, 0) / discountedGames.length;

  return avgDiscount;
}

// ========================================
// EXPANDED CREATIVE STATS
// ========================================

export type GamingPersonalityType =
  | 'Completionist'   // High completion rate, sees things through
  | 'Deep Diver'      // Few games, many hours each
  | 'Sampler'         // Many games, few hours each
  | 'Backlog Hoarder' // Buys lots, plays little
  | 'Balanced Gamer'  // Good mix of everything
  | 'Speedrunner'     // Completes games quickly
  | 'Explorer';       // Plays many genres

export interface GamingPersonality {
  type: GamingPersonalityType;
  description: string;
  traits: string[];
  score: number; // How strongly they match this type (0-100)
}

// Determine gaming personality based on play patterns
export function getGamingPersonality(games: Game[]): GamingPersonality {
  const ownedGames = games.filter(g => g.status !== 'Wishlist');
  if (ownedGames.length === 0) {
    return { type: 'Balanced Gamer', description: 'Just getting started!', traits: [], score: 0 };
  }

  const playedGames = ownedGames.filter(g => getTotalHours(g) > 0);
  const completedGames = ownedGames.filter(g => g.status === 'Completed');
  const totalHours = ownedGames.reduce((sum, g) => sum + getTotalHours(g), 0);
  const avgHoursPerGame = playedGames.length > 0 ? totalHours / playedGames.length : 0;
  const completionRate = ownedGames.length > 0 ? (completedGames.length / ownedGames.length) * 100 : 0;
  const playRate = ownedGames.length > 0 ? (playedGames.length / ownedGames.length) * 100 : 0;
  const uniqueGenres = new Set(playedGames.filter(g => g.genre).map(g => g.genre)).size;

  // Score each personality type
  const scores: Record<GamingPersonalityType, number> = {
    'Completionist': completionRate * 1.5 + (avgHoursPerGame > 20 ? 20 : 0),
    'Deep Diver': avgHoursPerGame > 30 ? 80 + Math.min(avgHoursPerGame - 30, 20) : avgHoursPerGame * 2,
    'Sampler': playedGames.length > 20 && avgHoursPerGame < 15 ? 70 + (playedGames.length - 20) : 0,
    'Backlog Hoarder': (100 - playRate) * 0.8 + (ownedGames.length > 50 ? 20 : ownedGames.length * 0.4),
    'Balanced Gamer': playRate > 50 && completionRate > 20 && completionRate < 60 ? 60 : 30,
    'Speedrunner': completedGames.length > 5 && avgHoursPerGame < 12 ? 70 + completedGames.length : 0,
    'Explorer': uniqueGenres >= 5 ? 50 + uniqueGenres * 5 : uniqueGenres * 10,
  };

  // Find the highest scoring personality
  const topType = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  const type = topType[0] as GamingPersonalityType;
  const score = Math.min(100, topType[1]);

  const descriptions: Record<GamingPersonalityType, string> = {
    'Completionist': 'You see games through to the end. No game left behind!',
    'Deep Diver': 'You get deeply invested in the games you love.',
    'Sampler': 'You love variety and trying new experiences.',
    'Backlog Hoarder': 'Your Steam library is... ambitious. We believe in you!',
    'Balanced Gamer': 'A healthy mix of playing and completing.',
    'Speedrunner': 'You blaze through games with impressive efficiency.',
    'Explorer': 'Genre boundaries cannot contain you.',
  };

  const traitMap: Record<GamingPersonalityType, string[]> = {
    'Completionist': ['Persistent', 'Thorough', 'Achievement Hunter'],
    'Deep Diver': ['Immersive', 'Committed', 'Invested'],
    'Sampler': ['Curious', 'Adventurous', 'Open-minded'],
    'Backlog Hoarder': ['Deal Hunter', 'Optimistic', 'Future-focused'],
    'Balanced Gamer': ['Disciplined', 'Selective', 'Mindful'],
    'Speedrunner': ['Efficient', 'Focused', 'Goal-oriented'],
    'Explorer': ['Versatile', 'Eclectic', 'Genre-fluid'],
  };

  return {
    type,
    description: descriptions[type],
    traits: traitMap[type],
    score,
  };
}

// Session style analysis
export type SessionStyle = 'Marathon Runner' | 'Snack Gamer' | 'Weekend Warrior' | 'Consistent Player' | 'Binge & Rest';

export interface SessionAnalysis {
  style: SessionStyle;
  avgSessionLength: number;
  totalSessions: number;
  longestSession: number;
  sessionsPerWeek: number;
  description: string;
}

export function getSessionAnalysis(games: Game[]): SessionAnalysis {
  const allLogs = getAllPlayLogs(games);
  if (allLogs.length === 0) {
    return {
      style: 'Consistent Player',
      avgSessionLength: 0,
      totalSessions: 0,
      longestSession: 0,
      sessionsPerWeek: 0,
      description: 'Start logging sessions to see your style!',
    };
  }

  const sessionHours = allLogs.map(l => l.log.hours);
  const avgSessionLength = sessionHours.reduce((a, b) => a + b, 0) / sessionHours.length;
  const longestSession = Math.max(...sessionHours);

  // Calculate sessions per week
  const dates = allLogs.map(l => parseLocalDate(l.log.date).getTime());
  const oldestDate = Math.min(...dates);
  const newestDate = Math.max(...dates);
  const weekSpan = Math.max(1, (newestDate - oldestDate) / (7 * 24 * 60 * 60 * 1000));
  const sessionsPerWeek = allLogs.length / weekSpan;

  // Determine style
  let style: SessionStyle;
  let description: string;

  if (avgSessionLength >= 3) {
    style = 'Marathon Runner';
    description = 'You love long, immersive gaming sessions.';
  } else if (avgSessionLength <= 1) {
    style = 'Snack Gamer';
    description = 'Quick sessions fit perfectly into your busy life.';
  } else if (sessionsPerWeek >= 5) {
    style = 'Consistent Player';
    description = 'Gaming is a regular part of your routine.';
  } else if (sessionsPerWeek <= 2 && avgSessionLength > 2) {
    style = 'Weekend Warrior';
    description = 'You save up your gaming for dedicated sessions.';
  } else {
    style = 'Binge & Rest';
    description = 'Intense bursts followed by breaks. Balance!';
  }

  return {
    style,
    avgSessionLength,
    totalSessions: allLogs.length,
    longestSession,
    sessionsPerWeek,
    description,
  };
}

// Rotation tracking
export interface RotationStats {
  activeGames: Game[];         // Games played in last 14 days
  coolingOff: Game[];          // Games not played in 30+ days but were active
  rotationHealth: 'Obsessed' | 'Focused' | 'Healthy' | 'Juggling' | 'Overwhelmed';
  gamesInRotation: number;
  description: string;
}

export function getRotationStats(games: Game[]): RotationStats {
  const now = new Date();
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  const getLastPlayedDate = (game: Game): Date | null => {
    if (!game.playLogs || game.playLogs.length === 0) return null;
    const sortedLogs = [...game.playLogs].sort((a, b) =>
      parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime()
    );
    return parseLocalDate(sortedLogs[0].date);
  };

  const ownedGames = games.filter(g => g.status !== 'Wishlist');

  const activeGames = ownedGames.filter(game => {
    const lastPlayed = getLastPlayedDate(game);
    return lastPlayed && lastPlayed >= twoWeeksAgo;
  });

  const coolingOff = ownedGames.filter(game => {
    const lastPlayed = getLastPlayedDate(game);
    return lastPlayed && lastPlayed < monthAgo && lastPlayed >= twoMonthsAgo && getTotalHours(game) >= 5;
  });

  const gamesInRotation = activeGames.length;

  let rotationHealth: RotationStats['rotationHealth'];
  let description: string;

  if (gamesInRotation === 0) {
    rotationHealth = 'Focused';
    description = 'No recent sessions logged. Time to play!';
  } else if (gamesInRotation === 1) {
    rotationHealth = 'Obsessed';
    description = `All-in on ${activeGames[0]?.name || 'one game'}. Full immersion!`;
  } else if (gamesInRotation <= 3) {
    rotationHealth = 'Healthy';
    description = 'A nice, manageable rotation of games.';
  } else if (gamesInRotation <= 5) {
    rotationHealth = 'Juggling';
    description = 'Quite a few games in the mix!';
  } else {
    rotationHealth = 'Overwhelmed';
    description = 'So many games, so little time!';
  }

  return {
    activeGames,
    coolingOff,
    rotationHealth,
    gamesInRotation,
    description,
  };
}

// Money deep-dive stats
export interface MoneyStats {
  costOfBacklog: number;           // Value of unplayed games
  breakEvenHoursNeeded: number;    // Hours to reach target $/hr
  avgCostPerCompletion: number;    // Average spent on completed games
  impulsePurchases: Game[];        // Games bought and played within 7 days
  plannedPurchases: Game[];        // Games that sat in backlog before playing
  spendingTrend: 'increasing' | 'decreasing' | 'stable';
  monthlyAverage: number;
  biggestRegret: { game: Game; wasted: number } | null;
  bestBargain: { game: Game; valueScore: number } | null;
}

export function getMoneyStats(games: Game[]): MoneyStats {
  const ownedGames = games.filter(g => g.status !== 'Wishlist');
  const notStarted = ownedGames.filter(g => g.status === 'Not Started');
  const completed = ownedGames.filter(g => g.status === 'Completed');
  const playedGames = ownedGames.filter(g => getTotalHours(g) > 0);

  const costOfBacklog = notStarted.reduce((sum, g) => sum + g.price, 0);

  const totalSpent = ownedGames.reduce((sum, g) => sum + g.price, 0);
  const totalHours = ownedGames.reduce((sum, g) => sum + getTotalHours(g), 0);
  const currentCostPerHour = totalHours > 0 ? totalSpent / totalHours : 0;
  const targetCostPerHour = 2; // $2/hr is a good target
  const breakEvenHoursNeeded = currentCostPerHour > targetCostPerHour
    ? (totalSpent / targetCostPerHour) - totalHours
    : 0;

  const avgCostPerCompletion = completed.length > 0
    ? completed.reduce((sum, g) => sum + g.price, 0) / completed.length
    : 0;

  // Impulse vs planned
  const impulsePurchases: Game[] = [];
  const plannedPurchases: Game[] = [];

  ownedGames.forEach(game => {
    if (!game.datePurchased || !game.playLogs || game.playLogs.length === 0) return;
    const purchaseDate = parseLocalDate(game.datePurchased);
    const firstPlayDate = parseLocalDate(game.playLogs[game.playLogs.length - 1].date); // oldest log
    const daysDiff = (firstPlayDate.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24);

    if (daysDiff <= 7) {
      impulsePurchases.push(game);
    } else if (daysDiff > 30) {
      plannedPurchases.push(game);
    }
  });

  // Spending trend (compare last 6 months to previous 6 months)
  const spendingByMonth = getSpendingByMonth(games);
  const months = Object.keys(spendingByMonth).sort();
  let spendingTrend: 'increasing' | 'decreasing' | 'stable' = 'stable';

  if (months.length >= 6) {
    const recentMonths = months.slice(-6);
    const olderMonths = months.slice(-12, -6);
    const recentSpend = recentMonths.reduce((sum, m) => sum + (spendingByMonth[m] || 0), 0);
    const olderSpend = olderMonths.reduce((sum, m) => sum + (spendingByMonth[m] || 0), 0);

    if (recentSpend > olderSpend * 1.2) spendingTrend = 'increasing';
    else if (recentSpend < olderSpend * 0.8) spendingTrend = 'decreasing';
  }

  const totalMonths = months.length || 1;
  const monthlyAverage = totalSpent / totalMonths;

  // Biggest regret: high price, low hours, owned for a while
  let biggestRegret: { game: Game; wasted: number } | null = null;
  const potentialRegrets = ownedGames.filter(g =>
    g.price > 20 && getTotalHours(g) < 3 && !g.acquiredFree
  );
  if (potentialRegrets.length > 0) {
    const worst = potentialRegrets.sort((a, b) => b.price - a.price)[0];
    biggestRegret = { game: worst, wasted: worst.price };
  }

  // Best bargain: low price, high hours, high rating
  let bestBargain: { game: Game; valueScore: number } | null = null;
  const bargainCandidates = playedGames.filter(g =>
    g.price > 0 && getTotalHours(g) >= 10 && g.rating >= 7
  );
  if (bargainCandidates.length > 0) {
    const best = bargainCandidates.sort((a, b) => {
      const aScore = (a.rating * getTotalHours(a)) / a.price;
      const bScore = (b.rating * getTotalHours(b)) / b.price;
      return bScore - aScore;
    })[0];
    bestBargain = {
      game: best,
      valueScore: (best.rating * getTotalHours(best)) / best.price
    };
  }

  return {
    costOfBacklog,
    breakEvenHoursNeeded,
    avgCostPerCompletion,
    impulsePurchases,
    plannedPurchases,
    spendingTrend,
    monthlyAverage,
    biggestRegret,
    bestBargain,
  };
}

// Gaming achievements
export interface GamingAchievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  progress?: number;  // 0-100
  target?: number;
  current?: number;
}

export function getGamingAchievements(games: Game[]): GamingAchievement[] {
  const ownedGames = games.filter(g => g.status !== 'Wishlist');
  const playedGames = ownedGames.filter(g => getTotalHours(g) > 0);
  const completedGames = ownedGames.filter(g => g.status === 'Completed');
  const totalHours = ownedGames.reduce((sum, g) => sum + getTotalHours(g), 0);
  const centuryClub = ownedGames.filter(g => getTotalHours(g) >= 100);
  const uniqueGenres = new Set(playedGames.filter(g => g.genre).map(g => g.genre)).size;
  const freeGames = ownedGames.filter(g => g.acquiredFree);
  const discountedGames = ownedGames.filter(g =>
    g.originalPrice && g.originalPrice > g.price && !g.acquiredFree
  );
  const highRatedGames = playedGames.filter(g => g.rating >= 9);
  const longestStreak = getLongestGamingStreak(games);
  const patientGamer = getPatientGamerStats(games);

  const achievements: GamingAchievement[] = [
    {
      id: 'century_club',
      name: 'Century Club',
      description: 'Have a game with 100+ hours',
      icon: '💯',
      unlocked: centuryClub.length > 0,
      progress: centuryClub.length > 0 ? 100 : Math.min(99, (Math.max(...playedGames.map(g => getTotalHours(g)), 0) / 100) * 100),
    },
    {
      id: 'thousand_hours',
      name: 'Dedicated Gamer',
      description: 'Log 1000 total hours',
      icon: '⏰',
      unlocked: totalHours >= 1000,
      progress: Math.min(100, (totalHours / 1000) * 100),
      target: 1000,
      current: Math.floor(totalHours),
    },
    {
      id: 'completionist',
      name: 'Completionist',
      description: 'Complete 10 games',
      icon: '🏆',
      unlocked: completedGames.length >= 10,
      progress: Math.min(100, (completedGames.length / 10) * 100),
      target: 10,
      current: completedGames.length,
    },
    {
      id: 'genre_explorer',
      name: 'Genre Explorer',
      description: 'Play games from 8 different genres',
      icon: '🗺️',
      unlocked: uniqueGenres >= 8,
      progress: Math.min(100, (uniqueGenres / 8) * 100),
      target: 8,
      current: uniqueGenres,
    },
    {
      id: 'free_rider',
      name: 'Free Rider',
      description: 'Claim 10 free games',
      icon: '🎁',
      unlocked: freeGames.length >= 10,
      progress: Math.min(100, (freeGames.length / 10) * 100),
      target: 10,
      current: freeGames.length,
    },
    {
      id: 'bargain_hunter',
      name: 'Bargain Hunter',
      description: 'Buy 20 games on sale',
      icon: '🏷️',
      unlocked: discountedGames.length >= 20,
      progress: Math.min(100, (discountedGames.length / 20) * 100),
      target: 20,
      current: discountedGames.length,
    },
    {
      id: 'critic',
      name: 'Hard to Please',
      description: 'Rate 5 games 9/10 or higher',
      icon: '⭐',
      unlocked: highRatedGames.length >= 5,
      progress: Math.min(100, (highRatedGames.length / 5) * 100),
      target: 5,
      current: highRatedGames.length,
    },
    {
      id: 'streak_master',
      name: 'Streak Master',
      description: 'Maintain a 7-day gaming streak',
      icon: '🔥',
      unlocked: longestStreak >= 7,
      progress: Math.min(100, (longestStreak / 7) * 100),
      target: 7,
      current: longestStreak,
    },
    {
      id: 'patient_gamer',
      name: 'Patient Gamer',
      description: 'Save $100 from discounts',
      icon: '🧘',
      unlocked: patientGamer.totalSaved >= 100,
      progress: Math.min(100, (patientGamer.totalSaved / 100) * 100),
      target: 100,
      current: Math.floor(patientGamer.totalSaved),
    },
    {
      id: 'library_builder',
      name: 'Library Builder',
      description: 'Own 50 games',
      icon: '📚',
      unlocked: ownedGames.length >= 50,
      progress: Math.min(100, (ownedGames.length / 50) * 100),
      target: 50,
      current: ownedGames.length,
    },
  ];

  return achievements.sort((a, b) => {
    // Unlocked first, then by progress
    if (a.unlocked && !b.unlocked) return -1;
    if (!a.unlocked && b.unlocked) return 1;
    return (b.progress || 0) - (a.progress || 0);
  });
}

// Year in Review
export interface YearInReview {
  year: number;
  gamesAcquired: number;
  gamesCompleted: number;
  totalSpent: number;
  totalHours: number;
  avgCostPerHour: number;
  topGame: { name: string; hours: number } | null;
  topGenre: { name: string; hours: number } | null;
  monthWithMostHours: { month: string; hours: number } | null;
  monthWithMostSpending: { month: string; amount: number } | null;
  totalSessions: number;
  newGenresTried: number;
  longestSession: { game: string; hours: number } | null;
  savings: number;
}

export function getYearInReview(games: Game[], year: number): YearInReview {
  const yearStr = year.toString();
  const yearGames = games.filter(g =>
    g.datePurchased?.startsWith(yearStr) && g.status !== 'Wishlist'
  );

  const gamesAcquired = yearGames.length;
  const gamesCompleted = yearGames.filter(g =>
    g.status === 'Completed' && g.endDate?.startsWith(yearStr)
  ).length;
  const totalSpent = yearGames.reduce((sum, g) => sum + g.price, 0);

  // Get hours from play logs in this year
  let totalHours = 0;
  let totalSessions = 0;
  const hoursByGame: Record<string, number> = {};
  const hoursByGenre: Record<string, number> = {};
  const hoursByMonth: Record<string, number> = {};
  let longestSession: { game: string; hours: number } | null = null;

  games.forEach(game => {
    if (game.playLogs) {
      game.playLogs.forEach(log => {
        if (log.date.startsWith(yearStr)) {
          totalHours += log.hours;
          totalSessions++;

          hoursByGame[game.name] = (hoursByGame[game.name] || 0) + log.hours;
          if (game.genre) {
            hoursByGenre[game.genre] = (hoursByGenre[game.genre] || 0) + log.hours;
          }

          const month = log.date.substring(0, 7);
          hoursByMonth[month] = (hoursByMonth[month] || 0) + log.hours;

          if (!longestSession || log.hours > longestSession.hours) {
            longestSession = { game: game.name, hours: log.hours };
          }
        }
      });
    }
  });

  const avgCostPerHour = totalHours > 0 ? totalSpent / totalHours : 0;

  // Top game by hours
  const topGameEntry = Object.entries(hoursByGame).sort((a, b) => b[1] - a[1])[0];
  const topGame = topGameEntry ? { name: topGameEntry[0], hours: topGameEntry[1] } : null;

  // Top genre by hours
  const topGenreEntry = Object.entries(hoursByGenre).sort((a, b) => b[1] - a[1])[0];
  const topGenre = topGenreEntry ? { name: topGenreEntry[0], hours: topGenreEntry[1] } : null;

  // Month with most hours
  const monthHoursEntry = Object.entries(hoursByMonth).sort((a, b) => b[1] - a[1])[0];
  const monthWithMostHours = monthHoursEntry ? { month: monthHoursEntry[0], hours: monthHoursEntry[1] } : null;

  // Month with most spending
  const spendingByMonth = getSpendingByMonth(games);
  const yearSpending = Object.entries(spendingByMonth)
    .filter(([m]) => m.startsWith(yearStr))
    .sort((a, b) => b[1] - a[1])[0];
  const monthWithMostSpending = yearSpending ? { month: yearSpending[0], amount: yearSpending[1] } : null;

  // New genres tried this year
  const previousGenres = new Set(
    games.filter(g => g.datePurchased && g.datePurchased < yearStr && g.genre)
      .map(g => g.genre)
  );
  const newGenresTried = yearGames.filter(g => g.genre && !previousGenres.has(g.genre)).length;

  // Savings from free/discounted games
  const savings = yearGames.reduce((sum, g) => {
    if (g.acquiredFree) return sum + (g.originalPrice || 0);
    if (g.originalPrice && g.originalPrice > g.price) return sum + (g.originalPrice - g.price);
    return sum;
  }, 0);

  return {
    year,
    gamesAcquired,
    gamesCompleted,
    totalSpent,
    totalHours,
    avgCostPerHour,
    topGame,
    topGenre,
    monthWithMostHours,
    monthWithMostSpending,
    totalSessions,
    newGenresTried,
    longestSession,
    savings,
  };
}

// Lifetime stats summary
export interface LifetimeStats {
  totalHours: number;
  equivalentDays: number;
  equivalentWeeks: number;
  moviesEquivalent: number;    // 2hr movies
  booksEquivalent: number;     // 8hr audiobooks
  totalGames: number;
  totalSpent: number;
  avgCostPerHour: number;
  firstGameDate: string | null;
  daysSinceFirstGame: number;
  gamesPerMonth: number;
  hoursPerWeek: number;
}

export function getLifetimeStats(games: Game[]): LifetimeStats {
  const ownedGames = games.filter(g => g.status !== 'Wishlist');
  const totalHours = ownedGames.reduce((sum, g) => sum + getTotalHours(g), 0);
  const totalSpent = ownedGames.reduce((sum, g) => sum + g.price, 0);

  // Find first game date
  const datesWithGames = ownedGames
    .filter(g => g.datePurchased)
    .map(g => g.datePurchased!)
    .sort();
  const firstGameDate = datesWithGames[0] || null;

  const daysSinceFirstGame = firstGameDate
    ? Math.floor((Date.now() - parseLocalDate(firstGameDate).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const monthsSinceFirst = daysSinceFirstGame / 30;
  const weeksSinceFirst = daysSinceFirstGame / 7;

  return {
    totalHours,
    equivalentDays: totalHours / 24,
    equivalentWeeks: totalHours / (24 * 7),
    moviesEquivalent: Math.floor(totalHours / 2),
    booksEquivalent: Math.floor(totalHours / 8),
    totalGames: ownedGames.length,
    totalSpent,
    avgCostPerHour: totalHours > 0 ? totalSpent / totalHours : 0,
    firstGameDate,
    daysSinceFirstGame,
    gamesPerMonth: monthsSinceFirst > 0 ? ownedGames.length / monthsSinceFirst : ownedGames.length,
    hoursPerWeek: weeksSinceFirst > 0 ? totalHours / weeksSinceFirst : totalHours,
  };
}

// Predicted backlog clearance
export function getPredictedBacklogClearance(games: Game[]): { date: Date | null; daysRemaining: number; neverAt: string | null } {
  const notStarted = games.filter(g => g.status === 'Not Started');
  if (notStarted.length === 0) {
    return { date: new Date(), daysRemaining: 0, neverAt: null };
  }

  // Get completion rate over last 6 months
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const recentCompletions = games.filter(g =>
    g.status === 'Completed' && g.endDate && parseLocalDate(g.endDate) >= sixMonthsAgo
  ).length;

  if (recentCompletions === 0) {
    return {
      date: null,
      daysRemaining: Infinity,
      neverAt: 'current rate (0 completions in 6 months)'
    };
  }

  const completionsPerMonth = recentCompletions / 6;
  const monthsToComplete = notStarted.length / completionsPerMonth;
  const daysRemaining = Math.ceil(monthsToComplete * 30);

  const clearanceDate = new Date();
  clearanceDate.setDate(clearanceDate.getDate() + daysRemaining);

  return { date: clearanceDate, daysRemaining, neverAt: null };
}

// Genre rut detection
export interface GenreRutAnalysis {
  isInRut: boolean;
  dominantGenre: string | null;
  dominantPercentage: number;
  suggestion: string;
  underexploredGenres: string[];
}

export function getGenreRutAnalysis(games: Game[]): GenreRutAnalysis {
  const recentGames = games.filter(g => {
    if (!g.playLogs || g.playLogs.length === 0) return false;
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 3);
    return g.playLogs.some(log => parseLocalDate(log.date) >= lastMonth);
  });

  if (recentGames.length < 3) {
    return {
      isInRut: false,
      dominantGenre: null,
      dominantPercentage: 0,
      suggestion: 'Play more games to see genre patterns!',
      underexploredGenres: [],
    };
  }

  const genreCounts: Record<string, number> = {};
  recentGames.forEach(g => {
    if (g.genre) {
      genreCounts[g.genre] = (genreCounts[g.genre] || 0) + 1;
    }
  });

  const sortedGenres = Object.entries(genreCounts).sort((a, b) => b[1] - a[1]);
  const totalWithGenre = sortedGenres.reduce((sum, [, count]) => sum + count, 0);

  const dominantGenre = sortedGenres[0]?.[0] || null;
  const dominantPercentage = dominantGenre && totalWithGenre > 0
    ? (sortedGenres[0][1] / totalWithGenre) * 100
    : 0;

  const isInRut = dominantPercentage >= 60;

  // Find underexplored genres
  const allGenres = new Set(games.filter(g => g.genre).map(g => g.genre!));
  const playedGenres = new Set(Object.keys(genreCounts));
  const underexploredGenres = Array.from(allGenres).filter(g => !playedGenres.has(g));

  let suggestion = '';
  if (isInRut && dominantGenre) {
    suggestion = `You've been playing a lot of ${dominantGenre}. Maybe try something different?`;
  } else if (underexploredGenres.length > 0) {
    suggestion = `You have ${underexploredGenres.length} genre(s) in your library you haven't touched recently!`;
  } else {
    suggestion = 'Nice variety in your recent gaming!';
  }

  return {
    isInRut,
    dominantGenre,
    dominantPercentage,
    suggestion,
    underexploredGenres,
  };
}

// Monthly trend data for sparklines
export interface MonthlyTrend {
  month: string;
  hours: number;
  spent: number;
  games: number;
}

export function getMonthlyTrends(games: Game[], monthCount: number = 12): MonthlyTrend[] {
  const now = new Date();
  const trends: MonthlyTrend[] = [];

  for (let i = monthCount - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    let hours = 0;
    let spent = 0;
    let gameCount = 0;

    games.forEach(game => {
      // Hours from play logs
      if (game.playLogs) {
        game.playLogs.forEach(log => {
          if (log.date.startsWith(monthKey)) {
            hours += log.hours;
          }
        });
      }

      // Spending from purchase date
      if (game.datePurchased?.startsWith(monthKey) && game.status !== 'Wishlist') {
        spent += game.price;
        gameCount++;
      }
    });

    trends.push({ month: monthKey, hours, spent, games: gameCount });
  }

  return trends;
}

// ========================================
// WEEK IN REVIEW
// ========================================

export interface WeekInReviewData {
  // Time range
  weekStart: Date;
  weekEnd: Date;
  weekLabel: string; // e.g., "Dec 2 - Dec 8, 2024"

  // Core stats
  totalHours: number;
  totalSessions: number;
  uniqueGames: number;
  currentStreak: number;

  // Daily breakdown
  dailyHours: Array<{
    day: string; // Day name (Mon, Tue, etc)
    date: string; // YYYY-MM-DD
    hours: number;
    sessions: number;
    games: number;
    gameNames: string[];
  }>;
  busiestDay: { day: string; date: string; hours: number; sessions: number } | null;
  restDays: string[];

  // Game breakdown
  gamesPlayed: Array<{
    game: Game;
    hours: number;
    sessions: number;
    percentage: number;
    daysPlayed: number;
  }>;
  topGame: { game: Game; hours: number; sessions: number; percentage: number } | null;

  // Sessions
  avgSessionLength: number;
  longestSession: { game: Game; hours: number; date: string; day: string } | null;
  marathonSessions: number; // 3h+
  powerSessions: number; // 1-3h
  quickSessions: number; // <1h
  mostConsistentGame: { game: Game; daysPlayed: number } | null;

  // Patterns
  weekdayHours: number;
  weekendHours: number;
  weekdayPercentage: number;
  weekendPercentage: number;

  // Genre
  favoriteGenre: { genre: string; hours: number; percentage: number } | null;
  genresPlayed: string[];
  genreDiversityScore: number;

  // Achievements
  completedGames: Game[];
  newGamesStarted: Game[];
  milestonesReached: Array<{ game: Game; milestone: string }>;

  // Comparisons
  vsLastWeek: { hoursDiff: number; gamesDiff: number; sessionsDiff: number; trend: 'up' | 'down' | 'same' };
  vsAverage: { percentage: number; hoursDiff: number };

  // Value
  totalCostPerHour: number;
  bestValueGame: { game: Game; costPerHour: number } | null;

  // Personality
  gamingStyle: 'Monogamous' | 'Dabbler' | 'Variety Seeker' | 'Juggler';
  weekVibe: string;
  focusScore: number; // 0-100, how concentrated on one game

  // Equivalents
  movieEquivalent: number;
  bookEquivalent: number;
  tvEpisodeEquivalent: number;
  podcastEquivalent: number; // 1hr episodes
  workDaysEquivalent: number; // 8hr work days
  netflixBindgeEquivalent: number; // 25min episodes
  coffeeShopVisits: number; // 2hr visits
  sleepCyclesEquivalent: number; // 8hr sleep

  // Cost comparisons
  movieTheaterCost: number; // Cost if watched movies in theater
  streamingCost: number; // Equivalent streaming service cost

  // Fun stats
  pizzaSlicesEquivalent: number; // Pizza slices consumed while gaming
  energyDrinksEquivalent: number; // Energy drinks
  snackBudget: number; // Estimated snack budget
  buttonPressesEstimate: number; // Total button presses
  totalMinutesOfFun: number; // Total minutes
  averageEnjoymentRating: number; // Average game rating
  entertainmentValueScore: number; // Hours × rating

  // Value stats
  totalValueUtilized: number; // Total price of games played this week
  averageGameValue: number; // Average price per game played
  savingsVsRenting: number; // How much saved vs renting at $60/week
  libraryPercentagePlayed: number; // What % of library was played

  // Fun stats
  perfectWeek: boolean; // Played all 7 days
  weekendWarrior: boolean; // 70%+ on weekend
  weekdayGrind: boolean; // 70%+ on weekdays

  // Additional insights
  averageHoursPerDay: number;
  daysActive: number;
  longestStreak: number; // Consecutive days played this week
  earliestSession: string | null; // Day with earliest session
  latestSession: string | null; // Day with latest session

  // Enhanced insights (Phase 1-4 integration)
  activityPulse: ActivityPulseData;
  guiltFreeMultiplier: number; // How many times cheaper than movies
  backlogStatus: { backlogCount: number; humorTier: string; completionRate: number };
  weekCompletionProbabilities: Array<{ game: Game; probability: number; verdict: string }>;
}

// Get week stats for any week by offset (-1 = current week, 0 = last completed week, 1 = week before, etc.)
export function getWeekStatsForOffset(games: Game[], weekOffset: number = 0): WeekInReviewData {
  const today = new Date();
  const currentDayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.

  // Calculate the Monday of the target week
  const daysToLastMonday = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;
  const lastMonday = new Date(today);

  // For current week (offset -1), use this week's Monday
  // For completed weeks (offset 0+), go back in time
  if (weekOffset === -1) {
    lastMonday.setDate(today.getDate() - daysToLastMonday);
  } else {
    lastMonday.setDate(today.getDate() - daysToLastMonday - 7 - (weekOffset * 7));
  }
  lastMonday.setHours(0, 0, 0, 0);

  // Calculate the Sunday of the target week
  const lastSunday = new Date(lastMonday);
  lastSunday.setDate(lastMonday.getDate() + 6);
  lastSunday.setHours(23, 59, 59, 999);

  // Format week label
  const weekLabel = `${lastMonday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${lastSunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  // Initialize tracking structures
  const gameStatsMap = new Map<string, {
    game: Game;
    hours: number;
    sessions: number;
    daysPlayed: Set<string>;
  }>();

  const dailyStatsMap = new Map<string, {
    hours: number;
    sessions: number;
    games: Set<string>;
    gameNames: Set<string>;
  }>();

  const hoursByGenre: Record<string, number> = {};
  const allSessionHours: number[] = [];

  let totalHours = 0;
  let totalSessions = 0;
  let longestSession: WeekInReviewData['longestSession'] = null;
  let weekdayHours = 0;
  let weekendHours = 0;

  const completedGames: Game[] = [];
  const newGamesStarted: Game[] = [];
  const milestonesReached: Array<{ game: Game; milestone: string }> = [];

  // Initialize daily stats for all 7 days
  for (let i = 0; i < 7; i++) {
    const date = new Date(lastMonday);
    date.setDate(lastMonday.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    dailyStatsMap.set(dateStr, {
      hours: 0,
      sessions: 0,
      games: new Set(),
      gameNames: new Set(),
    });
  }

  // Process all games
  games.forEach(game => {
    // Check for completions this week
    if (game.endDate && game.status === 'Completed') {
      const endDate = parseLocalDate(game.endDate);
      if (endDate >= lastMonday && endDate <= lastSunday) {
        completedGames.push(game);
      }
    }

    // Check for new games started
    if (game.startDate) {
      const startDate = parseLocalDate(game.startDate);
      if (startDate >= lastMonday && startDate <= lastSunday) {
        newGamesStarted.push(game);
      }
    }

    // Process play logs
    if (game.playLogs) {
      let hadPreviousLogs = false;

      game.playLogs.forEach(log => {
        const logDate = parseLocalDate(log.date);

        // Check if this is a new game (first log this week)
        if (logDate < lastMonday && getTotalHours(game) > 0) {
          hadPreviousLogs = true;
        }

        if (logDate >= lastMonday && logDate <= lastSunday) {
          const dateStr = log.date;

          // Update game stats
          const existing = gameStatsMap.get(game.id) || {
            game,
            hours: 0,
            sessions: 0,
            daysPlayed: new Set<string>()
          };
          existing.hours += log.hours;
          existing.sessions += 1;
          existing.daysPlayed.add(dateStr);
          gameStatsMap.set(game.id, existing);

          // Update daily stats
          const dailyStats = dailyStatsMap.get(dateStr);
          if (dailyStats) {
            dailyStats.hours += log.hours;
            dailyStats.sessions += 1;
            dailyStats.games.add(game.id);
            dailyStats.gameNames.add(game.name);
          }

          // Update totals
          totalHours += log.hours;
          totalSessions += 1;
          allSessionHours.push(log.hours);

          // Track weekday vs weekend
          const dayOfWeek = logDate.getDay();
          if (dayOfWeek === 0 || dayOfWeek === 6) {
            weekendHours += log.hours;
          } else {
            weekdayHours += log.hours;
          }

          // Track longest session
          if (!longestSession || log.hours > longestSession.hours) {
            longestSession = {
              game,
              hours: log.hours,
              date: log.date,
              day: logDate.toLocaleDateString('en-US', { weekday: 'long' })
            };
          }

          // Track hours by genre
          if (game.genre) {
            hoursByGenre[game.genre] = (hoursByGenre[game.genre] || 0) + log.hours;
          }
        }
      });

      // Mark as new game started if first log is this week
      if (!hadPreviousLogs && gameStatsMap.has(game.id)) {
        if (!newGamesStarted.includes(game)) {
          newGamesStarted.push(game);
        }
      }
    }

    // Check for milestones
    const totalGameHours = getTotalHours(game);
    if (gameStatsMap.has(game.id)) {
      if (totalGameHours >= 100 && totalGameHours - (gameStatsMap.get(game.id)?.hours || 0) < 100) {
        milestonesReached.push({ game, milestone: 'Century Club (100h)' });
      } else if (totalGameHours >= 50 && totalGameHours - (gameStatsMap.get(game.id)?.hours || 0) < 50) {
        milestonesReached.push({ game, milestone: 'Half Century (50h)' });
      }
    }
  });

  // Build daily breakdown array
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const dailyHours: WeekInReviewData['dailyHours'] = [];
  const restDays: string[] = [];

  for (let i = 0; i < 7; i++) {
    const date = new Date(lastMonday);
    date.setDate(lastMonday.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    const dailyStats = dailyStatsMap.get(dateStr)!;

    dailyHours.push({
      day: dayNames[i],
      date: dateStr,
      hours: dailyStats.hours,
      sessions: dailyStats.sessions,
      games: dailyStats.games.size,
      gameNames: Array.from(dailyStats.gameNames),
    });

    if (dailyStats.hours === 0) {
      restDays.push(dayNames[i]);
    }
  }

  // Find busiest day
  const busiestDayData = dailyHours.reduce((max, day) =>
    day.hours > max.hours ? day : max
  , dailyHours[0]);

  const busiestDay = busiestDayData.hours > 0 ? {
    day: busiestDayData.day,
    date: busiestDayData.date,
    hours: busiestDayData.hours,
    sessions: busiestDayData.sessions,
  } : null;

  // Build games played array and calculate percentages
  const gamesPlayedArray = Array.from(gameStatsMap.values());
  const gamesPlayed = gamesPlayedArray.map(g => ({
    game: g.game,
    hours: g.hours,
    sessions: g.sessions,
    percentage: totalHours > 0 ? (g.hours / totalHours) * 100 : 0,
    daysPlayed: g.daysPlayed.size,
  })).sort((a, b) => b.hours - a.hours);

  // Top game
  const topGame = gamesPlayed.length > 0 ? {
    game: gamesPlayed[0].game,
    hours: gamesPlayed[0].hours,
    sessions: gamesPlayed[0].sessions,
    percentage: gamesPlayed[0].percentage,
  } : null;

  // Session analytics
  const avgSessionLength = totalSessions > 0 ? totalHours / totalSessions : 0;
  const marathonSessions = allSessionHours.filter(h => h >= 3).length;
  const powerSessions = allSessionHours.filter(h => h >= 1 && h < 3).length;
  const quickSessions = allSessionHours.filter(h => h < 1).length;

  // Most consistent game (played most days)
  const mostConsistentGame = gamesPlayed.length > 0
    ? gamesPlayed.reduce((max, g) => g.daysPlayed > max.daysPlayed ? g : max, gamesPlayed[0])
    : null;

  const mostConsistentGameData = mostConsistentGame && mostConsistentGame.daysPlayed > 1 ? {
    game: mostConsistentGame.game,
    daysPlayed: mostConsistentGame.daysPlayed,
  } : null;

  // Weekday vs weekend percentages
  const weekdayPercentage = totalHours > 0 ? (weekdayHours / totalHours) * 100 : 0;
  const weekendPercentage = totalHours > 0 ? (weekendHours / totalHours) * 100 : 0;

  // Genre stats
  const genreEntries = Object.entries(hoursByGenre).sort((a, b) => b[1] - a[1]);
  const favoriteGenre = genreEntries.length > 0 ? {
    genre: genreEntries[0][0],
    hours: genreEntries[0][1],
    percentage: totalHours > 0 ? (genreEntries[0][1] / totalHours) * 100 : 0,
  } : null;

  const genresPlayed = genreEntries.map(([genre]) => genre);
  const genreDiversityScore = genresPlayed.length;

  // Gaming style
  let gamingStyle: WeekInReviewData['gamingStyle'];
  const uniqueGames = gamesPlayed.length;

  if (uniqueGames === 1) gamingStyle = 'Monogamous';
  else if (uniqueGames <= 3) gamingStyle = 'Dabbler';
  else if (uniqueGames <= 5) gamingStyle = 'Variety Seeker';
  else gamingStyle = 'Juggler';

  // Focus score (how much time in top game)
  const focusScore = topGame ? Math.round(topGame.percentage) : 0;

  // Week vibe
  let weekVibe = 'Balanced Gamer';
  if (totalHours >= 25) weekVibe = '🔥 POWER GAMER MODE';
  else if (totalHours >= 15) weekVibe = '😎 Solid Gaming Week';
  else if (totalHours >= 5) weekVibe = '✨ Quality Gaming';
  else if (totalHours > 0) weekVibe = '🎮 Light Week';
  else weekVibe = '💤 Rest Week';

  if (uniqueGames === 1 && totalHours > 10) weekVibe = '🎯 Laser Focused';
  else if (uniqueGames >= 6) weekVibe = '🌈 Gaming Buffet';
  else if (weekendPercentage >= 70) weekVibe = '🎉 Weekend Legend';
  else if (weekdayPercentage >= 70) weekVibe = '💼 Weekday Warrior';

  // Calculate current streak (days with gaming in a row, ending last Sunday)
  let currentStreak = 0;
  for (let i = 6; i >= 0; i--) {
    if (dailyHours[i].hours > 0) {
      currentStreak++;
    } else {
      break;
    }
  }

  // Compare to previous week
  const twoWeeksAgo = new Date(lastMonday);
  twoWeeksAgo.setDate(lastMonday.getDate() - 7);
  const previousWeekEnd = new Date(lastMonday);
  previousWeekEnd.setDate(lastMonday.getDate() - 1);
  previousWeekEnd.setHours(23, 59, 59, 999);

  const previousWeekStats = getPeriodStatsForRange(games, twoWeeksAgo, previousWeekEnd);
  const hoursDiff = totalHours - previousWeekStats.totalHours;
  const gamesDiff = uniqueGames - previousWeekStats.uniqueGames;
  const sessionsDiff = totalSessions - previousWeekStats.totalSessions;

  let trend: 'up' | 'down' | 'same';
  if (Math.abs(hoursDiff) < 0.5) trend = 'same';
  else if (hoursDiff > 0) trend = 'up';
  else trend = 'down';

  // Compare to average (last 4 weeks)
  let avgWeeklyHours = 0;
  for (let i = 0; i < 4; i++) {
    const weekStart = new Date(lastMonday);
    weekStart.setDate(lastMonday.getDate() - (7 * (i + 1)));
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const weekStats = getPeriodStatsForRange(games, weekStart, weekEnd);
    avgWeeklyHours += weekStats.totalHours;
  }
  avgWeeklyHours = avgWeeklyHours / 4;

  const vsAveragePercentage = avgWeeklyHours > 0 ? (totalHours / avgWeeklyHours) * 100 : 0;
  const vsAverageHoursDiff = totalHours - avgWeeklyHours;

  // Value calculation
  const paidGamesPlayed = gamesPlayed.filter(g => !g.game.acquiredFree && g.game.price > 0);
  const totalSpent = paidGamesPlayed.reduce((sum, g) => sum + g.game.price, 0);
  const totalCostPerHour = totalHours > 0 && totalSpent > 0 ? totalSpent / totalHours : 0;

  const bestValueGame = paidGamesPlayed.length > 0
    ? paidGamesPlayed.reduce((best, g) => {
        const costPerHour = g.game.price / g.hours;
        const bestCost = best.game.price / best.hours;
        return costPerHour < bestCost ? g : best;
      }, paidGamesPlayed[0])
    : null;

  const bestValueGameData = bestValueGame ? {
    game: bestValueGame.game,
    costPerHour: bestValueGame.game.price / bestValueGame.hours,
  } : null;

  // Equivalents
  const movieEquivalent = Math.floor(totalHours / 2);
  const bookEquivalent = Math.floor(totalHours / 8);
  const tvEpisodeEquivalent = Math.floor(totalHours / 0.75); // 45min episodes
  const podcastEquivalent = Math.floor(totalHours); // 1hr episodes
  const workDaysEquivalent = parseFloat((totalHours / 8).toFixed(1)); // 8hr work days
  const netflixBindgeEquivalent = Math.floor(totalHours / 0.42); // 25min episodes
  const coffeeShopVisits = Math.floor(totalHours / 2); // 2hr visits
  const sleepCyclesEquivalent = parseFloat((totalHours / 8).toFixed(1)); // 8hr sleep

  // Cost comparisons
  const movieTheaterCost = movieEquivalent * 15; // $15 per movie ticket
  const streamingCost = (totalHours / 730) * 15.99; // Netflix monthly cost ($15.99) spread over avg monthly hours (730h = ~30 days * 24h)

  // Fun stats
  const pizzaSlicesEquivalent = Math.floor(totalHours * 2); // Eat ~2 slices per hour while gaming
  const energyDrinksEquivalent = Math.floor(totalHours / 2); // One energy drink per 2 hours
  const snackBudget = pizzaSlicesEquivalent * 3 + energyDrinksEquivalent * 3; // $3 per pizza slice + $3 per energy drink
  const buttonPressesEstimate = Math.floor(totalHours * 3000); // ~3000 button presses per hour (conservative)
  const totalMinutesOfFun = totalHours * 60;
  const averageEnjoymentRating = gamesPlayed.length > 0
    ? gamesPlayed.reduce((sum, g) => sum + g.game.rating, 0) / gamesPlayed.length
    : 0;
  const entertainmentValueScore = totalHours * averageEnjoymentRating; // Hours × avg rating = entertainment value

  // Value stats
  const totalValueUtilized = gamesPlayed.reduce((sum, g) => sum + g.game.price, 0);
  const averageGameValue = uniqueGames > 0 ? totalValueUtilized / uniqueGames : 0;
  const weeklyRentalCost = 60; // Assumed weekly rental cost
  const savingsVsRenting = totalValueUtilized > 0 ? weeklyRentalCost - (totalCostPerHour * totalHours) : 0;
  const totalLibraryGames = games.filter(g => g.status !== 'Wishlist').length;
  const libraryPercentagePlayed = totalLibraryGames > 0 ? (uniqueGames / totalLibraryGames) * 100 : 0;

  // Fun stats
  const perfectWeek = dailyHours.every(d => d.hours > 0);
  const weekendWarrior = weekendPercentage >= 70;
  const weekdayGrind = weekdayPercentage >= 70;

  // Additional insights
  const daysActive = dailyHours.filter(d => d.hours > 0).length;
  const averageHoursPerDay = daysActive > 0 ? totalHours / daysActive : 0;

  // Calculate longest streak this week
  let longestStreak = 0;
  let currentStreakCount = 0;
  for (const day of dailyHours) {
    if (day.hours > 0) {
      currentStreakCount++;
      longestStreak = Math.max(longestStreak, currentStreakCount);
    } else {
      currentStreakCount = 0;
    }
  }

  // Find earliest and latest session days
  const activeDays = dailyHours.filter(d => d.hours > 0);
  const earliestSession = activeDays.length > 0 ? activeDays[0].day : null;
  const latestSession = activeDays.length > 0 ? activeDays[activeDays.length - 1].day : null;

  return {
    weekStart: lastMonday,
    weekEnd: lastSunday,
    weekLabel,
    totalHours,
    totalSessions,
    uniqueGames,
    currentStreak,
    dailyHours,
    busiestDay,
    restDays,
    gamesPlayed,
    topGame,
    avgSessionLength,
    longestSession,
    marathonSessions,
    powerSessions,
    quickSessions,
    mostConsistentGame: mostConsistentGameData,
    weekdayHours,
    weekendHours,
    weekdayPercentage,
    weekendPercentage,
    favoriteGenre,
    genresPlayed,
    genreDiversityScore,
    completedGames,
    newGamesStarted,
    milestonesReached,
    vsLastWeek: { hoursDiff, gamesDiff, sessionsDiff, trend },
    vsAverage: { percentage: vsAveragePercentage, hoursDiff: vsAverageHoursDiff },
    totalCostPerHour,
    bestValueGame: bestValueGameData,
    gamingStyle,
    weekVibe,
    focusScore,
    movieEquivalent,
    bookEquivalent,
    tvEpisodeEquivalent,
    podcastEquivalent,
    workDaysEquivalent,
    netflixBindgeEquivalent,
    coffeeShopVisits,
    sleepCyclesEquivalent,
    movieTheaterCost,
    streamingCost,
    pizzaSlicesEquivalent,
    energyDrinksEquivalent,
    snackBudget,
    buttonPressesEstimate,
    totalMinutesOfFun,
    averageEnjoymentRating,
    entertainmentValueScore,
    totalValueUtilized,
    averageGameValue,
    savingsVsRenting,
    libraryPercentagePlayed,
    perfectWeek,
    weekendWarrior,
    weekdayGrind,
    averageHoursPerDay,
    daysActive,
    longestStreak,
    earliestSession,
    latestSession,

    // Enhanced insights
    activityPulse: getActivityPulse(games),
    guiltFreeMultiplier: totalCostPerHour > 0 ? Math.round(12 / totalCostPerHour * 10) / 10 : 0,
    backlogStatus: (() => {
      const owned = games.filter(g => g.status !== 'Wishlist');
      const backlog = owned.filter(g => g.status === 'Not Started' || g.status === 'In Progress');
      const completed = owned.filter(g => g.status === 'Completed');
      const dd = getBacklogDoomsdayData(games);
      return { backlogCount: backlog.length, humorTier: dd.humorTier, completionRate: dd.completionRate };
    })(),
    weekCompletionProbabilities: gamesPlayed
      .filter(gp => gp.game.status === 'In Progress' || gp.game.status === 'Not Started')
      .map(gp => {
        const prob = getCompletionProbability(gp.game, games);
        return { game: gp.game, probability: prob.probability, verdict: prob.verdict };
      })
      .sort((a, b) => b.probability - a.probability)
      .slice(0, 5),
  };
}

// Get last completed week (Monday-Sunday) with comprehensive stats
// This is a wrapper around getWeekStatsForOffset for backwards compatibility
// Get the number of weeks with data (to know how far back we can navigate)
export function getAvailableWeeksCount(games: Game[]): number {
  const allLogs = getAllPlayLogs(games);
  if (allLogs.length === 0) return 0;

  // Find oldest play log
  const oldestLog = allLogs[allLogs.length - 1]; // Already sorted by date descending
  const oldestDate = parseLocalDate(oldestLog.log.date);

  // Calculate weeks from oldest log to now
  const now = new Date();
  const diffTime = now.getTime() - oldestDate.getTime();
  const diffWeeks = Math.ceil(diffTime / (7 * 24 * 60 * 60 * 1000));

  return diffWeeks;
}

// Get games that have play logs within a specific time range
export function getGamesPlayedInTimeRange(games: Game[], startDate: Date, endDate: Date): Game[] {
  return games.filter(game => {
    if (!game.playLogs || game.playLogs.length === 0) return false;

    return game.playLogs.some(log => {
      const logDate = parseLocalDate(log.date);
      return logDate >= startDate && logDate <= endDate;
    });
  });
}

// ============================================================
// ENHANCEMENT PHASE 1: Stats & Insights
// ============================================================

/**
 * Guilt-Free Gaming Calculator
 * Compare gaming cost-per-hour against other entertainment
 */
export interface EntertainmentComparison {
  name: string;
  costPerHour: number;
  color: string;
  isGaming: boolean;
}

export interface GuiltFreeData {
  comparisons: EntertainmentComparison[];
  cheapestVs: { name: string; multiplier: number } | null;
  totalHoursValue: number; // What those hours would have cost at movie prices
  savedVsMovies: number;
}

export function getEntertainmentComparison(avgCostPerHour: number, totalHours: number): GuiltFreeData {
  const entertainmentCosts: EntertainmentComparison[] = [
    { name: 'Your Gaming', costPerHour: avgCostPerHour, color: '#8b5cf6', isGaming: true },
    { name: 'Movies', costPerHour: 12, color: '#ef4444', isGaming: false },
    { name: 'Concerts', costPerHour: 25, color: '#f59e0b', isGaming: false },
    { name: 'Dining Out', costPerHour: 15, color: '#ec4899', isGaming: false },
    { name: 'Streaming', costPerHour: 2, color: '#06b6d4', isGaming: false },
    { name: 'Gym', costPerHour: 3.5, color: '#10b981', isGaming: false },
    { name: 'Books', costPerHour: 5, color: '#3b82f6', isGaming: false },
  ].sort((a, b) => b.costPerHour - a.costPerHour);

  // Find the biggest multiplier comparison (most expensive vs gaming)
  const moreExpensive = entertainmentCosts
    .filter(e => !e.isGaming && e.costPerHour > avgCostPerHour)
    .sort((a, b) => b.costPerHour - a.costPerHour);

  const cheapestVs = moreExpensive.length > 0
    ? { name: moreExpensive[0].name, multiplier: Math.round((moreExpensive[0].costPerHour / avgCostPerHour) * 10) / 10 }
    : null;

  const movieCost = 12;
  const totalHoursValue = totalHours * movieCost;
  const savedVsMovies = totalHoursValue - (totalHours * avgCostPerHour);

  return { comparisons: entertainmentCosts, cheapestVs, totalHoursValue, savedVsMovies };
}

/**
 * Enhanced Backlog Doomsday Clock
 * Builds on existing getPredictedBacklogClearance with trend data and humor tiers
 */
export interface BacklogDoomsdayData {
  clearanceDate: Date | null;
  daysRemaining: number;
  backlogCount: number;
  completionRate: number; // games per month
  acquisitionRate: number; // games added per month
  isGettingWorse: boolean; // adding faster than completing
  humorTier: 'Backlog Zero' | 'Almost Free' | 'Getting There' | 'Long Haul' | 'Retirement Project' | 'Heat Death';
  message: string;
}

export function getBacklogDoomsdayData(games: Game[]): BacklogDoomsdayData {
  const owned = games.filter(g => g.status !== 'Wishlist');
  const backlog = owned.filter(g => g.status === 'Not Started' || g.status === 'In Progress');
  const completed = owned.filter(g => g.status === 'Completed');
  const backlogCount = backlog.length;

  // Calculate completion rate (games per month)
  const completedWithDates = completed.filter(g => g.endDate);
  let completionRate = 0;
  if (completedWithDates.length >= 2) {
    const dates = completedWithDates.map(g => parseLocalDate(g.endDate!).getTime()).sort();
    const monthSpan = (dates[dates.length - 1] - dates[0]) / (30 * 24 * 60 * 60 * 1000);
    completionRate = monthSpan > 0 ? completedWithDates.length / monthSpan : 0;
  } else if (completedWithDates.length === 1) {
    completionRate = 0.5; // Assume half a game per month if only one completion
  }

  // Calculate acquisition rate (games per month over last 6 months)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const recentAcquisitions = owned.filter(g => {
    const date = g.datePurchased ? parseLocalDate(g.datePurchased) : new Date(g.createdAt);
    return date >= sixMonthsAgo;
  });
  const acquisitionRate = recentAcquisitions.length / 6;

  const isGettingWorse = acquisitionRate > completionRate;

  // Calculate clearance
  let clearanceDate: Date | null = null;
  let daysRemaining = Infinity;
  const netRate = completionRate - acquisitionRate; // Net games cleared per month

  if (backlogCount === 0) {
    daysRemaining = 0;
    clearanceDate = new Date();
  } else if (netRate > 0) {
    const monthsToClean = backlogCount / netRate;
    daysRemaining = Math.round(monthsToClean * 30);
    clearanceDate = new Date();
    clearanceDate.setDate(clearanceDate.getDate() + daysRemaining);
  } else if (completionRate > 0) {
    // Even if getting worse, show when existing backlog would clear at current completion rate
    const monthsToClean = backlogCount / completionRate;
    daysRemaining = Math.round(monthsToClean * 30);
    clearanceDate = new Date();
    clearanceDate.setDate(clearanceDate.getDate() + daysRemaining);
  }

  // Humor tier
  let humorTier: BacklogDoomsdayData['humorTier'];
  let message: string;
  const years = daysRemaining / 365;

  if (backlogCount === 0) {
    humorTier = 'Backlog Zero';
    message = 'You did it. Your backlog is clear. Time to buy more games.';
  } else if (years < 1) {
    humorTier = 'Almost Free';
    message = `Only ${daysRemaining} days to go. You can almost taste freedom.`;
  } else if (years < 3) {
    humorTier = 'Getting There';
    message = `${Math.round(years * 10) / 10} years. Manageable. Don't buy anything.`;
  } else if (years < 10) {
    humorTier = 'Long Haul';
    message = `${Math.round(years)} years. Your future self is judging your Steam sales addiction.`;
  } else if (years < 50) {
    humorTier = 'Retirement Project';
    message = `${Math.round(years)} years. At least you'll have something to do when you retire.`;
  } else {
    humorTier = 'Heat Death';
    message = completionRate === 0
      ? 'You never finish games. The backlog is eternal.'
      : `${Math.round(years)} years. The sun will engulf the earth first.`;
  }

  if (isGettingWorse && backlogCount > 0) {
    message += ` (You're adding ${acquisitionRate.toFixed(1)} games/mo but completing ${completionRate.toFixed(1)})`;
  }

  return { clearanceDate, daysRemaining, backlogCount, completionRate, acquisitionRate, isGettingWorse, humorTier, message };
}

/**
 * Spending Forecast
 * Project annual spend based on monthly purchase patterns
 */
export interface SpendingForecastData {
  projectedAnnual: number;
  monthlyAvg: number;
  currentYearSpent: number;
  monthsElapsed: number;
  budgetAmount: number | null;
  onTrack: 'under' | 'close' | 'over';
  monthlyData: Array<{ month: string; actual: number; projected: number; budget: number | null }>;
}

export function getSpendingForecast(games: Game[], year: number, budgetAmount?: number): SpendingForecastData {
  const now = new Date();
  const currentMonth = now.getMonth(); // 0-indexed
  const monthsElapsed = year === now.getFullYear() ? currentMonth + 1 : 12;

  // Get spending by month for this year
  const yearGames = games.filter(g => {
    if (g.status === 'Wishlist') return false;
    const date = g.datePurchased ? parseLocalDate(g.datePurchased) : new Date(g.createdAt);
    return date.getFullYear() === year;
  });

  const monthlySpending: Record<number, number> = {};
  for (let m = 0; m < 12; m++) monthlySpending[m] = 0;

  yearGames.forEach(g => {
    const date = g.datePurchased ? parseLocalDate(g.datePurchased) : new Date(g.createdAt);
    const month = date.getMonth();
    monthlySpending[month] += g.price;
  });

  const currentYearSpent = Object.values(monthlySpending).reduce((s, v) => s + v, 0);
  const monthlyAvg = monthsElapsed > 0 ? currentYearSpent / monthsElapsed : 0;
  const projectedAnnual = monthlyAvg * 12;

  const budget = budgetAmount ?? null;
  let onTrack: 'under' | 'close' | 'over' = 'under';
  if (budget !== null) {
    const projectedPercent = projectedAnnual / budget;
    if (projectedPercent > 1.0) onTrack = 'over';
    else if (projectedPercent > 0.9) onTrack = 'close';
  }

  // Build monthly chart data
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  let cumActual = 0;
  const monthlyData = monthNames.map((name, i) => {
    const actual = monthlySpending[i] || 0;
    cumActual += actual;
    const projected = monthlyAvg * (i + 1);
    const budgetLine = budget ? (budget / 12) * (i + 1) : null;
    return { month: name, actual: Math.round(cumActual * 100) / 100, projected: Math.round(projected * 100) / 100, budget: budgetLine };
  });

  return { projectedAnnual, monthlyAvg, currentYearSpent, monthsElapsed, budgetAmount: budget, onTrack, monthlyData };
}

/**
 * "On This Day" Retrospective
 * Find gaming events that happened on today's date in previous periods
 */
export interface OnThisDayEvent {
  game: Game;
  eventType: 'purchased' | 'started' | 'completed' | 'played' | 'abandoned';
  date: string;
  timeAgo: string;
  daysAgo: number;
}

export function getOnThisDay(games: Game[]): OnThisDayEvent[] {
  const now = new Date();
  const todayMonth = now.getMonth();
  const todayDate = now.getDate();
  const events: OnThisDayEvent[] = [];

  // Check windows: exact day match for different lookback periods
  // 1 month, 3 months, 6 months, 1 year, 2 years, etc.
  const checkDate = (dateStr: string | undefined, eventType: OnThisDayEvent['eventType'], game: Game) => {
    if (!dateStr) return;
    const date = parseLocalDate(dateStr);
    const daysAgo = Math.floor((now.getTime() - date.getTime()) / (24 * 60 * 60 * 1000));

    // Only events at least 30 days ago
    if (daysAgo < 30) return;

    // Check if the month and day match (anniversary style)
    if (date.getMonth() === todayMonth && date.getDate() === todayDate) {
      const years = Math.floor(daysAgo / 365);
      const months = Math.floor(daysAgo / 30);
      const timeAgo = years >= 1
        ? `${years} year${years > 1 ? 's' : ''} ago`
        : `${months} month${months > 1 ? 's' : ''} ago`;

      events.push({ game, eventType, date: dateStr, timeAgo, daysAgo });
    }

    // Also check approximate matches for notable periods (within 2 days)
    const notableDays = [30, 90, 180, 365, 730, 1095];
    for (const target of notableDays) {
      if (Math.abs(daysAgo - target) <= 1 && date.getMonth() !== todayMonth) {
        // Don't duplicate exact anniversary matches
        const months = Math.floor(target / 30);
        const years = Math.floor(target / 365);
        const timeAgo = years >= 1
          ? `${years} year${years > 1 ? 's' : ''} ago`
          : `${months} month${months > 1 ? 's' : ''} ago`;
        events.push({ game, eventType, date: dateStr, timeAgo, daysAgo });
      }
    }
  };

  games.forEach(game => {
    checkDate(game.datePurchased, 'purchased', game);
    checkDate(game.startDate, 'started', game);
    checkDate(game.endDate, game.status === 'Abandoned' ? 'abandoned' : 'completed', game);

    // Check play logs too
    game.playLogs?.forEach(log => {
      checkDate(log.date, 'played', game);
    });
  });

  // Deduplicate by game+eventType and sort by most interesting (years > months)
  const seen = new Set<string>();
  return events
    .filter(e => {
      const key = `${e.game.id}-${e.eventType}-${e.timeAgo}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => {
      // Prioritize yearly anniversaries, then by recency of the period
      const aYears = a.daysAgo >= 365;
      const bYears = b.daysAgo >= 365;
      if (aYears !== bYears) return aYears ? -1 : 1;
      return b.daysAgo - a.daysAgo;
    })
    .slice(0, 5); // Max 5 events
}

/**
 * Price Bracket Analysis + Discount Insights
 */
export interface PriceBracketData {
  bracket: string;
  min: number;
  max: number;
  count: number;
  avgRating: number;
  avgHours: number;
  avgCostPerHour: number;
  completionRate: number;
}

export function getPriceBracketAnalysis(games: Game[]): PriceBracketData[] {
  const owned = games.filter(g => g.status !== 'Wishlist');
  const brackets = [
    { bracket: 'Free', min: 0, max: 0 },
    { bracket: '$1-15', min: 0.01, max: 15 },
    { bracket: '$15-30', min: 15.01, max: 30 },
    { bracket: '$30-50', min: 30.01, max: 50 },
    { bracket: '$50-70', min: 50.01, max: 70 },
    { bracket: '$70+', min: 70.01, max: Infinity },
  ];

  return brackets.map(({ bracket, min, max }) => {
    const bracketGames = owned.filter(g => {
      if (min === 0 && max === 0) return g.price === 0 || g.acquiredFree;
      return g.price >= min && g.price <= max && !g.acquiredFree;
    });

    if (bracketGames.length === 0) {
      return { bracket, min, max, count: 0, avgRating: 0, avgHours: 0, avgCostPerHour: 0, completionRate: 0 };
    }

    const withRating = bracketGames.filter(g => g.rating > 0);
    const avgRating = withRating.length > 0
      ? withRating.reduce((s, g) => s + g.rating, 0) / withRating.length : 0;

    const avgHours = bracketGames.reduce((s, g) => s + getTotalHours(g), 0) / bracketGames.length;

    const withHours = bracketGames.filter(g => getTotalHours(g) > 0 && g.price > 0);
    const avgCostPerHour = withHours.length > 0
      ? withHours.reduce((s, g) => s + (g.price / getTotalHours(g)), 0) / withHours.length : 0;

    const completed = bracketGames.filter(g => g.status === 'Completed').length;
    const completionRate = bracketGames.length > 0 ? (completed / bracketGames.length) * 100 : 0;

    return { bracket, min, max, count: bracketGames.length, avgRating: Math.round(avgRating * 10) / 10, avgHours: Math.round(avgHours * 10) / 10, avgCostPerHour: Math.round(avgCostPerHour * 100) / 100, completionRate: Math.round(completionRate) };
  }).filter(b => b.count > 0);
}

export interface DiscountInsightsData {
  totalSaved: number;
  avgDiscountPercent: number;
  bestDeal: { game: Game; discountPercent: number; saved: number } | null;
  discountedCount: number;
  fullPriceCount: number;
  discountedAvgHours: number;
  fullPriceAvgHours: number;
  discountedCompletionRate: number;
  fullPriceCompletionRate: number;
}

export function getDiscountInsights(games: Game[]): DiscountInsightsData {
  const owned = games.filter(g => g.status !== 'Wishlist' && !g.acquiredFree);
  const discounted = owned.filter(g => g.originalPrice && g.originalPrice > g.price);
  const fullPrice = owned.filter(g => !g.originalPrice || g.originalPrice <= g.price);

  const totalSaved = discounted.reduce((s, g) => s + ((g.originalPrice || 0) - g.price), 0);
  const avgDiscountPercent = discounted.length > 0
    ? discounted.reduce((s, g) => s + (((g.originalPrice || 0) - g.price) / (g.originalPrice || 1) * 100), 0) / discounted.length : 0;

  let bestDeal: DiscountInsightsData['bestDeal'] = null;
  if (discounted.length > 0) {
    const sorted = discounted.sort((a, b) => {
      const aSaved = (a.originalPrice || 0) - a.price;
      const bSaved = (b.originalPrice || 0) - b.price;
      return bSaved - aSaved;
    });
    const best = sorted[0];
    bestDeal = {
      game: best,
      discountPercent: Math.round(((best.originalPrice || 0) - best.price) / (best.originalPrice || 1) * 100),
      saved: (best.originalPrice || 0) - best.price,
    };
  }

  const discountedAvgHours = discounted.length > 0
    ? discounted.reduce((s, g) => s + getTotalHours(g), 0) / discounted.length : 0;
  const fullPriceAvgHours = fullPrice.length > 0
    ? fullPrice.reduce((s, g) => s + getTotalHours(g), 0) / fullPrice.length : 0;

  const discountedCompleted = discounted.filter(g => g.status === 'Completed').length;
  const fullPriceCompleted = fullPrice.filter(g => g.status === 'Completed').length;

  return {
    totalSaved,
    avgDiscountPercent: Math.round(avgDiscountPercent),
    bestDeal,
    discountedCount: discounted.length,
    fullPriceCount: fullPrice.length,
    discountedAvgHours: Math.round(discountedAvgHours * 10) / 10,
    fullPriceAvgHours: Math.round(fullPriceAvgHours * 10) / 10,
    discountedCompletionRate: discounted.length > 0 ? Math.round((discountedCompleted / discounted.length) * 100) : 0,
    fullPriceCompletionRate: fullPrice.length > 0 ? Math.round((fullPriceCompleted / fullPrice.length) * 100) : 0,
  };
}

/**
 * Cost Per Completion
 */
export interface CostPerCompletionData {
  cleanCost: number; // totalSpent / completedCount
  trueCost: number; // includes wasted spend on abandoned games
  wastedOnAbandoned: number;
  completedCount: number;
  abandonedCount: number;
  abandonedSpend: number;
}

export function getCostPerCompletion(games: Game[]): CostPerCompletionData {
  const owned = games.filter(g => g.status !== 'Wishlist');
  const completed = owned.filter(g => g.status === 'Completed');
  const abandoned = owned.filter(g => g.status === 'Abandoned');

  const totalSpent = owned.reduce((s, g) => s + g.price, 0);
  const abandonedSpend = abandoned.reduce((s, g) => s + g.price, 0);

  const cleanCost = completed.length > 0 ? totalSpent / completed.length : 0;
  const trueCost = completed.length > 0 ? (totalSpent + abandonedSpend) / completed.length : 0;

  return {
    cleanCost: Math.round(cleanCost * 100) / 100,
    trueCost: Math.round(trueCost * 100) / 100,
    wastedOnAbandoned: Math.round(abandonedSpend * 100) / 100,
    completedCount: completed.length,
    abandonedCount: abandoned.length,
    abandonedSpend: Math.round(abandonedSpend * 100) / 100,
  };
}

/**
 * Activity Pulse
 * Real-time gaming activity indicator
 */
export type ActivityLevel = 'On Fire' | 'Cruising' | 'Casual' | 'Cooling Off' | 'Hibernating';

export interface ActivityPulseData {
  level: ActivityLevel;
  daysActive: number; // days with activity in last 7
  lastPlayedDaysAgo: number;
  color: string;
  pulseSpeed: 'fast' | 'medium' | 'slow' | 'none';
}

export function getActivityPulse(games: Game[]): ActivityPulseData {
  const now = new Date();
  const allLogs = getAllPlayLogs(games);

  if (allLogs.length === 0) {
    return { level: 'Hibernating', daysActive: 0, lastPlayedDaysAgo: Infinity, color: '#6b7280', pulseSpeed: 'none' };
  }

  const lastPlayedDate = parseLocalDate(allLogs[0].log.date);
  const lastPlayedDaysAgo = Math.floor((now.getTime() - lastPlayedDate.getTime()) / (24 * 60 * 60 * 1000));

  // Count unique days with activity in last 7 days
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recentDays = new Set<string>();
  allLogs.forEach(({ log }) => {
    const logDate = parseLocalDate(log.date);
    if (logDate >= sevenDaysAgo) {
      recentDays.add(log.date.split('T')[0]);
    }
  });
  const daysActive = recentDays.size;

  let level: ActivityLevel;
  let color: string;
  let pulseSpeed: ActivityPulseData['pulseSpeed'];

  if (daysActive >= 6) {
    level = 'On Fire';
    color = '#ef4444';
    pulseSpeed = 'fast';
  } else if (daysActive >= 3) {
    level = 'Cruising';
    color = '#f59e0b';
    pulseSpeed = 'medium';
  } else if (daysActive >= 1) {
    level = 'Casual';
    color = '#3b82f6';
    pulseSpeed = 'slow';
  } else if (lastPlayedDaysAgo <= 14) {
    level = 'Cooling Off';
    color = '#6b7280';
    pulseSpeed = 'none';
  } else {
    level = 'Hibernating';
    color = '#374151';
    pulseSpeed = 'none';
  }

  return { level, daysActive, lastPlayedDaysAgo, color, pulseSpeed };
}

/**
 * Rating Distribution & Bias Analysis
 */
export interface RatingBiasData {
  distribution: Array<{ rating: number; count: number; percentage: number }>;
  average: number;
  median: number;
  mode: number;
  stdDev: number;
  biasLabel: string; // "Generous", "Balanced", "Tough", "All Over"
  percentAbove7: number;
  inflationTrend: 'inflating' | 'deflating' | 'stable' | 'insufficient'; // Are newer games rated higher?
}

export function getRatingBiasAnalysis(games: Game[]): RatingBiasData {
  const rated = games.filter(g => g.rating > 0 && g.status !== 'Wishlist');

  if (rated.length === 0) {
    return {
      distribution: [], average: 0, median: 0, mode: 0, stdDev: 0,
      biasLabel: 'No Data', percentAbove7: 0, inflationTrend: 'insufficient',
    };
  }

  // Distribution
  const counts: Record<number, number> = {};
  for (let i = 1; i <= 10; i++) counts[i] = 0;
  rated.forEach(g => { counts[Math.round(g.rating)] = (counts[Math.round(g.rating)] || 0) + 1; });

  const distribution = Object.entries(counts).map(([r, c]) => ({
    rating: parseInt(r),
    count: c,
    percentage: Math.round((c / rated.length) * 100),
  }));

  // Average
  const ratings = rated.map(g => g.rating).sort((a, b) => a - b);
  const average = ratings.reduce((s, r) => s + r, 0) / ratings.length;

  // Median
  const mid = Math.floor(ratings.length / 2);
  const median = ratings.length % 2 !== 0 ? ratings[mid] : (ratings[mid - 1] + ratings[mid]) / 2;

  // Mode
  const mode = distribution.sort((a, b) => b.count - a.count)[0]?.rating || 0;

  // Standard deviation
  const variance = ratings.reduce((s, r) => s + Math.pow(r - average, 2), 0) / ratings.length;
  const stdDev = Math.sqrt(variance);

  // Bias label
  const percentAbove7 = Math.round((rated.filter(g => g.rating >= 7).length / rated.length) * 100);
  let biasLabel: string;
  if (percentAbove7 >= 70) biasLabel = 'Generous';
  else if (percentAbove7 >= 40) biasLabel = 'Balanced';
  else if (stdDev > 2.5) biasLabel = 'All Over the Place';
  else biasLabel = 'Tough Critic';

  // Inflation trend — compare first half vs second half by date added
  let inflationTrend: RatingBiasData['inflationTrend'] = 'insufficient';
  if (rated.length >= 6) {
    const sorted = [...rated].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const halfIdx = Math.floor(sorted.length / 2);
    const firstHalf = sorted.slice(0, halfIdx);
    const secondHalf = sorted.slice(halfIdx);

    const firstAvg = firstHalf.reduce((s, g) => s + g.rating, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((s, g) => s + g.rating, 0) / secondHalf.length;
    const diff = secondAvg - firstAvg;

    if (diff > 0.5) inflationTrend = 'inflating';
    else if (diff < -0.5) inflationTrend = 'deflating';
    else inflationTrend = 'stable';
  }

  return {
    distribution: distribution.sort((a, b) => a.rating - b.rating),
    average: Math.round(average * 10) / 10,
    median: Math.round(median * 10) / 10,
    mode,
    stdDev: Math.round(stdDev * 10) / 10,
    biasLabel,
    percentAbove7,
    inflationTrend,
  };
}

// ========================================================================
// ENHANCEMENT PHASE 2: Advanced Analytics
// ========================================================================

/**
 * Completion Probability Predictor
 * Predict how likely a game is to be completed based on historical patterns
 */
export interface CompletionProbabilityData {
  probability: number; // 0-100
  factors: Array<{ label: string; impact: number; description: string }>;
  verdict: string;
}

export function getCompletionProbability(game: Game, allGames: Game[]): CompletionProbabilityData {
  const factors: CompletionProbabilityData['factors'] = [];
  let score = 50; // Base probability

  const owned = allGames.filter(g => g.status !== 'Wishlist');
  const completed = owned.filter(g => g.status === 'Completed');
  const abandoned = owned.filter(g => g.status === 'Abandoned');

  // Factor 1: Genre completion rate
  if (game.genre) {
    const genreGames = owned.filter(g => g.genre === game.genre && (g.status === 'Completed' || g.status === 'Abandoned'));
    if (genreGames.length >= 2) {
      const genreCompletionRate = genreGames.filter(g => g.status === 'Completed').length / genreGames.length;
      const impact = Math.round((genreCompletionRate - 0.5) * 30);
      score += impact;
      factors.push({
        label: 'Genre History',
        impact,
        description: `${Math.round(genreCompletionRate * 100)}% ${game.genre} completion rate`,
      });
    }
  }

  // Factor 2: Current momentum (recent play sessions)
  const totalHours = getTotalHours(game);
  if (game.playLogs && game.playLogs.length > 0) {
    const now = new Date();
    const sortedLogs = [...game.playLogs].sort((a, b) => parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime());
    const daysSinceLastSession = Math.floor((now.getTime() - parseLocalDate(sortedLogs[0].date).getTime()) / (24 * 60 * 60 * 1000));

    if (daysSinceLastSession <= 7) {
      factors.push({ label: 'Active Momentum', impact: 15, description: 'Played in the last week' });
      score += 15;
    } else if (daysSinceLastSession <= 30) {
      factors.push({ label: 'Recent Activity', impact: 5, description: 'Played in the last month' });
      score += 5;
    } else if (daysSinceLastSession > 60) {
      const penalty = Math.min(20, Math.floor(daysSinceLastSession / 30) * 5);
      factors.push({ label: 'Stale', impact: -penalty, description: `${daysSinceLastSession} days since last session` });
      score -= penalty;
    }

    // Factor 3: Session frequency trend
    if (game.playLogs.length >= 3) {
      const recentLogs = sortedLogs.slice(0, Math.ceil(sortedLogs.length / 2));
      const olderLogs = sortedLogs.slice(Math.ceil(sortedLogs.length / 2));

      const recentAvgGap = recentLogs.length > 1
        ? (parseLocalDate(recentLogs[0].date).getTime() - parseLocalDate(recentLogs[recentLogs.length - 1].date).getTime()) / (recentLogs.length - 1) / (24 * 60 * 60 * 1000)
        : 0;
      const olderAvgGap = olderLogs.length > 1
        ? (parseLocalDate(olderLogs[0].date).getTime() - parseLocalDate(olderLogs[olderLogs.length - 1].date).getTime()) / (olderLogs.length - 1) / (24 * 60 * 60 * 1000)
        : 0;

      if (recentAvgGap > 0 && olderAvgGap > 0 && recentAvgGap < olderAvgGap * 0.7) {
        factors.push({ label: 'Accelerating', impact: 10, description: 'Sessions getting more frequent' });
        score += 10;
      } else if (recentAvgGap > olderAvgGap * 1.5) {
        factors.push({ label: 'Slowing Down', impact: -10, description: 'Sessions getting less frequent' });
        score -= 10;
      }
    }
  } else if (game.status === 'Not Started') {
    // Never played — check shelf time
    const daysPurchased = game.datePurchased
      ? Math.floor((Date.now() - parseLocalDate(game.datePurchased).getTime()) / (24 * 60 * 60 * 1000))
      : 0;
    if (daysPurchased > 180) {
      factors.push({ label: 'Shelf Warmer', impact: -20, description: `Bought ${Math.round(daysPurchased / 30)} months ago, never started` });
      score -= 20;
    } else if (daysPurchased > 60) {
      factors.push({ label: 'Waiting', impact: -10, description: `Sitting on shelf for ${daysPurchased} days` });
      score -= 10;
    }
  }

  // Factor 4: Hours invested (sunk cost encouragement)
  if (totalHours > 20) {
    factors.push({ label: 'Invested', impact: 10, description: `${totalHours.toFixed(0)}h already invested` });
    score += 10;
  } else if (totalHours > 5) {
    factors.push({ label: 'Getting Into It', impact: 5, description: `${totalHours.toFixed(0)}h invested` });
    score += 5;
  }

  // Factor 5: Rating (high rating = more motivation)
  if (game.rating >= 8) {
    factors.push({ label: 'Loving It', impact: 10, description: `Rated ${game.rating}/10` });
    score += 10;
  } else if (game.rating >= 6 && game.rating > 0) {
    factors.push({ label: 'Decent', impact: 0, description: `Rated ${game.rating}/10` });
  } else if (game.rating > 0 && game.rating < 6) {
    factors.push({ label: 'Not Enjoying', impact: -15, description: `Only rated ${game.rating}/10` });
    score -= 15;
  }

  // Factor 6: Overall completion tendency
  if (completed.length + abandoned.length >= 3) {
    const overallRate = completed.length / (completed.length + abandoned.length);
    if (overallRate >= 0.7) {
      factors.push({ label: 'Completionist', impact: 10, description: `${Math.round(overallRate * 100)}% overall completion` });
      score += 10;
    } else if (overallRate <= 0.3) {
      factors.push({ label: 'Tends to Abandon', impact: -10, description: `${Math.round(overallRate * 100)}% overall completion` });
      score -= 10;
    }
  }

  const probability = Math.max(5, Math.min(95, score));

  let verdict: string;
  if (probability >= 80) verdict = 'Very likely to finish';
  else if (probability >= 60) verdict = 'Good chance of completion';
  else if (probability >= 40) verdict = 'Could go either way';
  else if (probability >= 20) verdict = 'At risk of abandonment';
  else verdict = 'Unlikely to be completed';

  return {
    probability,
    factors: factors.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact)),
    verdict,
  };
}

/**
 * Genre Satisfaction Matrix
 * Scatter data for genre vs average rating and hours
 */
export interface GenreSatisfactionPoint {
  genre: string;
  avgRating: number;
  avgHours: number;
  count: number;
  totalSpent: number;
  quadrant: 'Love & Play' | 'Love but Skip' | 'Guilty Pleasure' | 'Why Buy These?';
}

export function getGenreSatisfactionMatrix(games: Game[]): GenreSatisfactionPoint[] {
  const owned = games.filter(g => g.status !== 'Wishlist' && g.genre);
  const genreMap: Record<string, { ratings: number[]; hours: number[]; spent: number }> = {};

  owned.forEach(g => {
    const genre = g.genre!;
    if (!genreMap[genre]) genreMap[genre] = { ratings: [], hours: [], spent: 0 };
    if (g.rating > 0) genreMap[genre].ratings.push(g.rating);
    genreMap[genre].hours.push(getTotalHours(g));
    genreMap[genre].spent += g.price;
  });

  // Need midpoints for quadrant assignment
  const allPoints = Object.entries(genreMap)
    .filter(([, data]) => data.ratings.length > 0)
    .map(([genre, data]) => ({
      genre,
      avgRating: data.ratings.reduce((s, r) => s + r, 0) / data.ratings.length,
      avgHours: data.hours.reduce((s, h) => s + h, 0) / data.hours.length,
      count: data.hours.length,
      totalSpent: data.spent,
    }));

  if (allPoints.length === 0) return [];

  const medianRating = allPoints.length > 0
    ? [...allPoints].sort((a, b) => a.avgRating - b.avgRating)[Math.floor(allPoints.length / 2)].avgRating
    : 5;
  const medianHours = allPoints.length > 0
    ? [...allPoints].sort((a, b) => a.avgHours - b.avgHours)[Math.floor(allPoints.length / 2)].avgHours
    : 10;

  return allPoints.map(p => {
    let quadrant: GenreSatisfactionPoint['quadrant'];
    if (p.avgRating >= medianRating && p.avgHours >= medianHours) quadrant = 'Love & Play';
    else if (p.avgRating >= medianRating && p.avgHours < medianHours) quadrant = 'Love but Skip';
    else if (p.avgRating < medianRating && p.avgHours >= medianHours) quadrant = 'Guilty Pleasure';
    else quadrant = 'Why Buy These?';

    return {
      ...p,
      avgRating: Math.round(p.avgRating * 10) / 10,
      avgHours: Math.round(p.avgHours * 10) / 10,
      totalSpent: Math.round(p.totalSpent),
      quadrant,
    };
  });
}

/**
 * Day-of-Week & Seasonal Patterns
 * Analyze when the user games most
 */
export interface DayOfWeekData {
  day: string;
  dayIndex: number;
  sessions: number;
  totalHours: number;
  avgSessionLength: number;
  percentage: number;
}

export interface SeasonalData {
  month: string;
  monthIndex: number;
  sessions: number;
  totalHours: number;
  gamesStarted: number;
  gamesPurchased: number;
}

export interface PlayPatternData {
  dayOfWeek: DayOfWeekData[];
  seasonal: SeasonalData[];
  weekendWarriorScore: number; // % of sessions on Sat/Sun
  busiestDay: string;
  busiestMonth: string;
  patternLabel: string; // "Weekend Warrior", "Everyday Gamer", "Weekday Warrior"
  weekdayVsWeekendHours: { weekday: number; weekend: number };
}

export function getPlayPatterns(games: Game[]): PlayPatternData {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const dayStats: Record<number, { sessions: number; hours: number }> = {};
  const monthStats: Record<number, { sessions: number; hours: number; started: number; purchased: number }> = {};

  for (let d = 0; d < 7; d++) dayStats[d] = { sessions: 0, hours: 0 };
  for (let m = 0; m < 12; m++) monthStats[m] = { sessions: 0, hours: 0, started: 0, purchased: 0 };

  // Analyze play logs
  games.forEach(game => {
    game.playLogs?.forEach(log => {
      const date = parseLocalDate(log.date);
      const dow = date.getDay();
      const month = date.getMonth();
      dayStats[dow].sessions++;
      dayStats[dow].hours += log.hours;
      monthStats[month].sessions++;
      monthStats[month].hours += log.hours;
    });

    // Track start dates
    if (game.startDate) {
      const month = parseLocalDate(game.startDate).getMonth();
      monthStats[month].started++;
    }

    // Track purchase dates
    if (game.datePurchased && game.status !== 'Wishlist') {
      const month = parseLocalDate(game.datePurchased).getMonth();
      monthStats[month].purchased++;
    }
  });

  const totalSessions = Object.values(dayStats).reduce((s, d) => s + d.sessions, 0);

  const dayOfWeek: DayOfWeekData[] = dayNames.map((day, i) => ({
    day: day.substring(0, 3),
    dayIndex: i,
    sessions: dayStats[i].sessions,
    totalHours: Math.round(dayStats[i].hours * 10) / 10,
    avgSessionLength: dayStats[i].sessions > 0
      ? Math.round((dayStats[i].hours / dayStats[i].sessions) * 10) / 10
      : 0,
    percentage: totalSessions > 0 ? Math.round((dayStats[i].sessions / totalSessions) * 100) : 0,
  }));

  const seasonal: SeasonalData[] = monthNames.map((month, i) => ({
    month,
    monthIndex: i,
    sessions: monthStats[i].sessions,
    totalHours: Math.round(monthStats[i].hours * 10) / 10,
    gamesStarted: monthStats[i].started,
    gamesPurchased: monthStats[i].purchased,
  }));

  // Weekend warrior score
  const weekendSessions = dayStats[0].sessions + dayStats[6].sessions;
  const weekendHours = dayStats[0].hours + dayStats[6].hours;
  const weekdayHours = Object.entries(dayStats)
    .filter(([k]) => k !== '0' && k !== '6')
    .reduce((s, [, v]) => s + v.hours, 0);
  const weekendWarriorScore = totalSessions > 0 ? Math.round((weekendSessions / totalSessions) * 100) : 0;

  const busiestDay = dayOfWeek.sort((a, b) => b.totalHours - a.totalHours)[0]?.day || 'N/A';
  const busiestMonth = seasonal.sort((a, b) => b.totalHours - a.totalHours)[0]?.month || 'N/A';

  let patternLabel: string;
  if (weekendWarriorScore >= 60) patternLabel = 'Weekend Warrior';
  else if (weekendWarriorScore <= 30) patternLabel = 'Weekday Warrior';
  else patternLabel = 'Everyday Gamer';

  return {
    dayOfWeek: dayNames.map((day, i) => dayOfWeek.find(d => d.dayIndex === i)!),
    seasonal: monthNames.map((month, i) => seasonal.find(s => s.monthIndex === i)!),
    weekendWarriorScore,
    busiestDay,
    busiestMonth,
    patternLabel,
    weekdayVsWeekendHours: {
      weekday: Math.round(weekdayHours * 10) / 10,
      weekend: Math.round(weekendHours * 10) / 10,
    },
  };
}

/**
 * Abandonment Autopsy
 * Analyze patterns in abandoned games to understand why they get dropped
 */
export interface AbandonmentReason {
  label: string;
  count: number;
  games: Array<{ name: string; hours: number; price: number; genre?: string }>;
  percentage: number;
}

export interface AbandonmentAutopsyData {
  totalAbandoned: number;
  totalWasted: number;
  avgHoursBeforeAbandon: number;
  avgPriceAbandoned: number;
  reasons: AbandonmentReason[];
  riskGenres: Array<{ genre: string; abandonRate: number; count: number }>;
  riskPriceRange: string;
  survivalCurve: Array<{ hours: string; surviving: number }>; // What % of games survive past X hours
  dropOffPoint: string; // "Most games are abandoned between 2-5 hours"
}

export function getAbandonmentAutopsy(games: Game[]): AbandonmentAutopsyData {
  const owned = games.filter(g => g.status !== 'Wishlist');
  const abandoned = owned.filter(g => g.status === 'Abandoned');

  if (abandoned.length === 0) {
    return {
      totalAbandoned: 0,
      totalWasted: 0,
      avgHoursBeforeAbandon: 0,
      avgPriceAbandoned: 0,
      reasons: [],
      riskGenres: [],
      riskPriceRange: '',
      survivalCurve: [],
      dropOffPoint: '',
    };
  }

  const totalWasted = abandoned.reduce((s, g) => s + g.price, 0);
  const avgHours = abandoned.reduce((s, g) => s + getTotalHours(g), 0) / abandoned.length;
  const avgPrice = totalWasted / abandoned.length;

  // Categorize abandonment reasons by pattern analysis
  const reasons: Record<string, Game[]> = {
    'Barely Tried': [], // < 2 hours
    'Early Dropout': [], // 2-10 hours
    'Mid-Game Fatigue': [], // 10-30 hours
    'Late Burnout': [], // 30+ hours
    'Buyer\'s Remorse': [], // Never played (0h)
  };

  abandoned.forEach(g => {
    const hours = getTotalHours(g);
    if (hours === 0) reasons['Buyer\'s Remorse'].push(g);
    else if (hours < 2) reasons['Barely Tried'].push(g);
    else if (hours < 10) reasons['Early Dropout'].push(g);
    else if (hours < 30) reasons['Mid-Game Fatigue'].push(g);
    else reasons['Late Burnout'].push(g);
  });

  const reasonList: AbandonmentReason[] = Object.entries(reasons)
    .filter(([, games]) => games.length > 0)
    .map(([label, gList]) => ({
      label,
      count: gList.length,
      games: gList.map(g => ({ name: g.name, hours: getTotalHours(g), price: g.price, genre: g.genre })),
      percentage: Math.round((gList.length / abandoned.length) * 100),
    }))
    .sort((a, b) => b.count - a.count);

  // Genre risk analysis
  const genreCounts: Record<string, { abandoned: number; total: number }> = {};
  owned.forEach(g => {
    if (g.genre) {
      if (!genreCounts[g.genre]) genreCounts[g.genre] = { abandoned: 0, total: 0 };
      genreCounts[g.genre].total++;
      if (g.status === 'Abandoned') genreCounts[g.genre].abandoned++;
    }
  });

  const riskGenres = Object.entries(genreCounts)
    .filter(([, data]) => data.total >= 2 && data.abandoned > 0)
    .map(([genre, data]) => ({
      genre,
      abandonRate: Math.round((data.abandoned / data.total) * 100),
      count: data.abandoned,
    }))
    .sort((a, b) => b.abandonRate - a.abandonRate);

  // Price range analysis for abandonment
  const priceRanges = [
    { label: '$0-15', min: 0, max: 15 },
    { label: '$15-30', min: 15.01, max: 30 },
    { label: '$30-50', min: 30.01, max: 50 },
    { label: '$50+', min: 50.01, max: Infinity },
  ];

  let highestAbandonRate = { label: '', rate: 0 };
  priceRanges.forEach(({ label, min, max }) => {
    const inRange = owned.filter(g => g.price >= min && g.price <= max);
    const abandonedInRange = inRange.filter(g => g.status === 'Abandoned');
    if (inRange.length >= 2) {
      const rate = abandonedInRange.length / inRange.length;
      if (rate > highestAbandonRate.rate) {
        highestAbandonRate = { label, rate };
      }
    }
  });

  // Survival curve — what % of all owned games survive past each hour threshold
  const hourThresholds = [0, 1, 2, 5, 10, 20, 30, 50, 100];
  const gamesWithHours = owned.filter(g => g.status === 'Completed' || g.status === 'Abandoned');
  const survivalCurve = hourThresholds.map(threshold => {
    const surviving = gamesWithHours.filter(g => getTotalHours(g) >= threshold).length;
    return {
      hours: threshold === 0 ? '0h' : `${threshold}h`,
      surviving: gamesWithHours.length > 0 ? Math.round((surviving / gamesWithHours.length) * 100) : 100,
    };
  });

  // Find the biggest drop-off
  let biggestDrop = { from: '0h', to: '1h', drop: 0 };
  for (let i = 1; i < survivalCurve.length; i++) {
    const drop = survivalCurve[i - 1].surviving - survivalCurve[i].surviving;
    if (drop > biggestDrop.drop) {
      biggestDrop = { from: survivalCurve[i - 1].hours, to: survivalCurve[i].hours, drop };
    }
  }

  const dropOffPoint = biggestDrop.drop > 0
    ? `Most games are dropped between ${biggestDrop.from} and ${biggestDrop.to} (${biggestDrop.drop}% drop)`
    : '';

  return {
    totalAbandoned: abandoned.length,
    totalWasted: Math.round(totalWasted),
    avgHoursBeforeAbandon: Math.round(avgHours * 10) / 10,
    avgPriceAbandoned: Math.round(avgPrice),
    reasons: reasonList,
    riskGenres,
    riskPriceRange: highestAbandonRate.label,
    survivalCurve,
    dropOffPoint,
  };
}

// ========================================================================
// ENHANCEMENT PHASE 3: Fun & Engagement
// ========================================================================

/**
 * Random Game Picker
 * Returns a filtered random game from the backlog
 */
export interface RandomPickerFilters {
  genre?: string;
  platform?: string;
  maxEstimatedHours?: number; // 'quick' = 10, 'medium' = 30, 'deep' = Infinity
  includeNotStarted?: boolean;
  includeInProgress?: boolean;
}

export function getRandomGamePick(games: Game[], filters: RandomPickerFilters = {}): Game | null {
  let candidates = games.filter(g => g.status !== 'Wishlist' && g.status !== 'Completed' && g.status !== 'Abandoned');

  if (filters.includeNotStarted === false) {
    candidates = candidates.filter(g => g.status !== 'Not Started');
  }
  if (filters.includeInProgress === false) {
    candidates = candidates.filter(g => g.status !== 'In Progress');
  }
  if (filters.genre) {
    candidates = candidates.filter(g => g.genre === filters.genre);
  }
  if (filters.platform) {
    candidates = candidates.filter(g => g.platform === filters.platform);
  }

  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

export function getPickerFilterOptions(games: Game[]): { genres: string[]; platforms: string[] } {
  const candidates = games.filter(g => g.status !== 'Wishlist' && g.status !== 'Completed' && g.status !== 'Abandoned');
  const genres = [...new Set(candidates.filter(g => g.genre).map(g => g.genre!))].sort();
  const platforms = [...new Set(candidates.filter(g => g.platform).map(g => g.platform!))].sort();
  return { genres, platforms };
}

/**
 * Milestone Celebrations
 * Detects milestones that have been reached
 */
export interface Milestone {
  id: string;
  name: string;
  description: string;
  icon: string;
  achieved: boolean;
  achievedDate?: string;
  value?: number;
}

export function getMilestones(games: Game[]): Milestone[] {
  const owned = games.filter(g => g.status !== 'Wishlist');
  const completed = owned.filter(g => g.status === 'Completed');
  const totalHours = owned.reduce((s, g) => s + getTotalHours(g), 0);
  const totalSpent = owned.reduce((s, g) => s + g.price, 0);
  const allLogs = getAllPlayLogs(games);
  const totalSessions = allLogs.length;
  const uniqueGenres = new Set(owned.filter(g => g.genre).map(g => g.genre)).size;
  const perfectGames = owned.filter(g => g.rating === 10);
  const centuryGames = owned.filter(g => getTotalHours(g) >= 100);
  const streak = getLongestGamingStreak(games);

  // Find sub-$1/hr games
  const subDollarGames = owned.filter(g => {
    const hours = getTotalHours(g);
    return hours > 0 && g.price > 0 && (g.price / hours) < 1;
  });

  const milestones: Milestone[] = [
    // Hour milestones
    { id: 'hours_100', name: 'First Hundred', description: '100 total hours played', icon: '🎮', achieved: totalHours >= 100, value: 100 },
    { id: 'hours_500', name: 'Half Millennium', description: '500 total hours played', icon: '⚡', achieved: totalHours >= 500, value: 500 },
    { id: 'hours_1000', name: 'Thousand Club', description: '1,000 total hours played', icon: '🏅', achieved: totalHours >= 1000, value: 1000 },
    { id: 'hours_5000', name: 'Veteran Gamer', description: '5,000 total hours played', icon: '🎖️', achieved: totalHours >= 5000, value: 5000 },

    // Completion milestones
    { id: 'complete_1', name: 'First Blood', description: 'Complete your first game', icon: '🗡️', achieved: completed.length >= 1, value: 1 },
    { id: 'complete_5', name: 'High Five', description: 'Complete 5 games', icon: '🖐️', achieved: completed.length >= 5, value: 5 },
    { id: 'complete_10', name: 'Double Digits', description: 'Complete 10 games', icon: '🔟', achieved: completed.length >= 10, value: 10 },
    { id: 'complete_25', name: 'Quarter Century', description: 'Complete 25 games', icon: '🏆', achieved: completed.length >= 25, value: 25 },
    { id: 'complete_50', name: 'Golden Fifty', description: 'Complete 50 games', icon: '👑', achieved: completed.length >= 50, value: 50 },

    // Session milestones
    { id: 'sessions_50', name: 'Regular Player', description: 'Log 50 play sessions', icon: '📝', achieved: totalSessions >= 50, value: 50 },
    { id: 'sessions_200', name: 'Session Tracker', description: 'Log 200 play sessions', icon: '📊', achieved: totalSessions >= 200, value: 200 },
    { id: 'sessions_500', name: 'Data Nerd', description: 'Log 500 play sessions', icon: '🤓', achieved: totalSessions >= 500, value: 500 },

    // Value milestones
    { id: 'sub_dollar_5', name: 'Value Hunter', description: '5 games under $1/hr', icon: '💰', achieved: subDollarGames.length >= 5, value: 5 },
    { id: 'century_game', name: 'Century Game', description: 'Play any game for 100+ hours', icon: '💯', achieved: centuryGames.length > 0 },

    // Rating milestones
    { id: 'perfect_10', name: 'Masterpiece Found', description: 'Rate a game 10/10', icon: '✨', achieved: perfectGames.length > 0 },

    // Diversity milestones
    { id: 'genres_5', name: 'Eclectic Taste', description: 'Play 5 different genres', icon: '🌈', achieved: uniqueGenres >= 5, value: 5 },
    { id: 'genres_10', name: 'Genre Connoisseur', description: 'Play 10 different genres', icon: '🎨', achieved: uniqueGenres >= 10, value: 10 },

    // Streak milestones
    { id: 'streak_7', name: 'Week Warrior', description: '7-day gaming streak', icon: '🔥', achieved: streak >= 7, value: 7 },
    { id: 'streak_30', name: 'Monthly Devotion', description: '30-day gaming streak', icon: '🌟', achieved: streak >= 30, value: 30 },

    // Spending milestones
    { id: 'spent_100', name: 'First Hundred', description: 'Spend $100 on games', icon: '💵', achieved: totalSpent >= 100, value: 100 },
    { id: 'spent_500', name: 'Collector', description: 'Spend $500 on games', icon: '💳', achieved: totalSpent >= 500, value: 500 },
    { id: 'spent_1000', name: 'Whale Mode', description: 'Spend $1,000 on games', icon: '🐋', achieved: totalSpent >= 1000, value: 1000 },

    // Library milestones
    { id: 'library_10', name: 'Starter Library', description: 'Own 10 games', icon: '📖', achieved: owned.length >= 10, value: 10 },
    { id: 'library_25', name: 'Growing Collection', description: 'Own 25 games', icon: '📚', achieved: owned.length >= 25, value: 25 },
    { id: 'library_50', name: 'Serious Collector', description: 'Own 50 games', icon: '🏛️', achieved: owned.length >= 50, value: 50 },
    { id: 'library_100', name: 'Digital Hoarder', description: 'Own 100 games', icon: '🗄️', achieved: owned.length >= 100, value: 100 },
  ];

  return milestones;
}

/**
 * Collection Trophies
 * Visual trophy case for gaming achievements — genre/behavior-based, not purely time-based
 */
export type TrophyTier = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface Trophy {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: TrophyTier;
  earned: boolean;
  progress: number; // 0-100
  category: 'exploration' | 'mastery' | 'value' | 'social' | 'dedication' | 'curator';
}

export function getCollectionTrophies(games: Game[]): Trophy[] {
  const owned = games.filter(g => g.status !== 'Wishlist');
  const completed = owned.filter(g => g.status === 'Completed');
  const played = owned.filter(g => getTotalHours(g) > 0);
  const totalHours = owned.reduce((s, g) => s + getTotalHours(g), 0);
  const uniqueGenres = [...new Set(played.filter(g => g.genre).map(g => g.genre!))];
  const uniquePlatforms = [...new Set(owned.filter(g => g.platform).map(g => g.platform!))];
  const franchises = [...new Set(owned.filter(g => g.franchise).map(g => g.franchise!))];
  const allLogs = getAllPlayLogs(games);

  // Genre-specific trophies
  const genreHours: Record<string, number> = {};
  const genreCompleted: Record<string, number> = {};
  const genreCount: Record<string, number> = {};
  played.forEach(g => {
    if (g.genre) {
      genreHours[g.genre] = (genreHours[g.genre] || 0) + getTotalHours(g);
      genreCount[g.genre] = (genreCount[g.genre] || 0) + 1;
    }
  });
  completed.forEach(g => {
    if (g.genre) genreCompleted[g.genre] = (genreCompleted[g.genre] || 0) + 1;
  });

  // Calculate rating consistency
  const ratedGames = played.filter(g => g.rating > 0);
  const ratings = ratedGames.map(g => g.rating);
  const avgRating = ratings.length > 0 ? ratings.reduce((s, r) => s + r, 0) / ratings.length : 0;

  // Discount hunting
  const discounted = owned.filter(g => g.originalPrice && g.originalPrice > g.price);
  const totalSaved = discounted.reduce((s, g) => s + ((g.originalPrice || 0) - g.price), 0);
  const avgDiscount = discounted.length > 0
    ? discounted.reduce((s, g) => s + (((g.originalPrice || 0) - g.price) / (g.originalPrice || 1) * 100), 0) / discounted.length
    : 0;

  // Fastest completion
  const completedWithDates = completed.filter(g => g.startDate && g.endDate);
  const completionDays = completedWithDates.map(g => calculateDaysToComplete(g.startDate!, g.endDate!)).filter((d): d is number => d !== null && d > 0);
  const fastestDays = completionDays.length > 0 ? Math.min(...completionDays) : Infinity;

  // Long session count
  const longSessions = allLogs.filter(({ log }) => log.hours >= 4).length;
  const marathonSessions = allLogs.filter(({ log }) => log.hours >= 8).length;

  // Franchise depth
  const franchiseGames: Record<string, number> = {};
  owned.forEach(g => { if (g.franchise) franchiseGames[g.franchise] = (franchiseGames[g.franchise] || 0) + 1; });
  const deepestFranchise = Object.values(franchiseGames).length > 0 ? Math.max(...Object.values(franchiseGames)) : 0;

  // Completion rate
  const completionRate = owned.length > 0 ? (completed.length / owned.length) * 100 : 0;

  // Perfect rated games
  const perfectGames = ratedGames.filter(g => g.rating >= 9);

  const trophies: Trophy[] = [
    // Exploration trophies
    {
      id: 'genre_sampler', name: 'Genre Sampler', description: 'Play 5 different genres',
      icon: '🎭', tier: uniqueGenres.length >= 10 ? 'gold' : uniqueGenres.length >= 7 ? 'silver' : 'bronze',
      earned: uniqueGenres.length >= 5, progress: Math.min(100, (uniqueGenres.length / 5) * 100),
      category: 'exploration',
    },
    {
      id: 'platform_hopper', name: 'Platform Hopper', description: 'Game on 3+ platforms',
      icon: '🔀', tier: uniquePlatforms.length >= 5 ? 'gold' : uniquePlatforms.length >= 4 ? 'silver' : 'bronze',
      earned: uniquePlatforms.length >= 3, progress: Math.min(100, (uniquePlatforms.length / 3) * 100),
      category: 'exploration',
    },
    {
      id: 'franchise_fan', name: 'Franchise Devotee', description: 'Play 3+ games from one franchise',
      icon: '🎬', tier: deepestFranchise >= 5 ? 'gold' : deepestFranchise >= 4 ? 'silver' : 'bronze',
      earned: deepestFranchise >= 3, progress: Math.min(100, (deepestFranchise / 3) * 100),
      category: 'exploration',
    },

    // Mastery trophies
    {
      id: 'completionist_elite', name: 'Completionist Elite', description: '80%+ completion rate',
      icon: '🏆', tier: completionRate >= 90 ? 'platinum' : completionRate >= 80 ? 'gold' : completionRate >= 60 ? 'silver' : 'bronze',
      earned: completionRate >= 50, progress: Math.min(100, (completionRate / 50) * 100),
      category: 'mastery',
    },
    {
      id: 'speed_demon', name: 'Speed Demon', description: 'Complete a game in under 7 days',
      icon: '⚡', tier: fastestDays <= 3 ? 'gold' : fastestDays <= 5 ? 'silver' : 'bronze',
      earned: fastestDays <= 7, progress: fastestDays <= 7 ? 100 : Math.max(0, (1 - (fastestDays - 7) / 30) * 100),
      category: 'mastery',
    },
    {
      id: 'genre_master', name: 'Genre Master', description: 'Complete 5+ games in one genre',
      icon: '🎓', tier: Math.max(...Object.values(genreCompleted), 0) >= 10 ? 'gold' : Math.max(...Object.values(genreCompleted), 0) >= 7 ? 'silver' : 'bronze',
      earned: Math.max(...Object.values(genreCompleted), 0) >= 5,
      progress: Math.min(100, (Math.max(...Object.values(genreCompleted), 0) / 5) * 100),
      category: 'mastery',
    },

    // Value trophies
    {
      id: 'bargain_king', name: 'Bargain King', description: 'Save $200+ from discounts',
      icon: '💰', tier: totalSaved >= 500 ? 'gold' : totalSaved >= 300 ? 'silver' : 'bronze',
      earned: totalSaved >= 200, progress: Math.min(100, (totalSaved / 200) * 100),
      category: 'value',
    },
    {
      id: 'discount_sniper', name: 'Discount Sniper', description: 'Average 50%+ discount',
      icon: '🎯', tier: avgDiscount >= 70 ? 'gold' : avgDiscount >= 60 ? 'silver' : 'bronze',
      earned: avgDiscount >= 50 && discounted.length >= 5,
      progress: discounted.length >= 5 ? Math.min(100, (avgDiscount / 50) * 100) : (discounted.length / 5) * 100,
      category: 'value',
    },

    // Dedication trophies
    {
      id: 'marathon_master', name: 'Marathon Master', description: '10 sessions of 4+ hours',
      icon: '🏃', tier: marathonSessions >= 5 ? 'gold' : longSessions >= 20 ? 'silver' : 'bronze',
      earned: longSessions >= 10, progress: Math.min(100, (longSessions / 10) * 100),
      category: 'dedication',
    },
    {
      id: 'deep_diver', name: 'Deep Diver', description: 'Spend 100+ hours in one genre',
      icon: '🤿', tier: Math.max(...Object.values(genreHours), 0) >= 500 ? 'gold' : Math.max(...Object.values(genreHours), 0) >= 250 ? 'silver' : 'bronze',
      earned: Math.max(...Object.values(genreHours), 0) >= 100,
      progress: Math.min(100, (Math.max(...Object.values(genreHours), 0) / 100) * 100),
      category: 'dedication',
    },

    // Curator trophies
    {
      id: 'taste_maker', name: 'Taste Maker', description: 'Rate 20+ games',
      icon: '🍷', tier: ratedGames.length >= 50 ? 'gold' : ratedGames.length >= 30 ? 'silver' : 'bronze',
      earned: ratedGames.length >= 20, progress: Math.min(100, (ratedGames.length / 20) * 100),
      category: 'curator',
    },
    {
      id: 'diamond_finder', name: 'Diamond Finder', description: 'Rate 5 games 9+/10',
      icon: '💎', tier: perfectGames.length >= 10 ? 'gold' : perfectGames.length >= 7 ? 'silver' : 'bronze',
      earned: perfectGames.length >= 5, progress: Math.min(100, (perfectGames.length / 5) * 100),
      category: 'curator',
    },
  ];

  return trophies.sort((a, b) => {
    if (a.earned && !b.earned) return -1;
    if (!a.earned && b.earned) return 1;
    return b.progress - a.progress;
  });
}

/**
 * Game of the Month/Year Awards
 * Auto-generated awards with user ability to override winner
 */
export interface AwardCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  autoWinner: { game: Game; stat: string } | null;
  nominees: Array<{ game: Game; stat: string }>;
}

export function getMonthlyAwards(games: Game[], year: number, month: number): AwardCategory[] {
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0);

  // Find games played this month
  const monthGames = games.filter(g => {
    return g.playLogs?.some(log => {
      const d = parseLocalDate(log.date);
      return d >= startDate && d <= endDate;
    });
  });

  if (monthGames.length === 0) return [];

  // Calculate month-specific hours
  const withMonthHours = monthGames.map(g => {
    const monthHours = g.playLogs!
      .filter(log => { const d = parseLocalDate(log.date); return d >= startDate && d <= endDate; })
      .reduce((s, l) => s + l.hours, 0);
    const monthSessions = g.playLogs!
      .filter(log => { const d = parseLocalDate(log.date); return d >= startDate && d <= endDate; }).length;
    return { game: g, monthHours, monthSessions };
  }).sort((a, b) => b.monthHours - a.monthHours);

  const categories: AwardCategory[] = [];

  // Most Played
  if (withMonthHours.length > 0) {
    categories.push({
      id: 'most_played',
      name: 'Most Played',
      description: 'Game you spent the most time on',
      icon: '🎮',
      autoWinner: { game: withMonthHours[0].game, stat: `${withMonthHours[0].monthHours.toFixed(1)}h` },
      nominees: withMonthHours.slice(0, 5).map(g => ({ game: g.game, stat: `${g.monthHours.toFixed(1)}h` })),
    });
  }

  // Best Value (lowest cost/hr among month's games)
  const valueRanked = withMonthHours
    .filter(g => g.game.price > 0 && getTotalHours(g.game) > 0)
    .map(g => ({ ...g, costPerHour: g.game.price / getTotalHours(g.game) }))
    .sort((a, b) => a.costPerHour - b.costPerHour);

  if (valueRanked.length > 0) {
    categories.push({
      id: 'best_value',
      name: 'Best Value',
      description: 'Best bang for your buck',
      icon: '💎',
      autoWinner: { game: valueRanked[0].game, stat: `$${valueRanked[0].costPerHour.toFixed(2)}/hr` },
      nominees: valueRanked.slice(0, 5).map(g => ({ game: g.game, stat: `$${g.costPerHour.toFixed(2)}/hr` })),
    });
  }

  // Highest Rated (rated this month or recently rated)
  const ratedGames = monthGames.filter(g => g.rating > 0).sort((a, b) => b.rating - a.rating);
  if (ratedGames.length > 0) {
    categories.push({
      id: 'highest_rated',
      name: 'Highest Rated',
      description: 'Your favorite this month',
      icon: '⭐',
      autoWinner: { game: ratedGames[0], stat: `${ratedGames[0].rating}/10` },
      nominees: ratedGames.slice(0, 5).map(g => ({ game: g, stat: `${g.rating}/10` })),
    });
  }

  // Biggest Surprise (high hours despite low expectations — not highest rated but most played)
  const surprises = withMonthHours
    .filter(g => g.monthHours >= 2)
    .sort((a, b) => {
      // Surprise = lots of hours relative to rating
      const aScore = a.monthHours / (a.game.rating || 5);
      const bScore = b.monthHours / (b.game.rating || 5);
      return bScore - aScore;
    });

  if (surprises.length > 0) {
    categories.push({
      id: 'biggest_surprise',
      name: 'Biggest Surprise',
      description: 'Unexpectedly consumed your time',
      icon: '🎉',
      autoWinner: { game: surprises[0].game, stat: `${surprises[0].monthHours.toFixed(1)}h played` },
      nominees: surprises.slice(0, 3).map(g => ({ game: g.game, stat: `${g.monthHours.toFixed(1)}h` })),
    });
  }

  // Fastest Completion (completed this month)
  const completedThisMonth = games.filter(g =>
    g.status === 'Completed' && g.endDate && g.startDate &&
    parseLocalDate(g.endDate) >= startDate && parseLocalDate(g.endDate) <= endDate
  ).map(g => ({
    game: g,
    days: calculateDaysToComplete(g.startDate!, g.endDate!) ?? 0,
  })).filter(g => g.days > 0).sort((a, b) => a.days - b.days);

  if (completedThisMonth.length > 0) {
    categories.push({
      id: 'fastest_completion',
      name: 'Fastest Completion',
      description: 'Speedrun champion',
      icon: '⚡',
      autoWinner: { game: completedThisMonth[0].game, stat: `${completedThisMonth[0].days} days` },
      nominees: completedThisMonth.slice(0, 3).map(g => ({ game: g.game, stat: `${g.days} days` })),
    });
  }

  return categories;
}

// ========================================================================
// ENHANCEMENT PHASE 4: Structural Features
// ========================================================================

/**
 * What-If Simulator
 * "What if I played X more hours?" or "What if I hadn't bought these games?"
 */
export interface WhatIfResult {
  scenario: string;
  before: { value: number; label: string };
  after: { value: number; label: string };
  difference: { value: number; label: string; positive: boolean };
}

export function whatIfMoreHours(game: Game, additionalHours: number): WhatIfResult {
  const currentHours = getTotalHours(game);
  const newHours = currentHours + additionalHours;
  const currentCPH = currentHours > 0 ? game.price / currentHours : game.price;
  const newCPH = newHours > 0 ? game.price / newHours : 0;

  return {
    scenario: `Play ${game.name} for ${additionalHours} more hours`,
    before: { value: currentCPH, label: `$${currentCPH.toFixed(2)}/hr` },
    after: { value: newCPH, label: `$${newCPH.toFixed(2)}/hr` },
    difference: { value: currentCPH - newCPH, label: `-$${(currentCPH - newCPH).toFixed(2)}/hr`, positive: true },
  };
}

export function whatIfNeverBought(games: Game[], removedGameIds: string[]): WhatIfResult {
  const allOwned = games.filter(g => g.status !== 'Wishlist');
  const remaining = allOwned.filter(g => !removedGameIds.includes(g.id));
  const removed = allOwned.filter(g => removedGameIds.includes(g.id));

  const beforeSpent = allOwned.reduce((s, g) => s + g.price, 0);
  const afterSpent = remaining.reduce((s, g) => s + g.price, 0);
  const saved = removed.reduce((s, g) => s + g.price, 0);

  return {
    scenario: `Never bought ${removed.length} game${removed.length !== 1 ? 's' : ''}`,
    before: { value: beforeSpent, label: `$${beforeSpent.toFixed(0)} total` },
    after: { value: afterSpent, label: `$${afterSpent.toFixed(0)} total` },
    difference: { value: saved, label: `$${saved.toFixed(0)} saved`, positive: true },
  };
}

export function whatIfCompletedBacklog(games: Game[]): WhatIfResult {
  const owned = games.filter(g => g.status !== 'Wishlist');
  const totalSpent = owned.reduce((s, g) => s + g.price, 0);
  const totalHours = owned.reduce((s, g) => s + getTotalHours(g), 0);
  const currentCPH = totalHours > 0 ? totalSpent / totalHours : 0;

  // Estimate: assume backlog games average 20h each
  const backlog = owned.filter(g => g.status === 'Not Started' || (g.status === 'In Progress' && getTotalHours(g) < 10));
  const estimatedAdditionalHours = backlog.reduce((s, g) => s + Math.max(20 - getTotalHours(g), 0), 0);
  const newTotalHours = totalHours + estimatedAdditionalHours;
  const newCPH = newTotalHours > 0 ? totalSpent / newTotalHours : 0;

  return {
    scenario: `Complete your entire backlog (${backlog.length} games)`,
    before: { value: currentCPH, label: `$${currentCPH.toFixed(2)}/hr` },
    after: { value: newCPH, label: `$${newCPH.toFixed(2)}/hr` },
    difference: {
      value: currentCPH - newCPH,
      label: `-$${(currentCPH - newCPH).toFixed(2)}/hr (${estimatedAdditionalHours}h more)`,
      positive: true,
    },
  };
}

/**
 * Value Over Time Chart
 * For a specific game, show how cost-per-hour drops with each play session
 */
export interface ValueOverTimePoint {
  date: string;
  cumulativeHours: number;
  costPerHour: number;
  sessionHours: number;
}

export function getValueOverTime(game: Game): ValueOverTimePoint[] {
  if (!game.playLogs || game.playLogs.length === 0 || game.price <= 0) return [];

  const sortedLogs = [...game.playLogs].sort((a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime());
  let cumHours = game.hours; // Start with baseline
  const points: ValueOverTimePoint[] = [];

  if (cumHours > 0) {
    points.push({
      date: sortedLogs[0]?.date || game.createdAt,
      cumulativeHours: cumHours,
      costPerHour: game.price / cumHours,
      sessionHours: 0,
    });
  }

  sortedLogs.forEach(log => {
    cumHours += log.hours;
    points.push({
      date: log.date,
      cumulativeHours: Math.round(cumHours * 10) / 10,
      costPerHour: Math.round((game.price / cumHours) * 100) / 100,
      sessionHours: log.hours,
    });
  });

  return points;
}

/**
 * Personality Evolution Timeline
 * Track how gaming personality changes over time
 */
export interface PersonalitySnapshot {
  period: string;
  periodLabel: string;
  personality: string;
  score: number;
}

export function getPersonalityEvolution(games: Game[]): PersonalitySnapshot[] {
  const allLogs = getAllPlayLogs(games);
  if (allLogs.length < 5) return [];

  // Group play activity by quarter
  const quarterMap: Record<string, Game[]> = {};

  games.forEach(game => {
    game.playLogs?.forEach(log => {
      const date = parseLocalDate(log.date);
      const quarter = `${date.getFullYear()}-Q${Math.floor(date.getMonth() / 3) + 1}`;
      if (!quarterMap[quarter]) quarterMap[quarter] = [];
      // Add game reference if not already there
      if (!quarterMap[quarter].find(g => g.id === game.id)) {
        quarterMap[quarter].push(game);
      }
    });

    // Also consider purchases
    if (game.datePurchased && game.status !== 'Wishlist') {
      const date = parseLocalDate(game.datePurchased);
      const quarter = `${date.getFullYear()}-Q${Math.floor(date.getMonth() / 3) + 1}`;
      if (!quarterMap[quarter]) quarterMap[quarter] = [];
      if (!quarterMap[quarter].find(g => g.id === game.id)) {
        quarterMap[quarter].push(game);
      }
    }
  });

  const quarters = Object.keys(quarterMap).sort();
  if (quarters.length < 2) return [];

  return quarters.map(quarter => {
    const qGames = quarterMap[quarter];
    const personality = getGamingPersonality(qGames);
    const [year, q] = quarter.split('-');
    return {
      period: quarter,
      periodLabel: `${q} ${year}`,
      personality: personality.type,
      score: personality.score,
    };
  });
}

/**
 * Franchise Deep Dive
 * Comprehensive analytics for game franchises
 */
export interface FranchiseData {
  franchise: string;
  games: Array<{ name: string; hours: number; rating: number; price: number; costPerHour: number; status: string }>;
  totalHours: number;
  totalSpent: number;
  avgRating: number;
  ratingTrend: 'improving' | 'declining' | 'stable' | 'single';
  avgCostPerHour: number;
  gamesCount: number;
  completionRate: number;
}

export function getFranchiseAnalytics(games: Game[]): FranchiseData[] {
  const owned = games.filter(g => g.status !== 'Wishlist' && g.franchise);
  const franchiseMap: Record<string, Game[]> = {};

  owned.forEach(g => {
    const f = g.franchise!;
    if (!franchiseMap[f]) franchiseMap[f] = [];
    franchiseMap[f].push(g);
  });

  return Object.entries(franchiseMap)
    .filter(([, fGames]) => fGames.length >= 2)
    .map(([franchise, fGames]) => {
      const totalHours = fGames.reduce((s, g) => s + getTotalHours(g), 0);
      const totalSpent = fGames.reduce((s, g) => s + g.price, 0);
      const ratedGames = fGames.filter(g => g.rating > 0);
      const avgRating = ratedGames.length > 0
        ? ratedGames.reduce((s, g) => s + g.rating, 0) / ratedGames.length : 0;

      const withHours = fGames.filter(g => getTotalHours(g) > 0 && g.price > 0);
      const avgCostPerHour = withHours.length > 0
        ? withHours.reduce((s, g) => s + (g.price / getTotalHours(g)), 0) / withHours.length : 0;

      const completed = fGames.filter(g => g.status === 'Completed').length;
      const completionRate = fGames.length > 0 ? (completed / fGames.length) * 100 : 0;

      // Rating trend
      let ratingTrend: FranchiseData['ratingTrend'] = 'single';
      if (ratedGames.length >= 2) {
        const sorted = [...ratedGames].sort((a, b) =>
          new Date(a.datePurchased || a.createdAt).getTime() - new Date(b.datePurchased || b.createdAt).getTime()
        );
        const firstHalf = sorted.slice(0, Math.ceil(sorted.length / 2));
        const secondHalf = sorted.slice(Math.ceil(sorted.length / 2));
        const firstAvg = firstHalf.reduce((s, g) => s + g.rating, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((s, g) => s + g.rating, 0) / secondHalf.length;

        if (secondAvg - firstAvg > 0.5) ratingTrend = 'improving';
        else if (firstAvg - secondAvg > 0.5) ratingTrend = 'declining';
        else ratingTrend = 'stable';
      }

      return {
        franchise,
        games: fGames.map(g => ({
          name: g.name,
          hours: getTotalHours(g),
          rating: g.rating,
          price: g.price,
          costPerHour: getTotalHours(g) > 0 ? Math.round((g.price / getTotalHours(g)) * 100) / 100 : 0,
          status: g.status,
        })).sort((a, b) => b.hours - a.hours),
        totalHours: Math.round(totalHours * 10) / 10,
        totalSpent: Math.round(totalSpent),
        avgRating: Math.round(avgRating * 10) / 10,
        ratingTrend,
        avgCostPerHour: Math.round(avgCostPerHour * 100) / 100,
        gamesCount: fGames.length,
        completionRate: Math.round(completionRate),
      };
    })
    .sort((a, b) => b.totalHours - a.totalHours);
}

/**
 * Play Next Recommender
 * Smart recommendation from backlog based on preferences and context
 */
export interface Recommendation {
  game: Game;
  score: number;
  reasons: string[];
}

export function getPlayNextRecommendations(games: Game[], maxResults: number = 5): Recommendation[] {
  const candidates = games.filter(g =>
    g.status === 'Not Started' || g.status === 'In Progress'
  );

  if (candidates.length === 0) return [];

  const completed = games.filter(g => g.status === 'Completed');
  const recentlyPlayed = games.filter(g => {
    if (!g.playLogs || g.playLogs.length === 0) return false;
    const lastPlayed = parseLocalDate(g.playLogs[0].date);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return lastPlayed >= weekAgo;
  });

  // Calculate genre preference from ratings
  const genreScores: Record<string, { totalRating: number; count: number }> = {};
  completed.filter(g => g.genre && g.rating > 0).forEach(g => {
    if (!genreScores[g.genre!]) genreScores[g.genre!] = { totalRating: 0, count: 0 };
    genreScores[g.genre!].totalRating += g.rating;
    genreScores[g.genre!].count++;
  });

  // Recent genres to avoid fatigue
  const recentGenres = new Set(recentlyPlayed.filter(g => g.genre).map(g => g.genre!));

  return candidates.map(game => {
    let score = 50;
    const reasons: string[] = [];

    // Genre match bonus
    if (game.genre && genreScores[game.genre]) {
      const genreAvgRating = genreScores[game.genre].totalRating / genreScores[game.genre].count;
      if (genreAvgRating >= 7) {
        score += 15;
        reasons.push(`You love ${game.genre} games (avg ${genreAvgRating.toFixed(1)}/10)`);
      }
    }

    // Genre variety bonus (avoid fatigue)
    if (game.genre && !recentGenres.has(game.genre)) {
      score += 10;
      reasons.push('Fresh genre change from recent plays');
    } else if (game.genre && recentGenres.has(game.genre)) {
      score -= 5;
    }

    // Queue position boost
    if (game.queuePosition && game.queuePosition <= 5) {
      score += 20;
      reasons.push(`#${game.queuePosition} in your queue`);
    }

    // In Progress games get a boost (finish what you started)
    if (game.status === 'In Progress') {
      score += 10;
      reasons.push('Already in progress — keep the momentum');

      // Extra boost if recently played
      if (game.playLogs && game.playLogs.length > 0) {
        const lastPlayed = parseLocalDate(game.playLogs[0].date);
        const daysAgo = Math.floor((Date.now() - lastPlayed.getTime()) / (24 * 60 * 60 * 1000));
        if (daysAgo <= 7) {
          score += 10;
          reasons.push('Played recently — ride the wave');
        }
      }
    }

    // Completion probability factor
    const prob = getCompletionProbability(game, games);
    if (prob.probability >= 70) {
      score += 10;
      reasons.push(`${prob.probability}% completion chance`);
    }

    // Rating factor (already-rated games with high scores)
    if (game.rating >= 8) {
      score += 10;
      reasons.push(`Rated ${game.rating}/10 — you love this one`);
    }

    // Shelf time penalty (very old unplayed games get slight boost to clear backlog)
    if (game.status === 'Not Started' && game.datePurchased) {
      const monthsOwned = (Date.now() - parseLocalDate(game.datePurchased).getTime()) / (30 * 24 * 60 * 60 * 1000);
      if (monthsOwned > 6) {
        score += 5;
        reasons.push(`Been on shelf ${Math.round(monthsOwned)} months`);
      }
    }

    return { game, score: Math.min(100, Math.max(0, score)), reasons };
  })
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);
}

// ========================================================================
// UP NEXT QUEUE: Calculations for chirps, shelf life, rivalry, projections
// ========================================================================

/**
 * Shelf Life - How long a game has been sitting in the queue / backlog
 */
export type ShelfLifeLevel = 'fresh' | 'settling' | 'dusty' | 'cobwebs' | 'fossilized';

export interface ShelfLifeData {
  level: ShelfLifeLevel;
  daysInQueue: number;
  daysSincePurchase: number;
  label: string;
  color: string;
}

export function getShelfLife(game: Game): ShelfLifeData {
  const now = Date.now();
  const daysSincePurchase = game.datePurchased
    ? Math.floor((now - parseLocalDate(game.datePurchased).getTime()) / (24 * 60 * 60 * 1000))
    : 0;

  // For "In Progress" games, measure days since last play session
  let daysInQueue = daysSincePurchase;
  if (game.playLogs && game.playLogs.length > 0) {
    const sorted = [...game.playLogs].sort((a, b) => parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime());
    const daysSinceLastPlay = Math.floor((now - parseLocalDate(sorted[0].date).getTime()) / (24 * 60 * 60 * 1000));
    // For in-progress games, "freshness" is about recent activity
    if (game.status === 'In Progress') {
      daysInQueue = daysSinceLastPlay;
    }
  }

  // For Not Started games, use days since purchase
  const days = game.status === 'Not Started' ? daysSincePurchase : daysInQueue;

  let level: ShelfLifeLevel;
  let label: string;
  let color: string;

  if (days <= 14) {
    level = 'fresh';
    label = '';
    color = '';
  } else if (days <= 30) {
    level = 'settling';
    label = 'Gathering dust';
    color = '#9ca3af';
  } else if (days <= 90) {
    level = 'dusty';
    label = 'Cobwebs forming';
    color = '#f59e0b';
  } else if (days <= 365) {
    level = 'cobwebs';
    label = 'Filed a missing person report';
    color = '#ef4444';
  } else {
    level = 'fossilized';
    label = 'Certified fossil';
    color = '#dc2626';
  }

  return { level, daysInQueue: days, daysSincePurchase, label, color };
}

/**
 * Smart Chirps - Context-aware messages based on queue data
 */
export interface SmartChirp {
  type: 'now-playing' | 'on-deck' | 'genre-shift' | 'deep-backlog' | 'rivalry' | 'stats' | 'velocity' | 'completed';
  text: string;
  subtext?: string;
  icon?: string;
  color?: string;
}

export function getQueueSmartChirps(queuedGames: Game[], allGames: Game[]): SmartChirp[] {
  const chirps: SmartChirp[] = [];
  if (queuedGames.length === 0) return chirps;

  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun, 6=Sat
  const month = now.getMonth(); // 0=Jan, 11=Dec
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6;

  // Total queue stats
  const totalQueueHours = queuedGames.reduce((sum, g) => {
    // Estimate: Not Started games get ~30h estimate, In Progress keep their hours
    if (g.status === 'Not Started') return sum + 30;
    return sum + getTotalHours(g);
  }, 0);
  const totalQueueCost = queuedGames.reduce((sum, g) => sum + g.price, 0);
  const genres = [...new Set(queuedGames.map(g => g.genre).filter(Boolean))];

  // Queue stats chirp
  chirps.push({
    type: 'stats',
    text: `${queuedGames.length} games queued`,
    subtext: `~${Math.round(totalQueueHours)}h of gaming ahead · $${totalQueueCost} invested`,
    color: '#8b5cf6',
  });

  // Now Playing chirp for #1
  const nowPlaying = queuedGames[0];
  if (nowPlaying && nowPlaying.status === 'In Progress') {
    const totalHours = getTotalHours(nowPlaying);
    const daysSinceStart = nowPlaying.startDate
      ? Math.floor((now.getTime() - parseLocalDate(nowPlaying.startDate).getTime()) / (24 * 60 * 60 * 1000))
      : 0;

    let lastSessionNote = '';
    if (nowPlaying.playLogs && nowPlaying.playLogs.length > 0) {
      const sorted = [...nowPlaying.playLogs].sort((a, b) => parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime());
      const daysSinceLastPlay = Math.floor((now.getTime() - parseLocalDate(sorted[0].date).getTime()) / (24 * 60 * 60 * 1000));
      if (sorted[0].notes) {
        lastSessionNote = `Last session: "${sorted[0].notes}" · ${daysSinceLastPlay === 0 ? 'today' : daysSinceLastPlay === 1 ? 'yesterday' : `${daysSinceLastPlay}d ago`}`;
      } else {
        lastSessionNote = `Last played ${daysSinceLastPlay === 0 ? 'today' : daysSinceLastPlay === 1 ? 'yesterday' : `${daysSinceLastPlay} days ago`}`;
      }
    }

    chirps.push({
      type: 'now-playing',
      text: `${totalHours}h deep · Day ${daysSinceStart}`,
      subtext: lastSessionNote,
      color: '#3b82f6',
    });
  }

  // On Deck chirp between #1 and #2
  if (queuedGames.length >= 2) {
    const current = queuedGames[0];
    const next = queuedGames[1];

    const currentGenre = current.genre || 'Unknown';
    const nextGenre = next.genre || 'Unknown';

    let genreText = '';
    if (currentGenre !== nextGenre) {
      genreText = `${currentGenre} → ${nextGenre} — nice palate cleanser`;
    } else {
      genreText = `Staying in ${currentGenre} mode`;
    }

    chirps.push({
      type: 'on-deck',
      text: `${next.name} is on deck`,
      subtext: genreText,
      color: '#f59e0b',
    });
  }

  // Genre shift detection
  const genreCounts: Record<string, number> = {};
  queuedGames.forEach(g => {
    if (g.genre) genreCounts[g.genre] = (genreCounts[g.genre] || 0) + 1;
  });
  const topGenre = Object.entries(genreCounts).sort((a, b) => b[1] - a[1])[0];
  if (topGenre && topGenre[1] >= 3) {
    chirps.push({
      type: 'genre-shift',
      text: `${topGenre[1]} ${topGenre[0]} games in a row`,
      subtext: `You're in a ${topGenre[0]} tunnel`,
      color: '#a855f7',
    });
  }

  // Velocity / day-of-week chirp
  const velocity = getGamingVelocity(allGames, 7);
  if (isWeekend) {
    if (velocity > 2) {
      chirps.push({
        type: 'velocity',
        text: `It's the weekend and you've been averaging ${velocity.toFixed(1)}h/day`,
        subtext: 'Perfect time for a marathon session',
        color: '#10b981',
      });
    } else {
      chirps.push({
        type: 'velocity',
        text: 'Weekend gaming time',
        subtext: `Your queue has ${queuedGames.length} games waiting`,
        color: '#10b981',
      });
    }
  } else if (velocity === 0) {
    const allLogs = getAllPlayLogs(allGames);
    if (allLogs.length > 0) {
      const lastPlayed = parseLocalDate(allLogs[0].log.date);
      const daysAgo = Math.floor((now.getTime() - lastPlayed.getTime()) / (24 * 60 * 60 * 1000));
      if (daysAgo > 7) {
        chirps.push({
          type: 'velocity',
          text: `${daysAgo} days since your last session`,
          subtext: 'Your queue misses you',
          color: '#6b7280',
        });
      }
    }
  }

  // Seasonal chirp
  if (month === 11 || month === 0 || month === 1) {
    chirps.push({
      type: 'velocity',
      text: 'Winter gaming season',
      subtext: 'Long evenings, perfect for deep queue runs',
      color: '#60a5fa',
    });
  } else if (month >= 5 && month <= 7) {
    chirps.push({
      type: 'velocity',
      text: 'Summer gaming drought?',
      subtext: genres.length > 2 ? `${genres.length} genres to keep you busy indoors` : 'Your queue says otherwise',
      color: '#fbbf24',
    });
  }

  return chirps;
}

/**
 * Rivalry Data - Compare two In Progress games
 */
export interface RivalryData {
  game1: {
    name: string;
    hours: number;
    daysSinceLastPlay: number;
    sessions: number;
    thumbnail?: string;
  };
  game2: {
    name: string;
    hours: number;
    daysSinceLastPlay: number;
    sessions: number;
    thumbnail?: string;
  };
  winnerName: string;
  insight: string;
}

export function getQueueRivalry(queuedGames: Game[]): RivalryData | null {
  const inProgress = queuedGames.filter(g => g.status === 'In Progress');
  if (inProgress.length < 2) return null;

  const now = Date.now();
  const [g1, g2] = inProgress.slice(0, 2);

  const getGameStats = (g: Game) => {
    const sortedLogs = g.playLogs ? [...g.playLogs].sort((a, b) => parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime()) : [];
    const daysSinceLastPlay = sortedLogs.length > 0
      ? Math.floor((now - parseLocalDate(sortedLogs[0].date).getTime()) / (24 * 60 * 60 * 1000))
      : 999;
    return {
      name: g.name,
      hours: getTotalHours(g),
      daysSinceLastPlay,
      sessions: g.playLogs?.length || 0,
      thumbnail: g.thumbnail,
    };
  };

  const stats1 = getGameStats(g1);
  const stats2 = getGameStats(g2);

  // Winner is the one played most recently
  const winnerName = stats1.daysSinceLastPlay <= stats2.daysSinceLastPlay ? stats1.name : stats2.name;
  const loserName = winnerName === stats1.name ? stats2.name : stats1.name;

  let insight: string;
  const hourDiff = Math.abs(stats1.hours - stats2.hours);
  if (hourDiff > 20) {
    const more = stats1.hours > stats2.hours ? stats1.name : stats2.name;
    insight = `${more} has ${hourDiff.toFixed(0)}h more attention`;
  } else if (stats1.daysSinceLastPlay > 7 || stats2.daysSinceLastPlay > 7) {
    insight = `${loserName} is losing your attention`;
  } else {
    insight = `Neck and neck — both getting love`;
  }

  return { game1: stats1, game2: stats2, winnerName, insight };
}

/**
 * "If You Play 1 Hour Today" - Micro-projection
 */
export interface OneHourProjection {
  gameName: string;
  currentHours: number;
  newHours: number;
  currentCostPerHour: number;
  newCostPerHour: number;
  costImprovement: number;
  newValueRating: 'Excellent' | 'Good' | 'Fair' | 'Poor';
}

export function getOneHourProjection(game: Game): OneHourProjection | null {
  const currentHours = getTotalHours(game);
  if (game.price === 0) return null; // Free games don't need this

  const newHours = currentHours + 1;
  const currentCostPerHour = currentHours > 0 ? game.price / currentHours : game.price;
  const newCostPerHour = game.price / newHours;
  const costImprovement = currentCostPerHour - newCostPerHour;

  return {
    gameName: game.name,
    currentHours,
    newHours,
    currentCostPerHour,
    newCostPerHour,
    costImprovement,
    newValueRating: getValueRating(newCostPerHour),
  };
}

/**
 * Estimated hours to reach a game in the queue
 * Sum up estimated remaining hours for all games above it
 */
export function getEstimatedHoursToReach(queuedGames: Game[], index: number): number {
  let hours = 0;
  for (let i = 0; i < index; i++) {
    const g = queuedGames[i];
    const played = getTotalHours(g);
    if (g.status === 'Completed' || g.status === 'Abandoned') continue;
    // Estimate total game time: if in progress, assume 30h avg total for the game
    const estimatedTotal = played > 0 ? Math.max(played * 1.5, 25) : 30;
    const remaining = Math.max(estimatedTotal - played, 0);
    hours += remaining;
  }
  return Math.round(hours);
}

/**
 * Queue context for AI service
 */
export interface QueueAIContext {
  queuedGames: Array<{
    name: string;
    genre: string;
    platform: string;
    status: string;
    hours: number;
    price: number;
    daysSincePurchase: number;
    daysSinceLastPlay: number;
    sessions: number;
    rating: number;
    lastSessionNote: string;
    queuePosition: number;
  }>;
  totalQueueHours: number;
  totalQueueCost: number;
  genres: string[];
  activityLevel: string;
  streak: number;
  velocity: number;
  personalityType: string;
  completionRate: number;
  dayOfWeek: string;
}

export function buildQueueAIContext(queuedGames: Game[], allGames: Game[]): QueueAIContext {
  const now = new Date();
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const owned = allGames.filter(g => g.status !== 'Wishlist');
  const completed = owned.filter(g => g.status === 'Completed');

  const personality = getGamingPersonality(allGames);
  const pulse = getActivityPulse(allGames);
  const streak = getCurrentGamingStreak(allGames);
  const velocity = getGamingVelocity(allGames, 7);

  return {
    queuedGames: queuedGames.map((g, i) => {
      const sortedLogs = g.playLogs ? [...g.playLogs].sort((a, b) => parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime()) : [];
      return {
        name: g.name,
        genre: g.genre || 'Unknown',
        platform: g.platform || 'Unknown',
        status: g.status,
        hours: getTotalHours(g),
        price: g.price,
        daysSincePurchase: g.datePurchased ? Math.floor((now.getTime() - parseLocalDate(g.datePurchased).getTime()) / (24 * 60 * 60 * 1000)) : 0,
        daysSinceLastPlay: sortedLogs.length > 0 ? Math.floor((now.getTime() - parseLocalDate(sortedLogs[0].date).getTime()) / (24 * 60 * 60 * 1000)) : -1,
        sessions: g.playLogs?.length || 0,
        rating: g.rating,
        lastSessionNote: sortedLogs.length > 0 ? (sortedLogs[0].notes || '') : '',
        queuePosition: i + 1,
      };
    }),
    totalQueueHours: queuedGames.reduce((sum, g) => sum + (g.status === 'Not Started' ? 30 : getTotalHours(g)), 0),
    totalQueueCost: queuedGames.reduce((sum, g) => sum + g.price, 0),
    genres: [...new Set(queuedGames.map(g => g.genre).filter(Boolean) as string[])],
    activityLevel: pulse.level,
    streak,
    velocity,
    personalityType: personality.type,
    completionRate: owned.length > 0 ? Math.round((completed.length / owned.length) * 100) : 0,
    dayOfWeek: days[now.getDay()],
  };
}

// ========================================================================
// GAME CARD ENHANCEMENTS: Health dot, smart one-liners, relative time, etc.
// ========================================================================

/**
 * Health Dot - Visual indicator of how "alive" a game is based on recent activity
 */
export type HealthLevel = 'active' | 'healthy' | 'cooling' | 'dormant' | 'cold' | 'none';

export interface GameHealthDot {
  level: HealthLevel;
  color: string;
  label: string;
  daysSinceLastPlay: number;
}

export function getGameHealthDot(game: Game): GameHealthDot {
  if (game.status === 'Wishlist') {
    return { level: 'none', color: '#a855f7', label: 'Wishlist', daysSinceLastPlay: -1 };
  }
  if (game.status === 'Completed') {
    return { level: 'none', color: '#10b981', label: 'Completed', daysSinceLastPlay: -1 };
  }
  if (game.status === 'Abandoned') {
    return { level: 'cold', color: '#ef4444', label: 'Abandoned', daysSinceLastPlay: -1 };
  }

  const logs = game.playLogs || [];
  if (logs.length === 0 && game.status === 'Not Started') {
    return { level: 'dormant', color: '#6b7280', label: 'Untouched', daysSinceLastPlay: -1 };
  }

  if (logs.length === 0) {
    return { level: 'dormant', color: '#6b7280', label: 'No sessions', daysSinceLastPlay: -1 };
  }

  const sorted = [...logs].sort((a, b) => parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime());
  const daysSince = Math.floor((Date.now() - parseLocalDate(sorted[0].date).getTime()) / (24 * 60 * 60 * 1000));

  if (daysSince <= 3) return { level: 'active', color: '#10b981', label: 'Active', daysSinceLastPlay: daysSince };
  if (daysSince <= 7) return { level: 'healthy', color: '#3b82f6', label: 'Healthy', daysSinceLastPlay: daysSince };
  if (daysSince <= 14) return { level: 'cooling', color: '#f59e0b', label: 'Cooling off', daysSinceLastPlay: daysSince };
  if (daysSince <= 30) return { level: 'dormant', color: '#f97316', label: 'Dormant', daysSinceLastPlay: daysSince };
  return { level: 'cold', color: '#ef4444', label: 'Cold', daysSinceLastPlay: daysSince };
}

/**
 * Relative time formatting - "2 days ago", "3 weeks ago", etc.
 */
export function getRelativeTime(dateStr: string): string {
  const date = parseLocalDate(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}

/**
 * Days context - contextual string about how long you've been with a game
 */
export function getDaysContext(game: Game): string {
  const now = Date.now();
  
  if (game.status === 'Wishlist') {
    if (game.createdAt) {
      const days = Math.floor((now - new Date(game.createdAt).getTime()) / (24 * 60 * 60 * 1000));
      if (days === 0) return 'Added today';
      if (days === 1) return 'On wishlist since yesterday';
      return `On wishlist for ${days} days`;
    }
    return 'On wishlist';
  }

  if (game.status === 'Completed') {
    if (game.startDate && game.endDate) {
      const days = Math.floor((parseLocalDate(game.endDate).getTime() - parseLocalDate(game.startDate).getTime()) / (24 * 60 * 60 * 1000));
      if (days === 0) return 'Completed in 1 day';
      return `Completed in ${days} days`;
    }
    return 'Completed';
  }

  if (game.status === 'Abandoned') {
    if (game.startDate && game.endDate) {
      const days = Math.floor((parseLocalDate(game.endDate).getTime() - parseLocalDate(game.startDate).getTime()) / (24 * 60 * 60 * 1000));
      return `Abandoned after ${days} days`;
    }
    return 'Abandoned';
  }

  if (game.status === 'In Progress') {
    if (game.startDate) {
      const days = Math.floor((now - parseLocalDate(game.startDate).getTime()) / (24 * 60 * 60 * 1000));
      if (days === 0) return 'Started today';
      if (days === 1) return 'Playing for 1 day';
      return `Playing for ${days} days`;
    }
    return 'In Progress';
  }

  if (game.status === 'Not Started') {
    if (game.datePurchased) {
      const days = Math.floor((now - parseLocalDate(game.datePurchased).getTime()) / (24 * 60 * 60 * 1000));
      if (days === 0) return 'Bought today';
      if (days === 1) return 'Owned since yesterday, untouched';
      if (days < 30) return `Owned ${days} days, untouched`;
      return `Owned ${days} days, still sealed`;
    }
    return 'Not Started';
  }

  return '';
}

/**
 * Session Momentum - last N sessions' hours for sparkline
 */
export function getSessionMomentum(game: Game, count: number = 5): number[] {
  const logs = game.playLogs || [];
  if (logs.length === 0) return [];
  
  const sorted = [...logs].sort((a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime());
  return sorted.slice(-count).map(l => l.hours);
}

/**
 * Value Trajectory - is the game's value improving, stable, or stagnant?
 */
export type ValueTrajectory = 'improving' | 'stable' | 'stagnant';

export interface ValueTrajectoryData {
  direction: ValueTrajectory;
  icon: string; // arrow character
  color: string;
  label: string;
}

export function getValueTrajectory(game: Game): ValueTrajectoryData {
  const totalHours = getTotalHours(game);
  if (totalHours === 0 || game.price === 0) {
    return { direction: 'stable', icon: '—', color: '#6b7280', label: 'No data' };
  }

  const logs = game.playLogs || [];
  if (logs.length === 0) {
    return { direction: 'stagnant', icon: '→', color: '#f59e0b', label: 'No recent play' };
  }

  const sorted = [...logs].sort((a, b) => parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime());
  const daysSinceLast = Math.floor((Date.now() - parseLocalDate(sorted[0].date).getTime()) / (24 * 60 * 60 * 1000));

  const costPerHour = game.price / totalHours;

  if (daysSinceLast <= 7) {
    return { direction: 'improving', icon: '↑', color: '#10b981', label: 'Value improving' };
  }
  if (costPerHour <= 1) {
    return { direction: 'stable', icon: '→', color: '#3b82f6', label: 'Excellent value locked in' };
  }
  return { direction: 'stagnant', icon: '↓', color: '#f59e0b', label: 'Value stagnant' };
}

/**
 * Smart One-Liner - contextual sentence unique to each game
 */
export function getGameSmartOneLiner(game: Game, allGames: Game[]): string {
  const totalHours = getTotalHours(game);
  const owned = allGames.filter(g => g.status !== 'Wishlist');
  const played = owned.filter(g => getTotalHours(g) > 0);

  // Check for most played game
  if (played.length > 0) {
    const mostPlayed = played.reduce((max, g) => getTotalHours(g) > getTotalHours(max) ? g : max);
    if (mostPlayed.id === game.id && totalHours > 0) {
      return `Your most played game — ${totalHours}h and counting`;
    }
  }

  // Century Club
  if (totalHours >= 100) {
    return `Century Club member — ${totalHours}h invested`;
  }

  // Best value game
  if (played.length > 0 && game.price > 0 && totalHours > 0) {
    const paidPlayed = played.filter(g => g.price > 0);
    if (paidPlayed.length > 0) {
      const bestValue = paidPlayed.reduce((best, g) => {
        const gCph = g.price / getTotalHours(g);
        const bCph = best.price / getTotalHours(best);
        return gCph < bCph ? g : best;
      });
      if (bestValue.id === game.id) {
        return `Your best bang-for-buck — $${(game.price / totalHours).toFixed(2)}/hr`;
      }
    }
  }

  // Highest rated
  if (owned.length > 0) {
    const highestRated = owned.reduce((max, g) => g.rating > max.rating ? g : max);
    if (highestRated.id === game.id && game.rating >= 9) {
      return `Your highest rated — a ${game.rating}/10 masterpiece`;
    }
  }

  // Completed fast
  if (game.status === 'Completed' && game.startDate && game.endDate) {
    const days = Math.floor((parseLocalDate(game.endDate).getTime() - parseLocalDate(game.startDate).getTime()) / (24 * 60 * 60 * 1000));
    if (days <= 3 && totalHours >= 5) {
      return `Speed-ran in ${days} day${days === 1 ? '' : 's'} — couldn't put it down`;
    }
  }

  // Free game with lots of hours
  if (game.acquiredFree && totalHours >= 20) {
    return `Free game, ${totalHours}h of joy — infinite value`;
  }

  // Bargain find
  if (game.price > 0 && game.price <= 10 && totalHours >= 30) {
    return `$${game.price} for ${totalHours}h — absolute steal`;
  }

  // Close to excellent value
  if (game.price > 0 && totalHours > 0) {
    const cph = game.price / totalHours;
    if (cph > 1 && cph <= 3) {
      const hoursNeeded = Math.ceil(game.price / 1) - totalHours;
      if (hoursNeeded > 0 && hoursNeeded <= 15) {
        return `${hoursNeeded} more hours to hit Excellent value`;
      }
    }
  }

  // Same-day impulse buy
  if (game.datePurchased && game.startDate && game.datePurchased === game.startDate && totalHours > 0) {
    return 'Bought and started same day — couldn\'t wait';
  }

  // Long untouched backlog
  if (game.status === 'Not Started' && game.datePurchased) {
    const days = Math.floor((Date.now() - parseLocalDate(game.datePurchased).getTime()) / (24 * 60 * 60 * 1000));
    if (days > 90) {
      return `$${game.price} collecting dust for ${days} days`;
    }
    if (days > 30) {
      return `Sitting in the backlog for ${days} days`;
    }
  }

  // Abandoned with high price
  if (game.status === 'Abandoned' && game.price >= 50) {
    return `$${game.price} and ${totalHours}h before walking away`;
  }

  // Many sessions
  if (game.playLogs && game.playLogs.length >= 10) {
    return `${game.playLogs.length} sessions logged — dedicated player`;
  }

  // Wishlist for a while
  if (game.status === 'Wishlist' && game.createdAt) {
    const days = Math.floor((Date.now() - new Date(game.createdAt).getTime()) / (24 * 60 * 60 * 1000));
    if (days > 60) {
      return `Been eyeing this for ${days} days`;
    }
  }

  // Good discount
  if (game.originalPrice && game.originalPrice > game.price) {
    const discount = Math.round(((game.originalPrice - game.price) / game.originalPrice) * 100);
    if (discount >= 50) {
      return `Snagged at ${discount}% off — smart buy`;
    }
  }

  // Default based on status
  if (game.status === 'In Progress' && totalHours > 0) {
    return `${totalHours}h in — keep going`;
  }
  if (game.status === 'Completed') {
    return `Another one complete — ${totalHours}h well spent`;
  }
  if (game.status === 'Not Started') {
    return 'Waiting patiently in the backlog';
  }

  return '';
}

/**
 * Franchise Info - game's position within its franchise
 */
export interface FranchiseInfo {
  franchiseName: string;
  gamesInFranchise: number;
  position: number; // which one in the franchise by purchase date
  totalFranchiseHours: number;
  totalFranchiseSpent: number;
}

export function getFranchiseInfo(game: Game, allGames: Game[]): FranchiseInfo | null {
  if (!game.franchise) return null;

  const franchiseGames = allGames
    .filter(g => g.franchise === game.franchise)
    .sort((a, b) => {
      const aDate = a.datePurchased || a.createdAt;
      const bDate = b.datePurchased || b.createdAt;
      return parseLocalDate(aDate).getTime() - parseLocalDate(bDate).getTime();
    });

  if (franchiseGames.length < 2) return null;

  const position = franchiseGames.findIndex(g => g.id === game.id) + 1;
  const totalHours = franchiseGames.reduce((sum, g) => sum + getTotalHours(g), 0);
  const totalSpent = franchiseGames.reduce((sum, g) => sum + g.price, 0);

  return {
    franchiseName: game.franchise,
    gamesInFranchise: franchiseGames.length,
    position,
    totalFranchiseHours: totalHours,
    totalFranchiseSpent: totalSpent,
  };
}

/**
 * Progress Ring - percentage of estimated game completion based on genre averages
 */
export function getProgressPercent(game: Game): number {
  const totalHours = getTotalHours(game);
  if (totalHours === 0) return 0;
  if (game.status === 'Completed') return 100;

  // Genre-based average completion times (rough estimates)
  const genreAverages: Record<string, number> = {
    'RPG': 60, 'JRPG': 70, 'Action-Adventure': 30, 'Action': 25,
    'Souls-like': 60, 'Horror': 15, 'Platformer': 15, 'Roguelike': 40,
    'Metroidvania': 20, 'Puzzle': 10, 'Strategy': 40, 'Racing': 20,
    'Sports': 30, 'Simulation': 40, 'Shooter': 15, 'Fighting': 20,
    'Survival': 35, 'Indie': 15,
  };

  const estimatedTotal = genreAverages[game.genre || ''] || 25;
  return Math.min(100, Math.round((totalHours / estimatedTotal) * 100));
}

// ========================================================================
// TIMELINE ENHANCEMENTS: Monthly vibes, milestones, streaks, comparisons
// ========================================================================

/**
 * Monthly Vibe Tag - auto-generated personality tag for each month
 */
export interface MonthlyVibe {
  tag: string;
  emoji: string;
  color: string;
}

export function getMonthlyVibe(
  monthEvents: Array<{ type: string; game: Game; hours?: number }>,
  monthKey: string
): MonthlyVibe {
  const playEvents = monthEvents.filter(e => e.type === 'play');
  const purchaseEvents = monthEvents.filter(e => e.type === 'purchase');
  const completeEvents = monthEvents.filter(e => e.type === 'complete');
  const totalHours = playEvents.reduce((sum, e) => sum + (e.hours || 0), 0);
  const uniqueGames = new Set(playEvents.map(e => e.game.id));
  const genres = [...new Set(monthEvents.map(e => e.game.genre).filter(Boolean))];

  // Check month for seasonal tags
  const month = parseInt(monthKey.split('-')[1]);

  // Completion-heavy month
  if (completeEvents.length >= 3) {
    return { tag: 'The Finisher', emoji: '🏆', color: '#10b981' };
  }
  if (completeEvents.length >= 2) {
    return { tag: 'Completion Streak', emoji: '✅', color: '#10b981' };
  }

  // Shopping-heavy month
  if (purchaseEvents.length >= 4) {
    return { tag: 'Shopping Spree', emoji: '🛒', color: '#f59e0b' };
  }

  // Marathon month
  if (totalHours >= 80) {
    return { tag: 'Marathon Month', emoji: '🔥', color: '#ef4444' };
  }

  // Single-game obsession
  if (uniqueGames.size === 1 && totalHours >= 15) {
    const gameName = playEvents[0]?.game.name || 'Unknown';
    return { tag: `${gameName} Month`, emoji: '🎯', color: '#3b82f6' };
  }

  // Variety month
  if (uniqueGames.size >= 5) {
    return { tag: 'Variety Pack', emoji: '🎲', color: '#a855f7' };
  }

  // Genre-specific month
  if (genres.length === 1 && playEvents.length >= 3) {
    return { tag: `${genres[0]} Season`, emoji: '🎮', color: '#6366f1' };
  }

  // High hours month
  if (totalHours >= 40) {
    return { tag: 'Deep Dive', emoji: '🌊', color: '#3b82f6' };
  }

  // Low activity
  if (totalHours < 5 && monthEvents.length <= 3) {
    return { tag: 'The Dry Spell', emoji: '🏜️', color: '#6b7280' };
  }

  // New starts
  const startEvents = monthEvents.filter(e => e.type === 'start');
  if (startEvents.length >= 3) {
    return { tag: 'New Beginnings', emoji: '🌱', color: '#22c55e' };
  }

  // Seasonal defaults
  if (month === 12) return { tag: 'Holiday Gaming', emoji: '🎄', color: '#ef4444' };
  if (month >= 6 && month <= 8) return { tag: 'Summer Sessions', emoji: '☀️', color: '#f59e0b' };

  // Default
  return { tag: 'Steady Progress', emoji: '📈', color: '#8b5cf6' };
}

/**
 * Timeline Milestones - special events to inject into timeline
 */
export interface TimelineMilestone {
  id: string;
  date: string;
  type: 'milestone';
  title: string;
  description: string;
  icon: string;
  color: string;
}

export function getTimelineMilestones(games: Game[]): TimelineMilestone[] {
  const milestones: TimelineMilestone[] = [];
  const allLogs = getAllPlayLogs(games);

  // Track cumulative hours over time
  let cumulativeHours = 0;
  const hourMilestones = [50, 100, 200, 500, 1000];
  const hitHourMilestones = new Set<number>();
  const logsByDate = [...allLogs].sort((a, b) => parseLocalDate(a.log.date).getTime() - parseLocalDate(b.log.date).getTime());

  for (const { log } of logsByDate) {
    cumulativeHours += log.hours;
    for (const milestone of hourMilestones) {
      if (cumulativeHours >= milestone && !hitHourMilestones.has(milestone)) {
        hitHourMilestones.add(milestone);
        milestones.push({
          id: `milestone-hours-${milestone}`,
          date: log.date,
          type: 'milestone',
          title: `${milestone} Hours Played!`,
          description: `You've now played ${milestone} total hours across all games`,
          icon: '⏱️',
          color: '#f59e0b',
        });
      }
    }
  }

  // Track game completions
  const completedGames = games
    .filter(g => g.status === 'Completed' && g.endDate)
    .sort((a, b) => parseLocalDate(a.endDate!).getTime() - parseLocalDate(b.endDate!).getTime());

  const completionMilestones = [1, 5, 10, 25, 50];
  completedGames.forEach((game, idx) => {
    const count = idx + 1;
    if (completionMilestones.includes(count)) {
      milestones.push({
        id: `milestone-completed-${count}`,
        date: game.endDate!,
        type: 'milestone',
        title: count === 1 ? 'First Game Completed!' : `${count} Games Completed!`,
        description: `${game.name} was your ${count}${count === 1 ? 'st' : count === 2 ? 'nd' : count === 3 ? 'rd' : 'th'} completion`,
        icon: '🏆',
        color: '#10b981',
      });
    }
  });

  // Per-game hour milestones (50h, 100h on a single game)
  games.forEach(game => {
    const totalH = getTotalHours(game);
    if (totalH >= 100 && game.playLogs && game.playLogs.length > 0) {
      // Find the log where they crossed 100h
      const sorted = [...game.playLogs].sort((a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime());
      let accum = game.hours; // baseline
      for (const log of sorted) {
        accum += log.hours;
        if (accum >= 100) {
          milestones.push({
            id: `milestone-century-${game.id}`,
            date: log.date,
            type: 'milestone',
            title: `Century Club: ${game.name}`,
            description: `100+ hours on a single game. That's dedication.`,
            icon: '💯',
            color: '#8b5cf6',
          });
          break;
        }
      }
    }
  });

  // First 10/10 rating
  const perfectGames = games
    .filter(g => g.rating === 10 && g.status !== 'Wishlist')
    .sort((a, b) => {
      const aDate = a.datePurchased || a.createdAt;
      const bDate = b.datePurchased || b.createdAt;
      return parseLocalDate(aDate).getTime() - parseLocalDate(bDate).getTime();
    });
  if (perfectGames.length > 0) {
    const first = perfectGames[0];
    milestones.push({
      id: 'milestone-first-perfect',
      date: first.datePurchased || first.createdAt,
      type: 'milestone',
      title: 'First Perfect 10!',
      description: `${first.name} earned your first 10/10 rating`,
      icon: '⭐',
      color: '#f59e0b',
    });
  }

  // Best value breakthrough (first game under $1/hr)
  const excellentValues = games
    .filter(g => {
      const h = getTotalHours(g);
      return g.price > 0 && h > 0 && (g.price / h) <= 1;
    })
    .sort((a, b) => {
      const aDate = a.startDate || a.datePurchased || a.createdAt;
      const bDate = b.startDate || b.datePurchased || b.createdAt;
      return parseLocalDate(aDate).getTime() - parseLocalDate(bDate).getTime();
    });
  if (excellentValues.length > 0) {
    const first = excellentValues[0];
    const date = first.endDate || first.startDate || first.datePurchased || first.createdAt;
    milestones.push({
      id: 'milestone-first-excellent-value',
      date,
      type: 'milestone',
      title: 'Excellent Value Unlocked!',
      description: `${first.name} broke the $1/hr barrier`,
      icon: '💎',
      color: '#10b981',
    });
  }

  return milestones.sort((a, b) => parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime());
}

/**
 * Monthly Comparison - delta stats vs previous month
 */
export interface MonthlyComparison {
  hoursDelta: number;
  sessionsDelta: number;
  gamesDelta: number;
  purchasesDelta: number;
  completionsDelta: number;
  hoursDirection: 'up' | 'down' | 'same';
}

export function getMonthlyComparison(
  currentMonthEvents: Array<{ type: string; hours?: number; game: Game }>,
  previousMonthEvents: Array<{ type: string; hours?: number; game: Game }>
): MonthlyComparison {
  const getStats = (events: Array<{ type: string; hours?: number; game: Game }>) => {
    const plays = events.filter(e => e.type === 'play');
    return {
      hours: plays.reduce((s, e) => s + (e.hours || 0), 0),
      sessions: plays.length,
      games: new Set(plays.map(e => e.game.id)).size,
      purchases: events.filter(e => e.type === 'purchase').length,
      completions: events.filter(e => e.type === 'complete').length,
    };
  };

  const current = getStats(currentMonthEvents);
  const previous = getStats(previousMonthEvents);

  const hoursDelta = current.hours - previous.hours;

  return {
    hoursDelta: Math.round(hoursDelta * 10) / 10,
    sessionsDelta: current.sessions - previous.sessions,
    gamesDelta: current.games - previous.games,
    purchasesDelta: current.purchases - previous.purchases,
    completionsDelta: current.completions - previous.completions,
    hoursDirection: hoursDelta > 1 ? 'up' : hoursDelta < -1 ? 'down' : 'same',
  };
}

/**
 * Streak Segments - find consecutive day play streaks in a month's events
 */
export interface StreakSegment {
  startDate: string;
  endDate: string;
  days: number;
  totalHours: number;
}

export function getStreakSegments(playEvents: Array<{ date: string; hours?: number }>): StreakSegment[] {
  if (playEvents.length === 0) return [];

  const uniqueDays = [...new Set(playEvents.map(e => e.date))].sort();
  if (uniqueDays.length < 2) return [];

  const segments: StreakSegment[] = [];
  let streakStart = uniqueDays[0];
  let prevDate = parseLocalDate(uniqueDays[0]);

  for (let i = 1; i < uniqueDays.length; i++) {
    const currDate = parseLocalDate(uniqueDays[i]);
    const diffDays = Math.round((currDate.getTime() - prevDate.getTime()) / (24 * 60 * 60 * 1000));

    if (diffDays > 1) {
      // Streak broken - save if it was 3+ days
      const streakDays = Math.round((prevDate.getTime() - parseLocalDate(streakStart).getTime()) / (24 * 60 * 60 * 1000)) + 1;
      if (streakDays >= 3) {
        const streakHours = playEvents
          .filter(e => e.date >= streakStart && e.date <= uniqueDays[i - 1])
          .reduce((s, e) => s + (e.hours || 0), 0);
        segments.push({
          startDate: streakStart,
          endDate: uniqueDays[i - 1],
          days: streakDays,
          totalHours: streakHours,
        });
      }
      streakStart = uniqueDays[i];
    }
    prevDate = currDate;
  }

  // Check last streak
  const lastStreakDays = Math.round((prevDate.getTime() - parseLocalDate(streakStart).getTime()) / (24 * 60 * 60 * 1000)) + 1;
  if (lastStreakDays >= 3) {
    const streakHours = playEvents
      .filter(e => e.date >= streakStart && e.date <= uniqueDays[uniqueDays.length - 1])
      .reduce((s, e) => s + (e.hours || 0), 0);
    segments.push({
      startDate: streakStart,
      endDate: uniqueDays[uniqueDays.length - 1],
      days: lastStreakDays,
      totalHours: streakHours,
    });
  }

  return segments;
}

/**
 * Game Journey Arc - the full lifecycle of a game for timeline display
 */
export interface GameJourneyArc {
  game: Game;
  events: Array<{
    type: 'purchase' | 'start' | 'play' | 'complete' | 'abandon';
    date: string;
    label: string;
    hours?: number;
  }>;
  totalDays: number;
  totalHours: number;
}

export function getGameJourneyArc(game: Game): GameJourneyArc | null {
  // Only show arcs for games with at least purchase + start/complete
  if (!game.datePurchased && !game.startDate) return null;
  if (game.status === 'Wishlist' || game.status === 'Not Started') return null;

  const events: GameJourneyArc['events'] = [];

  if (game.datePurchased) {
    events.push({ type: 'purchase', date: game.datePurchased, label: `Purchased for $${game.price}` });
  }
  if (game.startDate) {
    events.push({ type: 'start', date: game.startDate, label: 'Started playing' });
  }
  if (game.endDate) {
    events.push({
      type: game.status === 'Abandoned' ? 'abandon' : 'complete',
      date: game.endDate,
      label: game.status === 'Abandoned' ? 'Abandoned' : 'Completed',
    });
  }

  if (events.length < 2) return null;

  const firstDate = parseLocalDate(events[0].date);
  const lastDate = parseLocalDate(events[events.length - 1].date);
  const totalDays = Math.floor((lastDate.getTime() - firstDate.getTime()) / (24 * 60 * 60 * 1000));

  return {
    game,
    events,
    totalDays,
    totalHours: getTotalHours(game),
  };
}

/**
 * Cumulative hours for a game at a specific event date
 */
export function getCumulativeHoursAtDate(game: Game, eventDate: string): number {
  let hours = game.hours; // baseline
  if (!game.playLogs) return hours;

  const sorted = [...game.playLogs].sort((a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime());
  for (const log of sorted) {
    if (parseLocalDate(log.date) <= parseLocalDate(eventDate)) {
      hours += log.hours;
    }
  }
  return hours;
}

// ============================================================
// STORY MODE NEW SCREEN CALCULATIONS
// ============================================================

/**
 * Week Awards - Auto-generated award winners for the week
 */
export interface WeekAward {
  title: string;
  winner: string;
  stat: string;
  thumbnail?: string;
}

export function getWeekAwards(data: WeekInReviewData): WeekAward[] {
  const awards: WeekAward[] = [];

  if (data.gamesPlayed.length === 0) return awards;

  // MVP - Most hours played
  const mvp = data.gamesPlayed[0]; // Already sorted by hours
  awards.push({
    title: 'MVP',
    winner: mvp.game.name,
    stat: `${mvp.hours.toFixed(1)}h played`,
    thumbnail: mvp.game.thumbnail,
  });

  // Best Value - Lowest cost-per-hour among paid games played
  const paidGames = data.gamesPlayed.filter(g => g.game.price > 0);
  if (paidGames.length > 0) {
    const bestValue = paidGames.reduce((best, g) => {
      const cph = g.game.price / g.hours;
      const bestCph = best.game.price / best.hours;
      return cph < bestCph ? g : best;
    }, paidGames[0]);
    awards.push({
      title: 'Best Value',
      winner: bestValue.game.name,
      stat: `$${(bestValue.game.price / bestValue.hours).toFixed(2)}/hr`,
      thumbnail: bestValue.game.thumbnail,
    });
  }

  // Most Improved - Game whose $/hr improved the most (played a lot relative to price)
  if (paidGames.length > 0) {
    const mostImproved = paidGames.reduce((best, g) => {
      return g.hours > best.hours ? g : best;
    }, paidGames[0]);
    if (mostImproved.game.id !== mvp.game.id) {
      awards.push({
        title: 'Most Improved',
        winner: mostImproved.game.name,
        stat: `+${mostImproved.hours.toFixed(1)}h this week`,
        thumbnail: mostImproved.game.thumbnail,
      });
    }
  }

  // Biggest Surprise - Game with fewest total hours but significant playtime this week
  if (data.gamesPlayed.length >= 2) {
    const surprises = data.gamesPlayed
      .filter(g => g.game.id !== mvp.game.id)
      .sort((a, b) => {
        const aRatio = a.hours / Math.max(getTotalHours(a.game), 1);
        const bRatio = b.hours / Math.max(getTotalHours(b.game), 1);
        return bRatio - aRatio;
      });
    if (surprises.length > 0) {
      awards.push({
        title: 'Biggest Surprise',
        winner: surprises[0].game.name,
        stat: `${surprises[0].hours.toFixed(1)}h this week`,
        thumbnail: surprises[0].game.thumbnail,
      });
    }
  }

  // Speedrun Award - If any completions happened
  if (data.completedGames.length > 0) {
    const fastest = data.completedGames.reduce((best, g) => {
      const gHours = getTotalHours(g);
      const bestHours = getTotalHours(best);
      return gHours < bestHours ? g : best;
    }, data.completedGames[0]);
    awards.push({
      title: 'Speedrun Award',
      winner: fastest.name,
      stat: `Completed in ${getTotalHours(fastest).toFixed(1)}h`,
      thumbnail: fastest.thumbnail,
    });
  }

  return awards;
}

/**
 * Sharp Insight - The single most interesting data-driven observation of the week
 */
export function getSharpInsight(data: WeekInReviewData, allGames: Game[]): string | null {
  // Prioritized list of insights - return the first one that applies

  // 1. Multiple completions
  if (data.completedGames.length >= 2) {
    return `You completed ${data.completedGames.length} games this week: ${data.completedGames.map(g => g.name).join(' and ')}.`;
  }

  // 2. Cost-per-hour milestone
  if (data.totalCostPerHour > 0 && data.totalCostPerHour < 2) {
    return `Your cost-per-hour this week was $${data.totalCostPerHour.toFixed(2)} — cheaper than a cup of coffee.`;
  }

  // 3. Streak highlight
  if (data.longestStreak === 7) {
    return `Perfect 7-day streak. You played every single day this week.`;
  }

  // 4. Massive single session
  if (data.longestSession && data.longestSession.hours >= 5) {
    return `${data.longestSession.hours.toFixed(1)}-hour session on ${data.longestSession.game.name}. That's a movie trilogy.`;
  }

  // 5. Big spending week
  const weekSpend = data.gamesPlayed.reduce((sum, g) => {
    const purchased = g.game.datePurchased;
    if (purchased) {
      const purchaseDate = parseLocalDate(purchased);
      if (purchaseDate >= data.weekStart && purchaseDate <= data.weekEnd) {
        return sum + g.game.price;
      }
    }
    return sum;
  }, 0);
  if (weekSpend > 100) {
    return `You spent $${weekSpend.toFixed(0)} on games this week.`;
  }

  // 6. Single game dominance
  if (data.topGame && data.topGame.percentage > 80) {
    return `${data.topGame.game.name} consumed ${data.topGame.percentage.toFixed(0)}% of your week. One game to rule them all.`;
  }

  // 7. Game completed in one week
  const quickCompletes = data.completedGames.filter(g => {
    if (g.startDate) {
      const start = parseLocalDate(g.startDate);
      return start >= data.weekStart;
    }
    return false;
  });
  if (quickCompletes.length > 0) {
    return `${quickCompletes[0].name} went from 'Not Started' to 'Completed' in one week.`;
  }

  // 8. High average rating
  if (data.averageEnjoymentRating >= 8.5 && data.gamesPlayed.length >= 3) {
    return `Average rating this week: ${data.averageEnjoymentRating.toFixed(1)}/10 across ${data.gamesPlayed.length} games. You played what you love.`;
  }

  // 9. Many games, little time each
  if (data.uniqueGames >= 5 && data.avgSessionLength < 1) {
    return `${data.uniqueGames} games but averaging ${data.avgSessionLength.toFixed(1)}h per session. Sampling mode.`;
  }

  // 10. Comparison to average
  if (data.vsAverage.percentage > 150) {
    return `${data.vsAverage.percentage.toFixed(0)}% of your average week. This was a big one.`;
  }

  if (data.vsAverage.percentage < 50 && data.vsAverage.percentage > 0) {
    return `Only ${data.vsAverage.percentage.toFixed(0)}% of your average week. A quiet one.`;
  }

  // 11. Single completion
  if (data.completedGames.length === 1) {
    const g = data.completedGames[0];
    return `Completed ${g.name} after ${getTotalHours(g).toFixed(1)} hours.`;
  }

  // Default: hours summary with top game
  if (data.topGame) {
    return `${data.totalHours.toFixed(1)}h across ${data.uniqueGames} game${data.uniqueGames !== 1 ? 's' : ''}. ${data.topGame.game.name} took ${data.topGame.percentage.toFixed(0)}%.`;
  }

  return null;
}

/**
 * Ignored Games - Games in queue/active that weren't touched this week
 */
export interface IgnoredGame {
  game: Game;
  daysSinceLastPlay: number;
  label: string;
  inQueue: boolean;
  queuePosition?: number;
}

export function getIgnoredGames(data: WeekInReviewData, allGames: Game[]): IgnoredGame[] {
  const playedIds = new Set(data.gamesPlayed.map(g => g.game.id));

  const ignored: IgnoredGame[] = allGames
    .filter(g => {
      // Only consider active/queued games that weren't played
      if (playedIds.has(g.id)) return false;
      if (g.status === 'Wishlist' || g.status === 'Completed' || g.status === 'Abandoned') return false;
      // Must have been played at some point or be in queue
      return (g.playLogs && g.playLogs.length > 0) || (g.queuePosition !== undefined && g.queuePosition > 0);
    })
    .map(g => {
      let daysSinceLastPlay = 999;
      if (g.playLogs && g.playLogs.length > 0) {
        const sorted = [...g.playLogs].sort((a, b) => parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime());
        daysSinceLastPlay = Math.floor((Date.now() - parseLocalDate(sorted[0].date).getTime()) / (24 * 60 * 60 * 1000));
      }

      let label: string;
      if (daysSinceLastPlay > 30) label = 'Gathering dust';
      else if (daysSinceLastPlay > 14) label = 'Cooling off';
      else if (daysSinceLastPlay > 7) label = 'On pause';
      else label = 'Skipped this week';

      return {
        game: g,
        daysSinceLastPlay,
        label,
        inQueue: g.queuePosition !== undefined && g.queuePosition > 0,
        queuePosition: g.queuePosition,
      };
    })
    .sort((a, b) => b.daysSinceLastPlay - a.daysSinceLastPlay)
    .slice(0, 5);

  return ignored;
}

/**
 * Franchise Check-in - Franchise stats for games played this week
 */
export interface FranchiseCheckIn {
  franchise: string;
  games: Array<{
    game: Game;
    hours: number;
    rating: number;
    status: string;
    playedThisWeek: boolean;
  }>;
  totalHours: number;
  ratingTrend: string; // "Getting better", "Consistent", "Declining"
}

export function getFranchiseCheckIns(data: WeekInReviewData, allGames: Game[]): FranchiseCheckIn[] {
  // Find franchises of games played this week
  const franchisesThisWeek = new Set<string>();
  data.gamesPlayed.forEach(g => {
    if (g.game.franchise) franchisesThisWeek.add(g.game.franchise);
  });

  const checkIns: FranchiseCheckIn[] = [];

  franchisesThisWeek.forEach(franchise => {
    const franchiseGames = allGames
      .filter(g => g.franchise === franchise)
      .sort((a, b) => {
        const aDate = a.datePurchased || a.createdAt;
        const bDate = b.datePurchased || b.createdAt;
        return parseLocalDate(aDate).getTime() - parseLocalDate(bDate).getTime();
      });

    if (franchiseGames.length < 2) return; // Need 2+ games for a franchise check-in

    const playedIds = new Set(data.gamesPlayed.map(g => g.game.id));
    const games = franchiseGames.map(g => ({
      game: g,
      hours: getTotalHours(g),
      rating: g.rating,
      status: g.status,
      playedThisWeek: playedIds.has(g.id),
    }));

    const ratings = games.filter(g => g.rating > 0).map(g => g.rating);
    let ratingTrend = 'Consistent';
    if (ratings.length >= 2) {
      const firstHalf = ratings.slice(0, Math.ceil(ratings.length / 2));
      const secondHalf = ratings.slice(Math.ceil(ratings.length / 2));
      const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      if (avgSecond > avgFirst + 0.5) ratingTrend = 'Getting better every time';
      else if (avgSecond < avgFirst - 0.5) ratingTrend = 'Declining';
    }

    checkIns.push({
      franchise,
      games,
      totalHours: games.reduce((sum, g) => sum + g.hours, 0),
      ratingTrend,
    });
  });

  return checkIns;
}

/**
 * Historical Echoes - "This time last year/6 months/3 months"
 */
export interface HistoricalEcho {
  label: string; // "1 year ago", "6 months ago", etc.
  game: Game;
  event: string; // "started", "completed", "were playing"
  hours: number;
  review?: string;
}

export function getHistoricalEchoes(data: WeekInReviewData, allGames: Game[]): HistoricalEcho[] {
  const echoes: HistoricalEcho[] = [];
  const now = data.weekStart;

  const periods = [
    { label: '1 year ago', daysBack: 365 },
    { label: '6 months ago', daysBack: 182 },
    { label: '3 months ago', daysBack: 91 },
  ];

  periods.forEach(({ label, daysBack }) => {
    const targetStart = new Date(now);
    targetStart.setDate(targetStart.getDate() - daysBack - 3); // +/- 3 day window
    const targetEnd = new Date(now);
    targetEnd.setDate(targetEnd.getDate() - daysBack + 3);

    allGames.forEach(game => {
      // Check for play logs in that period
      if (game.playLogs) {
        const logsInPeriod = game.playLogs.filter(log => {
          const logDate = parseLocalDate(log.date);
          return logDate >= targetStart && logDate <= targetEnd;
        });

        if (logsInPeriod.length > 0) {
          const totalHours = logsInPeriod.reduce((sum, l) => sum + l.hours, 0);
          echoes.push({
            label,
            game,
            event: 'were playing',
            hours: totalHours,
            review: game.review,
          });
        }
      }

      // Check for starts
      if (game.startDate) {
        const startDate = parseLocalDate(game.startDate);
        if (startDate >= targetStart && startDate <= targetEnd) {
          if (!echoes.find(e => e.game.id === game.id && e.label === label)) {
            echoes.push({
              label,
              game,
              event: 'started',
              hours: getTotalHours(game),
              review: game.review,
            });
          }
        }
      }

      // Check for completions
      if (game.endDate && game.status === 'Completed') {
        const endDate = parseLocalDate(game.endDate);
        if (endDate >= targetStart && endDate <= targetEnd) {
          if (!echoes.find(e => e.game.id === game.id && e.label === label)) {
            echoes.push({
              label,
              game,
              event: 'completed',
              hours: getTotalHours(game),
              review: game.review,
            });
          }
        }
      }
    });
  });

  // Deduplicate: one echo per game, preferring the most distant period
  const seen = new Set<string>();
  return echoes.filter(e => {
    if (seen.has(e.game.id)) return false;
    seen.add(e.game.id);
    return true;
  }).slice(0, 3);
}

/**
 * Momentum Data - Multi-week trend analysis
 */
export interface MomentumData {
  weeklyHours: Array<{ weekLabel: string; hours: number }>;
  trend: 'accelerating' | 'decelerating' | 'steady';
  trendDescription: string;
  gameMomentum: Array<{
    game: Game;
    trend: 'accelerating' | 'decelerating' | 'steady' | 'new';
    description: string;
  }>;
}

export function getMomentumData(games: Game[], currentWeekData: WeekInReviewData): MomentumData {
  // Get last 6 weeks of hours
  const weeklyHours: Array<{ weekLabel: string; hours: number }> = [];

  for (let i = 5; i >= 0; i--) {
    const weekData = getWeekStatsForOffset(games, i);
    weeklyHours.push({
      weekLabel: weekData.weekLabel.split(' - ')[0], // Just start date
      hours: weekData.totalHours,
    });
  }

  // Determine trend from last 3 weeks
  const recent = weeklyHours.slice(-3);
  let trend: MomentumData['trend'] = 'steady';
  let trendDescription = '';

  if (recent.length >= 3) {
    const increasing = recent[2].hours > recent[1].hours && recent[1].hours > recent[0].hours;
    const decreasing = recent[2].hours < recent[1].hours && recent[1].hours < recent[0].hours;
    const diff = recent[2].hours - recent[0].hours;
    const avgHours = recent.reduce((sum, w) => sum + w.hours, 0) / recent.length;

    if (increasing && diff > 2) {
      trend = 'accelerating';
      trendDescription = `${recent.length} weeks of increasing hours. You're in a groove.`;
    } else if (decreasing && Math.abs(diff) > 2) {
      trend = 'decelerating';
      const dropPercent = avgHours > 0 ? Math.round((Math.abs(diff) / avgHours) * 100) : 0;
      trendDescription = `Hours dropped ${dropPercent}% — cooling off.`;
    } else {
      trend = 'steady';
      trendDescription = `Steady at ~${avgHours.toFixed(0)}h/week. Consistent.`;
    }
  }

  // Game-level momentum: compare this week vs previous week for each game
  const prevWeekData = getWeekStatsForOffset(games, 1);
  const prevGameMap = new Map(prevWeekData.gamesPlayed.map(g => [g.game.id, g.hours]));

  const gameMomentum = currentWeekData.gamesPlayed.slice(0, 5).map(gp => {
    const prevHours = prevGameMap.get(gp.game.id);
    if (prevHours === undefined) {
      return { game: gp.game, trend: 'new' as const, description: 'New this week' };
    }
    const diff = gp.hours - prevHours;
    if (diff > 1) {
      return { game: gp.game, trend: 'accelerating' as const, description: `+${diff.toFixed(1)}h vs last week` };
    } else if (diff < -1) {
      return { game: gp.game, trend: 'decelerating' as const, description: `${diff.toFixed(1)}h vs last week` };
    }
    return { game: gp.game, trend: 'steady' as const, description: 'Similar to last week' };
  });

  return { weeklyHours, trend, trendDescription, gameMomentum };
}

/**
 * Rating Paradox - Disconnect between what you rate highly and what you actually play
 */
export interface RatingParadox {
  hasParadox: boolean;
  playedButLowRated: Array<{ game: Game; hours: number; rating: number }>;
  lovedButIgnored: Array<{ game: Game; hours: number; rating: number }>;
  topPlayedGenre: { genre: string; avgRating: number } | null;
  topRatedGenre: { genre: string; avgRating: number } | null;
  summary: string;
}

export function getRatingParadox(data: WeekInReviewData, allGames: Game[]): RatingParadox {
  const played = data.gamesPlayed.filter(g => g.game.rating > 0);

  // Games played a lot but rated low
  const playedButLowRated = played
    .filter(g => g.game.rating <= 6 && g.hours >= 2)
    .map(g => ({ game: g.game, hours: g.hours, rating: g.game.rating }))
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 3);

  // High-rated games in library that got 0 hours this week
  const playedIds = new Set(data.gamesPlayed.map(g => g.game.id));
  const lovedButIgnored = allGames
    .filter(g => g.rating >= 8 && !playedIds.has(g.id) && g.status === 'In Progress')
    .map(g => ({ game: g, hours: 0, rating: g.rating }))
    .slice(0, 3);

  // Genre paradox
  const genreHours: Record<string, { hours: number; totalRating: number; count: number }> = {};
  played.forEach(g => {
    const genre = g.game.genre || 'Other';
    if (!genreHours[genre]) genreHours[genre] = { hours: 0, totalRating: 0, count: 0 };
    genreHours[genre].hours += g.hours;
    genreHours[genre].totalRating += g.game.rating;
    genreHours[genre].count++;
  });

  const genreEntries = Object.entries(genreHours).filter(([, v]) => v.count > 0);
  const topPlayedGenre = genreEntries.length > 0
    ? genreEntries.sort((a, b) => b[1].hours - a[1].hours)
        .map(([genre, v]) => ({ genre, avgRating: v.totalRating / v.count }))[0]
    : null;
  const topRatedGenre = genreEntries.length > 0
    ? genreEntries.sort((a, b) => (b[1].totalRating / b[1].count) - (a[1].totalRating / a[1].count))
        .map(([genre, v]) => ({ genre, avgRating: v.totalRating / v.count }))[0]
    : null;

  const hasParadox = playedButLowRated.length > 0 || lovedButIgnored.length > 0 ||
    !!(topPlayedGenre && topRatedGenre && topPlayedGenre.genre !== topRatedGenre.genre);

  let summary: string;
  if (playedButLowRated.length > 0 && lovedButIgnored.length > 0) {
    summary = `You spent ${playedButLowRated[0].hours.toFixed(1)}h on ${playedButLowRated[0].game.name} (rated ${playedButLowRated[0].rating}/10) while ${lovedButIgnored[0].game.name} (rated ${lovedButIgnored[0].rating}/10) sat untouched.`;
  } else if (topPlayedGenre && topRatedGenre && topPlayedGenre.genre !== topRatedGenre.genre) {
    summary = `Most-played genre: ${topPlayedGenre.genre} (avg ${topPlayedGenre.avgRating.toFixed(1)}/10). Highest-rated: ${topRatedGenre.genre} (avg ${topRatedGenre.avgRating.toFixed(1)}/10).`;
  } else {
    summary = 'Your playtime matches your taste — you play what you love.';
  }

  return { hasParadox, playedButLowRated, lovedButIgnored, topPlayedGenre, topRatedGenre, summary };
}

// ── MONTH IN REVIEW ──────────────────────────────────────────────

export interface MonthInReviewData {
  // Time range
  year: number;
  month: number;
  monthLabel: string;
  monthKey: string;

  // Core stats
  totalHours: number;
  totalSessions: number;
  uniqueGames: number;

  // Game breakdown
  gamesPlayed: Array<{
    game: Game;
    hours: number;
    sessions: number;
    percentage: number;
  }>;
  topGame: { game: Game; hours: number; sessions: number; percentage: number } | null;
  top3Games: Array<{ game: Game; hours: number; percentage: number }>;

  // Daily breakdown
  dailyHours: Array<{ date: string; hours: number; sessions: number }>;
  biggestDay: { date: string; hours: number; games: string[] } | null;
  daysActive: number;

  // Weekly breakdown
  weeklyHours: Array<{ weekNum: number; hours: number; sessions: number }>;

  // Genre
  genreBreakdown: Array<{ genre: string; hours: number; percentage: number; count: number }>;

  // Spending
  totalSpent: number;
  gamesPurchased: Array<{ game: Game; price: number }>;
  bestDeal: { game: Game; costPerHour: number } | null;

  // Completions
  completedGames: Game[];
  newGamesStarted: Game[];

  // Best value
  bestValueGame: { game: Game; costPerHour: number } | null;

  // vs last month
  vsLastMonth: {
    hoursDiff: number;
    sessionsDiff: number;
    gamesDiff: number;
    spendingDiff: number;
    trend: 'up' | 'down' | 'same';
  };

  // Personality
  personality: ReturnType<typeof getGamingPersonality>;

  // Streak
  longestStreak: number;

  // Longest session
  longestSession: { date: string; hours: number; gameName: string } | null;

  // Discovery of the month (new game started this month with most play)
  discoveryGame: { game: Game; hours: number; sessions: number } | null;

  // Unfinished games (played this month, still In Progress)
  unfinishedGames: Array<{ game: Game; hoursThisMonth: number }>;

  // Average session length
  avgSessionLength: number;
}

export function getMonthInReviewData(games: Game[], year: number, month: number): MonthInReviewData {
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0, 23, 59, 59);
  const monthLabel = monthStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const monthKey = `${year}-${String(month).padStart(2, '0')}`;

  // Gather play data
  const gameHours: Record<string, { game: Game; hours: number; sessions: number }> = {};
  const dailyMap: Record<string, { hours: number; sessions: number; games: Set<string> }> = {};

  games.forEach(game => {
    if (!game.playLogs) return;
    game.playLogs.forEach(log => {
      const logDate = parseLocalDate(log.date);
      if (logDate < monthStart || logDate > monthEnd) return;

      const dateKey = log.date.substring(0, 10);
      if (!dailyMap[dateKey]) dailyMap[dateKey] = { hours: 0, sessions: 0, games: new Set() };
      dailyMap[dateKey].hours += log.hours;
      dailyMap[dateKey].sessions += 1;
      dailyMap[dateKey].games.add(game.name);

      if (!gameHours[game.id]) gameHours[game.id] = { game, hours: 0, sessions: 0 };
      gameHours[game.id].hours += log.hours;
      gameHours[game.id].sessions += 1;
    });
  });

  const totalHours = Object.values(gameHours).reduce((s, g) => s + g.hours, 0);
  const totalSessions = Object.values(gameHours).reduce((s, g) => s + g.sessions, 0);

  const gamesPlayed = Object.values(gameHours)
    .sort((a, b) => b.hours - a.hours)
    .map(g => ({
      game: g.game,
      hours: g.hours,
      sessions: g.sessions,
      percentage: totalHours > 0 ? (g.hours / totalHours) * 100 : 0,
    }));

  const topGame = gamesPlayed[0] || null;
  const top3Games = gamesPlayed.slice(0, 3).map(g => ({ game: g.game, hours: g.hours, percentage: g.percentage }));

  // Daily breakdown
  const dailyHours = Object.entries(dailyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({ date, hours: data.hours, sessions: data.sessions }));

  const biggestDayEntry = Object.entries(dailyMap).sort((a, b) => b[1].hours - a[1].hours)[0];
  const biggestDay = biggestDayEntry
    ? { date: biggestDayEntry[0], hours: biggestDayEntry[1].hours, games: [...biggestDayEntry[1].games] }
    : null;

  const daysActive = Object.keys(dailyMap).length;

  // Weekly breakdown (weeks 1-5 of the month)
  const weeklyMap: Record<number, { hours: number; sessions: number }> = {};
  Object.entries(dailyMap).forEach(([date, data]) => {
    const dayOfMonth = parseLocalDate(date).getDate();
    const weekNum = Math.ceil(dayOfMonth / 7);
    if (!weeklyMap[weekNum]) weeklyMap[weekNum] = { hours: 0, sessions: 0 };
    weeklyMap[weekNum].hours += data.hours;
    weeklyMap[weekNum].sessions += data.sessions;
  });
  const weeklyHours = Object.entries(weeklyMap)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([weekNum, data]) => ({ weekNum: Number(weekNum), hours: data.hours, sessions: data.sessions }));

  // Genre breakdown
  const genreMap: Record<string, { hours: number; count: number }> = {};
  gamesPlayed.forEach(g => {
    const genre = g.game.genre || 'Other';
    if (!genreMap[genre]) genreMap[genre] = { hours: 0, count: 0 };
    genreMap[genre].hours += g.hours;
    genreMap[genre].count += 1;
  });
  const genreBreakdown = Object.entries(genreMap)
    .sort((a, b) => b[1].hours - a[1].hours)
    .map(([genre, data]) => ({
      genre,
      hours: data.hours,
      percentage: totalHours > 0 ? (data.hours / totalHours) * 100 : 0,
      count: data.count,
    }));

  // Spending (games purchased this month)
  const gamesPurchased = games
    .filter(g => g.datePurchased && g.datePurchased.substring(0, 7) === monthKey && g.price > 0)
    .map(g => ({ game: g, price: g.price }));
  const totalSpent = gamesPurchased.reduce((s, g) => s + g.price, 0);

  // Best deal
  const paidGamesWithHours = gamesPlayed.filter(g => g.game.price > 0 && g.hours > 0);
  const bestValueGame = paidGamesWithHours.length > 0
    ? paidGamesWithHours
        .map(g => ({ game: g.game, costPerHour: g.game.price / getTotalHours(g.game) }))
        .sort((a, b) => a.costPerHour - b.costPerHour)[0]
    : null;

  const bestDeal = gamesPurchased.length > 0
    ? gamesPurchased
        .filter(g => getTotalHours(g.game) > 0)
        .map(g => ({ game: g.game, costPerHour: g.price / getTotalHours(g.game) }))
        .sort((a, b) => a.costPerHour - b.costPerHour)[0] || null
    : null;

  // Completions
  const completedGames = games.filter(g => g.status === 'Completed' && g.endDate && g.endDate.substring(0, 7) === monthKey);
  const newGamesStarted = games.filter(g => g.startDate && g.startDate.substring(0, 7) === monthKey);

  // vs last month
  const prevMonthStart = new Date(year, month - 2, 1);
  const prevMonthEnd = new Date(year, month - 1, 0, 23, 59, 59);
  let prevHours = 0;
  let prevSessions = 0;
  const prevGames = new Set<string>();
  const prevMonthKey = `${prevMonthStart.getFullYear()}-${String(prevMonthStart.getMonth() + 1).padStart(2, '0')}`;

  games.forEach(game => {
    if (!game.playLogs) return;
    game.playLogs.forEach(log => {
      const logDate = parseLocalDate(log.date);
      if (logDate >= prevMonthStart && logDate <= prevMonthEnd) {
        prevHours += log.hours;
        prevSessions += 1;
        prevGames.add(game.id);
      }
    });
  });
  const prevSpent = games
    .filter(g => g.datePurchased && g.datePurchased.substring(0, 7) === prevMonthKey && g.price > 0)
    .reduce((s, g) => s + g.price, 0);

  const hoursDiff = totalHours - prevHours;
  const vsLastMonth = {
    hoursDiff,
    sessionsDiff: totalSessions - prevSessions,
    gamesDiff: gamesPlayed.length - prevGames.size,
    spendingDiff: totalSpent - prevSpent,
    trend: (hoursDiff > 1 ? 'up' : hoursDiff < -1 ? 'down' : 'same') as 'up' | 'down' | 'same',
  };

  // Personality for this month's subset
  const monthGames = gamesPlayed.map(g => g.game);
  const personality = getGamingPersonality(monthGames);

  // Longest streak - consecutive gaming days in the month
  const sortedDates = Object.keys(dailyMap).sort();
  let longestStreak = sortedDates.length > 0 ? 1 : 0;
  let currentStreak = 1;
  for (let i = 1; i < sortedDates.length; i++) {
    const prev = parseLocalDate(sortedDates[i - 1]);
    const curr = parseLocalDate(sortedDates[i]);
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) {
      currentStreak++;
    } else {
      longestStreak = Math.max(longestStreak, currentStreak);
      currentStreak = 1;
    }
  }
  longestStreak = Math.max(longestStreak, currentStreak);

  // Longest single session in the month
  let longestSession: { date: string; hours: number; gameName: string } | null = null;
  games.forEach(game => {
    if (!game.playLogs) return;
    game.playLogs.forEach(log => {
      const logDate = parseLocalDate(log.date);
      if (logDate < monthStart || logDate > monthEnd) return;
      if (!longestSession || log.hours > longestSession.hours) {
        longestSession = { date: log.date.substring(0, 10), hours: log.hours, gameName: game.name };
      }
    });
  });

  // Discovery game (new game started this month with most hours)
  const discoveryGame = newGamesStarted
    .filter(g => gameHours[g.id])
    .map(g => ({ game: g, hours: gameHours[g.id].hours, sessions: gameHours[g.id].sessions }))
    .sort((a, b) => b.hours - a.hours)[0] || null;

  // Unfinished games (played this month, still In Progress)
  const unfinishedGames = gamesPlayed
    .filter(g => g.game.status === 'In Progress')
    .map(g => ({ game: g.game, hoursThisMonth: g.hours }));

  // Average session length
  const avgSessionLength = totalSessions > 0 ? totalHours / totalSessions : 0;

  return {
    year,
    month,
    monthLabel,
    monthKey,
    totalHours,
    totalSessions,
    uniqueGames: gamesPlayed.length,
    gamesPlayed,
    topGame,
    top3Games,
    dailyHours,
    biggestDay,
    daysActive,
    weeklyHours,
    genreBreakdown,
    totalSpent,
    gamesPurchased,
    bestDeal,
    bestValueGame,
    completedGames,
    newGamesStarted,
    vsLastMonth,
    personality,
    longestStreak,
    longestSession,
    discoveryGame,
    unfinishedGames,
    avgSessionLength,
  };
}

// ── MONTH RECAP HELPERS ──────────────────────────────────────────

export interface MonthGrade {
  overall: string;
  overallScore: number;
  subjects: Array<{
    name: string;
    grade: string;
    score: number;
    emoji: string;
  }>;
}

function scoreToGrade(s: number): string {
  if (s >= 93) return 'A+';
  if (s >= 85) return 'A';
  if (s >= 78) return 'B+';
  if (s >= 70) return 'B';
  if (s >= 63) return 'C+';
  if (s >= 55) return 'C';
  if (s >= 45) return 'D';
  return 'F';
}

export function getMonthGrade(data: MonthInReviewData): MonthGrade {
  const daysInMonth = new Date(data.year, data.month, 0).getDate();

  // Dedication (hours played): 0-40h maps to 0-100
  const dedicationScore = Math.min(100, data.totalHours * 2.5);

  // Variety (unique games): 1=20, 2=40, 3=60, 4=80, 5+=100
  const varietyScore = Math.min(100, data.uniqueGames * 20);

  // Consistency (days active / days in month)
  const consistencyScore = (data.daysActive / daysInMonth) * 100;

  // Achievement (completions + new starts)
  const achievementScore = Math.min(100, (data.completedGames.length * 30) + (data.newGamesStarted.length * 15));

  // Value (inverse cost-per-hour)
  const paidPlayed = data.gamesPlayed.filter(g => g.game.price > 0 && g.hours > 0);
  const avgCPH = paidPlayed.length > 0
    ? paidPlayed.reduce((sum, g) => sum + (g.game.price / getTotalHours(g.game)), 0) / paidPlayed.length
    : 0;
  const valueScore = avgCPH > 0 ? Math.min(100, (5 / avgCPH) * 60) : 50;

  const overallScore = dedicationScore * 0.3 + varietyScore * 0.15 + consistencyScore * 0.25 + achievementScore * 0.15 + valueScore * 0.15;

  return {
    overall: scoreToGrade(overallScore),
    overallScore: Math.round(overallScore),
    subjects: [
      { name: 'Dedication', grade: scoreToGrade(dedicationScore), score: Math.round(dedicationScore), emoji: '🔥' },
      { name: 'Variety', grade: scoreToGrade(varietyScore), score: Math.round(varietyScore), emoji: '🎲' },
      { name: 'Consistency', grade: scoreToGrade(consistencyScore), score: Math.round(consistencyScore), emoji: '📅' },
      { name: 'Achievement', grade: scoreToGrade(achievementScore), score: Math.round(achievementScore), emoji: '🏆' },
      { name: 'Value', grade: scoreToGrade(valueScore), score: Math.round(valueScore), emoji: '💰' },
    ],
  };
}

export function getMonthHotTake(data: MonthInReviewData): string | null {
  if (data.totalHours === 0) return null;

  const takes: string[] = [];
  const daysInMonth = new Date(data.year, data.month, 0).getDate();

  if (data.topGame && data.topGame.hours > 40) {
    takes.push(`${data.topGame.hours.toFixed(0)} hours on ${data.topGame.game.name} this month. That's literally a full work week.`);
  }
  if (data.totalHours > 100) {
    takes.push(`${data.totalHours.toFixed(0)} hours of gaming in one month. You averaged ${(data.totalHours / daysInMonth).toFixed(1)} hours every single day.`);
  } else if (data.totalHours > 60) {
    takes.push(`${data.totalHours.toFixed(0)} hours this month. Gaming isn't your hobby — it's your second job.`);
  }
  if (data.totalSpent > 200) {
    takes.push(`$${data.totalSpent.toFixed(0)} on games this month. Your wallet is filing for emotional damage.`);
  }
  if (data.uniqueGames === 1 && data.topGame) {
    takes.push(`Only ${data.topGame.game.name}. All month. Nothing else. This is what true love looks like.`);
  }
  if (data.uniqueGames >= 10) {
    takes.push(`${data.uniqueGames} different games in one month. Your attention span said "no thank you."`);
  }
  if (data.completedGames.length >= 3) {
    takes.push(`${data.completedGames.length} games completed in one month. You're not a gamer, you're a game-finishing machine.`);
  }
  if (data.daysActive >= daysInMonth - 2) {
    takes.push(`You gamed ${data.daysActive} out of ${daysInMonth} days. Rest days are a myth.`);
  }
  if (data.longestStreak >= 14) {
    takes.push(`A ${data.longestStreak}-day gaming streak. That's ${data.longestStreak} consecutive days of commitment that puts relationships to shame.`);
  }
  if (data.topGame && data.topGame.percentage > 80 && data.uniqueGames > 3) {
    takes.push(`You played ${data.uniqueGames} games but ${data.topGame.game.name} took ${data.topGame.percentage.toFixed(0)}% of your time. The other ${data.uniqueGames - 1} were just emotional support games.`);
  }
  if (data.vsLastMonth.hoursDiff > 20) {
    takes.push(`${data.vsLastMonth.hoursDiff.toFixed(0)} more hours than last month. Whatever happened in your life, gaming was the answer.`);
  }
  if (data.genreBreakdown.length === 1) {
    takes.push(`Every game this month was ${data.genreBreakdown[0].genre}. You know other genres exist, right?`);
  }
  if (data.longestSession && data.longestSession.hours >= 6) {
    takes.push(`A ${data.longestSession.hours.toFixed(1)}-hour session on ${data.longestSession.gameName}. At that point you're not playing — you're living in it.`);
  }
  if (data.avgSessionLength > 3) {
    takes.push(`Your average session was ${data.avgSessionLength.toFixed(1)} hours. "Just one quick game" is not in your vocabulary.`);
  }
  if (data.newGamesStarted.length >= 5) {
    takes.push(`You started ${data.newGamesStarted.length} new games this month. Commitment issues? In this economy?`);
  }

  if (takes.length === 0) return null;
  return takes[Math.floor(Math.random() * takes.length)];
}

export interface MonthAward {
  title: string;
  recipient: string;
  detail: string;
  emoji: string;
}

export function getMonthAwards(data: MonthInReviewData): MonthAward[] {
  const awards: MonthAward[] = [];

  if (data.topGame) {
    awards.push({
      title: 'MVP',
      recipient: data.topGame.game.name,
      detail: `${data.topGame.hours.toFixed(1)}h played`,
      emoji: '🏅',
    });
  }
  if (data.bestValueGame) {
    awards.push({
      title: 'Best Bang for Buck',
      recipient: data.bestValueGame.game.name,
      detail: `$${data.bestValueGame.costPerHour.toFixed(2)}/hr`,
      emoji: '💎',
    });
  }

  // Surprise Hit (highly rated but not #1)
  const surpriseHit = data.gamesPlayed
    .filter(g => g.game.rating >= 8 && g !== data.gamesPlayed[0])
    .sort((a, b) => b.game.rating - a.game.rating)[0];
  if (surpriseHit) {
    awards.push({
      title: 'Surprise Hit',
      recipient: surpriseHit.game.name,
      detail: `Rated ${surpriseHit.game.rating}/10`,
      emoji: '✨',
    });
  }

  // Most Dedicated (most sessions, not #1 by hours)
  const bySessionCount = [...data.gamesPlayed].sort((a, b) => b.sessions - a.sessions);
  if (bySessionCount.length > 1 && bySessionCount[0] !== data.gamesPlayed[0]) {
    awards.push({
      title: 'Most Dedicated',
      recipient: bySessionCount[0].game.name,
      detail: `${bySessionCount[0].sessions} sessions`,
      emoji: '🎯',
    });
  }

  if (data.completedGames.length > 0) {
    awards.push({
      title: 'Champion',
      recipient: data.completedGames[0].name,
      detail: 'Completed this month',
      emoji: '🏆',
    });
  }

  if (data.discoveryGame) {
    awards.push({
      title: 'Best Discovery',
      recipient: data.discoveryGame.game.name,
      detail: `${data.discoveryGame.hours.toFixed(1)}h since starting`,
      emoji: '🔭',
    });
  }

  return awards.slice(0, 5);
}

export interface MoodArcPoint {
  weekNum: number;
  intensity: number;
  label: string;
  hours: number;
  sessions: number;
}

export function getMonthMoodArc(data: MonthInReviewData): MoodArcPoint[] {
  if (data.weeklyHours.length === 0) return [];

  const maxHours = Math.max(...data.weeklyHours.map(w => w.hours), 1);

  return data.weeklyHours.map(w => {
    const intensity = Math.round((w.hours / maxHours) * 100);
    let label: string;
    if (intensity >= 80) label = 'Intense';
    else if (intensity >= 60) label = 'Active';
    else if (intensity >= 40) label = 'Moderate';
    else if (intensity >= 20) label = 'Light';
    else label = 'Quiet';

    return { weekNum: w.weekNum, intensity, label, hours: w.hours, sessions: w.sessions };
  });
}

// ============================================================
// CARD REDESIGN — New calculation functions
// ============================================================

// --- Card Rarity ---

export type RarityTier = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface CardRarity {
  tier: RarityTier;
  label: string;
  score: number;
  borderClass: string;
}

export function getCardRarity(game: Game): CardRarity {
  const totalHours = getTotalHours(game);
  const metrics = calculateMetrics(game);

  // Composite score: rating 40%, value 30%, hours 20%, completion 10%
  const ratingScore = (game.rating / 10) * 40;

  let valueScore = 0;
  if (metrics.valueRating === 'Excellent') valueScore = 30;
  else if (metrics.valueRating === 'Good') valueScore = 22;
  else if (metrics.valueRating === 'Fair') valueScore = 12;
  else valueScore = 5;
  if (totalHours === 0 && game.price === 0) valueScore = 15; // free, unplayed

  const hoursScore = Math.min(20, (totalHours / 100) * 20);

  let completionScore = 0;
  if (game.status === 'Completed') completionScore = 10;
  else if (game.status === 'In Progress') completionScore = 5;

  const score = Math.round(ratingScore + valueScore + hoursScore + completionScore);

  if (score >= 85 && game.rating >= 8) {
    return { tier: 'legendary', label: 'Legendary', score, borderClass: 'rarity-glow-legendary' };
  }
  if (score >= 70) {
    return { tier: 'epic', label: 'Epic', score, borderClass: 'rarity-glow-epic' };
  }
  if (score >= 50) {
    return { tier: 'rare', label: 'Rare', score, borderClass: 'rarity-glow-rare' };
  }
  if (score >= 30) {
    return { tier: 'uncommon', label: 'Uncommon', score, borderClass: 'rarity-glow-uncommon' };
  }
  return { tier: 'common', label: 'Common', score, borderClass: '' };
}

// --- Relationship Status ---

export interface RelationshipStatus {
  label: string;
  color: string;
  bgColor: string;
  cardTint: string; // subtle full-card tint for this status
}

export function getRelationshipStatus(game: Game, allGames: Game[]): RelationshipStatus {
  const totalHours = getTotalHours(game);
  const logs = game.playLogs || [];
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;

  // Sort logs by date descending
  const sortedLogs = logs.length > 0
    ? [...logs].sort((a, b) => parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime())
    : [];
  const daysSinceLastPlay = sortedLogs.length > 0
    ? Math.floor((now - parseLocalDate(sortedLogs[0].date).getTime()) / DAY)
    : -1;

  // Count days played in last 7 days
  const sevenDaysAgo = now - 7 * DAY;
  const daysPlayedLast7 = new Set(
    logs.filter(l => parseLocalDate(l.date).getTime() >= sevenDaysAgo).map(l => l.date)
  ).size;

  // Days since purchase
  const daysSincePurchase = game.datePurchased
    ? Math.floor((now - parseLocalDate(game.datePurchased).getTime()) / DAY)
    : game.createdAt
    ? Math.floor((now - new Date(game.createdAt).getTime()) / DAY)
    : 0;

  // Days since start
  const daysSinceStart = game.startDate
    ? Math.floor((now - parseLocalDate(game.startDate).getTime()) / DAY)
    : 0;

  // Check if recently completed + still playing
  if (game.status === 'Completed' && game.rating >= 8 && daysSinceLastPlay >= 0 && daysSinceLastPlay <= 14 && logs.length > 0) {
    return { label: 'Victory Lap', color: '#fbbf24', bgColor: 'rgba(251,191,36,0.15)', cardTint: 'rgba(251,191,36,0.03)' };
  }

  // Soulmate: 100+ hours AND rating >= 8
  if (totalHours >= 100 && game.rating >= 8) {
    return { label: 'Soulmate', color: '#fbbf24', bgColor: 'rgba(251,191,36,0.15)', cardTint: 'rgba(251,191,36,0.04)' };
  }

  // Obsessed: played 4+ of last 7 days
  if (daysPlayedLast7 >= 4 && game.status === 'In Progress') {
    return { label: 'Obsessed', color: '#f97316', bgColor: 'rgba(249,115,22,0.15)', cardTint: 'rgba(249,115,22,0.03)' };
  }

  // Comfort Game: 50+ hours, still playing, sessions spread over 60+ days
  if (totalHours >= 50 && game.status === 'In Progress' && daysSinceStart >= 60 && daysSinceLastPlay >= 0 && daysSinceLastPlay <= 14) {
    return { label: 'Comfort Game', color: '#10b981', bgColor: 'rgba(16,185,129,0.15)', cardTint: 'rgba(16,185,129,0.03)' };
  }

  // Love at First Sight: rating >= 9, under 10 hours
  if (game.rating >= 9 && totalHours < 10 && totalHours > 0) {
    return { label: 'Love at First Sight', color: '#ec4899', bgColor: 'rgba(236,72,153,0.15)', cardTint: 'rgba(236,72,153,0.03)' };
  }

  // Speed Run: completed in under 14 days
  if (game.status === 'Completed' && game.startDate && game.endDate) {
    const completionDays = Math.floor((parseLocalDate(game.endDate).getTime() - parseLocalDate(game.startDate).getTime()) / DAY);
    if (completionDays <= 14) {
      return { label: 'Speed Run', color: '#eab308', bgColor: 'rgba(234,179,8,0.15)', cardTint: 'rgba(234,179,8,0.03)' };
    }
  }

  // Rebound: started within 3 days of completing another game
  if (game.startDate) {
    const startTime = parseLocalDate(game.startDate).getTime();
    const isRebound = allGames.some(g =>
      g.id !== game.id && g.status === 'Completed' && g.endDate &&
      Math.abs(startTime - parseLocalDate(g.endDate).getTime()) <= 3 * DAY
    );
    if (isRebound && game.status === 'In Progress') {
      return { label: 'Rebound', color: '#14b8a6', bgColor: 'rgba(20,184,166,0.15)', cardTint: 'rgba(20,184,166,0.03)' };
    }
  }

  // Going Strong: 2-3 sessions in last 7 days
  if (daysPlayedLast7 >= 2 && daysPlayedLast7 <= 3 && game.status === 'In Progress') {
    return { label: 'Going Strong', color: '#3b82f6', bgColor: 'rgba(59,130,246,0.15)', cardTint: 'rgba(59,130,246,0.03)' };
  }

  // Fresh Start: started in last 7 days
  if (game.status === 'In Progress' && daysSinceStart <= 7 && daysSinceStart >= 0) {
    return { label: 'Fresh Start', color: '#22d3ee', bgColor: 'rgba(34,211,238,0.15)', cardTint: 'rgba(34,211,238,0.03)' };
  }

  // Slow Burn: in progress 90+ days, still active
  if (game.status === 'In Progress' && daysSinceStart >= 90 && daysSinceLastPlay >= 0 && daysSinceLastPlay <= 14) {
    return { label: 'Slow Burn', color: '#f59e0b', bgColor: 'rgba(245,158,11,0.15)', cardTint: 'rgba(245,158,11,0.03)' };
  }

  // Completed (generic)
  if (game.status === 'Completed') {
    return { label: 'Completed', color: '#10b981', bgColor: 'rgba(16,185,129,0.15)', cardTint: 'rgba(16,185,129,0.02)' };
  }

  // It's Complicated: abandoned after 20+ hours
  if (game.status === 'Abandoned' && totalHours >= 20) {
    return { label: "It's Complicated", color: '#a855f7', bgColor: 'rgba(168,85,247,0.15)', cardTint: 'rgba(168,85,247,0.03)' };
  }

  // Buyer's Remorse: paid $40+, under 2 hours, no session in 30+ days
  if (game.price >= 40 && totalHours < 2 && (daysSinceLastPlay > 30 || (logs.length === 0 && daysSincePurchase > 30)) && game.status !== 'Wishlist') {
    return { label: "Buyer's Remorse", color: '#ef4444', bgColor: 'rgba(239,68,68,0.15)', cardTint: 'rgba(239,68,68,0.03)' };
  }

  // Ghosted: in progress but no session in 30+ days
  if (game.status === 'In Progress' && daysSinceLastPlay > 30) {
    return { label: 'Ghosted', color: '#6b7280', bgColor: 'rgba(107,114,128,0.15)', cardTint: 'rgba(107,114,128,0.03)' };
  }

  // Abandoned (generic)
  if (game.status === 'Abandoned') {
    return { label: 'Abandoned', color: '#ef4444', bgColor: 'rgba(239,68,68,0.15)', cardTint: 'rgba(239,68,68,0.02)' };
  }

  // The One That Got Away: wishlist 60+ days
  if (game.status === 'Wishlist' && daysSincePurchase >= 60) {
    return { label: 'The One That Got Away', color: '#a855f7', bgColor: 'rgba(168,85,247,0.15)', cardTint: 'rgba(168,85,247,0.03)' };
  }

  // Wishlist (generic)
  if (game.status === 'Wishlist') {
    return { label: 'Wishlist', color: '#a855f7', bgColor: 'rgba(168,85,247,0.15)', cardTint: 'rgba(168,85,247,0.02)' };
  }

  // Dusty Shelf: not started, owned 60+ days
  if (game.status === 'Not Started' && daysSincePurchase >= 60) {
    return { label: 'Dusty Shelf', color: '#92400e', bgColor: 'rgba(146,64,14,0.15)', cardTint: 'rgba(146,64,14,0.03)' };
  }

  // Not Started (generic)
  if (game.status === 'Not Started') {
    return { label: 'Waiting Room', color: '#6b7280', bgColor: 'rgba(107,114,128,0.15)', cardTint: 'rgba(107,114,128,0.02)' };
  }

  // In Progress fallback
  return { label: 'In Progress', color: '#3b82f6', bgColor: 'rgba(59,130,246,0.15)', cardTint: 'rgba(59,130,246,0.02)' };
}

// --- Game Streak ---

export interface GameStreakData {
  days: number;
  level: 'none' | 'small' | 'medium' | 'large';
  isActive: boolean;
}

export function getGameStreak(game: Game): GameStreakData {
  const logs = game.playLogs || [];
  if (logs.length === 0) return { days: 0, level: 'none', isActive: false };

  const dates = [...new Set(logs.map(l => l.date))].sort(
    (a, b) => parseLocalDate(b).getTime() - parseLocalDate(a).getTime()
  );

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const yesterdayDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const yesterdayStr = `${yesterdayDate.getFullYear()}-${String(yesterdayDate.getMonth() + 1).padStart(2, '0')}-${String(yesterdayDate.getDate()).padStart(2, '0')}`;

  // Streak must include today or yesterday to be "active"
  if (dates[0] !== todayStr && dates[0] !== yesterdayStr) {
    return { days: 0, level: 'none', isActive: false };
  }

  let streak = 1;
  let currentDate = parseLocalDate(dates[0]);

  for (let i = 1; i < dates.length; i++) {
    const prevDate = new Date(currentDate.getTime() - 24 * 60 * 60 * 1000);
    const prevStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}-${String(prevDate.getDate()).padStart(2, '0')}`;

    if (dates[i] === prevStr) {
      streak++;
      currentDate = prevDate;
    } else {
      break;
    }
  }

  if (streak < 3) return { days: streak, level: 'none', isActive: false };

  let level: 'small' | 'medium' | 'large';
  if (streak >= 7) level = 'large';
  else if (streak >= 5) level = 'medium';
  else level = 'small';

  return { days: streak, level, isActive: true };
}

// --- Hero Number ---

export interface HeroNumber {
  value: string;
  label: string;
  color: string;
}

export function getHeroNumber(game: Game): HeroNumber {
  const totalHours = getTotalHours(game);
  const metrics = calculateMetrics(game);

  if (game.status === 'In Progress') {
    // Show completion probability if we have enough data
    // Simplified — just show hours since that's always available
    if (totalHours > 0) {
      return {
        value: `${totalHours}h`,
        label: 'played',
        color: '#3b82f6',
      };
    }
    return { value: 'New', label: 'just started', color: '#22d3ee' };
  }

  if (game.status === 'Completed') {
    if (totalHours > 0 && game.price > 0) {
      return {
        value: `$${metrics.costPerHour.toFixed(metrics.costPerHour < 1 ? 2 : 1)}`,
        label: 'per hr',
        color: metrics.valueRating === 'Excellent' ? '#10b981'
          : metrics.valueRating === 'Good' ? '#3b82f6'
          : metrics.valueRating === 'Fair' ? '#f59e0b'
          : '#ef4444',
      };
    }
    return { value: `${game.rating}`, label: 'rating', color: '#10b981' };
  }

  if (game.status === 'Wishlist') {
    const daysSince = game.createdAt
      ? Math.floor((Date.now() - new Date(game.createdAt).getTime()) / (24 * 60 * 60 * 1000))
      : 0;
    return {
      value: `${daysSince}d`,
      label: 'waiting',
      color: '#a855f7',
    };
  }

  if (game.status === 'Not Started') {
    const daysSince = game.datePurchased
      ? Math.floor((Date.now() - parseLocalDate(game.datePurchased).getTime()) / (24 * 60 * 60 * 1000))
      : game.createdAt
      ? Math.floor((Date.now() - new Date(game.createdAt).getTime()) / (24 * 60 * 60 * 1000))
      : 0;
    return {
      value: `${daysSince}d`,
      label: 'owned',
      color: '#6b7280',
    };
  }

  if (game.status === 'Abandoned') {
    return {
      value: `${totalHours}h`,
      label: 'sunk',
      color: '#ef4444',
    };
  }

  return { value: '-', label: '', color: '#6b7280' };
}

// --- Card Freshness (Aging) ---

export interface CardFreshness {
  level: 'fresh' | 'recent' | 'dusty' | 'forgotten';
  saturation: number; // CSS saturate value (0 to 1)
  opacity: number; // card opacity
}

export function getCardFreshness(game: Game): CardFreshness {
  if (game.status === 'Completed' || game.status === 'Wishlist') {
    return { level: 'recent', saturation: 1, opacity: 1 };
  }

  const logs = game.playLogs || [];
  if (logs.length === 0) {
    const daysSince = game.datePurchased
      ? Math.floor((Date.now() - parseLocalDate(game.datePurchased).getTime()) / (24 * 60 * 60 * 1000))
      : game.createdAt
      ? Math.floor((Date.now() - new Date(game.createdAt).getTime()) / (24 * 60 * 60 * 1000))
      : 0;
    if (daysSince > 90) return { level: 'forgotten', saturation: 0.4, opacity: 0.85 };
    if (daysSince > 30) return { level: 'dusty', saturation: 0.7, opacity: 0.92 };
    return { level: 'recent', saturation: 1, opacity: 1 };
  }

  const sorted = [...logs].sort((a, b) => parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime());
  const daysSince = Math.floor((Date.now() - parseLocalDate(sorted[0].date).getTime()) / (24 * 60 * 60 * 1000));

  if (daysSince <= 7) return { level: 'fresh', saturation: 1, opacity: 1 };
  if (daysSince <= 30) return { level: 'recent', saturation: 1, opacity: 1 };
  if (daysSince <= 90) return { level: 'dusty', saturation: 0.7, opacity: 0.92 };
  return { level: 'forgotten', saturation: 0.4, opacity: 0.85 };
}

// --- Game Sections (Personality Grouping) ---

export interface GameSection {
  id: string;
  label: string;
  insight: string;
  gameIds: string[];
}

export function getGameSections(games: Game[]): GameSection[] {
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;
  const sections: GameSection[] = [];

  // On Fire: played in last 7 days
  const onFire = games.filter(g => {
    const logs = g.playLogs || [];
    if (logs.length === 0) return false;
    const sorted = [...logs].sort((a, b) => parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime());
    return (now - parseLocalDate(sorted[0].date).getTime()) <= 7 * DAY;
  });
  if (onFire.length > 0) {
    const totalHrs = onFire.reduce((sum, g) => {
      const recent = (g.playLogs || []).filter(l => (now - parseLocalDate(l.date).getTime()) <= 7 * DAY);
      return sum + recent.reduce((s, l) => s + l.hours, 0);
    }, 0);
    sections.push({
      id: 'on-fire',
      label: 'On Fire',
      insight: `${onFire.length} game${onFire.length > 1 ? 's' : ''} active — ${totalHrs.toFixed(1)}h this week`,
      gameIds: onFire.map(g => g.id),
    });
  }

  // Cooling Off: In Progress, no session in 14-60 days
  const coolingOff = games.filter(g => {
    if (g.status !== 'In Progress') return false;
    const logs = g.playLogs || [];
    if (logs.length === 0) return false;
    const sorted = [...logs].sort((a, b) => parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime());
    const daysSince = (now - parseLocalDate(sorted[0].date).getTime()) / DAY;
    return daysSince > 14 && daysSince <= 60;
  });
  // Exclude games already in onFire
  const coolingFiltered = coolingOff.filter(g => !onFire.some(f => f.id === g.id));
  if (coolingFiltered.length > 0) {
    sections.push({
      id: 'cooling-off',
      label: 'Cooling Off',
      insight: `${coolingFiltered.length} game${coolingFiltered.length > 1 ? 's' : ''} losing momentum`,
      gameIds: coolingFiltered.map(g => g.id),
    });
  }

  // The Collection: completed
  const completed = games.filter(g => g.status === 'Completed');
  if (completed.length > 0) {
    sections.push({
      id: 'collection',
      label: 'The Collection',
      insight: `${completed.length} game${completed.length > 1 ? 's' : ''} completed`,
      gameIds: completed.map(g => g.id),
    });
  }

  // Waiting Room: not started
  const waiting = games.filter(g => g.status === 'Not Started');
  if (waiting.length > 0) {
    sections.push({
      id: 'waiting-room',
      label: 'Waiting Room',
      insight: `${waiting.length} game${waiting.length > 1 ? 's' : ''} in the backlog`,
      gameIds: waiting.map(g => g.id),
    });
  }

  // The Shelf: wishlist
  const wishlist = games.filter(g => g.status === 'Wishlist');
  if (wishlist.length > 0) {
    sections.push({
      id: 'the-shelf',
      label: 'The Shelf',
      insight: `${wishlist.length} game${wishlist.length > 1 ? 's' : ''} on the wishlist`,
      gameIds: wishlist.map(g => g.id),
    });
  }

  // The Graveyard: abandoned
  const abandoned = games.filter(g => g.status === 'Abandoned');
  if (abandoned.length > 0) {
    sections.push({
      id: 'graveyard',
      label: 'The Graveyard',
      insight: `${abandoned.length} game${abandoned.length > 1 ? 's' : ''} laid to rest`,
      gameIds: abandoned.map(g => g.id),
    });
  }

  // In Progress games not in onFire or coolingOff
  const inProgressRest = games.filter(g =>
    g.status === 'In Progress' &&
    !onFire.some(f => f.id === g.id) &&
    !coolingFiltered.some(f => f.id === g.id)
  );
  if (inProgressRest.length > 0) {
    sections.push({
      id: 'in-progress',
      label: 'In Progress',
      insight: `${inProgressRest.length} game${inProgressRest.length > 1 ? 's' : ''} on the go`,
      gameIds: inProgressRest.map(g => g.id),
    });
  }

  return sections;
}

// --- Game Biography ---

export function generateGameBiography(game: Game, allGames: Game[]): string {
  const totalHours = getTotalHours(game);
  const metrics = calculateMetrics(game);
  const logs = game.playLogs || [];
  const DAY = 24 * 60 * 60 * 1000;

  const parts: string[] = [];

  // Opening — how you got it
  if (game.datePurchased) {
    const dateObj = parseLocalDate(game.datePurchased);
    const monthName = dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
    if (game.acquiredFree) {
      parts.push(`Picked up ${game.name} for free on ${monthName}.`);
    } else if (game.originalPrice && game.originalPrice > game.price) {
      const discount = Math.round(((game.originalPrice - game.price) / game.originalPrice) * 100);
      parts.push(`Snagged ${game.name} for $${game.price} (${discount}% off) on ${monthName}.`);
    } else {
      parts.push(`Picked up ${game.name} for $${game.price} on ${monthName}.`);
    }
  } else if (game.acquiredFree) {
    parts.push(`${game.name} came free — no strings attached.`);
  } else {
    parts.push(`${game.name} joined the library for $${game.price}.`);
  }

  // How quickly you started
  if (game.datePurchased && game.startDate) {
    const daysToStart = Math.floor((parseLocalDate(game.startDate).getTime() - parseLocalDate(game.datePurchased).getTime()) / DAY);
    if (daysToStart === 0) parts.push("You couldn't wait — started the same day.");
    else if (daysToStart === 1) parts.push('Started it the very next day.');
    else if (daysToStart <= 3) parts.push(`Started just ${daysToStart} days later.`);
    else if (daysToStart <= 14) parts.push(`Started playing ${daysToStart} days after buying.`);
    else if (daysToStart <= 60) parts.push(`Sat on the shelf for ${daysToStart} days before the first session.`);
    else parts.push(`Gathered dust for ${daysToStart} days before you gave it a shot.`);
  }

  // Session summary
  if (logs.length > 0) {
    const sortedLogs = [...logs].sort((a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime());
    const firstLog = sortedLogs[0];
    const lastLog = sortedLogs[sortedLogs.length - 1];
    const spanDays = Math.floor((parseLocalDate(lastLog.date).getTime() - parseLocalDate(firstLog.date).getTime()) / DAY);

    const longestSession = Math.max(...logs.map(l => l.hours));
    const longestDay = logs.reduce((best, l) => l.hours > best.hours ? l : best, logs[0]);
    const longestDayOfWeek = parseLocalDate(longestDay.date).toLocaleDateString('en-US', { weekday: 'long' });

    if (spanDays > 0) {
      parts.push(`Over ${spanDays} day${spanDays > 1 ? 's' : ''} and ${logs.length} session${logs.length > 1 ? 's' : ''}, your longest was a ${longestSession}h ${longestDayOfWeek} marathon.`);
    } else if (logs.length > 1) {
      parts.push(`${logs.length} sessions so far, longest being ${longestSession}h.`);
    }
  }

  // Completion
  if (game.status === 'Completed') {
    if (game.rating >= 9) {
      parts.push(`Finished with a ${game.rating}/10 — one of your absolute favorites.`);
    } else if (game.rating >= 7) {
      parts.push(`Completed it with a solid ${game.rating}/10.`);
    } else {
      parts.push(`Saw it through to the end with a ${game.rating}/10.`);
    }
  } else if (game.status === 'Abandoned') {
    if (totalHours >= 20) {
      parts.push(`Abandoned after ${totalHours}h — it wasn't meant to be, despite a real effort.`);
    } else {
      parts.push(`Shelved after ${totalHours}h. Sometimes things just don't click.`);
    }
  }

  // Value context
  if (totalHours > 0 && game.price > 0) {
    const cph = metrics.costPerHour;
    if (cph < 1) {
      // Count how many games have lower CPH
      const cheaperCount = allGames.filter(g => {
        const h = getTotalHours(g);
        return h > 0 && g.price > 0 && calculateCostPerHour(g.price, h) < cph;
      }).length;
      if (cheaperCount <= 2) {
        parts.push(`At $${cph.toFixed(2)}/hr, this is one of the best deals in your entire library.`);
      } else {
        parts.push(`Cost just $${cph.toFixed(2)}/hr — excellent value.`);
      }
    } else if (cph > 10) {
      parts.push(`At $${cph.toFixed(2)}/hr, this one's still looking for its value.`);
    }
  }

  // Comparison flavor
  const ratedHigher = allGames.filter(g => g.rating > game.rating).length;
  const totalRated = allGames.filter(g => g.rating > 0).length;
  if (game.rating >= 9 && totalRated > 5) {
    const topCount = allGames.filter(g => g.rating >= game.rating).length;
    parts.push(`Only ${topCount} game${topCount > 1 ? 's' : ''} in your library rated this highly.`);
  } else if (game.rating <= 4 && totalRated > 5) {
    parts.push(`Rated lower than ${totalRated - ratedHigher - 1} other games in your collection.`);
  }

  return parts.join(' ');
}

// --- Game Verdicts ---

export interface GameVerdict {
  category: string;
  verdict: string;
  justification: string;
  color: string;
}

export function getGameVerdicts(game: Game, allGames: Game[]): GameVerdict[] {
  const totalHours = getTotalHours(game);
  const metrics = calculateMetrics(game);
  const verdicts: GameVerdict[] = [];

  // Value verdict
  if (totalHours > 0 && game.price > 0) {
    const cph = metrics.costPerHour;
    let verdict: string, justification: string, color: string;
    if (cph <= 0.5) { verdict = 'Absolute Steal'; justification = 'Less than $0.50/hr'; color = '#10b981'; }
    else if (cph <= 1) { verdict = 'Bargain'; justification = `$${cph.toFixed(2)}/hr — excellent`; color = '#10b981'; }
    else if (cph <= 3) { verdict = 'Fair Deal'; justification = `$${cph.toFixed(2)}/hr — solid value`; color = '#3b82f6'; }
    else if (cph <= 5) { verdict = 'Pricey'; justification = `$${cph.toFixed(2)}/hr — could be better`; color = '#f59e0b'; }
    else { verdict = 'Overpaid'; justification = `$${cph.toFixed(2)}/hr — ouch`; color = '#ef4444'; }
    verdicts.push({ category: 'Value', verdict, justification, color });
  } else if (game.acquiredFree) {
    verdicts.push({ category: 'Value', verdict: 'Free', justification: 'Literally free', color: '#10b981' });
  }

  // Commitment verdict
  {
    let verdict: string, justification: string, color: string;
    if (totalHours >= 100) { verdict = 'Life Partner'; justification = `${totalHours}h invested`; color = '#fbbf24'; }
    else if (totalHours >= 30) { verdict = 'Deep Dive'; justification = `${totalHours}h and counting`; color = '#3b82f6'; }
    else if (totalHours >= 10) { verdict = 'Solid Run'; justification = `${totalHours}h played`; color = '#10b981'; }
    else if (totalHours >= 2) { verdict = 'Casual Fling'; justification = `Only ${totalHours}h`; color = '#f59e0b'; }
    else { verdict = 'One Night Stand'; justification = totalHours > 0 ? `Just ${totalHours}h` : 'Never played'; color = '#ef4444'; }
    verdicts.push({ category: 'Commitment', verdict, justification, color });
  }

  // Library rank
  {
    const sorted = allGames
      .filter(g => getTotalHours(g) > 0)
      .sort((a, b) => {
        const aScore = a.rating * 10 + getTotalHours(a);
        const bScore = b.rating * 10 + getTotalHours(b);
        return bScore - aScore;
      });
    const rank = sorted.findIndex(g => g.id === game.id);
    const total = sorted.length;

    if (total > 0 && rank >= 0) {
      const pct = Math.round(((rank + 1) / total) * 100);
      let verdict: string, color: string;
      if (pct <= 10) { verdict = `Top ${pct}%`; color = '#fbbf24'; }
      else if (pct <= 25) { verdict = 'Above Average'; color = '#10b981'; }
      else if (pct <= 75) { verdict = 'Middle of the Pack'; color = '#6b7280'; }
      else { verdict = 'Bottom Shelf'; color = '#ef4444'; }
      verdicts.push({ category: 'In Your Library', verdict, justification: `#${rank + 1} of ${total} played`, color });
    }
  }

  // Would you buy again
  {
    let verdict: string, color: string, justification: string;
    if (game.rating >= 8 && (metrics.valueRating === 'Excellent' || metrics.valueRating === 'Good')) {
      verdict = 'In a heartbeat'; color = '#10b981'; justification = 'Great rating + great value';
    } else if (game.rating >= 7) {
      verdict = 'Probably'; color = '#3b82f6'; justification = 'Enjoyed it enough';
    } else if (game.rating >= 5 && totalHours >= 10) {
      verdict = 'Maybe on sale'; color = '#f59e0b'; justification = 'Got some hours, but...';
    } else if (game.status === 'Abandoned' || game.rating < 5) {
      verdict = 'Absolutely not'; color = '#ef4444'; justification = game.status === 'Abandoned' ? "Couldn't finish it" : 'Not worth it';
    } else {
      verdict = 'Undecided'; color = '#6b7280'; justification = 'Too early to tell';
    }
    verdicts.push({ category: 'Buy Again?', verdict, justification, color });
  }

  // The Vibe
  {
    let verdict: string, color: string, justification: string;
    if (totalHours >= 50 && game.rating >= 8) {
      verdict = 'Mind-blowing'; color = '#a855f7'; justification = 'High hours, high rating';
    } else if (totalHours >= 30 && game.rating < 6) {
      verdict = 'Guilty Pleasure'; color = '#f97316'; justification = 'Many hours despite low rating';
    } else if (game.rating >= 8 && totalHours < 10) {
      verdict = 'Hidden Gem'; color = '#22d3ee'; justification = 'Loved it but short';
    } else if (totalHours >= 20 && game.rating >= 6) {
      verdict = 'Comfort Food'; color = '#10b981'; justification = 'Reliable and satisfying';
    } else if (totalHours < 5 && game.rating < 5) {
      verdict = 'Forgettable'; color = '#6b7280'; justification = "Didn't make an impression";
    } else {
      verdict = 'Solid Pick'; color = '#3b82f6'; justification = 'A good time';
    }
    verdicts.push({ category: 'The Vibe', verdict, justification, color });
  }

  return verdicts;
}

// --- Game Journey ---

export interface JourneyMilestone {
  date: string;
  label: string;
  type: 'purchase' | 'start' | 'session' | 'milestone' | 'completion' | 'abandon';
  hours?: number;
  detail?: string;
  size: 'sm' | 'md' | 'lg'; // dot size
}

export function getGameJourney(game: Game): JourneyMilestone[] {
  const milestones: JourneyMilestone[] = [];

  // Purchase
  if (game.datePurchased) {
    milestones.push({
      date: game.datePurchased,
      label: game.acquiredFree ? 'Acquired free' : `Bought for $${game.price}`,
      type: 'purchase',
      size: 'md',
    });
  }

  // Start
  if (game.startDate) {
    milestones.push({
      date: game.startDate,
      label: 'Started playing',
      type: 'start',
      size: 'md',
    });
  }

  // Play sessions
  const logs = game.playLogs || [];
  let cumulativeHours = 0;
  const sortedLogs = [...logs].sort((a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime());
  const milestoneHours = new Set<number>();

  for (const log of sortedLogs) {
    const prevHours = cumulativeHours;
    cumulativeHours += log.hours;

    // Check for hour milestones
    const hourThresholds = [10, 25, 50, 100, 200, 500];
    for (const threshold of hourThresholds) {
      if (prevHours < threshold && cumulativeHours >= threshold && !milestoneHours.has(threshold)) {
        milestoneHours.add(threshold);
        milestones.push({
          date: log.date,
          label: `Hit ${threshold} hours`,
          type: 'milestone',
          hours: threshold,
          size: 'lg',
        });
      }
    }

    // Add session as a regular dot
    milestones.push({
      date: log.date,
      label: `${log.hours}h session`,
      type: 'session',
      hours: log.hours,
      detail: log.notes || undefined,
      size: log.hours >= 4 ? 'lg' : log.hours >= 2 ? 'md' : 'sm',
    });
  }

  // Completion or abandonment
  if (game.endDate) {
    if (game.status === 'Completed') {
      milestones.push({
        date: game.endDate,
        label: `Completed — ${game.rating}/10`,
        type: 'completion',
        size: 'lg',
      });
    } else if (game.status === 'Abandoned') {
      milestones.push({
        date: game.endDate,
        label: 'Abandoned',
        type: 'abandon',
        size: 'md',
      });
    }
  }

  // Sort by date, stable
  milestones.sort((a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime());

  // Deduplicate sessions that share a date with milestones
  // Keep milestones, remove the session entry for the same date if there's a milestone
  const milestoneDates = new Set(milestones.filter(m => m.type === 'milestone').map(m => m.date));
  return milestones.filter(m => !(m.type === 'session' && milestoneDates.has(m.date)));
}

// --- Card Info Enhancements ---

// Feature 1: Card Back Data (for card flip)
export interface CardBackData {
  whisper: string;
  sparkline: { date: string; hours: number }[];
  rank: { label: string; detail: string };
  nextMilestone: { name: string; icon: string; progress: number; target: number; label: string } | null;
  verdicts: { category: string; verdict: string; color: string }[];
}

export function getCardBackData(game: Game, allGames: Game[]): CardBackData {
  const totalHours = getTotalHours(game);
  const owned = allGames.filter(g => g.status !== 'Wishlist');
  const played = owned.filter(g => getTotalHours(g) > 0);

  // Whisper: pick most interesting contextual observation
  const whisper = getContextualWhisper(game, allGames).text;

  // Sparkline: last 30 days of sessions
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const logs = (game.playLogs || [])
    .filter(l => parseLocalDate(l.date).getTime() >= thirtyDaysAgo.getTime())
    .sort((a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime())
    .map(l => ({ date: l.date, hours: l.hours }));

  // Rank: by hours among played games
  const sortedByHours = [...played].sort((a, b) => getTotalHours(b) - getTotalHours(a));
  const hoursRank = sortedByHours.findIndex(g => g.id === game.id) + 1;
  const rank = totalHours > 0 && hoursRank > 0
    ? { label: `#${hoursRank} most played`, detail: `of ${played.length} games` }
    : { label: 'Unplayed', detail: `${owned.length} games in library` };

  // Next milestone for this game
  const hourThresholds = [10, 25, 50, 100, 200, 500];
  let nextMilestone: CardBackData['nextMilestone'] = null;
  for (const threshold of hourThresholds) {
    if (totalHours < threshold) {
      const progress = Math.min((totalHours / threshold) * 100, 99);
      const names: Record<number, string> = { 10: 'Getting Started', 25: 'Committed', 50: 'Half Century', 100: 'Century Club', 200: 'Deep Diver', 500: 'Life Game' };
      const icons: Record<number, string> = { 10: '🎯', 25: '📌', 50: '🏅', 100: '💯', 200: '🌊', 500: '🏆' };
      nextMilestone = {
        name: names[threshold] || `${threshold}h`,
        icon: icons[threshold] || '🎯',
        progress: Math.round(progress),
        target: threshold,
        label: `${Math.round(threshold - totalHours)}h to go`,
      };
      break;
    }
  }

  // If no hour milestone, check value tier milestone
  if (!nextMilestone && game.price > 0 && totalHours > 0) {
    const costPerHour = game.price / totalHours;
    const valueThresholds: { threshold: number; name: string; icon: string }[] = [
      { threshold: 5, name: 'Fair Value', icon: '📊' },
      { threshold: 3, name: 'Good Value', icon: '💎' },
      { threshold: 1, name: 'Excellent Value', icon: '🌟' },
    ];
    for (const vt of valueThresholds) {
      if (costPerHour > vt.threshold) {
        const hoursNeeded = (game.price / vt.threshold) - totalHours;
        nextMilestone = {
          name: vt.name,
          icon: vt.icon,
          progress: Math.round(Math.min((totalHours / (game.price / vt.threshold)) * 100, 99)),
          target: Math.round(game.price / vt.threshold),
          label: `${Math.round(hoursNeeded)}h to ${vt.name}`,
        };
        break;
      }
    }
  }

  // Quick verdicts (top 3 from getGameVerdicts)
  const fullVerdicts = getGameVerdicts(game, allGames);
  const verdicts = fullVerdicts.slice(0, 3).map(v => ({
    category: v.category,
    verdict: v.verdict,
    color: v.color,
  }));

  return { whisper, sparkline: logs, rank, nextMilestone, verdicts };
}

// Feature 2: Contextual AI Whisper
export interface ContextualWhisperData {
  text: string;
  type: string;
  priority: number;
}

export function getContextualWhisper(game: Game, allGames: Game[]): ContextualWhisperData {
  const totalHours = getTotalHours(game);
  const owned = allGames.filter(g => g.status !== 'Wishlist');
  const played = owned.filter(g => getTotalHours(g) > 0 && g.price > 0);
  const candidates: ContextualWhisperData[] = [];

  // Value trajectory whisper
  if (game.price > 0 && totalHours > 0 && game.playLogs && game.playLogs.length >= 2) {
    const sorted = [...game.playLogs].sort((a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime());
    const firstSessionHours = sorted[0].hours;
    const cphAfterFirst = firstSessionHours > 0 ? game.price / firstSessionHours : 0;
    const cphNow = game.price / totalHours;
    if (cphAfterFirst > 5 && cphNow < 3) {
      candidates.push({ text: `Was $${cphAfterFirst.toFixed(0)}/hr after session 1, now $${cphNow.toFixed(2)}/hr`, type: 'value', priority: 8 });
    }
  }

  // Streak context
  const streak = getGameStreak(game);
  if (streak.isActive && streak.days >= 3) {
    const allStreaks = allGames.map(g => getGameStreak(g)).filter(s => s.isActive);
    const longestActive = allStreaks.reduce((max, s) => s.days > max.days ? s : max, { days: 0, level: 'none' as const, isActive: false });
    if (longestActive.days === streak.days) {
      candidates.push({ text: `Day ${streak.days} — your longest active streak right now`, type: 'streak', priority: 9 });
    } else {
      candidates.push({ text: `${streak.days}-day streak and counting`, type: 'streak', priority: 6 });
    }
  }

  // Comparative: platform hours
  if (game.platform && totalHours > 0) {
    const platformGames = owned.filter(g => g.platform === game.platform && g.id !== game.id);
    const platformHours = platformGames.reduce((s, g) => s + getTotalHours(g), 0);
    if (totalHours > platformHours && platformGames.length >= 2) {
      candidates.push({ text: `More hours than your entire ${game.platform} library combined`, type: 'comparative', priority: 9 });
    }
  }

  // Milestone proximity
  const hourThresholds = [10, 25, 50, 100, 200, 500];
  for (const threshold of hourThresholds) {
    const remaining = threshold - totalHours;
    if (remaining > 0 && remaining <= threshold * 0.2) {
      const names: Record<number, string> = { 100: 'Century Club', 200: 'Deep Diver', 500: 'Life Game' };
      const name = names[threshold] || `${threshold}h`;
      candidates.push({ text: `${Math.round(remaining)} more hours to hit ${name}`, type: 'milestone', priority: 7 });
      break;
    }
  }

  // Neglect nudge
  if (game.playLogs && game.playLogs.length > 0 && game.status !== 'Completed' && game.status !== 'Abandoned') {
    const sorted = [...game.playLogs].sort((a, b) => parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime());
    const daysSince = Math.floor((Date.now() - parseLocalDate(sorted[0].date).getTime()) / (24 * 60 * 60 * 1000));
    if (daysSince >= 30) {
      candidates.push({ text: `Last played ${daysSince} days ago — missing this one?`, type: 'neglect', priority: 5 });
    }
  }

  // Hours percentile
  if (totalHours > 0 && played.length >= 5) {
    const sortedByHours = [...played].sort((a, b) => getTotalHours(b) - getTotalHours(a));
    const rank = sortedByHours.findIndex(g => g.id === game.id) + 1;
    const percentile = Math.round((1 - rank / played.length) * 100);
    if (percentile >= 90) {
      candidates.push({ text: `Top ${100 - percentile}% most played in your library`, type: 'rank', priority: 7 });
    }
  }

  // Rating context
  if (game.rating >= 9 && totalHours >= 5) {
    const nineOrAbove = owned.filter(g => g.rating >= 9);
    candidates.push({ text: `One of only ${nineOrAbove.length} game${nineOrAbove.length === 1 ? '' : 's'} you've rated 9+`, type: 'rating', priority: 6 });
  }

  // Sort by priority, pick highest
  candidates.sort((a, b) => b.priority - a.priority);
  return candidates[0] || { text: '', type: 'none', priority: 0 };
}

// Feature 4: Library Rank Badge
export interface LibraryRankData {
  rank: number;
  total: number;
  percentile: number;
  label: string;
}

export function getLibraryRank(game: Game, allGames: Game[], sortBy: string): LibraryRankData {
  const owned = allGames.filter(g => g.status !== 'Wishlist');
  if (owned.length === 0) return { rank: 0, total: 0, percentile: 0, label: '-' };

  let sorted: Game[];
  switch (sortBy) {
    case 'hours':
      sorted = [...owned].sort((a, b) => getTotalHours(b) - getTotalHours(a));
      break;
    case 'price':
      sorted = [...owned].sort((a, b) => b.price - a.price);
      break;
    case 'rating':
      sorted = [...owned].sort((a, b) => b.rating - a.rating);
      break;
    case 'value': {
      const withValue = owned.filter(g => getTotalHours(g) > 0 && g.price > 0);
      sorted = [...withValue].sort((a, b) => (a.price / getTotalHours(a)) - (b.price / getTotalHours(b)));
      break;
    }
    default:
      sorted = [...owned].sort((a, b) => getTotalHours(b) - getTotalHours(a));
  }

  const rank = sorted.findIndex(g => g.id === game.id) + 1;
  const total = sorted.length;
  const percentile = total > 0 ? Math.round((1 - (rank - 1) / total) * 100) : 0;

  let label: string;
  if (rank === 0) {
    label = '-';
  } else if (rank <= 3) {
    label = `#${rank}`;
  } else if (percentile >= 90) {
    label = `Top ${100 - percentile + 1}%`;
  } else {
    label = `#${rank}`;
  }

  return { rank, total, percentile, label };
}

// Feature 6: Mood Pulse Color Strip
export interface CardMoodPulseData {
  level: 'obsessed' | 'consistent' | 'casual' | 'dormant' | 'never';
  color: string;
  label: string;
}

export function getCardMoodPulse(game: Game): CardMoodPulseData {
  const logs = game.playLogs || [];
  if (logs.length === 0) return { level: 'never', color: 'transparent', label: 'Never played' };

  const now = Date.now();
  const msPerDay = 24 * 60 * 60 * 1000;
  const recentLogs = logs.filter(l => (now - parseLocalDate(l.date).getTime()) <= 7 * msPerDay);
  const weeklyLogs = logs.filter(l => {
    const diff = now - parseLocalDate(l.date).getTime();
    return diff <= 14 * msPerDay;
  });

  const uniqueDaysThisWeek = new Set(recentLogs.map(l => l.date)).size;
  const uniqueDaysLast2Weeks = new Set(weeklyLogs.map(l => l.date)).size;

  if (uniqueDaysThisWeek >= 4) {
    return { level: 'obsessed', color: '#f43f5e', label: 'Obsessed' };
  }
  if (uniqueDaysLast2Weeks >= 4) {
    return { level: 'consistent', color: '#f59e0b', label: 'Consistent' };
  }
  if (uniqueDaysLast2Weeks >= 1) {
    return { level: 'casual', color: '#3b82f6', label: 'Casual' };
  }
  return { level: 'dormant', color: '#4b5563', label: 'Dormant' };
}

// Feature 5: Progress Ring Data
export interface ProgressRingData {
  progress: number; // 0-100
  color: string;
  label: string;
}

export function getProgressRingData(game: Game, allGames: Game[]): ProgressRingData {
  const totalHours = getTotalHours(game);

  // For In Progress games: use completion probability
  if (game.status === 'In Progress') {
    const prob = getCompletionProbability(game, allGames);
    return {
      progress: Math.round(prob.probability),
      color: prob.probability >= 70 ? '#10b981' : prob.probability >= 40 ? '#f59e0b' : '#ef4444',
      label: `${Math.round(prob.probability)}% likely to complete`,
    };
  }

  // For paid games: progress toward next value tier
  if (game.price > 0 && totalHours > 0) {
    const costPerHour = game.price / totalHours;
    if (costPerHour > 1) {
      const hoursForExcellent = game.price / 1;
      const progress = Math.min((totalHours / hoursForExcellent) * 100, 100);
      return {
        progress: Math.round(progress),
        color: '#3b82f6',
        label: `${Math.round(progress)}% to Excellent value`,
      };
    }
    return { progress: 100, color: '#10b981', label: 'Excellent value' };
  }

  return { progress: 0, color: '#4b5563', label: '' };
}

// ==========================================================================
// Stats Overhaul — 28 New Stats
// ==========================================================================

// --- Composite Scores & Dashboards ---

// Stat 1: Gaming Credit Score (300-850)
export interface GamingCreditScoreData {
  score: number;
  label: string;
  factors: { played: number; value: number; completion: number; regret: number };
  color: string;
}

export function getGamingCreditScore(games: Game[]): GamingCreditScoreData {
  const owned = games.filter(g => g.status !== 'Wishlist');
  if (owned.length === 0) return { score: 550, label: 'Average', factors: { played: 0, value: 0, completion: 0, regret: 0 }, color: '#f59e0b' };

  // Factor 1: % of library actually played (30% weight)
  const played = owned.filter(g => getTotalHours(g) > 0);
  const playedPct = played.length / owned.length;
  const playedScore = playedPct * 100;

  // Factor 2: Average cost-per-hour — lower is better (25% weight)
  const paidPlayed = played.filter(g => g.price > 0);
  const avgCph = paidPlayed.length > 0
    ? paidPlayed.reduce((s, g) => s + g.price / getTotalHours(g), 0) / paidPlayed.length
    : 5;
  const valueScore = Math.max(0, Math.min(100, 100 - (avgCph - 0.5) * 12));

  // Factor 3: Completion rate (25% weight)
  const completed = owned.filter(g => g.status === 'Completed');
  const started = owned.filter(g => g.status !== 'Not Started');
  const completionRate = started.length > 0 ? completed.length / started.length : 0;
  const completionScore = completionRate * 100;

  // Factor 4: Regret rate — low = good (20% weight)
  const regrets = owned.filter(g => {
    const hours = getTotalHours(g);
    return g.price > 20 && hours < 2 && g.status !== 'Not Started';
  });
  const regretRate = owned.length > 0 ? regrets.length / owned.length : 0;
  const regretScore = Math.max(0, (1 - regretRate * 5) * 100);

  const rawScore = playedScore * 0.3 + valueScore * 0.25 + completionScore * 0.25 + regretScore * 0.2;
  const score = Math.round(300 + (rawScore / 100) * 550);
  const clamped = Math.max(300, Math.min(850, score));

  let label: string, color: string;
  if (clamped >= 750) { label = 'Excellent Spender'; color = '#10b981'; }
  else if (clamped >= 650) { label = 'Smart Buyer'; color = '#3b82f6'; }
  else if (clamped >= 550) { label = 'Average'; color = '#f59e0b'; }
  else if (clamped >= 450) { label = 'Impulse Risk'; color = '#f97316'; }
  else { label = 'Needs Work'; color = '#ef4444'; }

  return { score: clamped, label, factors: { played: Math.round(playedScore), value: Math.round(valueScore), completion: Math.round(completionScore), regret: Math.round(regretScore) }, color };
}

// Stat 2: Completion Funnel
export interface CompletionFunnelData {
  stages: { label: string; count: number; percentage: number; dropoff: number }[];
}

export function getCompletionFunnel(games: Game[]): CompletionFunnelData {
  const owned = games.filter(g => g.status !== 'Wishlist');
  const total = owned.length;
  if (total === 0) return { stages: [] };

  const started = owned.filter(g => getTotalHours(g) > 0);
  const past10h = owned.filter(g => getTotalHours(g) >= 10);
  const past50pct = owned.filter(g => {
    const hours = getTotalHours(g);
    return hours >= 20; // rough estimate of "50% through"
  });
  const completed = owned.filter(g => g.status === 'Completed');

  const stages = [
    { label: 'Games Owned', count: total },
    { label: 'Started', count: started.length },
    { label: 'Past 10h', count: past10h.length },
    { label: 'Deep In (20h+)', count: past50pct.length },
    { label: 'Completed', count: completed.length },
  ];

  return {
    stages: stages.map((s, i) => ({
      ...s,
      percentage: total > 0 ? Math.round((s.count / total) * 100) : 0,
      dropoff: i > 0 ? Math.round(((stages[i - 1].count - s.count) / Math.max(stages[i - 1].count, 1)) * 100) : 0,
    })),
  };
}

// Stat 3: The 80/20 Rule (Pareto Lite)
export interface Pareto8020Data {
  topPercent: number;
  hoursPercent: number;
  topGames: { name: string; hours: number }[];
  cumulativeData: { game: string; cumulativePct: number }[];
}

export function getPareto8020(games: Game[]): Pareto8020Data {
  const played = games.filter(g => g.status !== 'Wishlist' && getTotalHours(g) > 0);
  if (played.length === 0) return { topPercent: 0, hoursPercent: 0, topGames: [], cumulativeData: [] };

  const sorted = [...played].sort((a, b) => getTotalHours(b) - getTotalHours(a));
  const totalHours = sorted.reduce((s, g) => s + getTotalHours(g), 0);

  let cumulative = 0;
  let topCount = 0;
  for (const g of sorted) {
    cumulative += getTotalHours(g);
    topCount++;
    if (cumulative >= totalHours * 0.8) break;
  }

  const topPercent = Math.round((topCount / played.length) * 100);
  const topGames = sorted.slice(0, Math.min(5, topCount)).map(g => ({ name: g.name, hours: getTotalHours(g) }));

  let runningTotal = 0;
  const cumulativeData = sorted.slice(0, 10).map(g => {
    runningTotal += getTotalHours(g);
    return { game: g.name, cumulativePct: Math.round((runningTotal / totalHours) * 100) };
  });

  return { topPercent, hoursPercent: 80, topGames, cumulativeData };
}

// Stat 8: Library Health Dashboard
export interface LibraryHealthData {
  activeRate: number;
  completionRate: number;
  abandonmentRate: number;
  dustRate: number;
}

export function getLibraryHealth(games: Game[]): LibraryHealthData {
  const owned = games.filter(g => g.status !== 'Wishlist');
  if (owned.length === 0) return { activeRate: 0, completionRate: 0, abandonmentRate: 0, dustRate: 0 };

  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

  const active = owned.filter(g => {
    const logs = g.playLogs || [];
    return logs.some(l => parseLocalDate(l.date).getTime() >= thirtyDaysAgo);
  });
  const completed = owned.filter(g => g.status === 'Completed');
  const abandoned = owned.filter(g => g.status === 'Abandoned');
  const dusty = owned.filter(g => {
    if (g.status === 'Completed' || g.status === 'Abandoned') return false;
    const logs = g.playLogs || [];
    if (logs.length === 0) return true;
    const latest = Math.max(...logs.map(l => parseLocalDate(l.date).getTime()));
    return (now - latest) > 60 * 24 * 60 * 60 * 1000;
  });

  const total = owned.length;
  return {
    activeRate: Math.round((active.length / total) * 100),
    completionRate: Math.round((completed.length / total) * 100),
    abandonmentRate: Math.round((abandoned.length / total) * 100),
    dustRate: Math.round((dusty.length / total) * 100),
  };
}

// --- Play Style Analysis ---

// Stat 4: Game Length Sweet Spot
export interface GameLengthBracket {
  label: string;
  range: string;
  count: number;
  avgRating: number;
  completionRate: number;
  avgCostPerHour: number;
}

export function getGameLengthSweetSpot(games: Game[]): { brackets: GameLengthBracket[]; bestBracket: string } {
  const owned = games.filter(g => g.status !== 'Wishlist' && getTotalHours(g) > 0);
  const brackets: { label: string; range: string; min: number; max: number }[] = [
    { label: 'Quick', range: '<10h', min: 0, max: 10 },
    { label: 'Medium', range: '10-30h', min: 10, max: 30 },
    { label: 'Long', range: '30-60h', min: 30, max: 60 },
    { label: 'Epic', range: '60h+', min: 60, max: Infinity },
  ];

  const result = brackets.map(b => {
    const inBracket = owned.filter(g => {
      const h = getTotalHours(g);
      return h >= b.min && h < b.max;
    });
    const completed = inBracket.filter(g => g.status === 'Completed');
    const paid = inBracket.filter(g => g.price > 0);
    return {
      label: b.label,
      range: b.range,
      count: inBracket.length,
      avgRating: inBracket.length > 0 ? Math.round((inBracket.reduce((s, g) => s + g.rating, 0) / inBracket.length) * 10) / 10 : 0,
      completionRate: inBracket.length > 0 ? Math.round((completed.length / inBracket.length) * 100) : 0,
      avgCostPerHour: paid.length > 0 ? Math.round((paid.reduce((s, g) => s + g.price / getTotalHours(g), 0) / paid.length) * 100) / 100 : 0,
    };
  });

  const best = result.filter(b => b.count >= 2).sort((a, b) => b.avgRating - a.avgRating)[0];
  return { brackets: result, bestBracket: best?.label || 'N/A' };
}

// Stat 5: Money Efficiency Trend
export interface MoneyEfficiencyData {
  quarters: { period: string; avgCostPerHour: number }[];
  trend: 'improving' | 'declining' | 'stable';
  improvement: number;
}

export function getMoneyEfficiencyTrend(games: Game[]): MoneyEfficiencyData {
  const paidGames = games.filter(g => g.status !== 'Wishlist' && g.datePurchased && g.price > 0 && getTotalHours(g) > 0);
  if (paidGames.length < 3) return { quarters: [], trend: 'stable', improvement: 0 };

  const byQuarter: Record<string, Game[]> = {};
  paidGames.forEach(g => {
    const d = parseLocalDate(g.datePurchased!);
    const q = `Q${Math.ceil((d.getMonth() + 1) / 3)} ${d.getFullYear()}`;
    if (!byQuarter[q]) byQuarter[q] = [];
    byQuarter[q].push(g);
  });

  const quarters = Object.entries(byQuarter)
    .map(([period, gs]) => ({
      period,
      avgCostPerHour: Math.round((gs.reduce((s, g) => s + g.price / getTotalHours(g), 0) / gs.length) * 100) / 100,
    }))
    .sort((a, b) => a.period.localeCompare(b.period));

  if (quarters.length < 2) return { quarters, trend: 'stable', improvement: 0 };

  const first = quarters[0].avgCostPerHour;
  const last = quarters[quarters.length - 1].avgCostPerHour;
  const improvement = first > 0 ? Math.round(((first - last) / first) * 100) : 0;
  const trend = improvement > 10 ? 'improving' : improvement < -10 ? 'declining' : 'stable';

  return { quarters, trend, improvement };
}

// Stat 6: Return Rate / Comeback Analysis
export interface ReturnRateData {
  returnRate: number;
  totalGapped: number;
  returnedCount: number;
  topComebacks: { name: string; gapDays: number }[];
}

export function getReturnRate(games: Game[]): ReturnRateData {
  const gamesWithLogs = games.filter(g => g.playLogs && g.playLogs.length >= 2 && g.status !== 'Wishlist');
  let totalGapped = 0;
  let returnedCount = 0;
  const comebacks: { name: string; gapDays: number }[] = [];

  for (const game of gamesWithLogs) {
    const sorted = [...game.playLogs!].sort((a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime());
    let hadBigGap = false;
    let returnedAfterGap = false;
    let maxGap = 0;

    for (let i = 1; i < sorted.length; i++) {
      const gap = (parseLocalDate(sorted[i].date).getTime() - parseLocalDate(sorted[i - 1].date).getTime()) / (24 * 60 * 60 * 1000);
      if (gap >= 30) {
        hadBigGap = true;
        maxGap = Math.max(maxGap, gap);
        if (i < sorted.length - 1 || gap < 90) returnedAfterGap = true;
      }
    }

    if (hadBigGap) {
      totalGapped++;
      if (returnedAfterGap) {
        returnedCount++;
        comebacks.push({ name: game.name, gapDays: Math.round(maxGap) });
      }
    }
  }

  comebacks.sort((a, b) => b.gapDays - a.gapDays);
  return {
    returnRate: totalGapped > 0 ? Math.round((returnedCount / totalGapped) * 100) : 0,
    totalGapped,
    returnedCount,
    topComebacks: comebacks.slice(0, 3),
  };
}

// Stat 7: Session Consistency Score
export interface SessionConsistencyData {
  score: number;
  label: string;
  avgGap: number;
  pattern: 'metronome' | 'rhythm' | 'burst' | 'chaos';
}

export function getSessionConsistency(games: Game[]): SessionConsistencyData {
  const allLogs = getAllPlayLogs(games);
  if (allLogs.length < 5) return { score: 0, label: 'Not enough data', avgGap: 0, pattern: 'chaos' };

  const dates = [...new Set(allLogs.map(l => l.log.date))].sort();
  const gaps: number[] = [];
  for (let i = 1; i < dates.length; i++) {
    gaps.push((parseLocalDate(dates[i]).getTime() - parseLocalDate(dates[i - 1]).getTime()) / (24 * 60 * 60 * 1000));
  }

  const avgGap = gaps.reduce((s, g) => s + g, 0) / gaps.length;
  const variance = gaps.reduce((s, g) => s + (g - avgGap) ** 2, 0) / gaps.length;
  const stdDev = Math.sqrt(variance);
  const cv = avgGap > 0 ? stdDev / avgGap : 10;

  let pattern: SessionConsistencyData['pattern'], label: string, score: number;
  if (cv < 0.5) { pattern = 'metronome'; label = 'Metronome'; score = 95; }
  else if (cv < 1.0) { pattern = 'rhythm'; label = 'Rhythm Player'; score = 75; }
  else if (cv < 2.0) { pattern = 'burst'; label = 'Burst Gamer'; score = 50; }
  else { pattern = 'chaos'; label = 'Chaos Mode'; score = 25; }

  return { score, label, avgGap: Math.round(avgGap * 10) / 10, pattern };
}

// --- Spending Psychology ---

// Stat 9: The Impulse Tax
export interface ImpulseTaxData {
  total: number;
  gameCount: number;
  percentOfSpend: number;
  games: { name: string; price: number; hours: number }[];
}

export function getImpulseTax(games: Game[], year?: number): ImpulseTaxData {
  let owned = games.filter(g => g.status !== 'Wishlist' && !g.acquiredFree && g.price > 0);
  if (year) {
    owned = owned.filter(g => g.datePurchased && parseLocalDate(g.datePurchased).getFullYear() === year);
  }

  const impulseGames = owned.filter(g => {
    const hours = getTotalHours(g);
    return hours < 2 && hours > 0;
  });

  const total = impulseGames.reduce((s, g) => s + g.price, 0);
  const totalSpend = owned.reduce((s, g) => s + g.price, 0);

  return {
    total: Math.round(total * 100) / 100,
    gameCount: impulseGames.length,
    percentOfSpend: totalSpend > 0 ? Math.round((total / totalSpend) * 100) : 0,
    games: impulseGames.sort((a, b) => b.price - a.price).slice(0, 5).map(g => ({ name: g.name, price: g.price, hours: getTotalHours(g) })),
  };
}

// Stat 10: Purchase Rhythm Detector
export interface PurchaseRhythmData {
  type: string;
  avgGap: number;
  daysSinceLast: number;
  clusters: { start: string; count: number }[];
}

export function getPurchaseRhythm(games: Game[]): PurchaseRhythmData {
  const withDates = games.filter(g => g.datePurchased && g.status !== 'Wishlist')
    .sort((a, b) => parseLocalDate(a.datePurchased!).getTime() - parseLocalDate(b.datePurchased!).getTime());

  if (withDates.length < 3) return { type: 'Not enough data', avgGap: 0, daysSinceLast: 0, clusters: [] };

  const dates = withDates.map(g => parseLocalDate(g.datePurchased!));
  const gaps: number[] = [];
  for (let i = 1; i < dates.length; i++) {
    gaps.push((dates[i].getTime() - dates[i - 1].getTime()) / (24 * 60 * 60 * 1000));
  }

  const avgGap = gaps.reduce((s, g) => s + g, 0) / gaps.length;
  const daysSinceLast = Math.round((Date.now() - dates[dates.length - 1].getTime()) / (24 * 60 * 60 * 1000));

  // Detect clusters (3+ purchases within 7 days)
  const clusters: { start: string; count: number }[] = [];
  let clusterStart = 0;
  for (let i = 1; i < dates.length; i++) {
    const gap = (dates[i].getTime() - dates[clusterStart].getTime()) / (24 * 60 * 60 * 1000);
    if (gap > 7) {
      if (i - clusterStart >= 3) {
        clusters.push({ start: withDates[clusterStart].datePurchased!, count: i - clusterStart });
      }
      clusterStart = i;
    }
  }
  if (dates.length - clusterStart >= 3) {
    clusters.push({ start: withDates[clusterStart].datePurchased!, count: dates.length - clusterStart });
  }

  const stdDev = Math.sqrt(gaps.reduce((s, g) => s + (g - avgGap) ** 2, 0) / gaps.length);
  const cv = avgGap > 0 ? stdDev / avgGap : 0;

  let type: string;
  if (clusters.length >= 2 && cv > 1.5) type = 'Binge Buyer';
  else if (cv < 0.6) type = 'Steady Drip';
  else if (clusters.length >= 1) type = 'Sale Chaser';
  else type = 'Drought Breaker';

  return { type, avgGap: Math.round(avgGap), daysSinceLast, clusters };
}

// Stat 11: Price Creep / Price Discipline
export interface PriceCreepData {
  trend: 'up' | 'down' | 'stable';
  quarterlyAvgPrice: { period: string; avg: number }[];
  direction: string;
  change: number;
}

export function getPriceCreep(games: Game[]): PriceCreepData {
  const withDates = games.filter(g => g.datePurchased && g.status !== 'Wishlist' && !g.acquiredFree && g.price > 0);
  if (withDates.length < 4) return { trend: 'stable', quarterlyAvgPrice: [], direction: 'Not enough data', change: 0 };

  const byQ: Record<string, number[]> = {};
  withDates.forEach(g => {
    const d = parseLocalDate(g.datePurchased!);
    const q = `Q${Math.ceil((d.getMonth() + 1) / 3)} ${d.getFullYear()}`;
    if (!byQ[q]) byQ[q] = [];
    byQ[q].push(g.price);
  });

  const quarterly = Object.entries(byQ)
    .map(([period, prices]) => ({ period, avg: Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 100) / 100 }))
    .sort((a, b) => a.period.localeCompare(b.period));

  if (quarterly.length < 2) return { trend: 'stable', quarterlyAvgPrice: quarterly, direction: 'Not enough data', change: 0 };

  const first = quarterly[0].avg;
  const last = quarterly[quarterly.length - 1].avg;
  const change = first > 0 ? Math.round(((last - first) / first) * 100) : 0;
  const trend = change > 15 ? 'up' : change < -15 ? 'down' : 'stable';
  const direction = trend === 'up' ? 'Prices rising' : trend === 'down' ? 'Getting thriftier' : 'Stable spending';

  return { trend, quarterlyAvgPrice: quarterly, direction, change };
}

// --- Behavioral Patterns ---

// Stat 12: "Just One More Hour" Sticky Games
export interface StickyGamesData {
  games: { name: string; avgSession: number; multiplier: number }[];
  overallAvgSession: number;
}

export function getStickyGames(games: Game[]): StickyGamesData {
  const withLogs = games.filter(g => g.playLogs && g.playLogs.length >= 3 && g.status !== 'Wishlist');
  const allLogs = getAllPlayLogs(games);
  const overallAvg = allLogs.length > 0 ? allLogs.reduce((s, l) => s + l.log.hours, 0) / allLogs.length : 1;

  const results = withLogs.map(g => {
    const avg = g.playLogs!.reduce((s, l) => s + l.hours, 0) / g.playLogs!.length;
    return { name: g.name, avgSession: Math.round(avg * 10) / 10, multiplier: Math.round((avg / overallAvg) * 10) / 10 };
  }).filter(g => g.multiplier >= 1.5).sort((a, b) => b.multiplier - a.multiplier);

  return { games: results.slice(0, 5), overallAvgSession: Math.round(overallAvg * 10) / 10 };
}

// Stat 13: Attention Span Spectrum
export interface AttentionSpanData {
  buckets: { label: string; count: number; percent: number }[];
  dominantType: string;
}

export function getAttentionSpanSpectrum(games: Game[]): AttentionSpanData {
  const playedGames = games.filter(g => g.status !== 'Wishlist' && g.playLogs && g.playLogs.length > 0);

  const categorize = (game: Game): string => {
    const logs = [...(game.playLogs || [])].sort((a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime());
    if (logs.length < 2) return 'Quick Fling';
    const firstDate = parseLocalDate(logs[0].date).getTime();
    const lastDate = parseLocalDate(logs[logs.length - 1].date).getTime();
    const days = (lastDate - firstDate) / (24 * 60 * 60 * 1000);
    if (days < 7) return 'Quick Fling';
    if (days < 28) return 'Short Affair';
    if (days < 90) return 'Steady Relationship';
    return 'Long-Term Commitment';
  };

  const labels = ['Quick Fling', 'Short Affair', 'Steady Relationship', 'Long-Term Commitment'];
  const counts: Record<string, number> = {};
  labels.forEach(l => counts[l] = 0);
  playedGames.forEach(g => { const cat = categorize(g); counts[cat] = (counts[cat] || 0) + 1; });

  const total = playedGames.length || 1;
  const buckets = labels.map(l => ({ label: l, count: counts[l], percent: Math.round((counts[l] / total) * 100) }));
  const dominant = buckets.sort((a, b) => b.count - a.count)[0];

  return { buckets, dominantType: dominant?.label || 'Unknown' };
}

// Stat 14: Sunk Cost Hall of Shame
export interface SunkCostData {
  games: { name: string; hours: number; rating: number; regretHours: number }[];
}

export function getSunkCostGames(games: Game[]): SunkCostData {
  const candidates = games.filter(g => g.status !== 'Wishlist' && g.rating > 0 && g.rating <= 6 && getTotalHours(g) >= 5);
  const ranked = candidates.map(g => ({
    name: g.name,
    hours: getTotalHours(g),
    rating: g.rating,
    regretHours: Math.round(getTotalHours(g) * (10 - g.rating)),
  })).sort((a, b) => b.regretHours - a.regretHours);

  return { games: ranked.slice(0, 5) };
}

// Stat 15: The Replacement Chain
export interface ReplacementChainData {
  chains: { abandoned: string; replacement: string; gapDays: number }[];
  biggestAttractor: string;
}

export function getReplacementChains(games: Game[]): ReplacementChainData {
  const ghosted = games.filter(g => (g.status === 'Abandoned' || g.status === 'In Progress') && g.playLogs && g.playLogs.length > 0);
  const chains: { abandoned: string; replacement: string; gapDays: number }[] = [];

  for (const game of ghosted) {
    const logs = [...game.playLogs!].sort((a, b) => parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime());
    const lastPlayDate = parseLocalDate(logs[0].date);
    const now = Date.now();
    const daysSinceLast = (now - lastPlayDate.getTime()) / (24 * 60 * 60 * 1000);

    if (daysSinceLast < 30) continue;

    // Find games started within 7 days after this game's last session
    const replacements = games.filter(g => {
      if (g.id === game.id || !g.startDate) return false;
      const startTime = parseLocalDate(g.startDate).getTime();
      const gap = (startTime - lastPlayDate.getTime()) / (24 * 60 * 60 * 1000);
      return gap >= 0 && gap <= 7;
    });

    for (const r of replacements) {
      chains.push({
        abandoned: game.name,
        replacement: r.name,
        gapDays: Math.round((parseLocalDate(r.startDate!).getTime() - lastPlayDate.getTime()) / (24 * 60 * 60 * 1000)),
      });
    }
  }

  // Find the biggest attractor
  const attractorCounts: Record<string, number> = {};
  chains.forEach(c => { attractorCounts[c.replacement] = (attractorCounts[c.replacement] || 0) + 1; });
  const biggest = Object.entries(attractorCounts).sort((a, b) => b[1] - a[1])[0];

  return { chains: chains.slice(0, 5), biggestAttractor: biggest?.[0] || 'None' };
}

// Stat 16: Finishing Sprint Score
export interface FinishingSprintData {
  avgSprintPercent: number;
  sprintFinishers: number;
  steadyFinishers: number;
}

export function getFinishingSprintScore(games: Game[]): FinishingSprintData {
  const completed = games.filter(g => g.status === 'Completed' && g.playLogs && g.playLogs.length >= 3 && g.endDate);
  if (completed.length === 0) return { avgSprintPercent: 0, sprintFinishers: 0, steadyFinishers: 0 };

  let totalSprintPct = 0;
  let sprintCount = 0;
  let steadyCount = 0;

  for (const game of completed) {
    const endDate = parseLocalDate(game.endDate!);
    const weekBefore = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    const totalHours = game.playLogs!.reduce((s, l) => s + l.hours, 0);
    const lastWeekHours = game.playLogs!.filter(l => parseLocalDate(l.date).getTime() >= weekBefore.getTime()).reduce((s, l) => s + l.hours, 0);
    const sprintPct = totalHours > 0 ? (lastWeekHours / totalHours) * 100 : 0;

    totalSprintPct += sprintPct;
    if (sprintPct >= 40) sprintCount++;
    else steadyCount++;
  }

  return {
    avgSprintPercent: Math.round(totalSprintPct / completed.length),
    sprintFinishers: sprintCount,
    steadyFinishers: steadyCount,
  };
}

// --- Time & Engagement ---

// Stat 17: Dopamine Curve
export type DopaminePattern = 'honeymoon' | 'slow_burn' | 'steady_love' | 'spike_crash' | 'revival';

export interface DopamineCurveData {
  pattern: DopaminePattern;
  sessionTrend: number[];
}

export function getDopamineCurve(game: Game): DopamineCurveData {
  const logs = game.playLogs || [];
  if (logs.length < 3) return { pattern: 'steady_love', sessionTrend: logs.map(l => l.hours) };

  const sorted = [...logs].sort((a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime());
  const hours = sorted.map(l => l.hours);
  const mid = Math.floor(hours.length / 2);
  const firstHalf = hours.slice(0, mid);
  const secondHalf = hours.slice(mid);
  const firstAvg = firstHalf.reduce((s, h) => s + h, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((s, h) => s + h, 0) / secondHalf.length;

  // Check for revival (big gap then comeback)
  const dates = sorted.map(l => parseLocalDate(l.date).getTime());
  let hasGap = false;
  for (let i = 1; i < dates.length; i++) {
    if ((dates[i] - dates[i - 1]) > 30 * 24 * 60 * 60 * 1000) { hasGap = true; break; }
  }

  // Check for spike & crash
  const maxSession = Math.max(...hours);
  const avgSession = hours.reduce((s, h) => s + h, 0) / hours.length;
  const hasMassiveSpike = maxSession > avgSession * 3;

  let pattern: DopaminePattern;
  if (hasGap && secondAvg >= firstAvg * 0.8) pattern = 'revival';
  else if (hasMassiveSpike && hours.indexOf(maxSession) < mid) pattern = 'spike_crash';
  else if (firstAvg > secondAvg * 1.3) pattern = 'honeymoon';
  else if (secondAvg > firstAvg * 1.3) pattern = 'slow_burn';
  else pattern = 'steady_love';

  return { pattern, sessionTrend: hours };
}

export function getLibraryDopamineProfile(games: Game[]): { dominantPattern: string; distribution: { pattern: string; count: number }[] } {
  const withLogs = games.filter(g => g.playLogs && g.playLogs.length >= 3 && g.status !== 'Wishlist');
  const counts: Record<string, number> = {};
  const labels: Record<DopaminePattern, string> = {
    honeymoon: 'Honeymoon', slow_burn: 'Slow Burn', steady_love: 'Steady Love',
    spike_crash: 'Spike & Crash', revival: 'Revival',
  };

  for (const g of withLogs) {
    const curve = getDopamineCurve(g);
    counts[curve.pattern] = (counts[curve.pattern] || 0) + 1;
  }

  const distribution = Object.entries(counts).map(([pattern, count]) => ({ pattern: labels[pattern as DopaminePattern] || pattern, count })).sort((a, b) => b.count - a.count);
  return { dominantPattern: distribution[0]?.pattern || 'Unknown', distribution };
}

// Stat 18: Genre Fatigue Detector
export interface GenreFatigueData {
  fatigueGenres: { genre: string; ratingDrop: number; gamesBeforeFatigue: number }[];
}

export function getGenreFatigue(games: Game[]): GenreFatigueData {
  const owned = games.filter(g => g.status !== 'Wishlist' && g.genre && g.rating > 0 && g.datePurchased);
  const byGenre: Record<string, { rating: number; date: string }[]> = {};

  owned.forEach(g => {
    if (!byGenre[g.genre!]) byGenre[g.genre!] = [];
    byGenre[g.genre!].push({ rating: g.rating, date: g.datePurchased || g.createdAt });
  });

  const fatigueGenres: GenreFatigueData['fatigueGenres'] = [];
  for (const [genre, entries] of Object.entries(byGenre)) {
    if (entries.length < 3) continue;
    const sorted = entries.sort((a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime());
    const firstTwo = sorted.slice(0, 2).reduce((s, e) => s + e.rating, 0) / 2;
    const rest = sorted.slice(2).reduce((s, e) => s + e.rating, 0) / sorted.slice(2).length;
    const drop = firstTwo - rest;
    if (drop >= 1) {
      fatigueGenres.push({ genre, ratingDrop: Math.round(drop * 10) / 10, gamesBeforeFatigue: 2 });
    }
  }

  return { fatigueGenres: fatigueGenres.sort((a, b) => b.ratingDrop - a.ratingDrop) };
}

// Stat 19: Session Time-of-Week Heatmap
export interface WeekOfMonthHeatmapData {
  grid: number[][]; // 7 days × 4 weeks
  peakCell: { day: number; week: number; hours: number };
  deadCell: { day: number; week: number };
}

export function getWeekOfMonthHeatmap(games: Game[]): WeekOfMonthHeatmapData {
  const grid: number[][] = Array.from({ length: 7 }, () => Array(4).fill(0));
  const allLogs = getAllPlayLogs(games);

  for (const entry of allLogs) {
    const d = parseLocalDate(entry.log.date);
    const dayOfWeek = d.getDay(); // 0=Sun
    const weekOfMonth = Math.min(3, Math.floor((d.getDate() - 1) / 7));
    grid[dayOfWeek][weekOfMonth] += entry.log.hours;
  }

  let peakHours = 0, peakDay = 0, peakWeek = 0, deadDay = 0, deadWeek = 0, minHours = Infinity;
  for (let d = 0; d < 7; d++) {
    for (let w = 0; w < 4; w++) {
      if (grid[d][w] > peakHours) { peakHours = grid[d][w]; peakDay = d; peakWeek = w; }
      if (grid[d][w] < minHours) { minHours = grid[d][w]; deadDay = d; deadWeek = w; }
    }
  }

  return {
    grid,
    peakCell: { day: peakDay, week: peakWeek, hours: Math.round(peakHours * 10) / 10 },
    deadCell: { day: deadDay, week: deadWeek },
  };
}

// Stat 20: The Dead Zone
export interface DeadZoneData {
  longestDrought: number;
  startDate: string;
  endDate: string;
  whatBrokeIt: string;
}

export function getDeadZone(games: Game[]): DeadZoneData {
  const allLogs = getAllPlayLogs(games);
  if (allLogs.length < 2) return { longestDrought: 0, startDate: '', endDate: '', whatBrokeIt: '' };

  const dates = [...new Set(allLogs.map(l => l.log.date))].sort();
  let longest = 0, startDate = '', endDate = '';

  for (let i = 1; i < dates.length; i++) {
    const gap = (parseLocalDate(dates[i]).getTime() - parseLocalDate(dates[i - 1]).getTime()) / (24 * 60 * 60 * 1000);
    if (gap > longest) {
      longest = Math.round(gap);
      startDate = dates[i - 1];
      endDate = dates[i];
    }
  }

  // Find what broke the drought
  const breakEntries = allLogs.filter(l => l.log.date === endDate);
  const breakGame = breakEntries.length > 0 ? breakEntries[0].game : null;

  return { longestDrought: longest, startDate, endDate, whatBrokeIt: breakGame?.name || 'Unknown' };
}

// Stat 21: Library DNA Fingerprint
export interface LibraryDNAData {
  axes: { label: string; value: number }[];
}

export function getLibraryDNA(games: Game[]): LibraryDNAData {
  const owned = games.filter(g => g.status !== 'Wishlist');
  if (owned.length === 0) return { axes: [] };

  const totalHours = owned.reduce((s, g) => s + getTotalHours(g), 0);
  const played = owned.filter(g => getTotalHours(g) > 0);
  const completed = owned.filter(g => g.status === 'Completed');
  const uniqueGenres = new Set(owned.filter(g => g.genre).map(g => g.genre)).size;
  const uniquePlatforms = new Set(owned.filter(g => g.platform).map(g => g.platform)).size;
  const avgRating = owned.length > 0 ? owned.reduce((s, g) => s + g.rating, 0) / owned.length : 0;
  const avgPrice = owned.filter(g => g.price > 0).length > 0
    ? owned.filter(g => g.price > 0).reduce((s, g) => s + g.price, 0) / owned.filter(g => g.price > 0).length
    : 0;

  // Normalize to 0-100 scale
  return {
    axes: [
      { label: 'Engagement', value: Math.min(100, Math.round((played.length / owned.length) * 100)) },
      { label: 'Completion', value: Math.min(100, Math.round((completed.length / Math.max(played.length, 1)) * 100)) },
      { label: 'Genre Variety', value: Math.min(100, uniqueGenres * 10) },
      { label: 'Platform Spread', value: Math.min(100, uniquePlatforms * 20) },
      { label: 'Time Invested', value: Math.min(100, Math.round(totalHours / 10)) },
      { label: 'Quality Bar', value: Math.round(avgRating * 10) },
      { label: 'Budget Level', value: Math.min(100, Math.round(avgPrice * 2)) },
    ],
  };
}

// --- Library Meta-Stats ---

// Stat 22: Rating Confidence Score
export interface RatingConfidenceData {
  confidentTop10: { name: string; rating: number; hours: number }[];
  rawTop10: { name: string; rating: number; hours: number }[];
  differences: number;
  generosityBias: boolean;
}

export function getRatingConfidence(games: Game[]): RatingConfidenceData {
  const rated = games.filter(g => g.status !== 'Wishlist' && g.rating > 0);
  const rawTop10 = [...rated].sort((a, b) => b.rating - a.rating || getTotalHours(b) - getTotalHours(a))
    .slice(0, 10).map(g => ({ name: g.name, rating: g.rating, hours: getTotalHours(g) }));

  const confident = rated.filter(g => getTotalHours(g) >= 5);
  const confidentTop10 = [...confident].sort((a, b) => b.rating - a.rating || getTotalHours(b) - getTotalHours(a))
    .slice(0, 10).map(g => ({ name: g.name, rating: g.rating, hours: getTotalHours(g) }));

  const rawNames = new Set(rawTop10.map(g => g.name));
  const confidentNames = new Set(confidentTop10.map(g => g.name));
  let diffs = 0;
  rawNames.forEach(n => { if (!confidentNames.has(n)) diffs++; });

  const lowHoursGames = rated.filter(g => getTotalHours(g) < 5);
  const highHoursGames = rated.filter(g => getTotalHours(g) >= 5);
  const lowAvg = lowHoursGames.length > 0 ? lowHoursGames.reduce((s, g) => s + g.rating, 0) / lowHoursGames.length : 0;
  const highAvg = highHoursGames.length > 0 ? highHoursGames.reduce((s, g) => s + g.rating, 0) / highHoursGames.length : 0;

  return { confidentTop10, rawTop10, differences: diffs, generosityBias: lowAvg > highAvg + 0.5 };
}

// Stat 23: The Pareto Games (Power Law)
export interface ParetoAnalysisData {
  topN: number;
  percentOfTotal: number;
  cumulativeChart: { name: string; cumPct: number }[];
}

export function getParetoAnalysis(games: Game[]): ParetoAnalysisData {
  const played = games.filter(g => g.status !== 'Wishlist' && getTotalHours(g) > 0);
  if (played.length === 0) return { topN: 0, percentOfTotal: 0, cumulativeChart: [] };

  const sorted = [...played].sort((a, b) => getTotalHours(b) - getTotalHours(a));
  const totalHours = sorted.reduce((s, g) => s + getTotalHours(g), 0);
  const top3 = sorted.slice(0, 3);
  const top3Hours = top3.reduce((s, g) => s + getTotalHours(g), 0);

  let running = 0;
  const chart = sorted.slice(0, 15).map(g => {
    running += getTotalHours(g);
    return { name: g.name, cumPct: Math.round((running / totalHours) * 100) };
  });

  return { topN: 3, percentOfTotal: Math.round((top3Hours / totalHours) * 100), cumulativeChart: chart };
}

// Stat 24: Library Age Profile
export interface LibraryAgeProfileData {
  histogram: { period: string; count: number }[];
  medianAgeDays: number;
  oldestGame: string;
  newestGame: string;
}

export function getLibraryAgeProfile(games: Game[]): LibraryAgeProfileData {
  const withDates = games.filter(g => g.datePurchased && g.status !== 'Wishlist');
  if (withDates.length === 0) return { histogram: [], medianAgeDays: 0, oldestGame: '', newestGame: '' };

  const now = Date.now();
  const ages = withDates.map(g => ({
    name: g.name,
    days: Math.round((now - parseLocalDate(g.datePurchased!).getTime()) / (24 * 60 * 60 * 1000)),
  }));

  const sorted = ages.sort((a, b) => a.days - b.days);
  const median = sorted[Math.floor(sorted.length / 2)].days;

  const buckets: Record<string, number> = { '<3mo': 0, '3-6mo': 0, '6-12mo': 0, '1-2yr': 0, '2yr+': 0 };
  ages.forEach(a => {
    if (a.days < 90) buckets['<3mo']++;
    else if (a.days < 180) buckets['3-6mo']++;
    else if (a.days < 365) buckets['6-12mo']++;
    else if (a.days < 730) buckets['1-2yr']++;
    else buckets['2yr+']++;
  });

  return {
    histogram: Object.entries(buckets).map(([period, count]) => ({ period, count })),
    medianAgeDays: median,
    oldestGame: sorted[sorted.length - 1]?.name || '',
    newestGame: sorted[0]?.name || '',
  };
}

// --- Predictive & Comparative ---

// Stat 25: Value Velocity Chart
export interface ValueVelocityData {
  fastValueGames: { name: string; sessionsToGood: number }[];
  slowValueGames: { name: string; sessions: number; currentCph: number }[];
  neverWorthIt: { name: string; cph: number }[];
}

export function getValueVelocity(games: Game[]): ValueVelocityData {
  const paidWithLogs = games.filter(g => g.status !== 'Wishlist' && g.price > 0 && g.playLogs && g.playLogs.length > 0);
  const fast: ValueVelocityData['fastValueGames'] = [];
  const slow: ValueVelocityData['slowValueGames'] = [];
  const never: ValueVelocityData['neverWorthIt'] = [];

  for (const game of paidWithLogs) {
    const sorted = [...game.playLogs!].sort((a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime());
    let cumHours = 0;
    let foundGood = false;

    for (let i = 0; i < sorted.length; i++) {
      cumHours += sorted[i].hours;
      if (game.price / cumHours <= 3) { // Good value threshold
        fast.push({ name: game.name, sessionsToGood: i + 1 });
        foundGood = true;
        break;
      }
    }

    if (!foundGood) {
      const totalHours = getTotalHours(game);
      const cph = game.price / totalHours;
      if (cph > 5) never.push({ name: game.name, cph: Math.round(cph * 100) / 100 });
      else slow.push({ name: game.name, sessions: sorted.length, currentCph: Math.round(cph * 100) / 100 });
    }
  }

  return {
    fastValueGames: fast.sort((a, b) => a.sessionsToGood - b.sessionsToGood).slice(0, 5),
    slowValueGames: slow.slice(0, 5),
    neverWorthIt: never.sort((a, b) => b.cph - a.cph).slice(0, 5),
  };
}

// Stat 26: Cross-Genre Affinity Map
export interface CrossGenreAffinityData {
  pairs: { genre1: string; genre2: string; strength: number }[];
}

export function getCrossGenreAffinity(games: Game[]): CrossGenreAffinityData {
  const withGenre = games.filter(g => g.genre && g.playLogs && g.playLogs.length > 0 && g.status !== 'Wishlist');
  const monthlyGenres: Record<string, Set<string>> = {};

  for (const game of withGenre) {
    for (const log of game.playLogs!) {
      const d = parseLocalDate(log.date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (!monthlyGenres[key]) monthlyGenres[key] = new Set();
      monthlyGenres[key].add(game.genre!);
    }
  }

  const pairCounts: Record<string, number> = {};
  for (const genres of Object.values(monthlyGenres)) {
    const arr = [...genres];
    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        const key = [arr[i], arr[j]].sort().join('|');
        pairCounts[key] = (pairCounts[key] || 0) + 1;
      }
    }
  }

  const pairs = Object.entries(pairCounts)
    .map(([key, count]) => {
      const [genre1, genre2] = key.split('|');
      return { genre1, genre2, strength: count };
    })
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 10);

  return { pairs };
}

// Stat 27: Seasonal Genre Drift
export interface SeasonalGenreDriftData {
  months: { month: number; genreShares: { genre: string; percent: number }[] }[];
}

export function getSeasonalGenreDrift(games: Game[]): SeasonalGenreDriftData {
  const withGenre = games.filter(g => g.genre && g.playLogs && g.playLogs.length > 0 && g.status !== 'Wishlist');
  const monthlyHours: Record<number, Record<string, number>> = {};

  for (let m = 0; m < 12; m++) monthlyHours[m] = {};

  for (const game of withGenre) {
    for (const log of game.playLogs!) {
      const month = parseLocalDate(log.date).getMonth();
      monthlyHours[month][game.genre!] = (monthlyHours[month][game.genre!] || 0) + log.hours;
    }
  }

  const months = Object.entries(monthlyHours).map(([m, genres]) => {
    const total = Object.values(genres).reduce((s, h) => s + h, 0);
    const shares = Object.entries(genres)
      .map(([genre, hours]) => ({ genre, percent: total > 0 ? Math.round((hours / total) * 100) : 0 }))
      .sort((a, b) => b.percent - a.percent)
      .slice(0, 5);
    return { month: parseInt(m), genreShares: shares };
  });

  return { months };
}

// Stat 28: "If You Stopped Today" Snapshot
export interface IfYouStoppedTodayData {
  totalHours: number;
  totalSpent: number;
  costPerHour: number;
  completed: number;
  completionRate: number;
  bestValue: string;
  worstValue: string;
  longestGame: string;
}

export function getIfYouStoppedToday(games: Game[]): IfYouStoppedTodayData {
  const owned = games.filter(g => g.status !== 'Wishlist');
  const totalHours = owned.reduce((s, g) => s + getTotalHours(g), 0);
  const totalSpent = owned.reduce((s, g) => s + g.price, 0);
  const completed = owned.filter(g => g.status === 'Completed');
  const played = owned.filter(g => getTotalHours(g) > 0);
  const paidPlayed = played.filter(g => g.price > 0);

  const bestValueGame = paidPlayed.length > 0
    ? paidPlayed.reduce((best, g) => (g.price / getTotalHours(g)) < (best.price / getTotalHours(best)) ? g : best)
    : null;
  const worstValueGame = paidPlayed.length > 0
    ? paidPlayed.reduce((worst, g) => (g.price / getTotalHours(g)) > (worst.price / getTotalHours(worst)) ? g : worst)
    : null;
  const longestGame = played.length > 0
    ? played.reduce((longest, g) => getTotalHours(g) > getTotalHours(longest) ? g : longest)
    : null;

  return {
    totalHours: Math.round(totalHours),
    totalSpent: Math.round(totalSpent * 100) / 100,
    costPerHour: totalHours > 0 ? Math.round((totalSpent / totalHours) * 100) / 100 : 0,
    completed: completed.length,
    completionRate: played.length > 0 ? Math.round((completed.length / played.length) * 100) : 0,
    bestValue: bestValueGame?.name || 'N/A',
    worstValue: worstValueGame?.name || 'N/A',
    longestGame: longestGame?.name || 'N/A',
  };
}

// ============================================================
// Stat Popover Data — contextual info for micro-stat interactions
// ============================================================

export interface StatPopoverData {
  price: string;
  hours: string;
  rating: string;
  costPerHour: string;
  roi: string;
}

export function getStatPopoverData(game: Game, allGames: Game[]): StatPopoverData {
  const totalHours = getTotalHours(game);
  const sessions = game.playLogs?.length || 0;

  // Price context
  let priceText: string;
  if (game.acquiredFree) {
    priceText = 'Free game!';
  } else if (game.originalPrice && game.originalPrice > game.price) {
    const saved = game.originalPrice - game.price;
    const pct = Math.round((1 - game.price / game.originalPrice) * 100);
    priceText = `Saved $${saved.toFixed(0)} (${pct}% off)`;
  } else {
    priceText = 'Paid full price';
  }

  // Hours context
  let hoursText: string;
  if (sessions > 0) {
    const avgSession = (totalHours / sessions).toFixed(1);
    hoursText = `Avg session: ${avgSession}h \u00B7 ${sessions} session${sessions !== 1 ? 's' : ''}`;
  } else if (totalHours > 0) {
    hoursText = 'No individual sessions logged';
  } else {
    hoursText = 'Not played yet';
  }

  // Rating context — percentile in library
  let ratingText: string;
  const ratedGames = allGames.filter(g => g.rating > 0).sort((a, b) => a.rating - b.rating);
  if (game.rating > 0 && ratedGames.length > 1) {
    const rank = ratedGames.filter(g => g.rating <= game.rating).length;
    const percentile = Math.round((rank / ratedGames.length) * 100);
    ratingText = `${percentile}th percentile in your library`;
  } else if (game.rating > 0) {
    ratingText = 'Only rated game so far';
  } else {
    ratingText = 'Not rated yet';
  }

  // Cost per hour context — trajectory from first session to now
  let costPerHourText: string;
  if (totalHours > 0 && game.price > 0) {
    const currentCPH = game.price / totalHours;
    const logs = game.playLogs ? [...game.playLogs].sort((a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime()) : [];
    if (logs.length >= 2) {
      const firstSessionHours = game.hours > 0 ? game.hours + logs[0].hours : logs[0].hours;
      const firstCPH = game.price / firstSessionHours;
      costPerHourText = `Was $${firstCPH.toFixed(2)}/hr after first session, now $${currentCPH.toFixed(2)}/hr`;
    } else {
      costPerHourText = `$${currentCPH.toFixed(2)} per hour of entertainment`;
    }
  } else if (game.acquiredFree && totalHours > 0) {
    costPerHourText = 'Free game \u2014 infinite value!';
  } else {
    costPerHourText = 'No playtime logged yet';
  }

  // ROI context — ranking in collection
  let roiText: string;
  const metrics = calculateMetrics(game);
  if (metrics.roi > 0) {
    const gamesWithROI = allGames
      .filter(g => {
        const m = calculateMetrics(g);
        return m.roi > 0;
      })
      .sort((a, b) => calculateMetrics(b).roi - calculateMetrics(a).roi);
    const roiRank = gamesWithROI.findIndex(g => g.id === game.id);
    if (roiRank >= 0 && gamesWithROI.length > 1) {
      const percentile = Math.round(((roiRank + 1) / gamesWithROI.length) * 100);
      roiText = percentile <= 50
        ? `Top ${percentile}% ROI in your collection`
        : `ROI rank: #${roiRank + 1} of ${gamesWithROI.length}`;
    } else {
      roiText = `ROI: ${metrics.roi.toFixed(1)}`;
    }
  } else {
    roiText = 'Not enough data for ROI';
  }

  return { price: priceText, hours: hoursText, rating: ratingText, costPerHour: costPerHourText, roi: roiText };
}

// ── Taste Profile (for Discover recommendations) ──────────────────────

export function buildTasteProfile(games: Game[]): TasteProfile {
  const owned = games.filter(g => g.status !== 'Wishlist');
  const played = owned.filter(g => getTotalHours(g) > 0);

  // Genre analysis — weighted by hours × rating
  const genreData: Record<string, { totalHours: number; totalRating: number; count: number; abandoned: number }> = {};
  for (const game of owned) {
    const genre = game.genre || 'Unknown';
    if (!genreData[genre]) genreData[genre] = { totalHours: 0, totalRating: 0, count: 0, abandoned: 0 };
    genreData[genre].totalHours += getTotalHours(game);
    genreData[genre].totalRating += game.rating;
    genreData[genre].count += 1;
    if (game.status === 'Abandoned') genreData[genre].abandoned += 1;
  }

  const genreScores = Object.entries(genreData)
    .filter(([g]) => g !== 'Unknown')
    .map(([genre, data]) => ({
      genre,
      avgRating: data.count > 0 ? data.totalRating / data.count : 0,
      avgHours: data.count > 0 ? data.totalHours / data.count : 0,
      count: data.count,
      score: (data.totalHours * (data.totalRating / Math.max(data.count, 1))),
      abandonRate: data.count > 0 ? data.abandoned / data.count : 0,
    }))
    .sort((a, b) => b.score - a.score);

  const topGenres = genreScores.slice(0, 5).map(g => g.genre);
  const avoidGenres = genreScores
    .filter(g => g.abandonRate > 0.4 || g.avgRating < 5)
    .map(g => g.genre);

  // Platforms
  const platforms = [...new Set(owned.map(g => g.platform).filter(Boolean) as string[])];

  // Session analysis
  const allLogs = played.flatMap(g => g.playLogs || []);
  const avgSessionHours = allLogs.length > 0
    ? allLogs.reduce((sum, l) => sum + l.hours, 0) / allLogs.length
    : played.length > 0 ? played.reduce((sum, g) => sum + getTotalHours(g), 0) / played.length : 2;

  // Game length preference
  const completedGames = owned.filter(g => g.status === 'Completed');
  const avgCompletionHours = completedGames.length > 0
    ? completedGames.reduce((sum, g) => sum + getTotalHours(g), 0) / completedGames.length
    : 0;
  let preferredGameLength = '10-30h';
  if (avgCompletionHours > 60) preferredGameLength = '60h+';
  else if (avgCompletionHours > 40) preferredGameLength = '40-60h';
  else if (avgCompletionHours > 20) preferredGameLength = '20-40h';
  else if (avgCompletionHours > 10) preferredGameLength = '10-20h';
  else if (avgCompletionHours > 0) preferredGameLength = '<10h';

  // Price range
  const paidGames = owned.filter(g => g.price > 0);
  const avgPrice = paidGames.length > 0
    ? paidGames.reduce((sum, g) => sum + g.price, 0) / paidGames.length
    : 0;
  let priceRange = '$0-$20';
  if (avgPrice > 50) priceRange = '$40-$70+';
  else if (avgPrice > 30) priceRange = '$20-$50';
  else if (avgPrice > 15) priceRange = '$15-$30';

  // Top rated games
  const topGames = [...played]
    .sort((a, b) => b.rating - a.rating || getTotalHours(b) - getTotalHours(a))
    .slice(0, 5)
    .map(g => ({ name: g.name, rating: g.rating, hours: getTotalHours(g), genre: g.genre }));

  const avgRating = played.length > 0
    ? played.reduce((sum, g) => sum + g.rating, 0) / played.length
    : 0;

  const completionRate = owned.length > 0
    ? (completedGames.length / owned.length) * 100
    : 0;

  return {
    topGenres,
    avoidGenres,
    platforms,
    avgSessionHours: Math.round(avgSessionHours * 10) / 10,
    preferredGameLength,
    priceRange,
    avgRating: Math.round(avgRating * 10) / 10,
    topGames,
    completionRate: Math.round(completionRate),
    favoriteGenreDetails: genreScores.slice(0, 5).map(g => ({
      genre: g.genre,
      avgRating: Math.round(g.avgRating * 10) / 10,
      avgHours: Math.round(g.avgHours),
      count: g.count,
    })),
  };
}

// ── Discover Tab: Upcoming & Released Helpers ──────────────────────────────

/**
 * Build RAWG API filters from a taste profile for upcoming/released game discovery.
 */
export function buildUpcomingFilters(profile: TasteProfile): { genres: string[]; platforms: string[] } {
  return {
    genres: profile.topGenres.slice(0, 5),
    platforms: profile.platforms,
  };
}

/**
 * Local heuristic scoring for an upcoming game against user's taste profile.
 * Used as fallback when AI is unavailable.
 * Returns score (0-10) and a short reason.
 */
export function scoreUpcomingMatch(
  gameName: string,
  gameGenre: string | undefined,
  gameRating: number | undefined,
  gameMetacritic: number | null | undefined,
  profile: TasteProfile
): { score: number; reason: string } {
  let score = 5; // Base score
  const reasons: string[] = [];

  // Genre match
  if (gameGenre) {
    const genreLower = gameGenre.toLowerCase();
    const topGenresLower = profile.topGenres.map(g => g.toLowerCase());
    const avoidGenresLower = profile.avoidGenres.map(g => g.toLowerCase());

    if (topGenresLower.some(g => genreLower.includes(g) || g.includes(genreLower))) {
      score += 2;
      reasons.push(`Matches your top genre preferences`);
    }
    if (avoidGenresLower.some(g => genreLower.includes(g) || g.includes(genreLower))) {
      score -= 3;
      reasons.push(`Genre you typically avoid`);
    }
  }

  // Metacritic boost
  if (gameMetacritic) {
    if (gameMetacritic >= 85) {
      score += 2;
      reasons.push(`Critically acclaimed (MC ${gameMetacritic})`);
    } else if (gameMetacritic >= 75) {
      score += 1;
      reasons.push(`Well reviewed (MC ${gameMetacritic})`);
    }
  }

  // RAWG community rating boost
  if (gameRating && gameRating >= 4.0) {
    score += 1;
    reasons.push(`Highly rated by community`);
  }

  score = Math.max(1, Math.min(10, score));
  const reason = reasons.length > 0 ? reasons.join('. ') + '.' : 'Matches your general gaming profile.';

  return { score, reason };
}

/**
 * Categorize a released game recommendation into a display category.
 */
export function categorizeRecommendation(
  gameName: string,
  gameGenre: string | undefined,
  gameMetacritic: number | null | undefined,
  gameRating: number | undefined,
  profile: TasteProfile,
  library: Game[]
): { category: 'hidden-gem' | 'popular-in-genre' | 'because-you-loved' | 'try-something-different' | 'general'; context?: string } {
  const genreLower = (gameGenre || '').toLowerCase();
  const topGenresLower = profile.topGenres.map(g => g.toLowerCase());

  // "Try Something Different" — genre not in user's top genres
  const isNewGenre = genreLower && !topGenresLower.some(g => genreLower.includes(g) || g.includes(genreLower));
  if (isNewGenre && gameMetacritic && gameMetacritic >= 80) {
    return { category: 'try-something-different' };
  }

  // "Because You Loved [Game]" — same genre as a top-rated game
  const topRated = library
    .filter(g => g.rating >= 8 && g.status !== 'Wishlist')
    .sort((a, b) => b.rating - a.rating || getTotalHours(b) - getTotalHours(a));

  if (topRated.length > 0 && genreLower) {
    const matchingTop = topRated.find(g =>
      g.genre && g.genre.toLowerCase().includes(genreLower) ||
      genreLower.includes((g.genre || '').toLowerCase())
    );
    if (matchingTop) {
      return { category: 'because-you-loved', context: matchingTop.name };
    }
  }

  // "Hidden Gem" — high rating but not super popular (no metacritic means less mainstream)
  if (gameRating && gameRating >= 4.0 && (!gameMetacritic || gameMetacritic < 80)) {
    return { category: 'hidden-gem' };
  }

  // "Popular in Your Genre" — high metacritic, matches genre
  if (gameMetacritic && gameMetacritic >= 75 && !isNewGenre) {
    return { category: 'popular-in-genre' };
  }

  return { category: 'general' };
}

/**
 * Calculate days until a release date. Returns null if date is invalid or in the past.
 */
export function getDaysUntilRelease(releaseDate: string | undefined): number | null {
  if (!releaseDate) return null;
  const release = new Date(releaseDate);
  if (isNaN(release.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  release.setHours(0, 0, 0, 0);
  const diff = Math.ceil((release.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : null;
}

/**
 * Determine the release window for an upcoming game.
 */
export function getReleaseWindow(releaseDate: string | undefined): 'this-month' | 'next-few-months' | 'later' {
  const days = getDaysUntilRelease(releaseDate);
  if (days === null || days <= 30) return 'this-month';
  if (days <= 90) return 'next-few-months';
  return 'later';
}

// ============================================================
// Smart Nudge — contextual rotating insight for the title row
// ============================================================

export interface SmartNudge {
  text: string;
  type: 'streak' | 'milestone' | 'neglect' | 'backlog' | 'value' | 'completion' | 'general';
  priority: number; // Higher = more interesting
}

export function getSmartNudges(games: Game[]): SmartNudge[] {
  const nudges: SmartNudge[] = [];
  const owned = games.filter(g => g.status !== 'Wishlist');
  if (owned.length === 0) return nudges;

  // Streak nudge
  const streak = getCurrentGamingStreak(games);
  if (streak >= 3) {
    nudges.push({ text: `${streak}-day streak — play today to keep it alive`, type: 'streak', priority: 90 });
  } else if (streak === 0) {
    const pulse = getActivityPulse(games);
    if (pulse.lastPlayedDaysAgo > 7 && pulse.lastPlayedDaysAgo < Infinity) {
      nudges.push({ text: `${pulse.lastPlayedDaysAgo} days since your last session`, type: 'neglect', priority: 70 });
    }
  }

  // Century Club proximity
  const almostCentury = owned.filter(g => {
    const h = getTotalHours(g);
    return h >= 80 && h < 100;
  });
  if (almostCentury.length > 0) {
    const g = almostCentury[0];
    const remaining = Math.ceil(100 - getTotalHours(g));
    nudges.push({ text: `${g.name} is ${remaining}h from Century Club`, type: 'milestone', priority: 85 });
  }

  // Backlog growth
  const notStarted = owned.filter(g => g.status === 'Not Started');
  const completed = owned.filter(g => g.status === 'Completed');
  if (notStarted.length > completed.length) {
    nudges.push({
      text: `${notStarted.length} unstarted games vs ${completed.length} completed — backlog growing`,
      type: 'backlog',
      priority: 60,
    });
  }

  // Recent completion
  const recentCompletions = owned.filter(g => {
    if (g.status !== 'Completed' || !g.endDate) return false;
    const daysSince = (Date.now() - parseLocalDate(g.endDate).getTime()) / (1000 * 60 * 60 * 24);
    return daysSince <= 14;
  });
  if (recentCompletions.length > 0) {
    nudges.push({
      text: `You completed ${recentCompletions[0].name} recently — what's next?`,
      type: 'completion',
      priority: 75,
    });
  }

  // Neglected games with good ratings
  const neglected = owned.filter(g => {
    if (g.status !== 'In Progress') return false;
    const logs = g.playLogs || [];
    if (logs.length === 0) return false;
    const lastLog = logs[0]; // sorted desc
    const daysSince = (Date.now() - parseLocalDate(lastLog.date).getTime()) / (1000 * 60 * 60 * 24);
    return daysSince > 30 && g.rating >= 7;
  });
  if (neglected.length > 0) {
    const g = neglected[0];
    const lastLog = g.playLogs![0];
    const daysSince = Math.floor((Date.now() - parseLocalDate(lastLog.date).getTime()) / (1000 * 60 * 60 * 24));
    nudges.push({
      text: `Haven't touched ${g.name} in ${daysSince} days — you rated it ${g.rating}/10`,
      type: 'neglect',
      priority: 65,
    });
  }

  // Value insight
  if (owned.length >= 5) {
    const avgCph = owned.reduce((s, g) => s + (getTotalHours(g) > 0 ? g.price / getTotalHours(g) : 0), 0) / owned.filter(g => getTotalHours(g) > 0).length;
    if (avgCph < 3.5) {
      nudges.push({ text: `Your library averages $${avgCph.toFixed(2)}/hr — better than movies`, type: 'value', priority: 50 });
    }
  }

  return nudges.sort((a, b) => b.priority - a.priority);
}

// ============================================================
// Week Recap Data — compact summary for the header strip
// ============================================================

export interface WeekRecapData {
  thisWeek: PeriodStats;
  lastWeek: PeriodStats;
  thisMonth: PeriodStats;
  hoursDelta: number; // this week - last week
  gamesDelta: number;
  sessionsDelta: number;
  streak: number;
  pulse: ActivityPulseData;
}

export function getWeekRecapData(games: Game[]): WeekRecapData {
  const thisWeek = getPeriodStats(games, 7);
  const lastWeek = getLastWeekStats(games);
  const thisMonth = getPeriodStats(games, 30);
  const streak = getCurrentGamingStreak(games);
  const pulse = getActivityPulse(games);

  return {
    thisWeek,
    lastWeek,
    thisMonth,
    hoursDelta: thisWeek.totalHours - lastWeek.totalHours,
    gamesDelta: thisWeek.uniqueGames - lastWeek.uniqueGames,
    sessionsDelta: thisWeek.totalSessions - lastWeek.totalSessions,
    streak,
    pulse,
  };
}

// ============================================================
// Racing Bar Chart Timeline — animated bar chart race of
// cumulative hours per game over time
// ============================================================

export interface RacingBarEntry {
  gameId: string;
  gameName: string;
  thumbnail?: string;
  cumulativeHours: number;
  hoursThisPeriod: number;
  rank: number;
  previousRank: number;
  isNew: boolean;
  status: GameStatus;
  justCompleted: boolean;
  color: string;
  genre?: string;
}

export interface RacingBarFrame {
  period: string;         // "2024-01"
  periodLabel: string;    // "January 2024"
  games: RacingBarEntry[];
}

export interface RacingBarHighlight {
  period: string;
  type: 'overtake' | 'new_entry' | 'milestone' | 'completion' | 'dominant_month';
  description: string;
  gameId: string;
}

const RACING_BAR_COLORS = [
  '#8b5cf6', '#ec4899', '#f97316', '#06b6d4', '#10b981',
  '#eab308', '#ef4444', '#6366f1', '#14b8a6', '#f59e0b',
  '#a855f7', '#3b82f6', '#84cc16', '#e879f9', '#22d3ee',
  '#fb923c', '#4ade80', '#f472b6', '#38bdf8', '#facc15',
];

/** Stable hash-based color for a game so the same game always gets the same color */
function getGameColor(gameId: string, index: number): string {
  let hash = 0;
  for (let i = 0; i < gameId.length; i++) {
    hash = ((hash << 5) - hash) + gameId.charCodeAt(i);
    hash |= 0;
  }
  return RACING_BAR_COLORS[Math.abs(hash) % RACING_BAR_COLORS.length] || RACING_BAR_COLORS[index % RACING_BAR_COLORS.length];
}

const MONTH_LABELS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * Build the full array of frames for the racing bar chart.
 * Each frame represents one month and contains cumulative hours for every game
 * that has been played up to and including that month, sorted by hours desc.
 */
export function getRacingBarChartData(games: Game[]): RacingBarFrame[] {
  // Only consider owned games with some activity
  const ownedGames = games.filter(g => g.status !== 'Wishlist');
  if (ownedGames.length === 0) return [];

  // Collect all months where anything happened (play logs, purchases, starts, completions)
  const monthSet = new Set<string>();
  ownedGames.forEach(game => {
    if (game.datePurchased) monthSet.add(game.datePurchased.substring(0, 7));
    if (game.startDate) monthSet.add(game.startDate.substring(0, 7));
    if (game.endDate) monthSet.add(game.endDate.substring(0, 7));
    game.playLogs?.forEach(log => monthSet.add(log.date.substring(0, 7)));
  });

  if (monthSet.size === 0) return [];

  const sortedMonths = Array.from(monthSet).sort();

  // Fill in any gaps so the timeline is continuous
  const allMonths: string[] = [];
  const [startYear, startMonth] = sortedMonths[0].split('-').map(Number);
  const [endYear, endMonth] = sortedMonths[sortedMonths.length - 1].split('-').map(Number);

  let y = startYear;
  let m = startMonth;
  while (y < endYear || (y === endYear && m <= endMonth)) {
    allMonths.push(`${y}-${String(m).padStart(2, '0')}`);
    m++;
    if (m > 12) { m = 1; y++; }
  }

  // Pre-compute per-game hours by month from play logs
  const gameHoursByMonth: Record<string, Record<string, number>> = {};
  ownedGames.forEach(game => {
    const byMonth: Record<string, number> = {};
    game.playLogs?.forEach(log => {
      const mk = log.date.substring(0, 7);
      byMonth[mk] = (byMonth[mk] || 0) + log.hours;
    });
    gameHoursByMonth[game.id] = byMonth;
  });

  // For games with baseline hours but no play logs, attribute baseline hours
  // to the startDate or datePurchased month
  const baselineMonth: Record<string, string> = {};
  ownedGames.forEach(game => {
    if (game.hours > 0 && (!game.playLogs || game.playLogs.length === 0)) {
      const month = (game.startDate || game.datePurchased || game.createdAt)?.substring(0, 7);
      if (month) baselineMonth[game.id] = month;
    }
  });

  // Track which games have "appeared" (have any hours) and their completion status by month
  const gameEndMonths: Record<string, string> = {};
  ownedGames.forEach(game => {
    if (game.endDate && game.status === 'Completed') {
      gameEndMonths[game.id] = game.endDate.substring(0, 7);
    }
  });

  // Build frames
  const frames: RacingBarFrame[] = [];
  const cumulativeHours: Record<string, number> = {};
  let previousRanks: Record<string, number> = {};
  const appearedGames = new Set<string>();

  for (const monthKey of allMonths) {
    const [yr, mo] = monthKey.split('-').map(Number);
    const periodLabel = `${MONTH_LABELS[mo - 1]} ${yr}`;

    // Add this month's hours for each game
    ownedGames.forEach(game => {
      const monthHours = gameHoursByMonth[game.id]?.[monthKey] || 0;
      // Add baseline hours in the baseline month
      const baseHours = baselineMonth[game.id] === monthKey ? game.hours : 0;
      const added = monthHours + baseHours;

      if (added > 0 || (cumulativeHours[game.id] || 0) > 0) {
        cumulativeHours[game.id] = (cumulativeHours[game.id] || 0) + added;
      }
    });

    // Build entries for games that have cumulative hours > 0
    const entries: RacingBarEntry[] = [];
    for (const game of ownedGames) {
      const cumHours = cumulativeHours[game.id] || 0;
      if (cumHours <= 0) continue;

      const isNew = !appearedGames.has(game.id);
      if (isNew) appearedGames.add(game.id);

      const hoursThisPeriod = (gameHoursByMonth[game.id]?.[monthKey] || 0)
        + (baselineMonth[game.id] === monthKey ? game.hours : 0);

      entries.push({
        gameId: game.id,
        gameName: game.name,
        thumbnail: game.thumbnail,
        cumulativeHours: Math.round(cumHours * 10) / 10,
        hoursThisPeriod: Math.round(hoursThisPeriod * 10) / 10,
        rank: 0, // assigned below
        previousRank: previousRanks[game.id] ?? -1,
        isNew,
        status: game.status,
        justCompleted: gameEndMonths[game.id] === monthKey,
        color: getGameColor(game.id, entries.length),
        genre: game.genre,
      });
    }

    // Sort by cumulative hours desc, then by name for stability
    entries.sort((a, b) => b.cumulativeHours - a.cumulativeHours || a.gameName.localeCompare(b.gameName));

    // Assign ranks
    entries.forEach((entry, i) => {
      entry.rank = i + 1;
    });

    // Record ranks for next frame's previousRank
    const newRanks: Record<string, number> = {};
    entries.forEach(e => { newRanks[e.gameId] = e.rank; });
    previousRanks = newRanks;

    frames.push({
      period: monthKey,
      periodLabel,
      games: entries,
    });
  }

  return frames;
}

/**
 * Extract narrative highlights from racing bar frames for overlay text.
 */
export function getRacingBarHighlights(frames: RacingBarFrame[]): RacingBarHighlight[] {
  const highlights: RacingBarHighlight[] = [];

  for (let i = 1; i < frames.length; i++) {
    const frame = frames[i];
    const prevFrame = frames[i - 1];
    const prevRankMap = new Map(prevFrame.games.map(g => [g.gameId, g.rank]));

    for (const entry of frame.games) {
      // New entry
      if (entry.isNew) {
        highlights.push({
          period: frame.period,
          type: 'new_entry',
          description: `${entry.gameName} enters the chart`,
          gameId: entry.gameId,
        });
      }

      // Overtake for #1 spot
      const prevRank = prevRankMap.get(entry.gameId);
      if (entry.rank === 1 && prevRank !== undefined && prevRank > 1) {
        const previousLeader = prevFrame.games.find(g => g.rank === 1);
        highlights.push({
          period: frame.period,
          type: 'overtake',
          description: `${entry.gameName} overtakes ${previousLeader?.gameName || 'the leader'} for #1`,
          gameId: entry.gameId,
        });
      }

      // Completion
      if (entry.justCompleted) {
        highlights.push({
          period: frame.period,
          type: 'completion',
          description: `${entry.gameName} completed!`,
          gameId: entry.gameId,
        });
      }

      // Hour milestones
      if (entry.cumulativeHours >= 100) {
        const prevEntry = prevFrame.games.find(g => g.gameId === entry.gameId);
        if (prevEntry && prevEntry.cumulativeHours < 100) {
          highlights.push({
            period: frame.period,
            type: 'milestone',
            description: `${entry.gameName} hits 100 hours!`,
            gameId: entry.gameId,
          });
        }
      }
      if (entry.cumulativeHours >= 50) {
        const prevEntry = prevFrame.games.find(g => g.gameId === entry.gameId);
        if (prevEntry && prevEntry.cumulativeHours < 50) {
          highlights.push({
            period: frame.period,
            type: 'milestone',
            description: `${entry.gameName} reaches 50 hours`,
            gameId: entry.gameId,
          });
        }
      }
    }

    // Dominant month: game with most hoursThisPeriod
    const activeGames = frame.games.filter(g => g.hoursThisPeriod > 0);
    if (activeGames.length > 0) {
      const dominant = activeGames.reduce((a, b) => a.hoursThisPeriod > b.hoursThisPeriod ? a : b);
      if (dominant.hoursThisPeriod >= 15) {
        highlights.push({
          period: frame.period,
          type: 'dominant_month',
          description: `${dominant.gameName} dominates with ${dominant.hoursThisPeriod}h this month`,
          gameId: dominant.gameId,
        });
      }
    }
  }

  return highlights;
}

// ============================================================
// Activity Feed — reverse-chronological event stream
// ============================================================

export interface ActivityFeedEvent {
  id: string;
  date: string;
  type: 'play' | 'purchase' | 'completion' | 'start' | 'abandon' | 'milestone';
  gameId: string;
  gameName: string;
  thumbnail?: string;
  description: string;
  detail?: string;
  hours?: number;
  price?: number;
  rating?: number;
}

/**
 * Build a reverse-chronological activity feed from all game events.
 * Returns events sorted newest-first, with a limit for pagination.
 */
export function getActivityFeed(games: Game[], limit = 50, offset = 0): { events: ActivityFeedEvent[]; total: number } {
  const allEvents: ActivityFeedEvent[] = [];
  const ownedGames = games.filter(g => g.status !== 'Wishlist');

  ownedGames.forEach(game => {
    // Play sessions
    game.playLogs?.forEach(log => {
      allEvents.push({
        id: `play-${log.id}`,
        date: log.date,
        type: 'play',
        gameId: game.id,
        gameName: game.name,
        thumbnail: game.thumbnail,
        description: `Played ${game.name}`,
        detail: log.notes || undefined,
        hours: log.hours,
      });
    });

    // Purchase
    if (game.datePurchased) {
      allEvents.push({
        id: `purchase-${game.id}`,
        date: game.datePurchased,
        type: 'purchase',
        gameId: game.id,
        gameName: game.name,
        thumbnail: game.thumbnail,
        description: `Purchased ${game.name}`,
        detail: game.purchaseSource || undefined,
        price: game.price,
      });
    }

    // Start
    if (game.startDate) {
      allEvents.push({
        id: `start-${game.id}`,
        date: game.startDate,
        type: 'start',
        gameId: game.id,
        gameName: game.name,
        thumbnail: game.thumbnail,
        description: `Started playing ${game.name}`,
      });
    }

    // Completion
    if (game.endDate && game.status === 'Completed') {
      allEvents.push({
        id: `complete-${game.id}`,
        date: game.endDate,
        type: 'completion',
        gameId: game.id,
        gameName: game.name,
        thumbnail: game.thumbnail,
        description: `Completed ${game.name}!`,
        detail: `${getTotalHours(game).toFixed(1)}h total`,
        rating: game.rating,
      });
    }

    // Abandon
    if (game.endDate && game.status === 'Abandoned') {
      allEvents.push({
        id: `abandon-${game.id}`,
        date: game.endDate,
        type: 'abandon',
        gameId: game.id,
        gameName: game.name,
        thumbnail: game.thumbnail,
        description: `Abandoned ${game.name}`,
        detail: `${getTotalHours(game).toFixed(1)}h played`,
      });
    }
  });

  // Sort newest first
  allEvents.sort((a, b) => parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime());

  return {
    events: allEvents.slice(offset, offset + limit),
    total: allEvents.length,
  };
}

// ============================================================
// Genre Epochs — stacked area data showing genre dominance over time
// ============================================================

export interface GenreEpochPeriod {
  period: string;
  periodLabel: string;
  totalHours: number;
  bands: { genre: string; hours: number; percentage: number; color: string }[];
}

export interface GenreEra {
  genre: string;
  startPeriod: string;
  endPeriod: string;
  dominancePercent: number;
}

const GENRE_COLORS: Record<string, string> = {
  'RPG': '#8b5cf6',
  'Action': '#ef4444',
  'Adventure': '#f97316',
  'Sports': '#10b981',
  'Strategy': '#3b82f6',
  'Puzzle': '#eab308',
  'Simulation': '#06b6d4',
  'Horror': '#a855f7',
  'Racing': '#ec4899',
  'Shooter': '#f59e0b',
  'Platformer': '#14b8a6',
  'Fighting': '#e879f9',
  'Indie': '#84cc16',
  'Other': '#6b7280',
};

function getGenreColor(genre: string): string {
  return GENRE_COLORS[genre] || GENRE_COLORS['Other'];
}

/**
 * Build stacked area data showing genre share of hours over time.
 */
export function getGenreEpochsData(games: Game[]): { periods: GenreEpochPeriod[]; eras: GenreEra[] } {
  const ownedGames = games.filter(g => g.status !== 'Wishlist');

  // Collect hours by month by genre
  const dataByMonth: Record<string, Record<string, number>> = {};
  ownedGames.forEach(game => {
    const genre = game.genre || 'Other';
    game.playLogs?.forEach(log => {
      const mk = log.date.substring(0, 7);
      if (!dataByMonth[mk]) dataByMonth[mk] = {};
      dataByMonth[mk][genre] = (dataByMonth[mk][genre] || 0) + log.hours;
    });
    // Attribute baseline hours if no logs
    if (game.hours > 0 && (!game.playLogs || game.playLogs.length === 0)) {
      const mk = (game.startDate || game.datePurchased || game.createdAt)?.substring(0, 7);
      if (mk) {
        if (!dataByMonth[mk]) dataByMonth[mk] = {};
        dataByMonth[mk][genre] = (dataByMonth[mk][genre] || 0) + game.hours;
      }
    }
  });

  const sortedMonths = Object.keys(dataByMonth).sort();
  if (sortedMonths.length === 0) return { periods: [], eras: [] };

  // Collect all genres
  const allGenres = new Set<string>();
  Object.values(dataByMonth).forEach(monthData => {
    Object.keys(monthData).forEach(g => allGenres.add(g));
  });

  // Build periods
  const periods: GenreEpochPeriod[] = sortedMonths.map(mk => {
    const [yr, mo] = mk.split('-').map(Number);
    const monthData = dataByMonth[mk];
    const totalHours = Object.values(monthData).reduce((s, h) => s + h, 0);

    const bands = Array.from(allGenres)
      .map(genre => ({
        genre,
        hours: monthData[genre] || 0,
        percentage: totalHours > 0 ? ((monthData[genre] || 0) / totalHours) * 100 : 0,
        color: getGenreColor(genre),
      }))
      .filter(b => b.hours > 0)
      .sort((a, b) => b.hours - a.hours);

    return {
      period: mk,
      periodLabel: `${MONTH_LABELS[mo - 1]} ${yr}`,
      totalHours: Math.round(totalHours * 10) / 10,
      bands,
    };
  });

  // Detect eras: consecutive months where a genre has >50% share
  const eras: GenreEra[] = [];
  let currentEra: { genre: string; start: string; end: string; totalPercent: number; months: number } | null = null;

  for (const period of periods) {
    const dominant = period.bands[0];
    if (dominant && dominant.percentage > 50) {
      if (currentEra && currentEra.genre === dominant.genre) {
        currentEra.end = period.period;
        currentEra.totalPercent += dominant.percentage;
        currentEra.months++;
      } else {
        if (currentEra && currentEra.months >= 2) {
          eras.push({
            genre: currentEra.genre,
            startPeriod: currentEra.start,
            endPeriod: currentEra.end,
            dominancePercent: Math.round(currentEra.totalPercent / currentEra.months),
          });
        }
        currentEra = { genre: dominant.genre, start: period.period, end: period.period, totalPercent: dominant.percentage, months: 1 };
      }
    } else {
      if (currentEra && currentEra.months >= 2) {
        eras.push({
          genre: currentEra.genre,
          startPeriod: currentEra.start,
          endPeriod: currentEra.end,
          dominancePercent: Math.round(currentEra.totalPercent / currentEra.months),
        });
      }
      currentEra = null;
    }
  }
  if (currentEra && currentEra.months >= 2) {
    eras.push({
      genre: currentEra.genre,
      startPeriod: currentEra.start,
      endPeriod: currentEra.end,
      dominancePercent: Math.round(currentEra.totalPercent / currentEra.months),
    });
  }

  return { periods, eras };
}

// ============================================================
// Gaming Pulse — daily/weekly hours heartbeat line data
// ============================================================

export interface GamingPulsePoint {
  date: string;
  hours: number;
  dominantGame: string;
  dominantGameColor: string;
}

export interface GamingPulseAnnotation {
  date: string;
  type: 'start' | 'completion' | 'purchase' | 'drought_start' | 'drought_end';
  label: string;
  gameId?: string;
}

export interface GamingPulseDrought {
  start: string;
  end: string;
  days: number;
}

/**
 * Build heartbeat-style data: hours per day across the entire history.
 */
export function getGamingPulseData(games: Game[]): {
  points: GamingPulsePoint[];
  annotations: GamingPulseAnnotation[];
  droughts: GamingPulseDrought[];
} {
  const ownedGames = games.filter(g => g.status !== 'Wishlist');

  // Collect hours per day per game
  const dayData: Record<string, Record<string, number>> = {}; // date -> { gameName: hours }
  ownedGames.forEach(game => {
    game.playLogs?.forEach(log => {
      if (!dayData[log.date]) dayData[log.date] = {};
      dayData[log.date][game.name] = (dayData[log.date][game.name] || 0) + log.hours;
    });
  });

  const sortedDays = Object.keys(dayData).sort();
  if (sortedDays.length === 0) return { points: [], annotations: [], droughts: [] };

  // Build points
  const points: GamingPulsePoint[] = sortedDays.map(date => {
    const gamesPlayed = dayData[date];
    const totalHours = Object.values(gamesPlayed).reduce((s, h) => s + h, 0);
    const dominant = Object.entries(gamesPlayed).sort((a, b) => b[1] - a[1])[0];
    const dominantGame = ownedGames.find(g => g.name === dominant[0]);

    return {
      date,
      hours: Math.round(totalHours * 10) / 10,
      dominantGame: dominant[0],
      dominantGameColor: dominantGame ? getGameColor(dominantGame.id, 0) : '#8b5cf6',
    };
  });

  // Build annotations from game events
  const annotations: GamingPulseAnnotation[] = [];
  ownedGames.forEach(game => {
    if (game.startDate) {
      annotations.push({ date: game.startDate, type: 'start', label: `Started ${game.name}`, gameId: game.id });
    }
    if (game.endDate && game.status === 'Completed') {
      annotations.push({ date: game.endDate, type: 'completion', label: `Completed ${game.name}`, gameId: game.id });
    }
    if (game.datePurchased) {
      annotations.push({ date: game.datePurchased, type: 'purchase', label: `Bought ${game.name}`, gameId: game.id });
    }
  });

  // Detect droughts (7+ day gaps with no activity)
  const droughts: GamingPulseDrought[] = [];
  for (let i = 1; i < sortedDays.length; i++) {
    const prev = parseLocalDate(sortedDays[i - 1]);
    const curr = parseLocalDate(sortedDays[i]);
    const gapDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
    if (gapDays >= 7) {
      droughts.push({ start: sortedDays[i - 1], end: sortedDays[i], days: gapDays });
    }
  }

  return { points, annotations, droughts };
}

// ============================================================
// Filmstrip Timeline — month-by-month snapshot frames
// ============================================================

export interface FilmstripFrame {
  period: string;
  periodLabel: string;
  heroThumbnail?: string;
  heroGameName: string;
  totalHours: number;
  gameCount: number;
  topGames: { name: string; hours: number; thumbnail?: string }[];
  purchaseCount: number;
  completionCount: number;
  isCurrentMonth: boolean;
}

/**
 * Build filmstrip frames: one per month, showing top games and key stats.
 */
export function getFilmstripData(games: Game[]): FilmstripFrame[] {
  const ownedGames = games.filter(g => g.status !== 'Wishlist');

  // Hours per game per month
  const monthGameHours: Record<string, Record<string, number>> = {};
  ownedGames.forEach(game => {
    game.playLogs?.forEach(log => {
      const mk = log.date.substring(0, 7);
      if (!monthGameHours[mk]) monthGameHours[mk] = {};
      monthGameHours[mk][game.id] = (monthGameHours[mk][game.id] || 0) + log.hours;
    });
  });

  // Also include months with purchases/completions even if no play logs
  ownedGames.forEach(game => {
    if (game.datePurchased) {
      const mk = game.datePurchased.substring(0, 7);
      if (!monthGameHours[mk]) monthGameHours[mk] = {};
    }
    if (game.endDate) {
      const mk = game.endDate.substring(0, 7);
      if (!monthGameHours[mk]) monthGameHours[mk] = {};
    }
  });

  const sortedMonths = Object.keys(monthGameHours).sort();
  if (sortedMonths.length === 0) return [];

  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // Game lookup by id
  const gameById = new Map(ownedGames.map(g => [g.id, g]));

  return sortedMonths.map(mk => {
    const [yr, mo] = mk.split('-').map(Number);
    const gameHours = monthGameHours[mk] || {};

    // Sort games by hours this month
    const topEntries = Object.entries(gameHours)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const topGames = topEntries.map(([gid, hours]) => {
      const g = gameById.get(gid);
      return { name: g?.name || 'Unknown', hours: Math.round(hours * 10) / 10, thumbnail: g?.thumbnail };
    });

    const totalHours = Object.values(gameHours).reduce((s, h) => s + h, 0);
    const uniqueGames = new Set(Object.keys(gameHours).filter(gid => (gameHours[gid] || 0) > 0));

    // Count purchases and completions this month
    let purchaseCount = 0;
    let completionCount = 0;
    ownedGames.forEach(game => {
      if (game.datePurchased?.substring(0, 7) === mk) purchaseCount++;
      if (game.endDate?.substring(0, 7) === mk && game.status === 'Completed') completionCount++;
    });

    const hero = topGames[0];

    return {
      period: mk,
      periodLabel: `${MONTH_LABELS[mo - 1]} ${yr}`,
      heroThumbnail: hero?.thumbnail,
      heroGameName: hero?.name || 'No activity',
      totalHours: Math.round(totalHours * 10) / 10,
      gameCount: uniqueGames.size,
      topGames,
      purchaseCount,
      completionCount,
      isCurrentMonth: mk === currentMonthKey,
    };
  });
}

// ============================================================
// Gaming Calendar — heatmap-style month calendar
// ============================================================

export interface CalendarDay {
  date: string;           // YYYY-MM-DD
  dayOfMonth: number;
  hours: number;
  sessions: number;
  games: { name: string; hours: number; thumbnail?: string }[];
  intensity: number;      // 0-4 heat level
  events: { type: 'purchase' | 'completion' | 'start'; gameName: string }[];
}

export interface CalendarMonth {
  year: number;
  month: number;
  label: string;
  days: (CalendarDay | null)[];  // 42 cells (6 weeks x 7 days), null for empty cells
  totalHours: number;
  totalSessions: number;
  activeDays: number;
  maxDayHours: number;
}

/**
 * Build calendar data for a given month, with hours per day and event markers.
 */
export function getCalendarData(games: Game[], year: number, month: number): CalendarMonth {
  const ownedGames = games.filter(g => g.status !== 'Wishlist');

  // Pre-compute day data
  const dayMap: Record<string, { hours: number; sessions: number; games: Record<string, { hours: number; thumbnail?: string }> }> = {};
  const eventMap: Record<string, { type: 'purchase' | 'completion' | 'start'; gameName: string }[]> = {};

  ownedGames.forEach(game => {
    game.playLogs?.forEach(log => {
      const mk = log.date.substring(0, 7);
      if (mk === `${year}-${String(month).padStart(2, '0')}`) {
        if (!dayMap[log.date]) dayMap[log.date] = { hours: 0, sessions: 0, games: {} };
        dayMap[log.date].hours += log.hours;
        dayMap[log.date].sessions++;
        if (!dayMap[log.date].games[game.name]) dayMap[log.date].games[game.name] = { hours: 0, thumbnail: game.thumbnail };
        dayMap[log.date].games[game.name].hours += log.hours;
      }
    });

    // Events
    const monthKey = `${year}-${String(month).padStart(2, '0')}`;
    if (game.datePurchased?.substring(0, 7) === monthKey) {
      const d = game.datePurchased;
      if (!eventMap[d]) eventMap[d] = [];
      eventMap[d].push({ type: 'purchase', gameName: game.name });
    }
    if (game.startDate?.substring(0, 7) === monthKey) {
      const d = game.startDate;
      if (!eventMap[d]) eventMap[d] = [];
      eventMap[d].push({ type: 'start', gameName: game.name });
    }
    if (game.endDate?.substring(0, 7) === monthKey && game.status === 'Completed') {
      const d = game.endDate;
      if (!eventMap[d]) eventMap[d] = [];
      eventMap[d].push({ type: 'completion', gameName: game.name });
    }
  });

  // Find max hours in any day for intensity scaling
  const maxHours = Math.max(1, ...Object.values(dayMap).map(d => d.hours));

  // Build calendar grid
  const firstDay = new Date(year, month - 1, 1);
  const startDow = firstDay.getDay(); // 0=Sun
  const daysInMonth = new Date(year, month, 0).getDate();

  const days: (CalendarDay | null)[] = [];
  let totalHours = 0;
  let totalSessions = 0;
  let activeDays = 0;

  // Pad leading empty cells
  for (let i = 0; i < startDow; i++) {
    days.push(null);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const data = dayMap[dateStr];
    const events = eventMap[dateStr] || [];
    const hours = data?.hours || 0;
    const sessions = data?.sessions || 0;

    totalHours += hours;
    totalSessions += sessions;
    if (hours > 0) activeDays++;

    // Intensity: 0 = no activity, 1-4 = quartiles
    let intensity = 0;
    if (hours > 0) {
      const ratio = hours / maxHours;
      if (ratio <= 0.25) intensity = 1;
      else if (ratio <= 0.5) intensity = 2;
      else if (ratio <= 0.75) intensity = 3;
      else intensity = 4;
    }

    const gamesList = data
      ? Object.entries(data.games)
        .map(([name, g]) => ({ name, hours: Math.round(g.hours * 10) / 10, thumbnail: g.thumbnail }))
        .sort((a, b) => b.hours - a.hours)
      : [];

    days.push({
      date: dateStr,
      dayOfMonth: d,
      hours: Math.round(hours * 10) / 10,
      sessions,
      games: gamesList,
      intensity,
      events,
    });
  }

  // Pad trailing empty cells to fill 6 weeks (42 cells)
  while (days.length < 42) {
    days.push(null);
  }

  return {
    year,
    month,
    label: `${MONTH_LABELS[month - 1]} ${year}`,
    days,
    totalHours: Math.round(totalHours * 10) / 10,
    totalSessions,
    activeDays,
    maxDayHours: Math.round(maxHours * 10) / 10,
  };
}

// ============================================================
// Mood Analysis — insights from session mood/context/vibe tags
// ============================================================

export interface MoodAnalysis {
  moodDistribution: { mood: SessionMood; count: number; percent: number; avgHours: number }[];
  bestMoodForRating: { mood: SessionMood; avgGameRating: number } | null;
  longestSessionMood: { mood: SessionMood; hours: number; game: string } | null;
  totalTaggedSessions: number;
  totalSessions: number;
  topGameByMood: Record<string, { game: string; hours: number }>;
}

/**
 * Analyze mood patterns across all play sessions that have mood data.
 */
export function getMoodAnalysis(games: Game[]): MoodAnalysis {
  const ownedGames = games.filter(g => g.status !== 'Wishlist');

  let totalSessions = 0;
  let totalTaggedSessions = 0;

  const moodData: Record<SessionMood, { count: number; totalHours: number; sessions: { game: Game; hours: number }[] }> = {
    great: { count: 0, totalHours: 0, sessions: [] },
    good: { count: 0, totalHours: 0, sessions: [] },
    meh: { count: 0, totalHours: 0, sessions: [] },
    grind: { count: 0, totalHours: 0, sessions: [] },
  };

  ownedGames.forEach(game => {
    game.playLogs?.forEach(log => {
      totalSessions++;
      if (log.mood) {
        totalTaggedSessions++;
        moodData[log.mood].count++;
        moodData[log.mood].totalHours += log.hours;
        moodData[log.mood].sessions.push({ game, hours: log.hours });
      }
    });
  });

  // Distribution
  const moodDistribution = (['great', 'good', 'meh', 'grind'] as SessionMood[])
    .filter(mood => moodData[mood].count > 0)
    .map(mood => ({
      mood,
      count: moodData[mood].count,
      percent: totalTaggedSessions > 0 ? Math.round((moodData[mood].count / totalTaggedSessions) * 100) : 0,
      avgHours: moodData[mood].count > 0 ? Math.round((moodData[mood].totalHours / moodData[mood].count) * 10) / 10 : 0,
    }));

  // Best mood for high-rated games
  let bestMoodForRating: MoodAnalysis['bestMoodForRating'] = null;
  const moodRatings: Record<string, { totalRating: number; count: number }> = {};
  ownedGames.forEach(game => {
    game.playLogs?.forEach(log => {
      if (log.mood && game.rating > 0) {
        if (!moodRatings[log.mood]) moodRatings[log.mood] = { totalRating: 0, count: 0 };
        moodRatings[log.mood].totalRating += game.rating;
        moodRatings[log.mood].count++;
      }
    });
  });
  let bestAvg = 0;
  for (const [mood, data] of Object.entries(moodRatings)) {
    const avg = data.count > 0 ? data.totalRating / data.count : 0;
    if (avg > bestAvg) {
      bestAvg = avg;
      bestMoodForRating = { mood: mood as SessionMood, avgGameRating: Math.round(avg * 10) / 10 };
    }
  }

  // Longest session by mood
  let longestSessionMood: MoodAnalysis['longestSessionMood'] = null;
  for (const [mood, data] of Object.entries(moodData)) {
    for (const session of data.sessions) {
      if (!longestSessionMood || session.hours > longestSessionMood.hours) {
        longestSessionMood = { mood: mood as SessionMood, hours: session.hours, game: session.game.name };
      }
    }
  }

  // Top game per mood
  const topGameByMood: Record<string, { game: string; hours: number }> = {};
  for (const [mood, data] of Object.entries(moodData)) {
    const gameHours: Record<string, number> = {};
    data.sessions.forEach(s => {
      gameHours[s.game.name] = (gameHours[s.game.name] || 0) + s.hours;
    });
    const top = Object.entries(gameHours).sort((a, b) => b[1] - a[1])[0];
    if (top) {
      topGameByMood[mood] = { game: top[0], hours: Math.round(top[1] * 10) / 10 };
    }
  }

  return {
    moodDistribution,
    bestMoodForRating,
    longestSessionMood,
    totalTaggedSessions,
    totalSessions,
    topGameByMood,
  };
}

// ============================================================
// Yearly Wrapped — extended year-in-review for story mode
// ============================================================

export interface YearlyWrappedData {
  year: number;
  hasData: boolean;

  // Core stats
  totalHours: number;
  totalSessions: number;
  totalSpent: number;
  gamesAcquired: number;
  gamesCompleted: number;
  gamesStarted: number;
  gamesAbandoned: number;
  avgCostPerHour: number;
  completionRate: number;

  // Top games
  top10Games: { name: string; hours: number; rating: number; thumbnail?: string }[];
  gameOfTheYear: { name: string; hours: number; rating: number; thumbnail?: string } | null;

  // Genre breakdown
  genreBreakdown: { genre: string; hours: number; percent: number }[];
  topGenre: string;

  // Monthly trends
  monthlyHours: { month: string; label: string; hours: number }[];
  peakMonth: { month: string; label: string; hours: number } | null;

  // Superlatives
  fastestCompletion: { name: string; days: number } | null;
  longestSession: { name: string; hours: number } | null;
  biggestSurprise: { name: string; reason: string } | null;  // low price, high rating
  bestValue: { name: string; costPerHour: number } | null;
  worstValue: { name: string; costPerHour: number } | null;

  // Personality
  personalityType: string;

  // Spending
  totalSaved: number;
  avgPurchasePrice: number;

  // Comparative
  hoursPerDay: number;
  hoursPerWeek: number;
}

export function getYearlyWrappedData(games: Game[], year: number): YearlyWrappedData {
  const yearStr = year.toString();
  const ownedGames = games.filter(g => g.status !== 'Wishlist');

  // Games acquired this year
  const yearAcquired = ownedGames.filter(g => g.datePurchased?.startsWith(yearStr));
  const gamesAcquired = yearAcquired.length;

  // Games with activity this year (from play logs)
  let totalHours = 0;
  let totalSessions = 0;
  const hoursByGame: Record<string, { hours: number; game: Game }> = {};
  const hoursByGenre: Record<string, number> = {};
  const hoursByMonth: Record<string, number> = {};
  let longestSession: { name: string; hours: number } | null = null;

  ownedGames.forEach(game => {
    game.playLogs?.forEach(log => {
      if (log.date.startsWith(yearStr)) {
        totalHours += log.hours;
        totalSessions++;

        if (!hoursByGame[game.id]) hoursByGame[game.id] = { hours: 0, game };
        hoursByGame[game.id].hours += log.hours;

        if (game.genre) {
          hoursByGenre[game.genre] = (hoursByGenre[game.genre] || 0) + log.hours;
        }

        const mk = log.date.substring(0, 7);
        hoursByMonth[mk] = (hoursByMonth[mk] || 0) + log.hours;

        if (!longestSession || log.hours > longestSession.hours) {
          longestSession = { name: game.name, hours: log.hours };
        }
      }
    });
  });

  const hasData = totalHours > 0 || gamesAcquired > 0;

  // Completed, started, abandoned this year
  const gamesCompleted = ownedGames.filter(g => g.status === 'Completed' && g.endDate?.startsWith(yearStr)).length;
  const gamesStarted = ownedGames.filter(g => g.startDate?.startsWith(yearStr)).length;
  const gamesAbandoned = ownedGames.filter(g => g.status === 'Abandoned' && g.endDate?.startsWith(yearStr)).length;

  const totalSpent = yearAcquired.reduce((s, g) => s + g.price, 0);
  const avgCostPerHour = totalHours > 0 ? totalSpent / totalHours : 0;
  const completionRate = gamesStarted > 0 ? (gamesCompleted / gamesStarted) * 100 : 0;

  // Top 10 games
  const top10Games = Object.values(hoursByGame)
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 10)
    .map(entry => ({
      name: entry.game.name,
      hours: Math.round(entry.hours * 10) / 10,
      rating: entry.game.rating,
      thumbnail: entry.game.thumbnail,
    }));

  const gameOfTheYear = top10Games[0] || null;

  // Genre breakdown
  const totalGenreHours = Object.values(hoursByGenre).reduce((s, h) => s + h, 0) || 1;
  const genreBreakdown = Object.entries(hoursByGenre)
    .sort((a, b) => b[1] - a[1])
    .map(([genre, hours]) => ({
      genre,
      hours: Math.round(hours * 10) / 10,
      percent: Math.round((hours / totalGenreHours) * 100),
    }));
  const topGenre = genreBreakdown[0]?.genre || 'Unknown';

  // Monthly trends
  const monthlyHours: YearlyWrappedData['monthlyHours'] = [];
  for (let m = 1; m <= 12; m++) {
    const mk = `${year}-${String(m).padStart(2, '0')}`;
    monthlyHours.push({
      month: mk,
      label: MONTH_LABELS[m - 1],
      hours: Math.round((hoursByMonth[mk] || 0) * 10) / 10,
    });
  }
  const peakMonth = monthlyHours.reduce((best, m) => m.hours > (best?.hours || 0) ? m : best, null as YearlyWrappedData['peakMonth']);

  // Superlatives
  let fastestCompletion: YearlyWrappedData['fastestCompletion'] = null;
  ownedGames.forEach(game => {
    if (game.status === 'Completed' && game.startDate && game.endDate && game.endDate.startsWith(yearStr)) {
      const days = Math.round((parseLocalDate(game.endDate).getTime() - parseLocalDate(game.startDate).getTime()) / (1000 * 60 * 60 * 24));
      if (!fastestCompletion || days < fastestCompletion.days) {
        fastestCompletion = { name: game.name, days };
      }
    }
  });

  // Biggest surprise: cheap game with high rating
  let biggestSurprise: YearlyWrappedData['biggestSurprise'] = null;
  yearAcquired.forEach(game => {
    if (game.price <= 20 && game.rating >= 8 && getTotalHours(game) >= 10) {
      if (!biggestSurprise) {
        biggestSurprise = { name: game.name, reason: `$${game.price} for a ${game.rating}/10 game` };
      }
    }
  });

  // Best/worst value from games played this year
  let bestValue: YearlyWrappedData['bestValue'] = null;
  let worstValue: YearlyWrappedData['worstValue'] = null;
  Object.values(hoursByGame).forEach(({ hours, game }) => {
    if (game.price > 0 && hours > 0) {
      const cph = game.price / getTotalHours(game);
      if (!bestValue || cph < bestValue.costPerHour) {
        bestValue = { name: game.name, costPerHour: Math.round(cph * 100) / 100 };
      }
      if (!worstValue || cph > worstValue.costPerHour) {
        worstValue = { name: game.name, costPerHour: Math.round(cph * 100) / 100 };
      }
    }
  });

  // Personality (simplified)
  const personality = getGamingPersonality(ownedGames);

  // Savings
  const totalSaved = yearAcquired.reduce((s, g) => {
    if (g.acquiredFree) return s + (g.originalPrice || 0);
    if (g.originalPrice && g.originalPrice > g.price) return s + (g.originalPrice - g.price);
    return s;
  }, 0);

  const avgPurchasePrice = gamesAcquired > 0 ? totalSpent / gamesAcquired : 0;

  // Hours per day/week
  const daysInYear = 365;
  const hoursPerDay = totalHours / daysInYear;
  const hoursPerWeek = totalHours / 52;

  return {
    year,
    hasData,
    totalHours: Math.round(totalHours * 10) / 10,
    totalSessions,
    totalSpent: Math.round(totalSpent * 100) / 100,
    gamesAcquired,
    gamesCompleted,
    gamesStarted,
    gamesAbandoned,
    avgCostPerHour: Math.round(avgCostPerHour * 100) / 100,
    completionRate: Math.round(completionRate),
    top10Games,
    gameOfTheYear,
    genreBreakdown,
    topGenre,
    monthlyHours,
    peakMonth,
    fastestCompletion,
    longestSession,
    biggestSurprise,
    bestValue,
    worstValue,
    personalityType: personality.type,
    totalSaved: Math.round(totalSaved * 100) / 100,
    avgPurchasePrice: Math.round(avgPurchasePrice * 100) / 100,
    hoursPerDay: Math.round(hoursPerDay * 100) / 100,
    hoursPerWeek: Math.round(hoursPerWeek * 10) / 10,
  };
}
