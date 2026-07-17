// ============================================================================
// Farm Sim — Balance constants
// EVERY tunable number lives here. 🔧 marks values expected to move in tuning.
// See docs/FARM_SIM_PLAN.md §1.
// ============================================================================

import { Season } from './types';

// ── World ──────────────────────────────────────────────
export const GRID_SIZE = 12; // 12×12 world grid
export const START_PLOT = { r0: 3, c0: 3, r1: 8, c1: 8 }; // starting 6×6 (inclusive)
export const RESERVOIR_POS = { r: 3, c: 5 }; // pre-placed inside start plot, north edge
export const SEASON_LENGTH = 28; // days per season
export const SEASONS: Season[] = ['Spring', 'Summer', 'Fall']; // Winter is M2

// ── Player ─────────────────────────────────────────────
export const START_GOLD = 120; // 🔧
export const BASE_AP = 12; // 🔧 the central difficulty knob
export const START_SEEDS = { wheat: 3 } as const; // onboarding gift

// ── Action costs (AP) ──────────────────────────────────
export const AP_COST = {
  till: 1,
  plant: 1,
  water: 1,
  harvest: 1,
  buildChannel: 2,
  demolish: 1,
  digWell: 3,
  marketTrip: 1, // first sell of the day only; later sells same day are free
} as const;

// ── Gold costs ─────────────────────────────────────────
export const GOLD_COST = {
  channel: 15, // 🔧
  well: 100,
  expandRing1: 40, // tiles orthogonally adjacent to start plot
  expandRing2: 80,
  expandRing3: 150, // corners / outermost
} as const;
export const MAX_WELLS = 3;

// ── Water ──────────────────────────────────────────────
export const RESERVOIR_CAP = 200; // 🔧
export const RESERVOIR_START = 120;
export const RAIN_RESERVOIR_GAIN = 100;
export const WELL_DAILY_YIELD = 30;
export const MANUAL_WATER_MOISTURE = 40; // moisture added per water action
export const MANUAL_WATER_MOISTURE_BIGCAN = 60; // with Big Can upgrade
export const MANUAL_WATER_DRAW = 10; // reservoir cost per water action
export const IRRIGATION_TARGET = 70; // channel-adjacent tiles topped to this at dawn
export const TILLED_START_MOISTURE = 40;
export const RAIN_TILE_GAIN = 50; // rain: moisture = min(100, m + 50)
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
export const FORECAST_ACCURACY = [0.9, 0.7, 0.55]; // day+1, +2, +3
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
export const UPGRADES = {
  bigCan: { cost: 80, name: 'Big Watering Can', effect: 'Watering gives +60 moisture instead of +40' },
  cart: { cost: 60, name: 'Market Cart', effect: 'Market trips cost 0 AP' },
  coffee: { cost: 120, name: 'Endless Coffee', effect: 'Permanent +2 AP per day' },
} as const;
export const COFFEE_AP_BONUS = 2;

// ── Death & stress ─────────────────────────────────────
export const STRESS_DAYS_TO_DIE = 2; // consecutive dry days kills a crop
