import { GameState, LaborProgress, UpgradeId } from '../types';
import { GRID_SIZE } from '../balance';

export const EMPTY_LABOR: LaborProgress = {
  manualTills: 0,
  manualPlants: 0,
  manualWaterings: 0,
  manualHarvests: 0,
};

export function laborProgress(state: GameState): LaborProgress {
  return state.labor ?? EMPTY_LABOR;
}

export function cultivatedTiles(state: GameState): number {
  return state.tiles.filter((tile) => tile.kind === 'tilled').length;
}

export function activeCrops(state: GameState): number {
  return state.tiles.filter((tile) => tile.crop !== null).length;
}

export function upgradeRequirement(state: GameState, upgrade: UpgradeId): { met: boolean; text: string } {
  if (!state.labor) return { met: true, text: 'Available' };
  const labor = laborProgress(state);
  switch (upgrade) {
    case 'bigCan':
      return { met: labor.manualWaterings >= 30 && activeCrops(state) >= 12, text: `${labor.manualWaterings}/30 manual waterings · ${activeCrops(state)}/12 active crops` };
    case 'sickle':
      return { met: labor.manualHarvests >= 20, text: `${labor.manualHarvests}/20 manual harvests` };
    case 'rowPlow':
      return { met: labor.manualTills >= 16, text: `${labor.manualTills}/16 manually tilled` };
    case 'seedDrill':
      return { met: labor.manualPlants >= 30, text: `${labor.manualPlants}/30 manually planted` };
    case 'tractor':
      return { met: cultivatedTiles(state) >= 100, text: `${cultivatedTiles(state)}/100 cultivated tiles` };
    case 'seeder':
      return { met: state.upgrades.includes('tractor'), text: 'Own a tractor' };
    case 'truck':
      return { met: cultivatedTiles(state) >= 500, text: `${cultivatedTiles(state)}/500 cultivated tiles` };
  }
}

export function rowIndices(centerIdx: number): number[] {
  const row = Math.floor(centerIdx / GRID_SIZE);
  const col = centerIdx % GRID_SIZE;
  return [-1, 0, 1]
    .map((offset) => col + offset)
    .filter((targetCol) => targetCol >= 0 && targetCol < GRID_SIZE)
    .map((targetCol) => row * GRID_SIZE + targetCol);
}
