// ============================================================================
// Farm Sim — Shared engine utilities. Pure.
// ============================================================================

import { GameState } from '../types';

export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

// Clone the mutable parts of game state so pure functions never alias input.
export function cloneState(state: GameState): GameState {
  return {
    ...state,
    tiles: state.tiles.map((t) => ({ ...t, crop: t.crop ? { ...t.crop } : null })),
    inventory: { ...state.inventory },
    seeds: { ...state.seeds },
    market: Object.fromEntries(
      Object.entries(state.market).map(([k, v]) => [k, { ...v, history: [...v.history] }])
    ) as GameState['market'],
    weatherTruth: [...state.weatherTruth],
    forecast: [...state.forecast],
    upgrades: [...state.upgrades],
  };
}
