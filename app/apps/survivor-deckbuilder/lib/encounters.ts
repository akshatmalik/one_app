import { Encounter } from './types';

// ===== STAGE 1 ENCOUNTERS (Easy — ~30-40 total HP, low damage) =====
// Balanced so a single survivor + item card can win cleanly
export const STAGE_1_ENCOUNTERS: Encounter[] = [
  {
    id: 'enc_pharmacy_zombies',
    stage: 1,
    type: 'combat',
    name: 'Pharmacy Raid',
    description: 'Two shambling corpses drag themselves between the aisles. They haven\'t noticed you yet. The medicine cabinet is right there — just past them.',
    location: 'Abandoned Pharmacy',
    enemies: [
      { name: 'Shambler', health: 15, maxHealth: 15, damage: 5, defense: 0 },
      { name: 'Shambler', health: 15, maxHealth: 15, damage: 5, defense: 0 },
    ],
    difficulty: 'easy',
    rewardsText: 'First aid supplies scavenged',
    itemsToFind: ['card_antibiotics_001'],
  },
  {
    id: 'enc_gas_station',
    stage: 1,
    type: 'combat',
    name: 'Gas Station Stop',
    description: 'Quick in-and-out. One runner paces behind the counter, another slumps by the broken fridge. Snacks and fuel — grab what you can.',
    location: 'Highway Gas Station',
    enemies: [
      { name: 'Runner', health: 12, maxHealth: 12, damage: 6, defense: 0 },
      { name: 'Lurker', health: 18, maxHealth: 18, damage: 4, defense: 0 },
    ],
    difficulty: 'easy',
    rewardsText: 'Fuel and food found',
    itemsToFind: ['card_food_001'],
  },
  {
    id: 'enc_school_cafeteria',
    stage: 1,
    type: 'combat',
    name: 'Cafeteria Scavenge',
    description: 'Overturned lunch trays. The vending machine is smashed open. One zombie stands in the kitchen doorway, swaying gently. Easy pickings.',
    location: 'Elementary School',
    enemies: [
      { name: 'Cafeteria Zombie', health: 20, maxHealth: 20, damage: 4, defense: 2 },
      { name: 'Small Zombie', health: 10, maxHealth: 10, damage: 3, defense: 0 },
    ],
    difficulty: 'easy',
    rewardsText: 'Canned food recovered',
    itemsToFind: ['card_food_001'],
  },
];

// ===== STAGE 2 ENCOUNTERS (Medium — ~50-65 total HP, moderate damage) =====
// Requires good card choice. Survivable but you'll take some hits.
export const STAGE_2_ENCOUNTERS: Encounter[] = [
  {
    id: 'enc_warehouse',
    stage: 2,
    type: 'combat',
    name: 'Warehouse Breach',
    description: 'Military crates stacked floor to ceiling. Two infected guards still patrol their posts — muscle memory from a life before. A sergeant in the back has full body armor.',
    location: 'Military Warehouse',
    enemies: [
      { name: 'Infected Guard', health: 20, maxHealth: 20, damage: 8, defense: 3 },
      { name: 'Infected Guard', health: 20, maxHealth: 20, damage: 8, defense: 3 },
      { name: 'Armored Sergeant', health: 25, maxHealth: 25, damage: 10, defense: 6 },
    ],
    difficulty: 'medium',
    rewardsText: 'Military equipment secured',
    itemsToFind: ['card_flak_001'],
  },
  {
    id: 'enc_hospital_wing',
    stage: 2,
    type: 'combat',
    name: 'Hospital East Wing',
    description: 'The quarantine tape is shredded. Two fresh infected — faster, angrier — pace the hallway. A third crouches behind the nurse\'s station. The supply room door is open.',
    location: 'City Hospital',
    enemies: [
      { name: 'Fresh Infected', health: 22, maxHealth: 22, damage: 10, defense: 2 },
      { name: 'Fresh Infected', health: 22, maxHealth: 22, damage: 10, defense: 2 },
      { name: 'Nurse Infected', health: 18, maxHealth: 18, damage: 6, defense: 3 },
    ],
    difficulty: 'medium',
    rewardsText: 'Advanced medical supplies',
    itemsToFind: ['card_medkit_001'],
  },
  {
    id: 'enc_police_station',
    stage: 2,
    type: 'combat',
    name: 'Police Station Armory',
    description: 'The armory lock is smashed. Two officers still wear their kevlar — tough to put down. One has a baton it swings wildly. The weapons rack behind them has what you need.',
    location: 'Police Station',
    enemies: [
      { name: 'Armored Officer', health: 25, maxHealth: 25, damage: 7, defense: 8 },
      { name: 'Officer Zombie', health: 20, maxHealth: 20, damage: 9, defense: 3 },
    ],
    difficulty: 'medium',
    rewardsText: 'Weapons and ammo recovered',
    itemsToFind: ['card_rifle_001'],
  },
];

