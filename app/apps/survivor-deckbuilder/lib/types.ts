// Card Types
export type CardType = 'survivor' | 'item' | 'action';
export type CardStatus = 'healthy' | 'exhausted' | 'injured' | 'infected' | 'traumatized';
export type SurvivorRole = 'healer' | 'fighter' | 'scout' | 'mechanic' | 'scientist';

// Enemy types — each has a weakness card type and modifiers
export type EnemyType = 'straggler' | 'horde' | 'infected' | 'armored' | 'ambush' | 'raiders';

// Environmental stage conditions applied to encounters
export type StageCondition = 'night' | 'rain' | 'infected_zone' | 'fortified' | 'fog' | 'timed';

// Run mode: Sprint = fast/risky 2-stage, Siege = full 3-stage
export type RunMode = 'sprint' | 'siege';

// Survivor hunger/condition states
export type SurvivorCondition = 'healthy' | 'hungry' | 'starving';

// Daily assignments at home base
export type SurvivorAssignment = 'guard' | 'garden' | 'workshop' | 'infirmary' | 'scavenge' | 'rest' | null;

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

// Card category for visual tinge
export type CardCategory = 'survivor' | 'weapon' | 'gear' | 'medical' | 'food' | 'action' | 'upgrade' | 'building' | 'seed';

// Card data
export interface Card {
  id: string;
  type: CardType;
  name: string;
  description: string;
  imageUrl?: string;
  category?: CardCategory; // visual tinge category

  // For survivors
  role?: SurvivorRole;
  attributes?: Attributes;
  maxHealth?: number;

  // For items/actions
  itemType?: 'equipment' | 'consumable' | 'action';
  bonusAttributes?: Partial<Attributes>;

  // For weapons — how many times they can be used before running dry
  maxAmmo?: number;

  // Food value (consumables that provide food)
  foodValue?: number;

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
  // Current ammo remaining (weapons only, undefined = unlimited)
  ammo?: number;
  // Weapon structural wear: 0=new, 1=used, 2=worn, 3=damaged, 4=broken
  wear?: number;
  // Survivor daily state
  condition?: SurvivorCondition;
  hungerDays?: number; // consecutive days hungry/starving
  assignment?: SurvivorAssignment; // current home assignment
  assignedToProduction?: string; // production chain ID if assigned to garden/workshop
  // Infection state (from Infected enemy type encounters)
  infected?: boolean;
  infectionDaysLeft?: number; // days until death if uncured
}

// Production chain (garden or workshop slot)
export interface ProductionChain {
  id: string;
  type: 'garden' | 'workshop';
  survivorId: string;
  seedCardId?: string; // for garden
  craftRecipeId?: string; // for workshop
  startDay: number;
  daysRequired: number;
  outputCardIds: string[]; // what gets produced
  completed: boolean;
}

// Craft recipe for workshop
export interface CraftRecipe {
  id: string;
  name: string;
  outputCardId: string;
  cost: Partial<RawMaterials>;
  daysRequired: number;
  requiresMechanic?: boolean;
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

  // Enemy type (for telegraph + counterpick system)
  enemyType?: EnemyType;
  // Environmental conditions on this encounter
  conditions?: StageCondition[];

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

// A combo that fired during combat (from COMBO_DEFS)
export interface CombatCombo {
  id: string;
  label: string;
  icon: string;
  dmgBonus: number;
  hlgBonus: number;
  defBonus: number;
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
  // New gameplay systems output
  combosFired: CombatCombo[];
  typeModifier: number; // multiplier applied from enemy type counterpick (1.0 = neutral)
  infectionsApplied: string[]; // survivor IDs that got infected this combat
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

// Raw materials collected during runs
export interface RawMaterials {
  scrapMetal: number;
  wood: number;
  cloth: number;
  medicalSupplies: number;
  food?: number; // food rations
}

// Loot rolled on stage victory
export interface StageLoot {
  items: CardInstance[];
  materials: RawMaterials;
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

  // One-time use tracking: consumables and actions only.
  // Survivors and equipment are available every stage.
  consumedCardIds: string[];

  // Weapon ammo tracking during the run: cardId → shots remaining
  weaponAmmo: Record<string, number>;

  // Current encounter
  currentEncounter?: Encounter;
  lastCombatResult?: CombatResult;

  // Progress
  currentStage: number;
  totalStages: number;
  stages: StageHistory[];

  // Loot rolled per stage on victory
  stagedLoot: Record<number, StageLoot>;

  // Rewards accumulated across all stages
  itemsFound: CardInstance[];
  survivorStats: Record<string, { expGained: number }>;

  // Survivors in this run
  activeSurvivors: CardInstance[];

  // Tactical options
  isBarricaded?: boolean;   // Built a barricade after stage 2 — +30 defense in stage 3
  isRetreat?: boolean;      // Player chose to retreat before engaging

  // Run mode and sprint/siege options
  runMode: RunMode;
  lootMultiplier: number;   // 1.0 siege, 1.75 sprint
  splitSurvivorId?: string; // Survivor ID left behind at stage 2 to scavenge
}

// Daily event shown on home screen — must act on or ignore before day end
export interface DailyEvent {
  id: string;
  type: 'threat' | 'opportunity' | 'moral';
  title: string;
  description: string;
  // Optional immediate effects when event fires
  immediateFood?: number;       // positive = gain, negative = lose
  immediateSurvivorDamage?: number; // HP lost by a random survivor
  // Optional player-triggered actions
  actionLabel?: string;          // button text to take action
  actionResult?: string;         // flavor text after action
  // Modifiers for today's runs
  raidChanceOverride?: number;   // overrides nightly raid chance (0-1)
  runDamageMultiplier?: number;  // multiplier on enemy damage today
  expiredAt?: number;            // day this event expires (if set)
}

// Pre-run momentum card — situational daily bonus
export interface MomentumCard {
  id: string;
  title: string;
  description: string;
  icon: string;
  // What this card does when activated
  revealsAllEncounters?: boolean;  // see all 3 stage enemy types before run
  skipStageOne?: boolean;          // skip to stage 2
  survivorAtkBonus?: number;       // % ATK bonus for one survivor this run
  enemyDamageReduction?: number;   // % enemy damage reduction this run
  extraWeaponAmmo?: number;        // bonus ammo on all weapons
  guaranteedWeaponLoot?: boolean;  // first stage win = weapon card loot
  guaranteedMedLoot?: boolean;     // first stage win = medical card loot
  retreatNoExhaust?: boolean;      // retreat doesn't exhaust cards this run
  used?: boolean;                  // consumed when activated
}

// Home base state
export interface HomeBaseState {
  survivors: CardInstance[];
  items: CardInstance[];
  inventory: CardInstance[];
  completedRuns: Run[];
  currentRun?: Run;
  rawMaterials: RawMaterials;
  // Barricade built at home — applies defense bonus to next run
  homeBarricadeLevel: number; // 0 = none, 1 = built

  // Daily survival systems
  day: number; // current day number (starts 1)
  food: number; // food rations available
  baseHP: number; // home base integrity 0-100
  morale: number; // group morale 0-100

  // Active production chains
  productionChains: ProductionChain[];

  // Daily home screen systems
  currentEvent?: DailyEvent;   // today's daily event card (cleared on day advance)
  momentumCard?: MomentumCard; // today's pre-run bonus (consumed when used, cleared on day advance)
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
