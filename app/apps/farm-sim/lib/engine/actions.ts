// ============================================================================
// Farm Sim — Player-phase actions. Pure. See docs/FARM_SIM_PLAN.md §2–§8.
//
// Actions apply IMMEDIATELY (you watch moisture change). They consume NO
// randomness — all RNG lives in endDay — so determinism is preserved.
// ============================================================================

import { ActionResult, CropId, GameState, PlayerAction, Tile } from '../types';
import {
  AP_COST,
  GOLD_COST,
  MAX_WELLS,
  TILLED_START_MOISTURE,
  MANUAL_WATER_MOISTURE,
  MANUAL_WATER_MOISTURE_BIGCAN,
  MANUAL_WATER_DRAW,
  START_PLOT,
  UPGRADES,
  COFFEE_AP_BONUS,
} from '../balance';
import { CROPS } from '../../data/crops';
import { orthoNeighbors } from './water';
import { seasonForDay } from './weather';
import { getPrice, previewSupplyAfterSell } from './market';
import { harvestYield } from './crops';
import { clamp, cloneState } from './util';

function fail(state: GameState, error: string): ActionResult {
  return { ok: false, state, error };
}

// Manhattan distance of a tile from the starting plot rectangle → expansion ring.
export function expansionRing(idx: number): 1 | 2 | 3 {
  const r = Math.floor(idx / 12);
  const c = idx % 12;
  const dr = Math.max(0, START_PLOT.r0 - r, r - START_PLOT.r1);
  const dc = Math.max(0, START_PLOT.c0 - c, c - START_PLOT.c1);
  const dist = dr + dc;
  if (dist <= 1) return 1;
  if (dist === 2) return 2;
  return 3;
}

export function expansionCost(idx: number): number {
  const ring = expansionRing(idx);
  return ring === 1 ? GOLD_COST.expandRing1 : ring === 2 ? GOLD_COST.expandRing2 : GOLD_COST.expandRing3;
}

function waterAmount(state: GameState): number {
  return state.upgrades.includes('bigCan') ? MANUAL_WATER_MOISTURE_BIGCAN : MANUAL_WATER_MOISTURE;
}

