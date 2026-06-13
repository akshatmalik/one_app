import { Game, PlayLog } from './types';

// ── Types ─────────────────────────────────────────────────────────────────────

export type ChallengeCategory =
  | 'session'     // log any session today
  | 'focus'       // play a specific game for X hours
  | 'rescue'      // return to a game not touched in 14+ days
  | 'streak'      // keep an active streak alive
  | 'milestone'   // push a game to the next value tier
  | 'review'      // rate a recently completed game
  | 'discovery'   // finally start a long-owned unstarted game
  | 'completion'  // complete a game (weekly)
  | 'variety'     // play N different games (weekly)
  | 'hours'       // log X total hours (weekly)
  | 'comeback';   // revisit a high-rated neglected game (weekly)

export interface Challenge {
  id: string;
  category: ChallengeCategory;
  title: string;
  description: string;
  emoji: string;
  points: number;
  unit: string;
  targetValue: number;
  gameId?: string;
  gameName?: string;
  thumbnail?: string;
}

export interface ChallengeProgress {
  current: number;
  isComplete: boolean;
  pct: number; // 0-100
}

interface StoredState {
  dateKey: string;
  weekKey: string;
  daily: Challenge[];
  weekly: Challenge | null;
  allTimePoints: number;
  awardedIds: string[];
}

// ── Date helpers ──────────────────────────────────────────────────────────────

export function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function currentWeekKey(): string {
  const d = new Date();
  const year = d.getFullYear();
  // ISO week: Mon-Sun
  const jan4 = new Date(year, 0, 4);
  const startOfWeek1 = new Date(jan4);
  startOfWeek1.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7));
  const weekNum = Math.floor((d.getTime() - startOfWeek1.getTime()) / (7 * 86400000)) + 1;
  return `${year}-W${String(weekNum).padStart(2, '0')}`;
}

// Seeded deterministic PRNG (LCG) keyed to today's date so challenges
// are the same all day but rotate each day.
function seededRng(seed: string): () => number {
  let s = seed.split('').reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) | 0, 0x1337);
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) | 0;
    return ((s >>> 0) / 0xffffffff);
  };
}

function pickRandom<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

// ── Data helpers ──────────────────────────────────────────────────────────────

function todayStr(): string {
  return todayKey();
}

export function getTodaysLogs(games: Game[]): { game: Game; log: PlayLog }[] {
  const today = todayStr();
  const out: { game: Game; log: PlayLog }[] = [];
  for (const g of games) {
    for (const l of g.playLogs ?? []) {
      if (l.date?.startsWith(today)) out.push({ game: g, log: l });
    }
  }
  return out;
}

function getThisWeeksLogs(games: Game[]): { game: Game; log: PlayLog }[] {
  const now = new Date();
  const dow = now.getDay(); // 0=Sun
  const daysToMon = dow === 0 ? 6 : dow - 1;
  const monday = new Date(now);
  monday.setDate(monday.getDate() - daysToMon);
  monday.setHours(0, 0, 0, 0);

  const out: { game: Game; log: PlayLog }[] = [];
  for (const g of games) {
    for (const l of g.playLogs ?? []) {
      if (!l.date) continue;
      const d = new Date(l.date + 'T00:00:00');
      if (d >= monday) out.push({ game: g, log: l });
    }
  }
  return out;
}

