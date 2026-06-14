import { Game } from './types';
import { getTotalHours, getCurrentGamingStreak, parseLocalDate } from './calculations';

export interface DailyChallenge {
  id: string;
  category: 'streak' | 'session' | 'explore' | 'review' | 'backlog' | 'complete' | 'organize';
  icon: string;
  title: string;
  description: string;
  reward: string;
  gameId?: string;
  gameName?: string;
  points: number;
}

interface DailyData {
  date: string;
  completedIds: string[];
}

interface StreakData {
  lastDate: string;
  streak: number;
}

function dataKey(userId: string) {
  return `ga-daily-challenges-v1-${userId}`;
}

function streakKey(userId: string) {
  return `ga-challenge-streak-v1-${userId}`;
}

export function getTodayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function yesterdayKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getDailyData(userId: string): DailyData {
  if (typeof window === 'undefined') return { date: getTodayKey(), completedIds: [] };
  try {
    const raw = localStorage.getItem(dataKey(userId));
    if (!raw) return { date: getTodayKey(), completedIds: [] };
    const parsed: DailyData = JSON.parse(raw);
    return parsed.date === getTodayKey() ? parsed : { date: getTodayKey(), completedIds: [] };
  } catch {
    return { date: getTodayKey(), completedIds: [] };
  }
}

function saveDailyData(userId: string, data: DailyData): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(dataKey(userId), JSON.stringify(data));
  } catch {}
}

export function toggleChallengeComplete(userId: string, challengeId: string, completed: boolean): void {
  const data = getDailyData(userId);
  if (completed) {
    if (!data.completedIds.includes(challengeId)) {
      data.completedIds.push(challengeId);
    }
    if (data.completedIds.length === 1) {
      bumpStreak(userId);
    }
  } else {
    data.completedIds = data.completedIds.filter(id => id !== challengeId);
  }
  saveDailyData(userId, data);
}

function bumpStreak(userId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const today = getTodayKey();
    const raw = localStorage.getItem(streakKey(userId));
    const data: StreakData = raw ? JSON.parse(raw) : { lastDate: '', streak: 0 };
    if (data.lastDate === today) return;
    data.streak = data.lastDate === yesterdayKey() ? data.streak + 1 : 1;
    data.lastDate = today;
    localStorage.setItem(streakKey(userId), JSON.stringify(data));
  } catch {}
}

export function getChallengeStreak(userId: string): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = localStorage.getItem(streakKey(userId));
    if (!raw) return 0;
    const data: StreakData = JSON.parse(raw);
    const today = getTodayKey();
    const yest = yesterdayKey();
    return data.lastDate === today || data.lastDate === yest ? data.streak : 0;
  } catch {
    return 0;
  }
}

// Seeded pseudo-random: same output for the same date every time
function seededRand(seed: number): () => number {
  let s = (seed ^ 0xdeadbeef) >>> 0;
  return () => {
    s ^= s << 13;
    s ^= s >> 17;
    s ^= s << 5;
    return (s >>> 0) / 0x100000000;
  };
}

function dateSeed(): number {
  const n = new Date();
  return n.getFullYear() * 10000 + (n.getMonth() + 1) * 100 + n.getDate();
}

