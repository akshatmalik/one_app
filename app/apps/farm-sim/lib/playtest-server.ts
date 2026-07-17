import { CROPS, CROP_IDS } from '../data/crops';
import { GRID_SIZE, IRRIGATION_TARGET, RESERVOIR_CAP, SPRINKLER_WATER_DRAW, WELL_DAILY_YIELD } from './balance';
import { applyAction, validActions } from './engine/actions';
import { newGame } from './engine/newGame';
import { endDay } from './engine/resolveDay';
import { dayOfSeason, seasonForDay } from './engine/weather';
import { computeIrrigation, connectedChannels, orthoNeighbors } from './engine/water';
import { DayRecap, GameState, PlayerAction, TileKind } from './types';
import { productionProjection, waterProjection } from './engine/engineering';
import { PARCELS, parcelIndices } from './engine/parcels';
import { PARCEL_COST } from './balance';
import { FACILITY_CAPACITY, RECIPES, RECIPE_IDS } from '../data/economy';

export interface PlaytestLogEntry {
  revision: number;
  day: number;
  kind: 'action' | 'endDay' | 'reset';
  action?: PlayerAction;
  ok: boolean;
  error?: string;
  recap?: DayRecap;
  delta?: { gold: number; reservoir: number; wheat: number; flour: number };
}

export interface PlaytestSession {
  id: string;
  state: GameState;
  revision: number;
  log: PlaytestLogEntry[];
  rejectedActions: number;
  daysResolved: number;
}

const globalStore = globalThis as typeof globalThis & {
  __farmPlaytestSessions?: Map<string, PlaytestSession>;
};
const sessions = globalStore.__farmPlaytestSessions ?? new Map<string, PlaytestSession>();
globalStore.__farmPlaytestSessions = sessions;

function safeSessionId(value: string | null): string {
  const id = (value || 'default').trim();
  return /^[a-zA-Z0-9_-]{1,48}$/.test(id) ? id : 'default';
}

export function getSession(idValue: string | null, seed = 42): PlaytestSession {
  const id = safeSessionId(idValue);
  let session = sessions.get(id);
  if (session && (!Array.isArray(session.state.fieldCrates) || !session.state.parcels || !session.state.resources || !session.state.facilities)) {
    sessions.delete(id);
    session = undefined;
  }
  if (!session) {
    session = { id, state: newGame(seed), revision: 0, log: [], rejectedActions: 0, daysResolved: 0 };
    sessions.set(id, session);
  }
  return session;
}

export function resetSession(idValue: string | null, seed = 42): PlaytestSession {
  const id = safeSessionId(idValue);
  const session: PlaytestSession = {
    id,
    state: newGame(seed),
    revision: 1,
    log: [{ revision: 1, day: 1, kind: 'reset', ok: true }],
    rejectedActions: 0,
    daysResolved: 0,
  };
  sessions.set(id, session);
  return session;
}

function delta(before: GameState, after: GameState) {
  const wheat = (state: GameState) => state.inventory.wheat + state.fieldCrates.reduce((sum, crate) => sum + crate.wheat, 0);
  return {
    gold: Math.round((after.gold - before.gold) * 10) / 10,
    reservoir: after.reservoir - before.reservoir,
    wheat: wheat(after) - wheat(before),
    flour: after.mill.output - before.mill.output,
  };
}

export function dispatchSessionAction(session: PlaytestSession, action: PlayerAction): PlaytestLogEntry {
  const before = session.state;
  let result;
  try {
    result = applyAction(before, action);
  } catch (error) {
    result = { ok: false, state: before, error: error instanceof Error ? error.message : 'Invalid action.' };
  }
  session.revision += 1;
  if (result.ok) session.state = result.state;
  else session.rejectedActions += 1;
  const entry: PlaytestLogEntry = {
    revision: session.revision,
    day: before.day,
    kind: 'action',
    action,
    ok: result.ok,
    ...(result.error ? { error: result.error } : {}),
    delta: delta(before, result.state),
  };
  session.log.push(entry);
  return entry;
}

export function resolveSessionDay(session: PlaytestSession): PlaytestLogEntry {
  const before = session.state;
  const resolved = endDay(before);
  session.state = resolved.state;
  session.revision += 1;
  session.daysResolved += 1;
  const entry: PlaytestLogEntry = {
    revision: session.revision,
    day: before.day,
    kind: 'endDay',
    ok: true,
    recap: resolved.recap,
    delta: delta(before, resolved.state),
  };
  session.log.push(entry);
  return entry;
}

