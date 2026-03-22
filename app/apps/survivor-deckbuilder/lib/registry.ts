// =====================================================================
// SURVIVOR DECKBUILDER — GAME REGISTRY
// =====================================================================
//
// This is the SINGLE SOURCE OF TRUTH for all static game content.
//
// HOW TO ADD NEW CONTENT:
//   New card:     Add to CARD_CATALOG + CARD_IDS constant
//   New resource: Add to RESOURCE_DEFS
//   New recipe:   Add to CRAFT_RECIPES
//   New loot:     Add card to LOOT_POOLS with a weight
//   New garden:   Add seed output to GARDEN_OUTPUTS
//   New assignment: Add to ASSIGNMENT_DEFS
//
// See GAME_ENGINE.md for a step-by-step guide.
//
// =====================================================================

import type { Card, CardCategory, SurvivorRole, CardStatus, EnemyType, StageCondition, DailyEvent, MomentumCard } from './types';

// ── RESOURCES ─────────────────────────────────────────────────────────
//
// To add a new resource type:
//   1. Add an entry here
//   2. Add it to the RawMaterials interface in types.ts as optional
//   3. Initialize it to 0 in storage.ts defaultState

export const RESOURCE_DEFS = {
  food: {
    icon: '◆',
    label: 'Food',
    color: 'text-amber-500',
    borderColor: 'border-amber-800/50',
    description: 'Consumed 1 per survivor per day. Critical resource.',
  },
  scrapMetal: {
    icon: '⚙',
    label: 'Scrap',
    color: 'text-stone-400',
    borderColor: 'border-stone-600/50',
    description: 'Metal scraps for crafting weapons and structures.',
  },
  wood: {
    icon: '▤',
    label: 'Wood',
    color: 'text-amber-700',
    borderColor: 'border-amber-900/50',
    description: 'Building material for barricades and repairs.',
  },
  cloth: {
    icon: '◫',
    label: 'Cloth',
    color: 'text-blue-400',
    borderColor: 'border-blue-800/50',
    description: 'Fabric for bandages, armor, and insulation.',
  },
  medicalSupplies: {
    icon: '✚',
    label: 'Meds',
    color: 'text-emerald-400',
    borderColor: 'border-emerald-800/50',
    description: 'Medical supplies for crafting treatments.',
  },
} as const;

export type ResourceKey = keyof typeof RESOURCE_DEFS;

// ── CARD CATEGORIES ───────────────────────────────────────────────────
//
// Visual tinge applied to every card by category.
// To add a new category: add entry here + update CardCategory type in types.ts

export const CATEGORY_DEFS: Record<CardCategory, {
  label: string;
  icon: string;
  gradient: string;
  accent: string;
  color: string;
}> = {
  survivor:  { label: 'Survivors',  icon: '◉', gradient: 'from-stone-900 to-stone-950',    accent: 'border-stone-600',   color: 'text-stone-400'   },
  weapon:    { label: 'Weapons',    icon: '⚔', gradient: 'from-red-950 to-stone-950',      accent: 'border-red-800',     color: 'text-red-500'     },
  gear:      { label: 'Gear',       icon: '🛡', gradient: 'from-slate-900 to-stone-950',    accent: 'border-blue-800',    color: 'text-blue-400'    },
  medical:   { label: 'Medical',    icon: '✚', gradient: 'from-emerald-950 to-stone-950',  accent: 'border-emerald-800', color: 'text-emerald-400' },
  food:      { label: 'Food',       icon: '◆', gradient: 'from-amber-950 to-stone-950',    accent: 'border-amber-800',   color: 'text-amber-400'   },
  action:    { label: 'Actions',    icon: '⚡', gradient: 'from-purple-950 to-stone-950',  accent: 'border-purple-800',  color: 'text-purple-400'  },
  upgrade:   { label: 'Upgrades',   icon: '▲', gradient: 'from-teal-950 to-stone-950',     accent: 'border-teal-800',    color: 'text-teal-400'    },
  building:  { label: 'Buildings',  icon: '⬡', gradient: 'from-orange-950 to-stone-950',   accent: 'border-orange-800',  color: 'text-orange-400'  },
  seed:      { label: 'Seeds',      icon: '🌱', gradient: 'from-lime-950 to-stone-950',     accent: 'border-lime-800',    color: 'text-lime-400'    },
};

// ── SURVIVOR ROLES ─────────────────────────────────────────────────────
//
// To add a new role: add entry here + update SurvivorRole type in types.ts

export const ROLE_DEFS: Record<SurvivorRole, {
  icon: string;
  gradient: string;
  accent: string;
  color: string;
}> = {
  healer:    { icon: '✚', gradient: 'from-emerald-900 to-emerald-950', accent: 'border-emerald-500', color: 'text-emerald-400' },
  fighter:   { icon: '⚔', gradient: 'from-red-900 to-red-950',         accent: 'border-red-500',     color: 'text-red-400'     },
  scout:     { icon: '◎', gradient: 'from-sky-900 to-sky-950',         accent: 'border-sky-500',     color: 'text-sky-400'     },
  mechanic:  { icon: '⚙', gradient: 'from-amber-900 to-amber-950',     accent: 'border-amber-500',   color: 'text-amber-400'   },
  scientist: { icon: '⚗', gradient: 'from-violet-900 to-violet-950',   accent: 'border-violet-500',  color: 'text-violet-400'  },
};

