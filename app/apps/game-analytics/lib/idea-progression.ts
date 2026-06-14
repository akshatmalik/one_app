import { Game } from './types';
import { getTotalHours } from './calculations';

// ──────────────────────────────────────────────────────────────────────────
// NewIdeas100-June2026 — Wave 13: gamification, derived purely from game data
// (no persistence/Firestore needed). XP grows with hours, completions, sessions.
// ──────────────────────────────────────────────────────────────────────────

const LEVEL_TITLES = [
  'Button Masher', 'Casual', 'Regular', 'Enthusiast', 'Veteran',
  'Hardcore', 'Completionist', 'Legend', 'Grandmaster', 'Gaming Sage',
];

/** #27 Gamer Level & XP. */
export function getGamerLevel(games: Game[]): {
  level: number;
  title: string;
  xp: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  progress: number; // 0-1
} {
  const owned = games.filter((g) => g.status !== 'Wishlist');
  const totalHours = owned.reduce((s, g) => s + getTotalHours(g), 0);
  const completions = owned.filter((g) => g.status === 'Completed').length;
  const sessions = owned.reduce((s, g) => s + (g.playLogs?.length || 0), 0);

  const xp = Math.round(totalHours * 10 + completions * 150 + sessions * 5);

  // Quadratic level curve: XP needed for level L is 100 * L^2.
  const level = Math.max(1, Math.floor(Math.sqrt(xp / 100)) + 1);
  const xpForCurrent = 100 * Math.pow(level - 1, 2);
  const xpForNext = 100 * Math.pow(level, 2);
  const xpIntoLevel = xp - xpForCurrent;
  const xpForNextLevel = xpForNext - xpForCurrent;
  const title = LEVEL_TITLES[Math.min(LEVEL_TITLES.length - 1, level - 1)];

  return {
    level,
    title,
    xp,
    xpIntoLevel,
    xpForNextLevel,
    progress: xpForNextLevel > 0 ? xpIntoLevel / xpForNextLevel : 0,
  };
}

export interface Quest {
  id: string;
  label: string;
  current: number;
  target: number;
  done: boolean;
}

/** #26 Quest Log — weekly micro-quests derived from this week's activity. */
export function getWeeklyQuests(games: Game[]): Quest[] {
  const weekAgo = Date.now() - 7 * 86400_000;

  // Gather this week's sessions.
  const weekSessions: Array<{ game: Game; hours: number; genre?: string }> = [];
  for (const g of games) {
    for (const log of g.playLogs || []) {
      if (new Date(log.date).getTime() >= weekAgo) {
        weekSessions.push({ game: g, hours: log.hours || 0, genre: g.genre });
      }
    }
  }

  const distinctGames = new Set(weekSessions.map((s) => s.game.id)).size;
  const totalHours = weekSessions.reduce((s, x) => s + x.hours, 0);
  const distinctGenres = new Set(weekSessions.map((s) => s.genre).filter(Boolean)).size;
  const completionsThisWeek = games.filter(
    (g) => g.status === 'Completed' && g.endDate && new Date(g.endDate).getTime() >= weekAgo
  ).length;

  const mk = (id: string, label: string, current: number, target: number): Quest => ({
    id,
    label,
    current: Math.min(current, target),
    target,
    done: current >= target,
  });

  return [
    mk('variety', 'Play 3 different games', distinctGames, 3),
    mk('hours', 'Log 5 hours', Math.round(totalHours * 10) / 10, 5),
    mk('genres', 'Touch 2 different genres', distinctGenres, 2),
    mk('finish', 'Finish a game', completionsThisWeek, 1),
  ];
}