const MAP_CHAR: Record<TileKind, string> = {
  grass: '.', tilled: '=', channel: '~', reservoir: 'R', well: 'W', sprinkler: '*',
  barn: 'B', coop: 'C', shed: 'S', mill: 'M', depot: 'D', crate: 'K', path: ':',
  brush: 'b', rock: 'o', marsh: '%', locked: '#',
  extractor: 'X',
};

function worldMap(state: GameState): string[] {
  return Array.from({ length: GRID_SIZE }, (_, row) =>
    Array.from({ length: GRID_SIZE }, (_, col) => {
      const tile = state.tiles[row * GRID_SIZE + col];
      if (tile.crop) return tile.crop.mature ? 'H' : tile.crop.cropId === 'wheat' ? 'w' : 'c';
      return MAP_CHAR[tile.kind];
    }).join('')
  );
}

function countKinds(state: GameState): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const tile of state.tiles) counts[tile.kind] = (counts[tile.kind] ?? 0) + 1;
  return counts;
}

function bottlenecks(state: GameState): string[] {
  const out: string[] = [];
  const production = productionProjection(state);
  const storageUse = production.fillPercent;
  if (storageUse >= 0.8) out.push(`Wheat storage is ${Math.round(storageUse * 100)}% full.`);
  if (!state.mill.commissioned) out.push('Mill foundation is not restored.');
  else if (state.mill.output >= state.mill.outputCapacity) out.push('Mill output is full; export flour.');
  else if (state.mill.output > 0 && state.mill.input === 0) out.push(`${state.mill.output} flour is ready for export; the mill also needs wheat.`);
  else if (state.mill.input === 0) out.push('Mill is idle; load wheat.');
  else if (storageUse >= 0.5 && state.mill.input >= state.mill.ratePerDay)
    out.push('Mill throughput is below harvest inflow; storage is absorbing the queue.');
  if (state.reservoir < RESERVOIR_CAP * 0.2) out.push('Reservoir is below 20% capacity.');
  const dryCrops = state.tiles.filter((tile) => tile.crop && tile.moisture < CROPS[tile.crop.cropId].waterNeed).length;
  if (dryCrops > 0) out.push(`${dryCrops} crop tiles are below their water requirement.`);
  return out;
}

