// ============================================================================
// Farm Sim — New game construction. Pure. See docs/FARM_SIM_PLAN.md §1–2.
// ============================================================================

import { CropId, GameState, ItemId, ResourceId, SoilType, Tile } from '../types';
import {
  GRID_SIZE,
  START_PLOT,
  RESERVOIR_POS,
  START_GOLD,
  START_FUEL,
  START_SEEDS,
  RESERVOIR_START,
  START_NITROGEN,
  MILL_INPUT_CAPACITY,
  MILL_OUTPUT_CAPACITY,
  MILL_RATE_PER_DAY,
  FARM_LANDMARKS,
} from '../balance';
import { CROP_IDS } from '../../data/crops';
import { computeIrrigation, connectedChannels, idxOf, orthoNeighbors } from './water';
import { initMarket } from './market';
import { rollSeasonWeather, buildForecast } from './weather';
import { createContractOffers } from './contracts';
import { initialParcels } from './parcels';

function emptyCounts(): Record<CropId, number> {
  const out = {} as Record<CropId, number>;
  for (const id of CROP_IDS) out[id] = 0;
  return out;
}

function soilAt(seed: number, r: number, c: number): SoilType {
  const hash = Math.abs(((r * 97 + c * 193 + seed * 17) * 1103515245) | 0) % 100;
  if (r >= 25 || hash < 22) return 'clay';
  if (c >= 26 || hash > 78) return 'sandy';
  return 'loam';
}

function starterCrop(cropId: CropId, growthDays: number, soil: SoilType): Tile {
  return {
    kind: 'tilled',
    moisture: 70,
    nitrogen: START_NITROGEN,
    crop: { cropId, growthDays, mature: cropId === 'wheat', stressDays: 0 },
    irrigated: false,
    soil,
  };
}

function buildTiles(seed: number): Tile[] {
  const tiles: Tile[] = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const inStarterParcel = r >= START_PLOT.r0 && r <= START_PLOT.r1 && c >= START_PLOT.c0 && c <= START_PLOT.c1;
      tiles.push({
        kind: inStarterParcel ? 'grass' : 'locked',
        moisture: 0,
        nitrogen: START_NITROGEN,
        crop: null,
        irrigated: false,
        soil: soilAt(seed, r, c),
      });
    }
  }
  // Place the reservoir at the start of the farm zone.
  const rIdx = idxOf(RESERVOIR_POS.r, RESERVOIR_POS.c);
  tiles[rIdx] = { kind: 'reservoir', moisture: 0, nitrogen: 0, crop: null, irrigated: false, soil: 'clay' };
  // The opening farm is personal and manual: home, water, and a roadside
  // produce stand. Industrial buildings arrive only after their need is felt.
  tiles[idxOf(FARM_LANDMARKS.shed.r, FARM_LANDMARKS.shed.c)] = { kind: 'shed', moisture: 0, nitrogen: 0, crop: null, irrigated: false, soil: 'loam' };
  tiles[idxOf(FARM_LANDMARKS.market.r, FARM_LANDMARKS.market.c)] = { kind: 'market', moisture: 0, nitrogen: 0, crop: null, irrigated: false, soil: 'loam' };
  const yardPaths = new Set<number>();
  for (let r = 17; r <= FARM_LANDMARKS.market.r; r++) yardPaths.add(idxOf(r, FARM_LANDMARKS.shed.c + 1));
  for (let c = FARM_LANDMARKS.shed.c + 1; c <= FARM_LANDMARKS.market.c; c++) yardPaths.add(idxOf(FARM_LANDMARKS.market.r, c));
  for (let c = FARM_LANDMARKS.shed.c + 1; c <= RESERVOIR_POS.c; c++) yardPaths.add(idxOf(19, c));
  for (const idx of yardPaths) {
    if (tiles[idx].kind === 'grass') tiles[idx] = { ...tiles[idx], kind: 'path' };
  }

  // The opening farm begins manually. Irrigation arrives after the player has
  // learned the crop loop, so automation solves a problem they understand.
  tiles[idxOf(17, 21)] = { kind: 'well', moisture: 0, nitrogen: 0, crop: null, irrigated: false, soil: 'clay' };

  // A few open tiles prevent cleanup from becoming a chore. Clutter teaches
  // that this land is being reclaimed and pays useful early materials.
  const brush = [[15, 20], [15, 22], [16, 19], [20, 14], [22, 14], [24, 19], [24, 21]] as const;
  const rocks = [[15, 24], [21, 24], [24, 15]] as const;
  for (const [r, c] of brush) tiles[idxOf(r, c)] = { ...tiles[idxOf(r, c)], kind: 'brush' };
  for (const [r, c] of rocks) tiles[idxOf(r, c)] = {
    ...tiles[idxOf(r, c)],
    kind: 'rock',
    deposit: { resource: 'stone', remaining: 8, max: 8 },
  };

  const wheat = [[21, 16], [21, 17], [21, 18]] as const;
  const potatoes = [[22, 16], [22, 17]] as const;
  for (const [r, c] of wheat) tiles[idxOf(r, c)] = starterCrop('wheat', 4, 'loam');
  for (const [r, c] of potatoes) tiles[idxOf(r, c)] = starterCrop('potato', 2, 'sandy');

  const supplied = connectedChannels(tiles);
  const irrigated = computeIrrigation(tiles);
  return tiles.map((tile, idx) => ({
    ...tile,
    irrigated: tile.kind === 'channel'
      ? supplied.has(idx)
      : tile.kind === 'sprinkler'
        ? orthoNeighbors(idx).some((neighbor) => supplied.has(neighbor))
        : irrigated[idx],
  }));
}

