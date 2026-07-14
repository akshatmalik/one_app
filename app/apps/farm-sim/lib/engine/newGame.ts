// ============================================================================
// Farm Sim — New game construction. Pure. See docs/FARM_SIM_PLAN.md §1–2.
// ============================================================================

import { CropId, GameState, Tile } from '../types';
import {
  GRID_SIZE,
  START_PLOT,
  RESERVOIR_POS,
  START_GOLD,
  BASE_AP,
  START_SEEDS,
  RESERVOIR_START,
  START_NITROGEN,
} from '../balance';
import { CROP_IDS } from '../../data/crops';
import { idxOf } from './water';
import { initMarket } from './market';
import { rollSeasonWeather, buildForecast } from './weather';

function emptyCounts(): Record<CropId, number> {
  const out = {} as Record<CropId, number>;
  for (const id of CROP_IDS) out[id] = 0;
  return out;
}

function buildTiles(): Tile[] {
  const tiles: Tile[] = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const inStartPlot =
        r >= START_PLOT.r0 && r <= START_PLOT.r1 && c >= START_PLOT.c0 && c <= START_PLOT.c1;
      tiles.push({
        kind: inStartPlot ? 'grass' : 'locked',
        moisture: 0,
        nitrogen: START_NITROGEN,
        crop: null,
        irrigated: false,
      });
    }
  }
  // Place the reservoir inside the start plot.
  const rIdx = idxOf(RESERVOIR_POS.r, RESERVOIR_POS.c);
  tiles[rIdx] = { kind: 'reservoir', moisture: 0, nitrogen: 0, crop: null, irrigated: false };
  return tiles;
}

export function newGame(seed: number): GameState {
  const day = 1;
  const weatherTruth = rollSeasonWeather(seed, day);
  const seeds = emptyCounts();
  for (const [k, v] of Object.entries(START_SEEDS)) {
    seeds[k as CropId] = v as number;
  }

  const state: GameState = {
    version: 1,
    seed,
    day,
    gold: START_GOLD,
    ap: BASE_AP,
    apMax: BASE_AP,
    tiles: buildTiles(),
    reservoir: RESERVOIR_START,
    wells: 0,
    inventory: emptyCounts(),
    seeds,
    market: initMarket(),
    weatherTruth,
    forecast: [],
    marketVisitedToday: false,
    upgrades: [],
    lastRecap: null,
    tutorialStep: 0,
  };

  state.forecast = buildForecast(seed, day, weatherTruth);
  return state;
}

// A stable-ish random seed for "new game" when the user doesn't type one.
export function randomSeed(): number {
  return (Math.floor(Math.random() * 0xffffffff) >>> 0) || 1;
}
