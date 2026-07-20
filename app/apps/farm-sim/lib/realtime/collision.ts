import type { GameState, TileKind } from '../types';

const FEET_LEFT = 7;
const FEET_RIGHT = 17;
const FEET_TOP = 21;
const FEET_BOTTOM = 29;
const MAX_SWEEP_STEP = 4;

const BLOCKED_KINDS: ReadonlySet<TileKind> = new Set([
  'channel',
  'reservoir',
  'well',
  'sprinkler',
  'barn',
  'coop',
  'shed',
  'market',
  'mill',
  'depot',
  'crate',
  'brush',
  'rock',
  'marsh',
  'extractor',
  'locked',
]);

export interface WorldCollisionState {
  tiles: GameState['tiles'];
}

export interface MovementResult {
  x: number;
  y: number;
  blocked: boolean;
}

export function isTileBlocked(state: WorldCollisionState, idx: number): boolean {
  const tile = state.tiles[idx];
  // Crops share the player's walkable field surface; only physical terrain and
  // structures block movement.
  return !tile || BLOCKED_KINDS.has(tile.kind);
}

export function canPlayerOccupy(
  state: WorldCollisionState,
  gridSize: number,
  tilePx: number,
  x: number,
  y: number,
  allowedBlockedTiles: ReadonlySet<number> = new Set(),
): boolean {
  const left = Math.floor((x + FEET_LEFT) / tilePx);
  const right = Math.floor((x + FEET_RIGHT - 1) / tilePx);
  const top = Math.floor((y + FEET_TOP) / tilePx);
  const bottom = Math.floor((y + FEET_BOTTOM - 1) / tilePx);

  for (let row = top; row <= bottom; row++) {
    for (let col = left; col <= right; col++) {
      if (row < 0 || row >= gridSize || col < 0 || col >= gridSize) return false;
      const idx = row * gridSize + col;
      if (isTileBlocked(state, idx) && !allowedBlockedTiles.has(idx)) return false;
    }
  }
  return true;
}

/** Move in short axis-aligned steps so a long frame cannot tunnel through a tile. */
export function movePlayerWithCollision(
  state: WorldCollisionState,
  gridSize: number,
  tilePx: number,
  x: number,
  y: number,
  dx: number,
  dy: number,
): MovementResult {
  let nextX = x;
  let nextY = y;
  let blocked = false;
  const occupiedBlockedTiles = new Set<number>();
  const left = Math.floor((x + FEET_LEFT) / tilePx);
  const right = Math.floor((x + FEET_RIGHT - 1) / tilePx);
  const top = Math.floor((y + FEET_TOP) / tilePx);
  const bottom = Math.floor((y + FEET_BOTTOM - 1) / tilePx);
  for (let row = top; row <= bottom; row++) {
    for (let col = left; col <= right; col++) {
      const idx = row * gridSize + col;
      if (row >= 0 && row < gridSize && col >= 0 && col < gridSize && isTileBlocked(state, idx)) occupiedBlockedTiles.add(idx);
    }
  }
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / MAX_SWEEP_STEP));
  const stepX = dx / steps;
  const stepY = dy / steps;

  for (let step = 0; step < steps; step++) {
    if (stepX !== 0) {
      if (canPlayerOccupy(state, gridSize, tilePx, nextX + stepX, nextY, occupiedBlockedTiles)) nextX += stepX;
      else blocked = true;
    }
    if (stepY !== 0) {
      if (canPlayerOccupy(state, gridSize, tilePx, nextX, nextY + stepY, occupiedBlockedTiles)) nextY += stepY;
      else blocked = true;
    }
  }

  return { x: nextX, y: nextY, blocked };
}
