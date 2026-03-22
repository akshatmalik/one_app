import { CardInstance, Enemy, Encounter, CombatResult, DamageBreakdown, Synergy, CombatCombo } from './types';
import { detectSynergies, getSynergyBonuses } from './synergies';
import { COMBO_DEFS, ENEMY_TYPE_DEFS, STAGE_CONDITION_DEFS } from './registry';

const BASE_SURVIVOR_DAMAGE = 25;

// ── Combo detection ────────────────────────────────────────────────────

/**
 * Detect all combos from selected cards.
 * A combo fires if ALL its cardIds appear in the selected set.
 */
export function detectCombos(cardsPlayed: CardInstance[]): CombatCombo[] {
  const playedIds = new Set(cardsPlayed.map(c => c.id.split('_').slice(0, -1).join('_') + '_001'));
  // Also try base IDs without suffix (cards may have unique suffixes from makeLootInstance)
  const playedBaseIds = new Set(cardsPlayed.map(c => {
    // Strip the unique suffix — card IDs follow pattern card_name_001 or card_name_001_<suffix>
    const parts = c.id.split('_');
    // Last part is either '001' or a random suffix — if length > 3, strip last segment
    if (parts.length > 3) return parts.slice(0, -1).join('_');
    return c.id;
  }));

  const fired: CombatCombo[] = [];
  for (const def of COMBO_DEFS) {
    const allPresent = def.cardIds.every(requiredId =>
      cardsPlayed.some(c => c.id === requiredId || c.id.startsWith(requiredId))
    );
    if (allPresent) {
      fired.push({
        id: def.id,
        label: def.label,
        icon: def.icon,
        dmgBonus: def.dmgBonus,
        hlgBonus: def.hlgBonus,
        defBonus: def.defBonus,
      });
    }
  }
  return fired;
}

// ── Item wear ──────────────────────────────────────────────────────────

/**
 * Get damage multiplier from weapon wear.
 * wear 0 = 1.0 (full), 1 = 0.9, 2 = 0.75, 3 = 0.6, 4 = 0.0 (broken)
 */
export function getWearMultiplier(wear: number): number {
  const multipliers: Record<number, number> = { 0: 1.0, 1: 0.9, 2: 0.75, 3: 0.6, 4: 0.0 };
  return multipliers[wear] ?? 1.0;
}

/**
 * Check if a weapon jams (worn weapons + rain condition).
 * Returns true if the weapon shot fails.
 */
function checkWeaponJam(card: CardInstance, encounter: Encounter): boolean {
  const wear = card.wear ?? 0;
  let jamChance = 0;
  if (wear >= 2) jamChance += 0.1; // worn
  if (wear >= 3) jamChance += 0.2; // damaged — frequent jams
  // Rain condition stacks jam chance
  const rainCond = STAGE_CONDITION_DEFS.rain;
  if (encounter.conditions?.includes('rain') && rainCond.weaponJamChance) {
    jamChance += rainCond.weaponJamChance;
  }
  return Math.random() < jamChance;
}

// ── Enemy type modifiers ───────────────────────────────────────────────

/**
 * Apply enemy type counterpick modifiers to damage and healing.
 * Returns { dmgMultiplier, hlgMultiplier, typeModifier, firstStrikeDef }
 */
