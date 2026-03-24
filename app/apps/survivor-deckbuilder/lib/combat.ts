import { Survivor, Zombie, NoiseEvent, NoiseRipple, LootItem, TerrainTile, Coord } from './types';
import { manhattan, isFlanking, directionDelta, oppositeDir, inBounds, isObstacle, hasLineOfSight, getAdjacentCoords, coordToDir } from './grid';
import { getNoiseIntensity } from './noise';
import { ALERT_INVESTIGATE_TURNS, BRICK_ALERT_TURNS, FLARE_ALERT_TURNS } from './constants';

export interface AttackResult {
  survivors: Survivor[];
  zombies: Zombie[];
  noiseEvents: NoiseEvent[];
  noiseRipples: NoiseRipple[];
  loot: LootItem[];
  terrain: TerrainTile[];
  messages: string[];
  nerveChange: number;
}

export function processAttack(
  survivorId: number,
  zombieId: number,
  survivorsIn: Survivor[],
  zombiesIn: Zombie[],
  lootIn: LootItem[],
  terrainIn: TerrainTile[],
  nextLootId: number,
  weaponIdx?: number
): AttackResult {
  const survivors = survivorsIn.map(s => ({ ...s, inventory: [...s.inventory], statusEffects: [...s.statusEffects] }));
  const zombies = zombiesIn.map(z => ({ ...z }));
  let loot = lootIn.map(l => ({ ...l, item: { ...l.item } }));
  let terrain = terrainIn.map(t => ({ ...t }));
  const noiseEvents: NoiseEvent[] = [];
  const noiseRipples: NoiseRipple[] = [];
  const messages: string[] = [];
  let nerveChange = 0;

  const s = survivors.find(sv => sv.id === survivorId)!;
  const z = zombies.find(zz => zz.id === zombieId)!;
  const weapon = (weaponIdx !== undefined && s.inventory[weaponIdx]?.type === "weapon")
    ? s.inventory[weaponIdx]
    : s.inventory.find(i => i.type === "weapon")!;

  const isRanged = (weapon.rangedRange ?? 0) > 0;
  let damage = weapon.damage ?? 1;
  const noiseR = weapon.noiseRadius;

  // Flanking bonus: +1 damage — requires an ally on the OPPOSITE (front) side of the zombie simultaneously
  if (!isRanged && isFlanking(s, z)) {
    const frontDelta = directionDelta(z.facing);
    const allyInFront = survivors.some(sv =>
      sv.id !== survivorId &&
      sv.state === "active" &&
      sv.x === z.x + frontDelta.x &&
      sv.y === z.y + frontDelta.y
    );
    if (allyInFront) {
      damage += 1;
      messages.push("Flanking! +1 damage — caught between two survivors.");
    }
  }

  // Grab auto-break: if this zombie is grabbing someone AND attacker is a different survivor, break grip
  if (z.state === "grabbing" && z.grabTarget !== null && z.grabTarget !== survivorId) {
    const freed = survivors.find(ss => ss.id === z.grabTarget);
    if (freed) {
      freed.state = "active";
      messages.push(`${s.name} breaks ${z.type}'s grip! ${freed.name} is free!`);
    }
    z.grabTarget = null;
    z.state = "agitated";
  }

  // Focus fire stagger: second different survivor attacking same zombie
  if (!isRanged && z.lastAttackedBySurvivor !== undefined && z.lastAttackedBySurvivor !== survivorId) {
    z.staggered = true;
    messages.push(`Coordinated attack! ${z.type[0].toUpperCase() + z.type.slice(1)} is staggered — loses next action!`);
    nerveChange += 1;
  }
  z.lastAttackedBySurvivor = survivorId;

  // Apply damage
  const newHp = z.hp - damage;
  const killed = newHp <= 0;

  // Knockback (bat/pipe with knockback property, melee only)
  let knockedBack = false;
  if (!isRanged && weapon.knockback && !z.knockbackResistant && !killed) {
    const pushDir = coordToDir(s, z);
    const delta = directionDelta(pushDir);
    const pushX = z.x + delta.x;
    const pushY = z.y + delta.y;

    if (inBounds(pushX, pushY) && !isObstacle(pushX, pushY)) {
      const otherZ = zombies.find(zz => zz.id !== z.id && zz.hp > 0 && zz.x === pushX && zz.y === pushY);
      if (otherZ) {
        otherZ.hp -= 1;
        z.hp = newHp - 1;
        messages.push(`Knocked into another zombie! Both take collision damage.`);
        if (otherZ.hp <= 0) {
          otherZ.state = "dead";
          messages.push(`Collision kills the ${otherZ.type}!`);
        }
        knockedBack = false;
      } else {
        const survivorThere = survivors.find(ss => ss.state !== "dead" && ss.x === pushX && ss.y === pushY);
        if (!survivorThere) {
          z.x = pushX;
          z.y = pushY;
          knockedBack = true;
          messages.push("Knocked back!");
        }
      }
    } else if (inBounds(pushX, pushY) && isObstacle(pushX, pushY)) {
      z.hp = newHp - 1;
      messages.push("Smashed into wall! +1 collision damage.");
      if (z.hp <= 0) {
        z.state = "dead";
        z.hp = 0;
      }
    }
  }

  if (killed || z.hp <= 0) {
    if (z.explodesOnDeath && z.hp <= 0) {
      z.state = "dead";
      z.hp = 0;
      noiseEvents.push({ x: z.x, y: z.y, radius: z.explosionRadius + 3, intensity: 3 });
      noiseRipples.push({ x: z.x, y: z.y, radius: z.explosionRadius + 3, intensity: 3, id: Date.now() + 999 });
      messages.push(`BLOATER EXPLODES! Noise everywhere!`);

      const adjacent = getAdjacentCoords(z);
      for (const pos of adjacent) {
        const adjZ = zombies.find(zz => zz.id !== z.id && zz.hp > 0 && zz.x === pos.x && zz.y === pos.y);
        if (adjZ) {
          adjZ.hp -= z.explosionDamage;
          if (adjZ.hp <= 0) { adjZ.state = "dead"; adjZ.hp = 0; messages.push(`Explosion kills ${adjZ.type}!`); }
        }
        const adjS = survivors.find(ss => ss.state !== "dead" && ss.x === pos.x && ss.y === pos.y);
        if (adjS) {
          adjS.hp -= z.explosionDamage;
          adjS.nerve = Math.max(0, adjS.nerve - 2);
          messages.push(`Explosion hits ${adjS.name} for ${z.explosionDamage}!`);
          if (adjS.hp <= 0) { adjS.state = "dead"; messages.push(`${adjS.name} is down!`); }
        }
      }
    } else {
      z.state = "dead";
      z.hp = 0;
    }

    if (z.grabTarget !== null) {
      const grabbed = survivors.find(ss => ss.id === z.grabTarget);
      if (grabbed) grabbed.state = "active";
    }
    z.grabTarget = null;
    nerveChange += 1;
    s.adrenalineNextTurn = true;
  } else if (!knockedBack) {
    z.hp = newHp;
    z.state = "agitated";
    z.facing = coordToDir(z, { x: s.x, y: s.y });
    messages.push(`${z.type[0].toUpperCase() + z.type.slice(1)} is enraged — turns to fight back!`);
  } else {
    z.hp = newHp;
    z.state = "agitated";
    z.facing = coordToDir(z, { x: s.x, y: s.y });
    messages.push(`${z.type[0].toUpperCase() + z.type.slice(1)} is enraged — turns to fight back!`);
  }

  // Coordination jab: adjacent ally with weapon gets a free +1 hit (melee only, zombie not yet dead)
  if (!isRanged && z.hp > 0 && z.state !== "dead") {
    const ally = survivors.find(sv =>
      sv.id !== survivorId &&
      sv.state === "active" &&
      manhattan(sv, z) === 1 &&
      sv.inventory.some(i => i.type === "weapon")
    );
    if (ally) {
      z.hp -= 1;
      messages.push(`${ally.name} coordinates — free jab on ${z.type}! (${Math.max(0, z.hp)} HP)`);
      if (z.hp <= 0) {
        z.state = "dead";
        z.hp = 0;
        messages.push(`Coordination finishes the ${z.type}!`);
        nerveChange += 1;
        s.adrenalineNextTurn = true;
        if (z.grabTarget !== null) {
          const grabbed = survivors.find(ss => ss.id === z.grabTarget);
          if (grabbed) grabbed.state = "active";
          z.grabTarget = null;
        }
      }
    }
  }

  // Weapon durability
  let weaponBroke = false;
  if (weapon.ammo !== undefined) {
    weapon.ammo -= 1;
    if (weapon.ammo <= 0) {
      s.inventory = s.inventory.filter(i => i !== weapon);
      weaponBroke = true;
      messages.push(`${weapon.name} out of ammo!`);
    }
  } else if (weapon.durability !== undefined && weapon.durability < 99) {
    weapon.durability -= 1;
    if (weapon.durability <= 0) {
      s.inventory = s.inventory.filter(i => i !== weapon);
      weaponBroke = true;
      messages.push(`${weapon.name} broke!`);
    }
  }

  if (!isRanged) s.actionsUsed += 1;
  s.nerve = Math.min(s.maxNerve, s.nerve + nerveChange);

  // Weapon noise at attacker position
  noiseEvents.push({ x: s.x, y: s.y, radius: noiseR, intensity: getNoiseIntensity(noiseR) });
  noiseRipples.push({ x: s.x, y: s.y, radius: noiseR, intensity: getNoiseIntensity(noiseR), id: Date.now() });

  // Combat noise at zombie position — failed kill = injured groan (radius 2), kill = body thump (radius 1)
  const wasDormant = zombiesIn.find(zz => zz.id === zombieId)?.state === "dormant";
  if (z.state === "dead" || z.hp <= 0) {
    // Stealth kill on dormant = quiet thump; non-stealth = louder
    const thumpR = wasDormant ? 1 : 2;
    noiseEvents.push({ x: z.x, y: z.y, radius: thumpR, intensity: 1 });
    noiseRipples.push({ x: z.x, y: z.y, radius: thumpR, intensity: 1, id: Date.now() + 50 });
  } else if (z.hp > 0) {
    // Injured zombie groans — alerts nearby dormant zombies
    noiseEvents.push({ x: z.x, y: z.y, radius: 2, intensity: 1 });
    noiseRipples.push({ x: z.x, y: z.y, radius: 2, intensity: 1, id: Date.now() + 50 });
  }

  let msg = `${s.name} hits ${z.type} for ${damage}!`;
  if (killed || z.hp <= 0) msg += " Killed!";
  if (weaponBroke && !messages.some(m => m.includes("broke") || m.includes("ammo"))) msg += ` ${weapon.name} broke!`;
  messages.unshift(msg);

  return { survivors, zombies, noiseEvents, noiseRipples, loot, terrain, messages, nerveChange };
}

