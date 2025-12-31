export type GameStatus = 'Not Started' | 'In Progress' | 'Completed';

export interface Game {
  id: string;
  userId: string; // Owner of the game
  name: string;
  price: number;
  hours: number;
  rating: number;
  status: GameStatus;
  notes?: string;
  datePurchased?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GameMetrics {
  costPerHour: number;
  blendScore: number;
  normalizedCost: number;
}

export interface AnalyticsSummary {
  totalSpent: number;
  gameCount: number;
  totalHours: number;
  averageCostPerHour: number;
  averageRating: number;
  budgetRemaining?: number;
}

export interface GameRepository {
  setUserId(userId: string): void;
  getAll(): Promise<Game[]>;
  getById(id: string): Promise<Game | null>;
  create(game: Omit<Game, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<Game>;
  update(id: string, updates: Partial<Game>): Promise<Game>;
  delete(id: string): Promise<void>;
}