// ── CARD IDS ───────────────────────────────────────────────────────────
//
// Type-safe card ID constants.
// Always use these instead of raw strings to avoid typos and broken references.
// Rename a card? Change it ONCE here — all references update automatically.

export const CARD_IDS = {
  // Survivors
  SARAH:              'card_sarah_001',
  MARCUS:             'card_marcus_001',
  ELENA:              'card_elena_001',
  JAMES:              'card_james_001',
  LISA:               'card_lisa_001',
  // Weapons
  RIFLE:              'card_rifle_001',
  SHOTGUN:            'card_shotgun_001',
  // Gear
  FLAK_VEST:          'card_flak_001',
  GOGGLES:            'card_goggles_001',
  // Medical
  MED_KIT:            'card_medkit_001',
  ANTIBIOTICS:        'card_antibiotics_001',
  // Food
  CANNED_FOOD:        'card_food_001',
  FIELD_RATION:       'card_ration_001',
  // Actions
  GASOLINE:           'card_gasoline_001',
  SCOUT_AHEAD:        'card_scout_001',
  BARRICADE_ACTION:   'card_barricade_001',
  MEDICAL_PROTOCOLS:  'card_medical_001',
  TACTICAL_RETREAT:   'card_retreat_001',
  // Seeds
  VEG_SEEDS:          'card_vegseeds_001',
  HERB_SEEDS:         'card_herbseeds_001',
} as const;

export type CardId = typeof CARD_IDS[keyof typeof CARD_IDS];

// ── CARD CATALOG ───────────────────────────────────────────────────────
//
// The master list of every card in the game.
// To add a new card:
//   1. Add an entry to CARD_IDS above
//   2. Add a Card definition here (type-checked)
//   3. The card is now available everywhere — loot, crafting, synergies

const HEALTHY: CardStatus = 'healthy';