export function newGame(seed: number): GameState {
  const day = 1;
  const reputation = 0;
  const weatherTruth = rollSeasonWeather(seed, day);
  const seeds = emptyCounts();
  for (const [k, v] of Object.entries(START_SEEDS)) {
    seeds[k as CropId] = v as number;
  }

  const state: GameState = {
    version: 1,
    seed,
    day,
    time: 360, // 6:00 AM
    lastTickMs: Date.now(),
    gold: START_GOLD,
    tiles: buildTiles(seed),
    reservoir: RESERVOIR_START,
    wells: 1,
    inventory: emptyCounts(),
    seeds,
    items: Object.fromEntries((['fertilizer', 'flour', 'bread', 'milk', 'egg', 'fuel', 'riceBag', 'cornmeal', 'vegetableCrate', 'tomatoSauce', 'bricks', 'ironBars', 'machineParts'] as ItemId[]).map((id) => [id, id === 'fuel' ? START_FUEL : 0])) as Record<ItemId, number>,
    resources: Object.fromEntries((['wood', 'stone', 'clay', 'coal', 'ironOre'] as ResourceId[]).map((id) => [id, 0])) as Record<ResourceId, number>,
    facilities: { kiln: { level: 0, usedToday: 0 }, kitchen: { level: 0, usedToday: 0 }, workshop: { level: 0, usedToday: 0 } },
    extractors: [],
    mill: {
      commissioned: false,
      level: 0,
      input: 0,
      output: 0,
      inputCapacity: MILL_INPUT_CAPACITY,
      outputCapacity: MILL_OUTPUT_CAPACITY,
      ratePerDay: MILL_RATE_PER_DAY,
    },
    fieldCrates: [],
    haulRoutes: [],
    parcels: initialParcels(false),
    production: {
      wheatStorageCapacity: 0,
      harvestedWheat: 0,
      rawWheatExported: 0,
      wheatMilled: 0,
      flourExported: 0,
      automatedWaterings: 0,
      harvestedToday: 0,
      recentHarvests: [],
      milestones: [],
    },
    machines: [],
    animals: [],
    contracts: createContractOffers(seed, day, reputation, 3),
    reputation,
    unlocks: [],
    market: initMarket(),
    weatherTruth,
    forecast: [],
    marketVisitedToday: false,
    upgrades: [],
    lastRecap: null,
    tutorialStep: 0,
    opening: { stage: 0, progress: 0, complete: false },
    labor: { manualTills: 0, manualPlants: 0, manualWaterings: 0, manualHarvests: 0 },
  };

  state.forecast = buildForecast(seed, day, weatherTruth);
  return state;
}

// A stable-ish random seed for "new game" when the user doesn't type one.
export function randomSeed(): number {
  return (Math.floor(Math.random() * 0xffffffff) >>> 0) || 1;
}
