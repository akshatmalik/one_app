import { Game, GameMetrics, AnalyticsSummary } from './types';

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

export function calculateBlendScore(rating: number, costPerHour: number): number {
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

export function calculateROI(rating: number, hours: number, price: number): number {
  if (price === 0) return rating * hours;
  return (rating * hours) / price;
}

export function calculateDaysToComplete(startDate?: string, endDate?: string): number | null {
  if (!startDate || !endDate) return null;
  const start = new Date(startDate);
  const end = new Date(endDate);
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

  return allLogs.sort((a, b) => new Date(b.log.date).getTime() - new Date(a.log.date).getTime());
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
        const logDate = new Date(log.date);
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
export function getPeriodStatsForRange(games: Game[], startDate: Date, endDate: Date): PeriodStats {
  const gamesWithActivity: Map<string, { game: Game; hours: number; sessions: number }> = new Map();
  let totalHours = 0;
  let totalSessions = 0;

  games.forEach(game => {
    if (game.playLogs) {
      game.playLogs.forEach(log => {
        const logDate = new Date(log.date);
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
        ? Math.max(1, (Date.now() - new Date(game.datePurchased).getTime()) / (1000 * 60 * 60 * 24))
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
        ? (Date.now() - new Date(game.datePurchased).getTime()) / (1000 * 60 * 60 * 24)
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
    const logDate = new Date(dateStr);
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
export function getDiscountEffectiveness(games: Game[]): { avgSavings: number; bestDeal: Game | null } {
  const discountedGames = games.filter(g =>
    !g.acquiredFree && g.originalPrice && g.originalPrice > g.price && g.status !== 'Wishlist'
  );

  if (discountedGames.length === 0) {
    return { avgSavings: 0, bestDeal: null };
  }

  const totalSavings = discountedGames.reduce((sum, g) =>
    sum + ((g.originalPrice || 0) - g.price), 0
  );

  const bestDeal = discountedGames.sort((a, b) => {
    const aSavings = (a.originalPrice || 0) - a.price;
    const bSavings = (b.originalPrice || 0) - b.price;
    return bSavings - aSavings;
  })[0];

  return {
    avgSavings: totalSavings / discountedGames.length,
    bestDeal,
  };
}

// Get ROI rating label based on ROI value
// ROI = (rating * hours) / price
// Examples: $60 game, 30h, 8/10 = 4.0 | $70 game, 20h, 9/10 = 2.57 | $20 game, 50h, 9/10 = 22.5
export function getROIRating(roi: number): 'Excellent' | 'Good' | 'Fair' | 'Poor' {
  if (roi >= 5) return 'Excellent';   // Amazing value! (e.g., $70 game, 100h, 9 rating)
  if (roi >= 1.5) return 'Good';      // Solid value (e.g., $70 game, 15h, 8 rating)
  if (roi >= 0.5) return 'Fair';      // Decent value (e.g., $60 game, 5h, 6 rating)
  return 'Poor';                      // Low value (short playtime vs price)
}

// Get longest gaming streak ever
export function getLongestGamingStreak(games: Game[]): number {
  const allLogs = getAllPlayLogs(games);
  if (allLogs.length === 0) return 0;

  const uniqueDates = Array.from(new Set(allLogs.map(l => l.log.date))).sort();
  let longestStreak = 1;
  let currentStreak = 1;

  for (let i = 1; i < uniqueDates.length; i++) {
    const prevDate = new Date(uniqueDates[i - 1]);
    const currDate = new Date(uniqueDates[i]);
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

// Calculate night owl score (% of gaming between 10pm-4am)
export function getNightOwlScore(games: Game[]): number {
  // Since we don't have time data in play logs, we'll return 0 for now
  // This could be enhanced if play logs include time of day
  return 0;
}

// Calculate impulse buyer stat (average days between purchase and first play)
export function getImpulseBuyerStat(games: Game[]): number | null {
  const gamesWithData = games.filter(g =>
    g.datePurchased && g.playLogs && g.playLogs.length > 0 && g.status !== 'Wishlist'
  );

  if (gamesWithData.length === 0) return null;

  const delays = gamesWithData.map(game => {
    const purchaseDate = new Date(game.datePurchased!);
    const firstPlayDate = new Date(game.playLogs![0].date);
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
export function getHiddenGems(games: Game[]): Game[] {
  return games.filter(g =>
    getTotalHours(g) >= 10 &&
    g.status !== 'Wishlist' &&
    !g.acquiredFree &&
    g.price <= 10 &&
    g.rating >= 8
  ).sort((a, b) => {
    const aValue = calculateROI(a.rating, getTotalHours(a), a.price);
    const bValue = calculateROI(b.rating, getTotalHours(b), b.price);
    return bValue - aValue;
  });
}

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