export const CARD_CATALOG: Card[] = [
  // ── SURVIVORS ───────────────────────────────────────────────────────
  {
    id: CARD_IDS.SARAH,
    type: 'survivor',
    category: 'survivor',
    name: 'Sarah Chen',
    description: 'A compassionate healer who supports the group',
    role: 'healer',
    status: HEALTHY,
    exhausted: false,
    recoveryTime: 0,
    maxHealth: 100,
    attributes: { combat: 0, defense: 10, healing: 40, speed: 0, perception: 20 },
    special: {
      name: 'Empathy',
      description: 'Adjacent cards get +10% defense',
      trigger: 'passive',
      effect: () => {},
    },
  },
  {
    id: CARD_IDS.MARCUS,
    type: 'survivor',
    category: 'survivor',
    name: 'Marcus Reeves',
    description: 'A hardened fighter with combat expertise',
    role: 'fighter',
    status: HEALTHY,
    exhausted: false,
    recoveryTime: 0,
    maxHealth: 100,
    attributes: { combat: 30, defense: 0, healing: -20, speed: 10, perception: 50 },
    special: {
      name: 'Veteran',
      description: 'If played twice in one turn, +50% damage on second play',
      trigger: 'on_play',
      effect: () => {},
    },
  },
  {
    id: CARD_IDS.ELENA,
    type: 'survivor',
    category: 'survivor',
    name: 'Elena Torres',
    description: 'A resourceful mechanic who improvises solutions',
    role: 'mechanic',
    status: HEALTHY,
    exhausted: false,
    recoveryTime: 0,
    maxHealth: 100,
    attributes: { combat: 10, defense: 10, healing: 0, speed: 20, perception: 0 },
    special: {
      name: 'Jury Rig',
      description: 'Can activate exhausted item cards once per run',
      trigger: 'passive',
      effect: () => {},
    },
  },
  {
    id: CARD_IDS.JAMES,
    type: 'survivor',
    category: 'survivor',
    name: 'James Wu',
    description: 'A quick and perceptive scout',
    role: 'scout',
    status: HEALTHY,
    exhausted: false,
    recoveryTime: 0,
    maxHealth: 100,
    attributes: { combat: 5, defense: 5, healing: 0, speed: 50, perception: 40 },
    special: {
      name: 'Quick Reflexes',
      description: '+30% to dodge ambushes',
      trigger: 'passive',
      effect: () => {},
    },
  },
  {
    id: CARD_IDS.LISA,
    type: 'survivor',
    category: 'survivor',
    name: 'Dr. Lisa Park',
    description: 'A brilliant scientist with knowledge of the outbreak',
    role: 'scientist',
    status: HEALTHY,
    exhausted: false,
    recoveryTime: 0,
    maxHealth: 100,
    attributes: { combat: -10, defense: 20, healing: 60, speed: 0, perception: 30 },
    special: {
      name: 'Medical Knowledge',
      description: 'Healing effects are +20% more effective',
      trigger: 'passive',
      effect: () => {},
    },
  },

  // ── WEAPONS ─────────────────────────────────────────────────────────
  {
    id: CARD_IDS.RIFLE,
    type: 'item',
    category: 'weapon',
    name: 'Rifle',
    description: 'A reliable firearm for taking down zombies',
    status: HEALTHY,
    exhausted: false,
    recoveryTime: 1,
    itemType: 'equipment',
    maxAmmo: 6,
    bonusAttributes: { combat: 40 },
  },
  {
    id: CARD_IDS.SHOTGUN,
    type: 'item',
    category: 'weapon',
    name: 'Shotgun',
    description: 'Powerful but less accurate close-range weapon',
    status: HEALTHY,
    exhausted: false,
    recoveryTime: 1,
    itemType: 'equipment',
    maxAmmo: 4,
    bonusAttributes: { combat: 60 },
  },

  // ── GEAR ────────────────────────────────────────────────────────────
  {
    id: CARD_IDS.FLAK_VEST,
    type: 'item',
    category: 'gear',
    name: 'Flak Vest',
    description: 'Protective armor that reduces damage',
    status: HEALTHY,
    exhausted: false,
    recoveryTime: 1,
    itemType: 'equipment',
    bonusAttributes: { defense: 30 },
  },
  {
    id: CARD_IDS.GOGGLES,
    type: 'item',
    category: 'gear',
    name: 'Night Vision Goggles',
    description: 'See in darkness and spot enemies early',
    status: HEALTHY,
    exhausted: false,
    recoveryTime: 1,
    itemType: 'equipment',
    bonusAttributes: { perception: 50, speed: -10 },
  },

  // ── MEDICAL ─────────────────────────────────────────────────────────
  {
    id: CARD_IDS.MED_KIT,
    type: 'item',
    category: 'medical',
    name: 'Medical Kit',
    description: 'Supplies for treating wounds and illnesses',
    status: HEALTHY,
    exhausted: false,
    recoveryTime: 1,
    itemType: 'equipment',
    bonusAttributes: { healing: 50 },
  },
  {
    id: CARD_IDS.ANTIBIOTICS,
    type: 'item',
    category: 'medical',
    name: 'Antibiotics',
    description: 'Cures infection and disease',
    status: HEALTHY,
    exhausted: false,
    recoveryTime: 0,
    itemType: 'consumable',
  },

  // ── FOOD ────────────────────────────────────────────────────────────
  {
    id: CARD_IDS.CANNED_FOOD,
    type: 'item',
    category: 'food',
    name: 'Canned Food',
    description: 'Restores energy and health to all survivors',
    status: HEALTHY,
    exhausted: false,
    recoveryTime: 0,
    itemType: 'consumable',
    foodValue: 2,
    bonusAttributes: { healing: 15 },
  },
  {
    id: CARD_IDS.FIELD_RATION,
    type: 'item',
    category: 'food',
    name: 'Field Ration',
    description: 'Compact emergency food supply',
    status: HEALTHY,
    exhausted: false,
    recoveryTime: 0,
    itemType: 'consumable',
    foodValue: 1,
  },

  // ── ACTIONS ─────────────────────────────────────────────────────────
  {
    id: CARD_IDS.GASOLINE,
    type: 'item',
    category: 'action',
    name: 'Gasoline Can',
    description: 'Explosive area damage when thrown at enemies',
    status: HEALTHY,
    exhausted: false,
    recoveryTime: 0,
    itemType: 'consumable',
    bonusAttributes: { combat: 35 },
  },
  {
    id: CARD_IDS.SCOUT_AHEAD,
    type: 'action',
    category: 'action',
    name: 'Scout Ahead',
    description: 'See the next encounter before choosing cards',
    status: HEALTHY,
    exhausted: false,
    recoveryTime: 2,
    itemType: 'action',
  },
  {
    id: CARD_IDS.BARRICADE_ACTION,
    type: 'action',
    category: 'action',
    name: 'Barricade',
    description: 'All survivors gain +30% defense this turn',
    status: HEALTHY,
    exhausted: false,
    recoveryTime: 1,
    itemType: 'action',
    bonusAttributes: { defense: 30 },
  },
  {
    id: CARD_IDS.MEDICAL_PROTOCOLS,
    type: 'action',
    category: 'medical',
    name: 'Medical Protocols',
    description: 'Heal all survivors for 20 HP',
    status: HEALTHY,
    exhausted: false,
    recoveryTime: 1,
    itemType: 'action',
    bonusAttributes: { healing: 20 },
  },
  {
    id: CARD_IDS.TACTICAL_RETREAT,
    type: 'action',
    category: 'action',
    name: 'Tactical Retreat',
    description: 'Avoid this encounter entirely, discard 2 random cards',
    status: HEALTHY,
    exhausted: false,
    recoveryTime: 0,
    itemType: 'action',
  },

  // ── SEEDS ────────────────────────────────────────────────────────────
  {
    id: CARD_IDS.VEG_SEEDS,
    type: 'item',
    category: 'seed',
    name: 'Vegetable Seeds',
    description: 'Plant at home — grows into 3 food in 4 days',
    status: HEALTHY,
    exhausted: false,
    recoveryTime: 0,
    itemType: 'consumable',
  },
  {
    id: CARD_IDS.HERB_SEEDS,
    type: 'item',
    category: 'seed',
    name: 'Herb Seeds',
    description: 'Medicinal plants — yields 2 food + antibiotics in 4 days',
    status: HEALTHY,
    exhausted: false,
    recoveryTime: 0,
    itemType: 'consumable',
  },
];

