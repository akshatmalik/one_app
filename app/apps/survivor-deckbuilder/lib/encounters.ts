import { Encounter, CardInstance } from './types';

// ===== STAGE 1 ENCOUNTERS (Easy — 60 total HP) =====
export const STAGE_1_ENCOUNTERS: Encounter[] = [
  {
    id: 'enc_pharmacy_zombies',
    stage: 1,
    type: 'combat',
    name: 'Pharmacy Raid',
    description: 'Three shambling zombies stand between you and a supply of medicine. The pharmacy shelves are mostly empty, but there\'s enough to make the fight worth it.',
    location: 'Abandoned Pharmacy',
    enemies: [
      { name: 'Shambler', health: 20, maxHealth: 20, damage: 8, defense: 0 },
      { name: 'Shambler', health: 20, maxHealth: 20, damage: 8, defense: 0 },
      { name: 'Shambler', health: 20, maxHealth: 20, damage: 10, defense: 0 },
    ],
    difficulty: 'easy',
    rewardsText: 'Medical supplies scavenged',
    itemsToFind: ['card_antibiotics_001'],
  },
  {
    id: 'enc_gas_station',
    stage: 1,
    type: 'combat',
    name: 'Gas Station Ambush',
    description: 'You thought the gas station was empty. It wasn\'t. Two runners burst from behind the counter, and a bloated one blocks the exit.',
    location: 'Highway Gas Station',
    enemies: [
      { name: 'Runner', health: 15, maxHealth: 15, damage: 12, defense: 0 },
      { name: 'Runner', health: 15, maxHealth: 15, damage: 12, defense: 0 },
      { name: 'Bloater', health: 30, maxHealth: 30, damage: 6, defense: 5 },
    ],
    difficulty: 'easy',
    rewardsText: 'Fuel and supplies found',
    itemsToFind: ['card_food_001'],
  },
  {
    id: 'enc_school_cafeteria',
    stage: 1,
    type: 'combat',
    name: 'School Cafeteria',
    description: 'The school cafeteria still has canned goods. But the janitor and two lunch ladies have other plans for visitors. They shuffle between the overturned tables.',
    location: 'Elementary School',
    enemies: [
      { name: 'Cafeteria Zombie', health: 18, maxHealth: 18, damage: 8, defense: 2 },
      { name: 'Cafeteria Zombie', health: 18, maxHealth: 18, damage: 8, defense: 2 },
      { name: 'Janitor Zombie', health: 24, maxHealth: 24, damage: 10, defense: 3 },
    ],
    difficulty: 'easy',
    rewardsText: 'Canned food recovered',
    itemsToFind: ['card_food_001'],
  },
];

// ===== STAGE 2 ENCOUNTERS (Medium — 90 total HP) =====
export const STAGE_2_ENCOUNTERS: Encounter[] = [
  {
    id: 'enc_warehouse',
    stage: 2,
    type: 'combat',
    name: 'Warehouse Breach',
    description: 'A military supply warehouse. The good news: weapons inside. The bad news: a pack of fast-moving infected guards the entrance. They move in coordinated patterns.',
    location: 'Military Warehouse',
    enemies: [
      { name: 'Infected Guard', health: 25, maxHealth: 25, damage: 14, defense: 5 },
      { name: 'Infected Guard', health: 25, maxHealth: 25, damage: 14, defense: 5 },
      { name: 'Infected Sergeant', health: 40, maxHealth: 40, damage: 18, defense: 8 },
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
    description: 'The hospital\'s east wing was quarantine ground zero. The infected here are fresher, stronger, and more aggressive. But the supply room has what you need.',
    location: 'City Hospital',
    enemies: [
      { name: 'Fresh Infected', health: 30, maxHealth: 30, damage: 16, defense: 3 },
      { name: 'Fresh Infected', health: 30, maxHealth: 30, damage: 16, defense: 3 },
      { name: 'Nurse Infected', health: 30, maxHealth: 30, damage: 12, defense: 5 },
    ],
    difficulty: 'medium',
    rewardsText: 'Advanced medical supplies found',
    itemsToFind: ['card_medkit_001'],
  },
  {
    id: 'enc_police_station',
    stage: 2,
    type: 'combat',
    name: 'Police Station Armory',
    description: 'The armory is locked behind reinforced glass. The infected officers still patrol the halls, some still wearing kevlar that makes them tougher to put down.',
    location: 'Police Station',
    enemies: [
      { name: 'Armored Zombie', health: 35, maxHealth: 35, damage: 12, defense: 10 },
      { name: 'Officer Zombie', health: 25, maxHealth: 25, damage: 15, defense: 5 },
      { name: 'Officer Zombie', health: 25, maxHealth: 25, damage: 15, defense: 5 },
    ],
    difficulty: 'medium',
    rewardsText: 'Weapons and ammo recovered',
    itemsToFind: ['card_rifle_001'],
  },
];

// ===== STAGE 3 ENCOUNTERS (Hard — 130+ total HP) =====
export const STAGE_3_ENCOUNTERS: Encounter[] = [
  {
    id: 'enc_the_nest',
    stage: 3,
    type: 'combat',
    name: 'The Nest',
    description: 'You\'ve found a nest. Dozens of cocoons line the walls, but only a few have hatched. The alpha is massive — twice the size of a normal infected. It screeches and the others charge.',
    location: 'Subway Tunnel',
    enemies: [
      { name: 'Hatchling', health: 20, maxHealth: 20, damage: 15, defense: 0 },
      { name: 'Hatchling', health: 20, maxHealth: 20, damage: 15, defense: 0 },
      { name: 'Hatchling', health: 20, maxHealth: 20, damage: 15, defense: 0 },
      { name: 'Alpha Infected', health: 70, maxHealth: 70, damage: 25, defense: 12 },
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
    description: 'The bridge is the only way back. A hulking brute blocks the center, flanked by its pack. The river churns below. There\'s no going around — only through.',
    location: 'River Bridge',
    enemies: [
      { name: 'Pack Runner', health: 25, maxHealth: 25, damage: 18, defense: 3 },
      { name: 'Pack Runner', health: 25, maxHealth: 25, damage: 18, defense: 3 },
      { name: 'Brute', health: 80, maxHealth: 80, damage: 30, defense: 15 },
    ],
    difficulty: 'hard',
    rewardsText: 'Safe passage home secured',
    itemsToFind: ['card_shotgun_001'],
  },
  {
    id: 'enc_lab_outbreak',
    stage: 3,
    type: 'combat',
    name: 'Lab Outbreak',
    description: 'The research lab still has power. The containment units have failed, releasing experimental subjects. These aren\'t normal infected — they\'re faster, stronger, wrong.',
    location: 'Research Laboratory',
    enemies: [
      { name: 'Subject-7', health: 35, maxHealth: 35, damage: 20, defense: 8 },
      { name: 'Subject-12', health: 35, maxHealth: 35, damage: 22, defense: 8 },
      { name: 'Subject-0 (Boss)', health: 60, maxHealth: 60, damage: 28, defense: 12 },
    ],
    difficulty: 'hard',
    rewardsText: 'Research data and samples secured',
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
  // Deep clone enemies so combat doesn't mutate the source
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
