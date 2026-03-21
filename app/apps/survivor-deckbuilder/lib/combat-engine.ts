import { CardInstance, Enemy, Encounter, CombatResult, DamageBreakdown, Synergy } from './types';
import { detectSynergies, getSynergyBonuses } from './synergies';

const BASE_SURVIVOR_DAMAGE = 25;

/**
 * Calculate total damage dealt by played cards to enemies
 */
function calculateDamageDealt(
  cardsPlayed: CardInstance[],
  allSurvivors: CardInstance[]
): { total: number; breakdown: Pick<DamageBreakdown, 'baseSurvivorDamage' | 'attributeBonus' | 'itemBonus' | 'synergyBonus'> } {
  let baseSurvivorDamage = 0;
  let attributeBonus = 0;
  let itemBonus = 0;

  cardsPlayed.forEach(card => {
    if (card.type === 'survivor') {
      baseSurvivorDamage += BASE_SURVIVOR_DAMAGE;
      const combat = card.attributes?.combat ?? 0;
      attributeBonus += Math.round(BASE_SURVIVOR_DAMAGE * (combat / 100));
    } else if (card.type === 'item' && card.bonusAttributes?.combat) {
      // Items add their combat bonus as flat damage
      itemBonus += card.bonusAttributes.combat;
    } else if (card.type === 'action' && card.bonusAttributes?.combat) {
      itemBonus += card.bonusAttributes.combat;
    }
  });

  // Synergy bonuses
  const synergies = detectSynergies(cardsPlayed);
  const synergyBonuses = getSynergyBonuses(synergies);
  const synergyBonus = synergyBonuses.damageBonus;

  const total = baseSurvivorDamage + attributeBonus + itemBonus + synergyBonus;

  return {
    total: Math.round(total),
    breakdown: { baseSurvivorDamage, attributeBonus, itemBonus, synergyBonus },
  };
}

/**
 * Calculate player defense percentage from played cards
 */
function calculatePlayerDefense(cardsPlayed: CardInstance[]): number {
  let defense = 0;

  cardsPlayed.forEach(card => {
    if (card.type === 'survivor' && card.attributes?.defense) {
      defense += card.attributes.defense;
    }
    if (card.bonusAttributes?.defense) {
      defense += card.bonusAttributes.defense;
    }
  });

  // Add synergy defense bonuses
  const synergies = detectSynergies(cardsPlayed);
  const synergyBonuses = getSynergyBonuses(synergies);
  defense += synergyBonuses.defenseBonus;

  // Cap defense at 80%
  return Math.min(defense, 80);
}

/**
 * Calculate healing from played cards
 */
function calculateHealing(cardsPlayed: CardInstance[]): number {
  let healing = 0;

  cardsPlayed.forEach(card => {
    if (card.bonusAttributes?.healing) {
      healing += card.bonusAttributes.healing;
    }
    // Medical Protocols action card heals 20 HP
    if (card.id === 'card_medical_001') {
      healing += 20;
    }
  });

  // Add synergy healing bonuses
  const synergies = detectSynergies(cardsPlayed);
  const synergyBonuses = getSynergyBonuses(synergies);
  healing += synergyBonuses.healingBonus;

  return healing;
}

/**
 * Distribute damage across enemies (spread evenly, then focus remaining)
 */
function applyDamageToEnemies(enemies: Enemy[], totalDamage: number): Enemy[] {
  const alive = enemies.filter(e => e.health > 0);
  if (alive.length === 0 || totalDamage <= 0) return enemies;

  // Distribute damage evenly then apply remainder to first alive enemy
  const damagePerEnemy = Math.floor(totalDamage / alive.length);
  let remainingDamage = totalDamage - damagePerEnemy * alive.length;

  return enemies.map(enemy => {
    if (enemy.health <= 0) return { ...enemy, health: 0 };

    let dmg = damagePerEnemy;
    if (remainingDamage > 0) {
      // Apply defense reduction per enemy
      const effectiveDmg = Math.max(1, dmg - enemy.defense);
      remainingDamage--;
      return { ...enemy, health: Math.max(0, enemy.health - effectiveDmg - 1) };
    }
    const effectiveDmg = Math.max(1, dmg - enemy.defense);
    return { ...enemy, health: Math.max(0, enemy.health - effectiveDmg) };
  });
}

/**
 * Distribute enemy damage across survivors
 */
function applyDamageToSurvivors(
  survivors: CardInstance[],
  totalDamage: number
): CardInstance[] {
  const alive = survivors.filter(s => (s.currentHealth ?? 100) > 0);
  if (alive.length === 0 || totalDamage <= 0) return survivors;

  // Split damage evenly across alive survivors
  const damagePerSurvivor = Math.ceil(totalDamage / alive.length);

  return survivors.map(survivor => {
    if ((survivor.currentHealth ?? 100) <= 0) return survivor;

    const newHealth = Math.max(0, (survivor.currentHealth ?? 100) - damagePerSurvivor);
    return {
      ...survivor,
      currentHealth: newHealth,
      status: newHealth <= 0 ? 'exhausted' as const : survivor.status,
    };
  });
}

