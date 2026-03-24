import { NoiseEvent, Zombie, Survivor, NoiseRipple } from './types';
import { manhattan } from './grid';

export interface NoiseResult {
  zombies: Zombie[];
  newRipples: NoiseRipple[];
  messages: string[];
  zombiesWoke: number;
}

export function resolveNoise(
  events: NoiseEvent[],
  zombies: Zombie[],
  survivors: Survivor[]
): NoiseResult {
  const newZombies = zombies.map(z => ({ ...z }));
  const ripples: NoiseRipple[] = [];
  const messages: string[] = [];
  let zombiesWoke = 0;

  let allEvents = [...events];
  let changed = true;
  let iterations = 0;

  while (changed && iterations < 30) {
    changed = false;
    iterations++;
    const newEvents: NoiseEvent[] = [];

    for (const evt of allEvents) {
      for (let i = 0; i < newZombies.length; i++) {
        const z = newZombies[i];
        if (z.hp <= 0 || z.state === "dead") continue;
        const dist = manhattan(evt, z);
        if (dist > evt.radius) continue;

        if (z.state === "dormant") {
          if (evt.intensity >= 2) {
            // Loud+ noise: dormant -> agitated
            newZombies[i] = { ...z, state: "agitated" };
            messages.push(`${z.type[0].toUpperCase() + z.type.slice(1)} at (${z.x},${z.y}) wakes up agitated!`);
          } else {
            // Whisper noise: dormant -> alert
            newZombies[i] = {
              ...z, state: "alert", alertTurnsLeft: 3,
              alertSource: { x: evt.x, y: evt.y },
              alertOrigin: { x: z.x, y: z.y },
            };
            messages.push(`${z.type[0].toUpperCase() + z.type.slice(1)} at (${z.x},${z.y}) heard something...`);
          }
          // Chain groan
          newEvents.push({ x: z.x, y: z.y, radius: z.groanRadius, intensity: 1 });
          ripples.push({ x: z.x, y: z.y, radius: z.groanRadius, intensity: 1, id: Date.now() + i + iterations * 100 });
          zombiesWoke++;
          changed = true;
        } else if (z.state === "alert" && evt.intensity >= 2) {
          // Alert zombie hears loud noise -> agitated
          newZombies[i] = { ...z, state: "agitated", alertTurnsLeft: 0, alertSource: null, alertOrigin: null };
          messages.push(`${z.type[0].toUpperCase() + z.type.slice(1)} at (${z.x},${z.y}) becomes agitated!`);
          changed = true;
        }
      }
    }
    allEvents = newEvents;
  }

  return { zombies: newZombies, newRipples: ripples, messages, zombiesWoke };
}

export function getNoiseIntensity(radius: number): number {
  if (radius <= 1) return 1;
  if (radius <= 3) return 2;
  return 3;
}