export function sessionStatus(session: PlaytestSession, includeState = false) {
  const { state } = session;
  const suppliedChannels = connectedChannels(state.tiles);
  const irrigatedTiles = computeIrrigation(state.tiles);
  const channels = state.tiles.reduce<number[]>((out, tile, idx) => tile.kind === 'channel' ? [...out, idx] : out, []);
  const sprinklers = state.tiles.reduce<Array<{ idx: number; supplied: boolean; coveredCropTiles: number }>>((out, tile, idx) => {
    if (tile.kind !== 'sprinkler') return out;
    const supplied = orthoNeighbors(idx).some((neighbor) => suppliedChannels.has(neighbor));
    const coveredCropTiles = state.tiles.filter((candidate, candidateIdx) => {
      if (!candidate.crop) return false;
      const rowDelta = Math.abs(Math.floor(candidateIdx / GRID_SIZE) - Math.floor(idx / GRID_SIZE));
      const colDelta = Math.abs(candidateIdx % GRID_SIZE - idx % GRID_SIZE);
      return rowDelta <= 1 && colDelta <= 1;
    }).length;
    out.push({ idx, supplied, coveredCropTiles });
    return out;
  }, []);
  const crops = Object.fromEntries(CROP_IDS.map((crop) => [crop, {
    planted: state.tiles.filter((tile) => tile.crop?.cropId === crop).length,
    mature: state.tiles.filter((tile) => tile.crop?.cropId === crop && tile.crop.mature).length,
    stored: crop === 'wheat' ? state.inventory.wheat + state.fieldCrates.reduce((sum, crate) => sum + crate.wheat, 0) : state.inventory[crop],
    seeds: state.seeds[crop],
  }]));
  const channelDemand = state.tiles.reduce((sum, tile, idx) =>
    sum + (irrigatedTiles[idx] ? Math.max(0, IRRIGATION_TARGET - tile.moisture) : 0), 0);
  const sprinklerDemand = sprinklers.filter((sprinkler) => sprinkler.supplied).length * SPRINKLER_WATER_DRAW;
  const actionableTiles = state.tiles.reduce<Array<{ idx: number; row: number; col: number; actions: string[] }>>((out, _tile, idx) => {
    const actions = validActions(state, idx);
    if (actions.length > 0) out.push({ idx, row: Math.floor(idx / GRID_SIZE), col: idx % GRID_SIZE, actions });
    return out;
  }, []);
  const engineeringWater = waterProjection(state);
  const engineeringProduction = productionProjection(state);
  const parcels = Object.values(PARCELS).map((parcel) => ({
    id: parcel.id,
    name: parcel.name,
    owned: state.parcels[parcel.id],
    cost: PARCEL_COST[parcel.id],
    requires: parcel.requires,
    clearable: parcelIndices(parcel).filter((idx) => ['brush', 'rock', 'marsh'].includes(state.tiles[idx].kind)).length,
  }));

  return {
    session: session.id,
    revision: session.revision,
    telemetry: {
      actionsAttempted: session.log.filter((entry) => entry.kind === 'action').length,
      rejectedActions: session.rejectedActions,
      daysResolved: session.daysResolved,
      recent: session.log.slice(-12),
    },
    clock: {
      day: state.day,
      season: seasonForDay(state.day),
      dayOfSeason: dayOfSeason(state.day) + 1,
      weather: state.weatherTruth[dayOfSeason(state.day)],
      forecast: state.forecast,
    },
    economy: { gold: state.gold, resources: state.resources, items: state.items },
    water: {
      reservoir: state.reservoir,
      capacity: RESERVOIR_CAP,
      wells: state.wells,
      channels: channels.length,
      suppliedChannels: suppliedChannels.size,
      disconnectedChannels: channels.length - suppliedChannels.size,
      sprinklers,
      projectedDawnDemand: channelDemand + sprinklerDemand,
      projectedWellYield: state.wells * WELL_DAILY_YIELD,
      projectedNetDraw: Math.max(0, channelDemand + sprinklerDemand - state.wells * WELL_DAILY_YIELD),
      engineering: engineeringWater,
    },
    field: {
      kinds: countKinds(state),
      tilled: state.tiles.filter((tile) => tile.kind === 'tilled').length,
      wet: state.tiles.filter((tile) => tile.kind === 'tilled' && tile.moisture >= 60).length,
      irrigated: state.tiles.filter((tile) => tile.kind === 'tilled' && tile.irrigated).length,
      mature: state.tiles.filter((tile) => tile.crop?.mature).length,
    },
    crops,
    storage: { ...engineeringProduction, crates: state.fieldCrates, routes: state.haulRoutes },
    mill: state.mill,
    parcels,
    production: state.production,
    crafting: {
      facilities: state.facilities,
      recipes: RECIPE_IDS.map((id) => ({ ...RECIPES[id], available: state.facilities[RECIPES[id].facility].level >= RECIPES[id].level })),
      dailyCapacity: Object.fromEntries(Object.entries(state.facilities).map(([id, facility]) => [id, FACILITY_CAPACITY[facility.level] - facility.usedToday])),
    },
    mining: {
      resources: state.resources,
      extractors: state.extractors,
      deposits: state.tiles.reduce<Array<{ idx: number; kind: TileKind; resource: string; remaining: number }>>((out, tile, idx) => {
        if (tile.deposit) out.push({ idx, kind: tile.kind, resource: tile.deposit.resource, remaining: tile.deposit.remaining });
        return out;
      }, []),
    },
    bottlenecks: bottlenecks(state),
    mapLegend: '. grass, = tilled, w wheat, c other crop, H harvest-ready, ~ channel, * sprinkler, R reservoir, S shed, M mill, K crate, D depot, X extractor, : path, b brush, o rock, % marsh, # locked',
    map: worldMap(state),
    actionableTiles,
    ...(includeState ? { state } : {}),
  };
}

export const actionCatalog = {
  tile: ['till', 'plant', 'water', 'harvest', 'buildChannel', 'buildSprinkler', 'demolish', 'digWell', 'clearLand', 'mine', 'buildExtractor', 'upgradeExtractor', 'amendSoil', 'fertilize', 'buildFieldCrate', 'tillArea', 'plantArea'],
  land: ['purchaseParcel'],
  production: ['commissionMill', 'upgradeMill', 'loadMill', 'loadMillFromCrate', 'exportFlour', 'exportWheatFromCrate', 'upgradeFieldCrate', 'buildHaulRoute', 'upgradeHaulRoute'],
  economy: ['buySeeds', 'sell', 'sellItem', 'sellResource', 'buyUpgrade'],
  crafting: ['upgradeFacility', 'craft'],
  examples: [
    { type: 'till', idx: 168 },
    { type: 'plant', idx: 168, crop: 'wheat' },
    { type: 'buildChannel', idx: 149 },
    { type: 'buildSprinkler', idx: 148 },
    { type: 'loadMill', qty: 3 },
  ],
};
