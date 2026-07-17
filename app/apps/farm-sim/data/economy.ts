import { CropId, FacilityId, ItemId, RecipeId, ResourceId } from '../lib/types';

export type Ingredient =
  | { kind: 'crop'; id: CropId; qty: number }
  | { kind: 'resource'; id: ResourceId; qty: number }
  | { kind: 'item'; id: ItemId; qty: number };

export interface RecipeDef {
  id: RecipeId;
  name: string;
  facility: FacilityId;
  level: number;
  inputs: Ingredient[];
  output: { kind: 'item'; id: ItemId; qty: number } | { kind: 'resource'; id: ResourceId; qty: number };
  description: string;
}

export const FACILITY_NAMES: Record<FacilityId, string> = {
  kiln: 'Kiln',
  kitchen: 'Farm Kitchen',
  workshop: 'Workshop',
};

export const FACILITY_CAPACITY: Record<number, number> = { 0: 0, 1: 3, 2: 7, 3: 14 };

export const FACILITY_UPGRADES: Record<FacilityId, Array<{ gold: number; resources: Partial<Record<ResourceId, number>>; items?: Partial<Record<ItemId, number>> }>> = {
  kiln: [
    { gold: 25, resources: { stone: 8, clay: 6 } },
    { gold: 80, resources: { stone: 12 }, items: { bricks: 8 } },
    { gold: 180, resources: { stone: 20 }, items: { bricks: 12, ironBars: 4 } },
  ],
  kitchen: [
    { gold: 30, resources: { wood: 10, stone: 4 } },
    { gold: 90, resources: { wood: 12 }, items: { bricks: 6 } },
    { gold: 220, resources: { wood: 16 }, items: { bricks: 8, machineParts: 2 } },
  ],
  workshop: [
    { gold: 40, resources: { wood: 12, stone: 8 } },
    { gold: 110, resources: { wood: 16 }, items: { bricks: 8, ironBars: 4 } },
    { gold: 280, resources: { wood: 20 }, items: { bricks: 12, machineParts: 5 } },
  ],
};

export const RECIPES: Record<RecipeId, RecipeDef> = {
  compost: { id: 'compost', name: 'Compost', facility: 'kitchen', level: 1, inputs: [{ kind: 'crop', id: 'beans', qty: 1 }, { kind: 'resource', id: 'wood', qty: 1 }], output: { kind: 'item', id: 'fertilizer', qty: 2 }, description: 'Rebuilds depleted ground into rich loam.' },
  charcoal: { id: 'charcoal', name: 'Charcoal', facility: 'kiln', level: 1, inputs: [{ kind: 'resource', id: 'wood', qty: 3 }], output: { kind: 'resource', id: 'coal', qty: 2 }, description: 'A renewable smelting fuel when ridge coal runs short.' },
  fireBricks: { id: 'fireBricks', name: 'Fire bricks', facility: 'kiln', level: 1, inputs: [{ kind: 'resource', id: 'clay', qty: 2 }, { kind: 'resource', id: 'wood', qty: 1 }], output: { kind: 'item', id: 'bricks', qty: 2 }, description: 'Wood-fired construction material made from mined clay.' },
  smeltIron: { id: 'smeltIron', name: 'Iron bars', facility: 'kiln', level: 2, inputs: [{ kind: 'resource', id: 'ironOre', qty: 2 }, { kind: 'resource', id: 'coal', qty: 1 }], output: { kind: 'item', id: 'ironBars', qty: 1 }, description: 'Metal for advanced machinery.' },
  bagRice: { id: 'bagRice', name: 'Polished rice', facility: 'kitchen', level: 1, inputs: [{ kind: 'crop', id: 'rice', qty: 2 }], output: { kind: 'item', id: 'riceBag', qty: 1 }, description: 'A water-hungry crop becomes a premium staple.' },
  grindCorn: { id: 'grindCorn', name: 'Cornmeal', facility: 'kitchen', level: 1, inputs: [{ kind: 'crop', id: 'corn', qty: 2 }], output: { kind: 'item', id: 'cornmeal', qty: 1 }, description: 'Reliable processed food and fuel input.' },
  packVegetables: { id: 'packVegetables', name: 'Vegetable crate', facility: 'kitchen', level: 1, inputs: [{ kind: 'crop', id: 'potato', qty: 1 }, { kind: 'crop', id: 'beans', qty: 1 }, { kind: 'crop', id: 'carrot', qty: 1 }], output: { kind: 'item', id: 'vegetableCrate', qty: 1 }, description: 'Crop diversity earns a strong margin.' },
  cookSauce: { id: 'cookSauce', name: 'Tomato sauce', facility: 'kitchen', level: 2, inputs: [{ kind: 'crop', id: 'tomato', qty: 3 }], output: { kind: 'item', id: 'tomatoSauce', qty: 2 }, description: 'Preserves a valuable summer harvest.' },
  makeFuel: { id: 'makeFuel', name: 'Biofuel', facility: 'workshop', level: 1, inputs: [{ kind: 'item', id: 'cornmeal', qty: 1 }, { kind: 'resource', id: 'wood', qty: 1 }], output: { kind: 'item', id: 'fuel', qty: 2 }, description: 'Keeps field machines and extractors moving.' },
  machineParts: { id: 'machineParts', name: 'Machine parts', facility: 'workshop', level: 2, inputs: [{ kind: 'item', id: 'ironBars', qty: 2 }, { kind: 'resource', id: 'wood', qty: 2 }], output: { kind: 'item', id: 'machineParts', qty: 1 }, description: 'Required for automation and high-tier upgrades.' },
};

export const ITEM_SELL_VALUES: Record<ItemId, number> = {
  fertilizer: 15, flour: 22, bread: 35, milk: 45, egg: 15, fuel: 9,
  riceBag: 34, cornmeal: 24, vegetableCrate: 42, tomatoSauce: 38,
  bricks: 12, ironBars: 28, machineParts: 80,
};

export const RESOURCE_SELL_VALUES: Record<ResourceId, number> = {
  wood: 2, stone: 3, clay: 4, coal: 6, ironOre: 9,
};

export const RECIPE_IDS = Object.keys(RECIPES) as RecipeId[];
