export type GameStatus = 'Not Started' | 'In Progress' | 'Completed' | 'Wishlist' | 'Abandoned';

// ── Gaming Awards ──────────────────────────────────────────────

export type AwardPeriodType = 'week' | 'month' | 'quarter' | 'year';

export interface GameAward {
  id: string;
  category: string;       // e.g. 'game_of_week' | 'best_session' | 'disappointment_month'
  categoryLabel: string;  // e.g. 'Game of the Week'
  categoryIcon: string;   // e.g. '🎮'
  periodType: AwardPeriodType;
  periodKey: string;      // e.g. '2026-W07' | '2026-02' | '2026-Q1' | '2026'
  periodLabel: string;    // e.g. 'Feb 10–16' | 'February 2026' | 'Q1 2026' | '2026'
  awardedAt: string;      // ISO date
}

export type PurchaseSource = 'Steam' | 'PlayStation' | 'Xbox' | 'Nintendo' | 'Epic' | 'GOG' | 'Physical' | 'Other';

export type SubscriptionSource = 'PS Plus' | 'Game Pass' | 'Epic Free' | 'Prime Gaming' | 'Humble Choice' | 'Other';

export type SessionMood = 'great' | 'good' | 'meh' | 'grind';
export type SessionContext = 'solo' | 'co-op' | 'online' | 'couch-co-op' | 'stream';
export type SessionVibe = 'wind-down' | 'competitive' | 'exploration' | 'story' | 'achievement-hunting' | 'social';

export interface PlayLog {
  id: string;
  date: string;
  hours: number;
  notes?: string;
  mood?: SessionMood;
  context?: SessionContext;
  vibe?: SessionVibe;
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
  franchise?: string; // Game franchise/series (e.g., "The Witcher", "Final Fantasy")
  purchaseSource?: PurchaseSource;
  // Subscription/Free game tracking
  acquiredFree?: boolean; // Was this game acquired for free?
  originalPrice?: number; // Original value of the game (for calculating savings)
  subscriptionSource?: SubscriptionSource; // Which subscription service provided the game
  notes?: string;
  review?: string; // Personal review/thoughts about the game
  datePurchased?: string;
  startDate?: string; // When you started playing
  endDate?: string; // When you finished/stopped
  playLogs?: PlayLog[]; // Individual play sessions
  thumbnail?: string; // Game thumbnail URL from RAWG API
  awards?: GameAward[]; // User-given awards across all tiers
  isSpecial?: boolean; // Exceptional games the user loved despite any flaws
  queuePosition?: number; // Position in "Up Next" queue (1 = next to play, 2 = after that, etc.)
  createdAt: string;
  updatedAt: string;
}

export interface GameMetrics {
  costPerHour: number;
  blendScore: number;
  normalizedCost: number;
  valueRating: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  roi: number; // (ratingWeight * hours * 4.67) / price - Exponential rating weight favoring quality
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
  totalDiscountSavings: number; // Sum of (originalPrice - price) for paid games
  averageDiscount: number; // Average discount % across all games with discounts

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

  // Franchise stats
  spendingByFranchise: Record<string, number>;
  hoursByFranchise: Record<string, number>;
  gamesByFranchise: Record<string, number>;

  // Subscription/Free game stats
  freeGamesCount: number;
  totalSaved: number; // Sum of originalPrice for free games
  hoursBySubscription: Record<string, number>;
  savedBySubscription: Record<string, number>;
  gamesBySubscription: Record<string, number>;
}

export interface BudgetSettings {
  id: string;
  userId: string;
  year: number;
  yearlyBudget: number;
  createdAt: string;
  updatedAt: string;
}

export type GoalType = 'completion' | 'spending' | 'hours' | 'genre_variety' | 'backlog' | 'custom';
export type GoalStatus = 'active' | 'completed' | 'failed' | 'archived';

