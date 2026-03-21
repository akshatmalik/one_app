import { Card, CardStatus } from './types';

export const STARTER_CARDS: Card[] = [
  // SURVIVORS
  {
    id: 'card_sarah_001',
    type: 'survivor',
    name: 'Sarah Chen',
    description: 'A compassionate healer who supports the group',
    role: 'healer',
    status: 'healthy',
    exhausted: false,
    recoveryTime: 0,
    maxHealth: 100,
    attributes: {
      combat: 0,
      defense: 10,
      healing: 40,
      speed: 0,
      perception: 20,
    },
    special: {
      name: 'Empathy',
      description: 'Adjacent cards get +10% defense',
      trigger: 'passive',
      effect: () => {},
    },
  },
  {
    id: 'card_marcus_001',
    type: 'survivor',
    name: 'Marcus Reeves',
    description: 'A hardened fighter with combat expertise',
    role: 'fighter',
    status: 'healthy',
    exhausted: false,
    recoveryTime: 0,
    maxHealth: 100,
    attributes: {
      combat: 30,
      defense: 0,
      healing: -20,
      speed: 10,
      perception: 50,
    },
    special: {
      name: 'Veteran',
      description: 'If played twice in one turn, +50% damage on second play',
      trigger: 'on_play',
      effect: () => {},
    },
  },
  {
    id: 'card_elena_001',
    type: 'survivor',
    name: 'Elena Torres',
    description: 'A resourceful mechanic who improvises solutions',
    role: 'mechanic',
    status: 'healthy',
    exhausted: false,
    recoveryTime: 0,
    maxHealth: 100,
    attributes: {
      combat: 10,
      defense: 10,
      healing: 0,
      speed: 20,
      perception: 0,
    },
    special: {
      name: 'Jury Rig',
      description: 'Can activate exhausted item cards once per run',
      trigger: 'passive',
      effect: () => {},
    },
  },
  {
    id: 'card_james_001',
    type: 'survivor',
    name: 'James Wu',
    description: 'A quick and perceptive scout',
    role: 'scout',
    status: 'healthy',
    exhausted: false,
    recoveryTime: 0,
    maxHealth: 100,
    attributes: {
      combat: 5,
      defense: 5,
      healing: 0,
      speed: 50,
      perception: 40,
    },
    special: {
      name: 'Quick Reflexes',
      description: '+30% to dodge ambushes',
      trigger: 'passive',
      effect: () => {},
    },
  },
  {
    id: 'card_lisa_001',
    type: 'survivor',
    name: 'Dr. Lisa Park',
    description: 'A brilliant scientist with knowledge of the outbreak',
    role: 'scientist',
    status: 'healthy',
    exhausted: false,
    recoveryTime: 0,
    maxHealth: 100,
    attributes: {
      combat: -10,
      defense: 20,
      healing: 60,
      speed: 0,
      perception: 30,
    },
    special: {
      name: 'Medical Knowledge',
      description: 'Healing effects are +20% more effective',
      trigger: 'passive',
      effect: () => {},
    },
  },

  // ITEMS
  {
    id: 'card_rifle_001',
    type: 'item',
    name: 'Rifle',
    description: 'A reliable firearm for taking down zombies',
    status: 'healthy',
    exhausted: false,
    recoveryTime: 1,
    itemType: 'equipment',
    category: 'weapon',
    maxAmmo: 6,
    bonusAttributes: {
      combat: 40,
    },
  },
  {
    id: 'card_medkit_001',
    type: 'item',
    name: 'Medical Kit',
    description: 'Supplies for treating wounds and illnesses',
    status: 'healthy',
    exhausted: false,
    recoveryTime: 1,
    itemType: 'equipment',
    category: 'medical',
    bonusAttributes: {
      healing: 50,
    },
  },
  {
    id: 'card_shotgun_001',
    type: 'item',
    name: 'Shotgun',
    description: 'Powerful but less accurate close-range weapon',
    status: 'healthy',
    exhausted: false,
    recoveryTime: 1,
    itemType: 'equipment',
    category: 'weapon',
    maxAmmo: 4,
    bonusAttributes: {
      combat: 60,
    },
  },
  {
    id: 'card_flak_001',
    type: 'item',
    name: 'Flak Vest',
    description: 'Protective armor that reduces damage',
    status: 'healthy',
    exhausted: false,
    recoveryTime: 1,
    itemType: 'equipment',
    category: 'gear',
    bonusAttributes: {
      defense: 30,
    },
  },
  {
    id: 'card_goggles_001',
    type: 'item',
    name: 'Night Vision Goggles',
    description: 'See in darkness and spot enemies early',
    status: 'healthy',
    exhausted: false,
    recoveryTime: 1,
    itemType: 'equipment',
    category: 'gear',
    bonusAttributes: {
      perception: 50,
      speed: -10,
    },
  },
  {
    id: 'card_antibiotics_001',
    type: 'item',
    name: 'Antibiotics',
    description: 'Cures infection and disease',
    status: 'healthy',
    exhausted: false,
    recoveryTime: 0,
    itemType: 'consumable',
    category: 'medical',
  },
  {
    id: 'card_food_001',
    type: 'item',
    name: 'Canned Food',
    description: 'Restores energy and health to all survivors',
    status: 'healthy',
    exhausted: false,
    recoveryTime: 0,
    itemType: 'consumable',
    category: 'food',
    foodValue: 2,
    bonusAttributes: {
      healing: 15,
    },
  },
  {
    id: 'card_ration_001',
    type: 'item',
    name: 'Field Ration',
    description: 'Compact emergency food supply',
    status: 'healthy',
    exhausted: false,
    recoveryTime: 0,
    itemType: 'consumable',
    category: 'food',
    foodValue: 1,
  },
  {
    id: 'card_gasoline_001',
    type: 'item',
    name: 'Gasoline Can',
    description: 'Explosive area damage when thrown at enemies',
    status: 'healthy',
    exhausted: false,
    recoveryTime: 0,
    itemType: 'consumable',
    category: 'action',
    bonusAttributes: {
      combat: 35,
    },
  },

  // SEEDS
  {
    id: 'card_vegseeds_001',
    type: 'item',
    name: 'Vegetable Seeds',
    description: 'Plant at home — grows into 3 food in 4 days',
    status: 'healthy',
    exhausted: false,
    recoveryTime: 0,
    itemType: 'consumable',
    category: 'seed',
  },
  {
    id: 'card_herbseeds_001',
    type: 'item',
    name: 'Herb Seeds',
    description: 'Medicinal plants — yields 2 food + 1 medical supply in 4 days',
    status: 'healthy',
    exhausted: false,
    recoveryTime: 0,
    itemType: 'consumable',
    category: 'seed',
  },

  // ACTIONS
  {
    id: 'card_scout_001',
    type: 'action',
    name: 'Scout Ahead',
    description: 'See the next encounter before choosing cards',
    status: 'healthy',
    exhausted: false,
    recoveryTime: 2,
    itemType: 'action',
  },
  {
    id: 'card_barricade_001',
    type: 'action',
    name: 'Barricade',
    description: 'All survivors gain +30% defense this turn',
    status: 'healthy',
    exhausted: false,
    recoveryTime: 1,
    itemType: 'action',
    bonusAttributes: {
      defense: 30,
    },
  },
  {
    id: 'card_medical_001',
    type: 'action',
    name: 'Medical Protocols',
    description: 'Heal all survivors for 20 HP',
    status: 'healthy',
    exhausted: false,
    recoveryTime: 1,
    itemType: 'action',
    bonusAttributes: {
      healing: 20,
    },
  },
  {
    id: 'card_retreat_001',
    type: 'action',
    name: 'Tactical Retreat',
    description: 'Avoid this encounter entirely, discard 2 random cards',
    status: 'healthy',
    exhausted: false,
    recoveryTime: 0,
    itemType: 'action',
  },
];

export function getCardById(id: string): Card | undefined {
  return STARTER_CARDS.find((card) => card.id === id);
}

export function getCardsByType(type: string): Card[] {
  return STARTER_CARDS.filter((card) => card.type === type);
}

export function getSurvivorCards(): Card[] {
  return STARTER_CARDS.filter((card) => card.type === 'survivor');
}

export function getItemCards(): Card[] {
  return STARTER_CARDS.filter((card) => card.type === 'item');
}

export function getActionCards(): Card[] {
  return STARTER_CARDS.filter((card) => card.type === 'action');
}
