// ============================================================================
// Farm Sim — Save storage. Device-local only (no Firebase). See PLAN §11.
// Slot 0 is the autosave; slots 1–3 are manual saves.
// ============================================================================

import { CropId, FarmContract, FarmSaveRepository, GameState, SaveSlotInfo, TileKind } from './types';
import { FARM_LANDMARKS, GRID_SIZE, MILL_INPUT_CAPACITY, MILL_OUTPUT_CAPACITY, MILL_RATE_PER_DAY, WHEAT_STORAGE_START } from './balance';
import { createContractOffers, unlocksForReputation } from './engine/contracts';
import { initialParcels } from './engine/parcels';
import { FORCED_SLEEP_MINUTES, WAKE_MINUTES } from './realtime/clock';
import { buildForecast, normalizeSeasonWeather } from './engine/weather';
import { CROP_IDS } from '../data/crops';
import { initMarket } from './engine/market';
import { depositFor } from './engine/parcels';

const EXPECTED_TILE_COUNT = GRID_SIZE * GRID_SIZE;
const EMPTY_ITEMS: GameState['items'] = {
  fertilizer: 0,
  flour: 0,
  bread: 0,
  milk: 0,
  egg: 0,
  fuel: 0,
  riceBag: 0,
  cornmeal: 0,
  vegetableCrate: 0,
  tomatoSauce: 0,
  bricks: 0,
  ironBars: 0,
  machineParts: 0,
};
const EMPTY_RESOURCES: GameState['resources'] = { wood: 0, stone: 0, clay: 0, coal: 0, ironOre: 0 };

function ensureLandmark(state: GameState, kind: Extract<TileKind, 'shed' | 'market' | 'mill' | 'depot' | 'crate'>, preferred: number): void {
  if (state.tiles.some((tile) => tile.kind === kind)) return;
  const candidates = [preferred, preferred - 1, preferred + 1, preferred - GRID_SIZE, preferred + GRID_SIZE];
  const idx = candidates.find((candidate) => state.tiles[candidate]?.kind === 'grass');
  if (idx !== undefined) state.tiles[idx] = { ...state.tiles[idx], kind };
}

function validContracts(value: unknown): value is FarmContract[] {
  return Array.isArray(value) && value.every((contract) => {
    if (!contract || typeof contract !== 'object') return false;
    const item = contract as Partial<FarmContract>;
    return (
      typeof item.id === 'string' &&
      typeof item.crop === 'string' &&
      CROP_IDS.includes(item.crop as CropId) &&
      Number.isInteger(item.quantity) &&
      (item.quantity ?? 0) > 0 &&
      typeof item.rewardGold === 'number' &&
      typeof item.rewardReputation === 'number' &&
      typeof item.expiresDay === 'number' &&
      (item.status === 'available' || item.status === 'completed')
    );
  });
}

const KEY = (slot: number) => `farm-sim-save-${slot}`;
const META_KEY = (slot: number) => `farm-sim-meta-${slot}`;
export const AUTOSAVE_SLOT = 0;
export const MANUAL_SLOTS = [1, 2, 3];
export const ALL_SLOTS = [0, 1, 2, 3];

interface SlotMeta {
  day: number;
  gold: number;
  savedAt: string;
}

