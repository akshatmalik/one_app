// Card Types
export type CardType = 'survivor' | 'item' | 'action';
export type CardStatus = 'healthy' | 'exhausted' | 'injured' | 'infected' | 'traumatized';
export type SurvivorRole = 'healer' | 'fighter' | 'scout' | 'mechanic' | 'scientist';

// Run phase state machine
export type RunPhase =
  | 'preparation'       // Selecting deck
  | 'stage_start'       // Show encounter description
  | 'hand_draw'         // Draw 2 cards
  | 'card_selection'    // Player chooses cards to play
  | 'combat_resolution' // Calculate damage
  | 'stage_complete'    // Victory or loss for this stage
  | 'run_complete'      // All 3 stages done or party wiped
  | 'run_failed';       // Total party wipe

// Attributes
export interface Attributes {
  combat: number;
  defense: number;
  healing: number;
  speed: number;
  perception: number;
}

// Special ability
export interface SpecialAbility {
  name: string;
  description: string;
  trigger: 'on_play' | 'passive' | 'combat';
  effect: (context: any) => void;
}

// Card data
export interface Card {
  id: string;
  type: CardType;
  name: string;
  description: string;
  imageUrl?: string;

  // For survivors
  role?: SurvivorRole;
  attributes?: Attributes;
  maxHealth?: number;

  // For items/actions
  itemType?: 'equipment' | 'consumable' | 'action';
  bonusAttributes?: Partial<Attributes>;

  // Special ability
  special?: SpecialAbility;

  // State
  currentHealth?: number;
  status: CardStatus;
  exhausted: boolean;
  recoveryTime: number; // days
}

// Card instance (with current state)
export interface CardInstance extends Card {
  currentHealth: number;
  status: CardStatus;
  exhausted: boolean;
  recoveryTime: number;
  damageTaken?: number;
}

// Hand (cards drawn for current encounter)
export interface Hand {
  cards: CardInstance[];
  maxSize: number;
}

// Enemy
export interface Enemy {
  name: string;
  health: number;
  maxHealth: number;
  damage: number;
  defense: number;
}

// Encounter
export type EncounterType = 'combat' | 'choice' | 'rest' | 'event';

export interface Decision {
  id: string;
  text: string;
  consequence: string;
  rewards?: string[];
}

export interface Encounter {
  id: string;
  stage: number;
  type: EncounterType;
  name: string;
  description: string;
  location?: string;

  // Combat data
  enemies?: Enemy[];
  difficulty?: 'easy' | 'medium' | 'hard' | 'very_hard';

  // Decision data
  prompt?: string;
  decisions?: Decision[];

  // Rewards
  itemsToFind?: string[];
  rewardsText?: string;
}

// Synergy
export interface Synergy {
  id: string;
  cardIds: string[];
  name: string;
  description: string;
  damageBonus: number;
  defenseBonus: number;
  healingBonus: number;
}

// Combat result
export interface CombatResult {
  damageDealt: number;
  damageTaken: number;
  healingDone: number;
  enemiesAfter: Enemy[];
  survivorsAfter: CardInstance[];
  synergiesTriggered: Synergy[];
  damageBreakdown: DamageBreakdown;
  result: 'player-victory' | 'player-loss' | 'combat-continues';
}

export interface DamageBreakdown {
  baseSurvivorDamage: number;
  attributeBonus: number;
  itemBonus: number;
  synergyBonus: number;
  totalDamageDealt: number;
  totalEnemyDamage: number;
  defenseReduction: number;
  netDamageTaken: number;
}

// Combat action
export interface CombatAction {
  cardsPlayed: CardInstance[];
  damageDealt: number;
  damageReceived: number;
  result: 'win' | 'loss' | 'partial';
}

// Stage history
export interface StageHistory {
  stageNum: number;
  encounter: Encounter;
  decision?: string;
  cardsPlayed?: CardInstance[];
  result: 'completed' | 'failed' | 'skipped';
  itemsFound?: CardInstance[];
}

// Run
export interface Run {
  runId: string;
  status: 'in_progress' | 'completed' | 'failed';
  phase: RunPhase;
  createdAt: string;
  completedAt?: string;

  // Deck
  deck: CardInstance[];
  currentHand: CardInstance[];
  playedCardsThisRun: string[]; // card IDs already played

  // Current encounter
  currentEncounter?: Encounter;
  lastCombatResult?: CombatResult;

  // Progress
  currentStage: number;
  totalStages: number;
  stages: StageHistory[];

  // Rewards
  itemsFound: CardInstance[];
  survivorStats: Record<string, { expGained: number }>;

  // Survivors in this run
  activeSurvivors: CardInstance[];

  // Tactical options
  isBarricaded?: boolean;   // Built a barricade after stage 2 — +30 defense in stage 3
  isRetreat?: boolean;      // Player chose to retreat before engaging
}

// Home base state
export interface HomeBaseState {
  survivors: CardInstance[];
  items: CardInstance[];
  inventory: CardInstance[];
  completedRuns: Run[];
  currentRun?: Run;
}

// Game state
export interface GameState {
  userId: string;
  deck: CardInstance[];
  homeBase: HomeBaseState;
  currentRun?: Run;
  createdAt: string;
  updatedAt: string;
}

// Repository interface
export interface DeckBuilderRepository {
  // State management
  getGameState(): Promise<GameState>;
  setGameState(state: GameState): Promise<void>;

  // Card operations
  getAllCards(): Promise<CardInstance[]>;
  getCardById(id: string): Promise<CardInstance | null>;

  // Run operations
  createRun(deck: CardInstance[]): Promise<Run>;
  updateRun(runId: string, updates: Partial<Run>): Promise<Run>;
  completeRun(runId: string): Promise<Run>;

  // Recovery operations
  setRecoveryTime(cardId: string, days: number): Promise<void>;
  advanceRecovery(days: number): Promise<void>;
}
