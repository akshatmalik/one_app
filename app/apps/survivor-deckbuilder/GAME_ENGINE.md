# Survivor Deckbuilder — Game Engine Guide

> **TL;DR** — All static game content lives in `lib/registry.ts`.
> Add a card, resource, recipe, or seed there and it propagates everywhere automatically.

---

## Architecture

```
lib/
  registry.ts       ← Single source of truth for all static content
  card-factory.ts   ← Creates live CardInstance objects from registry definitions
  loot-engine.ts    ← Weighted random loot rolls using registry tables
  types.ts          ← TypeScript interfaces (extend here when adding new fields)
  cards.ts          ← Compatibility shim — re-exports CARD_CATALOG as STARTER_CARDS
  loot.ts           ← Compatibility shim — re-exports loot-engine functions
  storage.ts        ← Persistence layer (localStorage)
  combat-engine.ts  ← Combat resolution logic
  encounters.ts     ← Random encounter definitions
  synergies.ts      ← Card synergy rules

hooks/
  useGame.ts        ← Core game state management; calls registry + factories

components/
  GameCard.tsx      ← Card UI — imports CATEGORY_DEFS, ROLE_DEFS from registry
  CompoundView.tsx  ← Home base view — imports CRAFT_RECIPES, RESOURCE_DEFS from registry
```

### Data flow

```
registry.ts (static data)
     │
     ├── card-factory.ts  →  CardInstance  →  useGame.ts  →  React state  →  UI
     └── loot-engine.ts   →  StageLoot    →  useGame.ts
```

---

## How to Add a New Card

### 1. Add an ID constant (`registry.ts` → `CARD_IDS`)

```ts
export const CARD_IDS = {
  // ... existing ids
  MY_NEW_CARD: 'card_mynewcard_001',   // ← add here
} as const;
```

### 2. Add the Card definition (`registry.ts` → `CARD_CATALOG`)

```ts
export const CARD_CATALOG: Card[] = [
  // ... existing cards
  {
    id: CARD_IDS.MY_NEW_CARD,
    type: 'item',           // 'item' | 'action' | 'survivor'
    category: 'weapon',     // see CardCategory in types.ts
    name: 'My New Card',
    description: 'What it does',
    status: HEALTHY,
    exhausted: false,
    recoveryTime: 1,
    itemType: 'equipment',  // 'equipment' | 'consumable' | 'action'
    bonusAttributes: { combat: 25 },
    maxAmmo: 4,             // only for weapons
    foodValue: 2,           // only for food cards
  },
];
```

That's it. The card is now:
- Visible in `CARD_BY_ID` for O(1) lookup
- Available to `makeCardInstance()` / `makeLootInstance()`
- Typeable via `CardId`

### 3. (Optional) Add to loot pools

```ts
// In LOOT_POOLS, add to the appropriate stage:
stage_2: [
  // ... existing entries
  { cardId: CARD_IDS.MY_NEW_CARD, weight: 2 },
],
```

Weight is relative — `weight: 3` is 3× more likely than `weight: 1`.

### 4. (Optional) Add to starter deck

```ts
export const STARTER_DECK_IDS: CardId[] = [
  // ... existing ids
  CARD_IDS.MY_NEW_CARD,
];
```

---

## How to Add a New Resource

Resources are currencies tracked on `HomeBaseState.rawMaterials`.

### 1. Add to `RESOURCE_DEFS` (`registry.ts`)

```ts
export const RESOURCE_DEFS = {
  // ... existing resources
  fuel: {
    icon: '⛽',
    label: 'Fuel',
    color: 'text-yellow-400',
    borderColor: 'border-yellow-800/50',
    description: 'Powers generators and vehicles.',
  },
} as const;
```

### 2. Add to `RawMaterials` interface (`types.ts`)

```ts
export interface RawMaterials {
  scrapMetal: number;
  wood: number;
  cloth: number;
  medicalSupplies: number;
  food?: number;
  fuel?: number;    // ← add as optional
}
```

### 3. Initialize to 0 in `storage.ts` → `getDefaultState()`

```ts
rawMaterials: {
  scrapMetal: 0, wood: 0, cloth: 0, medicalSupplies: 0, food: 10,
  fuel: 0,   // ← add here
},
```

### 4. Add migration in `useGame.ts` → `loadGame`

```ts
if (state.homeBase.rawMaterials.fuel === undefined) {
  state.homeBase.rawMaterials.fuel = 0;
}
```

The new resource now shows automatically in `CompoundView` and any UI that iterates `RESOURCE_DEFS`.

---

## How to Add a New Card Category

Card categories control the visual tinge (gradient, accent color, icon).

### 1. Add to `CardCategory` type (`types.ts`)

```ts
export type CardCategory =
  | 'survivor' | 'weapon' | 'gear' | 'medical' | 'food'
  | 'action' | 'upgrade' | 'building' | 'seed'
  | 'trap';   // ← add here
```

### 2. Add to `CATEGORY_DEFS` (`registry.ts`)

```ts
export const CATEGORY_DEFS: Record<CardCategory, ...> = {
  // ... existing categories
  trap: {
    label: 'Traps',
    icon: '⚠',
    gradient: 'from-rose-950 to-stone-950',
    accent: 'border-rose-800',
    color: 'text-rose-400',
  },
};
```

`GameCard.tsx` and `CompoundView.tsx` both read from `CATEGORY_DEFS`, so the new category gets correct visual treatment automatically.

---

## How to Add a New Survivor Role

### 1. Add to `SurvivorRole` type (`types.ts`)

```ts
export type SurvivorRole = 'healer' | 'fighter' | 'scout' | 'mechanic' | 'scientist' | 'engineer';
```

