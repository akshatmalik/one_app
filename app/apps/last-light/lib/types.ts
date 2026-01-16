// Core game types for Last Light survivor game

export interface GameState {
  id: string;
  userId: string;

  // Player status
  health: number; // 0-100
  hunger: number; // 0-100 (increases over time)
  energy: number; // 0-100 (decreases with actions)

  // Location
  currentLocation: string;
  visitedLocations: string[];
  worldState: WorldState;

  // Inventory
  inventory: Item[];

  // Story
  storyLog: StoryEntry[];
  currentEncounter: Encounter | null;

  // Player behavior tracking
  playerBehavior: PlayerBehavior;

  // Meta
  day: number;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  status: 'active' | 'game-over';
  deathReason?: string;

  createdAt: string;
  updatedAt: string;
}

// Dynamic world tracking
export interface WorldState {
  // Generated locations
  locations: { [locationId: string]: GeneratedLocation };

  // Current area type
  areaType: 'suburban' | 'urban' | 'rural' | 'commercial';

  // Track what's been looted
  lootedRooms: { [roomId: string]: boolean };
  searchedContainers: { [containerId: string]: ItemDrop[] };

  // Encounter history
  metNPCs: { [npcId: string]: NPCMemory };
}

export interface GeneratedLocation {
  id: string;
  name: string;
  type: string;
  description: string;
  rooms: GeneratedRoom[];
  hasBeenEntered: boolean;
  dangerLevel: number;
}

export interface GeneratedRoom {
  id: string;
  name: string;
  description: string;
  containers: Container[];
  hasBeenSearched: boolean;
  initialLoot: ItemDrop[];
  remainingLoot: ItemDrop[];
}

export interface Container {
  id: string;
  name: string;
  hasBeenSearched: boolean;
  loot: ItemDrop[];
}

export interface ItemDrop {
  item: string;
  quantity: number;
  taken: boolean;
}

export interface NPCMemory {
  npcId: string;
  name: string;
  lastLocation: string;
  relationshipLevel: number;
  lastInteraction: string;
  knowsPlayer: boolean;
  trustLevel: number;
  suspicionLevel: number;
  markedAsHostile: boolean;
}

// Items
export interface Item {
  id: string;
  name: string;
  type: 'food' | 'water' | 'weapon' | 'medicine' | 'tool';
  description: string;
  usable: boolean;
  effect?: {
    health?: number;
    hunger?: number;
    energy?: number;
  };
}

// Story entries
export interface StoryEntry {
  id: string;
  timestamp: string;
  type: 'narration' | 'player' | 'npc' | 'system';
  content: string;
  speaker?: string;
}

// Encounters
export interface Encounter {
  id: string;
  type: 'hostile' | 'neutral' | 'friendly';
  npc: NPCProfile;
  isActive: boolean;
  history: DialogueEntry[];
}

export interface NPCProfile {
  id: string;
  name: string;
  personality: string;
  backstory: string;
  motivation: string;
  trustLevel: number;
  suspicionLevel: number;
  threatAssessment: 'low' | 'medium' | 'high';
  isArmed: boolean;
  currentMood: 'calm' | 'suspicious' | 'angry' | 'afraid' | 'friendly';
  conversationHistory: string[];
}

export interface DialogueEntry {
  speaker: 'player' | 'npc';
  text: string;
  timestamp: string;
  npcReaction?: {
    trustChange: number;
    suspicionChange: number;
    threatChange: 'increase' | 'decrease' | 'none';
  };
}

// Player behavior tracking
export interface PlayerBehavior {
  movementCount: number;
  isBeingStealthy: boolean;
  stealthScore: number;
  hasAnsweredQuestions: boolean;
  wasHonest: boolean;
  wasAggressive: boolean;
  ignoredKnock: boolean;
  hasWeaponVisible: boolean;
  madeNoise: boolean;
  turnsInLocation: number;
  locationsVisited: string[];
  threatenedNPC: boolean;
  attackedNPC: boolean;
  killedNPC: boolean;
  recentActions: string[];
}

// AI responses
export interface GameResponse {
  narration: string;
  npcDialogue?: string;
  npcEmotion?: string;
  itemsFound?: Item[];
  stateChanges: Partial<GameState>;
  encounterUpdate?: {
    trustChange: number;
    suspicionChange: number;
    threatLevel: 'low' | 'medium' | 'high';
  };
}

// Command validation
export interface CommandValidation {
  isValid: boolean;
  reason?: string;
  sanitizedCommand?: string;
}

// Encounter triggers
export interface EncounterTrigger {
  id: string;
  type: 'stranger_encounter' | 'zombie_threat' | 'discovery';
  conditions: TriggerCondition[];
  probability: number;
  cooldown: number;
  hasTriggered: boolean;
}

export interface TriggerCondition {
  type: 'player_behavior' | 'location' | 'time' | 'world_state';
  check: () => boolean;
}

// Repository interface
export interface GameRepository {
  getGame(id: string): Promise<GameState | null>;
  createGame(userId: string): Promise<GameState>;
  updateGame(id: string, updates: Partial<GameState>): Promise<GameState>;
  deleteGame(id: string): Promise<void>;
}
