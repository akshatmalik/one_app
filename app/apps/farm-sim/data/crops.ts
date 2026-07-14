// ============================================================================
// Farm Sim — Crop definitions & season price modifiers.
// See docs/FARM_SIM_PLAN.md §3 and §6. All numbers are one-line edits here.
// ============================================================================

import { CropDef, CropId } from '../lib/types';

export const CROPS: Record<CropId, CropDef> = {
  wheat: {
    id: 'wheat',
    name: 'Wheat',
    emoji: '🌾',
    seasons: ['Spring', 'Summer', 'Fall'],
    growDays: 4,
    waterNeed: 10,
    nitrogenUse: 5,
    seedCost: 5,
    yieldUnits: 3,
    basePrice: 5,
    frostHardy: false,
    seasonMod: { Spring: 1.0, Summer: 1.0, Fall: 1.0 },
  },
  potato: {
    id: 'potato',
    name: 'Potato',
    emoji: '🥔',
    seasons: ['Spring', 'Fall'],
    growDays: 5,
    waterNeed: 15,
    nitrogenUse: 8,
    seedCost: 8,
    yieldUnits: 4,
    basePrice: 6,
    frostHardy: true,
    seasonMod: { Spring: 0.9, Summer: 1.15, Fall: 0.9 },
  },
  beans: {
    id: 'beans',
    name: 'Beans',
    emoji: '🫘',
    seasons: ['Spring', 'Summer'],
    growDays: 5,
    waterNeed: 15,
    nitrogenUse: -4, // restores its own tile; neighbor bonus handled separately
    seedCost: 10,
    yieldUnits: 4,
    basePrice: 5,
    frostHardy: false,
    seasonMod: { Spring: 0.9, Summer: 0.9, Fall: 1.2 },
  },
  tomato: {
    id: 'tomato',
    name: 'Tomato',
    emoji: '🍅',
    seasons: ['Summer'],
    growDays: 7,
    waterNeed: 25,
    nitrogenUse: 10,
    seedCost: 15,
    yieldUnits: 6,
    basePrice: 10,
    frostHardy: false,
    heatLover: true,
    seasonMod: { Spring: 1.1, Summer: 0.9, Fall: 1.25 },
  },
  berries: {
    id: 'berries',
    name: 'Berries',
    emoji: '🫐',
    seasons: ['Spring', 'Summer'],
    growDays: 6,
    waterNeed: 15,
    nitrogenUse: 4,
    seedCost: 25,
    yieldUnits: 3, // per pick
    basePrice: 8,
    frostHardy: false,
    regrowDays: 3,
    seasonMod: { Spring: 0.9, Summer: 0.9, Fall: 1.3 },
  },
  pumpkin: {
    id: 'pumpkin',
    name: 'Pumpkin',
    emoji: '🎃',
    seasons: ['Fall'],
    growDays: 9,
    waterNeed: 20,
    nitrogenUse: 12,
    seedCost: 20,
    yieldUnits: 1,
    basePrice: 85,
    frostHardy: false,
    seasonMod: { Spring: 1.3, Summer: 1.2, Fall: 0.9 },
  },
};

export const CROP_IDS: CropId[] = ['wheat', 'potato', 'beans', 'tomato', 'berries', 'pumpkin'];
