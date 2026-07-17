import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';

import { CROPS } from '../app/apps/farm-sim/data/crops';
import { START_PLOT, GRID_SIZE, MANUAL_WATER_DRAW, GOLD_COST, CRATE_CATCHMENT, EXTRACTOR_BUILD_COST, PARCEL_COST } from '../app/apps/farm-sim/lib/balance';
import { applyAction } from '../app/apps/farm-sim/lib/engine/actions';
import { endDay } from '../app/apps/farm-sim/lib/engine/resolveDay';
import { newGame } from '../app/apps/farm-sim/lib/engine/newGame';
import { seasonForDay } from '../app/apps/farm-sim/lib/engine/weather';
import type { GameState, PlayerAction, CropId } from '../app/apps/farm-sim/lib/types';

type Strategy = 'naive' | 'planner' | 'industrial';
type Line = { kind: 'action'; action: PlayerAction; ok: boolean; error?: string } | { kind: 'endDay'; day: number };
const MAX_ACTIONS_PER_DAY = 96;
const FIELD_SIZE = 9;
const cropIds = Object.keys(CROPS) as CropId[];

function args(): { seed: number; days: number; strategy: Strategy; log?: string; replay?: string } {
  const a = process.argv.slice(2);
  const get = (name: string) => { const i = a.indexOf(name); return i < 0 ? undefined : a[i + 1]; };
  const seed = Number(get('--seed') ?? 1);
  const days = Number(get('--days') ?? 28);
  const strategy = (get('--strategy') ?? 'planner') as Strategy;
  if (!Number.isInteger(seed) || !Number.isInteger(days) || days < 0 || !['naive', 'planner', 'industrial'].includes(strategy))
    throw new Error('usage: --seed N --days N --strategy naive|planner|industrial [--log path] [--replay path]');
  return { seed, days, strategy, log: get('--log'), replay: get('--replay') };
}

function farm(state: GameState): number[] {
  const out: number[] = [];
  const infrastructure = new Set([7 * GRID_SIZE + 8, 7 * GRID_SIZE + 9]);
  for (let r = START_PLOT.r0; r <= START_PLOT.r1; r++) for (let c = START_PLOT.c0; c <= START_PLOT.c1; c++) {
    const idx = r * GRID_SIZE + c;
    if (state.tiles[idx]?.kind !== 'reservoir' && !infrastructure.has(idx)) out.push(idx);
  }
  return out;
}

function isInCrateRange(state: GameState, idx: number): boolean {
  const row = Math.floor(idx / GRID_SIZE);
  const col = idx % GRID_SIZE;
  return state.fieldCrates.some((crate) => {
    const crateRow = Math.floor(crate.idx / GRID_SIZE);
    const crateCol = crate.idx % GRID_SIZE;
    return Math.abs(row - crateRow) + Math.abs(col - crateCol) <= CRATE_CATCHMENT;
  });
}

function plan(state: GameState, strategy: Strategy): PlayerAction[] {
  const out: PlayerAction[] = [], tiles = farm(state), season = seasonForDay(state.day);
  const add = (x: PlayerAction) => out.push(x);
  if (strategy === 'planner') {
    for (const i of tiles) if (state.tiles[i].crop?.mature) add({ type: 'harvest', idx: i });
    for (const id of cropIds) if (state.inventory[id] > 0) add({ type: 'sell', crop: id, qty: state.inventory[id] });
  }
  for (const i of tiles) if (state.tiles[i].kind === 'grass') add({ type: 'till', idx: i });
  const crop: CropId = strategy === 'planner' ? cropIds.find(id => CROPS[id].seasons.includes(season)) ?? 'wheat' : 'wheat';
  const desired = Math.min(tiles.length, Math.max(1, state.seeds[crop] ?? 0));
  for (const i of tiles) if (out.length < MAX_ACTIONS_PER_DAY && (state.tiles[i].kind === 'grass' || state.tiles[i].kind === 'tilled') && !state.tiles[i].crop && desired > 0) add({ type: 'plant', idx: i, crop });
  for (const i of tiles) if (state.tiles[i].kind === 'tilled' || state.tiles[i].kind === 'grass') add({ type: 'water', idx: i });
  if (strategy === 'naive') for (const i of tiles) if (state.tiles[i].crop?.mature) add({ type: 'harvest', idx: i });
  for (const id of cropIds) if (state.inventory[id] > 0) add({ type: 'sell', crop: id, qty: state.inventory[id] });
  return out.slice(0, MAX_ACTIONS_PER_DAY);
}

