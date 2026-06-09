import { Game, PurchaseQueueEntry } from './types';
import { getTotalHours } from './calculations';

/**
 * Gaming Timeline Estimator — pure planning calculations.
 *
 * Sequences your Up Next queue into completion dates at a chosen weekly pace,
 * detects idle gaps before upcoming releases, suggests interim fills, and lays
 * out a budgeted purchase calendar. No side effects; all dates are real Dates.
 */

export const DEFAULT_EXPECTED_HOURS = 20;
const DAY_MS = 24 * 60 * 60 * 1000;

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Best estimate of how long a game takes to finish:
 *   1. explicit expectedHours (manual or AI lookup)
 *   2. median total hours of completed games in the same genre
 *   3. median total hours of all completed games
 *   4. a sane global default
 */
export function getEffectiveExpectedHours(game: Game, allGames: Game[]): number {
  if (game.expectedHours && game.expectedHours > 0) return game.expectedHours;

  const completed = allGames.filter(g => g.status === 'Completed' && getTotalHours(g) > 0);

  if (game.genre) {
    const sameGenre = completed.filter(g => g.genre === game.genre).map(getTotalHours);
    if (sameGenre.length >= 2) return Math.round(median(sameGenre));
  }
  if (completed.length >= 2) return Math.round(median(completed.map(getTotalHours)));
  return DEFAULT_EXPECTED_HOURS;
}

/** Hours still left to finish a game (never negative). */
export function getRemainingHours(game: Game, allGames: Game[]): number {
  const expected = getEffectiveExpectedHours(game, allGames);
  const played = getTotalHours(game);
  return Math.max(expected - played, 0);
}

export interface TimelineSegment {
  game: Game;
  remainingHours: number;
  weeks: number;
  startDate: Date;
  endDate: Date;
  isEstimatedLength: boolean; // true when expectedHours wasn't set (we guessed)
}

/**
 * Walk the ordered queue back-to-back from `startDate`, producing a completion
 * date for each game at the given weekly pace. Already-finished games are skipped.
 */
export function buildPlaythroughTimeline(
  orderedGames: Game[],
  weeklyHours: number,
  startDate: Date,
  allGames: Game[]
): TimelineSegment[] {
  const segments: TimelineSegment[] = [];
  let cursor = new Date(startDate);
  const pace = weeklyHours > 0 ? weeklyHours : 1;

  for (const game of orderedGames) {
    if (game.status === 'Completed' || game.status === 'Abandoned') continue;
    const remainingHours = getRemainingHours(game, allGames);
    const weeks = remainingHours / pace;
    const segStart = new Date(cursor);
    const segEnd = addDays(segStart, Math.ceil(weeks * 7));
    segments.push({
      game,
      remainingHours,
      weeks,
      startDate: segStart,
      endDate: segEnd,
      isEstimatedLength: !(game.expectedHours && game.expectedHours > 0),
    });
    cursor = segEnd;
  }
  return segments;
}

export type GapSeverity = 'short' | 'medium' | 'long' | 'open-ended';

export interface UpcomingRelease {
  id: string;
  name: string;
  date: Date;
  price: number;
  isDayOne: boolean;
  thumbnail?: string;
}

export interface GapInfo {
  hasGap: boolean;
  queueEndDate: Date;
  gapWeeks: number;
  gapHours: number;          // gapWeeks × weeklyHours — how much play the gap could absorb
  nextRelease: UpcomingRelease | null;
  severity: GapSeverity;
}

function severityForWeeks(weeks: number): GapSeverity {
  if (weeks > 4) return 'long';
  if (weeks >= 2) return 'medium';
  return 'short';
}

/**
 * The idle window between finishing your queue and your next wanted release.
 * If nothing is lined up after the queue ends, the gap is "open-ended".
 */