export function applyAction(state: GameState, action: PlayerAction): ActionResult {
  const season = seasonForDay(state.day);

  switch (action.type) {
    // ── TILL ────────────────────────────────────────────
    case 'till': {
      const t = state.tiles[action.idx];
      if (t.kind !== 'grass') return fail(state, 'You can only till open grass.');
      if (state.ap < AP_COST.till) return fail(state, 'Not enough AP.');
      const s = cloneState(state);
      s.ap -= AP_COST.till;
      s.tiles[action.idx] = { ...t, kind: 'tilled', moisture: TILLED_START_MOISTURE };
      return { ok: true, state: s };
    }

    // ── PLANT ───────────────────────────────────────────
    case 'plant': {
      const t = state.tiles[action.idx];
      const def = CROPS[action.crop];
      if (t.kind !== 'tilled') return fail(state, 'Till the soil before planting.');
      if (t.crop) return fail(state, 'Something is already growing here.');
      if (!def.seasons.includes(season))
        return fail(state, `${def.name} can't be planted in ${season}.`);
      if ((state.seeds[action.crop] ?? 0) < 1) return fail(state, `No ${def.name} seeds. Buy some at the market.`);
      if (state.ap < AP_COST.plant) return fail(state, 'Not enough AP.');
      const s = cloneState(state);
      s.ap -= AP_COST.plant;
      s.seeds[action.crop] -= 1;
      s.tiles[action.idx] = {
        ...t,
        crop: { cropId: action.crop, growthDays: 0, mature: false, stressDays: 0 },
      };
      return { ok: true, state: s };
    }

    // ── WATER ───────────────────────────────────────────
    case 'water': {
      const t = state.tiles[action.idx];
      if (t.kind !== 'tilled') return fail(state, 'Only tilled soil can be watered.');
      if (state.ap < AP_COST.water) return fail(state, 'Not enough AP.');
      if (state.reservoir < MANUAL_WATER_DRAW) return fail(state, 'The reservoir is empty.');
      const s = cloneState(state);
      s.ap -= AP_COST.water;
      s.reservoir -= MANUAL_WATER_DRAW;
      s.tiles[action.idx] = { ...t, moisture: clamp(t.moisture + waterAmount(state), 0, 100) };
      return { ok: true, state: s };
    }

    // ── HARVEST ─────────────────────────────────────────
    case 'harvest': {
      const t = state.tiles[action.idx];
      if (!t.crop || !t.crop.mature) return fail(state, 'Nothing here is ready to harvest.');
      if (state.ap < AP_COST.harvest) return fail(state, 'Not enough AP.');
      const s = cloneState(state);
      s.ap -= AP_COST.harvest;
      const def = CROPS[t.crop.cropId];
      const units = harvestYield(t);
      s.inventory[t.crop.cropId] += units;
      const newTile: Tile = { ...t };
      if (def.regrowDays) {
        // Berries: keep the bush, schedule a regrow.
        newTile.crop = { ...t.crop, mature: false, regrowCounter: def.regrowDays };
      } else {
        newTile.crop = null;
      }
      s.tiles[action.idx] = newTile;
      return { ok: true, state: s };
    }

    // ── BUILD CHANNEL ───────────────────────────────────
    case 'buildChannel': {
      const t = state.tiles[action.idx];
      if (t.kind !== 'grass') return fail(state, 'Channels go on open grass.');
      if (state.ap < AP_COST.buildChannel) return fail(state, 'Not enough AP.');
      if (state.gold < GOLD_COST.channel) return fail(state, 'Not enough gold.');
      const s = cloneState(state);
      s.ap -= AP_COST.buildChannel;
      s.gold -= GOLD_COST.channel;
      s.tiles[action.idx] = { ...t, kind: 'channel', crop: null };
      return { ok: true, state: s };
    }

    // ── DEMOLISH ────────────────────────────────────────
    case 'demolish': {
      const t = state.tiles[action.idx];
      if (t.kind !== 'channel' && t.kind !== 'well')
        return fail(state, 'Nothing here to demolish.');
      if (state.ap < AP_COST.demolish) return fail(state, 'Not enough AP.');
      const s = cloneState(state);
      s.ap -= AP_COST.demolish;
      if (t.kind === 'well') s.wells -= 1;
      s.tiles[action.idx] = { ...t, kind: 'grass' };
      return { ok: true, state: s };
    }

    // ── DIG WELL ────────────────────────────────────────
    case 'digWell': {
      const t = state.tiles[action.idx];
      if (t.kind !== 'grass') return fail(state, 'Wells go on open grass.');
      if (state.wells >= MAX_WELLS) return fail(state, `You can only have ${MAX_WELLS} wells.`);
      if (state.ap < AP_COST.digWell) return fail(state, 'Not enough AP.');
      if (state.gold < GOLD_COST.well) return fail(state, 'Not enough gold.');
      const s = cloneState(state);
      s.ap -= AP_COST.digWell;
      s.gold -= GOLD_COST.well;
      s.wells += 1;
      s.tiles[action.idx] = { ...t, kind: 'well', crop: null };
      return { ok: true, state: s };
    }

    // ── EXPAND ──────────────────────────────────────────
    case 'expand': {
      const t = state.tiles[action.idx];
      if (t.kind !== 'locked') return fail(state, 'This tile is already yours.');
      const adjacentUnlocked = orthoNeighbors(action.idx).some(
        (n) => state.tiles[n].kind !== 'locked'
      );
      if (!adjacentUnlocked) return fail(state, 'You can only expand next to land you own.');
      const cost = expansionCost(action.idx);
      if (state.gold < cost) return fail(state, `Not enough gold (needs ${cost}).`);
      const s = cloneState(state);
      s.gold -= cost;
      s.tiles[action.idx] = { ...t, kind: 'grass' };
      return { ok: true, state: s };
    }

    // ── BUY SEEDS ───────────────────────────────────────
    case 'buySeeds': {
      const def = CROPS[action.crop];
      const cost = def.seedCost * action.qty;
      if (action.qty < 1) return fail(state, 'Buy at least one.');
      if (state.gold < cost) return fail(state, 'Not enough gold.');
      const s = cloneState(state);
      s.gold -= cost;
      s.seeds[action.crop] += action.qty;
      return { ok: true, state: s };
    }

    // ── SELL ────────────────────────────────────────────
    case 'sell': {
      const have = state.inventory[action.crop] ?? 0;
      if (action.qty < 1) return fail(state, 'Sell at least one.');
      if (have < action.qty) return fail(state, `You only have ${have}.`);
      const needsTrip = !state.marketVisitedToday && !state.upgrades.includes('cart');
      if (needsTrip && state.ap < AP_COST.marketTrip)
        return fail(state, 'Not enough AP for a trip to town.');
      const s = cloneState(state);
      if (needsTrip) s.ap -= AP_COST.marketTrip;
      s.marketVisitedToday = true;
      const price = getPrice(state, action.crop);
      s.gold += Math.round(price * action.qty * 10) / 10;
      s.inventory[action.crop] -= action.qty;
      s.market[action.crop] = {
        ...s.market[action.crop],
        supply: previewSupplyAfterSell(s.market[action.crop].supply, action.qty),
      };
      return { ok: true, state: s };
    }

    // ── BUY UPGRADE ─────────────────────────────────────
    case 'buyUpgrade': {
      if (state.upgrades.includes(action.upgrade)) return fail(state, 'Already owned.');
      const cost = UPGRADES[action.upgrade].cost;
      if (state.gold < cost) return fail(state, 'Not enough gold.');
      const s = cloneState(state);
      s.gold -= cost;
      s.upgrades = [...s.upgrades, action.upgrade];
      if (action.upgrade === 'coffee') {
        s.apMax += COFFEE_AP_BONUS;
        s.ap += COFFEE_AP_BONUS;
      }
      return { ok: true, state: s };
    }

    default:
      return fail(state, 'Unknown action.');
  }
}

// Which action TYPES are valid for a given tile — drives the tile sheet.
export function validActions(state: GameState, idx: number): PlayerAction['type'][] {
  const t = state.tiles[idx];
  const out: PlayerAction['type'][] = [];
  switch (t.kind) {
    case 'grass':
      out.push('till', 'buildChannel', 'digWell');
      break;
    case 'tilled':
      if (t.crop) {
        if (t.crop.mature) out.push('harvest');
        out.push('water');
      } else {
        out.push('plant', 'water');
      }
      break;
    case 'channel':
    case 'well':
      out.push('demolish');
      break;
    case 'locked': {
      const adjacentUnlocked = orthoNeighbors(idx).some(
        (n) => state.tiles[n].kind !== 'locked'
      );
      if (adjacentUnlocked) out.push('expand');
      break;
    }
  }
  return out;
}

// Which crops the player can plant right now (in season) — for the plant strip.
export function plantableCrops(state: GameState): { crop: CropId; inSeason: boolean }[] {
  const season = seasonForDay(state.day);
  return (Object.keys(CROPS) as CropId[]).map((crop) => ({
    crop,
    inSeason: CROPS[crop].seasons.includes(season),
  }));
}