/** Fast lookup map: cardId → Card definition */
export const CARD_BY_ID: ReadonlyMap<string, Card> = new Map(
  CARD_CATALOG.map(c => [c.id, c])
);

// ── ASSIGNMENTS ────────────────────────────────────────────────────────
//
// Each assignment defines its label, icon, color, and mechanical effects.
// To add a new assignment: add entry here + update SurvivorAssignment in types.ts

export const ASSIGNMENT_DEFS = {
  guard: {
    label: 'Guard',
    icon: '🛡',
    color: 'text-red-600',
    borderColor: 'border-red-900/60',
    description: 'Defend base from raids',
    // Combat: each guard has this % chance of stopping a raid
    raidDefenseChance: 0.7,
  },
  garden: {
    label: 'Garden',
    icon: '🌱',
    color: 'text-green-600',
    borderColor: 'border-green-900/60',
    description: 'Grow food — consumes a seed card',
    requiresSeed: true,
    // Days/output defined per-seed in GARDEN_OUTPUTS below
  },
  workshop: {
    label: 'Workshop',
    icon: '⚙',
    color: 'text-amber-600',
    borderColor: 'border-amber-900/60',
    description: 'Craft items from raw materials',
    prefersMechanic: true, // mechanic role completes in fewer days
  },
  infirmary: {
    label: 'Infirmary',
    icon: '✚',
    color: 'text-emerald-600',
    borderColor: 'border-emerald-900/60',
    description: 'Speed up all card recovery by +1 day',
    recoveryBonus: 1, // extra days of recovery applied to exhausted cards
  },
  scavenge: {
    label: 'Scavenge',
    icon: '◎',
    color: 'text-sky-600',
    borderColor: 'border-sky-900/60',
    description: 'Solo gather — yields food and materials each day',
    dailyFoodRange:  [1, 2] as [number, number],
    dailyScrapRange: [0, 1] as [number, number],
    dailyWoodRange:  [0, 1] as [number, number],
  },
  rest: {
    label: 'Rest',
    icon: '◒',
    color: 'text-stone-500',
    borderColor: 'border-stone-700',
    description: 'Recover HP and morale, skip all duties',
    dailyHealAmount: 20,
    moraleBonus: 2,
  },
} as const;

export type AssignmentKey = keyof typeof ASSIGNMENT_DEFS;

// ── LOOT POOLS ─────────────────────────────────────────────────────────
//
// Cards available as loot drops per stage.
// weight: higher = more likely (relative weighting, not percentage).
// To add a card to a loot pool: add { cardId: CARD_IDS.MY_CARD, weight: N }

export interface LootPoolEntry {
  cardId: CardId;
  weight: number;
}

export const LOOT_POOLS: Record<'stage_1' | 'stage_2' | 'stage_3', LootPoolEntry[]> = {
  // Stage 1 — common supplies found in everyday locations
  stage_1: [
    { cardId: CARD_IDS.ANTIBIOTICS,  weight: 2 },
    { cardId: CARD_IDS.CANNED_FOOD,  weight: 3 },
    { cardId: CARD_IDS.FIELD_RATION, weight: 3 },
    { cardId: CARD_IDS.GASOLINE,     weight: 1 },
    { cardId: CARD_IDS.VEG_SEEDS,    weight: 1 },
  ],
  // Stage 2 — equipment and moderate supplies
  stage_2: [
    { cardId: CARD_IDS.FLAK_VEST,    weight: 2 },
    { cardId: CARD_IDS.MED_KIT,      weight: 2 },
    { cardId: CARD_IDS.ANTIBIOTICS,  weight: 2 },
    { cardId: CARD_IDS.CANNED_FOOD,  weight: 2 },
    { cardId: CARD_IDS.FIELD_RATION, weight: 1 },
    { cardId: CARD_IDS.VEG_SEEDS,    weight: 1 },
    { cardId: CARD_IDS.HERB_SEEDS,   weight: 1 },
  ],
  // Stage 3 — weapons and rare supplies in dangerous areas
  stage_3: [
    { cardId: CARD_IDS.RIFLE,        weight: 2 },
    { cardId: CARD_IDS.SHOTGUN,      weight: 2 },
    { cardId: CARD_IDS.GOGGLES,      weight: 1 },
    { cardId: CARD_IDS.MED_KIT,      weight: 2 },
    { cardId: CARD_IDS.HERB_SEEDS,   weight: 1 },
    { cardId: CARD_IDS.VEG_SEEDS,    weight: 1 },
  ],
};

// ── MATERIAL DROP TABLES ───────────────────────────────────────────────
//
// Raw material ranges rolled per stage clear.
// To adjust economy: tweak min/max values here.

export interface MaterialRange { min: number; max: number; }

