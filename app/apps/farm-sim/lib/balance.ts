// ============================================================================
// Farm Sim — Balance constants
// EVERY tunable number lives here. 🔧 marks values expected to move in tuning.
// See docs/FARM_SIM_PLAN.md §1.
// ============================================================================

import { ParcelId, Season, UpgradeId } from './types';

// ── World ──────────────────────────────────────────────
export const GRID_SIZE = 40; // 40×40 world grid
export const START_PLOT = { r0: 15, c0: 14, r1: 24, c1: 25 }; // compact starter farm inside the wider landscape
export const RESERVOIR_POS = { r: 17, c: 20 };
export const FARM_LANDMARKS = {
  shed: { r: 16, c: 16 },
  market: { r: 23, c: 24 },
  mill: { r: 16, c: 24 },
  depot: { r: 21, c: 25 },
  crate: { r: 18, c: 16 },
} as const;
export const SEASON_LENGTH = 28; // days per season
export const SEASONS: Season[] = ['Spring', 'Summer', 'Fall']; // Winter is M2

// ── Player ─────────────────────────────────────────────
export const START_GOLD = 120; // 🔧
export const START_FUEL = 4;
export const START_SEEDS = { wheat: 6, potato: 2 } as const;
// ── Gold costs ─────────────────────────────────────────
export const GOLD_COST = {
  channel: 15, // 🔧
  well: 100,
  sprinkler: 55,
  mill: 90,
  wheatStorage: 70,
  fieldCrate: 50,
  haulRoute: 90,
  clearBrush: 8,
  clearRock: 18,
  drainMarsh: 28,
  expandRing1: 40, // tiles orthogonally adjacent to start plot
  expandRing2: 80,
  expandRing3: 150, // corners / outermost
} as const;
export const WHEAT_STORAGE_START = 12;
export const WHEAT_STORAGE_UPGRADE = 12;
export const MILL_INPUT_CAPACITY = 9;
export const MILL_OUTPUT_CAPACITY = 9;
export const MILL_RATE_PER_DAY = 3;
export const MILL_UNLOCK_WHEAT = 24;
export const FLOUR_EXPORT_PRICE = 14;
export const CRATE_CATCHMENT = 4;
export const FIELD_CRATE_CAPACITY = 24;
export const FIELD_CRATE_UPGRADE = 12;
export const HAUL_ROUTE_LEVELS = {
  1: { rate: 3, cost: 90 },
  2: { rate: 6, cost: 180 },
  3: { rate: 12, cost: 360 },
} as const;
export const MILL_LEVELS = {
  1: { rate: 3, input: 9, output: 9, cost: 90, name: 'Stone Mill' },
  2: { rate: 6, input: 18, output: 18, cost: 280, name: 'Twin Stones' },
  3: { rate: 12, input: 36, output: 36, cost: 650, name: 'Roller Mill' },
} as const;
export const PARCEL_COST: Record<ParcelId, number> = {
  north: 220,
  south: 240,
  west: 260,
  east: 280,
  northwest: 450,
  northeast: 500,
  southwest: 550,
  southeast: 600,
};
export const MAX_WELLS = 3;
export const EXTRACTOR_BUILD_COST = { gold: 30, bricks: 2, machineParts: 0 } as const;
export const EXTRACTOR_UPGRADE_COST = { gold: 150, bricks: 6, machineParts: 2 } as const;
export const MACHINE_COST = {
  tractor: { gold: 1800, machineParts: 3 },
  seeder: { gold: 550, machineParts: 2 },
} as const;

// ── Water ──────────────────────────────────────────────
export const RESERVOIR_CAP = 200; // 🔧
export const RESERVOIR_START = 120;
export const RAIN_RESERVOIR_GAIN = 100;
export const WELL_DAILY_YIELD = 30;
export const MANUAL_WATER_MOISTURE = 40; // moisture added per water action
export const MANUAL_WATER_DRAW = 4; // reservoir transferred into one can charge

export const SPRINKLER_MOISTURE = 30;
export const SPRINKLER_WATER_DRAW = 10; // reservoir cost per water action
export const IRRIGATION_TARGET = 70; // channel-adjacent tiles topped to this at dawn
export const TILLED_START_MOISTURE = 40;
export const RAIN_TILE_GAIN = 50; // rain: moisture = min(100, m + 50)
export const ITEM_SELL_PRICE: Record<string, number> = {
  fertilizer: 15,
  flour: 20,
  bread: 35,
  milk: 45,
  egg: 15,
  fuel: 5,
};
export const EVAPORATION: Record<string, number> = {
  sunny: 10,
  cloudy: 5,
  rain: 0,
  storm: 0,
  heatwave: 25,
  frost: 5,
};

// ── Soil ───────────────────────────────────────────────
export const START_NITROGEN = 70;
export const FALLOW_N_REGEN = 5; // tilled, unplanted
export const GRASS_N_REGEN = 8;
export const LOW_N_THRESHOLD = 30; // below → yield ×0.75
export const CRITICAL_N_THRESHOLD = 10; // below → yield ×0.5
export const LOW_N_YIELD_MULT = 0.75;
export const CRITICAL_N_YIELD_MULT = 0.5;
export const BEAN_SELF_N = 4; // beans add to own tile per day
export const BEAN_NEIGHBOR_N = 2; // beans add to orthogonal neighbors per day

// ── Weather ────────────────────────────────────────────
export const FORECAST_ACCURACY = [1, 1, 1]; // the simple forecast is always accurate
export const STORM_DESTROY_CHANCE = 0.15; // per MATURE crop, per storm

// ── Market ─────────────────────────────────────────────
export const SUPPLY_HIT_PER_UNIT = 0.003; // selling q units: supply ×= (1 − 0.003·q)
export const SUPPLY_FLOOR = 0.5;
export const SUPPLY_RECOVERY = 0.15; // supply += (1 − supply) × 0.15 per day
export const NOISE_STEP = 0.04; // daily random walk ± this
export const NOISE_MIN = 0.7;
export const NOISE_MAX = 1.4;
export const PRICE_MOVE_RECAP_THRESHOLD = 0.15; // report price moves ≥ 15%

// ── Upgrades (one-time, bought at market) ──────────────
export const UPGRADES: Record<UpgradeId, { cost: number; name: string; effect: string }> = {
  bigCan: { cost: 180, name: 'Large Watering Can', effect: 'Carries 20 charges instead of 10' },
  sickle: { cost: 220, name: 'Field Sickle', effect: 'Harvests a three-tile row' },
  rowPlow: { cost: 260, name: 'Row Plow', effect: 'Tills a three-tile row' },
  seedDrill: { cost: 320, name: 'Seed Drill', effect: 'Plants a three-tile row' },
  tractor: { cost: 1800, name: 'Tractor', effect: 'Tills or harvests a 3×3 area' },
  seeder: { cost: 550, name: 'Seeder Attachment', effect: 'Plants seeds in a 3×3 area' },
  truck: { cost: 1000, name: 'Truck', effect: 'Allows quick selling' },
};

// ── Death & stress ─────────────────────────────────────
export const STRESS_DAYS_TO_DIE = 2; // consecutive dry days kills a crop
