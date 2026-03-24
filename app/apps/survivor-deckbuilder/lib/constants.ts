import { InventoryItem, Survivor, Zombie, LootItem, TerrainTile, ContainerTile, Direction, Coord } from './types';

export const GRID_W = 14;
export const GRID_H = 10;
export const TILE = 52;

// --- Stage Obstacles ---

export const STAGE1_OBSTACLES = new Set([
  "3,9","4,9","5,9","6,9","7,9","8,9",
  "11,8","12,8",
  "1,7","1,6","4,7","4,6","7,7","7,6","10,7","10,6",
  "1,4","1,3","4,4","4,3","7,4","7,3",
  "12,4",
]);

// Stage 2: horizontal-corridor layout — two horizontal walls with gaps, two vertical columns
export const STAGE2_OBSTACLES = new Set([
  // Top horizontal wall — gaps at x=4 and x=9
  "0,2","1,2","2,2","3,2",
  "5,2","6,2","7,2","8,2",
  "10,2","11,2","12,2","13,2",
  // Middle vertical columns
  "2,5","2,6",
  "11,5","11,6",
  // Bottom horizontal wall — gaps at x=3 and x=9
  "0,7","1,7","2,7",
  "4,7","5,7","6,7","7,7","8,7",
  "10,7","11,7","12,7","13,7",
]);

// Live binding — reassigned by switchToStage()
export let OBSTACLES = STAGE1_OBSTACLES;

export function switchToStage(stage: 1 | 2): void {
  OBSTACLES = stage === 2 ? STAGE2_OBSTACLES : STAGE1_OBSTACLES;
}

export const DOOR_TILES = new Set(["3,0","10,0"]);

// Stage 1: exit is at y=8 (tile above the obstacle wall at y=9)
export const STAGE1_EXIT: Coord = { x: 6, y: 8 };
// Stage 2: exit is at y=0 (top of map)
export const STAGE2_EXIT: Coord = { x: 9, y: 0 };
// Keep for visual display only
export const EXIT_DOOR: Coord = { x: 6, y: 9 };

// --- Item Definitions ---

export const ITEMS: Record<string, InventoryItem> = {
  knife:         { name: "Knife",         type: "weapon",      damage: 1, noiseRadius: 1, durability: 99 },
  bat:           { name: "Bat",           type: "weapon",      damage: 2, noiseRadius: 2, durability: 6, knockback: true },
  pipe:          { name: "Pipe",          type: "weapon",      damage: 2, noiseRadius: 2, durability: 4, knockback: true },
  // Crowbar: more durable than bat, louder, can search containers from 2 tiles away
  crowbar:       { name: "Crowbar",       type: "weapon",      damage: 2, noiseRadius: 3, durability: 8, knockback: false, crowbar: true },
  pistol:        { name: "Pistol",        type: "weapon",      damage: 3, noiseRadius: 8, durability: 99, rangedRange: 3, ammo: 2 },
  bandage:       { name: "Bandage",       type: "consumable",  heal: 3,   noiseRadius: 1 },
  medkit:        { name: "Medkit",        type: "consumable",  heal: 5,   noiseRadius: 1 },
  molotov:       { name: "Molotov",       type: "consumable",  damage: 2, noiseRadius: 8, areaEffect: true, throwRange: 4 },
  lockpick:      { name: "Lockpick",      type: "consumable",  noiseRadius: 0 },
  brick:         { name: "Brick",         type: "distraction", noiseRadius: 0, throwRange: 4, throwNoise: 3 },
  alarm_clock:   { name: "Alarm Clock",   type: "distraction", noiseRadius: 0, throwRange: 3, throwNoise: 5 },
  glass_bottle:  { name: "Glass Bottle",  type: "distraction", noiseRadius: 0, throwRange: 3, throwNoise: 2 },
  firecracker:   { name: "Firecracker",   type: "distraction", noiseRadius: 0, throwRange: 5, throwNoise: 5 },
  // Flare: quiet throw (alert, not agitate) but sustains for a very long time — creates a diversion corridor
  flare:         { name: "Flare",         type: "distraction", noiseRadius: 0, throwRange: 5, throwNoise: 3 },
  wire_trip:     { name: "Wire Trip",     type: "distraction", noiseRadius: 0, isTrap: true, trapType: "wire" },
  nail_board:    { name: "Nail Board",    type: "distraction", noiseRadius: 0, isTrap: true, trapType: "nail", damage: 3 },
  // Bear Trap: quiet snap, 2 damage + stagger — better for controlling the Brute
  bear_trap:     { name: "Bear Trap",     type: "distraction", noiseRadius: 0, isTrap: true, trapType: "bear", damage: 2 },
};

// --- Zombie Type Defaults ---

