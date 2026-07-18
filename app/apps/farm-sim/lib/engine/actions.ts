// ============================================================================
// Farm Sim — Player-phase actions. Pure. See docs/FARM_SIM_PLAN.md §2–§8.
//
// Actions apply IMMEDIATELY (you watch moisture change). They consume NO
// randomness — all RNG lives in endDay — so determinism is preserved.
// ============================================================================

import { ActionResult, CropId, FieldCrate, GameState, PlayerAction, Tile } from '../types';
import {
  GOLD_COST,
  GRID_SIZE,
  MAX_WELLS,
  TILLED_START_MOISTURE,
  MANUAL_WATER_MOISTURE,
  MANUAL_WATER_MOISTURE_BIGCAN,
  MANUAL_WATER_DRAW,
  START_PLOT,
  UPGRADES,
  FLOUR_EXPORT_PRICE,
  WHEAT_STORAGE_UPGRADE,
  CRATE_CATCHMENT,
  FIELD_CRATE_CAPACITY,
  FIELD_CRATE_UPGRADE,
  HAUL_ROUTE_LEVELS,
  MILL_LEVELS,
  PARCEL_COST,
  EXTRACTOR_BUILD_COST,
  EXTRACTOR_UPGRADE_COST,
  MACHINE_COST,
} from '../balance';
import { CROPS } from '../../data/crops';
import { FACILITY_CAPACITY, FACILITY_NAMES, FACILITY_UPGRADES, ITEM_SELL_VALUES, RECIPES, RESOURCE_SELL_VALUES } from '../../data/economy';
import { connectedChannels, orthoNeighbors } from './water';
import { seasonForDay } from './weather';
import { getPrice, previewSupplyAfterSell } from './market';
import { harvestYield } from './crops';
import { clamp, cloneState } from './util';
import { unlocksForReputation } from './contracts';
import { syncProductionMilestones } from './production';
import { PARCELS, depositFor, guaranteedParcelTerrain, parcelIndices, revealedTerrain } from './parcels';

function fail(state: GameState, error: string): ActionResult {
  return { ok: false, state, error };
}

