import { Game } from './types';

export interface MissedCheckInState {
  unresolvedDates: string[];
}

export interface SuggestedCheckInGame {
  game: Game;
  context: string;
  averageSessionHours: number | null;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function toLocalDateString(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseCheckInDate(date: string): Date | null {
  if (!DATE_PATTERN.test(date)) return null;
  const [year, month, day] = date.split('-').map(Number);
  const parsed = new Date(year, month - 1, day);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) return null;
  return parsed;
}

/** Return complete local-calendar days strictly between two dates. */
export function getMissedDates(lastLoggedDate: string, today: string): string[] {
  const lastVisit = parseCheckInDate(lastLoggedDate);
  const current = parseCheckInDate(today);
  if (!lastVisit || !current || lastVisit >= current) return [];

  const result: string[] = [];
  const cursor = new Date(lastVisit.getFullYear(), lastVisit.getMonth(), lastVisit.getDate());
  cursor.setDate(cursor.getDate() + 1);
  while (cursor < current) {
    result.push(toLocalDateString(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return result;
}

/**
 * Find every trailing unlogged day after the most recent past play session.
 * Previously discovered gaps remain pending until a log exists for that date,
 * even if the user later logs a newer day first.
 */
export function discoverUnloggedDates(
  previous: MissedCheckInState | null,
  games: Game[],
  today: string,
): MissedCheckInState {
  const loggedDates = new Set(
    games.flatMap(game => game.playLogs ?? [])
      .map(log => log.date)
      .filter(date => parseCheckInDate(date) && date < today),
  );
  const latestLoggedDate = Array.from(loggedDates).sort().at(-1);

  const unresolved = new Set([
    ...(previous?.unresolvedDates ?? []).filter(date => (
      parseCheckInDate(date) && date < today && !loggedDates.has(date)
    )),
    ...(latestLoggedDate ? getMissedDates(latestLoggedDate, today) : []),
  ]);

  return {
    unresolvedDates: Array.from(unresolved)
      .filter(date => !loggedDates.has(date))
      .sort(),
  };
}

export function resolveCheckInDates(
  state: MissedCheckInState,
  resolvedDates: string[],
): MissedCheckInState {
  const resolved = new Set(resolvedDates);
  return {
    ...state,
    unresolvedDates: state.unresolvedDates.filter(date => !resolved.has(date)),
  };
}

function daysBetween(from: string, to: string): number | null {
  const start = parseCheckInDate(from);
  const end = parseCheckInDate(to);
  if (!start || !end) return null;
  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}

/** Rank likely choices using only the user's own statuses and play history. */
export function getSuggestedCheckInGames(
  games: Game[],
  date: string,
  limit = 4,
): SuggestedCheckInGame[] {
  return games
    .filter(game => game.status !== 'Wishlist')
    // Do not suggest a title for a day before the user started it. A dated log
    // still wins over startDate in case older imported data is inconsistent.
    .filter(game => (
      !game.startDate ||
      game.startDate <= date ||
      (game.playLogs ?? []).some(log => log.date <= date)
    ))
    .map(game => {
      const logs = (game.playLogs ?? [])
        .filter(log => log.date <= date)
        .sort((a, b) => b.date.localeCompare(a.date));
      const latest = logs[0];
      const sinceLatest = latest ? daysBetween(latest.date, date) : null;
      const averageSessionHours = logs.length > 0
        ? logs.reduce((sum, log) => sum + log.hours, 0) / logs.length
        : null;

      let score = 0;
      if (game.status === 'In Progress') score += 100;
      if (game.status === 'Pick Up Later') score += 45;
      if (latest && sinceLatest !== null && sinceLatest >= 0) {
        score += Math.max(0, 70 - sinceLatest * 4);
      }
      if (game.startDate && game.startDate <= date) score += 10;
      if (game.status === 'Not Started' && logs.length === 0) score -= 30;

      let context = 'In your library';
      if (latest && sinceLatest === 0) context = 'Already played this day';
      else if (latest && sinceLatest === 1) context = 'Played the day before';
      else if (latest && sinceLatest !== null) context = `Last played ${sinceLatest} days earlier`;
      else if (game.status === 'In Progress') context = 'Currently in progress';
      else if (game.status === 'Pick Up Later') context = 'Paused, ready to resume';

      return { game, score, context, averageSessionHours };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score || a.game.name.localeCompare(b.game.name))
    .slice(0, limit)
    .map(({ game, context, averageSessionHours }) => ({ game, context, averageSessionHours }));
}
