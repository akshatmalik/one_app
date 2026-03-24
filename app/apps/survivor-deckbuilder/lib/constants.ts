import { InventoryItem, Survivor, Zombie, LootItem, TerrainTile, ContainerTile, Direction, Coord } from './types';

export const GRID_W = 14;
export const GRID_H = 10;
export const TILE = 52;

export const OBSTACLES = new Set([
  "3,9","4,9","5,9","6,9","7,9","8,9",
  "11,8","12,8",
  "1,7","1,6","4,7","4,6","7,7","7,6","10,7","10,6",
  "1,4","1,3","4,4","4,3","7,4","7,3",
  "12,4",
]);

export const DOOR_TILES = new Set(["3,0","10,0"]);
export const EXIT_DOOR: Coord = { x: 6, y: 9 };

// --- Item Definitions ---

export const ITEMS: Record<string, InventoryItem> = {
  knife:         { name: "Knife",         type: "weapon",      damage: 1, noiseRadius: 1, durability: 99 },
  bat:           { name: "Bat",           type: "weapon",      damage: 2, noiseRadius: 2, durability: 6, knockback: true },
  pipe:          { name: "Pipe",          type: "weapon",      damage: 2, noiseRadius: 2, durability: 4, knockback: true },
  pistol:        { name: "Pistol",        type: "weapon",      damage: 3, noiseRadius: 8, durability: 99, rangedRange: 3, ammo: 2 },
  bandage:       { name: "Bandage",       type: "consumable",  heal: 3,   noiseRadius: 1 },
  medkit:        { name: "Medkit",        type: "consumable",  heal: 5,   noiseRadius: 1 },
  // Molotov: noise radius 8 — throws alert the whole room
  molotov:       { name: "Molotov",       type: "consumable",  damage: 2, noiseRadius: 8, areaEffect: true, throwRange: 4 },
  lockpick:      { name: "Lockpick",      type: "consumable",  noiseRadius: 0 },
  // Distractions: brick/bottle = quiet alert, alarm/firecracker = loud agitate
  brick:         { name: "Brick",         type: "distraction", noiseRadius: 0, throwRange: 4, throwNoise: 3 },
  alarm_clock:   { name: "Alarm Clock",   type: "distraction", noiseRadius: 0, throwRange: 3, throwNoise: 5 },
  glass_bottle:  { name: "Glass Bottle",  type: "distraction", noiseRadius: 0, throwRange: 3, throwNoise: 2 },
  firecracker:   { name: "Firecracker",   type: "distraction", noiseRadius: 0, throwRange: 5, throwNoise: 5 },
  // Traps: place on current tile as an action
  wire_trip:     { name: "Wire Trip",     type: "distraction", noiseRadius: 0, isTrap: true, trapType: "wire" },
  nail_board:    { name: "Nail Board",    type: "distraction", noiseRadius: 0, isTrap: true, trapType: "nail", damage: 3 },
};

// --- Zombie Type Defaults ---

interface ZombieDefaults {
  hp: number; damage: number; speed: number; groanRadius: number;
  knockbackResistant: boolean; canGrab: boolean; lowProfile: boolean;
  explodesOnDeath: boolean; explosionRadius: number; explosionDamage: number;
  label: string; emoji: string;
}

// Speeds +1 across the board (screamer stays 0). HP increased for more threat.
export const ZOMBIE_TYPES: Record<string, ZombieDefaults> = {
  shambler: { hp: 4,  damage: 2, speed: 2, groanRadius: 2, knockbackResistant: false, canGrab: true,  lowProfile: false, explodesOnDeath: false, explosionRadius: 0, explosionDamage: 0, label: "Shambler", emoji: "Z" },
  crawler:  { hp: 3,  damage: 1, speed: 3, groanRadius: 2, knockbackResistant: false, canGrab: false, lowProfile: true,  explodesOnDeath: false, explosionRadius: 0, explosionDamage: 0, label: "Crawler",  emoji: "C" },
  bloater:  { hp: 6,  damage: 2, speed: 2, groanRadius: 2, knockbackResistant: false, canGrab: false, lowProfile: false, explodesOnDeath: true,  explosionRadius: 1, explosionDamage: 1, label: "Bloater",  emoji: "B" },
  screamer: { hp: 2,  damage: 0, speed: 0, groanRadius: 3, knockbackResistant: false, canGrab: false, lowProfile: false, explodesOnDeath: false, explosionRadius: 0, explosionDamage: 0, label: "Screamer", emoji: "!" },
  brute:    { hp: 8,  damage: 3, speed: 2, groanRadius: 2, knockbackResistant: true,  canGrab: false, lowProfile: false, explodesOnDeath: false, explosionRadius: 0, explosionDamage: 0, label: "Brute",    emoji: "X" },
};