export function generateDailyChallenges(games: Game[]): DailyChallenge[] {
  const rand = seededRand(dateSeed());
  const rPick = <T>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];

  const owned = games.filter(g => g.status !== 'Wishlist');
  const inProgress = games.filter(g => g.status === 'In Progress');
  const notStarted = games.filter(g => g.status === 'Not Started');
  const gamingStreak = getCurrentGamingStreak(games);

  // Games with play logs sorted by last play date
  const withLastPlay = owned
    .filter(g => g.playLogs && g.playLogs.length > 0)
    .map(g => {
      const lastDate = g.playLogs!.reduce(
        (max, l) => Math.max(max, parseLocalDate(l.date).getTime()),
        0
      );
      return { game: g, lastDate };
    })
    .sort((a, b) => b.lastDate - a.lastDate);

  const mostRecent = withLastPlay[0]?.game;

  // In-progress games not touched in 20-90 days
  const dusty = withLastPlay.filter(({ game, lastDate }) => {
    const days = (Date.now() - lastDate) / 86400000;
    return game.status === 'In Progress' && days >= 20 && days <= 90;
  });

  // Games with hours but no rating
  const unrated = owned.filter(g => g.rating === 0 && getTotalHours(g) >= 3 && g.status !== 'Not Started');

  // Oldest unstarted games
  const oldestUnstarted = [...notStarted]
    .filter(g => g.datePurchased)
    .sort((a, b) => parseLocalDate(a.datePurchased!).getTime() - parseLocalDate(b.datePurchased!).getTime());

  // In-progress with lots of hours (ready to push toward completion)
  const deepInProgress = [...inProgress]
    .filter(g => getTotalHours(g) >= 15)
    .sort((a, b) => getTotalHours(b) - getTotalHours(a));

  // Build candidate pool
  const pool: DailyChallenge[] = [];

  // STREAK — highest priority
  if (gamingStreak > 0 && inProgress.length > 0) {
    pool.push({
      id: 'streak-maintain',
      category: 'streak',
      icon: '🔥',
      title: `Keep your ${gamingStreak}-day streak alive`,
      description: 'Log any play session today to keep your gaming momentum going.',
      reward: `Reach a ${gamingStreak + 1}-day streak`,
      points: 30,
    });
  } else if (inProgress.length > 0) {
    const g = rPick(inProgress);
    pool.push({
      id: 'streak-start',
      category: 'streak',
      icon: '⚡',
      title: 'Start a new streak today',
      description: `Log a session in ${g.name} — first step to building a streak.`,
      reward: 'Begin your winning streak',
      gameId: g.id,
      gameName: g.name,
      points: 20,
    });
  }

  // SESSION — log time in most active game
  if (mostRecent) {
    const logs = mostRecent.playLogs!;
    const avgH = (logs.reduce((s, l) => s + l.hours, 0) / logs.length).toFixed(1);
    pool.push({
      id: 'session-main',
      category: 'session',
      icon: '🎮',
      title: `Play ${mostRecent.name}`,
      description: `Your most recently active game. Average session: ${avgH}h.`,
      reward: 'Boost your cost-per-hour value',
      gameId: mostRecent.id,
      gameName: mostRecent.name,
      points: 25,
    });
  } else if (inProgress.length > 0) {
    const g = rPick(inProgress);
    pool.push({
      id: 'session-any',
      category: 'session',
      icon: '🎮',
      title: `Log time in ${g.name}`,
      description: 'Track your session to build your play history.',
      reward: 'Add to your gaming story',
      gameId: g.id,
      gameName: g.name,
      points: 20,
    });
  }

  // EXPLORE — revisit dusty game
  if (dusty.length > 0) {
    const { game, lastDate } = dusty[Math.floor(rand() * Math.min(dusty.length, 3))];
    const days = Math.round((Date.now() - lastDate) / 86400000);
    pool.push({
      id: 'explore-dusty',
      category: 'explore',
      icon: '🌿',
      title: `Revisit ${game.name}`,
      description: `${days} days since your last session. Give it another chance today.`,
      reward: 'Re-energize a stalled game',
      gameId: game.id,
      gameName: game.name,
      points: 25,
    });
  }

  // REVIEW — rate an unrated game
  if (unrated.length > 0) {
    const g = unrated[Math.floor(rand() * Math.min(unrated.length, 4))];
    pool.push({
      id: 'review-rate',
      category: 'review',
      icon: '⭐',
      title: `Rate ${g.name}`,
      description: `${getTotalHours(g).toFixed(0)}h played, still no rating. Give it a score.`,
      reward: 'Complete your library data',
      gameId: g.id,
      gameName: g.name,
      points: 15,
    });
  }

  // BACKLOG — start oldest unplayed game
  if (oldestUnstarted.length > 0) {
    const g = oldestUnstarted[0];
    const days = g.datePurchased
      ? Math.round((Date.now() - parseLocalDate(g.datePurchased).getTime()) / 86400000)
      : null;
    pool.push({
      id: 'backlog-start',
      category: 'backlog',
      icon: '📦',
      title: `Start ${g.name}`,
      description:
        days && days > 30
          ? `Owned for ${days} days without a single session. Today's the day.`
          : 'Your next unstarted game is waiting for you.',
      reward: 'Chip away at your backlog',
      gameId: g.id,
      gameName: g.name,
      points: 20,
    });
  }

  // COMPLETE — push deep in-progress toward the finish line
  if (deepInProgress.length > 0) {
    const g = deepInProgress[0];
    pool.push({
      id: 'complete-push',
      category: 'complete',
      icon: '🏁',
      title: `Push through ${g.name}`,
      description: `${getTotalHours(g).toFixed(0)} hours invested — the finish line might be close.`,
      reward: 'Add a completion to your record',
      gameId: g.id,
      gameName: g.name,
      points: 25,
    });
  }

  // Shuffle and pick 3 with category diversity
  const shuffled = [...pool].sort(() => rand() - 0.5);
  const result: DailyChallenge[] = [];
  const usedCategories = new Set<string>();

  for (const c of shuffled) {
    if (result.length >= 3) break;
    if (!usedCategories.has(c.category)) {
      usedCategories.add(c.category);
      result.push(c);
    }
  }
  // Fill to 3 if needed with any remaining
  for (const c of shuffled) {
    if (result.length >= 3) break;
    if (!result.includes(c)) result.push(c);
  }

  // Fallback for very new users
  if (result.length === 0 && games.length > 0) {
    result.push({
      id: 'onboard-add',
      category: 'session',
      icon: '🎮',
      title: 'Log your first play session',
      description: 'Pick a game and record how long you played. Your stats start here.',
      reward: 'Begin tracking your gaming',
      points: 10,
    });
  }

  return result.slice(0, 3);
}
