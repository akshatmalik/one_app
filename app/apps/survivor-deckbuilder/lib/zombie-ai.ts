import { Zombie, Survivor, NoiseEvent, NoiseRipple, Coord, TerrainTile } from './types';
import { manhattan, zombieMoveToward, zombieCanSee, coordToDir, getAdjacentCoords, DIRS, inBounds, isObstacle } from './grid';
import { GRID_W, GRID_H, REINFORCEMENT_INTERVAL } from './constants';

export interface ZombiePhaseResult {
  zombies: Zombie[];
  survivors: Survivor[];
  terrain: TerrainTile[];
  messages: string[];
  noiseEvents: NoiseEvent[];
  noiseRipples: NoiseRipple[];
  overwatchHits: number;
  zocDamage: { survivorId: number; amount: number }[];
}

function getBlockedSet(zombies: Zombie[], survivors: Survivor[], excludeIdx: number): Set<string> {
  const blocked = new Set<string>();
  survivors.forEach(s => { if (s.state !== "dead") blocked.add(`${s.x},${s.y}`); });
  zombies.forEach((z, j) => { if (j !== excludeIdx && z.hp > 0) blocked.add(`${z.x},${z.y}`); });
  return blocked;
}

// Trigger a trap tile — returns updated terrain + effects
function triggerTrap(
  tile: TerrainTile,
  zombie: Zombie,
  messages: string[]
): { noiseEvent?: NoiseEvent; noiseRipple?: NoiseRipple; damage: number; stagger: boolean } {
  if (tile.triggered) return { damage: 0, stagger: false };

  if (tile.trapType === "wire") {
    messages.push(`${zombie.type[0].toUpperCase() + zombie.type.slice(1)} trips the wire! CRASH — noise + stagger!`);
    return {
      noiseEvent: { x: tile.x, y: tile.y, radius: 3, intensity: 2 },
      noiseRipple: { x: tile.x, y: tile.y, radius: 3, intensity: 2, id: Date.now() + 5500 },
      damage: 0,
      stagger: true,
    };
  } else if (tile.trapType === "nail") {
    const dmg = 3;
    messages.push(`${zombie.type[0].toUpperCase() + zombie.type.slice(1)} hits the nail board! -${dmg} HP!`);
    return { damage: dmg, stagger: false };
  } else if (tile.trapType === "bear") {
    // Bear trap: quiet (radius 1), 2 damage, stagger — better for controlled takedowns
    const dmg = 2;
    messages.push(`${zombie.type[0].toUpperCase() + zombie.type.slice(1)} hits the bear trap! SNAP — -${dmg} HP + stagger!`);
    return {
      noiseEvent: { x: tile.x, y: tile.y, radius: 1, intensity: 1 },
      noiseRipple: { x: tile.x, y: tile.y, radius: 1, intensity: 1, id: Date.now() + 5600 },
      damage: dmg,
      stagger: true,
    };
  }
  return { damage: 0, stagger: false };
}