export function processRangedAttack(
  survivorId: number,
  targetX: number,
  targetY: number,
  survivorsIn: Survivor[],
  zombiesIn: Zombie[],
  lootIn: LootItem[],
  terrainIn: TerrainTile[],
  nextLootId: number
): AttackResult | null {
  const s = survivorsIn.find(sv => sv.id === survivorId);
  if (!s) return null;
  const weapon = s.inventory.find(i => i.type === "weapon" && (i.rangedRange ?? 0) > 0);
  if (!weapon) return null;
  const dist = manhattan(s, { x: targetX, y: targetY });
  if (dist > weapon.rangedRange! || dist === 0) return null;
  if (!hasLineOfSight(s, { x: targetX, y: targetY })) return null;
  const targetZ = zombiesIn.find(z => z.x === targetX && z.y === targetY && z.hp > 0);
  if (!targetZ) return null;
  return processAttack(survivorId, targetZ.id, survivorsIn, zombiesIn, lootIn, terrainIn, nextLootId);
}

export function throwDistraction(
  survivorId: number,
  targetX: number,
  targetY: number,
  survivorsIn: Survivor[],
  terrainIn: TerrainTile[],
  nextLootId: number
): { survivors: Survivor[]; noiseEvents: NoiseEvent[]; noiseRipples: NoiseRipple[]; terrain: TerrainTile[]; messages: string[] } | null {
  const survivors = survivorsIn.map(s => ({ ...s, inventory: [...s.inventory] }));
  const s = survivors.find(sv => sv.id === survivorId);
  if (!s) return null;
  const distraction = s.inventory.find(i => i.type === "distraction" && !i.isTrap);
  if (!distraction) return null;
  const dist = manhattan(s, { x: targetX, y: targetY });
  if (dist > (distraction.throwRange ?? 3)) return null;

  const noiseEvents: NoiseEvent[] = [];
  const noiseRipples: NoiseRipple[] = [];
  const messages: string[] = [];
  let terrain = terrainIn.map(t => ({ ...t }));

  const throwNoise = distraction.throwNoise ?? 2;

  // Alarm Clock and Firecracker (throwNoise >= 4) → agitate nearby zombies (intensity 2)
  // Brick and Glass Bottle → alert only (intensity 1), brick stays alert much longer
  const agitates = throwNoise >= 4;
  const intensity = agitates ? 2 : 1;
  const alertDuration = distraction.name === "Brick" ? BRICK_ALERT_TURNS
    : distraction.name === "Flare" ? FLARE_ALERT_TURNS
    : ALERT_INVESTIGATE_TURNS;

  noiseEvents.push({ x: targetX, y: targetY, radius: throwNoise, intensity, alertDuration });
  noiseRipples.push({ x: targetX, y: targetY, radius: throwNoise, intensity, id: Date.now() + 777 });

  if (agitates) {
    messages.push(`${s.name} throws ${distraction.name}! LOUD — zombies agitated!`);
  } else {
    messages.push(`${s.name} throws ${distraction.name}! Zombies will investigate the landing spot.`);
  }

  // Glass bottle creates glass terrain
  if (distraction.name === "Glass Bottle") {
    if (!terrain.find(t => t.x === targetX && t.y === targetY)) {
      terrain.push({ x: targetX, y: targetY, type: "glass", noiseOnStep: 2 });
      messages.push("Glass shards scatter on the floor!");
    }
  }

  s.inventory = s.inventory.filter(i => i !== distraction);
  s.actionsUsed += 1;

  return { survivors, noiseEvents, noiseRipples, terrain, messages };
}

