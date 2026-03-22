// =====================================================================
// CARD FACTORY
// =====================================================================
//
// Creates live CardInstance objects from static CARD_CATALOG definitions.
// All runtime state (currentHealth, ammo, exhausted, etc.) is initialized here.
//
// Usage:
//   import { makeCardInstance } from './card-factory';
//   const myCard = makeCardInstance(CARD_IDS.RIFLE);
//   const customCard = makeCardInstance(CARD_IDS.MED_KIT, { exhausted: true });
//
// =====================================================================

import type { CardInstance } from './types';
import { CARD_BY_ID } from './registry';

/**
 * Create a new CardInstance from a static card definition.
 * Initializes all runtime fields to sensible defaults.
 *
 * @param cardId   - Must be a valid key in CARD_CATALOG
 * @param overrides - Optional partial overrides (e.g. for loot with custom ammo)
 * @param uniqueSuffix - Appended to the ID so duplicates coexist in the deck
 */
export function makeCardInstance(
  cardId: string,
  overrides: Partial<CardInstance> = {},
  uniqueSuffix?: string,
): CardInstance | null {
  const template = CARD_BY_ID.get(cardId);
  if (!template) {
    console.warn(`[card-factory] Unknown card id: "${cardId}"`);
    return null;
  }

  const suffix = uniqueSuffix ?? `${Date.now()}_${Math.floor(Math.random() * 9999)}`;
  const id = `inst_${cardId}_${suffix}`;

  const instance: CardInstance = {
    ...template,
    id,
    currentHealth: template.maxHealth ?? 100,
    status: 'healthy',
    exhausted: false,
    recoveryTime: 0,
    ammo: template.maxAmmo,
    ...overrides,
  };

  return instance;
}

/**
 * Create a starter CardInstance — uses the card's own ID directly (no suffix),
 * so save data can reference cards by predictable IDs.
 */
export function makeStarterInstance(cardId: string): CardInstance | null {
  const template = CARD_BY_ID.get(cardId);
  if (!template) {
    console.warn(`[card-factory] Unknown starter card id: "${cardId}"`);
    return null;
  }

  const instance: CardInstance = {
    ...template,
    currentHealth: template.maxHealth ?? 100,
    status: 'healthy',
    exhausted: false,
    recoveryTime: 0,
    ammo: template.maxAmmo,
  };

  return instance;
}

/**
 * Create a loot CardInstance — random suffix ensures uniqueness in the deck.
 */
export function makeLootInstance(cardId: string): CardInstance | null {
  return makeCardInstance(cardId, {}, `loot_${Date.now()}_${Math.floor(Math.random() * 9999)}`);
}
