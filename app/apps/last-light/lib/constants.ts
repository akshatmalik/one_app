// Game configuration and constants

export const GAME_CONFIG = {
  // Player stats
  STARTING_HEALTH: 100,
  STARTING_HUNGER: 50,
  STARTING_ENERGY: 100,

  // Resource consumption
  HUNGER_INCREASE_PER_TURN: 5,
  ENERGY_DECREASE_PER_ACTION: 10,

  // Behavior tracking
  MAX_RECENT_ACTIONS: 10,
  STEALTH_THRESHOLD: 5,

  // Encounter settings
  STRANGER_ENCOUNTER_COOLDOWN: 10,
  TURNS_BEFORE_KNOCK: 5,

  // World generation
  STARTING_AREA: 'suburban' as const,
  MAX_LOOT_PER_ROOM: 5,
};

export const STORAGE_KEY = 'last-light-game-state';

export const STARTING_LOCATION = {
  id: 'start_house',
  name: 'Abandoned House',
  type: 'house',
  description:
    'A small suburban house. The front door was unlocked. Dust covers everything.',
  rooms: [
    {
      id: 'start_living_room',
      name: 'Living Room',
      description:
        'Furniture is overturned. A couch sits against the wall. Light filters through broken blinds.',
      containers: [],
      hasBeenSearched: false,
      initialLoot: [],
      remainingLoot: [],
    },
    {
      id: 'start_kitchen',
      name: 'Kitchen',
      description:
        'Cabinets hang open. The fridge door is ajar, empty. A pantry door is visible in the corner.',
      containers: [
        {
          id: 'start_pantry',
          name: 'Pantry',
          hasBeenSearched: false,
          loot: [
            { item: 'canned_beans', quantity: 2, taken: false },
            { item: 'water_bottle', quantity: 1, taken: false },
          ],
        },
      ],
      hasBeenSearched: false,
      initialLoot: [
        { item: 'canned_beans', quantity: 2, taken: false },
        { item: 'water_bottle', quantity: 1, taken: false },
      ],
      remainingLoot: [
        { item: 'canned_beans', quantity: 2, taken: false },
        { item: 'water_bottle', quantity: 1, taken: false },
      ],
    },
  ],
  hasBeenEntered: true,
  dangerLevel: 2,
};

export const ITEM_DEFINITIONS = {
  canned_beans: {
    name: 'Canned Beans',
    type: 'food' as const,
    description: 'A can of beans. Not fancy, but it will keep you fed.',
    usable: true,
    effect: { hunger: -30 },
  },
  water_bottle: {
    name: 'Water Bottle',
    type: 'water' as const,
    description: 'Clean water. Essential for survival.',
    usable: true,
    effect: { hunger: -10, energy: 10 },
  },
  first_aid_kit: {
    name: 'First Aid Kit',
    type: 'medicine' as const,
    description: 'Bandages, painkillers, and antiseptic.',
    usable: true,
    effect: { health: 30 },
  },
  crowbar: {
    name: 'Crowbar',
    type: 'weapon' as const,
    description: 'A heavy crowbar. Useful for breaking things... or defense.',
    usable: false,
  },
};

export const OPENING_NARRATION = `You wake up in an unfamiliar house. Your head throbs. How did you get here?

Outside, the world is silent. Too silent. No cars. No voices. Just... nothing.

Your stomach growls. You need to find supplies. But you also need to be careful. You don't know what's out there.

Or who.`;

export const QUICK_ACTIONS = [
  'Look around',
  'Search',
  'Check inventory',
  'Listen',
];