export function detectGap(
  queueEndDate: Date,
  upcomingReleases: UpcomingRelease[],
  weeklyHours: number
): GapInfo {
  const future = upcomingReleases
    .filter(r => r.date.getTime() > queueEndDate.getTime())
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const pace = weeklyHours > 0 ? weeklyHours : 1;

  if (future.length === 0) {
    return {
      hasGap: true,
      queueEndDate,
      gapWeeks: 0,
      gapHours: 0,
      nextRelease: null,
      severity: 'open-ended',
    };
  }

  const next = future[0];
  const gapWeeks = (next.date.getTime() - queueEndDate.getTime()) / (7 * DAY_MS);
  return {
    hasGap: gapWeeks > 0.5,
    queueEndDate,
    gapWeeks,
    gapHours: gapWeeks * pace,
    nextRelease: next,
    severity: severityForWeeks(gapWeeks),
  };
}

export interface InterimSuggestion {
  game: Game;
  expectedHours: number;
  weeksToFinish: number;
  fitsGap: boolean;
  source: 'owned-backlog';
}

/**
 * Rank owned-but-unplayed games (free to play — you already own them) as gap
 * fillers, preferring lengths that fit the available window.
 */
export function matchInterimGames(
  gapHours: number,
  weeklyHours: number,
  allGames: Game[],
  queuedIds: Set<string>,
  limit = 4
): InterimSuggestion[] {
  const pace = weeklyHours > 0 ? weeklyHours : 1;
  const target = gapHours > 0 ? gapHours : pace * 4; // open-ended → assume ~4 weeks of play

  const backlog = allGames.filter(
    g => g.status === 'Not Started' && !queuedIds.has(g.id)
  );

  return backlog
    .map(game => {
      const expectedHours = getEffectiveExpectedHours(game, allGames);
      return {
        game,
        expectedHours,
        weeksToFinish: expectedHours / pace,
        fitsGap: expectedHours <= target * 1.2,
        source: 'owned-backlog' as const,
      };
    })
    .sort((a, b) => Math.abs(a.expectedHours - target) - Math.abs(b.expectedHours - target))
    .slice(0, limit);
}

export interface PurchaseCalendarRow {
  id: string;
  name: string;
  date: Date | null;     // release/buy date; null = TBA
  price: number;
  isDayOne: boolean;
  thumbnail?: string;
  cumulative: number;    // running total spent through this row
  remaining: number | null; // budget left after this purchase (null when no budget set)
}

const priceOf = (e: PurchaseQueueEntry): number =>
  e.targetPrice ?? e.currentPrice ?? e.msrpEstimate ?? 70;

/**
 * Dated purchase calendar with a running budget. Entries sort by release date
 * (TBA last); cumulative spend and remaining budget are computed in order.
 */
export function buildPurchaseCalendar(
  entries: PurchaseQueueEntry[],
  annualBudget: number | null,
  alreadySpent: number
): PurchaseCalendarRow[] {
  const sorted = [...entries].sort((a, b) => {
    const ta = a.releaseDate ? new Date(a.releaseDate).getTime() : Infinity;
    const tb = b.releaseDate ? new Date(b.releaseDate).getTime() : Infinity;
    return ta - tb;
  });

  let cumulative = alreadySpent;
  return sorted.map(e => {
    const price = priceOf(e);
    cumulative += price;
    return {
      id: e.id,
      name: e.gameName,
      date: e.releaseDate ? new Date(e.releaseDate) : null,
      price,
      isDayOne: e.isDayOneBuy,
      thumbnail: e.thumbnail,
      cumulative,
      remaining: annualBudget !== null ? annualBudget - cumulative : null,
    };
  });
}

export interface ScenarioResult {
  label: string;
  weeklyHours: number;
  totalRemainingHours: number;
  weeks: number;
  endDate: Date;
}

/** Compute the queue-finish date under several weekly paces, side by side. */
export function computeScenarios(
  orderedGames: Game[],
  allGames: Game[],
  startDate: Date,
  paces: { label: string; weeklyHours: number }[]
): ScenarioResult[] {
  const active = orderedGames.filter(g => g.status !== 'Completed' && g.status !== 'Abandoned');
  const totalRemainingHours = active.reduce((sum, g) => sum + getRemainingHours(g, allGames), 0);

  return paces.map(({ label, weeklyHours }) => {
    const pace = weeklyHours > 0 ? weeklyHours : 1;
    const weeks = totalRemainingHours / pace;
    return {
      label,
      weeklyHours,
      totalRemainingHours,
      weeks,
      endDate: addDays(startDate, Math.ceil(weeks * 7)),
    };
  });
}