/**
 * Apply healing to survivors
 */
function applyHealingToSurvivors(
  survivors: CardInstance[],
  totalHealing: number
): CardInstance[] {
  if (totalHealing <= 0) return survivors;

  const alive = survivors.filter(s => (s.currentHealth ?? 100) > 0);
  const healPerSurvivor = Math.floor(totalHealing / Math.max(alive.length, 1));

  return survivors.map(survivor => {
    if ((survivor.currentHealth ?? 100) <= 0) return survivor;

    const maxHP = survivor.maxHealth ?? 100;
    const newHealth = Math.min(maxHP, (survivor.currentHealth ?? 100) + healPerSurvivor);
    return { ...survivor, currentHealth: newHealth };
  });
}

/**
 * Main combat resolution function
 * Returns the full result of playing cards against an encounter
 */
export function resolveCombat(
  cardsPlayed: CardInstance[],
  encounter: Encounter,
  activeSurvivors: CardInstance[]
): CombatResult {
  const enemies = (encounter.enemies ?? []).map(e => ({ ...e }));
  const synergiesTriggered = detectSynergies(cardsPlayed);

  // 1. Calculate damage dealt
  const { total: damageDealt, breakdown } = calculateDamageDealt(cardsPlayed, activeSurvivors);

  // 2. Apply damage to enemies
  const enemiesAfterDamage = applyDamageToEnemies(enemies, damageDealt);

  // 3. Check if all enemies defeated
  const allDefeated = enemiesAfterDamage.every(e => e.health <= 0);

  if (allDefeated) {
    // Victory — no counter-damage, apply healing
    const healing = calculateHealing(cardsPlayed);
    const survivorsAfterHeal = applyHealingToSurvivors(activeSurvivors, healing);

    return {
      damageDealt,
      damageTaken: 0,
      healingDone: healing,
      enemiesAfter: enemiesAfterDamage,
      survivorsAfter: survivorsAfterHeal,
      synergiesTriggered,
      damageBreakdown: {
        ...breakdown,
        totalDamageDealt: damageDealt,
        totalEnemyDamage: 0,
        defenseReduction: 0,
        netDamageTaken: 0,
      },
      result: 'player-victory',
    };
  }

  // 4. Calculate enemy counter-damage (only surviving enemies attack)
  const aliveEnemies = enemiesAfterDamage.filter(e => e.health > 0);
  const totalEnemyDamage = aliveEnemies.reduce((sum, e) => sum + e.damage, 0);
  const playerDefense = calculatePlayerDefense(cardsPlayed);
  const defenseReduction = Math.round(totalEnemyDamage * (playerDefense / 100));
  const netDamageTaken = Math.max(0, totalEnemyDamage - defenseReduction);

  // 5. Apply damage to survivors
  let survivorsAfter = applyDamageToSurvivors(activeSurvivors, netDamageTaken);

  // 6. Apply healing
  const healing = calculateHealing(cardsPlayed);
  survivorsAfter = applyHealingToSurvivors(survivorsAfter, healing);

  // 7. Check if all survivors dead
  const allSurvivorsDead = survivorsAfter.every(s => (s.currentHealth ?? 0) <= 0);

  return {
    damageDealt,
    damageTaken: netDamageTaken,
    healingDone: healing,
    enemiesAfter: enemiesAfterDamage,
    survivorsAfter,
    synergiesTriggered,
    damageBreakdown: {
      ...breakdown,
      totalDamageDealt: damageDealt,
      totalEnemyDamage,
      defenseReduction,
      netDamageTaken,
    },
    result: allSurvivorsDead ? 'player-loss' : 'combat-continues',
  };
}

/**
 * Check if a tactical retreat card is in the played cards
 */
export function isTacticalRetreat(cardsPlayed: CardInstance[]): boolean {
  return cardsPlayed.some(c => c.id === 'card_retreat_001');
}

/**
 * Draw N random cards from available cards (not yet played in this run)
 */
export function drawCards(
  deck: CardInstance[],
  playedCardIds: string[],
  count: number
): CardInstance[] {
  const available = deck.filter(c => !playedCardIds.includes(c.id));
  const shuffled = [...available].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Validate a deck for expedition launch
 */
export function validateDeck(selected: CardInstance[]): { valid: boolean; error?: string } {
  const survivors = selected.filter(c => c.type === 'survivor');
  const nonSurvivors = selected.filter(c => c.type !== 'survivor');
  const total = selected.length;

  if (survivors.length !== 2) {
    return { valid: false, error: 'Select exactly 2 survivors' };
  }
  if (nonSurvivors.length < 2) {
    return { valid: false, error: 'Select at least 2 items or actions' };
  }
  if (nonSurvivors.length > 5) {
    return { valid: false, error: 'Maximum 5 items/actions' };
  }
  if (total < 4 || total > 7) {
    return { valid: false, error: 'Deck must be 4-7 cards total' };
  }
  const exhausted = selected.filter(c => c.exhausted);
  if (exhausted.length > 0) {
    return { valid: false, error: `${exhausted.map(c => c.name).join(', ')} still recovering` };
  }

  return { valid: true };
}