export class LocalStorageFarmRepository implements FarmSaveRepository {
  load(slot: number): GameState | null {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(KEY(slot));
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Partial<GameState>;
      const reputation = parsed.reputation ?? 0;
      const emptyCrops = Object.fromEntries(CROP_IDS.map((id) => [id, 0])) as Record<CropId, number>;
      const baseMarket = initMarket();
      const state = {
        ...parsed,
        time: Math.min(FORCED_SLEEP_MINUTES, Math.max(WAKE_MINUTES, parsed.time ?? WAKE_MINUTES)),
        lastTickMs: parsed.lastTickMs ?? Date.now(),
        items: { ...EMPTY_ITEMS, ...(parsed.items ?? {}) },
        inventory: { ...emptyCrops, ...(parsed.inventory ?? {}) },
        seeds: { ...emptyCrops, ...(parsed.seeds ?? {}) },
        resources: { ...EMPTY_RESOURCES, ...(parsed.resources ?? {}) },
        facilities: {
          kiln: { level: 0, usedToday: 0, ...(parsed.facilities?.kiln ?? {}) },
          kitchen: { level: 0, usedToday: 0, ...(parsed.facilities?.kitchen ?? {}) },
          workshop: { level: 0, usedToday: 0, ...(parsed.facilities?.workshop ?? {}) },
        },
        extractors: parsed.extractors ?? [],
        market: Object.fromEntries(CROP_IDS.map((id) => [id, { ...baseMarket[id], ...(parsed.market?.[id] ?? {}) }])) as GameState['market'],
        mill: {
          commissioned: false,
          level: parsed.mill?.commissioned ? 1 : 0,
          input: 0,
          output: 0,
          inputCapacity: MILL_INPUT_CAPACITY,
          outputCapacity: MILL_OUTPUT_CAPACITY,
          ratePerDay: MILL_RATE_PER_DAY,
          ...(parsed.mill ?? {}),
        },
        fieldCrates: parsed.fieldCrates ?? [],
        haulRoutes: parsed.haulRoutes ?? [],
        // Legacy farms keep their already-open world; new games use parcel ownership.
        parcels: parsed.parcels ?? initialParcels(true),
        production: {
          wheatStorageCapacity: WHEAT_STORAGE_START,
          harvestedWheat: 0,
          rawWheatExported: 0,
          wheatMilled: 0,
          flourExported: 0,
          automatedWaterings: 0,
          harvestedToday: 0,
          recentHarvests: [],
          milestones: [],
          ...(parsed.production ?? {}),
        },
        machines: parsed.machines ?? [],
        animals: parsed.animals ?? [],
        reputation,
        unlocks: Array.from(new Set([...unlocksForReputation(reputation), 'irrigation'])),
        contracts: validContracts(parsed.contracts)
          ? parsed.contracts
          : createContractOffers(parsed.seed ?? 1, parsed.day ?? 1, reputation, 3),
      } as GameState;
      if (state.version !== 1) return null;
      // Grid expansions invalidate positional saves from earlier world layouts.
      if (!Array.isArray(state.tiles) || state.tiles.length !== EXPECTED_TILE_COUNT) return null;
      state.tiles = state.tiles.map((tile, idx) => ({
        ...tile,
        crop: tile.crop ? { ...tile.crop } : null,
        soil: tile.soil ?? 'loam',
        deposit: tile.deposit ? { ...tile.deposit } : depositFor(idx, state.seed, tile.kind),
      }));
      const normalizedWeather = normalizeSeasonWeather(state.seed, state.day, state.weatherTruth ?? []);
      if (!Array.isArray(state.forecast) || state.forecast.length !== 3 || normalizedWeather.some((weather, index) => weather !== state.weatherTruth?.[index])) {
        state.weatherTruth = normalizedWeather;
        state.forecast = buildForecast(state.seed, state.day, state.weatherTruth);
      }
      ensureLandmark(state, 'shed', FARM_LANDMARKS.shed.r * GRID_SIZE + FARM_LANDMARKS.shed.c);
      ensureLandmark(state, 'market', FARM_LANDMARKS.market.r * GRID_SIZE + FARM_LANDMARKS.market.c);
      if (state.mill.commissioned) ensureLandmark(state, 'mill', FARM_LANDMARKS.mill.r * GRID_SIZE + FARM_LANDMARKS.mill.c);
      state.production.wheatStorageCapacity = state.fieldCrates.reduce((sum, crate) => sum + crate.capacity, 0);
      return state;
    } catch {
      return null;
    }
  }

  save(slot: number, state: GameState): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(KEY(slot), JSON.stringify(state));
      const meta: SlotMeta = {
        day: state.day,
        gold: state.gold,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(META_KEY(slot), JSON.stringify(meta));
    } catch {
      // out of quota or unavailable — ignore, game continues in memory
    }
  }

  listSlots(): SaveSlotInfo[] {
    if (typeof window === 'undefined') return [];
    return ALL_SLOTS.map((slot) => {
      try {
        const raw = localStorage.getItem(META_KEY(slot));
        if (!raw) return null;
        const meta = JSON.parse(raw) as SlotMeta;
        return { slot, day: meta.day, gold: meta.gold, savedAt: meta.savedAt };
      } catch {
        return null;
      }
    }).filter((x): x is SaveSlotInfo => x !== null);
  }

  delete(slot: number): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(KEY(slot));
    localStorage.removeItem(META_KEY(slot));
  }
}

export const farmRepo = new LocalStorageFarmRepository();
