import { Survivor, Zombie, NoiseEvent, NoiseRipple, LootItem, TerrainTile, Coord } from './types';
import { manhattan, isFlanking, directionDelta, oppositeDir, inBounds, isObstacle, hasLineOfSight, getAdjacentCoords, coordToDir } from './grid';
import { getNoiseIntensity } from './noise';

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

  // Flanking bonus: +1 damage from behind
  if (!isRanged && isFlanking(s, z)) {
    damage += 1;
    messages.push("Flanking bonus! +1 damage from behind.");
  }

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
    const pushKey = `${pushX},${pushY}`;

    if (inBounds(pushX, pushY) && !isObstacle(pushX, pushY)) {
      // Check if another zombie is there
      const otherZ = zombies.find(zz => zz.id !== z.id && zz.hp > 0 && zz.x === pushX && zz.y === pushY);
      if (otherZ) {
        // Collision: both take 1 damage
        otherZ.hp -= 1;
        z.hp = newHp - 1;
        messages.push(`Knocked into another zombie! Both take collision damage.`);
        if (otherZ.hp <= 0) {
          otherZ.state = "dead";
          messages.push(`Collision kills the ${otherZ.type}!`);
        }
        knockedBack = false; // stays in place
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
      // Wall collision: +1 bonus damage
      z.hp = newHp - 1;
      messages.push("Smashed into wall! +1 collision damage.");
      if (z.hp <= 0) {
        z.state = "dead";
        z.hp = 0;
      }
    }
  }

  if (killed || z.hp <= 0) {
    // Handle bloater explosion
    if (z.explodesOnDeath && z.hp <= 0) {
      z.state = "dead";
      z.hp = 0;
      noiseEvents.push({ x: z.x, y: z.y, radius: z.explosionRadius + 3, intensity: 3 });
      noiseRipples.push({ x: z.x, y: z.y, radius: z.explosionRadius + 3, intensity: 3, id: Date.now() + 999 });
      messages.push(`BLOATER EXPLODES! Noise everywhere!`);

      // Damage everything adjacent
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
    nerveChange += 1; // killing = nerve boost
    s.adrenalineNextTurn = true; // adrenaline status
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

  // Noise — ranged (pistol) fires noise from shooter position, very loud
  noiseEvents.push({ x: s.x, y: s.y, radius: noiseR, intensity: getNoiseIntensity(noiseR) });
  noiseRipples.push({ x: s.x, y: s.y, radius: noiseR, intensity: getNoiseIntensity(noiseR), id: Date.now() });

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
  const distraction = s.inventory.find(i => i.type === "distraction");
  if (!distraction) return null;
  const dist = manhattan(s, { x: targetX, y: targetY });
  if (dist > (distraction.throwRange ?? 3)) return null;

  const noiseEvents: NoiseEvent[] = [];
  const noiseRipples: NoiseRipple[] = [];
  const messages: string[] = [];
  let terrain = terrainIn.map(t => ({ ...t }));

  const throwNoise = distraction.throwNoise ?? 2;
  noiseEvents.push({ x: targetX, y: targetY, radius: throwNoise, intensity: getNoiseIntensity(throwNoise) });
  noiseRipples.push({ x: targetX, y: targetY, radius: throwNoise, intensity: getNoiseIntensity(throwNoise), id: Date.now() + 777 });

  messages.push(`${s.name} throws ${distraction.name}! Zombies will investigate the landing spot.`);

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

  // Damage target tile + adjacent
  const hitTiles: Coord[] = [{ x: targetX, y: targetY }];
  for (const [dx, dy] of [[0,1],[0,-1],[1,0],[-1,0]] as [number, number][]) {
    hitTiles.push({ x: targetX + dx, y: targetY + dy });
  }

  // Check if hitting puddle - fire spreads across puddle tiles
  const hitPuddles = terrain.filter(t => t.type === "puddle" && hitTiles.some(h => h.x === t.x && h.y === t.y));
  for (const puddle of hitPuddles) {
    // Add puddle tile to hit area
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

  noiseEvents.push({ x: targetX, y: targetY, radius: molotov.noiseRadius, intensity: 3 });
  noiseRipples.push({ x: targetX, y: targetY, radius: molotov.noiseRadius, intensity: 3, id: Date.now() + 888 });
  messages.unshift(`${s.name} throws Molotov!`);

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
