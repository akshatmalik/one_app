// ============================================================================
// Farm Sim — Seeded RNG. Pure. See docs/FARM_SIM_PLAN.md §2 (RNG discipline).
//
// One master seed. Per-system, per-day streams derived so that player actions
// can NEVER shift randomness, and (seed, day, system) reproduces exactly.
// ============================================================================

export type SystemId = 'weather' | 'forecast' | 'storm' | 'market' | 'contracts';

const SYSTEM_SALT: Record<SystemId, number> = {
  weather: 0x9e3779b1,
  forecast: 0x85ebca77,
  storm: 0xc2b2ae3d,
  market: 0x27d4eb2f,
  contracts: 0x165667b1,
};

// mulberry32 — small, fast, good enough for a game.
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Deterministic hash of (seed, day, system) → a fresh 32-bit stream seed.
export function hashStream(seed: number, day: number, system: SystemId): number {
  let h = (seed ^ SYSTEM_SALT[system]) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h = (h + day) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0x45d9f3b);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  return h >>> 0;
}

// A fresh RNG for a given system on a given day.
export function streamRng(seed: number, day: number, system: SystemId): () => number {
  return mulberry32(hashStream(seed, day, system));
}

// Weighted pick from { key: weight } using a [0,1) roll.
export function weightedPick<T extends string>(
  weights: Partial<Record<T, number>>,
  roll: number
): T {
  const entries = (Object.entries(weights) as [T, number][]).filter(([, weight]) => weight > 0);
  const total = entries.reduce((s, [, w]) => s + w, 0);
  if (entries.length === 0 || total <= 0) throw new Error('weightedPick requires a positive weight.');
  let target = roll * total;
  for (const [key, w] of entries) {
    target -= w;
    if (target < 0) return key;
  }
  return entries[entries.length - 1][0];
}
