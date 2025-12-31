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

export function calculateMetrics(game: Game): GameMetrics {
  const costPerHour = calculateCostPerHour(game.price, game.hours);
  const normalizedCost = costPerHour / BASELINE_COST;
  return {
    costPerHour,
    blendScore: calculateBlendScore(game.rating, costPerHour),
    normalizedCost,
    valueRating: getValueRating(costPerHour),
  };
}

export function calculateSummary(games: Game[]): AnalyticsSummary {
  const ownedGames = games.filter(g => g.status !== 'Wishlist');
  const wishlistGames = games.filter(g => g.status === 'Wishlist');
  const completedGames = ownedGames.filter(g => g.status === 'Completed');
  const inProgressGames = ownedGames.filter(g => g.status === 'In Progress');

  if (ownedGames.length === 0) {
    return {
      totalSpent: 0,
      gameCount: 0,
      totalHours: 0,
      averageCostPerHour: 0,
      averageRating: 0,
      wishlistCount: wishlistGames.length,
      wishlistValue: wishlistGames.reduce((sum, g) => sum + g.price, 0),
      completedCount: 0,
      inProgressCount: 0,
      bestValue: null,
      mostPlayed: null,
      highestRated: null,
    };
  }

  const totalSpent = ownedGames.reduce((sum, game) => sum + game.price, 0);
  const totalHours = ownedGames.reduce((sum, game) => sum + game.hours, 0);
  const ratedGames = ownedGames.filter(g => g.hours > 0);
  const totalRating = ratedGames.reduce((sum, game) => sum + game.rating, 0);

  // Find best value game (lowest cost per hour with at least 1 hour)
  const playedGames = ownedGames.filter(g => g.hours > 0);
  let bestValue: { name: string; costPerHour: number } | null = null;
  let mostPlayed: { name: string; hours: number } | null = null;
  let highestRated: { name: string; rating: number } | null = null;

  if (playedGames.length > 0) {
    const sortedByValue = [...playedGames].sort((a, b) =>
      calculateCostPerHour(a.price, a.hours) - calculateCostPerHour(b.price, b.hours)
    );
    const best = sortedByValue[0];
    bestValue = { name: best.name, costPerHour: calculateCostPerHour(best.price, best.hours) };

    const sortedByHours = [...playedGames].sort((a, b) => b.hours - a.hours);
    mostPlayed = { name: sortedByHours[0].name, hours: sortedByHours[0].hours };

    const sortedByRating = [...ratedGames].sort((a, b) => b.rating - a.rating);
    if (sortedByRating.length > 0) {
      highestRated = { name: sortedByRating[0].name, rating: sortedByRating[0].rating };
    }
  }

  return {
    totalSpent,
    gameCount: ownedGames.length,
    totalHours,
    averageCostPerHour: totalHours > 0 ? totalSpent / totalHours : 0,
    averageRating: ratedGames.length > 0 ? totalRating / ratedGames.length : 0,
    wishlistCount: wishlistGames.length,
    wishlistValue: wishlistGames.reduce((sum, g) => sum + g.price, 0),
    completedCount: completedGames.length,
    inProgressCount: inProgressGames.length,
    bestValue,
    mostPlayed,
    highestRated,
  };
}
