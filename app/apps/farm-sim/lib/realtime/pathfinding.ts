import type { GameState, TileKind } from '../types';
import { lockedScenery } from '../worldScenery';

export interface TilePosition {
  row: number;
  col: number;
}

export interface TilePathOptions {
  state: Pick<GameState, 'tiles' | 'seed'>;
  start: TilePosition;
  target: TilePosition;
  gridSize: number;
}

/**
 * Find a deterministic walkable path. Each returned tile position is a tile
 * centre; the renderer can convert row/col to pixels using its tile size.
 *
 * A blocked target is treated as an interaction target: the path ends at the
 * closest reachable tile adjacent to it. Movement itself stays four-way so
 * paths cannot cut through diagonal corners.
 */
export function findTilePath(options: TilePathOptions): TilePosition[];
export function findTilePath(
  state: Pick<GameState, 'tiles' | 'seed'>,
  startRow: number,
  startCol: number,
  targetRow: number,
  targetCol: number,
  gridSize: number,
): TilePosition[];
export function findTilePath(
  optionsOrState: TilePathOptions | Pick<GameState, 'tiles' | 'seed'>,
  startRow?: number,
  startCol?: number,
  targetRow?: number,
  targetCol?: number,
  gridSize?: number,
): TilePosition[] {
  const options: TilePathOptions = 'state' in optionsOrState
    ? optionsOrState
    : {
        state: optionsOrState,
        start: { row: startRow ?? -1, col: startCol ?? -1 },
        target: { row: targetRow ?? -1, col: targetCol ?? -1 },
        gridSize: gridSize ?? 0,
      };

  const { state, start, target } = options;
  const size = options.gridSize;
  if (!Number.isInteger(size) || size <= 0 || state.tiles.length < size * size) return [];
  if (!inBounds(start.row, start.col, size) || !inBounds(target.row, target.col, size)) return [];

  const startIdx = indexOf(start, size);
  if (isBlocked(state, startIdx)) return [];

  const destination = isBlocked(state, indexOf(target, size))
    ? adjacentTargets(target, size).filter((position) => !isBlocked(state, indexOf(position, size)))
    : [target];
  if (destination.length === 0) return [];

  const destinationIndices = new Set(destination.map((position) => indexOf(position, size)));
  if (destinationIndices.has(startIdx)) return [];

  const previous = new Int32Array(size * size);
  previous.fill(-1);
  const visited = new Uint8Array(size * size);
  const queue = new Int32Array(size * size);
  let head = 0;
  let tail = 0;
  queue[tail++] = startIdx;
  visited[startIdx] = 1;

  let reached = -1;
  while (head < tail) {
    const current = queue[head++];
    if (destinationIndices.has(current)) {
      reached = current;
      break;
    }

    const row = Math.floor(current / size);
    const col = current % size;
    for (const neighbor of neighbors(row, col, size)) {
      const next = indexOf(neighbor, size);
      if (visited[next] || isBlocked(state, next)) continue;
      visited[next] = 1;
      previous[next] = current;
      queue[tail++] = next;
    }
  }

  if (reached < 0) return [];

  const path: TilePosition[] = [];
  for (let current = reached; current !== startIdx; current = previous[current]) {
    path.push({ row: Math.floor(current / size), col: current % size });
  }
  path.reverse();
  return path;
}

export const findPath = findTilePath;

const BLOCKED_KINDS: ReadonlySet<TileKind> = new Set([
  'reservoir',
  'shed',
  'mill',
  'depot',
  'crate',
  'brush',
  'rock',
  'marsh',
  'extractor',
]);

function isBlocked(state: Pick<GameState, 'tiles' | 'seed'>, idx: number): boolean {
  const tile = state.tiles[idx];
  if (!tile || BLOCKED_KINDS.has(tile.kind)) return true;
  return tile.kind === 'locked' && lockedScenery(state.seed, idx) !== null;
}

function adjacentTargets(target: TilePosition, gridSize: number): TilePosition[] {
  // Orthogonal positions come first, matching movement; diagonals allow the
  // same adjacent interaction reach that GameCanvas uses for taps.
  return [
    { row: target.row - 1, col: target.col },
    { row: target.row, col: target.col - 1 },
    { row: target.row, col: target.col + 1 },
    { row: target.row + 1, col: target.col },
    { row: target.row - 1, col: target.col - 1 },
    { row: target.row - 1, col: target.col + 1 },
    { row: target.row + 1, col: target.col - 1 },
    { row: target.row + 1, col: target.col + 1 },
  ].filter((position) => inBounds(position.row, position.col, gridSize));
}

function neighbors(row: number, col: number, gridSize: number): TilePosition[] {
  return [
    { row: row - 1, col },
    { row, col: col - 1 },
    { row, col: col + 1 },
    { row: row + 1, col },
  ].filter((position) => inBounds(position.row, position.col, gridSize));
}

function inBounds(row: number, col: number, gridSize: number): boolean {
  return row >= 0 && row < gridSize && col >= 0 && col < gridSize;
}

function indexOf(position: TilePosition, gridSize: number): number {
  return position.row * gridSize + position.col;
}
