// ============================================================================
// Farm Sim — Save storage. Device-local only (no Firebase). See PLAN §11.
// Slot 0 is the autosave; slots 1–3 are manual saves.
// ============================================================================

import { FarmSaveRepository, GameState, SaveSlotInfo } from './types';
import { GRID_SIZE } from './balance';

const EXPECTED_TILE_COUNT = GRID_SIZE * GRID_SIZE;

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
      const state = JSON.parse(raw) as GameState;
      if (state.version !== 1) return null;
      // Grid was expanded from 12×12 to 20×20 — discard stale saves.
      if (!Array.isArray(state.tiles) || state.tiles.length !== EXPECTED_TILE_COUNT) return null;
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