export const STAGE_MATERIAL_DROPS: Record<number, Partial<Record<ResourceKey, MaterialRange>>> = {
  1: {
    scrapMetal:      { min: 0, max: 1 },
    wood:            { min: 0, max: 1 },
    cloth:           { min: 1, max: 2 },
    medicalSupplies: { min: 1, max: 2 },
    food:            { min: 1, max: 3 },
  },
  2: {
    scrapMetal:      { min: 1, max: 3 },
    wood:            { min: 1, max: 2 },
    cloth:           { min: 0, max: 1 },
    medicalSupplies: { min: 1, max: 2 },
    food:            { min: 1, max: 3 },
  },
  3: {
    scrapMetal:      { min: 2, max: 4 },
    wood:            { min: 1, max: 3 },
    cloth:           { min: 1, max: 2 },
    medicalSupplies: { min: 2, max: 3 },
    food:            { min: 2, max: 4 },
  },
};

// ── CRAFT RECIPES ──────────────────────────────────────────────────────
//
// Workshop crafting recipes.
// outputCardId MUST be a valid key in CARD_IDS (type-enforced).
// To add a new recipe:
//   1. Make sure the output card exists in CARD_CATALOG
//   2. Add the recipe entry below

export interface RecipeDef {
  id: string;
  name: string;
  outputCardId: CardId;
  cost: Partial<Record<ResourceKey, number>>;
  daysRequired: number;
  requiresMechanic?: boolean;
  description: string;
}

export const CRAFT_RECIPES: RecipeDef[] = [
  {
    id: 'recipe_medkit',
    name: 'Medical Kit',
    outputCardId: CARD_IDS.MED_KIT,
    cost: { cloth: 3, medicalSupplies: 2 },
    daysRequired: 2,
    description: 'Heals +50 in combat',
  },
  {
    id: 'recipe_antibiotics',
    name: 'Antibiotics',
    outputCardId: CARD_IDS.ANTIBIOTICS,
    cost: { cloth: 1, medicalSupplies: 1 },
    daysRequired: 1,
    description: 'Cures infection',
  },
  {
    id: 'recipe_shotgun',
    name: 'Improv. Shotgun',
    outputCardId: CARD_IDS.SHOTGUN,
    cost: { scrapMetal: 4, wood: 2 },
    daysRequired: 3,
    requiresMechanic: true,
    description: 'ATK +60 · 4 shots',
  },
  {
    id: 'recipe_vest',
    name: 'Reinforced Vest',
    outputCardId: CARD_IDS.FLAK_VEST,
    cost: { scrapMetal: 3, cloth: 2 },
    daysRequired: 2,
    description: 'DEF +30',
  },
  {
    id: 'recipe_ration',
    name: 'Field Ration',
    outputCardId: CARD_IDS.FIELD_RATION,
    cost: { cloth: 1, medicalSupplies: 1 },
    daysRequired: 1,
    description: '+1 food',
  },
  {
    id: 'recipe_molotov',
    name: 'Molotov Cocktail',
    outputCardId: CARD_IDS.GASOLINE,
    cost: { food: 2, cloth: 1 },
    daysRequired: 1,
    description: 'ATK +35 AOE',
  },
];

// ── GARDEN OUTPUTS ─────────────────────────────────────────────────────
//
// Maps seed card IDs → what they produce and how long it takes.
// To add a new seed type: add the seed card to CARD_CATALOG, then add its output here.

export const GARDEN_OUTPUTS: Partial<Record<CardId, {
  outputCardIds: CardId[];
  daysRequired: number;
  description: string;
}>> = {
  [CARD_IDS.VEG_SEEDS]: {
    outputCardIds: [CARD_IDS.CANNED_FOOD, CARD_IDS.CANNED_FOOD, CARD_IDS.FIELD_RATION],
    daysRequired: 4,
    description: '2× Canned Food + 1× Field Ration',
  },
  [CARD_IDS.HERB_SEEDS]: {
    outputCardIds: [CARD_IDS.CANNED_FOOD, CARD_IDS.CANNED_FOOD, CARD_IDS.ANTIBIOTICS],
    daysRequired: 4,
    description: '2× Canned Food + 1× Antibiotics',
  },
};

// ── COMBO DEFINITIONS ─────────────────────────────────────────────────
//
// Card pair/trio combos detected during card selection.
// Flash banner displayed 0.5s after selection — informational, not a gate.
// Bonuses feed into resolveCombat as flat additions on top of synergies.

export interface ComboDef {
  id: string;
  cardIds: string[];      // ALL must be present in selected cards
  label: string;          // "SUPPRESSION SHOT"
  icon: string;           // "⚡" / "✦" / "◎" / "⚙" / "★"
  dmgBonus: number;       // flat damage addition
  hlgBonus: number;       // flat healing addition
  defBonus: number;       // flat defense addition
  specialEffect?: string; // narrative description of special effect
}

