// ============================================================================
// Farm Sim — Water network. Pure. See docs/FARM_SIM_PLAN.md §5.
//
// A tilled tile is irrigated iff it is orthogonally adjacent to a channel that
// is flood-fill-connected (orthogonally) to the reservoir tile.
// ============================================================================

import { Tile } from '../types';
import { GRID_SIZE, RESERVOIR_POS } from '../balance';

export function idxOf(r: number, c: number): number {
  return r * GRID_SIZE + c;
}
export function rowOf(idx: number): number {
  return Math.floor(idx / GRID_SIZE);
}
export function colOf(idx: number): number {
  return idx % GRID_SIZE;
}

export function orthoNeighbors(idx: number): number[] {
  const r = rowOf(idx);
  const c = colOf(idx);
  const out: number[] = [];
  if (r > 0) out.push(idxOf(r - 1, c));
  if (r < GRID_SIZE - 1) out.push(idxOf(r + 1, c));
  if (c > 0) out.push(idxOf(r, c - 1));
  if (c < GRID_SIZE - 1) out.push(idxOf(r, c + 1));
  return out;
}

// Flood-fill from the reservoir through channel tiles. Returns the set of
// channel indices that are connected to the reservoir (i.e. actually carry water).
export function connectedChannels(tiles: Tile[]): Set<number> {
  const reservoirIdx = idxOf(RESERVOIR_POS.r, RESERVOIR_POS.c);
  const connected = new Set<number>();
  // Seed the frontier with channels adjacent to the reservoir.
  const queue: number[] = [];
  for (const n of orthoNeighbors(reservoirIdx)) {
    if (tiles[n].kind === 'channel' && !connected.has(n)) {
      connected.add(n);
      queue.push(n);
    }
  }
  while (queue.length) {
    const cur = queue.shift()!;
    for (const n of orthoNeighbors(cur)) {
      if (tiles[n].kind === 'channel' && !connected.has(n)) {
        connected.add(n);
        queue.push(n);
      }
    }
  }
  return connected;
}

// Compute the `irrigated` flag for every tile (does not draw water).
// A tilled tile is irrigated if any orthogonal neighbor is a connected channel.
export function computeIrrigation(tiles: Tile[]): boolean[] {
  const connected = connectedChannels(tiles);
  return tiles.map((t, idx) => {
    if (t.kind !== 'tilled') return false;
    return orthoNeighbors(idx).some((n) => connected.has(n));
  });
}
