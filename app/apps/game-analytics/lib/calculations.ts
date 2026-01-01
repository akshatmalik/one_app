import { Game, GameMetrics, AnalyticsSummary } from './types';

const BASELINE_COST = 3.5;

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
  const costPerHour = calculateCostPerHour(game.price, game.hours);
  const normalizedCost = costPerHour / BASELINE_COST;
  return {
    costPerHour,
    blendScore: calculateBlendScore(game.rating, costPerHour),
    normalizedCost,
    valueRating: getValueRating(costPerHour),
    roi: calculateROI(game.rating, game.hours, game.price),
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
  const playedGames = ownedGames.filter(g => g.hours > 0);

  // Financial calculations
  const totalSpent = ownedGames.reduce((sum, g) => sum + g.price, 0);
  const wishlistValue = wishlistGames.reduce((sum, g) => sum + g.price, 0);
  const backlogValue = notStartedGames.reduce((sum, g) => sum + g.price, 0);
  const averagePrice = ownedGames.length > 0 ? totalSpent / ownedGames.length : 0;

  // Time calculations
  const totalHours = ownedGames.reduce((sum, g) => sum + g.hours, 0);
  const averageHoursPerGame = playedGames.length > 0 ? totalHours / playedGames.length : 0;
  const averageCostPerHour = totalHours > 0 ? totalSpent / totalHours : 0;

  // Rating calculations
  const ratedGames = ownedGames.filter(g => g.hours > 0);
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
    // Best value (min 5 hours)
    const qualifiedForValue = playedGames.filter(g => g.hours >= 5);
    if (qualifiedForValue.length > 0) {
      const sortedByValue = [...qualifiedForValue].sort((a, b) =>
        calculateCostPerHour(a.price, a.hours) - calculateCostPerHour(b.price, b.hours)
      );
      const best = sortedByValue[0];
      bestValue = { name: best.name, costPerHour: calculateCostPerHour(best.price, best.hours) };

      // Worst value (min 2 hours, exclude free games)
      const paidGames = qualifiedForValue.filter(g => g.price > 0 && g.hours >= 2);
      if (paidGames.length > 0) {
        const worst = [...paidGames].sort((a, b) =>
          calculateCostPerHour(b.price, b.hours) - calculateCostPerHour(a.price, a.hours)
        )[0];
        worstValue = { name: worst.name, costPerHour: calculateCostPerHour(worst.price, worst.hours) };
      }
    }

    // Most played
    const sortedByHours = [...playedGames].sort((a, b) => b.hours - a.hours);
    mostPlayed = { name: sortedByHours[0].name, hours: sortedByHours[0].hours };

    // Highest rated
    const sortedByRating = [...ratedGames].sort((a, b) => b.rating - a.rating);
    if (sortedByRating.length > 0) {
      highestRated = { name: sortedByRating[0].name, rating: sortedByRating[0].rating };
    }

    // Best ROI
    const gamesWithROI = playedGames.map(g => ({
      ...g,
      roi: calculateROI(g.rating, g.hours, g.price)
    })).sort((a, b) => b.roi - a.roi);
    if (gamesWithROI.length > 0) {
      bestROI = { name: gamesWithROI[0].name, roi: gamesWithROI[0].roi };
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
    hoursByGenre[genre] = (hoursByGenre[genre] || 0) + game.hours;

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
      hoursByFranchise[game.franchise] = (hoursByFranchise[game.franchise] || 0) + game.hours;
      gamesByFranchise[game.franchise] = (gamesByFranchise[game.franchise] || 0) + 1;
    }
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