// Manhattan distance of a tile from the starting plot rectangle → expansion ring.
export function expansionRing(idx: number): 1 | 2 | 3 {
  const r = Math.floor(idx / GRID_SIZE);
  const c = idx % GRID_SIZE;
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

function tileDistance(a: number, b: number): number {
  return Math.abs(Math.floor(a / GRID_SIZE) - Math.floor(b / GRID_SIZE)) + Math.abs(a % GRID_SIZE - b % GRID_SIZE);
}

export function nearestCrateForHarvest(state: GameState, tileIdx: number, units = 0): FieldCrate | undefined {
  return state.fieldCrates
    .filter((crate) => tileDistance(crate.idx, tileIdx) <= CRATE_CATCHMENT && crate.wheat + units <= crate.capacity)
    .sort((a, b) => tileDistance(a.idx, tileIdx) - tileDistance(b.idx, tileIdx) || a.idx - b.idx)[0];
}

function syncStorageCapacity(state: GameState): void {
  state.production.wheatStorageCapacity = state.fieldCrates.reduce((sum, crate) => sum + crate.capacity, 0);
}

function ingredientCount(state: GameState, ingredient: (typeof RECIPES)[keyof typeof RECIPES]['inputs'][number]): number {
  if (ingredient.kind === 'crop') return state.inventory[ingredient.id] ?? 0;
  if (ingredient.kind === 'resource') return state.resources[ingredient.id] ?? 0;
  return state.items[ingredient.id] ?? 0;
}

function consumeIngredient(state: GameState, ingredient: (typeof RECIPES)[keyof typeof RECIPES]['inputs'][number], qty: number): void {
  const amount = ingredient.qty * qty;
  if (ingredient.kind === 'crop') state.inventory[ingredient.id] -= amount;
  else if (ingredient.kind === 'resource') state.resources[ingredient.id] -= amount;
  else state.items[ingredient.id] -= amount;
}

export function applyAction(state: GameState, action: PlayerAction): ActionResult {
  const season = seasonForDay(state.day);

  switch (action.type) {
    // ── TILL ────────────────────────────────────────────
    case 'till': {
      const t = state.tiles[action.idx];
      if (t.kind !== 'grass') return fail(state, 'You can only till open grass.');
      const s = cloneState(state);
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
      const s = cloneState(state);
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
      if (state.reservoir < MANUAL_WATER_DRAW) return fail(state, 'The reservoir is empty.');
      const s = cloneState(state);
      s.reservoir -= MANUAL_WATER_DRAW;
      s.tiles[action.idx] = { ...t, moisture: clamp(t.moisture + waterAmount(state), 0, 100) };
      return { ok: true, state: s };
    }

    // ── HARVEST ─────────────────────────────────────────
    case 'harvest': {
      const t = state.tiles[action.idx];
      if (!t.crop || !t.crop.mature) return fail(state, 'Nothing here is ready to harvest.');
      const s = cloneState(state);
      const def = CROPS[t.crop.cropId];
      const units = harvestYield(t);
      if (t.crop.cropId === 'wheat') {
        const destination = nearestCrateForHarvest(state, action.idx, units);
        if (!destination) return fail(state, `No field crate within ${CRATE_CATCHMENT} tiles has room for this harvest.`);
        s.fieldCrates.find((crate) => crate.id === destination.id)!.wheat += units;
        s.production.harvestedWheat += units;
        s.production.harvestedToday += units;
        syncProductionMilestones(s);
      } else s.inventory[t.crop.cropId] += units;
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

    case 'harvestArea': {
      if (!state.upgrades.includes('tractor')) return fail(state, 'Buy the tractor first.');
      if (state.items.fuel < 1) return fail(state, 'The tractor needs one fuel.');
      const centerRow = Math.floor(action.idx / GRID_SIZE), centerCol = action.idx % GRID_SIZE;
      const targets = state.tiles
        .map((tile, idx) => ({ tile, idx, row: Math.floor(idx / GRID_SIZE), col: idx % GRID_SIZE }))
        .filter(({ tile, row, col }) => tile.crop?.mature && Math.abs(row - centerRow) <= 1 && Math.abs(col - centerCol) <= 1)
        .map(({ idx }) => idx);
      if (targets.length === 0) return fail(state, 'No mature crops in this 3x3 area.');

      // Reuse the single-tile action so wheat crate capacity and all harvest rules stay identical.
      let harvested = state;
      for (const idx of targets) {
        const result = applyAction(harvested, { type: 'harvest', idx });
        if (!result.ok) return fail(state, result.error ?? 'The area harvest could not be completed.');
        harvested = result.state;
      }
      const s = cloneState(harvested);
      s.items.fuel -= 1;
      return { ok: true, state: s };
    }

    // ── BUILD CHANNEL ───────────────────────────────────
    case 'buildChannel': {
      const t = state.tiles[action.idx];
      if (t.kind !== 'grass') return fail(state, 'Channels go on open grass.');
      if (state.gold < GOLD_COST.channel) return fail(state, 'Not enough gold.');
      const s = cloneState(state);
      s.gold -= GOLD_COST.channel;
      s.tiles[action.idx] = { ...t, kind: 'channel', crop: null };
      const supplied = connectedChannels(s.tiles);
      s.tiles.forEach((tile, idx) => {
        if (tile.kind === 'channel') tile.irrigated = supplied.has(idx);
      });
      return { ok: true, state: s };
    }

    case 'buildSprinkler': {
      const t = state.tiles[action.idx];
      if (t.kind !== 'grass') return fail(state, 'Sprinklers go on open grass.');
      if (!orthoNeighbors(action.idx).some((idx) => connectedChannels(state.tiles).has(idx)))
        return fail(state, 'Connect this sprinkler beside a supplied channel.');
      if (state.gold < GOLD_COST.sprinkler) return fail(state, 'Not enough gold.');
      const s = cloneState(state);
      s.gold -= GOLD_COST.sprinkler;
      s.tiles[action.idx] = { ...t, kind: 'sprinkler', crop: null, irrigated: true };
      return { ok: true, state: s };
    }

    case 'clearLand': {
      const t = state.tiles[action.idx];
      if (t.kind !== 'brush') return fail(state, t.kind === 'rock' || t.kind === 'marsh' ? 'Mine this resource deposit before farming here.' : 'This tile does not need clearing.');
      const s = cloneState(state);
      s.resources.wood += 4;
      s.tiles[action.idx] = { ...t, kind: 'grass', moisture: 0, crop: null };
      return { ok: true, state: s };
    }

    case 'mine': {
      const t = state.tiles[action.idx];
      if (t.kind !== 'rock' && t.kind !== 'marsh') return fail(state, 'There is no exposed deposit here.');
      const deposit = t.deposit ?? depositFor(action.idx, state.seed, t.kind);
      if (!deposit || deposit.remaining < 1) return fail(state, 'This deposit is exhausted.');
      const mined = Math.min(4, deposit.remaining);
      const s = cloneState(state);
      s.resources[deposit.resource] += mined;
      const remaining = deposit.remaining - mined;
      s.tiles[action.idx] = remaining > 0
        ? { ...t, deposit: { ...deposit, remaining } }
        : { ...t, kind: 'grass', moisture: 0, crop: null, deposit: undefined };
      return { ok: true, state: s };
    }

    case 'buildExtractor': {
      const t = state.tiles[action.idx];
      if (t.kind !== 'rock' && t.kind !== 'marsh') return fail(state, 'Extractors must sit on a resource deposit.');
      const deposit = t.deposit ?? depositFor(action.idx, state.seed, t.kind);
      if (!deposit || deposit.remaining < 1) return fail(state, 'This deposit is exhausted.');
      if (state.facilities.workshop.level < 1) return fail(state, 'A level 1 workshop is required to assemble extractors.');
      if (state.gold < EXTRACTOR_BUILD_COST.gold || state.items.bricks < EXTRACTOR_BUILD_COST.bricks)
        return fail(state, `Needs ${EXTRACTOR_BUILD_COST.gold}g and ${EXTRACTOR_BUILD_COST.bricks} bricks.`);
      const s = cloneState(state);
      s.gold -= EXTRACTOR_BUILD_COST.gold;
      s.items.bricks -= EXTRACTOR_BUILD_COST.bricks;
      s.tiles[action.idx] = { ...t, kind: 'extractor', deposit: { ...deposit } };
      s.extractors.push({ id: `extractor-${action.idx}`, idx: action.idx, level: 1 });
      return { ok: true, state: s };
    }

    case 'upgradeExtractor': {
      const extractor = state.extractors.find((candidate) => candidate.id === action.extractorId);
      if (!extractor) return fail(state, 'Extractor not found.');
      if (extractor.level >= 3) return fail(state, 'This extractor is fully upgraded.');
      if (state.gold < EXTRACTOR_UPGRADE_COST.gold || state.items.bricks < EXTRACTOR_UPGRADE_COST.bricks || state.items.machineParts < EXTRACTOR_UPGRADE_COST.machineParts)
        return fail(state, `Needs ${EXTRACTOR_UPGRADE_COST.gold}g, ${EXTRACTOR_UPGRADE_COST.bricks} bricks, and ${EXTRACTOR_UPGRADE_COST.machineParts} machine parts.`);
      const s = cloneState(state);
      s.gold -= EXTRACTOR_UPGRADE_COST.gold;
      s.items.bricks -= EXTRACTOR_UPGRADE_COST.bricks;
      s.items.machineParts -= EXTRACTOR_UPGRADE_COST.machineParts;
      s.extractors.find((candidate) => candidate.id === action.extractorId)!.level += 1;
      return { ok: true, state: s };
    }

    case 'amendSoil': {
      const t = state.tiles[action.idx];
      if (!['loam', 'clay', 'sandy'].includes(action.soil)) return fail(state, 'Choose loam, clay, or sandy soil.');
      if (t.kind !== 'grass' && (t.kind !== 'tilled' || t.crop)) return fail(state, 'Amend open or empty tilled soil.');
      if (t.soil === action.soil) return fail(state, `This is already ${action.soil} soil.`);
      const s = cloneState(state);
      if (action.soil === 'clay') {
        if (s.resources.clay < 2) return fail(state, 'You need 2 clay. Mine a wetland or ridge deposit.');
        s.resources.clay -= 2;
      } else if (action.soil === 'sandy') {
        if (s.resources.stone < 2) return fail(state, 'You need 2 crushed stone.');
        s.resources.stone -= 2;
      } else {
        if (s.items.fertilizer < 1) return fail(state, 'You need fertilizer to rebuild loam.');
        s.items.fertilizer -= 1;
      }
      s.tiles[action.idx] = { ...t, soil: action.soil, nitrogen: Math.max(t.nitrogen, action.soil === 'loam' ? 75 : 55) };
      return { ok: true, state: s };
    }

    case 'purchaseParcel': {
      const parcel = PARCELS[action.parcel];
      if (!parcel) return fail(state, 'Unknown land parcel.');
      if (state.parcels[action.parcel]) return fail(state, 'This parcel is already owned.');
      if (!parcel.requires.every((required) => state.parcels[required])) return fail(state, 'Buy the neighboring parcels first.');
      const cost = PARCEL_COST[action.parcel];
      if (state.gold < cost) return fail(state, `This parcel costs ${cost}g.`);
      const s = cloneState(state);
      s.gold -= cost;
      s.parcels[action.parcel] = true;
      for (const idx of parcelIndices(parcel)) {
        if (s.tiles[idx].kind === 'locked') {
          const guaranteed = guaranteedParcelTerrain(parcel, idx);
          const kind = guaranteed?.kind ?? revealedTerrain(parcel, idx, s.seed);
          s.tiles[idx] = { ...s.tiles[idx], kind, deposit: guaranteed?.deposit ?? depositFor(idx, s.seed, kind) };
        }
      }
      return { ok: true, state: s };
    }

    case 'buildFieldCrate': {
      const t = state.tiles[action.idx];
      if (t.kind !== 'grass') return fail(state, 'Field crates go on cleared grass.');
      if (state.gold < GOLD_COST.fieldCrate) return fail(state, 'Not enough gold for a field crate.');
      const s = cloneState(state);
      s.gold -= GOLD_COST.fieldCrate;
      const id = `crate-${s.day}-${action.idx}-${s.fieldCrates.length}`;
      s.fieldCrates.push({ id, idx: action.idx, wheat: 0, capacity: FIELD_CRATE_CAPACITY });
      s.tiles[action.idx] = { ...t, kind: 'crate', crop: null };
      syncStorageCapacity(s);
      return { ok: true, state: s };
    }

    case 'upgradeFieldCrate': {
      const crate = state.fieldCrates.find((candidate) => candidate.id === action.crateId);
      if (!crate) return fail(state, 'Field crate not found.');
      if (state.gold < GOLD_COST.wheatStorage) return fail(state, 'Not enough gold to expand this crate.');
      const s = cloneState(state);
      s.gold -= GOLD_COST.wheatStorage;
      s.fieldCrates.find((candidate) => candidate.id === action.crateId)!.capacity += FIELD_CRATE_UPGRADE;
      syncStorageCapacity(s);
      syncProductionMilestones(s);
      return { ok: true, state: s };
    }

    case 'buildHaulRoute': {
      const crate = state.fieldCrates.find((candidate) => candidate.id === action.crateId);
      if (!crate) return fail(state, 'Field crate not found.');
      if (!state.mill.commissioned) return fail(state, 'Restore the mill before routing wheat to it.');
      if (state.haulRoutes.some((route) => route.crateId === crate.id)) return fail(state, 'This crate already has a hauling route.');
      const config = HAUL_ROUTE_LEVELS[1];
      if (state.gold < config.cost) return fail(state, 'Not enough gold for a hauling route.');
      const s = cloneState(state);
      s.gold -= config.cost;
      s.haulRoutes.push({ id: `route-${crate.id}`, crateId: crate.id, level: 1, ratePerDay: config.rate });
      return { ok: true, state: s };
    }

    case 'upgradeHaulRoute': {
      const route = state.haulRoutes.find((candidate) => candidate.id === action.routeId);
      if (!route) return fail(state, 'Hauling route not found.');
      const nextLevel = route.level + 1 as 2 | 3;
      const config = HAUL_ROUTE_LEVELS[nextLevel];
      if (!config) return fail(state, 'This hauling route is fully upgraded.');
      if (state.gold < config.cost) return fail(state, 'Not enough gold to upgrade this route.');
      const s = cloneState(state);
      s.gold -= config.cost;
      const upgraded = s.haulRoutes.find((candidate) => candidate.id === action.routeId)!;
      upgraded.level = nextLevel;
      upgraded.ratePerDay = config.rate;
      return { ok: true, state: s };
    }

    // ── DEMOLISH ────────────────────────────────────────
    case 'demolish': {
      const t = state.tiles[action.idx];
      if (t.kind !== 'channel' && t.kind !== 'well' && t.kind !== 'sprinkler')
        return fail(state, 'Nothing here to demolish.');
      const s = cloneState(state);
      if (t.kind === 'well') s.wells -= 1;
      s.tiles[action.idx] = { ...t, kind: 'grass' };
      const supplied = connectedChannels(s.tiles);
      s.tiles.forEach((tile, idx) => {
        if (tile.kind === 'channel') tile.irrigated = supplied.has(idx);
        if (tile.kind === 'sprinkler') tile.irrigated = orthoNeighbors(idx).some((neighbor) => supplied.has(neighbor));
      });
      return { ok: true, state: s };
    }

    // ── DIG WELL ────────────────────────────────────────
    case 'digWell': {
      const t = state.tiles[action.idx];
      if (t.kind !== 'grass') return fail(state, 'Wells go on open grass.');
      if (state.wells >= MAX_WELLS) return fail(state, `You can only have ${MAX_WELLS} wells.`);
      if (state.gold < GOLD_COST.well) return fail(state, 'Not enough gold.');
      const s = cloneState(state);
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
      const s = cloneState(state);
      s.marketVisitedToday = true;
      const price = getPrice(state, action.crop);
      s.gold += Math.round(price * action.qty * 10) / 10;
      s.inventory[action.crop] -= action.qty;
      if (action.crop === 'wheat') s.production.rawWheatExported += action.qty;
      s.market[action.crop] = {
        ...s.market[action.crop],
        supply: previewSupplyAfterSell(s.market[action.crop].supply, action.qty),
      };
      return { ok: true, state: s };
    }

    case 'commissionMill': {
      if (state.mill.commissioned) return fail(state, 'The mill is already running.');
      if (state.gold < GOLD_COST.mill) return fail(state, 'Not enough gold to restore the mill.');
      const s = cloneState(state);
      s.gold -= GOLD_COST.mill;
      s.mill.commissioned = true;
      s.mill.level = 1;
      s.mill.ratePerDay = MILL_LEVELS[1].rate;
      s.mill.inputCapacity = MILL_LEVELS[1].input;
      s.mill.outputCapacity = MILL_LEVELS[1].output;
      return { ok: true, state: s };
    }

    case 'upgradeMill': {
      if (!state.mill.commissioned) return fail(state, 'Restore the mill first.');
      const nextLevel = state.mill.level + 1 as 2 | 3;
      const config = MILL_LEVELS[nextLevel];
      if (!config) return fail(state, 'The mill is fully upgraded.');
      if (state.gold < config.cost) return fail(state, `The ${config.name} module costs ${config.cost}g.`);
      const s = cloneState(state);
      s.gold -= config.cost;
      s.mill.level = nextLevel;
      s.mill.ratePerDay = config.rate;
      s.mill.inputCapacity = config.input;
      s.mill.outputCapacity = config.output;
      return { ok: true, state: s };
    }

    case 'loadMill': {
      if (!state.mill.commissioned) return fail(state, 'Restore the mill first.');
      if (!Number.isInteger(action.qty) || action.qty < 1) return fail(state, 'Load at least one wheat.');
      const free = state.mill.inputCapacity - state.mill.input;
      if (action.qty > free) return fail(state, `The mill input only has room for ${free}.`);
      if (action.qty > state.inventory.wheat) return fail(state, `Only ${state.inventory.wheat} wheat is stored.`);
      const s = cloneState(state);
      s.inventory.wheat -= action.qty;
      s.mill.input += action.qty;
      return { ok: true, state: s };
    }

    case 'loadMillFromCrate': {
      if (!state.mill.commissioned) return fail(state, 'Restore the mill first.');
      const crate = state.fieldCrates.find((candidate) => candidate.id === action.crateId);
      if (!crate) return fail(state, 'Field crate not found.');
      if (!Number.isInteger(action.qty) || action.qty < 1) return fail(state, 'Load at least one wheat.');
      const free = state.mill.inputCapacity - state.mill.input;
      if (action.qty > free) return fail(state, `The mill input only has room for ${free}.`);
      if (action.qty > crate.wheat) return fail(state, `That crate only contains ${crate.wheat} wheat.`);
      const s = cloneState(state);
      s.fieldCrates.find((candidate) => candidate.id === action.crateId)!.wheat -= action.qty;
      s.mill.input += action.qty;
      return { ok: true, state: s };
    }

    case 'exportWheatFromCrate': {
      const crate = state.fieldCrates.find((candidate) => candidate.id === action.crateId);
      if (!crate) return fail(state, 'Field crate not found.');
      if (!Number.isInteger(action.qty) || action.qty < 1 || action.qty > crate.wheat) return fail(state, 'Choose a valid wheat quantity.');
      const s = cloneState(state);
      const price = getPrice(state, 'wheat');
      s.fieldCrates.find((candidate) => candidate.id === action.crateId)!.wheat -= action.qty;
      s.gold += Math.round(price * action.qty * 10) / 10;
      s.production.rawWheatExported += action.qty;
      return { ok: true, state: s };
    }

    case 'exportFlour': {
      if (!Number.isInteger(action.qty) || action.qty < 1) return fail(state, 'Export at least one flour.');
      if (action.qty > state.mill.output) return fail(state, `Only ${state.mill.output} flour is ready.`);
      const s = cloneState(state);
      s.mill.output -= action.qty;
      s.gold += action.qty * FLOUR_EXPORT_PRICE;
      s.production.flourExported += action.qty;
      syncProductionMilestones(s);
      return { ok: true, state: s };
    }

    case 'expandWheatStorage': {
      const crate = state.fieldCrates[0];
      if (!crate) return fail(state, 'Build a field crate first.');
      if (state.gold < GOLD_COST.wheatStorage) return fail(state, 'Not enough gold to expand storage.');
      const s = cloneState(state);
      s.gold -= GOLD_COST.wheatStorage;
      s.fieldCrates[0].capacity += WHEAT_STORAGE_UPGRADE;
      syncStorageCapacity(s);
      syncProductionMilestones(s);
      return { ok: true, state: s };
    }

    // ── DELIVER CONTRACT ────────────────────────────────
    case 'deliverContract': {
      const contract = state.contracts.find((candidate) => candidate.id === action.contractId);
      if (!contract || contract.status !== 'available')
        return fail(state, 'That order is no longer available.');
      if (state.day > contract.expiresDay) return fail(state, 'That order has expired.');
      const have = state.inventory[contract.crop] ?? 0;
      if (have < contract.quantity)
        return fail(state, `You need ${contract.quantity - have} more.`);

      const s = cloneState(state);
      const delivered = s.contracts.find((candidate) => candidate.id === action.contractId)!;
      s.inventory[contract.crop] -= contract.quantity;
      s.gold += contract.rewardGold;
      s.reputation += contract.rewardReputation;
      s.unlocks = Array.from(new Set([...unlocksForReputation(s.reputation), 'irrigation' as const]));
      delivered.status = 'completed';
      return { ok: true, state: s };
    }

    // ── BUY UPGRADE ─────────────────────────────────────
    case 'buyUpgrade': {
      if (state.upgrades.includes(action.upgrade)) return fail(state, 'Already owned.');
      const cost = UPGRADES[action.upgrade].cost;
      if (state.gold < cost) return fail(state, 'Not enough gold.');
      const parts = action.upgrade === 'tractor' ? 3 : action.upgrade === 'seeder' ? 2 : action.upgrade === 'truck' ? 4 : 0;
      if (state.items.machineParts < parts) return fail(state, `You need ${parts} machine parts from the workshop.`);
      const s = cloneState(state);
      s.gold -= cost;
      s.items.machineParts -= parts;
      s.upgrades = [...s.upgrades, action.upgrade];
      return { ok: true, state: s };
    }
    case 'buyItem': {
      if (action.item === 'fuel') {
        if (!Number.isInteger(action.qty) || action.qty < 1) return fail(state, 'Buy at least one.');
        const cost = 10 * action.qty;
        if (state.gold < cost) return fail(state, 'Not enough gold.');
        const s = cloneState(state);
        s.gold -= cost;
        s.items.fuel = (s.items.fuel || 0) + action.qty;
        return { ok: true, state: s };
      }
      return fail(state, 'Cannot buy this item.');
    }
    case 'upgradeFacility': {
      const facility = state.facilities[action.facility];
      if (facility.level >= 3) return fail(state, `${FACILITY_NAMES[action.facility]} is fully upgraded.`);
      const cost = FACILITY_UPGRADES[action.facility][facility.level];
      if (state.gold < cost.gold) return fail(state, `You need ${cost.gold}g.`);
      for (const [id, qty] of Object.entries(cost.resources)) {
        if (state.resources[id as keyof GameState['resources']] < (qty ?? 0)) return fail(state, `You need ${qty} ${id}.`);
      }
      for (const [id, qty] of Object.entries(cost.items ?? {})) {
        if (state.items[id as keyof GameState['items']] < (qty ?? 0)) return fail(state, `You need ${qty} ${id}.`);
      }
      const s = cloneState(state);
      s.gold -= cost.gold;
      for (const [id, qty] of Object.entries(cost.resources)) s.resources[id as keyof GameState['resources']] -= qty ?? 0;
      for (const [id, qty] of Object.entries(cost.items ?? {})) s.items[id as keyof GameState['items']] -= qty ?? 0;
      s.facilities[action.facility].level += 1;
      return { ok: true, state: s };
    }
    case 'craft': {
      const recipe = RECIPES[action.recipe];
      if (!recipe || !Number.isInteger(action.qty) || action.qty < 1) return fail(state, 'Choose a valid recipe quantity.');
      const facility = state.facilities[recipe.facility];
      if (facility.level < recipe.level) return fail(state, `${FACILITY_NAMES[recipe.facility]} level ${recipe.level} is required.`);
      const capacity = FACILITY_CAPACITY[facility.level] - facility.usedToday;
      if (action.qty > capacity) return fail(state, `${FACILITY_NAMES[recipe.facility]} can process ${capacity} more batch${capacity === 1 ? '' : 'es'} today.`);
      for (const input of recipe.inputs) {
        const need = input.qty * action.qty;
        if (ingredientCount(state, input) < need) return fail(state, `You need ${need} ${input.id}.`);
      }
      const s = cloneState(state);
      for (const input of recipe.inputs) consumeIngredient(s, input, action.qty);
      if (recipe.output.kind === 'item') s.items[recipe.output.id] += recipe.output.qty * action.qty;
      else s.resources[recipe.output.id] += recipe.output.qty * action.qty;
      s.facilities[recipe.facility].usedToday += action.qty;
      return { ok: true, state: s };
    }
    case 'sellItem': {
      if (!Number.isInteger(action.qty) || action.qty < 1) return fail(state, 'Sell at least one.');
      if ((state.items[action.item] ?? 0) < action.qty) return fail(state, `You only have ${state.items[action.item] ?? 0}.`);
      const s = cloneState(state);
      s.items[action.item] -= action.qty;
      s.gold += ITEM_SELL_VALUES[action.item] * action.qty;
      return { ok: true, state: s };
    }
    case 'sellResource': {
      if (!Number.isInteger(action.qty) || action.qty < 1) return fail(state, 'Sell at least one.');
      if ((state.resources[action.resource] ?? 0) < action.qty) return fail(state, `You only have ${state.resources[action.resource] ?? 0}.`);
      const s = cloneState(state);
      s.resources[action.resource] -= action.qty;
      s.gold += RESOURCE_SELL_VALUES[action.resource] * action.qty;
      return { ok: true, state: s };
    }
    case 'buyAnimal': {
      const animalType = action.animal;
      const structureKind = animalType === 'cow' ? 'barn' : 'coop';
      const capacity = state.tiles.filter((tile) => tile.kind === structureKind).length * 4;
      const housed = state.animals.filter((animal) => animal.type === animalType).length;
      if (housed >= capacity) return fail(state, `Build a ${structureKind} with open space first.`);
      const cost = animalType === 'cow' ? 500 : 200;
      if (state.gold < cost) return fail(state, 'Not enough gold.');
      const s = cloneState(state);
      s.gold -= cost;
      s.animals.push({
        id: `animal-${s.day}-${s.animals.length}`,
        type: animalType,
        fedToday: false,
        produceDays: animalType === 'cow' ? 3 : 1,
      });
      return { ok: true, state: s };
    }
    case 'feedAnimal': {
      const animalIdx = state.animals.findIndex(a => a.id === action.animalId);
      if (animalIdx < 0) return fail(state, 'Animal not found.');
      if (state.animals[animalIdx].fedToday) return fail(state, 'Already fed today.');
      if ((state.inventory.wheat ?? 0) < 1) return fail(state, 'You need wheat for feed.');
      const s = cloneState(state);
      s.inventory.wheat -= 1;
      s.animals[animalIdx].fedToday = true;
      return { ok: true, state: s };
    }
    case 'collectAnimal': {
      const animalIdx = state.animals.findIndex(a => a.id === action.animalId);
      if (animalIdx < 0) return fail(state, 'Animal not found.');
      const animal = state.animals[animalIdx];
      if (animal.produceDays > 0) return fail(state, 'Not ready to collect.');
      const s = cloneState(state);
      if (animal.type === 'cow') {
        s.items.milk = (s.items.milk || 0) + 1;
        s.animals[animalIdx].produceDays = 3;
      } else {
        s.items.egg = (s.items.egg || 0) + 1;
        s.animals[animalIdx].produceDays = 1;
      }
      return { ok: true, state: s };
    }
    case 'buildStructure': {
      if (state.tiles[action.idx].kind !== 'grass') return fail(state, 'Can only build on grass.');
      if (state.tiles.filter((tile) => tile.kind === action.kind).length >= 2)
        return fail(state, `You can only build two ${action.kind}s.`);
      const cost = action.kind === 'barn' ? 500 : 300;
      if (state.gold < cost) return fail(state, 'Not enough gold.');
      const s = cloneState(state);
      s.gold -= cost;
      s.tiles[action.idx] = { ...s.tiles[action.idx], kind: action.kind };
      return { ok: true, state: s };
    }
    case 'fertilize': {
      const t = state.tiles[action.idx];
      if (t.kind !== 'tilled') return fail(state, 'Fertilizer is applied to tilled soil.');
      if (state.items.fertilizer < 1) return fail(state, 'You have no fertilizer.');
      const s = cloneState(state);
      s.items.fertilizer -= 1;
      s.tiles[action.idx] = { ...t, nitrogen: clamp(t.nitrogen + 35, 0, 100) };
      return { ok: true, state: s };
    }
    case 'tillArea': {
      if (!state.upgrades.includes('tractor')) return fail(state, 'Buy the tractor first.');
      if (state.items.fuel < 1) return fail(state, 'The tractor needs one fuel.');
      const centerRow = Math.floor(action.idx / GRID_SIZE), centerCol = action.idx % GRID_SIZE;
      const targets = state.tiles.map((tile, idx) => ({ tile, idx, row: Math.floor(idx / GRID_SIZE), col: idx % GRID_SIZE }))
        .filter(({ tile, row, col }) => tile.kind === 'grass' && Math.abs(row - centerRow) <= 1 && Math.abs(col - centerCol) <= 1)
        .map(({ idx }) => idx);
      if (targets.length === 0) return fail(state, 'No open ground in this 3x3 area.');
      const s = cloneState(state);
      s.items.fuel -= 1;
      for (const idx of targets) s.tiles[idx] = { ...s.tiles[idx], kind: 'tilled', moisture: TILLED_START_MOISTURE };
      return { ok: true, state: s };
    }
    case 'plantArea': {
      if (!state.upgrades.includes('seeder')) return fail(state, 'Buy the precision seeder first.');
      if (state.items.fuel < 1) return fail(state, 'The seeder needs one fuel.');
      const def = CROPS[action.crop];
      if (!def.seasons.includes(season)) return fail(state, `${def.name} cannot be planted in ${season}.`);
      const centerRow = Math.floor(action.idx / GRID_SIZE), centerCol = action.idx % GRID_SIZE;
      const targets = state.tiles.map((tile, idx) => ({ tile, idx, row: Math.floor(idx / GRID_SIZE), col: idx % GRID_SIZE }))
        .filter(({ tile, row, col }) => tile.kind === 'tilled' && !tile.crop && Math.abs(row - centerRow) <= 1 && Math.abs(col - centerCol) <= 1)
        .slice(0, state.seeds[action.crop] ?? 0)
        .map(({ idx }) => idx);
      if (targets.length === 0) return fail(state, `No empty tilled soil or ${def.name} seeds in this 3x3 area.`);
      const s = cloneState(state);
      s.items.fuel -= 1;
      s.seeds[action.crop] -= targets.length;
      for (const idx of targets) s.tiles[idx] = { ...s.tiles[idx], crop: { cropId: action.crop, growthDays: 0, mature: false, stressDays: 0 } };
      return { ok: true, state: s };
    }
    case 'buyMachine': {
      const cost = MACHINE_COST[action.machineType];
      if (state.gold < cost.gold || state.items.machineParts < cost.machineParts)
        return fail(state, `Needs ${cost.gold}g and ${cost.machineParts} machine parts.`);
      const s = cloneState(state);
      s.gold -= cost.gold;
      s.items.machineParts -= cost.machineParts;
      s.machines.push({
        id: `machine-${s.day}-${s.machines.length}`,
        type: action.machineType,
        fuel: 0,
        loadedCrop: null,
      });
      return { ok: true, state: s };
    }
    case 'loadMachine': {
      const idx = state.machines.findIndex(m => m.id === action.machineId);
      if (idx < 0) return fail(state, 'Machine not found.');
      const s = cloneState(state);
      // For now just top up fuel if we have any
      if (s.items.fuel > 0) {
        s.items.fuel -= 1;
        s.machines[idx].fuel += 10;
      }
      return { ok: true, state: s };
    }
    case 'collectMachine': {
      return fail(state, 'Not implemented yet.');
    }

    default:
      return fail(state, 'Unknown action.');
  }
}

// Which action TYPES are valid for a given tile — drives the tile sheet.
export function validActions(state: GameState, idx: number): PlayerAction['type'][] {
  const t = state.tiles[idx];
  if (!t) return [];
  const out: PlayerAction['type'][] = [];
  switch (t.kind) {
    case 'grass':
      out.push('till');
      if (state.upgrades.includes('tractor')) out.push('tillArea');
      out.push('amendSoil');
      out.push('buildChannel', 'digWell', 'buildSprinkler', 'buildFieldCrate');
      break;
    case 'tilled':
      if (t.crop) {
        if (t.crop.mature) out.push('harvest');
        if (t.crop.mature && state.upgrades.includes('tractor')) out.push('harvestArea');
        out.push('water');
      } else {
        out.push('plant', 'water');
        if (state.upgrades.includes('seeder')) out.push('plantArea');
      }
      out.push('fertilize');
      if (!t.crop) out.push('amendSoil');
      break;
    case 'channel':
    case 'well':
    case 'sprinkler':
      out.push('demolish');
      break;
    case 'brush':
      out.push('clearLand');
      break;
    case 'rock':
    case 'marsh':
      out.push('mine', 'buildExtractor');
      break;
    case 'extractor':
      out.push('upgradeExtractor');
      break;
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