function computeGamingStreak(games: Game[]): number {
  const dates = new Set<string>();
  for (const g of games) {
    for (const l of g.playLogs ?? []) {
      if (l.date) dates.add(l.date.substring(0, 10));
    }
  }
  let streak = 0;
  const cursor = new Date();
  for (let i = 0; i < 365; i++) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
    if (!dates.has(key)) break;
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function getTotalGameHours(game: Game): number {
  const logHours = (game.playLogs ?? []).reduce((s, l) => s + l.hours, 0);
  return Math.max(game.hours ?? 0, logHours);
}

function daysSince(dateStr: string): number {
  const d = new Date(dateStr + 'T00:00:00');
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

// ── Daily challenge generators ────────────────────────────────────────────────

function makeAnySession(): Challenge {
  return {
    id: `session-any-${todayStr()}`,
    category: 'session',
    emoji: '🎮',
    title: 'Log a session today',
    description: 'Any game, any length — just show up',
    points: 10,
    unit: 'session',
    targetValue: 1,
  };
}

function makeFocus(games: Game[], rng: () => number): Challenge | null {
  const eligible = games.filter(g => g.status === 'In Progress' && (g.playLogs?.length ?? 0) > 0);
  if (!eligible.length) return null;

  // Favour the most-recently-played in-progress game
  const sorted = [...eligible].sort((a, b) => {
    const aLast = a.playLogs?.at(-1)?.date ?? '';
    const bLast = b.playLogs?.at(-1)?.date ?? '';
    return aLast < bLast ? 1 : -1;
  });
  const pool = sorted.slice(0, 3);
  const game = pickRandom(pool, rng);

  const hours = getTotalGameHours(game);
  const cph = game.price > 0 && hours > 0 ? game.price / hours : 0;

  // Determine how many hours to next value tier
  const tiers: { name: string; threshold: number }[] = [
    { name: 'Excellent', threshold: 1 },
    { name: 'Good', threshold: 3 },
    { name: 'Fair', threshold: 5 },
  ];
  let target = 1.5;
  let desc = 'Put focused time into your current game';
  for (const tier of tiers) {
    if (cph > tier.threshold && game.price > 0) {
      const needed = game.price / tier.threshold - hours;
      if (needed > 0 && needed <= 4) {
        target = Math.round(needed * 10) / 10;
        desc = `${target.toFixed(1)}h to reach ${tier.name} value ($${tier.threshold}/hr)`;
        break;
      }
    }
  }

  return {
    id: `focus-${game.id}-${todayStr()}`,
    category: 'focus',
    emoji: '🎯',
    title: `Focus on ${game.name}`,
    description: desc,
    points: 25,
    unit: 'hours',
    targetValue: target,
    gameId: game.id,
    gameName: game.name,
    thumbnail: game.thumbnail,
  };
}

function makeRescue(games: Game[], rng: () => number): Challenge | null {
  const eligible = games.filter(g => {
    if (g.status !== 'In Progress') return false;
    const last = g.playLogs?.at(-1)?.date;
    if (!last) return false;
    const days = daysSince(last);
    return days >= 14 && days <= 90;
  });
  if (!eligible.length) return null;

  const game = pickRandom(eligible, rng);
  const days = daysSince(game.playLogs!.at(-1)!.date);

  return {
    id: `rescue-${game.id}-${todayStr()}`,
    category: 'rescue',
    emoji: '🚑',
    title: `Rescue ${game.name}`,
    description: `Last played ${days} day${days !== 1 ? 's' : ''} ago — don't lose momentum`,
    points: 20,
    unit: 'session',
    targetValue: 1,
    gameId: game.id,
    gameName: game.name,
    thumbnail: game.thumbnail,
  };
}

function makeStreak(games: Game[]): Challenge | null {
  const streak = computeGamingStreak(games);
  if (streak < 3) return null;
  // Only show this if the streak would be broken today (no session yet)
  if (getTodaysLogs(games).length > 0) return null;
  const pts = Math.min(50, 10 + streak * 5);
  return {
    id: `streak-keep-${todayStr()}`,
    category: 'streak',
    emoji: '🔥',
    title: `Protect your ${streak}-day streak`,
    description: 'One session today keeps the flame alive',
    points: pts,
    unit: 'session',
    targetValue: 1,
  };
}

function makeMilestone(games: Game[], rng: () => number): Challenge | null {
  const tiers = [
    { name: 'Excellent', cph: 1 },
    { name: 'Good', cph: 3 },
    { name: 'Fair', cph: 5 },
  ];

  const candidates: { game: Game; hours: number; tier: string; cph: number }[] = [];
  for (const g of games) {
    if (g.status === 'Wishlist' || g.price <= 0) continue;
    const hours = getTotalGameHours(g);
    const current = hours > 0 ? g.price / hours : Infinity;
    for (const t of tiers) {
      if (current > t.cph) {
        const needed = g.price / t.cph - hours;
        if (needed > 0 && needed <= 3) {
          candidates.push({ game: g, hours: Math.round(needed * 10) / 10, tier: t.name, cph: t.cph });
          break; // only one tier per game
        }
      }
    }
  }
  if (!candidates.length) return null;

  const pick = pickRandom(candidates, rng);
  return {
    id: `milestone-${pick.game.id}-${todayStr()}`,
    category: 'milestone',
    emoji: '💎',
    title: `Push ${pick.game.name} to ${pick.tier}`,
    description: `${pick.hours.toFixed(1)}h away from $${pick.cph}/hr`,
    points: 30,
    unit: 'hours',
    targetValue: pick.hours,
    gameId: pick.game.id,
    gameName: pick.game.name,
    thumbnail: pick.game.thumbnail,
  };
}

function makeReview(games: Game[], rng: () => number): Challenge | null {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 60);

  const eligible = games.filter(g => {
    if (g.status !== 'Completed' || !g.endDate) return false;
    if (new Date(g.endDate + 'T00:00:00') < cutoff) return false;
    return !g.review && (!g.rating || g.rating === 0);
  });
  if (!eligible.length) return null;

  const game = pickRandom(eligible, rng);
  const days = game.endDate ? daysSince(game.endDate) : 0;

  return {
    id: `review-${game.id}-${todayStr()}`,
    category: 'review',
    emoji: '⭐',
    title: `Rate ${game.name}`,
    description: `You finished it ${days} day${days !== 1 ? 's' : ''} ago — leave your verdict`,
    points: 15,
    unit: 'rating',
    targetValue: 1,
    gameId: game.id,
    gameName: game.name,
    thumbnail: game.thumbnail,
  };
}

function makeDiscovery(games: Game[], rng: () => number): Challenge | null {
  const eligible = games.filter(g => {
    if (g.status !== 'Not Started') return false;
    if (!g.datePurchased) return false;
    return daysSince(g.datePurchased) >= 30;
  });
  if (!eligible.length) return null;

  const game = pickRandom(eligible, rng);
  const days = daysSince(game.datePurchased!);

  return {
    id: `discovery-${game.id}-${todayStr()}`,
    category: 'discovery',
    emoji: '🌱',
    title: `Finally try ${game.name}`,
    description: `Owned for ${days} days — give it one session`,
    points: 20,
    unit: 'session',
    targetValue: 1,
    gameId: game.id,
    gameName: game.name,
    thumbnail: game.thumbnail,
  };
}

// ── Weekly challenge generators ───────────────────────────────────────────────

function makeWeeklyCompletion(games: Game[]): Challenge {
  const nearEnd = games.filter(g => g.status === 'In Progress' && getTotalGameHours(g) >= 8);
  const desc = nearEnd.length > 0
    ? `${nearEnd.length} game${nearEnd.length !== 1 ? 's' : ''} look close to the end`
    : 'Push through to the credits';
  return {
    id: `weekly-complete-${currentWeekKey()}`,
    category: 'completion',
    emoji: '🏆',
    title: 'Complete a game this week',
    description: desc,
    points: 100,
    unit: 'completions',
    targetValue: 1,
  };
}

function makeWeeklyVariety(): Challenge {
  return {
    id: `weekly-variety-${currentWeekKey()}`,
    category: 'variety',
    emoji: '🎲',
    title: 'Play 3 different games',
    description: 'Mix up your sessions — variety makes weeks better',
    points: 60,
    unit: 'games',
    targetValue: 3,
  };
}

function makeWeeklyHours(): Challenge {
  return {
    id: `weekly-hours-${currentWeekKey()}`,
    category: 'hours',
    emoji: '⏱️',
    title: 'Log 8 hours this week',
    description: 'A solid week of gaming',
    points: 75,
    unit: 'hours',
    targetValue: 8,
  };
}

function makeWeeklyComeback(games: Game[], rng: () => number): Challenge | null {
  const eligible = games.filter(g => {
    if (g.status === 'Wishlist' || g.status === 'Abandoned') return false;
    if (!g.rating || g.rating < 8) return false;
    const last = g.playLogs?.at(-1)?.date;
    if (!last) return false;
    return daysSince(last) >= 30;
  });
  if (!eligible.length) return null;

  const game = pickRandom(eligible, rng);
  const days = daysSince(game.playLogs!.at(-1)!.date);
  return {
    id: `weekly-comeback-${game.id}-${currentWeekKey()}`,
    category: 'comeback',
    emoji: '💫',
    title: `Reconnect with ${game.name}`,
    description: `You rated it ${game.rating}/10 but haven't played in ${days} days`,
    points: 50,
    unit: 'session',
    targetValue: 1,
    gameId: game.id,
    gameName: game.name,
    thumbnail: game.thumbnail,
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

export function generateDailyChallenges(games: Game[]): Challenge[] {
  const owned = games.filter(g => g.status !== 'Wishlist');
  const rng = seededRng(todayStr());

  // Build candidate pool
  const pool: (Challenge | null)[] = [
    makeStreak(owned),
    makeFocus(owned, rng),
    makeRescue(owned, rng),
    makeMilestone(owned, rng),
    makeReview(owned, rng),
    makeDiscovery(owned, rng),
  ];

  const available = pool.filter((c): c is Challenge => c !== null);

  // Shuffle deterministically
  const shuffled = [...available];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  // Always include "any session" as a baseline — pick up to 2 more from pool
  const anySession = makeAnySession();
  const extras = shuffled.filter(c => c.id !== anySession.id).slice(0, 2);
  return [anySession, ...extras];
}

export function generateWeeklyChallenge(games: Game[]): Challenge {
  const owned = games.filter(g => g.status !== 'Wishlist');
  const rng = seededRng(currentWeekKey());

  const options: (Challenge | null)[] = [
    makeWeeklyCompletion(owned),
    makeWeeklyVariety(),
    makeWeeklyHours(),
    makeWeeklyComeback(owned, rng),
  ];
  const valid = options.filter((c): c is Challenge => c !== null);
  return pickRandom(valid, rng);
}

export function computeProgress(challenge: Challenge, games: Game[]): ChallengeProgress {
  const today = todayStr();
  let current = 0;

  switch (challenge.category) {
    case 'session': {
      // Any session today (or any session for the linked game if gameId present)
      if (challenge.gameId) {
        const game = games.find(g => g.id === challenge.gameId);
        current = (game?.playLogs ?? []).some(l => l.date?.startsWith(today)) ? 1 : 0;
      } else {
        current = getTodaysLogs(games).length > 0 ? 1 : 0;
      }
      break;
    }
    case 'streak': {
      current = getTodaysLogs(games).length > 0 ? 1 : 0;
      break;
    }
    case 'focus':
    case 'milestone': {
      if (challenge.gameId) {
        const game = games.find(g => g.id === challenge.gameId);
        current = (game?.playLogs ?? [])
          .filter(l => l.date?.startsWith(today))
          .reduce((s, l) => s + l.hours, 0);
      }
      break;
    }
    case 'rescue':
    case 'discovery': {
      if (challenge.gameId) {
        const game = games.find(g => g.id === challenge.gameId);
        current = (game?.playLogs ?? []).some(l => l.date?.startsWith(today)) ? 1 : 0;
      }
      break;
    }
    case 'review': {
      if (challenge.gameId) {
        const game = games.find(g => g.id === challenge.gameId);
        current = game?.rating && game.rating > 0 ? 1 : 0;
      }
      break;
    }
    case 'completion': {
      // Games completed this week
      const now = new Date();
      const dow = now.getDay();
      const daysToMon = dow === 0 ? 6 : dow - 1;
      const monday = new Date(now);
      monday.setDate(monday.getDate() - daysToMon);
      monday.setHours(0, 0, 0, 0);
      current = games.filter(g => {
        if (g.status !== 'Completed' || !g.endDate) return false;
        return new Date(g.endDate + 'T00:00:00') >= monday;
      }).length;
      break;
    }
    case 'variety': {
      const weekLogs = getThisWeeksLogs(games);
      current = new Set(weekLogs.map(l => l.game.id)).size;
      break;
    }
    case 'hours': {
      current = getThisWeeksLogs(games).reduce((s, l) => s + l.log.hours, 0);
      break;
    }
    case 'comeback': {
      if (challenge.gameId) {
        const weekLogs = getThisWeeksLogs(games);
        current = weekLogs.some(l => l.game.id === challenge.gameId) ? 1 : 0;
      }
      break;
    }
  }

  const isComplete = current >= challenge.targetValue;
  const pct = Math.min(100, Math.round((current / challenge.targetValue) * 100));
  return { current, isComplete, pct };
}

// ── Storage ───────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'game-analytics-challenges-v1';

function loadState(): StoredState {
  if (typeof window === 'undefined') return emptyState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredState) : emptyState();
  } catch {
    return emptyState();
  }
}

function emptyState(): StoredState {
  return { dateKey: '', weekKey: '', daily: [], weekly: null, allTimePoints: 0, awardedIds: [] };
}

function saveState(s: StoredState): void {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch { /* quota */ }
}

export function loadOrGenerateChallenges(games: Game[]): {
  daily: Challenge[];
  weekly: Challenge;
  allTimePoints: number;
  awardedIds: string[];
} {
  const stored = loadState();
  const today = todayStr();
  const week = currentWeekKey();

  let { daily, weekly, allTimePoints, awardedIds } = stored;
  let dirty = false;

  if (stored.dateKey !== today || daily.length === 0) {
    daily = generateDailyChallenges(games);
    dirty = true;
  }

  if (stored.weekKey !== week || !weekly) {
    weekly = generateWeeklyChallenge(games);
    dirty = true;
  }

  if (dirty) {
    saveState({ dateKey: today, weekKey: week, daily, weekly, allTimePoints, awardedIds });
  }

  return { daily, weekly: weekly!, allTimePoints, awardedIds };
}

export function awardPoints(
  challengeId: string,
  points: number,
  currentAwardedIds: string[],
  currentTotal: number,
): { allTimePoints: number; awardedIds: string[] } {
  if (currentAwardedIds.includes(challengeId)) {
    return { allTimePoints: currentTotal, awardedIds: currentAwardedIds };
  }
  const newAwardedIds = [...currentAwardedIds, challengeId];
  const newTotal = currentTotal + points;
  const stored = loadState();
  saveState({ ...stored, allTimePoints: newTotal, awardedIds: newAwardedIds });
  return { allTimePoints: newTotal, awardedIds: newAwardedIds };
}