interface ZombieDefaults {
  hp: number; damage: number; speed: number; groanRadius: number;
  knockbackResistant: boolean; canGrab: boolean; lowProfile: boolean;
  explodesOnDeath: boolean; explosionRadius: number; explosionDamage: number;
  label: string; emoji: string;
}

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

// --- Stage 1 ---

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

export const initContainers = (): ContainerTile[] => [
  { x: 11, y: 8, searched: false, lootTable: [{ ...ITEMS.bandage }, { ...ITEMS.brick }] },
  { x: 12, y: 8, searched: false, lootTable: [{ ...ITEMS.firecracker }, { ...ITEMS.lockpick }] },
];

// --- Stage 2: "The Warehouse" — horizontal corridors, reversed direction ---
// Survivors enter from bottom (y=8), exit at top (9,0)
// Layout: two horizontal walls with choke-point gaps, vertical columns in middle

export const initStage2Survivors = (carried: Survivor[]): Survivor[] =>
  carried.map((s, idx) => ({
    ...s,
    x: idx === 0 ? 3 : 10,
    y: 8,
    actionsUsed: 0,
    overwatching: false,
    overwatchAttacks: 0,
    disengaging: false,
    emergencyMoveUsed: false,
    adrenalineNextTurn: false,
  }));

export const initStage2Zombies = (): Zombie[] => [
  // Patrol shambler sweeps the top zone near the exit
  makeZombie(0, 4, 1, "shambler", "S", [{x:4,y:1},{x:5,y:1},{x:6,y:1},{x:7,y:1},{x:8,y:1},{x:7,y:1},{x:6,y:1},{x:5,y:1}]),
  // Static shambler just below the top wall on the right side
  makeZombie(1, 7, 3, "shambler", "S"),
  // Two crawlers flanking the corridors — fast, dangerous
  makeZombie(2, 1, 4, "crawler", "E"),
  makeZombie(3, 12, 4, "crawler", "W"),
  // Bloater in the center between the two vertical columns — central threat
  makeZombie(4, 6, 5, "bloater", "N"),
  // Screamer on left side — will cascade if activated
  makeZombie(5, 3, 6, "screamer", "E"),
  // Brute guards the right gap in the top wall — blocks the easy exit route
  makeZombie(6, 9, 3, "brute", "S"),
];

export const initStage2Loot = (): LootItem[] => [
  // Crowbar on far left — new tool, worth the detour
  { id: 0, x: 0, y: 4, item: { ...ITEMS.crowbar } },
  // Flare on far right — creates diversion corridor
  { id: 1, x: 13, y: 4, item: { ...ITEMS.flare } },
  // Bandage near survivor start — immediate healing option
  { id: 2, x: 5, y: 8, item: { ...ITEMS.bandage } },
  // Wire trip in the middle zone — set it in the Brute's path
  { id: 3, x: 3, y: 5, item: { ...ITEMS.wire_trip } },
  // Alarm clock near start — panic button for the crawlers
  { id: 4, x: 10, y: 8, item: { ...ITEMS.alarm_clock } },
  // Nail board in the bloater zone — risky to grab
  { id: 5, x: 6, y: 6, item: { ...ITEMS.nail_board } },
  // Medkit in the far bottom-left corner — valuable but requires commitment
  { id: 6, x: 0, y: 8, item: { ...ITEMS.medkit } },
];

export const initStage2Terrain = (): TerrainTile[] => [
  // Glass in the gap approaches to the top wall — noise when going for exit
  { x: 4, y: 3, type: "glass",  noiseOnStep: 2 },
  { x: 9, y: 3, type: "glass",  noiseOnStep: 2 },
  // Metal near the screamer — movement noise in that zone
  { x: 1, y: 6, type: "metal",  noiseOnStep: 1 },
  { x: 12, y: 6, type: "metal", noiseOnStep: 1 },
  // Puddles in the central corridor
  { x: 6, y: 4, type: "puddle", noiseOnStep: 1 },
  { x: 7, y: 6, type: "puddle", noiseOnStep: 1 },
];

export const initStage2Containers = (): ContainerTile[] => [
  // Top-left corner (empty room): distraction options
  { x: 0, y: 0, searched: false, lootTable: [{ ...ITEMS.brick }, { ...ITEMS.firecracker }] },
  // Bottom-right corner: healing or utility
  { x: 13, y: 9, searched: false, lootTable: [{ ...ITEMS.bandage }, { ...ITEMS.lockpick }] },
];

// --- Shared Constants ---

export const ALERT_INVESTIGATE_TURNS = 3;
export const BRICK_ALERT_TURNS = 7;
export const FLARE_ALERT_TURNS = 10;  // flare sustains much longer than brick
export const ZOMBIE_VISION_RANGE = 5;
export const NERVE_SHAKY = 3;
