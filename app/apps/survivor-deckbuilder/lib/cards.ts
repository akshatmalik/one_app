// =====================================================================
// cards.ts — COMPATIBILITY SHIM
// =====================================================================
//
// All card definitions now live in registry.ts (CARD_CATALOG).
// This file re-exports them so existing imports keep working.
//
// DO NOT add card data here — add to registry.ts instead.
// See GAME_ENGINE.md for instructions.
//
// =====================================================================

export { CARD_CATALOG as STARTER_CARDS, CARD_IDS, CARD_BY_ID } from './registry';