### 2. Add to `ROLE_DEFS` (`registry.ts`)

```ts
export const ROLE_DEFS: Record<SurvivorRole, ...> = {
  // ... existing roles
  engineer: {
    icon: '🔧',
    gradient: 'from-cyan-900 to-cyan-950',
    accent: 'border-cyan-500',
    color: 'text-cyan-400',
  },
};
```

`GameCard.tsx` reads `ROLE_DEFS` for gradient and accent color.

---

## How to Add a Crafting Recipe

Recipes appear in the Workshop section of The Compound.

```ts
// In CRAFT_RECIPES (registry.ts):
export const CRAFT_RECIPES: RecipeDef[] = [
  // ... existing recipes
  {
    id: 'recipe_mynewitem',
    name: 'My New Item',
    outputCardId: CARD_IDS.MY_NEW_CARD,   // must be a valid CardId
    cost: { scrapMetal: 2, cloth: 1 },     // keys must be ResourceKey
    daysRequired: 2,
    requiresMechanic: false,               // optional: mechanic crafts faster
    description: 'What you get',
  },
];
```

The recipe shows in `CompoundView` automatically. Material icons and availability checks are driven by `RESOURCE_DEFS`.

---

## How to Add a New Seed / Garden Output

### 1. Add the seed card (follow "Add a New Card" above)

```ts
GRAIN_SEEDS: 'card_grainseeds_001',
```

### 2. Add its garden output (`registry.ts` → `GARDEN_OUTPUTS`)

```ts
export const GARDEN_OUTPUTS = {
  // ... existing entries
  [CARD_IDS.GRAIN_SEEDS]: {
    outputCardIds: [CARD_IDS.CANNED_FOOD, CARD_IDS.CANNED_FOOD, CARD_IDS.CANNED_FOOD],
    daysRequired: 5,
    description: '3× Canned Food in 5 days',
  },
};
```

`useGame.ts → startGarden` reads `GARDEN_OUTPUTS` so the new seed is automatically handled — no code change needed.

---

## How to Add a New Survivor Assignment

### 1. Add to `SurvivorAssignment` type (`types.ts`)

```ts
export type SurvivorAssignment =
  | 'guard' | 'garden' | 'workshop' | 'infirmary' | 'scavenge' | 'rest'
  | 'sentry';   // ← add here
```

### 2. Add to `ASSIGNMENT_DEFS` (`registry.ts`)

```ts
export const ASSIGNMENT_DEFS = {
  // ... existing
  sentry: {
    label: 'Sentry',
    icon: '👁',
    color: 'text-indigo-600',
    borderColor: 'border-indigo-900/60',
    description: 'Spot incoming raids early, reducing damage',
    earlyWarningChance: 0.6,
  },
} as const;
```

### 3. Handle the assignment in `useGame.ts → endDay`

The daily cycle is explicit logic in `endDay()`. Add a block for your new assignment's mechanics:

```ts
// After existing assignment handling:
const sentries = updatedDeck.filter(c => c.type === 'survivor' && c.assignment === 'sentry');
if (sentries.length > 0 && raidHappens) {
  // Early warning reduces raid damage
  newBaseHP = Math.max(0, newBaseHP + 10); // example: partially mitigate
}
```

---

## Key Types Reference

| Type | Location | Purpose |
|------|----------|---------|
| `Card` | `types.ts` | Static definition (template) |
| `CardInstance` | `types.ts` | Live in-game card with HP, ammo, exhausted state |
| `CardId` | `registry.ts` | Union of all valid card ID strings |
| `ResourceKey` | `registry.ts` | Union of all resource keys |
| `CardCategory` | `types.ts` | Visual category (weapon, gear, etc.) |
| `SurvivorRole` | `types.ts` | Survivor specialisation |
| `SurvivorAssignment` | `types.ts` | Home base duty |
| `RecipeDef` | `registry.ts` | Workshop crafting recipe |
| `LootPoolEntry` | `registry.ts` | Weighted entry in a loot pool |
| `ProductionChain` | `types.ts` | Active garden/workshop chain |

---

## Factory Functions

### `makeCardInstance(cardId, overrides?, uniqueSuffix?)`
Creates a new `CardInstance` from the registry. Use when you need a one-off card with custom state.

### `makeStarterInstance(cardId)`
Creates a `CardInstance` keeping the original card ID (no suffix). Use when building the starting deck so save data is stable.

### `makeLootInstance(cardId)`
Creates a `CardInstance` with a random suffix so multiple copies can coexist in the deck. Use for all loot drops.

---

## Loot Engine

### `rollStageLoot(stage: 1 | 2 | 3): StageLoot`
Rolls `1-2` (stage 1/2) or `2-3` (stage 3) items from the weighted pool, plus raw materials.
- Picks without repeating the same card ID within a single roll
- Material ranges come from `STAGE_MATERIAL_DROPS` in registry

### `addMaterials(a, b): RawMaterials`
Merges two material objects additively.

---

## Checklist: Adding new content

- [ ] New card → `CARD_IDS` + `CARD_CATALOG` + (optionally) `LOOT_POOLS` + `STARTER_DECK_IDS`
- [ ] New resource → `RESOURCE_DEFS` + `RawMaterials` interface + `getDefaultState()` init + migration
- [ ] New category → `CardCategory` type + `CATEGORY_DEFS`
- [ ] New role → `SurvivorRole` type + `ROLE_DEFS`
- [ ] New recipe → `CRAFT_RECIPES`
- [ ] New seed → Add card + `GARDEN_OUTPUTS` entry
- [ ] New assignment → `SurvivorAssignment` type + `ASSIGNMENT_DEFS` + handler in `endDay()`