function makeZombie(id: number, x: number, y: number, type: string, facing: Direction, patrol?: Coord[]): Zombie {
  const d = ZOMBIE_TYPES[type];
  return {
    id, x, y, hp: d.hp, maxHp: d.hp,
    state: "dormant", type: type as Zombie["type"], facing,
    grabTarget: null, patrolPath: patrol || null, patrolIdx: 0,
    alertTurnsLeft: 0, alertSource: null, alertOrigin: null,
    damage: d.damage, speed: d.speed, groanRadius: d.groanRadius,
    knockbackResistant: d.knockbackResistant, canGrab: d.canGrab,
    lowProfile: d.lowProfile, explodesOnDeath: d.explodesOnDeath,
    explosionRadius: d.explosionRadius, explosionDamage: d.explosionDamage,
    staggered: false,
    lastAttackedBySurvivor: undefined,
  };
}

function makeSurvivor(id: number, name: string, x: number, y: number, items: InventoryItem[]): Survivor {
  return {
    id, name, x, y, hp: 10, maxHp: 10, totalSlots: 5,
    inventory: items, actionsUsed: 0, state: "active",
    nerve: 10, maxNerve: 10, statusEffects: [],
    overwatching: false, overwatchAttacks: 0,
    adrenalineNextTurn: false, disengaging: false,
    emergencyMoveUsed: false,
  };
}

// Survivors: totalSlots 5 (was 4). Fighter starts with bat only — healing is scarce.
export const initSurvivors = (): Survivor[] => [
  makeSurvivor(0, "Scout",   3,  1, [{ ...ITEMS.knife }]),
  makeSurvivor(1, "Fighter", 10, 1, [{ ...ITEMS.bat }]),
];

export const initZombies = (): Zombie[] => [
  makeZombie(0, 5, 8, "shambler", "S"),
  makeZombie(1, 8, 8, "shambler", "W"),
  makeZombie(2, 6, 5, "shambler", "E", [{x:6,y:5},{x:7,y:5},{x:8,y:5},{x:9,y:5},{x:8,y:5},{x:7,y:5}]),
  makeZombie(3, 2, 6, "bloater",  "S"),
  makeZombie(4, 11, 5, "crawler", "W"),
  makeZombie(5, 9,  4, "screamer","N"),
  makeZombie(6, 3,  8, "brute",   "E"),
];

// Map loot: removed medkit, added bandage + trap items for scarcity
export const initLoot = (): LootItem[] => [
  { id: 0, x: 2, y: 5, item: { ...ITEMS.pipe } },
  { id: 1, x: 9, y: 2, item: { ...ITEMS.bandage } },
  { id: 2, x: 5, y: 3, item: { ...ITEMS.brick } },
  { id: 3, x: 12, y: 6, item: { ...ITEMS.pistol } },
  { id: 4, x: 8, y: 2, item: { ...ITEMS.molotov } },
  { id: 5, x: 6, y: 1, item: { ...ITEMS.wire_trip } },
  { id: 6, x: 11, y: 3, item: { ...ITEMS.glass_bottle } },
  { id: 7, x: 7,  y: 2, item: { ...ITEMS.nail_board } },
];

export const initTerrain = (): TerrainTile[] => [
  { x: 3, y: 5, type: "glass",  noiseOnStep: 2 },
  { x: 6, y: 8, type: "glass",  noiseOnStep: 2 },
  { x: 9, y: 7, type: "metal",  noiseOnStep: 1 },
  { x: 10, y: 8, type: "metal", noiseOnStep: 1 },
  { x: 5, y: 4, type: "puddle", noiseOnStep: 1 },
  { x: 8, y: 6, type: "puddle", noiseOnStep: 1 },
];

// Containers: only 1 bandage total — healing is very scarce
export const initContainers = (): ContainerTile[] => [
  { x: 11, y: 8, searched: false, lootTable: [{ ...ITEMS.bandage }, { ...ITEMS.brick }] },
  { x: 12, y: 8, searched: false, lootTable: [{ ...ITEMS.firecracker }, { ...ITEMS.lockpick }] },
];

export const ALERT_INVESTIGATE_TURNS = 3;
export const BRICK_ALERT_TURNS = 7;   // brick lures zombies for longer
export const ZOMBIE_VISION_RANGE = 5; // was 3 — zombies see further now
export const NERVE_SHAKY = 3;
