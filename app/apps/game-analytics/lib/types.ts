export type GameStatus = 'Not Started' | 'In Progress' | 'Completed' | 'Wishlist' | 'Abandoned';

export type PurchaseSource = 'Steam' | 'PlayStation' | 'Xbox' | 'Nintendo' | 'Epic' | 'GOG' | 'Physical' | 'Other';

export interface PlayLog {
  id: string;
  date: string;
  hours: number;
  notes?: string;
}

export interface Game {
  id: string;
  userId: string;
  name: string;
  price: number;
  hours: number; // Total hours (manual entry or sum of logs)
  rating: number;
  status: GameStatus;
  platform?: string;
  genre?: string;
  purchaseSource?: PurchaseSource;
  notes?: string;
  review?: string; // Personal review/thoughts about the game
  datePurchased?: string;
  startDate?: string; // When you started playing
  endDate?: string; // When you finished/stopped
  playLogs?: PlayLog[]; // Individual play sessions
  createdAt: string;
  updatedAt: string;
}

export interface GameMetrics {
  costPerHour: number;
  blendScore: number;
  normalizedCost: number;
  valueRating: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  roi: number; // (rating * hours) / price
  daysToComplete: number | null; // endDate - startDate
}

export interface AnalyticsSummary {
  // Counts
  totalGames: number;
  ownedCount: number;
  wishlistCount: number;
  completedCount: number;
  inProgressCount: number;
  notStartedCount: number;
  abandonedCount: number;

  // Financial
  totalSpent: number;
  wishlistValue: number;
  backlogValue: number; // Value of unplayed games
  averagePrice: number;
  averageCostPerHour: number;

  // Time
  totalHours: number;
  averageHoursPerGame: number;
  averageRating: number;
  averageDaysToComplete: number | null;

  // Completion
  completionRate: number; // % of owned games completed

  // Highlights
  bestValue: { name: string; costPerHour: number } | null;
  worstValue: { name: string; costPerHour: number } | null;
  mostPlayed: { name: string; hours: number } | null;
  highestRated: { name: string; rating: number } | null;
  bestROI: { name: string; roi: number } | null;

  // By category
  spendingByGenre: Record<string, number>;
  spendingByPlatform: Record<string, number>;
  spendingBySource: Record<string, number>;
  spendingByYear: Record<string, number>;
  hoursByGenre: Record<string, number>;
}

export interface BudgetSettings {
  id: string;
  userId: string;
  year: number;
  yearlyBudget: number;
  createdAt: string;
  updatedAt: string;
}

export interface GameRepository {
  setUserId(userId: string): void;
  getAll(): Promise<Game[]>;
  getById(id: string): Promise<Game | null>;
  create(game: Omit<Game, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<Game>;
  update(id: string, updates: Partial<Game>): Promise<Game>;
  delete(id: string): Promise<void>;
}
