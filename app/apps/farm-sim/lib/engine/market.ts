// ============================================================================
// Farm Sim — Market engine. Pure. See docs/FARM_SIM_PLAN.md §6.
//
// price = basePrice × seasonMod × supply × noise
// The SAME function drives display and sell math (no hidden spread).
// ============================================================================

import { CropId, GameState, MarketRow } from '../types';
import {
  SUPPLY_HIT_PER_UNIT,
  SUPPLY_FLOOR,
  SUPPLY_RECOVERY,
  NOISE_STEP,
  NOISE_MIN,
  NOISE_MAX,
} from '../balance';
import { CROPS, CROP_IDS } from '../../data/crops';
import { seasonForDay } from './weather';

export function initMarket(): Record<CropId, MarketRow> {
  const market = {} as Record<CropId, MarketRow>;
  for (const id of CROP_IDS) {
    market[id] = { supply: 1.0, noise: 1.0, history: [] };
  }
  return market;
}

// Round to 0.1 for display; sells use this exact value.
export function getPrice(state: GameState, crop: CropId): number {
  const def = CROPS[crop];
  const season = seasonForDay(state.day);
  const row = state.market[crop];
  const raw = def.basePrice * def.seasonMod[season] * row.supply * row.noise;
  return Math.round(raw * 10) / 10;
}

// Preview supply after selling `qty` — used by the sell sheet's live impact line.
export function previewSupplyAfterSell(supply: number, qty: number): number {
  return Math.max(SUPPLY_FLOOR, supply * (1 - SUPPLY_HIT_PER_UNIT * qty));
}

// Preview the price a crop would trade at after selling `qty` right now.
export function previewPriceAfterSell(state: GameState, crop: CropId, qty: number): number {
  const def = CROPS[crop];
  const season = seasonForDay(state.day);
  const row = state.market[crop];
  const supplyAfter = previewSupplyAfterSell(row.supply, qty);
  const raw = def.basePrice * def.seasonMod[season] * supplyAfter * row.noise;
  return Math.round(raw * 10) / 10;
}

// Nightly market update (mutates a copy of the rows). Called from endDay.
export function stepMarket(
  market: Record<CropId, MarketRow>,
  state: GameState,
  rng: () => number
): Record<CropId, MarketRow> {
  const next = {} as Record<CropId, MarketRow>;
  for (const id of CROP_IDS) {
    const row = market[id];
    // Supply recovers toward 1.0.
    const supply = row.supply + (1 - row.supply) * SUPPLY_RECOVERY;
    // Noise random walk, clamped.
    const delta = (rng() * 2 - 1) * NOISE_STEP;
    const noise = Math.min(NOISE_MAX, Math.max(NOISE_MIN, row.noise + delta));
    const updated: MarketRow = { supply, noise, history: row.history };
    next[id] = updated;
    // Push today's post-update price into history (keep last 7).
    const def = CROPS[id];
    const season = seasonForDay(state.day + 1);
    const price = Math.round(def.basePrice * def.seasonMod[season] * supply * noise * 10) / 10;
    updated.history = [...row.history, price].slice(-7);
  }
  return next;
}