function applyTypeModifiers(
  cardsPlayed: CardInstance[],
  encounter: Encounter
): { dmgMultiplier: number; hlgMultiplier: number; typeModifier: number; firstStrikeDef: number } {
  const enemyType = encounter.enemyType ?? 'straggler';
  const def = ENEMY_TYPE_DEFS[enemyType];

  const playedCategories = new Set(cardsPlayed.map(c => c.category));
  const playedCardIds = cardsPlayed.map(c => c.id);

  // Check if any counter card is played
  const isCountered = def.counterCardIds.some(id =>
    playedCardIds.some(pid => pid === id || pid.startsWith(id))
  ) || def.weaknesses.some(w => playedCategories.has(w as any));

  // Armored: only countered by weapons with combat 40+ (Rifle or Shotgun)
  const hasHighAtkWeapon = cardsPlayed.some(c =>
    c.category === 'weapon' && (c.bonusAttributes?.combat ?? 0) >= 40
  );

  let dmgMultiplier = 1.0;
  let hlgMultiplier = 1.0;
  let firstStrikeDef = 0;

  switch (enemyType) {
    case 'horde':
      dmgMultiplier = isCountered ? def.counterBonus : def.failPenalty;
      break;
    case 'infected':
      hlgMultiplier = isCountered ? def.counterBonus : 1.0;
      break;
    case 'armored':
      dmgMultiplier = hasHighAtkWeapon ? def.counterBonus : def.failPenalty;
      break;
    case 'ambush': {
      const hasPerception = cardsPlayed.some(c =>
        c.id === 'card_goggles_001' || c.id.startsWith('card_goggles') ||
        c.id === 'card_scout_001' || c.id.startsWith('card_scout')
      );
      if (hasPerception) {
        firstStrikeDef = 20; // first strike bonus — bonus DEF
      } else {
        dmgMultiplier = def.failPenalty; // -30% DEF (applied as reduced damage)
      }
      break;
    }
    case 'raiders': {
      // Full mixed deck (survivors + weapons) = bonus
      const hasSurvivor = cardsPlayed.some(c => c.type === 'survivor');
      const hasWeapon = cardsPlayed.some(c => c.category === 'weapon');
      if (hasSurvivor && hasWeapon) {
        dmgMultiplier = def.counterBonus;
        hlgMultiplier = def.counterBonus;
      }
      break;
    }
    default:
      break;
  }

  return { dmgMultiplier, hlgMultiplier, typeModifier: dmgMultiplier, firstStrikeDef };
}

// ── Stage condition effects ────────────────────────────────────────────

/**
 * Apply stage conditions to modify damage dealt and determine infections.
 * Returns adjusted damage and any new infections.
 */
function applyConditionEffects(
  cardsPlayed: CardInstance[],
  encounter: Encounter,
  baseDamage: number,
  survivors: CardInstance[]
): { adjustedDamage: number; newInfections: string[] } {
  if (!encounter.conditions || encounter.conditions.length === 0) {
    return { adjustedDamage: baseDamage, newInfections: [] };
  }

  let adjustedDamage = baseDamage;
  const newInfections: string[] = [];

  for (const cond of encounter.conditions) {
    const condDef = STAGE_CONDITION_DEFS[cond];

    // Night: perception penalty unless goggles equipped
    if (cond === 'night') {
      const hasGoggles = cardsPlayed.some(c =>
        c.id === 'card_goggles_001' || c.id.startsWith('card_goggles')
      );
      if (!hasGoggles && condDef.perceptionPenalty) {
        adjustedDamage = Math.round(adjustedDamage * (1 - condDef.perceptionPenalty));
      }
    }

    // Infected zone: each hit on survivor carries extra infection risk
    if (cond === 'infected_zone' && condDef.infectionChanceOnHit) {
      const hasMedical = cardsPlayed.some(c => c.category === 'medical');
      if (!hasMedical) {
        for (const s of survivors) {
          if ((s.currentHealth ?? 100) > 0 && !s.infected) {
            if (Math.random() < condDef.infectionChanceOnHit) {
              newInfections.push(s.id);
            }
          }
        }
      }
    }
  }

  return { adjustedDamage, newInfections };
}

// ── Core damage calculation ────────────────────────────────────────────