export function throwMolotov(
  survivorId: number,
  targetX: number,
  targetY: number,
  survivorsIn: Survivor[],
  zombiesIn: Zombie[],
  terrainIn: TerrainTile[]
): AttackResult | null {
  const survivors = survivorsIn.map(s => ({ ...s, inventory: [...s.inventory], statusEffects: [...s.statusEffects] }));
  const zombies = zombiesIn.map(z => ({ ...z }));
  let terrain = terrainIn.map(t => ({ ...t }));
  const s = survivors.find(sv => sv.id === survivorId);
  if (!s) return null;
  const molotov = s.inventory.find(i => i.name === "Molotov");
  if (!molotov) return null;
  const dist = manhattan(s, { x: targetX, y: targetY });
  if (dist > (molotov.throwRange ?? 4)) return null;

  const noiseEvents: NoiseEvent[] = [];
  const noiseRipples: NoiseRipple[] = [];
  const messages: string[] = [];
  const dmg = molotov.damage ?? 2;

  const hitTiles: Coord[] = [{ x: targetX, y: targetY }];
  for (const [dx, dy] of [[0,1],[0,-1],[1,0],[-1,0]] as [number, number][]) {
    hitTiles.push({ x: targetX + dx, y: targetY + dy });
  }

  const hitPuddles = terrain.filter(t => t.type === "puddle" && hitTiles.some(h => h.x === t.x && h.y === t.y));
  for (const puddle of hitPuddles) {
    if (!hitTiles.some(h => h.x === puddle.x && h.y === puddle.y)) {
      hitTiles.push({ x: puddle.x, y: puddle.y });
    }
    messages.push("Fire spreads across the puddle!");
  }

  for (const tile of hitTiles) {
    const z = zombies.find(zz => zz.hp > 0 && zz.x === tile.x && zz.y === tile.y);
    if (z) {
      z.hp -= dmg;
      messages.push(`Molotov hits ${z.type} for ${dmg}!`);
      if (z.hp <= 0) {
        z.state = "dead"; z.hp = 0;
        messages.push(`${z.type[0].toUpperCase() + z.type.slice(1)} burned down!`);
        if (z.explodesOnDeath) {
          noiseEvents.push({ x: z.x, y: z.y, radius: z.explosionRadius + 3, intensity: 3 });
          messages.push("CHAIN EXPLOSION from bloater!");
        }
      }
    }
    const sv = survivors.find(ss => ss.state !== "dead" && ss.x === tile.x && ss.y === tile.y);
    if (sv && sv.id !== survivorId) {
      sv.hp -= 1;
      messages.push(`${sv.name} caught in molotov blast! -1 HP`);
    }
  }

  // Molotov noise: radius 8 — wakes the whole room (noiseRadius updated in ITEMS)
  noiseEvents.push({ x: targetX, y: targetY, radius: molotov.noiseRadius, intensity: 3 });
  noiseRipples.push({ x: targetX, y: targetY, radius: molotov.noiseRadius, intensity: 3, id: Date.now() + 888 });
  messages.unshift(`${s.name} throws Molotov! BOOM — whole room alerts!`);

  s.inventory = s.inventory.filter(i => i !== molotov);
  s.actionsUsed += 1;

  return { survivors, zombies, noiseEvents, noiseRipples, loot: [], terrain, messages, nerveChange: 0 };
}

export function getZocDamage(
  survivor: Survivor,
  fromX: number, fromY: number,
  toX: number, toY: number,
  zombies: Zombie[]
): { damage: number; attackers: string[] } {
  if (survivor.disengaging) return { damage: 0, attackers: [] };
  let damage = 0;
  const attackers: string[] = [];
  for (const z of zombies) {
    if (z.hp <= 0 || z.state !== "agitated") continue;
    const wasAdj = manhattan({ x: fromX, y: fromY }, z) === 1;
    const stillAdj = manhattan({ x: toX, y: toY }, z) === 1;
    if (wasAdj && !stillAdj) {
      damage += 1;
      attackers.push(z.type);
    }
  }
  return { damage, attackers };
}
