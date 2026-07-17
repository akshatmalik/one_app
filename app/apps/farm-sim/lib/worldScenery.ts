import { GRID_SIZE, START_PLOT } from './balance';

export type LockedScenery = 'brush' | 'rock' | 'marsh';

export type GroundDetailKind = 'flower' | 'tuft' | 'pebble' | 'worn';

export interface GroundDetail {
  kind: GroundDetailKind;
  x: number;
  y: number;
  variant: number;
}

function worldHash(seed: number, idx: number): number {
  let hash = Math.imul((idx + 1) ^ seed, 0x45d9f3b) >>> 0;
  hash ^= hash >>> 16;
  return hash >>> 0;
}

function clusterHash(seed: number, row: number, col: number): number {
  const clusterRow = Math.floor(row / 5);
  const clusterCol = Math.floor(col / 5);
  return worldHash(seed ^ 0x6d2b79f5, clusterRow * 97 + clusterCol * 193);
}

/** Small, clustered marks that add texture without changing tile occupancy. */
export function groundDetails(seed: number, idx: number, terrain: 'grass' | 'path' | 'tilled' | 'locked'): GroundDetail[] {
  if (terrain === 'tilled') return [];

  const row = Math.floor(idx / GRID_SIZE);
  const col = idx % GRID_SIZE;
  const local = worldHash(seed ^ 0x2f6e2b1, idx);
  const formation = clusterHash(seed ^ 0x4a1d7c3, row, col);
  const inCluster = formation % 100 < 58 && ((local >>> 5) % 5) < 3;
  const rare = local % 100 < (terrain === 'path' ? 5 : 11);
  if (!inCluster && !rare) return [];

  const detail: GroundDetailKind = terrain === 'path'
    ? 'worn'
    : (['flower', 'tuft', 'pebble'] as const)[local % 3];
  return [{
    kind: detail,
    x: 4 + ((local >>> 8) % 24),
    y: 5 + ((local >>> 16) % 21),
    variant: (local >>> 24) % 3,
  }];
}

/** Sparse deterministic scenery makes unopened land explorable but not empty. */
export function lockedScenery(seed: number, idx: number): LockedScenery | null {
  const hash = worldHash(seed, idx);
  const row = Math.floor(idx / GRID_SIZE);
  const col = idx % GRID_SIZE;
  const north = row < START_PLOT.r0;
  const south = row > START_PLOT.r1;
  const west = col < START_PLOT.c0;
  const east = col > START_PLOT.c1;

  const formation = clusterHash(seed, row, col);
  const localRow = row % 5;
  const localCol = col % 5;
  const centerRow = 1 + (formation % 3);
  const centerCol = 1 + ((formation >>> 4) % 3);
  const distance = Math.abs(localRow - centerRow) + Math.abs(localCol - centerCol);
  const clustered = formation % 100 < 48 && distance <= 2 && hash % 100 < 68;
  const sparse = hash % 100 < 3;
  if (!clustered && !sparse) return null;

  // Broad regions establish geography; rare alternates keep their edges natural.
  if (south) return hash % 9 === 0 ? 'brush' : 'marsh';
  if (east) return hash % 8 === 0 ? 'brush' : 'rock';
  if (north || west) return hash % 10 === 0 ? 'rock' : 'brush';
  return (['brush', 'rock', 'marsh'] as const)[hash % 3];
}
