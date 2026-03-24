export type Direction = "N" | "S" | "E" | "W";

export type ZombieState = "dormant" | "alert" | "agitated" | "grabbing" | "dead";

export type ZombieType = "shambler" | "crawler" | "bloater" | "screamer" | "brute";

export type StatusEffect = "bleeding" | "adrenaline";

export type TerrainType = "glass" | "metal" | "puddle";

export type Phase = "player" | "noise" | "zombie" | "gameover" | "win";

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
  state: "active" | "dead" | "grabbed";
  nerve: number;
  maxNerve: number;
  statusEffects: StatusEffect[];
  overwatching: boolean;
  overwatchAttacks: number;
  adrenalineNextTurn: boolean;
  disengaging: boolean;
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

export interface TurnSummary {
  zombiesWoke: number;
  zombiesKilled: number;
  damageTaken: { name: string; amount: number }[];
  overwatchHits: number;
  zocHits: number;
}
