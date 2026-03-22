// =====================================================================
// loot.ts — COMPATIBILITY SHIM
// =====================================================================
//
// Loot logic now lives in loot-engine.ts.
// Loot tables now live in registry.ts (LOOT_POOLS, STAGE_MATERIAL_DROPS).
// This file re-exports them so existing imports keep working.
//
// DO NOT add loot data here — edit registry.ts instead.
// See GAME_ENGINE.md for instructions.
//
// =====================================================================

export {
  rollStageLoot,
  addMaterials,
  EMPTY_MATERIALS,
} from './loot-engine';
