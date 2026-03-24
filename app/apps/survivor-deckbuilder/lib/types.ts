export type Direction = "N" | "S" | "E" | "W";

export type ZombieState = "dormant" | "alert" | "wary" | "agitated" | "grabbing" | "dead";

export type ZombieType = "shambler" | "crawler" | "bloater" | "screamer" | "brute";

export type StatusEffect = "bleeding" | "adrenaline" | "exhausted" | "wounded";

export type TerrainType = "glass" | "metal" | "puddle" | "trap";

export type Phase = "player" | "noise" | "zombie" | "gameover" | "win" | "stagecomplete";

export interface InventoryItem {
  name: string;
  type: "weapon" | "consumable" | "distraction";
  damage?: number;
  noiseRadius: number;
  durability?: number;
  heal?: number;
  throwRange?: number;
  throwNoise?: number;
  areaEffect?: boolean;
  rangedRange?: number;
  ammo?: number;
  knockback?: boolean;
  isTrap?: boolean;
  trapType?: "wire" | "nail" | "bear";
  crowbar?: boolean;
}

export interface Survivor {
  id: number;
  name: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  totalSlots: number;
  inventory: InventoryItem[];
  actionsUsed: number;
  state: "active" | "dead" | "grabbed" | "downed";
  nerve: number;
  maxNerve: number;
  statusEffects: StatusEffect[];
  overwatching: boolean;
  overwatchAttacks: number;
  adrenalineNextTurn: boolean;
  disengaging: boolean;
  emergencyMoveUsed: boolean;
  downedTurns: number;       // turns until bleedout when downed (0 = not downed)
  moveActionsThisTurn: number; // tracks movement-only turns for exhaustion
}

export interface Zombie {
  id: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  state: ZombieState;
  type: ZombieType;
  facing: Direction;
  grabTarget: number | null;
  patrolPath: Coord[] | null;
  patrolIdx: number;
  alertTurnsLeft: number;
  alertSource: Coord | null;
  alertOrigin: Coord | null;
  damage: number;
  speed: number;
  groanRadius: number;
  knockbackResistant: boolean;
  canGrab: boolean;
  lowProfile: boolean;
  explodesOnDeath: boolean;
  explosionRadius: number;
  explosionDamage: number;
  staggered: boolean;
  lastAttackedBySurvivor?: number;
}

export interface LootItem {
  id: number;
  x: number;
  y: number;
  item: InventoryItem;
}

export interface TerrainTile {
  x: number;
  y: number;
  type: TerrainType;
  noiseOnStep: number;
  trapType?: "wire" | "nail" | "bear";
  triggered?: boolean;
}

export interface ContainerTile {
  x: number;
  y: number;
  searched: boolean;
  lootTable: InventoryItem[];
}

export interface NoiseEvent {
  x: number;
  y: number;
  radius: number;
  intensity: number;
  alertDuration?: number;
}

export interface NoiseRipple {
  id: number;
  x: number;
  y: number;
  radius: number;
  intensity: number;
}

export interface Coord {
  x: number;
  y: number;
}

export interface GameLogEntry {
  turn: number;
  stage: number;
  survivors: { id: number; name: string; x: number; y: number; hp: number; nerve: number; items: string[]; state: string }[];
  zombies: { id: number; type: string; x: number; y: number; hp: number; state: string }[];
  messages: string[];
}

export interface TurnSummary {
  zombiesWoke: number;
  zombiesKilled: number;
  damageTaken: { name: string; amount: number }[];
  overwatchHits: number;
  zocHits: number;
}
