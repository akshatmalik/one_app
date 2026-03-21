import { CardInstance, Synergy } from './types';

// Synergy database — when these card IDs are played together, bonuses apply
export const SYNERGY_DATABASE: Synergy[] = [
  // Fighter + Weapon synergies
  {
    id: 'syn_marcus_rifle',
    cardIds: ['card_marcus_001', 'card_rifle_001'],
    name: 'Marksman',
    description: 'Marcus + Rifle: Deadly accuracy',
    damageBonus: 15,
    defenseBonus: 0,
    healingBonus: 0,
  },
  {
    id: 'syn_marcus_shotgun',
    cardIds: ['card_marcus_001', 'card_shotgun_001'],
    name: 'Heavy Hitter',
    description: 'Marcus + Shotgun: Devastating close-range',
    damageBonus: 20,
    defenseBonus: 0,
    healingBonus: 0,
  },
  // Healer + Medical synergies
  {
    id: 'syn_sarah_medkit',
    cardIds: ['card_sarah_001', 'card_medkit_001'],
    name: 'Field Medic',
    description: 'Sarah + Medical Kit: Expert healing',
    damageBonus: 0,
    defenseBonus: 5,
    healingBonus: 25,
  },
  {
    id: 'syn_lisa_medkit',
    cardIds: ['card_lisa_001', 'card_medkit_001'],
    name: 'Medical Authority',
    description: 'Dr. Park + Medical Kit: Scientific healing',
    damageBonus: 0,
    defenseBonus: 0,
    healingBonus: 30,
  },
  {
    id: 'syn_lisa_antibiotics',
    cardIds: ['card_lisa_001', 'card_antibiotics_001'],
    name: 'Pharmacist',
    description: 'Dr. Park + Antibiotics: Maximum effectiveness',
    damageBonus: 0,
    defenseBonus: 10,
    healingBonus: 20,
  },
  // Scout synergies
  {
    id: 'syn_james_goggles',
    cardIds: ['card_james_001', 'card_goggles_001'],
    name: 'Night Stalker',
    description: 'James + Night Vision: Perfect awareness',
    damageBonus: 10,
    defenseBonus: 15,
    healingBonus: 0,
  },
  {
    id: 'syn_james_scout',
    cardIds: ['card_james_001', 'card_scout_001'],
    name: 'Recon Expert',
    description: 'James + Scout Ahead: Undetectable',
    damageBonus: 5,
    defenseBonus: 20,
    healingBonus: 0,
  },
  // Mechanic synergies
  {
    id: 'syn_elena_barricade',
    cardIds: ['card_elena_001', 'card_barricade_001'],
    name: 'Fortification',
    description: 'Elena + Barricade: Reinforced defenses',
    damageBonus: 0,
    defenseBonus: 25,
    healingBonus: 0,
  },
  {
    id: 'syn_elena_flak',
    cardIds: ['card_elena_001', 'card_flak_001'],
    name: 'Armored Up',
    description: 'Elena + Flak Vest: Modified armor',
    damageBonus: 5,
    defenseBonus: 20,
    healingBonus: 0,
  },
  // Survivor pair synergies
  {
    id: 'syn_marcus_james',
    cardIds: ['card_marcus_001', 'card_james_001'],
    name: 'Assault Team',
    description: 'Marcus + James: Coordinated strike',
    damageBonus: 12,
    defenseBonus: 5,
    healingBonus: 0,
  },
  {
    id: 'syn_sarah_lisa',
    cardIds: ['card_sarah_001', 'card_lisa_001'],
    name: 'Medical Team',
    description: 'Sarah + Dr. Park: Double healing',
    damageBonus: 0,
    defenseBonus: 10,
    healingBonus: 20,
  },
  // Action synergies
  {
    id: 'syn_sarah_medical_protocols',
    cardIds: ['card_sarah_001', 'card_medical_001'],
    name: 'Triage Expert',
    description: 'Sarah + Medical Protocols: Enhanced recovery',
    damageBonus: 0,
    defenseBonus: 5,
    healingBonus: 15,
  },
  {
    id: 'syn_marcus_barricade',
    cardIds: ['card_marcus_001', 'card_barricade_001'],
    name: 'Hold the Line',
    description: 'Marcus + Barricade: Defensive fighter',
    damageBonus: 8,
    defenseBonus: 15,
    healingBonus: 0,
  },
];

/**
 * Detect all active synergies from a set of played cards
 */
export function detectSynergies(cards: CardInstance[]): Synergy[] {
  const cardIds = new Set(cards.map(c => c.id));
  return SYNERGY_DATABASE.filter(syn =>
    syn.cardIds.every(id => cardIds.has(id))
  );
}

/**
 * Get total synergy bonuses from triggered synergies
 */
export function getSynergyBonuses(synergies: Synergy[]): {
  damageBonus: number;
  defenseBonus: number;
  healingBonus: number;
} {
  return synergies.reduce(
    (acc, syn) => ({
      damageBonus: acc.damageBonus + syn.damageBonus,
      defenseBonus: acc.defenseBonus + syn.defenseBonus,
      healingBonus: acc.healingBonus + syn.healingBonus,
    }),
    { damageBonus: 0, defenseBonus: 0, healingBonus: 0 }
  );
}

/**
 * Check if adding a card would create any new synergies with existing selection
 */
export function checkPotentialSynergies(
  existingCards: CardInstance[],
  newCard: CardInstance
): Synergy[] {
  const allCards = [...existingCards, newCard];
  const existingSynergies = detectSynergies(existingCards);
  const allSynergies = detectSynergies(allCards);
  return allSynergies.filter(s => !existingSynergies.some(es => es.id === s.id));
}