// One live-state decision at a time keeps dependent actions (till -> plant) valid.
function nextPlannerAction(state: GameState): PlayerAction | undefined {
  const channelIdx = 7 * GRID_SIZE + 9;
  const sprinklerIdx = 7 * GRID_SIZE + 8;
  if (state.mill.output > 0) return { type: 'exportFlour', qty: state.mill.output };
  if (!state.mill.commissioned && state.gold >= GOLD_COST.mill)
    return { type: 'commissionMill' };
  const loadedCrate = state.fieldCrates.find((crate) => crate.wheat > 0);
  if (state.mill.commissioned && loadedCrate && state.mill.input < state.mill.inputCapacity)
    return { type: 'loadMillFromCrate', crateId: loadedCrate.id, qty: Math.min(loadedCrate.wheat, state.mill.inputCapacity - state.mill.input) };
  if (state.mill.commissioned && state.tiles[channelIdx].kind === 'grass' && state.gold >= GOLD_COST.channel)
    return { type: 'buildChannel', idx: channelIdx };
  if (state.tiles[channelIdx].kind === 'channel' && state.tiles[sprinklerIdx].kind === 'grass' && state.gold >= GOLD_COST.sprinkler)
    return { type: 'buildSprinkler', idx: sprinklerIdx };
  const crowdedCrate = state.fieldCrates.find((crate) => crate.wheat >= crate.capacity - 2);
  if (crowdedCrate && state.gold >= GOLD_COST.wheatStorage)
    return { type: 'upgradeFieldCrate', crateId: crowdedCrate.id };

  const field = farm(state).filter((idx) => isInCrateRange(state, idx)).slice(0, FIELD_SIZE);
  for (const idx of field) if (state.tiles[idx].crop?.mature) return { type: 'harvest', idx };

  const crop: CropId = 'wheat';
  const desired = FIELD_SIZE;
  const planted = field.filter(idx => state.tiles[idx].crop?.cropId === crop).length;
  const availableSeeds = state.seeds[crop] ?? 0;
  if (planted < desired && availableSeeds < desired - planted) {
    const qty = desired - planted - availableSeeds;
    const affordable = Math.floor(state.gold / CROPS[crop].seedCost);
    if (affordable > 0) return { type: 'buySeeds', crop, qty: Math.min(qty, affordable) };
  }
  for (const idx of field) if (state.tiles[idx].kind === 'grass' && !state.tiles[idx].crop)
    return { type: 'till', idx };
  for (const idx of field) if (state.tiles[idx].kind === 'tilled' && !state.tiles[idx].crop && (state.seeds[crop] ?? 0) > 0)
    return { type: 'plant', idx, crop };
  for (const idx of field) {
    const tile = state.tiles[idx];
    if (tile.crop && tile.moisture < 50 && state.reservoir >= MANUAL_WATER_DRAW)
      return { type: 'water', idx };
  }

  const rawCrate = state.fieldCrates.find((crate) => crate.wheat > 0);
  if (!state.mill.commissioned && rawCrate)
    return { type: 'exportWheatFromCrate', crateId: rawCrate.id, qty: rawCrate.wheat };
  return undefined;
}

