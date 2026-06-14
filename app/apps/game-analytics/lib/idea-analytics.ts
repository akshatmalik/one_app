import { Game } from './types';
import { getTotalHours } from './calculations';

// ──────────────────────────────────────────────────────────────────────────
// NewIdeas100-June2026 — Wave 3: analytics & visual stats.
// ──────────────────────────────────────────────────────────────────────────

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** #61 Session Heat Calendar — last 365 days of play hours per day (GitHub grid). */
export function getSessionHeatCalendar(games: Game[]): {
  days: Array<{ date: string; hours: number }>;
  maxHours: number;
  activeDays: number;
  totalHours: number;
} {
  const byDay = new Map<string, number>();
  for (const g of games) {
    for (const log of g.playLogs || []) {
      const key = (log.date || '').slice(0, 10);
      if (!key) continue;
      byDay.set(key, (byDay.get(key) || 0) + (log.hours || 0));
    }
  }

  const days: Array<{ date: string; hours: number }> = [];
  const today = new Date();
  for (let i = 364; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = dayKey(d);
    days.push({ date: key, hours: byDay.get(key) || 0 });
  }
  const maxHours = days.reduce((m, d) => Math.max(m, d.hours), 0);
  const activeDays = days.filter((d) => d.hours > 0).length;
  const totalHours = days.reduce((s, d) => s + d.hours, 0);
  return { days, maxHours, activeDays, totalHours };
}

/** #59 Acquisition vs Completion Race — cumulative buys vs completions by month. */
export function getAcquisitionVsCompletion(games: Game[]): {
  points: Array<{ month: string; acquired: number; completed: number; gap: number }>;
  currentGap: number;
} {
  const acquiredByMonth = new Map<string, number>();
  const completedByMonth = new Map<string, number>();

  for (const g of games) {
    if (g.status === 'Wishlist') continue;
    const acq = (g.datePurchased || g.createdAt || '').slice(0, 7);
    if (acq) acquiredByMonth.set(acq, (acquiredByMonth.get(acq) || 0) + 1);
    if (g.status === 'Completed') {
      const done = (g.endDate || g.updatedAt || '').slice(0, 7);
      if (done) completedByMonth.set(done, (completedByMonth.get(done) || 0) + 1);
    }
  }

  const months = Array.from(new Set([...acquiredByMonth.keys(), ...completedByMonth.keys()])).sort();
  let cumA = 0;
  let cumC = 0;
  const points = months.map((m) => {
    cumA += acquiredByMonth.get(m) || 0;
    cumC += completedByMonth.get(m) || 0;
    return { month: m, acquired: cumA, completed: cumC, gap: cumA - cumC };
  });
  return { points, currentGap: cumA - cumC };
}

/** #70 The Vault — owned games you bought but forgot (no recent play), weekly rotation. */
export function getVaultGems(games: Game[], seed = Math.floor(Date.now() / (7 * 86400_000))): Game[] {
  const now = Date.now();
  const forgotten = games.filter((g) => {
    if (g.status === 'Wishlist' || g.status === 'Completed') return false;
    const logs = (g.playLogs || []).map((l) => new Date(l.date).getTime());
    const lastPlayed = logs.length ? Math.max(...logs) : new Date(g.updatedAt).getTime();
    const daysSince = (now - lastPlayed) / 86400_000;
    return daysSince >= 45;
  });
  // Stable weekly rotation: rotate the sorted list by the week-seed.
  const sorted = [...forgotten].sort((a, b) => a.name.localeCompare(b.name));
  if (!sorted.length) return [];
  const offset = Math.abs(seed) % sorted.length;
  return [...sorted.slice(offset), ...sorted.slice(0, offset)].slice(0, 3);
}

/** #71 What-Should-I-Buy-Next — the kinds of games that earned you the best satisfaction. */
export function getBuyNextTypes(games: Game[]): Array<{ genre: string; avgRating: number; avgValue: number; reason: string }> {
  const byGenre = new Map<string, { ratings: number[]; cph: number[] }>();
  for (const g of games) {
    if (!g.genre || g.status === 'Wishlist') continue;
    const e = byGenre.get(g.genre) || { ratings: [], cph: [] };
    if ((g.rating || 0) > 0) e.ratings.push(g.rating);
    const hours = getTotalHours(g);
    if ((g.price || 0) > 0 && hours > 0) e.cph.push(g.price / hours);
    byGenre.set(g.genre, e);
  }

  const scored = [...byGenre.entries()]
    .filter(([, e]) => e.ratings.length >= 1)
    .map(([genre, e]) => {
      const avgRating = e.ratings.reduce((s, r) => s + r, 0) / e.ratings.length;
      const avgValue = e.cph.length ? e.cph.reduce((s, c) => s + c, 0) / e.cph.length : 0;
      const reason =
        avgRating >= 8
          ? `You rate ${genre} games ${avgRating.toFixed(1)}/10 on average — a reliable favorite.`
          : avgValue > 0 && avgValue <= 2
          ? `${genre} games give you great value (${avgValue.toFixed(2)}/hr).`
          : `Solid track record with ${genre}.`;
      return { genre, avgRating, avgValue, reason };
    });

  return scored.sort((a, b) => b.avgRating - a.avgRating).slice(0, 3);
}
