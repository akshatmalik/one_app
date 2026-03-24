import { Zombie, Survivor, NoiseEvent, NoiseRipple, Coord } from './types';
import { manhattan, zombieMoveToward, zombieCanSee, coordToDir, getAdjacentCoords, DIRS, inBounds, isObstacle } from './grid';

export interface ZombiePhaseResult {
  zombies: Zombie[];
  survivors: Survivor[];
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

function processOverwatch(
  zombie: Zombie, newPos: Coord, survivors: Survivor[], messages: string[]
): { survivors: Survivor[]; damage: number; hits: number } {
  let hits = 0;
  let totalDamage = 0;
  const newSurvivors = survivors.map(s => {
    if (!s.overwatching || s.overwatchAttacks <= 0 || s.state === "dead") return s;
    if (manhattan(s, newPos) !== 1) return s;
    const weapon = s.inventory.find(i => i.type === "weapon");
    if (!weapon) return s;
    const dmg = weapon.damage || 1;
    totalDamage += dmg;
    hits++;
    messages.push(`${s.name} reacts! Overwatch hit on ${zombie.type} for ${dmg}!`);
    return { ...s, overwatchAttacks: s.overwatchAttacks - 1 };
  });
  return { survivors: newSurvivors, damage: totalDamage, hits };
}

export function processZombiePhase(
  zombiesIn: Zombie[],
  survivorsIn: Survivor[]
): ZombiePhaseResult {
  const zombies = zombiesIn.map(z => ({ ...z }));
  let survivors = survivorsIn.map(s => ({ ...s }));
  const messages: string[] = [];
  const noiseEvents: NoiseEvent[] = [];
  const noiseRipples: NoiseRipple[] = [];
  let overwatchHits = 0;
  const zocDamage: { survivorId: number; amount: number }[] = [];

  for (let i = 0; i < zombies.length; i++) {
    const z = zombies[i];
    if (z.hp <= 0) continue;

    // Screamer: groans every turn while agitated or alert
    if (z.type === "screamer" && (z.state === "agitated" || z.state === "alert")) {
      noiseEvents.push({ x: z.x, y: z.y, radius: z.groanRadius, intensity: 2 });
      noiseRipples.push({ x: z.x, y: z.y, radius: z.groanRadius, intensity: 2, id: Date.now() + i + 5000 });
      messages.push(`Screamer shrieks! Noise radius ${z.groanRadius}!`);
    }

    // --- GRABBING ---
    if (z.state === "grabbing") {
      const target = survivors.find(s => s.id === z.grabTarget);
      if (target && target.state !== "dead") {
        target.hp -= z.damage;
        target.nerve = Math.max(0, target.nerve - 1);
        messages.push(`${z.type[0].toUpperCase() + z.type.slice(1)} deals ${z.damage} to ${target.name}! (${target.hp} HP)`);
        if (target.hp <= 0) {
          target.state = "dead";
          messages.push(`${target.name} is down!`);
          zombies[i] = { ...z, state: "agitated", grabTarget: null };
          // Other survivors lose nerve
          survivors.forEach(s => {
            if (s.id !== target.id && s.state !== "dead") {
              s.nerve = Math.max(0, s.nerve - 4);
            }
          });
        }
      } else {
        zombies[i] = { ...z, state: "agitated", grabTarget: null };
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
      // Check vision for survivors
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
      // Check vision first
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

      // Move toward alert source
      if (z.alertSource) {
        if (z.x === z.alertSource.x && z.y === z.alertSource.y) {
          // Reached source, nothing here
          zombies[i] = { ...z, alertTurnsLeft: z.alertTurnsLeft - 1 };
          if (z.alertTurnsLeft <= 1) {
            // Return to dormant, walk back to origin
            if (z.alertOrigin && (z.x !== z.alertOrigin.x || z.y !== z.alertOrigin.y)) {
              const blocked = getBlockedSet(zombies, survivors, i);
              const next = zombieMoveToward(z, z.alertOrigin, blocked);
              if (next) {
                const newFacing = coordToDir(z, next);
                zombies[i] = { ...z, x: next.x, y: next.y, facing: newFacing, state: "dormant", alertTurnsLeft: 0, alertSource: null, alertOrigin: null };
              } else {
                zombies[i] = { ...z, state: "dormant", alertTurnsLeft: 0, alertSource: null, alertOrigin: null };
              }
            } else {
              zombies[i] = { ...z, state: "dormant", alertTurnsLeft: 0, alertSource: null, alertOrigin: null };
            }
            messages.push(`${z.type[0].toUpperCase() + z.type.slice(1)} lost interest, returning to patrol.`);
          }
        } else {
          const blocked = getBlockedSet(zombies, survivors, i);
          const next = zombieMoveToward(z, z.alertSource, blocked);
          if (next) {
            const newFacing = coordToDir(z, next);
            // Check overwatch
            const ow = processOverwatch(z, next, survivors, messages);
            survivors = ow.survivors;
            overwatchHits += ow.hits;
            let newHp = z.hp - ow.damage;
            if (newHp <= 0) {
              zombies[i] = { ...z, hp: 0, state: "dead" };
              messages.push(`${z.type[0].toUpperCase() + z.type.slice(1)} killed by overwatch!`);
              continue;
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

      // Find closest survivor
      let closest = aliveSurvivors[0];
      let closestDist = manhattan(z, closest);
      for (const s of aliveSurvivors) {
        const d = manhattan(z, s);
        if (d < closestDist) { closest = s; closestDist = d; }
      }

      // Update facing toward target
      const newFacing = coordToDir(z, closest);
      zombies[i] = { ...z, facing: newFacing };

      // Move (up to speed tiles)
      for (let step = 0; step < z.speed; step++) {
        const cz = zombies[i];
        const dist = manhattan(cz, closest);

        if (dist === 1 && cz.canGrab) {
          // Grab
          zombies[i] = { ...cz, state: "grabbing", grabTarget: closest.id };
          const t = survivors.find(s => s.id === closest.id);
          if (t) {
            t.state = "grabbed";
            t.nerve = Math.max(0, t.nerve - 3);
          }
          messages.push(`${cz.type[0].toUpperCase() + cz.type.slice(1)} grabs ${closest.name}!`);
          break;
        } else if (dist === 1 && !cz.canGrab) {
          // Direct attack (brute, crawler)
          const target = survivors.find(s => s.id === closest.id)!;
          target.hp -= cz.damage;
          target.nerve = Math.max(0, target.nerve - 1);
          messages.push(`${cz.type[0].toUpperCase() + cz.type.slice(1)} hits ${target.name} for ${cz.damage}! (${target.hp} HP)`);
          if (target.hp <= 0) {
            target.state = "dead";
            messages.push(`${target.name} is down!`);
            survivors.forEach(s => {
              if (s.id !== target.id && s.state !== "dead") s.nerve = Math.max(0, s.nerve - 4);
            });
          }
          break;
        } else {
          const blocked = getBlockedSet(zombies, survivors, i);
          const next = zombieMoveToward(cz, closest, blocked);
          if (!next) break;

          // Check overwatch
          const ow = processOverwatch(cz, next, survivors, messages);
          survivors = ow.survivors;
          overwatchHits += ow.hits;
          let newHp = cz.hp - ow.damage;
          if (newHp <= 0) {
            zombies[i] = { ...cz, hp: 0, state: "dead" };
            messages.push(`${cz.type[0].toUpperCase() + cz.type.slice(1)} killed by overwatch!`);
            break;
          }

          const stepFacing = coordToDir(cz, next);
          zombies[i] = { ...cz, x: next.x, y: next.y, facing: stepFacing, hp: newHp };
        }
      }
    }
  }

  return { zombies, survivors, messages, noiseEvents, noiseRipples, overwatchHits, zocDamage };
}
