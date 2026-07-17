// ============================================================================
// Farm Sim — Crop growth rules. Pure. See docs/FARM_SIM_PLAN.md §3.
// ============================================================================

import { Tile, Weather } from '../types';
import { CROPS } from '../../data/crops';
import {
  STRESS_DAYS_TO_DIE,
  LOW_N_THRESHOLD,
  CRITICAL_N_THRESHOLD,
  LOW_N_YIELD_MULT,
  CRITICAL_N_YIELD_MULT,
  BEAN_NEIGHBOR_N,
} from '../balance';
import { orthoNeighbors } from './water';

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export interface CropNightOutcome {
  died: boolean;
  matured: boolean;
  cropName: string;
}

// Resolve one night of growth for a single planted tile. Mutates the tile.
// Returns what happened for the recap. Does NOT apply bean neighbor bonus
// (that needs the whole grid; see applyBeanNeighborBonus).
export function resolveCropNight(tile: Tile, weather: Weather): CropNightOutcome {
  const crop = tile.crop!;
  const def = CROPS[crop.cropId];
  const outcome: CropNightOutcome = { died: false, matured: false, cropName: def.name };

  // Mature crops just sit (storm handled elsewhere). No consumption/growth/N.
  if (crop.mature) return outcome;

  const isBerryRegrow = crop.regrowCounter != null && crop.regrowCounter > 0;

  // 1. Consumption
  if (tile.moisture >= def.waterNeed) {
    tile.moisture -= def.waterNeed;
    crop.stressDays = 0;
    if (!isBerryRegrow) {
      let grow = 1;
      if (def.heatLover && weather === 'heatwave') grow = 2;
      crop.growthDays += grow;
    }
  } else {
    crop.stressDays += 1;
  }

  // 2. Death
  if (crop.stressDays >= STRESS_DAYS_TO_DIE) {
    tile.crop = null;
    outcome.died = true;
    return outcome;
  }

  // 3. Maturity (growth path only)
  if (!isBerryRegrow && crop.growthDays >= def.growDays) {
    crop.mature = true;
    outcome.matured = true;
  }

  // 4. Nitrogen — growing (non-mature) crop only. Beans have negative use (restore).
  if (!crop.mature) {
    tile.nitrogen = clamp(tile.nitrogen - def.nitrogenUse, 0, 100);
  }

  // 5. Berry regrow
  if (isBerryRegrow) {
    crop.regrowCounter! -= 1;
    if (crop.regrowCounter! <= 0) {
      crop.mature = true;
      crop.regrowCounter = undefined;
      outcome.matured = true;
    }
  }

  return outcome;
}

// Beans lift the nitrogen of orthogonal neighbors. Applied after per-tile
// resolution, based on beans that are still present and non-mature.
export function applyBeanNeighborBonus(tiles: Tile[]): void {
  const deltas = new Array(tiles.length).fill(0);
  tiles.forEach((tile, idx) => {
    if (tile.crop && tile.crop.cropId === 'beans' && !tile.crop.mature) {
      for (const n of orthoNeighbors(idx)) {
        if (tiles[n].kind === 'tilled') deltas[n] += BEAN_NEIGHBOR_N;
      }
    }
  });
  deltas.forEach((d, idx) => {
    if (d > 0) tiles[idx].nitrogen = clamp(tiles[idx].nitrogen + d, 0, 100);
  });
}

// Yield units at harvest: base × soil-nitrogen penalty (read AT harvest time).
export function harvestYield(tile: Tile): number {
  const crop = tile.crop!;
  const def = CROPS[crop.cropId];
  let units = def.yieldUnits;
  if (!def.preferredSoils.includes(tile.soil)) units *= def.soilPenalty;
  if (tile.nitrogen < CRITICAL_N_THRESHOLD) units *= CRITICAL_N_YIELD_MULT;
  else if (tile.nitrogen < LOW_N_THRESHOLD) units *= LOW_N_YIELD_MULT;
  return Math.max(1, Math.floor(units));
}