function calculateDamageDealt(
  cardsPlayed: CardInstance[],
  encounter: Encounter
): { total: number; breakdown: Pick<DamageBreakdown, 'baseSurvivorDamage' | 'attributeBonus' | 'itemBonus' | 'synergyBonus'> } {
  let baseSurvivorDamage = 0;
  let attributeBonus = 0;
  let itemBonus = 0;

  cardsPlayed.forEach(card => {
    if (card.type === 'survivor') {
      baseSurvivorDamage += BASE_SURVIVOR_DAMAGE;
      const combat = card.attributes?.combat ?? 0;
      attributeBonus += Math.round(BASE_SURVIVOR_DAMAGE * (combat / 100));
    } else if (card.category === 'weapon') {
      const rawBonus = card.bonusAttributes?.combat ?? 0;
      const wearMult = getWearMultiplier(card.wear ?? 0);
      const jammed = checkWeaponJam(card, encounter);
      if (!jammed) {
        itemBonus += Math.round(rawBonus * wearMult);
      }
      // Jammed = weapon fires but deals 0 — ammo consumed (tracked by useGame)
    } else if (card.type === 'item' && card.bonusAttributes?.combat) {
      itemBonus += card.bonusAttributes.combat;
    } else if (card.type === 'action' && card.bonusAttributes?.combat) {
      itemBonus += card.bonusAttributes.combat;
    }
  });

  // Synergy bonuses
  const synergies = detectSynergies(cardsPlayed);
  const synergyBonuses = getSynergyBonuses(synergies);
  const synergyBonus = synergyBonuses.damageBonus;

  // Combo bonuses
  const combos = detectCombos(cardsPlayed);
  const comboBonus = combos.reduce((sum, c) => sum + c.dmgBonus, 0);

  const total = baseSurvivorDamage + attributeBonus + itemBonus + synergyBonus + comboBonus;

  return {
    total: Math.round(total),
    breakdown: { baseSurvivorDamage, attributeBonus, itemBonus, synergyBonus },
  };
}

function calculatePlayerDefense(cardsPlayed: CardInstance[], firstStrikeDef: number): number {
  let defense = firstStrikeDef;

  cardsPlayed.forEach(card => {
    if (card.type === 'survivor' && card.attributes?.defense) {
      defense += card.attributes.defense;
    }
    if (card.bonusAttributes?.defense) {
      defense += card.bonusAttributes.defense;
    }
  });

  const synergies = detectSynergies(cardsPlayed);
  const synergyBonuses = getSynergyBonuses(synergies);
  defense += synergyBonuses.defenseBonus;

  const combos = detectCombos(cardsPlayed);
  defense += combos.reduce((sum, c) => sum + c.defBonus, 0);

  return Math.min(defense, 80);
}

function calculateHealing(cardsPlayed: CardInstance[]): number {
  let healing = 0;

  cardsPlayed.forEach(card => {
    if (card.bonusAttributes?.healing) {
      healing += card.bonusAttributes.healing;
    }
    if (card.id === 'card_medical_001') {
      healing += 20;
    }
  });

  const synergies = detectSynergies(cardsPlayed);
  const synergyBonuses = getSynergyBonuses(synergies);
  healing += synergyBonuses.healingBonus;

  const combos = detectCombos(cardsPlayed);
  healing += combos.reduce((sum, c) => sum + c.hlgBonus, 0);

  return healing;
}

function applyDamageToEnemies(enemies: Enemy[], totalDamage: number, encounter: Encounter): Enemy[] {
  if (totalDamage <= 0) return enemies;

  const result = enemies.map(e => ({ ...e }));
  let remaining = totalDamage;

  // Fortified condition: +50 DEF unless Scout Ahead played
  // (Scout Ahead is detected during modifier phase — if fortified still in conditions, apply it)
  const fortifiedActive = encounter.conditions?.includes('fortified');
  if (fortifiedActive) {
    // Scout Ahead check already done during type modifier phase
    // If it's still active here, add enemy defense
  }

  const aliveIndices = result
    .map((e, i) => ({ index: i, health: e.health }))
    .filter(e => e.health > 0)
    .sort((a, b) => a.health - b.health);

  for (const { index } of aliveIndices) {
    if (remaining <= 0) break;
    const enemy = result[index];
    const effectiveDmg = Math.max(1, remaining - enemy.defense);
    const actualDmg = Math.min(enemy.health, effectiveDmg);
    enemy.health = Math.max(0, enemy.health - actualDmg);
    remaining -= actualDmg + Math.min(enemy.defense, remaining);
    remaining = Math.max(0, remaining);
  }

  return result;
}