export interface GamingGoal {
  id: string;
  userId: string;
  title: string;
  description?: string;
  type: GoalType;
  targetValue: number;
  currentValue: number;
  unit: string; // "games", "dollars", "hours", "genres", etc.
  startDate: string;
  endDate: string;
  status: GoalStatus;
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

// ── Game Recommendations ──────────────────────────────────────────

export type RecommendationStatus = 'suggested' | 'interested' | 'watching' | 'wishlisted' | 'played' | 'dismissed';

export type ReleaseWindow = 'this-month' | 'next-few-months' | 'later';

export type RecommendationCategory = 'hidden-gem' | 'popular-in-genre' | 'because-you-loved' | 'try-something-different' | 'general';

export interface GameRecommendation {
  id: string;
  userId: string;
  gameName: string;
  genre?: string;
  platform?: string;
  thumbnail?: string;
  metacritic?: number;
  rawgRating?: number;
  releaseDate?: string;
  aiReason: string;           // "Why you'd love this" — personalized to user's library
  status: RecommendationStatus;
  isUpcoming?: boolean;       // true for unreleased/upcoming games
  releaseWindow?: ReleaseWindow; // Time bucket for upcoming games
  hypeScore?: number;         // 1-10 AI-generated match score for upcoming games
  recommendationCategory?: RecommendationCategory; // Category for released game recommendations
  categoryContext?: string;   // e.g. "Because You Loved Elden Ring" — the specific game/context
  suggestedAt: string;
  respondedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RecommendationRepository {
  setUserId(userId: string): void;
  getAll(): Promise<GameRecommendation[]>;
  create(rec: Omit<GameRecommendation, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<GameRecommendation>;
  update(id: string, updates: Partial<GameRecommendation>): Promise<GameRecommendation>;
  delete(id: string): Promise<void>;
}

// ── Game Rating Comparisons (ELO Battle System) ────────────────────

export type RankingPeriod = 'week' | 'month' | 'quarter' | 'year' | 'all';

export type GameTier = 'S' | 'A' | 'B' | 'C' | 'D' | 'F';

/** Maps gameId → assigned tier for a given period */
export type TierAssignmentMap = Record<string, GameTier>;

export interface GameRanking {
  id: string;
  userId: string;
  gameId: string;
  period: RankingPeriod;
  periodKey: string; // e.g. '2026-02', '2026-W08', '2026-Q1', '2026', 'all'
  eloScore: number;  // default 1000
  wins: number;
  losses: number;
  battlesCount: number;
  lastBattleAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface RatingBattle {
  id: string;
  userId: string;
  period: RankingPeriod;
  periodKey: string;
  winnerId: string;
  loserId: string;
  winnerEloChange: number;
  loserEloChange: number;
  battleDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface RankingRepository {
  setUserId(userId: string): void;
  getForPeriod(period: RankingPeriod, periodKey: string): Promise<GameRanking[]>;
  upsert(data: Omit<GameRanking, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<GameRanking>;
  deleteForGame(gameId: string): Promise<void>;
}

export interface BattleRepository {
  setUserId(userId: string): void;
  getForPeriod(period: RankingPeriod, periodKey: string): Promise<RatingBattle[]>;
  getPairHistory(gameId1: string, gameId2: string): Promise<RatingBattle[]>;
  create(data: Omit<RatingBattle, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<RatingBattle>;
}

// ── Error Log ────────────────────────────────────────────────────────

export interface ErrorLogEntry {
  id: string;
  timestamp: string;
  message: string;
  context?: string; // e.g. 'saveRanking', 'loadBattles'
  stack?: string;
}

// ── Purchase Queue ────────────────────────────────────────────────

export interface PurchaseQueueEntry {
  id: string;
  userId: string;

  // Game identity (from RAWG search)
  gameName: string;
  thumbnail?: string;
  platform?: string;
  genre?: string;
  releaseDate?: string;       // ISO date string from RAWG; undefined = TBA
  metacriticScore?: number;
  rawgRating?: number;

  // Purchase intent
  isDayOneBuy: boolean;       // Buy immediately on release / right now
  targetPrice?: number;       // "Buy it when it drops to $X"
  currentPrice?: number;      // Manually entered from PS Store / wherever
  msrpEstimate?: number;      // Expected full retail price
  notes?: string;

  // Queue management
  priority: number;           // Sort order — 1 = top

  // Status
  purchased: boolean;
  purchasedAt?: string;
  purchasePrice?: number;     // What you actually paid
  isMaybe?: boolean;          // Soft interest — not committed to budget/tracking

  addedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseQueueRepository {
  setUserId(userId: string): void;
  getAll(): Promise<PurchaseQueueEntry[]>;
  create(entry: Omit<PurchaseQueueEntry, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<PurchaseQueueEntry>;
  update(id: string, updates: Partial<PurchaseQueueEntry>): Promise<PurchaseQueueEntry>;
  delete(id: string): Promise<void>;
}

export interface TasteProfile {
  topGenres: string[];          // Ranked by hours × rating
  avoidGenres: string[];        // Low ratings or high abandonment
  platforms: string[];           // Platforms user plays on
  avgSessionHours: number;       // Average session length
  preferredGameLength: string;   // e.g., "20-40h"
  priceRange: string;            // e.g., "$15-$40"
  avgRating: number;
  topGames: Array<{ name: string; rating: number; hours: number; genre?: string }>;
  completionRate: number;
  favoriteGenreDetails: Array<{ genre: string; avgRating: number; avgHours: number; count: number }>;
}