function bestCropFor(state: GameState, idx: number): CropId {
  const season = seasonForDay(state.day);
  const soil = state.tiles[idx].soil;
  const legal = cropIds.filter((id) => CROPS[id].seasons.includes(season));
  const ranked = legal.sort((a, b) => {
    const aFit = CROPS[a].preferredSoils.includes(soil) ? 1 : CROPS[a].soilPenalty;
    const bFit = CROPS[b].preferredSoils.includes(soil) ? 1 : CROPS[b].soilPenalty;
    const aValue = CROPS[a].yieldUnits * CROPS[a].basePrice * aFit / CROPS[a].growDays;
    const bValue = CROPS[b].yieldUnits * CROPS[b].basePrice * bFit / CROPS[b].growDays;
    return bValue - aValue || a.localeCompare(b);
  });
  return ranked[idx % Math.min(3, ranked.length)] ?? 'wheat';
}

function nextIndustrialAction(state: GameState): PlayerAction | undefined {
  if (state.mill.output > 0) return { type: 'exportFlour', qty: state.mill.output };
  const mature = state.tiles.findIndex((tile) => tile.crop?.mature);
  if (mature >= 0) return { type: 'harvest', idx: mature };

  if (!state.parcels.west && state.gold >= PARCEL_COST.west) return { type: 'purchaseParcel', parcel: 'west' };
  if (state.parcels.west && !state.parcels.north && state.gold >= PARCEL_COST.north) return { type: 'purchaseParcel', parcel: 'north' };
  if (state.parcels.north && !state.parcels.south && state.gold >= PARCEL_COST.south) return { type: 'purchaseParcel', parcel: 'south' };

  const brush = state.tiles.findIndex((tile) => tile.kind === 'brush' && state.resources.wood < 60);
  if (brush >= 0) return { type: 'clearLand', idx: brush };
  const resourceTarget = { stone: 35, clay: 30, coal: 20, ironOre: 20 } as const;
  const deposit = state.tiles.findIndex((tile) => (tile.kind === 'rock' || tile.kind === 'marsh') && tile.deposit && tile.deposit.remaining > 0 && state.resources[tile.deposit.resource] < resourceTarget[tile.deposit.resource]);
  if (deposit >= 0) return { type: 'mine', idx: deposit };

  if (state.parcels.west && !state.parcels.north) {
    const surplus = ([['stone', 35], ['clay', 24], ['ironOre', 24]] as const).find(([id, reserve]) => state.resources[id] > reserve);
    if (surplus) return { type: 'sellResource', resource: surplus[0], qty: state.resources[surplus[0]] - surplus[1] };
  }

  for (const facility of ['kiln', 'kitchen', 'workshop'] as const) {
    if (state.facilities[facility].level === 0) {
      const result = applyAction(state, { type: 'upgradeFacility', facility });
      if (result.ok) return { type: 'upgradeFacility', facility };
    }
  }
  const craftOrder = [
    ...(state.items.machineParts < 8 ? ['machineParts'] as const : []),
    ...(state.resources.coal < 8 ? ['charcoal'] as const : []),
    ...(state.items.ironBars < 14 ? ['smeltIron'] as const : []),
    ...(state.items.bricks < 24 ? ['fireBricks'] as const : []),
    'bagRice', 'grindCorn', 'packVegetables', 'cookSauce',
    ...(state.items.fertilizer < 8 ? ['compost'] as const : []),
    ...(state.items.fuel < 8 ? ['makeFuel'] as const : []),
  ] as const;
  for (const recipe of craftOrder) {
    const result = applyAction(state, { type: 'craft', recipe, qty: 1 });
    if (result.ok) return { type: 'craft', recipe, qty: 1 };
  }
  for (const facility of ['kiln', 'kitchen', 'workshop'] as const) {
    if (state.facilities[facility].level > 0 && state.facilities[facility].level < 3) {
      const result = applyAction(state, { type: 'upgradeFacility', facility });
      if (result.ok) return { type: 'upgradeFacility', facility };
    }
  }

  if (state.facilities.workshop.level >= 2 && state.items.machineParts > 0 && state.items.bricks >= 4 && state.gold >= EXTRACTOR_BUILD_COST.gold) {
    const target = state.tiles.findIndex((tile) => (tile.kind === 'rock' || tile.kind === 'marsh') && tile.deposit && tile.deposit.remaining >= 4);
    if (target >= 0) return { type: 'buildExtractor', idx: target };
  }
  if (!state.upgrades.includes('tractor') && state.items.machineParts >= 3 && state.gold >= 500) return { type: 'buyUpgrade', upgrade: 'tractor' };
  if (!state.upgrades.includes('seeder') && state.items.machineParts >= 2 && state.gold >= 500) return { type: 'buyUpgrade', upgrade: 'seeder' };

  const sellableItem = (['riceBag', 'cornmeal', 'vegetableCrate', 'tomatoSauce'] as const).find((id) => state.items[id] > 0);
  if (sellableItem) return { type: 'sellItem', item: sellableItem, qty: state.items[sellableItem] };
  if (state.items.fertilizer > 8) return { type: 'sellItem', item: 'fertilizer', qty: state.items.fertilizer - 8 };
  if (state.items.fuel > 8) return { type: 'sellItem', item: 'fuel', qty: state.items.fuel - 8 };
  const rawSurplus = ([['stone', 24], ['clay', 18], ['ironOre', 14]] as const).find(([id, reserve]) => state.resources[id] > reserve);
  if (rawSurplus) return { type: 'sellResource', resource: rawSurplus[0], qty: state.resources[rawSurplus[0]] - rawSurplus[1] };
  for (const crop of cropIds) {
    const reserve = state.facilities.kitchen.level > 0 && state.gold >= 20 && crop !== 'wheat' ? 3 : 0;
    if (state.inventory[crop] > reserve) return { type: 'sell', crop, qty: state.inventory[crop] - reserve };
  }
  const wheatCrate = state.fieldCrates.find((crate) => crate.wheat > 0);
  if (!state.mill.commissioned && wheatCrate && state.gold >= GOLD_COST.mill) return { type: 'commissionMill' };
  if (state.mill.commissioned && wheatCrate && state.mill.input < state.mill.inputCapacity)
    return { type: 'loadMillFromCrate', crateId: wheatCrate.id, qty: Math.min(wheatCrate.wheat, state.mill.inputCapacity - state.mill.input) };

  const field = farm(state).filter((idx) => isInCrateRange(state, idx)).slice(0, 18);
  const areaGrass = field.find((idx) => state.tiles[idx].kind === 'grass');
  if (areaGrass !== undefined && state.upgrades.includes('tractor') && state.items.fuel > 0) return { type: 'tillArea', idx: areaGrass };
  for (const idx of field) if (state.tiles[idx].kind === 'grass') return { type: 'till', idx };
  const areaEmpty = field.find((idx) => state.tiles[idx].kind === 'tilled' && !state.tiles[idx].crop);
  if (areaEmpty !== undefined && state.upgrades.includes('seeder') && state.items.fuel > 0) {
    const crop = bestCropFor(state, areaEmpty);
    if ((state.seeds[crop] ?? 0) > 0) return { type: 'plantArea', idx: areaEmpty, crop };
  }
  for (const idx of field) {
    if (state.tiles[idx].kind !== 'tilled' || state.tiles[idx].crop) continue;
    const crop = bestCropFor(state, idx);
    if ((state.seeds[crop] ?? 0) < 1) {
      if (state.gold >= CROPS[crop].seedCost) return { type: 'buySeeds', crop, qty: 1 };
      continue;
    }
    return { type: 'plant', idx, crop };
  }
  for (const idx of field) {
    const tile = state.tiles[idx];
    if (tile.crop && tile.moisture < Math.max(45, CROPS[tile.crop.cropId].waterNeed) && state.reservoir >= MANUAL_WATER_DRAW)
      return { type: 'water', idx };
  }
  return undefined;
}

