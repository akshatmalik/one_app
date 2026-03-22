// =====================================================================
// LOOT ENGINE
// =====================================================================
//
// Handles all randomised reward generation after stage clears.
// Data comes entirely from registry.ts — no hardcoded strings here.
//
// Usage:
//   import { rollStageLoot } from './loot-engine';
//   const loot = rollStageLoot(2); // { items: CardInstance[], materials: RawMaterials }
//
// =====================================================================

import type { CardInstance, RawMaterials, StageLoot } from './types';
import {
  LOOT_POOLS,
  STAGE_MATERIAL_DROPS,
  RESOURCE_DEFS,
  type LootPoolEntry,
  type ResourceKey,
} from './registry';
import { makeLootInstance } from './card-factory';

// ── Helpers ────────────────────────────────────────────────────────────

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Weighted random pick from a pool.
 * Items with higher weight are proportionally more likely.
 */
function weightedPick(pool: LootPoolEntry[]): LootPoolEntry {
  const totalWeight = pool.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const entry of pool) {
    roll -= entry.weight;
    if (roll <= 0) return entry;
  }
  return pool[pool.length - 1]; // fallback (rounding)
}

// ── Stage loot counts ──────────────────────────────────────────────────

const STAGE_ITEM_COUNTS: Record<number, { min: number; max: number }> = {
  1: { min: 1, max: 2 },
  2: { min: 1, max: 2 },
  3: { min: 2, max: 3 },
};

// ── Public API ──────────────────────────────────────────────────────────

/**
 * Roll loot for a given stage victory.
 *
 * - Items are weighted-random sampled without duplicates within the roll
 * - Materials are rolled per resource using STAGE_MATERIAL_DROPS ranges
 */
export function rollStageLoot(stage: 1 | 2 | 3): StageLoot {
  const poolKey = `stage_${stage}` as keyof typeof LOOT_POOLS;
  const pool = LOOT_POOLS[poolKey];
  const countRange = STAGE_ITEM_COUNTS[stage] ?? { min: 1, max: 2 };
  const count = randInt(countRange.min, countRange.max);

  // Pick items without repeating the same cardId in this loot roll
  const chosenIds = new Set<string>();
  const items: CardInstance[] = [];
  let attempts = 0;

  while (chosenIds.size < count && attempts < 30) {
    attempts++;
    const entry = weightedPick(pool);
    if (!chosenIds.has(entry.cardId)) {
      chosenIds.add(entry.cardId);
      const card = makeLootInstance(entry.cardId);
      if (card) items.push(card);
    }
  }

  // Roll materials
  const drops = STAGE_MATERIAL_DROPS[stage] ?? {};
  const materials: RawMaterials = {
    scrapMetal: 0,
    wood: 0,
    cloth: 0,
    medicalSupplies: 0,
    food: 0,
  };

  for (const key of Object.keys(RESOURCE_DEFS) as ResourceKey[]) {
    const range = drops[key];
    if (range) {
      (materials as unknown as Record<string, number>)[key] = randInt(range.min, range.max);
    }
  }

  return { items, materials };
}

/**
 * Merge two RawMaterials objects (additive).
 */
export function addMaterials(a: RawMaterials, b: RawMaterials): RawMaterials {
  const result = { ...a };
  for (const key of Object.keys(b) as (keyof RawMaterials)[]) {
    result[key] = (result[key] ?? 0) + (b[key] ?? 0);
  }
  return result;
}

export const EMPTY_MATERIALS: RawMaterials = {
  scrapMetal: 0,
  wood: 0,
  cloth: 0,
  medicalSupplies: 0,
  food: 0,
};
