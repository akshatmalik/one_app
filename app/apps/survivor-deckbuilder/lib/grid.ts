import { Coord, Direction, Zombie } from './types';
import { GRID_W, GRID_H, OBSTACLES, ZOMBIE_VISION_RANGE } from './constants';

export const isObstacle = (x: number, y: number) => OBSTACLES.has(`${x},${y}`);
export const inBounds = (x: number, y: number) => x >= 0 && x < GRID_W && y >= 0 && y < GRID_H;
export const manhattan = (a: Coord, b: Coord) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
export const DIRS: [number, number][] = [[0,1],[0,-1],[1,0],[-1,0]];

export function directionDelta(dir: Direction): Coord {
  switch (dir) {
    case "N": return { x: 0, y: 1 };
    case "S": return { x: 0, y: -1 };
    case "E": return { x: 1, y: 0 };
    case "W": return { x: -1, y: 0 };
  }
}

export function oppositeDir(dir: Direction): Direction {
  switch (dir) {
    case "N": return "S"; case "S": return "N";
    case "E": return "W"; case "W": return "E";
  }
}

export function coordToDir(from: Coord, to: Coord): Direction {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.abs(dy) > Math.abs(dx)) return dy > 0 ? "N" : "S";
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? "E" : "W";
  return dx >= 0 ? "E" : "W";
}

export function bfsReachable(start: Coord, maxSteps: number, blockedSet: Set<string>): Map<string, number> {
  const reachable = new Map<string, number>();
  const queue: { x: number; y: number; steps: number }[] = [{ ...start, steps: 0 }];
  const visited = new Set([`${start.x},${start.y}`]);
  while (queue.length > 0) {
    const cur = queue.shift()!;
    reachable.set(`${cur.x},${cur.y}`, cur.steps);
    if (cur.steps >= maxSteps) continue;
    for (const [dx, dy] of DIRS) {
      const nx = cur.x + dx, ny = cur.y + dy;
      const key = `${nx},${ny}`;
      if (!visited.has(key) && inBounds(nx, ny) && !isObstacle(nx, ny) && !blockedSet.has(key)) {
        visited.add(key);
        queue.push({ x: nx, y: ny, steps: cur.steps + 1 });
      }
    }
  }
  return reachable;
}

export function bfsPath(start: Coord, end: Coord, blockedSet: Set<string>): Coord[] | null {
  const queue: { x: number; y: number; path: Coord[] }[] = [{ ...start, path: [start] }];
  const visited = new Set([`${start.x},${start.y}`]);
  while (queue.length > 0) {
    const cur = queue.shift()!;
    if (cur.x === end.x && cur.y === end.y) return cur.path;
    for (const [dx, dy] of DIRS) {
      const nx = cur.x + dx, ny = cur.y + dy;
      const key = `${nx},${ny}`;
      if (!visited.has(key) && inBounds(nx, ny) && !isObstacle(nx, ny) && !blockedSet.has(key)) {
        visited.add(key);
        queue.push({ x: nx, y: ny, path: [...cur.path, { x: nx, y: ny }] });
      }
    }
  }
  return null;
}

export function zombieMoveToward(zombie: Coord, target: Coord, blockedSet: Set<string>): Coord | null {
  let best: Coord | null = null;
  let bestDist = Infinity;
  for (const [dx, dy] of DIRS) {
    const nx = zombie.x + dx, ny = zombie.y + dy;
    const key = `${nx},${ny}`;
    if (inBounds(nx, ny) && !isObstacle(nx, ny) && !blockedSet.has(key)) {
      const d = manhattan({ x: nx, y: ny }, target);
      if (d < bestDist) { bestDist = d; best = { x: nx, y: ny }; }
    }
  }
  return best;
}

export function getVisionCone(zombie: Zombie): Set<string> {
  const vision = new Set<string>();
  const delta = directionDelta(zombie.facing);
  for (let i = 1; i <= ZOMBIE_VISION_RANGE; i++) {
    const tx = zombie.x + delta.x * i;
    const ty = zombie.y + delta.y * i;
    if (!inBounds(tx, ty) || isObstacle(tx, ty)) break;
    vision.add(`${tx},${ty}`);
  }
  return vision;
}

export function zombieCanSee(zombie: Zombie, target: Coord): boolean {
  const vision = getVisionCone(zombie);
  return vision.has(`${target.x},${target.y}`);
}

export function getAdjacentCoords(pos: Coord): Coord[] {
  return DIRS.map(([dx, dy]) => ({ x: pos.x + dx, y: pos.y + dy }))
    .filter(p => inBounds(p.x, p.y));
}

export function isFlanking(attacker: Coord, zombie: Zombie): boolean {
  const delta = directionDelta(oppositeDir(zombie.facing));
  return attacker.x === zombie.x + delta.x && attacker.y === zombie.y + delta.y;
}

export function hasLineOfSight(from: Coord, to: Coord): boolean {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const steps = Math.max(Math.abs(dx), Math.abs(dy));
  if (steps <= 1) return true;
  for (let i = 1; i < steps; i++) {
    const x = Math.round(from.x + (dx * i) / steps);
    const y = Math.round(from.y + (dy * i) / steps);
    if (isObstacle(x, y)) return false;
  }
  return true;
}
