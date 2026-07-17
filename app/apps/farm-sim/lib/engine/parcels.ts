import { GRID_SIZE } from '../balance';
import { ParcelId, ResourceDeposit, TileKind } from '../types';

export interface ParcelDef {
  id: ParcelId;
  name: string;
  rows: [number, number];
  cols: [number, number];
  requires: ParcelId[];
  terrain: 'brush' | 'rock' | 'marsh' | 'mixed';
}

export const PARCELS: Record<ParcelId, ParcelDef> = {
  north: { id: 'north', name: 'North Meadow', rows: [0, 14], cols: [14, 25], requires: [], terrain: 'brush' },
  south: { id: 'south', name: 'South Flats', rows: [25, 39], cols: [14, 25], requires: [], terrain: 'marsh' },
  west: { id: 'west', name: 'West Ridge', rows: [15, 24], cols: [0, 13], requires: [], terrain: 'rock' },
  east: { id: 'east', name: 'East Field', rows: [15, 24], cols: [26, 39], requires: [], terrain: 'mixed' },
  northwest: { id: 'northwest', name: 'Northwest Copse', rows: [0, 14], cols: [0, 13], requires: ['north', 'west'], terrain: 'brush' },
  northeast: { id: 'northeast', name: 'Northeast Shelf', rows: [0, 14], cols: [26, 39], requires: ['north', 'east'], terrain: 'rock' },
  southwest: { id: 'southwest', name: 'Southwest Fen', rows: [25, 39], cols: [0, 13], requires: ['south', 'west'], terrain: 'marsh' },
  southeast: { id: 'southeast', name: 'Southeast Reach', rows: [25, 39], cols: [26, 39], requires: ['south', 'east'], terrain: 'mixed' },
};

export function parcelIndices(parcel: ParcelDef): number[] {
  const out: number[] = [];
  for (let row = parcel.rows[0]; row <= parcel.rows[1]; row++) {
    for (let col = parcel.cols[0]; col <= parcel.cols[1]; col++) out.push(row * GRID_SIZE + col);
  }
  return out;
}

export function revealedTerrain(parcel: ParcelDef, idx: number, seed: number): TileKind {
  const hash = Math.abs(((idx + 17) * 1103515245 + seed * 97) | 0) % 100;
  if (hash >= 34) return 'grass';
  if (parcel.terrain === 'mixed') return hash % 3 === 0 ? 'marsh' : hash % 2 === 0 ? 'rock' : 'brush';
  return parcel.terrain;
}

export function depositFor(idx: number, seed: number, terrain: TileKind): ResourceDeposit | undefined {
  if (terrain !== 'rock' && terrain !== 'marsh') return undefined;
  const hash = Math.abs(((idx + 31) * 1664525 + seed * 1013904223) | 0);
  if (terrain === 'marsh') {
    const max = 6 + hash % 7;
    return { resource: 'clay', remaining: max, max };
  }
  const roll = hash % 100;
  const resource = roll < 48 ? 'stone' : roll < 68 ? 'coal' : roll < 88 ? 'ironOre' : 'clay';
  const max = 5 + (Math.floor(hash / 100) % 10);
  return { resource, remaining: max, max };
}

export function initialParcels(owned = false): Record<ParcelId, boolean> {
  return Object.fromEntries(Object.keys(PARCELS).map((id) => [id, owned])) as Record<ParcelId, boolean>;
}