function applyDamageToSurvivors(survivors: CardInstance[], totalDamage: number): CardInstance[] {
  const alive = survivors.filter(s => (s.currentHealth ?? 100) > 0);
  if (alive.length === 0 || totalDamage <= 0) return survivors;

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

function applyHealingToSurvivors(survivors: CardInstance[], totalHealing: number): CardInstance[] {
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
 * Apply infection to named survivors.
 * Infected survivors lose 10 HP/day until cured with Antibiotics.
 */
function applyInfections(
  survivors: CardInstance[],
  infectIds: string[]
): CardInstance[] {
  if (infectIds.length === 0) return survivors;
  return survivors.map(s =>
    infectIds.includes(s.id) ? { ...s, infected: true, infectionDaysLeft: 3 } : s
  );
}

// ── Main combat resolution ─────────────────────────────────────────────

/**
 * Resolve combat with all new systems:
 * - Combo flash bonuses
 * - Enemy type counterpick modifiers
 * - Stage conditions (night, rain, infected zone, fortified, fog, timed)
 * - Item wear penalties + jam chance
 * - Infection application
 */
export function resolveCombat(
  cardsPlayed: CardInstance[],
  encounter: Encounter,
  activeSurvivors: CardInstance[]
): CombatResult {
  const enemies = (encounter.enemies ?? []).map(e => ({ ...e }));
  const synergiesTriggered: Synergy[] = detectSynergies(cardsPlayed);
  const combosFired = detectCombos(cardsPlayed);

  // 1. Type modifiers
  const { dmgMultiplier, hlgMultiplier, typeModifier, firstStrikeDef } =
    applyTypeModifiers(cardsPlayed, encounter);

  // 2. Calculate raw damage
  const { total: rawDamage, breakdown } = calculateDamageDealt(cardsPlayed, encounter);

  // 3. Apply type damage multiplier
  let damageDealt = Math.round(rawDamage * dmgMultiplier);

  // 4. Apply stage condition effects to damage and check for infections
  const { adjustedDamage, newInfections: condInfections } = applyConditionEffects(
    cardsPlayed, encounter, damageDealt, activeSurvivors
  );
  damageDealt = adjustedDamage;

  // 5. Scout Ahead removes Fortified condition bonus
  const hasScouted = cardsPlayed.some(c =>
    c.id === 'card_scout_001' || c.id.startsWith('card_scout')
  );
  const effectiveEnemies = enemies.map(e => {
    if (encounter.conditions?.includes('fortified') && !hasScouted) {
      return { ...e, defense: e.defense + 50 };
    }
    return { ...e };
  });

  // 6. Apply damage to enemies
  const enemiesAfterDamage = applyDamageToEnemies(effectiveEnemies, damageDealt, encounter);
  const allDefeated = enemiesAfterDamage.every(e => e.health <= 0);

  // 7. Calculate healing
  const rawHealing = calculateHealing(cardsPlayed);
  const healing = Math.round(rawHealing * hlgMultiplier);

  if (allDefeated) {
    let survivorsAfter = applyHealingToSurvivors(activeSurvivors, healing);
    // Check for infections from enemy type (infected enemies that survived long enough to bite)
    const enemyInfections = getEnemyInfections(encounter, enemiesAfterDamage, activeSurvivors);
    const allInfections = [...condInfections, ...enemyInfections];
    survivorsAfter = applyInfections(survivorsAfter, allInfections);

    return {
      damageDealt,
      damageTaken: 0,
      healingDone: healing,
      enemiesAfter: enemiesAfterDamage,
      survivorsAfter,
      synergiesTriggered,
      damageBreakdown: {
        ...breakdown,
        totalDamageDealt: damageDealt,
        totalEnemyDamage: 0,
        defenseReduction: 0,
        netDamageTaken: 0,
      },
      result: 'player-victory',
      combosFired,
      typeModifier,
      infectionsApplied: allInfections,
    };
  }

  // 8. Enemy counter-attack
  const aliveEnemies = enemiesAfterDamage.filter(e => e.health > 0);
  const totalEnemyDamage = aliveEnemies.reduce((sum, e) => sum + e.damage, 0);
  const playerDefense = calculatePlayerDefense(cardsPlayed, firstStrikeDef);
  const defenseReduction = Math.round(totalEnemyDamage * (playerDefense / 100));
  const netDamageTaken = Math.max(0, totalEnemyDamage - defenseReduction);

  // 9. Apply damage to survivors
  let survivorsAfter = applyDamageToSurvivors(activeSurvivors, netDamageTaken);

  // 10. Apply healing
  survivorsAfter = applyHealingToSurvivors(survivorsAfter, healing);

  // 11. Check infections (surviving infected enemies attack)
  const enemyInfections = getEnemyInfections(encounter, enemiesAfterDamage, survivorsAfter);
  const allInfections = [...condInfections, ...enemyInfections];
  survivorsAfter = applyInfections(survivorsAfter, allInfections);

  // 12. Check if all survivors dead
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
    combosFired,
    typeModifier,
    infectionsApplied: allInfections,
  };
}

/**
 * Determine which survivors get infected by surviving enemy attacks.
 * Only Infected enemy type triggers this.
 */
function getEnemyInfections(
  encounter: Encounter,
  enemiesAfter: Enemy[],
  survivors: CardInstance[]
): string[] {
  if (encounter.enemyType !== 'infected') return [];

  const typeDef = ENEMY_TYPE_DEFS.infected;
  if (!typeDef.infectOnHit || !typeDef.infectChance) return [];

  const survivingEnemyCount = enemiesAfter.filter(e => e.health > 0).length;
  if (survivingEnemyCount === 0) return [];

  const infectChance = typeDef.infectChance;
  const infected: string[] = [];

  for (const s of survivors) {
    if ((s.currentHealth ?? 100) > 0 && !s.infected) {
      if (Math.random() < infectChance) {
        infected.push(s.id);
      }
    }
  }

  return infected;
}

// ── Utility exports ────────────────────────────────────────────────────

export function isTacticalRetreat(cardsPlayed: CardInstance[]): boolean {
  return cardsPlayed.some(c => c.id === 'card_retreat_001');
}

export function drawCards(
  deck: CardInstance[],
  playedCardIds: string[],
  count: number
): CardInstance[] {
  const available = deck.filter(c => !playedCardIds.includes(c.id));
  const shuffled = [...available].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function validateDeck(selected: CardInstance[], mode: 'sprint' | 'siege' = 'siege'): { valid: boolean; error?: string } {
  const survivors = selected.filter(c => c.type === 'survivor');
  const nonSurvivors = selected.filter(c => c.type !== 'survivor');
  const total = selected.length;

  if (survivors.length !== 2) {
    return { valid: false, error: 'Select exactly 2 survivors' };
  }
  if (nonSurvivors.length < 2) {
    return { valid: false, error: 'Select at least 2 items or actions' };
  }

  if (mode === 'sprint') {
    if (total > 4) {
      return { valid: false, error: 'Sprint mode: maximum 4 cards (2 survivors + 2 items)' };
    }
  } else {
    if (nonSurvivors.length > 5) {
      return { valid: false, error: 'Maximum 5 items/actions' };
    }
    if (total < 4 || total > 7) {
      return { valid: false, error: 'Deck must be 4-7 cards total' };
    }
  }

  const exhausted = selected.filter(c => c.exhausted);
  if (exhausted.length > 0) {
    return { valid: false, error: `${exhausted.map(c => c.name).join(', ')} still recovering` };
  }

  // Broken weapons warning
  const brokenWeapons = selected.filter(c => c.category === 'weapon' && (c.wear ?? 0) >= 4);
  if (brokenWeapons.length > 0) {
    return { valid: false, error: `${brokenWeapons.map(c => c.name).join(', ')} is broken — repair at workshop` };
  }

  return { valid: true };
}