export function processZombiePhase(
  zombiesIn: Zombie[],
  survivorsIn: Survivor[],
  terrainIn: TerrainTile[],
  turn: number
): ZombiePhaseResult {
  const zombies = zombiesIn.map(z => ({ ...z }));
  let survivors = survivorsIn.map(s => ({ ...s }));
  let terrain = terrainIn.map(t => ({ ...t }));
  const messages: string[] = [];
  const noiseEvents: NoiseEvent[] = [];
  const noiseRipples: NoiseRipple[] = [];
  const zocDamage: { survivorId: number; amount: number }[] = [];

  // --- DOWNED COUNTDOWN ---
  for (const s of survivors) {
    if (s.state === "downed") {
      s.downedTurns -= 1;
      if (s.downedTurns <= 0) {
        s.state = "dead";
        messages.push(`${s.name} bleeds out. Gone.`);
        // Witness nerve hit
        survivors.forEach(sv => {
          if (sv.id !== s.id && sv.state !== "dead") sv.nerve = Math.max(0, sv.nerve - 4);
        });
      } else {
        messages.push(`${s.name} is downed — ${s.downedTurns} turn${s.downedTurns !== 1 ? "s" : ""} to stabilize!`);
      }
    }
  }

  // --- HERD BEHAVIOR ---
  const agitatedZombies = zombies.filter(z => z.state === "agitated" && z.hp > 0);
  const herdTargetOverride = new Map<number, number>();

  for (const z of agitatedZombies) {
    const nearby = agitatedZombies.filter(other => other.id !== z.id && manhattan(z, other) <= 3);
    if (nearby.length >= 2) {
      const herdMembers = [z, ...nearby];
      const cx = herdMembers.reduce((sum, m) => sum + m.x, 0) / herdMembers.length;
      const cy = herdMembers.reduce((sum, m) => sum + m.y, 0) / herdMembers.length;
      const alive = survivors.filter(s => s.state !== "dead");
      if (alive.length > 0) {
        let target = alive[0];
        let minDist = Math.abs(alive[0].x - cx) + Math.abs(alive[0].y - cy);
        for (const sv of alive) {
          const d = Math.abs(sv.x - cx) + Math.abs(sv.y - cy);
          if (d < minDist) { minDist = d; target = sv; }
        }
        herdMembers.forEach(m => {
          if (!herdTargetOverride.has(m.id)) herdTargetOverride.set(m.id, target.id);
        });
      }
    }
  }

  if (herdTargetOverride.size > 0) {
    messages.push(`Herd forming — ${herdTargetOverride.size} zombies converging on one target!`);
  }

  for (let i = 0; i < zombies.length; i++) {
    const z = zombies[i];
    if (z.hp <= 0) continue;

    // Screamer: groans every turn while agitated or alert
    if (z.type === "screamer" && (z.state === "agitated" || z.state === "alert")) {
      noiseEvents.push({ x: z.x, y: z.y, radius: z.groanRadius, intensity: 2 });
      noiseRipples.push({ x: z.x, y: z.y, radius: z.groanRadius, intensity: 2, id: Date.now() + i + 5000 });
      messages.push(`Screamer shrieks! Noise radius ${z.groanRadius}!`);
    }

    // --- STAGGERED: skip action ---
    if (z.staggered) {
      zombies[i] = { ...z, staggered: false };
      messages.push(`${z.type[0].toUpperCase() + z.type.slice(1)} is staggered — can't act!`);
      continue;
    }

    // --- GRABBING ---
    if (z.state === "grabbing") {
      const target = survivors.find(s => s.id === z.grabTarget);
      if (target && target.state !== "dead" && target.state !== "downed") {
        target.hp -= z.damage;
        target.nerve = Math.max(0, target.nerve - 1);
        messages.push(`${z.type[0].toUpperCase() + z.type.slice(1)} deals ${z.damage} to ${target.name}! (${Math.max(0, target.hp)} HP)`);
        if (target.hp <= 0) {
          target.hp = 0;
          target.state = "downed";
          target.downedTurns = 3;
          messages.push(`${target.name} goes down! 3 turns to stabilize!`);
          zombies[i] = { ...z, state: "agitated", grabTarget: null };
          survivors.forEach(s => {
            if (s.id !== target.id && s.state !== "dead") s.nerve = Math.max(0, s.nerve - 2);
          });
        }
      } else if (target && target.state === "downed") {
        // Coup de grâce on downed survivor
        target.state = "dead";
        messages.push(`${z.type[0].toUpperCase() + z.type.slice(1)} finishes off ${target.name}!`);
        zombies[i] = { ...z, state: "agitated", grabTarget: null };
        survivors.forEach(s => {
          if (s.id !== target.id && s.state !== "dead") s.nerve = Math.max(0, s.nerve - 4);
        });
      } else {
        zombies[i] = { ...z, state: "agitated", grabTarget: null };
      }
      continue;
    }

    // --- WARY: behaves like dormant but noise.ts handles the snap to agitated ---
    if (z.state === "wary") {
      const aliveSurvivors = survivors.filter(s => s.state !== "dead");
      for (const s of aliveSurvivors) {
        if (zombieCanSee(z, s)) {
          zombies[i] = { ...z, state: "agitated" };
          messages.push(`${z.type[0].toUpperCase() + z.type.slice(1)} was on edge — spots ${s.name}!`);
          survivors.forEach(sv => {
            if (sv.state !== "dead") sv.nerve = Math.max(0, sv.nerve - 1);
          });
          break;
        }
      }
      continue;
    }

    // --- DORMANT with patrol ---
    if (z.state === "dormant" && z.patrolPath) {
      const nextIdx = ((z.patrolIdx || 0) + 1) % z.patrolPath.length;
      const next = z.patrolPath[nextIdx];
      const blocked = getBlockedSet(zombies, survivors, i);
      if (!blocked.has(`${next.x},${next.y}`) && !isObstacle(next.x, next.y)) {
        const newFacing = coordToDir(z, next);
        zombies[i] = { ...z, x: next.x, y: next.y, patrolIdx: nextIdx, facing: newFacing };
      }
      const aliveSurvivors = survivors.filter(s => s.state !== "dead");
      for (const s of aliveSurvivors) {
        if (zombieCanSee(zombies[i], s)) {
          zombies[i] = { ...zombies[i], state: "agitated" };
          messages.push(`${z.type[0].toUpperCase() + z.type.slice(1)} spots ${s.name}!`);
          survivors.forEach(sv => {
            if (sv.state !== "dead") sv.nerve = Math.max(0, sv.nerve - 1);
          });
          break;
        }
      }
      continue;
    }

    // --- DORMANT without patrol ---
    if (z.state === "dormant") {
      const aliveSurvivors = survivors.filter(s => s.state !== "dead");
      for (const s of aliveSurvivors) {
        if (zombieCanSee(z, s)) {
          zombies[i] = { ...z, state: "agitated" };
          messages.push(`${z.type[0].toUpperCase() + z.type.slice(1)} spots ${s.name}!`);
          survivors.forEach(sv => {
            if (sv.state !== "dead") sv.nerve = Math.max(0, sv.nerve - 1);
          });
          break;
        }
      }
      continue;
    }

    // --- ALERT: investigating ---
    if (z.state === "alert") {
      const aliveSurvivors = survivors.filter(s => s.state !== "dead");
      let spotted = false;
      for (const s of aliveSurvivors) {
        if (zombieCanSee(zombies[i], s)) {
          zombies[i] = { ...z, state: "agitated", alertTurnsLeft: 0, alertSource: null, alertOrigin: null };
          messages.push(`${z.type[0].toUpperCase() + z.type.slice(1)} spots ${s.name} while investigating!`);
          spotted = true;
          break;
        }
      }
      if (spotted) continue;

      if (z.alertSource) {
        if (z.x === z.alertSource.x && z.y === z.alertSource.y) {
          zombies[i] = { ...z, alertTurnsLeft: z.alertTurnsLeft - 1 };
          if (z.alertTurnsLeft <= 1) {
            // Investigation over with no sighting — enter WARY state instead of dormant
            if (z.alertOrigin && (z.x !== z.alertOrigin.x || z.y !== z.alertOrigin.y)) {
              const blocked = getBlockedSet(zombies, survivors, i);
              const next = zombieMoveToward(z, z.alertOrigin, blocked);
              if (next) {
                const newFacing = coordToDir(z, next);
                zombies[i] = { ...z, x: next.x, y: next.y, facing: newFacing, state: "wary", alertTurnsLeft: 0, alertSource: null, alertOrigin: null };
              } else {
                zombies[i] = { ...z, state: "wary", alertTurnsLeft: 0, alertSource: null, alertOrigin: null };
              }
            } else {
              zombies[i] = { ...z, state: "wary", alertTurnsLeft: 0, alertSource: null, alertOrigin: null };
            }
            messages.push(`${z.type[0].toUpperCase() + z.type.slice(1)} found nothing... but stays on edge.`);
          }
        } else {
          const blocked = getBlockedSet(zombies, survivors, i);
          const next = zombieMoveToward(z, z.alertSource, blocked);
          if (next) {
            const newFacing = coordToDir(z, next);
            let newHp = z.hp;

            // Check trap on destination
            const trapTile = terrain.find(t => t.x === next.x && t.y === next.y && t.type === "trap" && !t.triggered);
            if (trapTile) {
              const trapResult = triggerTrap(trapTile, z, messages);
              terrain = terrain.map(t => t === trapTile ? { ...t, triggered: true } : t);
              newHp -= trapResult.damage;
              if (trapResult.stagger) zombies[i] = { ...z, staggered: true };
              if (trapResult.noiseEvent) noiseEvents.push(trapResult.noiseEvent);
              if (trapResult.noiseRipple) noiseRipples.push(trapResult.noiseRipple);
              if (newHp <= 0) { zombies[i] = { ...z, hp: 0, state: "dead" }; messages.push(`Trap kills the ${z.type}!`); continue; }
            }

            zombies[i] = { ...z, x: next.x, y: next.y, facing: newFacing, hp: newHp, alertTurnsLeft: z.alertTurnsLeft - 1 };
          }
        }
      }
      continue;
    }

    // --- AGITATED: chase ---
    if (z.state === "agitated") {
      const aliveSurvivors = survivors.filter(s => s.state !== "dead");
      if (aliveSurvivors.length === 0) continue;

      let target: Survivor;
      const herdTargetId = herdTargetOverride.get(z.id);
      if (herdTargetId !== undefined) {
        target = aliveSurvivors.find(s => s.id === herdTargetId) ?? aliveSurvivors[0];
      } else {
        target = aliveSurvivors[0];
        let closestDist = manhattan(z, target);
        for (const s of aliveSurvivors) {
          const d = manhattan(z, s);
          if (d < closestDist) { target = s; closestDist = d; }
        }
      }

      const newFacing = coordToDir(z, target);
      zombies[i] = { ...z, facing: newFacing };

      for (let step = 0; step < z.speed; step++) {
        const cz = zombies[i];
        const dist = manhattan(cz, target);

        if (dist === 1 && cz.canGrab) {
          const rescuer = aliveSurvivors.find(s =>
            s.id !== target.id && s.state === "active" && manhattan(s, target) === 1
          );
          if (rescuer) {
            const t = survivors.find(s => s.id === target.id)!;
            t.hp -= 1;
            t.nerve = Math.max(0, t.nerve - 1);
            messages.push(`${rescuer.name} pulls ${target.name} free! Grab prevented. ${target.name} takes 1 shove damage.`);
            break;
          }
          zombies[i] = { ...cz, state: "grabbing", grabTarget: target.id };
          const t = survivors.find(s => s.id === target.id);
          if (t) {
            t.state = "grabbed";
            t.nerve = Math.max(0, t.nerve - 3);
          }
          messages.push(`${cz.type[0].toUpperCase() + cz.type.slice(1)} grabs ${target.name}!`);
          break;
        } else if (dist === 1 && !cz.canGrab) {
          const t = survivors.find(s => s.id === target.id)!;
          if (t.state === "downed") {
            // Coup de grâce on a downed survivor
            t.state = "dead";
            messages.push(`${cz.type[0].toUpperCase() + cz.type.slice(1)} finishes off ${t.name}!`);
            survivors.forEach(s => {
              if (s.id !== t.id && s.state !== "dead") s.nerve = Math.max(0, s.nerve - 4);
            });
            break;
          }
          t.hp -= cz.damage;
          t.nerve = Math.max(0, t.nerve - 1);
          messages.push(`${cz.type[0].toUpperCase() + cz.type.slice(1)} hits ${t.name} for ${cz.damage}! (${Math.max(0, t.hp)} HP)`);
          if (t.hp <= 0) {
            t.hp = 0;
            t.state = "downed";
            t.downedTurns = 3;
            messages.push(`${t.name} goes down! 3 turns to stabilize!`);
            survivors.forEach(s => {
              if (s.id !== t.id && s.state !== "dead") s.nerve = Math.max(0, s.nerve - 2);
            });
          }
          break;
        } else {
          const blocked = getBlockedSet(zombies, survivors, i);
          const next = zombieMoveToward(cz, target, blocked);
          if (!next) break;

          let newHp = cz.hp;

          // Check trap on destination
          const trapTile = terrain.find(t => t.x === next.x && t.y === next.y && t.type === "trap" && !t.triggered);
          if (trapTile) {
            const trapResult = triggerTrap(trapTile, cz, messages);
            terrain = terrain.map(t => t === trapTile ? { ...t, triggered: true } : t);
            newHp -= trapResult.damage;
            if (trapResult.stagger) zombies[i] = { ...cz, staggered: true };
            if (trapResult.noiseEvent) noiseEvents.push(trapResult.noiseEvent);
            if (trapResult.noiseRipple) noiseRipples.push(trapResult.noiseRipple);
            if (newHp <= 0) { zombies[i] = { ...cz, hp: 0, state: "dead" }; messages.push(`Trap kills the ${cz.type}!`); break; }
          }

          const stepFacing = coordToDir(cz, next);
          zombies[i] = { ...cz, x: next.x, y: next.y, facing: stepFacing, hp: newHp };
        }
      }
    }
  }

  // --- REINFORCEMENT WAVES: every REINFORCEMENT_INTERVAL turns, a shambler enters from a random free edge ---
  if (turn > 0 && turn % REINFORCEMENT_INTERVAL === 0) {
    const occupied = new Set<string>();
    zombies.forEach(z => { if (z.hp > 0) occupied.add(`${z.x},${z.y}`); });
    survivors.forEach(s => { if (s.state !== "dead") occupied.add(`${s.x},${s.y}`); });

    // Collect all free, unobstructed edge tiles
    const edgeTiles: Coord[] = [];
    for (let x = 0; x < GRID_W; x++) {
      for (const y of [0, GRID_H - 1]) {
        if (!isObstacle(x, y) && !occupied.has(`${x},${y}`)) edgeTiles.push({ x, y });
      }
    }
    for (let y = 1; y < GRID_H - 1; y++) {
      for (const x of [0, GRID_W - 1]) {
        if (!isObstacle(x, y) && !occupied.has(`${x},${y}`)) edgeTiles.push({ x, y });
      }
    }

    if (edgeTiles.length > 0) {
      const spawn = edgeTiles[Math.floor(Math.random() * edgeTiles.length)];
      const newId = Math.max(0, ...zombies.map(z => z.id)) + 1;
      zombies.push({
        id: newId, x: spawn.x, y: spawn.y,
        hp: 4, maxHp: 4, state: "agitated", type: "shambler", facing: "S",
        grabTarget: null, patrolPath: null, patrolIdx: 0,
        alertTurnsLeft: 0, alertSource: null, alertOrigin: null,
        damage: 2, speed: 2, groanRadius: 2,
        knockbackResistant: false, canGrab: true,
        lowProfile: false, explodesOnDeath: false, explosionRadius: 0, explosionDamage: 0,
        staggered: false, lastAttackedBySurvivor: undefined,
      });
      messages.push(`⚠ Reinforcements! A shambler enters from (${spawn.x},${spawn.y})!`);
      noiseEvents.push({ x: spawn.x, y: spawn.y, radius: 2, intensity: 1 });
      noiseRipples.push({ x: spawn.x, y: spawn.y, radius: 2, intensity: 1, id: Date.now() + 9000 });
    }
  }

  return { zombies, survivors, terrain, messages, noiseEvents, noiseRipples, overwatchHits: 0, zocDamage };
}
