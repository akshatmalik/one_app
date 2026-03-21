import { Card, CardInstance, RawMaterials, StageLoot } from './types';
import { STARTER_CARDS } from './cards';

// ── Loot pools per stage difficulty ──────────────────────────────────────────

// Stage 1 — Common drops (meds, food, basic supplies)
const STAGE_1_POOL: string[] = [
  'card_antibiotics_001',
  'card_food_001',
  'card_gasoline_001',
];

// Stage 2 — Mid drops (gear, protection, medical)
const STAGE_2_POOL: string[] = [
  'card_flak_001',
  'card_medkit_001',
  'card_antibiotics_001',
  'card_food_001',
];

// Stage 3 — Rare drops (weapons, optics)
const STAGE_3_POOL: string[] = [
  'card_rifle_001',
  'card_shotgun_001',
  'card_goggles_001',
  'card_medkit_001',
];

// Raw material drops per stage
const STAGE_MATERIALS: Record<number, { min: RawMaterials; max: RawMaterials }> = {
  1: {
    min: { scrapMetal: 0, wood: 0, cloth: 1, medicalSupplies: 1 },
    max: { scrapMetal: 1, wood: 1, cloth: 2, medicalSupplies: 2 },
  },
  2: {
    min: { scrapMetal: 1, wood: 1, cloth: 0, medicalSupplies: 1 },
    max: { scrapMetal: 3, wood: 2, cloth: 1, medicalSupplies: 2 },
  },
  3: {
    min: { scrapMetal: 2, wood: 1, cloth: 1, medicalSupplies: 2 },
    max: { scrapMetal: 4, wood: 3, cloth: 2, medicalSupplies: 3 },
  },
};

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Create a loot CardInstance from a card ID template.
 * Generates a unique ID so duplicates can coexist.
 */
function makeLootCard(cardId: string): CardInstance | null {
  const template = STARTER_CARDS.find(c => c.id === cardId);
  if (!template) return null;

  return {
    ...template,
    id: `loot_${cardId}_${Date.now()}_${Math.floor(Math.random() * 9999)}`,
    currentHealth: template.maxHealth ?? 100,
    status: 'healthy',
    exhausted: false,
    recoveryTime: 0,
    ammo: template.maxAmmo,
  };
}

/**
 * Roll loot for a given stage victory.
 * Returns item cards to add to the player's collection + raw materials.
 */
export function rollStageLoot(stage: 1 | 2 | 3): StageLoot {
  const pool = stage === 1 ? STAGE_1_POOL : stage === 2 ? STAGE_2_POOL : STAGE_3_POOL;
  const matRange = STAGE_MATERIALS[stage];

  // Roll 1-2 items for stage 1, 1-2 for stage 2, 2-3 for stage 3
  const count = stage === 3 ? randInt(2, 3) : randInt(1, 2);

  // Pick items without repeating within this loot roll
  const chosen = new Set<string>();
  const items: CardInstance[] = [];
  let attempts = 0;
  while (chosen.size < count && attempts < 20) {
    attempts++;
    const id = pick(pool);
    if (!chosen.has(id)) {
      chosen.add(id);
      const card = makeLootCard(id);
      if (card) items.push(card);
    }
  }

  const materials: RawMaterials = {
    scrapMetal: randInt(matRange.min.scrapMetal, matRange.max.scrapMetal),
    wood: randInt(matRange.min.wood, matRange.max.wood),
    cloth: randInt(matRange.min.cloth, matRange.max.cloth),
    medicalSupplies: randInt(matRange.min.medicalSupplies, matRange.max.medicalSupplies),
  };

  return { items, materials };
}

/**
 * Add two RawMaterial counts together.
 */
export function addMaterials(a: RawMaterials, b: RawMaterials): RawMaterials {
  return {
    scrapMetal: a.scrapMetal + b.scrapMetal,
    wood: a.wood + b.wood,
    cloth: a.cloth + b.cloth,
    medicalSupplies: a.medicalSupplies + b.medicalSupplies,
  };
}

export const EMPTY_MATERIALS: RawMaterials = {
  scrapMetal: 0,
  wood: 0,
  cloth: 0,
  medicalSupplies: 0,
};