export const COMBO_DEFS: ComboDef[] = [
  {
    id: 'combo_marcus_rifle',
    cardIds: [CARD_IDS.MARCUS, CARD_IDS.RIFLE],
    label: 'SUPPRESSION SHOT',
    icon: '⚡',
    dmgBonus: 20, hlgBonus: 0, defBonus: 0,
  },
  {
    id: 'combo_marcus_shotgun',
    cardIds: [CARD_IDS.MARCUS, CARD_IDS.SHOTGUN],
    label: 'CLOSE QUARTERS',
    icon: '⚡',
    dmgBonus: 15, hlgBonus: 0, defBonus: 0,
    specialEffect: 'AOE damage to all enemies',
  },
  {
    id: 'combo_sarah_medkit',
    cardIds: [CARD_IDS.SARAH, CARD_IDS.MED_KIT],
    label: 'SURGICAL CARE',
    icon: '✦',
    dmgBonus: 0, hlgBonus: 20, defBonus: 0,
  },
  {
    id: 'combo_sarah_antibiotics',
    cardIds: [CARD_IDS.SARAH, CARD_IDS.ANTIBIOTICS],
    label: 'FIELD MEDICINE',
    icon: '✦',
    dmgBonus: 0, hlgBonus: 0, defBonus: 0,
    specialEffect: 'Clears all infections',
  },
  {
    id: 'combo_james_goggles',
    cardIds: [CARD_IDS.JAMES, CARD_IDS.GOGGLES],
    label: 'GHOST PROTOCOL',
    icon: '◎',
    dmgBonus: 0, hlgBonus: 0, defBonus: 10,
    specialEffect: '+30% dodge vs ambush encounters',
  },
  {
    id: 'combo_james_scout',
    cardIds: [CARD_IDS.JAMES, CARD_IDS.SCOUT_AHEAD],
    label: 'DEEP RECON',
    icon: '◎',
    dmgBonus: 0, hlgBonus: 0, defBonus: 0,
    specialEffect: 'Reveals next encounter enemy type',
  },
  {
    id: 'combo_elena_any_weapon',
    cardIds: [CARD_IDS.ELENA, CARD_IDS.RIFLE],
    label: 'JURY RIG',
    icon: '⚙',
    dmgBonus: 0, hlgBonus: 0, defBonus: 0,
    specialEffect: 'Weapon uses -1 ammo this stage',
  },
  {
    id: 'combo_elena_shotgun',
    cardIds: [CARD_IDS.ELENA, CARD_IDS.SHOTGUN],
    label: 'JURY RIG',
    icon: '⚙',
    dmgBonus: 0, hlgBonus: 0, defBonus: 0,
    specialEffect: 'Weapon uses -1 ammo this stage',
  },
  {
    id: 'combo_lisa_medkit',
    cardIds: [CARD_IDS.LISA, CARD_IDS.MED_KIT],
    label: 'ADVANCED TRIAGE',
    icon: '⚗',
    dmgBonus: 0, hlgBonus: 35, defBonus: 0,
    specialEffect: 'Remove 1 debuff from all survivors',
  },
  {
    id: 'combo_marcus_barricade',
    cardIds: [CARD_IDS.MARCUS, CARD_IDS.BARRICADE_ACTION],
    label: 'HOLD THE LINE',
    icon: '⚡',
    dmgBonus: 15, hlgBonus: 0, defBonus: 15,
  },
  {
    id: 'combo_full_squad',
    cardIds: [CARD_IDS.SARAH, CARD_IDS.MARCUS, CARD_IDS.ELENA],
    label: 'FULL SQUAD',
    icon: '★',
    dmgBonus: 10, hlgBonus: 10, defBonus: 10,
    specialEffect: '+10% all stats',
  },
];

// ── ENEMY TYPE DEFINITIONS ────────────────────────────────────────────
//
// Weakness = card category that counters this enemy type.
// counterBonus = multiplier when weakness is played (1.4 = +40% DMG)
// failPenalty = multiplier when no counter cards played (0.8 = -20% DMG)

export interface EnemyTypeDef {
  icon: string;
  label: string;
  description: string;
  // Card categories that count as counters
  weaknesses: string[];
  // Specific card IDs that are strong counters
  counterCardIds: string[];
  counterBonus: number;     // damage multiplier if countered
  failPenalty: number;      // damage multiplier if no counter (1.0 = no penalty)
  infectOnHit?: boolean;    // 30% chance to infect survivor per surviving enemy
  infectChance?: number;    // 0-1
}