function nextAction(state: GameState, strategy: Strategy): PlayerAction | undefined {
  if (strategy === 'industrial') return nextIndustrialAction(state);
  if (strategy === 'planner') return nextPlannerAction(state);
  return plan(state, strategy)[0];
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value as Record<string, unknown>)
    .filter(([k]) => k !== 'lastTickMs' && k !== 'id').sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, canonical(v)]));
  return value;
}

function metrics(state: GameState, accepted: number, rejected: number, losses: number, maxRejectedPerDay: number, contractsCompleted: number) {
  return { finalDay: state.day, gold: Math.round(state.gold * 100) / 100, reservoir: Math.round(state.reservoir * 100) / 100,
    crop: Object.fromEntries(cropIds.map(id => [id, state.tiles.filter(t => t.crop?.cropId === id).length])), inventory: state.inventory,
    accepted, rejected, losses, contractsCompleted,
    production: state.production, mill: state.mill, crates: state.fieldCrates, routes: state.haulRoutes,
    resources: state.resources, items: state.items, facilities: state.facilities, extractors: state.extractors,
    reputation: state.reputation, unlocks: state.unlocks, upgrades: state.upgrades, parcels: state.parcels, maxRejectedPerDay };
}

function runReplay(path: string, seed: number) {
  let state = newGame(seed), accepted = 0, rejected = 0, losses = 0, contractsCompleted = 0, maxRejectedPerDay = 0, rejectedToday = 0;
  let expected: unknown;
  for (const raw of readFileSync(path, 'utf8').split('\n').filter(Boolean)) {
    const line = JSON.parse(raw) as Line & { kind: string; state?: unknown };
    if (line.kind === 'final') { expected = line.state; continue; }
    if (line.kind === 'action') { const r = applyAction(state, line.action); state = r.ok ? r.state : state; if (r.ok) { accepted++; if (line.action.type === 'deliverContract') contractsCompleted++; } else { rejected++; rejectedToday++; } }
    else { maxRejectedPerDay = Math.max(maxRejectedPerDay, rejectedToday); rejectedToday = 0; const r = endDay(state); state = r.state; losses += r.recap.events.filter(e => e.kind === 'cropDied' || e.kind === 'stormLoss' || e.kind === 'frostLoss').length; }
  }
  const actual = canonical(state);
  return { state, metrics: metrics(state, accepted, rejected, losses, maxRejectedPerDay, contractsCompleted), replayMatch: expected === undefined || JSON.stringify(actual) === JSON.stringify(expected) };
}

