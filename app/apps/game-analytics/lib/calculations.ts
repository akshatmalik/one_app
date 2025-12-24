import { Game, GameMetrics, AnalyticsSummary } from './types';

const BASELINE_COST = 3.5;
const BUDGET_2026 = 910;

export function getGameYear(game: Game): number {
  if (game.datePurchased) {
    return new Date(game.datePurchased).getFullYear();
  }
  return new Date(game.createdAt).getFullYear();
}

export function getCurrentYear(): number {
  return new Date().getFullYear();
}

export function filterGamesByYear(games: Game[], year: number | 'all'): Game[] {
  if (year === 'all') return games;
  return games.filter(game => getGameYear(game) === year);
}

export function getAvailableYears(games: Game[]): number[] {
  const years = new Set(games.map(getGameYear));
  return Array.from(years).sort((a, b) => b - a);
}

export function calculateCostPerHour(price: number, hours: number): number {
  return hours > 0 ? price / hours : 0;
}

export function calculateBlendScore(rating: number, costPerHour: number): number {
  const normalizedCost = Math.min(costPerHour / BASELINE_COST, 1);
  return (rating * 10) + (10 - normalizedCost * 10);
}

export function calculateMetrics(game: Game): GameMetrics {
  const costPerHour = calculateCostPerHour(game.price, game.hours);
  const normalizedCost = costPerHour / BASELINE_COST;
  return {
    costPerHour,
    blendScore: calculateBlendScore(game.rating, costPerHour),
    normalizedCost,
  };
}

export function calculateSummary(games: Game[]): AnalyticsSummary {
  if (games.length === 0) {
    return {
      totalSpent: 0,
      gameCount: 0,
      totalHours: 0,
      averageCostPerHour: 0,
      averageRating: 0,
      budgetRemaining: BUDGET_2026,
    };
  }

  const totalSpent = games.reduce((sum, game) => sum + game.price, 0);
  const totalHours = games.reduce((sum, game) => sum + game.hours, 0);
  const totalRating = games.reduce((sum, game) => sum + game.rating, 0);

  return {
    totalSpent,
    gameCount: games.length,
    totalHours,
    averageCostPerHour: totalSpent / totalHours,
    averageRating: totalRating / games.length,
    budgetRemaining: BUDGET_2026 - totalSpent,
  };
}