export const ENEMY_TYPE_DEFS: Record<EnemyType, EnemyTypeDef> = {
  straggler: {
    icon: '☠',
    label: 'Stragglers',
    description: 'Lone undead — anything works.',
    weaknesses: [],
    counterCardIds: [],
    counterBonus: 1.0,
    failPenalty: 1.0,
  },
  horde: {
    icon: '💀',
    label: 'Horde',
    description: 'Dozens of undead — area damage wins.',
    weaknesses: ['action'],
    counterCardIds: [CARD_IDS.GASOLINE, CARD_IDS.BARRICADE_ACTION],
    counterBonus: 1.4,
    failPenalty: 0.8,
  },
  infected: {
    icon: '☣',
    label: 'Infected',
    description: 'Carriers — bring medical cards or risk infection.',
    weaknesses: ['medical'],
    counterCardIds: [CARD_IDS.MED_KIT, CARD_IDS.ANTIBIOTICS, CARD_IDS.MEDICAL_PROTOCOLS],
    counterBonus: 1.3,
    failPenalty: 1.0,
    infectOnHit: true,
    infectChance: 0.3,
  },
  armored: {
    icon: '🛡',
    label: 'Armored',
    description: 'Heavy plating — high ATK weapons only.',
    weaknesses: ['weapon'],
    counterCardIds: [CARD_IDS.RIFLE, CARD_IDS.SHOTGUN],
    counterBonus: 1.5,
    failPenalty: 0.6,
  },
  ambush: {
    icon: '👁',
    label: 'Ambush',
    description: 'Hidden attackers — perception wins.',
    weaknesses: ['gear'],
    counterCardIds: [CARD_IDS.GOGGLES, CARD_IDS.SCOUT_AHEAD],
    counterBonus: 1.0,  // first strike bonus (handled separately)
    failPenalty: 0.7,   // -30% DEF when surprised
    infectOnHit: false,
  },
  raiders: {
    icon: '⚔',
    label: 'Raiders',
    description: 'Organized humans — mixed deck needed.',
    weaknesses: [],
    counterCardIds: [],
    counterBonus: 1.25,
    failPenalty: 1.0,
  },
};

// ── STAGE CONDITION DEFINITIONS ───────────────────────────────────────
//
// Conditions roll with 25% chance starting day 5.
// Two conditions can stack after day 10.

export interface StageConditionDef {
  icon: string;
  label: string;
  description: string;
  counterCardIds: string[];
  // Effects applied during combat
  perceptionPenalty?: number;   // reduce perception-based bonuses by %
  weaponJamChance?: number;     // % chance each weapon use = 0 damage + uses ammo
  infectionChanceOnHit?: number; // extra infection chance per hit
  enemyDefenseBonus?: number;   // flat enemy DEF bonus
  enemyHidden?: boolean;        // enemy type hidden until card selection
  enemyMultiplyAfterTurns?: number; // enemy count doubles after N turns
}

export const STAGE_CONDITION_DEFS: Record<StageCondition, StageConditionDef> = {
  night: {
    icon: '🌑',
    label: 'Night',
    description: 'Perception -40% unless Goggles equipped.',
    counterCardIds: [CARD_IDS.GOGGLES],
    perceptionPenalty: 0.4,
  },
  rain: {
    icon: '🌧',
    label: 'Rain',
    description: 'Each weapon: 30% jam chance (uses ammo, deals 0).',
    counterCardIds: [CARD_IDS.BARRICADE_ACTION, CARD_IDS.GASOLINE],
    weaponJamChance: 0.3,
  },
  infected_zone: {
    icon: '☣',
    label: 'Infected Zone',
    description: 'Any hit on survivor: 25% infection chance.',
    counterCardIds: [CARD_IDS.SARAH, CARD_IDS.MED_KIT],
    infectionChanceOnHit: 0.25,
  },
  fortified: {
    icon: '🏰',
    label: 'Fortified',
    description: 'Enemies +50 DEF unless Scout Ahead used.',
    counterCardIds: [CARD_IDS.SCOUT_AHEAD],
    enemyDefenseBonus: 50,
  },
  fog: {
    icon: '🌫',
    label: 'Fog',
    description: "Enemy type hidden until card selection starts.",
    counterCardIds: [],
    enemyHidden: true,
  },
  timed: {
    icon: '⏱',
    label: 'Timed',
    description: 'Enemies multiply if not defeated quickly.',
    counterCardIds: [CARD_IDS.RIFLE, CARD_IDS.SHOTGUN, CARD_IDS.GASOLINE],
    enemyMultiplyAfterTurns: 2,
  },
};

// ── DAILY EVENT POOL ──────────────────────────────────────────────────
//
// One event rolls per day. Mix of threats, opportunities, moral choices.
// Stored as homeBase.currentEvent, cleared when day advances.