// ===== STAGE 3 ENCOUNTERS (Hard — ~80-100 total HP, high damage) =====
// The big fight. Need synergies and good cards to win clean.
export const STAGE_3_ENCOUNTERS: Encounter[] = [
  {
    id: 'enc_the_nest',
    stage: 3,
    type: 'combat',
    name: 'The Nest',
    description: 'Cocoons cover the tunnel walls. Three hatchlings skitter toward you while the alpha — twice normal size — watches from the shadows. It screeches. They charge.',
    location: 'Subway Tunnel',
    enemies: [
      { name: 'Hatchling', health: 12, maxHealth: 12, damage: 8, defense: 0 },
      { name: 'Hatchling', health: 12, maxHealth: 12, damage: 8, defense: 0 },
      { name: 'Hatchling', health: 12, maxHealth: 12, damage: 8, defense: 0 },
      { name: 'Alpha', health: 45, maxHealth: 45, damage: 15, defense: 8 },
    ],
    difficulty: 'hard',
    rewardsText: 'Rare research samples obtained',
    itemsToFind: ['card_goggles_001'],
  },
  {
    id: 'enc_bridge_standoff',
    stage: 3,
    type: 'combat',
    name: 'Bridge Standoff',
    description: 'The only way home. A massive brute blocks the center span, flanked by two fast runners. The river churns below. No going around — only through.',
    location: 'River Bridge',
    enemies: [
      { name: 'Pack Runner', health: 18, maxHealth: 18, damage: 10, defense: 2 },
      { name: 'Pack Runner', health: 18, maxHealth: 18, damage: 10, defense: 2 },
      { name: 'Brute', health: 50, maxHealth: 50, damage: 18, defense: 10 },
    ],
    difficulty: 'hard',
    rewardsText: 'Safe passage home',
    itemsToFind: ['card_shotgun_001'],
  },
  {
    id: 'enc_lab_outbreak',
    stage: 3,
    type: 'combat',
    name: 'Lab Outbreak',
    description: 'Emergency lights strobe red. Two experimental subjects have escaped containment — they\'re wrong, fast, wrong. Subject-0 blocks the exit, dripping something dark.',
    location: 'Research Laboratory',
    enemies: [
      { name: 'Subject-7', health: 25, maxHealth: 25, damage: 12, defense: 5 },
      { name: 'Subject-12', health: 25, maxHealth: 25, damage: 14, defense: 5 },
      { name: 'Subject-0', health: 35, maxHealth: 35, damage: 16, defense: 8 },
    ],
    difficulty: 'hard',
    rewardsText: 'Research data secured',
    itemsToFind: ['card_antibiotics_001'],
  },
];

export const ALL_ENCOUNTERS = [
  ...STAGE_1_ENCOUNTERS,
  ...STAGE_2_ENCOUNTERS,
  ...STAGE_3_ENCOUNTERS,
];

/**
 * Get a random encounter for a given stage
 */
export function getRandomEncounter(stage: 1 | 2 | 3): Encounter {
  const encounters =
    stage === 1 ? STAGE_1_ENCOUNTERS :
    stage === 2 ? STAGE_2_ENCOUNTERS :
    STAGE_3_ENCOUNTERS;

  const index = Math.floor(Math.random() * encounters.length);
  const encounter = encounters[index];
  return {
    ...encounter,
    enemies: encounter.enemies?.map(e => ({ ...e })),
  };
}

/**
 * Get total enemy HP for an encounter
 */
export function getEncounterTotalHP(encounter: Encounter): number {
  return (encounter.enemies ?? []).reduce((sum, e) => sum + e.health, 0);
}

/**
 * Get total enemy damage for an encounter
 */
export function getEncounterTotalDamage(encounter: Encounter): number {
  return (encounter.enemies ?? []).reduce((sum, e) => sum + e.damage, 0);
}