function main() {
  const opt = args();
  if (opt.replay) { const result = runReplay(opt.replay, opt.seed); console.log(JSON.stringify({ ...result.metrics, replay: true, replayMatch: result.replayMatch })); if (!result.replayMatch) process.exitCode = 1; return; }
  let state = newGame(opt.seed), accepted = 0, rejected = 0, losses = 0, contractsCompleted = 0, maxRejectedPerDay = 0;
  if (opt.log) writeFileSync(opt.log, '');
  const record = (line: Line) => { if (opt.log) appendFileSync(opt.log, JSON.stringify(line) + '\n'); };
  for (let d = 0; d < opt.days; d++) {
    let rejectedToday = 0;
    for (let attempts = 0; attempts < MAX_ACTIONS_PER_DAY; attempts++) {
      const action = nextAction(state, opt.strategy); if (!action) break;
      const r = applyAction(state, action); record({ kind: 'action', action, ok: r.ok, ...(r.error ? { error: r.error } : {}) });
      if (r.ok) { state = r.state; accepted++; if (action.type === 'deliverContract') contractsCompleted++; } else { rejected++; rejectedToday++; break; }
    }
    maxRejectedPerDay = Math.max(maxRejectedPerDay, rejectedToday);
    const r = endDay(state); state = r.state; losses += r.recap.events.filter(e => e.kind === 'cropDied' || e.kind === 'stormLoss' || e.kind === 'frostLoss').length; record({ kind: 'endDay', day: state.day });
  }
  const result = metrics(state, accepted, rejected, losses, maxRejectedPerDay, contractsCompleted);
  if (opt.log) appendFileSync(opt.log, JSON.stringify({ kind: 'final', state: canonical(state) }) + '\n');
  console.log(JSON.stringify(result));
}

main();
