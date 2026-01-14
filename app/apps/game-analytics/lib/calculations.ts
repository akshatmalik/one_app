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
  const dates = allLogs.map(l => new Date(l.log.date).getTime());
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
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    return new Date(sortedLogs[0].date);
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
    const purchaseDate = new Date(game.datePurchased);
    const firstPlayDate = new Date(game.playLogs[game.playLogs.length - 1].date); // oldest log
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
    ? Math.floor((Date.now() - new Date(firstGameDate).getTime()) / (1000 * 60 * 60 * 24))
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
    g.status === 'Completed' && g.endDate && new Date(g.endDate) >= sixMonthsAgo
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
    return g.playLogs.some(log => new Date(log.date) >= lastMonth);
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
      const endDate = new Date(game.endDate);
      if (endDate >= lastMonday && endDate <= lastSunday) {
        completedGames.push(game);
      }
    }

    // Check for new games started
    if (game.startDate) {
      const startDate = new Date(game.startDate);
      if (startDate >= lastMonday && startDate <= lastSunday) {
        newGamesStarted.push(game);
      }
    }

    // Process play logs
    if (game.playLogs) {
      let hadPreviousLogs = false;

      game.playLogs.forEach(log => {
        const logDate = new Date(log.date);

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
  };
}

// Get last completed week (Monday-Sunday) with comprehensive stats
// This is a wrapper around getWeekStatsForOffset for backwards compatibility
export function getLastCompletedWeekStats(games: Game[]): WeekInReviewData {
  return getWeekStatsForOffset(games, 0);
}

// Get the number of weeks with data (to know how far back we can navigate)
export function getAvailableWeeksCount(games: Game[]): number {
  const allLogs = getAllPlayLogs(games);
  if (allLogs.length === 0) return 0;

  // Find oldest play log
  const oldestLog = allLogs[allLogs.length - 1]; // Already sorted by date descending
  const oldestDate = new Date(oldestLog.log.date);

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
      const logDate = new Date(log.date);
      return logDate >= startDate && logDate <= endDate;
    });
  });
}

