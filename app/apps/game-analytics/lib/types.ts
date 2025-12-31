export type GameStatus = 'Not Started' | 'In Progress' | 'Completed' | 'Wishlist' | 'Abandoned';

export interface Game {
  id: string;
  userId: string;
  name: string;
  price: number;
  hours: number;
  rating: number;
  status: GameStatus;
  platform?: string;
  genre?: string;
  notes?: string;
  datePurchased?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GameMetrics {
  costPerHour: number;
  blendScore: number;
  normalizedCost: number;
  valueRating: 'Excellent' | 'Good' | 'Fair' | 'Poor';
}

export interface AnalyticsSummary {
  totalSpent: number;
  gameCount: number;
  totalHours: number;
  averageCostPerHour: number;
  averageRating: number;
  wishlistCount: number;
  wishlistValue: number;
  completedCount: number;
  inProgressCount: number;
  bestValue: { name: string; costPerHour: number } | null;
  mostPlayed: { name: string; hours: number } | null;
  highestRated: { name: string; rating: number } | null;
}

export interface BudgetSettings {
  monthlyBudget: number;
  yearlyBudget: number;
}

export interface GameRepository {
  setUserId(userId: string): void;
  getAll(): Promise<Game[]>;
  getById(id: string): Promise<Game | null>;
  create(game: Omit<Game, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<Game>;
  update(id: string, updates: Partial<Game>): Promise<Game>;
  delete(id: string): Promise<void>;
}
