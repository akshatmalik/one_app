import { Game } from './types';
import { getTotalHours, parseLocalDate } from './calculations';

export type ChallengeType =
  | 'complete_game'
  | 'long_session'
  | 'variety';

export interface MonthlyChallenge {
  id: string;
  type: ChallengeType;
  emoji: string;
  title: string;
  description: string;
  progress: number;      // 0–100
  complete: boolean;
  hint: string;
  completedText: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  game?: {
    id: string;
    name: string;
    thumbnail?: string;
  };
}

/**
 * Generate three personalised monthly challenges from the user's library data.
 * Challenges are derived purely from the supplied games array; progress is
 * calculated from play logs whose date falls within the current calendar month.
 */
export function getMonthlyChallenges(
  games: Game[],
  now: Date = new Date(),
): MonthlyChallenge[] {
  const owned = games.filter(g => g.status !== 'Wishlist');
  if (owned.length < 3) return [];

  const year = now.getFullYear();
  const month = now.getMonth();
  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0, 23, 59, 59);
  const monthName = now.toLocaleString('default', { month: 'long' });

  // ── helpers ──────────────────────────────────────────────────────────────

  const monthLogs = (g: Game) =>
    (g.playLogs ?? []).filter(l => {
      const d = parseLocalDate(l.date);
      return d >= monthStart && d <= monthEnd;
    });

  const monthHours = (g: Game): number =>
    monthLogs(g).reduce((s, l) => s + l.hours, 0);

  const gamesPlayedCount = owned.filter(g => monthHours(g) > 0).length;

  // ── Challenge 1 — push through (or start) a specific game ───────────────

  const challenge1 = ((): MonthlyChallenge | null => {
    const inProgress = owned
      .filter(g => g.status === 'In Progress')
      .map(g => {
        const sorted = [...(g.playLogs ?? [])].sort(
          (a, b) => parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime(),
        );
        const daysSinceLast = sorted[0]
          ? (now.getTime() - parseLocalDate(sorted[0].date).getTime()) / 86_400_000
          : Infinity;
        return { g, daysSinceLast };
      })
      .sort((a, b) => a.daysSinceLast - b.daysSinceLast);

    if (inProgress.length === 0) {
      // Fallback: log a first session on the most recently added unstarted game
      const candidate = owned
        .filter(g => g.status === 'Not Started')
        .sort(
          (a, b) =>
            new Date(b.datePurchased ?? b.createdAt).getTime() -
            new Date(a.datePurchased ?? a.createdAt).getTime(),
        )[0];
      if (!candidate) return null;
      const done = monthHours(candidate) > 0;
      return {
        id: `start-${candidate.id}-${monthKey}`,
        type: 'complete_game',
        emoji: '▶️',
        title: `Start: ${candidate.name}`,
        description: `Log your first session on ${candidate.name} in ${monthName}`,
        progress: done ? 100 : 0,
        complete: done,
        hint: 'Open the game card and tap "Log Time" to begin',
        completedText: `First session logged on ${candidate.name}! 🎉`,
        targetValue: 1,
        currentValue: done ? 1 : 0,
        unit: 'session',
        game: { id: candidate.id, name: candidate.name, thumbnail: candidate.thumbnail },
      };
    }

    const target = inProgress[0].g;
    const hoursThisMonth = monthHours(target);

    const completedThisMonth =
      target.status === 'Completed' &&
      !!target.endDate &&
      parseLocalDate(target.endDate) >= monthStart;

    const TARGET_HOURS = 15;
    const progress = completedThisMonth
      ? 100
      : Math.min(95, Math.round((hoursThisMonth / TARGET_HOURS) * 100));
    const isComplete = completedThisMonth || hoursThisMonth >= TARGET_HOURS;

    return {
      id: `push-${target.id}-${monthKey}`,
      type: 'complete_game',
      emoji: '🏁',
      title: `Push Through: ${target.name}`,
      description: `Log 15h on ${target.name} in ${monthName}`,
      progress,
      complete: isComplete,
      hint:
        hoursThisMonth > 0
          ? `${(TARGET_HOURS - hoursThisMonth).toFixed(1)}h more to go`
          : `No sessions logged this month yet`,
      completedText: completedThisMonth
        ? `Finished ${target.name}! 🏆`
        : `15 hours logged on ${target.name} this month!`,
      targetValue: TARGET_HOURS,
      currentValue: Math.round(hoursThisMonth * 10) / 10,
      unit: 'h',
      game: { id: target.id, name: target.name, thumbnail: target.thumbnail },
    };
  })();

  // ── Challenge 2 — power session ──────────────────────────────────────────

  const challenge2 = ((): MonthlyChallenge => {
    const allLogs = owned.flatMap(g => g.playLogs ?? []);
    const avgSession =
      allLogs.length >= 5
        ? allLogs.reduce((s, l) => s + l.hours, 0) / allLogs.length
        : 2;
    // 1.75× avg, rounded to nearest 0.5, clamped 3–6h
    const target = Math.min(6, Math.max(3, Math.round(avgSession * 1.75 * 2) / 2));

    const allMonthLogs = owned.flatMap(g => monthLogs(g));
    const best = allMonthLogs.length > 0
      ? Math.max(...allMonthLogs.map(l => l.hours))
      : 0;

    return {
      id: `marathon-${monthKey}`,
      type: 'long_session',
      emoji: '⚡',
      title: `${target}h Power Session`,
      description: `Log a single ${target}h+ session on any game in ${monthName}`,
      progress: Math.min(100, Math.round((best / target) * 100)),
      complete: best >= target,
      hint:
        best > 0
          ? `Best so far: ${best.toFixed(1)}h — ${(target - best).toFixed(1)}h more needed`
          : `No long sessions logged this month yet`,
      completedText: `${best.toFixed(1)}h session complete — power gamer! ⚡`,
      targetValue: target,
      currentValue: Math.round(best * 10) / 10,
      unit: 'h',
    };
  })();

  // ── Challenge 3 — variety ────────────────────────────────────────────────

  const challenge3 = ((): MonthlyChallenge => {
    const targetDistinct =
      owned.length <= 8 ? 2
      : owned.length <= 20 ? 3
      : 4;

    return {
      id: `variety-${monthKey}`,
      type: 'variety',
      emoji: '🎲',
      title: `${targetDistinct}-Game Month`,
      description: `Play at least ${targetDistinct} different games in ${monthName}`,
      progress: Math.min(100, Math.round((gamesPlayedCount / targetDistinct) * 100)),
      complete: gamesPlayedCount >= targetDistinct,
      hint: `${gamesPlayedCount} of ${targetDistinct} games played this month`,
      completedText: `${gamesPlayedCount} different games — great variety! 🎲`,
      targetValue: targetDistinct,
      currentValue: gamesPlayedCount,
      unit: 'games',
    };
  })();

  return [challenge1, challenge2, challenge3].filter(
    (c): c is MonthlyChallenge => c !== null,
  );
}