export const EVENT_POOL: DailyEvent[] = [
  // ── THREATS
  {
    id: 'event_infected_scent',
    type: 'threat',
    title: 'Infected Scent',
    description: "Something\'s drawing them in. Today\'s runs face double-size hordes.",
    runDamageMultiplier: 1.4,
  },
  {
    id: 'event_food_spoilage',
    type: 'threat',
    title: 'Food Spoilage',
    description: 'The storage is compromised. 3 food lost immediately.',
    immediateFood: -3,
  },
  {
    id: 'event_survivor_fever',
    type: 'threat',
    title: 'Survivor Fever',
    description: 'One of the group is burning up. Assign them to the infirmary.',
    immediateSurvivorDamage: 20,
  },
  {
    id: 'event_raid_warning',
    type: 'threat',
    title: 'Raid Warning',
    description: "Tracks at the perimeter. Tonight\'s raid chance is 90%. Guard NOW.",
    raidChanceOverride: 0.9,
  },
  {
    id: 'event_supply_cache',
    type: 'opportunity',
    title: 'Supply Cache Found',
    description: 'Scavenge today for +5 guaranteed materials.',
    actionLabel: 'Send Scavenger',
    actionResult: '+5 materials added to stores',
  },
  // ── OPPORTUNITIES
  {
    id: 'event_trade_caravan',
    type: 'opportunity',
    title: 'Trade Caravan',
    description: 'A merchant passes through. Spend 5 food for any 1 item card.',
    actionLabel: 'Trade (5 food)',
    actionResult: 'Trade completed',
  },
  {
    id: 'event_lucky_find',
    type: 'opportunity',
    title: 'Lucky Find',
    description: "First scavenger out today finds a weapon. Don\'t wait.",
    actionLabel: 'Send Scout',
    actionResult: 'Weapon recovered',
  },
  {
    id: 'event_adrenaline',
    type: 'opportunity',
    title: 'Adrenaline',
    description: 'One survivor ignores exhaustion for 1 run today only.',
    actionLabel: 'Activate',
    actionResult: 'Exhaustion bypassed this run',
  },
  {
    id: 'event_storm_coming',
    type: 'opportunity',
    title: 'Storm Coming',
    description: 'Build barricade now for free. Materials still cost, but +50% DEF.',
    actionLabel: 'Build Barricade',
    actionResult: 'Barricade reinforced',
  },
  // ── MORAL EVENTS
  {
    id: 'event_child_found',
    type: 'moral',
    title: 'Child Found',
    description: 'A child alone on the road. Take them in (+1 food/day) or turn away.',
    actionLabel: 'Take Them In',
    actionResult: 'A new member joins the group',
  },
  {
    id: 'event_wounded_stranger',
    type: 'moral',
    title: 'Wounded Stranger',
    description: 'A survivor near death at the gates. Use a Medical Kit to save them.',
    actionLabel: 'Use Medical Kit',
    actionResult: 'Stranger saved, joins with 40 HP',
  },
  {
    id: 'event_raider_prisoner',
    type: 'moral',
    title: 'Raider Prisoner',
    description: 'Caught one of them. Execute (morale -10) or release (50% attack risk).',
    actionLabel: 'Release',
    actionResult: 'Released into the wastes',
  },
];

// ── MOMENTUM CARDS ────────────────────────────────────────────────────
//
// One momentum card generates each day. Shown on home screen.
// Tap to activate before a run. Expires at day end.

export const MOMENTUM_CARDS: MomentumCard[] = [
  {
    id: 'momentum_radio',
    title: 'Overheard Radio',
    description: 'Reveals enemy type of all 3 stages before you start.',
    icon: '📻',
    revealsAllEncounters: true,
  },
  {
    id: 'momentum_shortcut',
    title: 'Found Shortcut',
    description: 'Skip stage 1, go straight to stage 2 (less loot).',
    icon: '🏃',
    skipStageOne: true,
  },
  {
    id: 'momentum_adrenaline',
    title: 'Adrenaline Cache',
    description: 'One survivor starts with +30% ATK this run only.',
    icon: '💉',
    survivorAtkBonus: 30,
  },
  {
    id: 'momentum_fog_of_war',
    title: 'Fog of War',
    description: 'Enemies weakened 20% today (caught off guard).',
    icon: '🌫',
    enemyDamageReduction: 20,
  },
  {
    id: 'momentum_lucky_ammo',
    title: 'Lucky Ammo',
    description: 'All weapons start with +2 extra ammo this run.',
    icon: '🔫',
    extraWeaponAmmo: 2,
  },
  {
    id: 'momentum_scavenged_parts',
    title: 'Scavenged Parts',
    description: 'First stage win guarantees 1 weapon card loot.',
    icon: '⚙',
    guaranteedWeaponLoot: true,
  },
  {
    id: 'momentum_medical_stash',
    title: 'Medical Stash',
    description: 'First stage win guarantees 1 medical card loot.',
    icon: '✚',
    guaranteedMedLoot: true,
  },
  {
    id: 'momentum_instinct',
    title: 'Survivor Instinct',
    description: 'Retreat this run — cards do not become exhausted.',
    icon: '🧠',
    retreatNoExhaust: true,
  },
];

// ── STARTER DECK ──────────────────────────────────────────────────────
//
// Cards every new game starts with.
// To change starting gear: add/remove CARD_IDS entries here.

export const STARTER_DECK_IDS: CardId[] = [
  // Survivors (5)
  CARD_IDS.SARAH,
  CARD_IDS.MARCUS,
  CARD_IDS.ELENA,
  CARD_IDS.JAMES,
  CARD_IDS.LISA,
  // Weapons (2)
  CARD_IDS.RIFLE,
  CARD_IDS.SHOTGUN,
  // Gear (2)
  CARD_IDS.FLAK_VEST,
  CARD_IDS.GOGGLES,
  // Medical (2)
  CARD_IDS.MED_KIT,
  CARD_IDS.ANTIBIOTICS,
  // Food (2)
  CARD_IDS.CANNED_FOOD,
  CARD_IDS.FIELD_RATION,
  // Actions (4)
  CARD_IDS.GASOLINE,
  CARD_IDS.SCOUT_AHEAD,
  CARD_IDS.BARRICADE_ACTION,
  CARD_IDS.MEDICAL_PROTOCOLS,
  CARD_IDS.TACTICAL_RETREAT,
];
