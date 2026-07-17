import { IRRIGATION_TARGET, SPRINKLER_WATER_DRAW, WELL_DAILY_YIELD } from '../balance';
import { GameState } from '../types';
import { computeIrrigation, connectedChannels, orthoNeighbors } from './water';

export function waterProjection(state: GameState) {
  const connected = connectedChannels(state.tiles);
  const irrigated = computeIrrigation(state.tiles);
  const channelDemand = state.tiles.reduce((sum, tile, idx) =>
    sum + (irrigated[idx] ? Math.max(0, IRRIGATION_TARGET - tile.moisture) : 0), 0);
  const suppliedSprinklers = state.tiles.reduce((sum, tile, idx) =>
    sum + (tile.kind === 'sprinkler' && orthoNeighbors(idx).some((neighbor) => connected.has(neighbor)) ? 1 : 0), 0);
  const sprinklerDemand = suppliedSprinklers * SPRINKLER_WATER_DRAW;
  const demand = channelDemand + sprinklerDemand;
  const supply = state.wells * WELL_DAILY_YIELD;
  return {
    demand,
    supply,
    netDraw: Math.max(0, demand - supply),
    connectedChannels: connected.size,
    suppliedSprinklers,
    irrigatedTiles: irrigated.filter(Boolean).length,
    sustainable: state.reservoir + supply >= demand,
  };
}

export function productionProjection(state: GameState) {
  const crateWheat = state.fieldCrates.reduce((sum, crate) => sum + crate.wheat, 0);
  const capacity = state.fieldCrates.reduce((sum, crate) => sum + crate.capacity, 0);
  const freeStorage = Math.max(0, capacity - crateWheat);
  const recent = state.production.recentHarvests;
  const averageHarvest = recent.length ? recent.reduce((sum, value) => sum + value, 0) / recent.length : 0;
  const routeRate = state.haulRoutes.reduce((sum, route) => sum + route.ratePerDay, 0);
  const effectiveFeed = routeRate > 0 ? Math.min(routeRate, state.mill.ratePerDay) : 0;
  return {
    crateWheat,
    looseWheat: state.inventory.wheat,
    capacity,
    freeStorage,
    fillPercent: capacity > 0 ? crateWheat / capacity : 0,
    averageHarvest,
    daysToFull: averageHarvest > 0 ? freeStorage / averageHarvest : null,
    routeRate,
    millRate: state.mill.ratePerDay,
    effectiveFeed,
    queuedWheat: crateWheat + state.mill.input,
    daysToClear: state.mill.commissioned && state.mill.ratePerDay > 0
      ? (crateWheat + state.mill.input) / Math.min(state.mill.ratePerDay, routeRate || state.mill.ratePerDay)
      : null,
  };
}
