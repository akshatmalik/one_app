/**
 * Trophy Calculation Engine
 *
 * Evaluates all 100 trophies against current game data.
 * Pure functions — no side effects, no storage access.
 */

import { Game } from './types';
import {
  getTotalHours,
  getAllPlayLogs,
  getLongestGamingStreak,
  parseLocalDate,
  getValueRating,
  getCardRarity,
} from './calculations';
import {
  TROPHY_DEFINITIONS,
  TrophyTierLevel,
  TrophyDefinition,
  TIER_POINTS,
  MILESTONE_POINTS,
  TIER_ORDER,
} from './trophy-definitions';

// ── Result Types ─────────────────────────────────────────────

export interface TrophyProgress {
  definition: TrophyDefinition;
  earned: boolean;
  currentValue: number;        // Raw value for this metric
  currentTier: TrophyTierLevel | null;  // Highest earned tier
  nextTier: TrophyTierLevel | null;     // Next tier to earn
  progress: number;            // 0-100 toward next tier (or 100 if maxed)
  points: number;              // Points earned from this trophy
}

export interface TrophyScoreSummary {
  totalScore: number;
  earnedCount: number;
  totalCount: number;
  byCategory: Record<string, { earned: number; total: number; points: number }>;
  pinnedIds: string[];
}

// ── Helper Functions ─────────────────────────────────────────

function daysBetween(d1: Date, d2: Date): number {
  return Math.floor(Math.abs(d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
}

function getMonthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getWeekKey(d: Date): string {
  const start = new Date(d);
  start.setDate(start.getDate() - start.getDay());
  return `${start.getFullYear()}-W${String(Math.ceil((start.getDate()) / 7)).padStart(2, '0')}-${start.getMonth()}`;
}

// ── Per-Trophy Value Calculators ─────────────────────────────

function calcCenturyClub(games: Game[]): number {
  const owned = games.filter(g => g.status !== 'Wishlist');
  if (owned.length === 0) return 0;
  return Math.max(...owned.map(g => getTotalHours(g)));
}

function calcIronLungs(games: Game[]): number {
  const allLogs = getAllPlayLogs(games);
  if (allLogs.length === 0) return 0;
  return Math.max(...allLogs.map(({ log }) => log.hours));
}

function calcTheStreak(games: Game[]): number {
  return getLongestGamingStreak(games);
}

function calcTheThousand(games: Game[]): number {
  return games.filter(g => g.status !== 'Wishlist').reduce((s, g) => s + getTotalHours(g), 0);
}

function calcDailyRitual(games: Game[]): number {
  const allLogs = getAllPlayLogs(games);
  if (allLogs.length === 0) return 0;

  // Group by month, count unique days per month
  const monthDays: Record<string, Set<string>> = {};
  allLogs.forEach(({ log }) => {
    const d = parseLocalDate(log.date);
    const mk = getMonthKey(d);
    if (!monthDays[mk]) monthDays[mk] = new Set();
    monthDays[mk].add(log.date);
  });

  return Math.max(...Object.values(monthDays).map(s => s.size), 0);
}

function calcWeekendWarrior(games: Game[]): number {
  const allLogs = getAllPlayLogs(games);
  if (allLogs.length === 0) return 0;
  let weekendHours = 0, totalHours = 0;
  allLogs.forEach(({ log }) => {
    const day = parseLocalDate(log.date).getDay();
    totalHours += log.hours;
    if (day === 0 || day === 6) weekendHours += log.hours;
  });
  return totalHours > 0 ? (weekendHours / totalHours) * 100 : 0;
}

function calcComebackKid(games: Game[]): number {
  let maxGap = 0;
  games.forEach(g => {
    if (!g.playLogs || g.playLogs.length < 2) return;
    const sorted = [...g.playLogs].sort((a, b) => a.date.localeCompare(b.date));
    for (let i = 1; i < sorted.length; i++) {
      const gap = daysBetween(parseLocalDate(sorted[i - 1].date), parseLocalDate(sorted[i].date));
      // Check if they played 5+ more hours after the gap
      const hoursAfter = sorted.slice(i).reduce((s, l) => s + l.hours, 0);
      if (hoursAfter >= 5 && gap > maxGap) maxGap = gap;
    }
  });
  return maxGap;
}

function calcMarathonMonth(games: Game[]): number {
  const allLogs = getAllPlayLogs(games);
  const monthHours: Record<string, number> = {};
  allLogs.forEach(({ log }) => {
    const mk = getMonthKey(parseLocalDate(log.date));
    monthHours[mk] = (monthHours[mk] || 0) + log.hours;
  });
  return Math.max(...Object.values(monthHours), 0);
}

function calcTheBinger(games: Game[]): number {
  // Max hours on a single game in a single day
  const allLogs = getAllPlayLogs(games);
  const dayGameHours: Record<string, number> = {};
  allLogs.forEach(({ game, log }) => {
    const key = `${log.date}:${game.id}`;
    dayGameHours[key] = (dayGameHours[key] || 0) + log.hours;
  });
  return Math.max(...Object.values(dayGameHours), 0);
}

function calcSlowBurn(games: Game[]): number {
  let maxSpan = 0;
  games.forEach(g => {
    if (!g.playLogs || g.playLogs.length < 2) return;
    const dates = g.playLogs.map(l => parseLocalDate(l.date).getTime());
    const span = daysBetween(new Date(Math.min(...dates)), new Date(Math.max(...dates)));
    if (span > maxSpan) maxSpan = span;
  });
  return maxSpan;
}

function calcMonthlyRegular(games: Game[]): number {
  const allLogs = getAllPlayLogs(games);
  if (allLogs.length === 0) return 0;

  const months = new Set<string>();
  allLogs.forEach(({ log }) => months.add(getMonthKey(parseLocalDate(log.date))));

  const sorted = [...months].sort();
  if (sorted.length === 0) return 0;

  let maxConsec = 1, cur = 1;
  for (let i = 1; i < sorted.length; i++) {
    const [py, pm] = sorted[i - 1].split('-').map(Number);
    const [cy, cm] = sorted[i].split('-').map(Number);
    const expected = pm === 12 ? `${py + 1}-01` : `${py}-${String(pm + 1).padStart(2, '0')}`;
    if (sorted[i] === expected) {
      cur++;
      maxConsec = Math.max(maxConsec, cur);
    } else {
      cur = 1;
    }
  }
  return maxConsec;
}

function calcTheGrinder(games: Game[]): number {
  return getAllPlayLogs(games).length;
}

// ── Money Moves ──────────────────────────────────────────────

function calcBargainBinKing(games: Game[]): number {
  return games.filter(g => g.status !== 'Wishlist' && g.price > 0 && g.price < 10).length;
}

function calcPennyPincher(games: Game[]): number {
  const owned = games.filter(g => g.status !== 'Wishlist' && getTotalHours(g) > 0 && g.price > 0);
  if (owned.length === 0) return Infinity;
  const totalCost = owned.reduce((s, g) => s + g.price, 0);
  const totalHours = owned.reduce((s, g) => s + getTotalHours(g), 0);
  return totalHours > 0 ? totalCost / totalHours : Infinity;
}

function calcBigSpender(games: Game[]): number {
  return games.filter(g => g.status !== 'Wishlist').reduce((s, g) => s + g.price, 0);
}

function calcTheFreeloader(games: Game[]): number {
  return games.filter(g => g.acquiredFree).length;
}

function calcDiscountSniper(games: Game[]): number {
  return games.filter(g => {
    if (!g.originalPrice || g.originalPrice <= 0) return false;
    return ((g.originalPrice - g.price) / g.originalPrice) >= 0.5;
  }).length;
}

function calcBudgetMaster(_games: Game[]): number {
  // This requires budget data which we don't have in pure calculations
  // Approximate: count months where spending was moderate
  return 0; // Will be evaluated in the hook with budget context
}

function calcTheInvestor(games: Game[]): number {
  return games.filter(g => {
    const hours = getTotalHours(g);
    return g.status !== 'Wishlist' && hours > 0 && g.price > 0 && (g.price / hours) <= 1;
  }).length;
}

function calcValueFlipper(games: Game[]): number {
  // Games where initial cost/hr was Poor (>$5) but current is Excellent (<=$1)
  return games.filter(g => {
    if (g.status === 'Wishlist' || g.price <= 0) return false;
    const totalHours = getTotalHours(g);
    if (totalHours <= 0) return false;
    const currentCPH = g.price / totalHours;
    // Must have improved from >$5 to <=$1 — needs at least $5 initial rate
    return currentCPH <= 1 && g.price > 5;
  }).length;
}

function calcFullPriceSupporter(games: Game[]): number {
  return games.filter(g => {
    if (g.status === 'Wishlist' || g.acquiredFree) return false;
    return !g.originalPrice || g.originalPrice <= g.price;
  }).filter(g => g.price > 0).length;
}

function calcCostConscious(games: Game[]): number {
  const owned = games.filter(g => g.status !== 'Wishlist' && g.price > 0);
  if (owned.length === 0) return Infinity;
  return owned.reduce((s, g) => s + g.price, 0) / owned.length;
}

function calcTheWhale(games: Game[]): number {
  const owned = games.filter(g => g.status !== 'Wishlist');
  if (owned.length === 0) return 0;
  return Math.max(...owned.map(g => g.price));
}

function calcBudgetWarrior(games: Game[]): number {
  const owned = games.filter(g => g.status !== 'Wishlist');
  const totalHours = owned.reduce((s, g) => s + getTotalHours(g), 0);
  const totalSpent = owned.reduce((s, g) => s + g.price, 0);
  // Evaluate which tier they meet
  if (totalHours >= 1000 && totalSpent <= 350) return 1000;
  if (totalHours >= 750 && totalSpent <= 400) return 750;
  if (totalHours >= 500 && totalSpent <= 500) return 500;
  if (totalHours >= 250 && totalSpent <= 500) return 250;
  return 0;
}

// ── The Finisher ─────────────────────────────────────────────

function calcCompletionist(games: Game[]): number {
  return games.filter(g => g.status === 'Completed').length;
}

function calcSpeedrunner(games: Game[]): number {
  const completed = games.filter(g => g.status === 'Completed' && g.startDate && g.endDate);
  if (completed.length === 0) return Infinity;
  const days = completed.map(g => daysBetween(parseLocalDate(g.startDate!), parseLocalDate(g.endDate!)));
  return Math.min(...days);
}

function calcTheCloser(games: Game[]): number {
  const owned = games.filter(g => g.status !== 'Wishlist');
  if (owned.length === 0) return 0;
  return (games.filter(g => g.status === 'Completed').length / owned.length) * 100;
}

function calcNoGameLeftBehind(games: Game[]): number {
  return games.filter(g => g.status === 'Not Started').length;
}

function calcBacklogSlayer(games: Game[]): number {
  return games.filter(g => {
    if (g.status !== 'Completed' || !g.datePurchased || !g.startDate) return false;
    const waitDays = daysBetween(parseLocalDate(g.datePurchased), parseLocalDate(g.startDate));
    return waitDays >= 30;
  }).length;
}

function calcCompletionStreak(games: Game[]): number {
  const completed = games.filter(g => g.status === 'Completed' && g.endDate);
  if (completed.length === 0) return 0;

  const months = new Set(completed.map(g => getMonthKey(parseLocalDate(g.endDate!))));
  const sorted = [...months].sort();
  if (sorted.length === 0) return 0;

  let maxConsec = 1, cur = 1;
  for (let i = 1; i < sorted.length; i++) {
    const [py, pm] = sorted[i - 1].split('-').map(Number);
    const expected = pm === 12 ? `${py + 1}-01` : `${py}-${String(pm + 1).padStart(2, '0')}`;
    if (sorted[i] === expected) { cur++; maxConsec = Math.max(maxConsec, cur); }
    else cur = 1;
  }
  return maxConsec;
}

function calcTheSprint(games: Game[]): number {
  const completed = games.filter(g => g.status === 'Completed' && g.endDate);
  const monthCompletions: Record<string, number> = {};
  completed.forEach(g => {
    const mk = getMonthKey(parseLocalDate(g.endDate!));
    monthCompletions[mk] = (monthCompletions[mk] || 0) + 1;
  });
  return Object.values(monthCompletions).filter(c => c >= 3).length;
}

function calcResurrection(_games: Game[]): number {
  // Would need historical status tracking. Approximate: completed games that have large gaps
  // between sessions (suggesting they were "abandoned" then picked back up)
  return _games.filter(g => {
    if (g.status !== 'Completed' || !g.playLogs || g.playLogs.length < 3) return false;
    const sorted = [...g.playLogs].sort((a, b) => a.date.localeCompare(b.date));
    for (let i = 1; i < sorted.length; i++) {
      const gap = daysBetween(parseLocalDate(sorted[i - 1].date), parseLocalDate(sorted[i].date));
      if (gap >= 60) return true;
    }
    return false;
  }).length;
}

function calcOneAndDone(games: Game[]): number {
  return games.filter(g => {
    return g.status === 'Completed' && g.playLogs && g.playLogs.length === 1;
  }).length;
}

function calcTheMinimalist(games: Game[]): number {
  return games.filter(g => g.status === 'Completed' && getTotalHours(g) < 5).length;
}

function calcEpicJourney(games: Game[]): number {
  return games.filter(g => g.status === 'Completed' && getTotalHours(g) >= 100).length;
}

function calcTheEnder(games: Game[]): number {
  const completed = games.filter(g => g.status === 'Completed' && g.endDate);
  // Group by week
  const weekCompletions: Record<string, number> = {};
  completed.forEach(g => {
    const d = parseLocalDate(g.endDate!);
    // ISO week: get Monday of the week
    const day = d.getDay();
    const monday = new Date(d);
    monday.setDate(monday.getDate() - ((day + 6) % 7));
    const wk = `${monday.getFullYear()}-${monday.getMonth()}-${monday.getDate()}`;
    weekCompletions[wk] = (weekCompletions[wk] || 0) + 1;
  });
  return Object.values(weekCompletions).filter(c => c >= 2).length;
}

// ── The Explorer ─────────────────────────────────────────────

function calcGenreTourist(games: Game[]): number {
  return new Set(games.filter(g => g.genre && g.status !== 'Wishlist').map(g => g.genre)).size;
}

function calcPlatformHopper(games: Game[]): number {
  return new Set(games.filter(g => g.platform && g.status !== 'Wishlist').map(g => g.platform)).size;
}

function calcFranchiseDevotee(games: Game[]): number {
  const counts: Record<string, number> = {};
  games.filter(g => g.franchise).forEach(g => { counts[g.franchise!] = (counts[g.franchise!] || 0) + 1; });
  return Math.max(...Object.values(counts), 0);
}

function calcNewHorizons(games: Game[]): number {
  // Count genres. The concept is "first game in a genre" = number of unique genres
  // since each genre was "new" at some point
  return new Set(games.filter(g => g.genre && g.status !== 'Wishlist' && getTotalHours(g) > 0).map(g => g.genre)).size;
}

function calcTheCollector(games: Game[]): number {
  return games.filter(g => g.status !== 'Wishlist').length;
}

function calcSourceDiversifier(games: Game[]): number {
  return new Set(games.filter(g => g.purchaseSource && g.status !== 'Wishlist').map(g => g.purchaseSource)).size;
}

function calcVarietyHour(games: Game[]): number {
  const allLogs = getAllPlayLogs(games);
  const monthGenres: Record<string, Set<string>> = {};
  allLogs.forEach(({ game, log }) => {
    if (!game.genre) return;
    const mk = getMonthKey(parseLocalDate(log.date));
    if (!monthGenres[mk]) monthGenres[mk] = new Set();
    monthGenres[mk].add(game.genre);
  });
  return Object.values(monthGenres).filter(s => s.size >= 5).length;
}

function calcGenreBreaker(games: Game[]): number {
  const played = games.filter(g => g.genre && g.status !== 'Wishlist' && getTotalHours(g) > 0 && g.rating > 0);
  if (played.length < 3) return 0;

  const genreHours: Record<string, number> = {};
  played.forEach(g => { genreHours[g.genre!] = (genreHours[g.genre!] || 0) + getTotalHours(g); });

  const leastPlayedGenre = Object.entries(genreHours).sort((a, b) => a[1] - b[1])[0]?.[0];
  if (!leastPlayedGenre) return 0;

  const highestRated = [...played].sort((a, b) => b.rating - a.rating)[0];
  if (highestRated.genre === leastPlayedGenre) {
    if (highestRated.rating >= 10) return 3;
    if (highestRated.rating >= 9) return 2;
    return 1;
  }
  return 0;
}

function calcTheRotation(games: Game[]): number {
  const allLogs = getAllPlayLogs(games);
  const dayGames: Record<string, Set<string>> = {};
  allLogs.forEach(({ game, log }) => {
    if (!dayGames[log.date]) dayGames[log.date] = new Set();
    dayGames[log.date].add(game.id);
  });
  return Object.values(dayGames).filter(s => s.size >= 3).length;
}

function calcSeasonalGamer(games: Game[]): number {
  const allLogs = getAllPlayLogs(games);
  // Group by year, check if all 4 seasons have activity
  const yearSeasons: Record<number, Set<number>> = {};
  allLogs.forEach(({ log }) => {
    const d = parseLocalDate(log.date);
    const year = d.getFullYear();
    const month = d.getMonth();
    const season = month < 3 ? 0 : month < 6 ? 1 : month < 9 ? 2 : 3;
    if (!yearSeasons[year]) yearSeasons[year] = new Set();
    yearSeasons[year].add(season);
  });
  return Object.values(yearSeasons).filter(s => s.size === 4).length;
}

// ── The Critic ───────────────────────────────────────────────

function calcToughCritic(games: Game[]): number {
  const rated = games.filter(g => g.status !== 'Wishlist' && g.rating > 0);
  if (rated.length === 0) return 10;
  return rated.reduce((s, g) => s + g.rating, 0) / rated.length;
}

function calcEternalOptimist(games: Game[]): number {
  const rated = games.filter(g => g.status !== 'Wishlist' && g.rating > 0);
  if (rated.length === 0) return 0;
  return rated.reduce((s, g) => s + g.rating, 0) / rated.length;
}

function calcPerfect10(games: Game[]): number {
  return games.filter(g => g.rating === 10).length;
}

function calcBalancedPalate(games: Game[]): number {
  const rated = games.filter(g => g.status !== 'Wishlist' && g.rating > 0);
  if (rated.length < 3) return Infinity;
  const avg = rated.reduce((s, g) => s + g.rating, 0) / rated.length;
  const variance = rated.reduce((s, g) => s + Math.pow(g.rating - avg, 2), 0) / rated.length;
  return Math.sqrt(variance);
}

function calcTheReviewer(games: Game[]): number {
  return games.filter(g => g.review || g.notes).length;
}

function calcSurpriseHit(games: Game[]): number {
  return games.filter(g => g.price > 0 && g.price < 10 && g.rating >= 9).length;
}

function calcMoneyPit(games: Game[]): number {
  return games.filter(g => g.price >= 50 && g.rating > 0 && g.rating < 5).length;
}

function calcTheContrarian(games: Game[]): number {
  const played = games.filter(g => g.genre && g.rating > 0 && g.status !== 'Wishlist');
  const genreAvg: Record<string, { sum: number; count: number }> = {};
  played.forEach(g => {
    if (!genreAvg[g.genre!]) genreAvg[g.genre!] = { sum: 0, count: 0 };
    genreAvg[g.genre!].sum += g.rating;
    genreAvg[g.genre!].count++;
  });
  return played.filter(g => {
    const avg = genreAvg[g.genre!];
    if (!avg || avg.count < 2) return false;
    return Math.abs(g.rating - avg.sum / avg.count) >= 3;
  }).length;
}

function calcCriticsChoice(games: Game[]): number {
  return games.filter(g => {
    const hours = getTotalHours(g);
    return g.rating >= 9 && hours > 0 && g.price > 0 && (g.price / hours) <= 1;
  }).length;
}

function calcRatingEvolution(games: Game[]): number {
  const ratings = new Set(games.filter(g => g.rating > 0).map(g => g.rating));
  return ratings.size;
}

// ── The Personality ──────────────────────────────────────────

function calcMonogamist(games: Game[]): number {
  const allLogs = getAllPlayLogs(games);
  const monthGames: Record<string, Set<string>> = {};
  allLogs.forEach(({ game, log }) => {
    const mk = getMonthKey(parseLocalDate(log.date));
    if (!monthGames[mk]) monthGames[mk] = new Set();
    monthGames[mk].add(game.id);
  });
  return Object.values(monthGames).filter(s => s.size === 1).length;
}

function calcJuggler(games: Game[]): number {
  const allLogs = getAllPlayLogs(games);
  // Group by ISO week
  const weekGames: Record<string, Set<string>> = {};
  allLogs.forEach(({ game, log }) => {
    const d = parseLocalDate(log.date);
    const wk = getWeekKey(d);
    if (!weekGames[wk]) weekGames[wk] = new Set();
    weekGames[wk].add(game.id);
  });
  return Object.values(weekGames).filter(s => s.size >= 5).length;
}

function calcPatientGamer(games: Game[]): number {
  return games.filter(g => {
    if (!g.datePurchased || !g.startDate) return false;
    return daysBetween(parseLocalDate(g.datePurchased), parseLocalDate(g.startDate)) >= 90;
  }).length;
}

function calcBingeAndPurge(games: Game[]): number {
  const allLogs = getAllPlayLogs(games);
  // Group by week, get hours per week
  const weekHours: Record<string, number> = {};
  allLogs.forEach(({ log }) => {
    const wk = getWeekKey(parseLocalDate(log.date));
    weekHours[wk] = (weekHours[wk] || 0) + log.hours;
  });
  const weeks = Object.entries(weekHours).sort((a, b) => a[0].localeCompare(b[0]));
  let count = 0;
  for (let i = 1; i < weeks.length; i++) {
    if (weeks[i - 1][1] >= 20 && weeks[i][1] < 2) count++;
  }
  return count;
}

function calcCreatureOfHabit(games: Game[]): number {
  // For each game, check if played on same weekday 4+ consecutive weeks
  let count = 0;
  games.forEach(g => {
    if (!g.playLogs || g.playLogs.length < 4) return;
    const logDates = g.playLogs.map(l => parseLocalDate(l.date));
    // Group by weekday
    const byDay: Record<number, Date[]> = {};
    logDates.forEach(d => {
      const day = d.getDay();
      if (!byDay[day]) byDay[day] = [];
      byDay[day].push(d);
    });
    // For each weekday, check for 4 consecutive weeks
    for (const dates of Object.values(byDay)) {
      if (dates.length < 4) continue;
      const sorted = dates.sort((a, b) => a.getTime() - b.getTime());
      let consec = 1;
      for (let i = 1; i < sorted.length; i++) {
        const gap = daysBetween(sorted[i - 1], sorted[i]);
        if (gap >= 5 && gap <= 9) { // Roughly one week
          consec++;
          if (consec >= 4) { count++; break; }
        } else {
          consec = 1;
        }
      }
    }
  });
  return count;
}

function calcTheAbandoner(games: Game[]): number {
  return games.filter(g => g.status === 'Abandoned').length;
}

function calcSunkCostSurvivor(games: Game[]): number {
  return games.filter(g => getTotalHours(g) >= 30 && g.rating > 0 && g.rating < 5).length;
}

function calcDayOne(games: Game[]): number {
  return games.filter(g => {
    if (!g.datePurchased) return false;
    const startDate = g.startDate || (g.playLogs && g.playLogs.length > 0
      ? [...g.playLogs].sort((a, b) => a.date.localeCompare(b.date))[0].date
      : null);
    if (!startDate) return false;
    return g.datePurchased === startDate;
  }).length;
}

function calcQueueSkipper(games: Game[]): number {
  // Games that were started but don't have a queuePosition and there are queued games
  const queuedCount = games.filter(g => g.queuePosition && g.queuePosition > 0).length;
  if (queuedCount < 3) return 0;
  return games.filter(g => {
    return (g.status === 'In Progress' || g.status === 'Completed') &&
      !g.queuePosition && g.startDate;
  }).length;
}

function calcParallelPlayer(games: Game[]): number {
  return games.filter(g => g.status === 'In Progress').length;
}

function calcTheDecider(games: Game[]): number {
  // Can't track historical state, so just check current
  const inProgress = games.filter(g => g.status === 'In Progress').length;
  return inProgress === 0 && games.filter(g => g.status === 'Completed').length > 0 ? 1 : 0;
}

function calcHibernationBreaker(games: Game[]): number {
  const allLogs = getAllPlayLogs(games);
  if (allLogs.length < 2) return 0;
  const dates = [...new Set(allLogs.map(({ log }) => log.date))].sort();
  let count = 0;
  for (let i = 1; i < dates.length; i++) {
    if (daysBetween(parseLocalDate(dates[i - 1]), parseLocalDate(dates[i])) >= 14) count++;
  }
  return count;
}

function calcTheRevisionist(games: Game[]): number {
  return games.filter(g => {
    if (g.status !== 'Completed' || !g.endDate || !g.playLogs) return false;
    return g.playLogs.some(l => l.date > g.endDate!);
  }).length;
}

function calcImpulseHour(games: Game[]): number {
  return games.filter(g => {
    if (!g.datePurchased || !g.playLogs) return false;
    const sameDayHours = g.playLogs
      .filter(l => l.date === g.datePurchased)
      .reduce((s, l) => s + l.hours, 0);
    return sameDayHours >= 2;
  }).length;
}

// ── First Blood (Milestones) ─────────────────────────────────

function calcFirstBlood(games: Game[]): boolean {
  return getAllPlayLogs(games).length > 0;
}

function calcCollectionBegins(games: Game[]): boolean {
  return games.length > 0;
}

function calcFirstCompletion(games: Game[]): boolean {
  return games.some(g => g.status === 'Completed');
}

function calcFirstPerfectScore(games: Game[]): boolean {
  return games.some(g => g.rating === 10);
}

function calcFirstHeartbreak(games: Game[]): boolean {
  return games.some(g => g.status === 'Abandoned');
}

function calcFirstFreebie(games: Game[]): boolean {
  return games.some(g => g.acquiredFree);
}

function calcFirstFranchise(games: Game[]): boolean {
  const franchises: Record<string, number> = {};
  games.filter(g => g.franchise).forEach(g => { franchises[g.franchise!] = (franchises[g.franchise!] || 0) + 1; });
  return Object.values(franchises).some(c => c >= 2);
}

function calcFirstStreak(games: Game[]): boolean {
  const allLogs = getAllPlayLogs(games);
  if (allLogs.length < 3) return false;
  const dates = [...new Set(allLogs.map(({ log }) => log.date))].sort();
  let consec = 1;
  for (let i = 1; i < dates.length; i++) {
    if (daysBetween(parseLocalDate(dates[i - 1]), parseLocalDate(dates[i])) === 1) {
      consec++;
      if (consec >= 3) return true;
    } else {
      consec = 1;
    }
  }
  return false;
}

function calcFirstBudget(_games: Game[]): boolean {
  // Can't check from games alone; will need budget context in hook
  return false;
}

function calcFirstQueue(games: Game[]): boolean {
  return games.some(g => g.queuePosition && g.queuePosition > 0);
}

// ── The Legend ────────────────────────────────────────────────

function calcLibraryTitan(_games: Game[], trophyScore: number): number {
  return trophyScore;
}

function calcTheHistorian(games: Game[]): number {
  const allLogs = getAllPlayLogs(games);
  if (allLogs.length < 2) return 0;
  const dates = allLogs.map(({ log }) => parseLocalDate(log.date).getTime());
  return daysBetween(new Date(Math.min(...dates)), new Date(Math.max(...dates)));
}

function calcGoldenRatio(games: Game[]): number {
  return games.filter(g => {
    const hours = getTotalHours(g);
    return hours >= 100 && g.rating >= 9 && g.price > 0 && (g.price / hours) < 1;
  }).length;
}

function calcBacklogZero(games: Game[]): number {
  const owned = games.filter(g => g.status !== 'Wishlist');
  const notStarted = owned.filter(g => g.status === 'Not Started').length;
  const inProgress = owned.filter(g => g.status === 'In Progress').length;
  return (notStarted === 0 && inProgress === 0 && owned.length > 0) ? 1 : 0;
}

function calcTripleThreat(games: Game[]): number {
  return games.filter(g => g.status === 'Completed' && g.rating >= 9).length;
}

function calcTheUntouchable(games: Game[]): number {
  return games.filter(g => {
    if (g.status === 'Wishlist') return false;
    const rarity = getCardRarity(g);
    return rarity.tier === 'legendary';
  }).length;
}

function calcSoulmateCollector(games: Game[]): number {
  return games.filter(g => getTotalHours(g) >= 100 && g.rating >= 8).length;
}

function calcPerfectMonth(games: Game[]): number {
  const allLogs = getAllPlayLogs(games);
  const completed = games.filter(g => g.status === 'Completed' && g.endDate);

  const monthSessions: Record<string, number> = {};
  const monthCompletions: Record<string, number> = {};

  allLogs.forEach(({ log }) => {
    const mk = getMonthKey(parseLocalDate(log.date));
    monthSessions[mk] = (monthSessions[mk] || 0) + 1;
  });

  completed.forEach(g => {
    const mk = getMonthKey(parseLocalDate(g.endDate!));
    monthCompletions[mk] = (monthCompletions[mk] || 0) + 1;
  });

  return Object.keys(monthSessions).filter(mk =>
    (monthCompletions[mk] || 0) >= 2 && monthSessions[mk] >= 20
  ).length;
}

function calcThePolymath(games: Game[]): number {
  const completedHighRated = games.filter(g => g.status === 'Completed' && g.rating >= 7 && g.genre);
  return new Set(completedHighRated.map(g => g.genre)).size;
}

function calcYearOne(games: Game[]): number {
  return calcTheHistorian(games); // Same metric, different thresholds
}

// ── Secret Trophies ──────────────────────────────────────────

function calcShelfOfShame(games: Game[]): boolean {
  return games.filter(g => g.status !== 'Wishlist' && getTotalHours(g) === 0).length >= 10;
}

function calcDejaVu(games: Game[]): boolean {
  const abandoned = games.filter(g => g.status === 'Abandoned' && g.franchise);
  return abandoned.some(a => {
    return games.some(g => g.id !== a.id && g.franchise === a.franchise && g.datePurchased &&
      a.endDate && g.datePurchased >= a.endDate);
  });
}

function calcTheFlipper(games: Game[]): boolean {
  const abandoned = games.filter(g => g.status === 'Abandoned' && g.startDate)
    .sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''));
  for (let i = 0; i < abandoned.length - 2; i++) {
    const d1 = parseLocalDate(abandoned[i].startDate!);
    const d3 = parseLocalDate(abandoned[i + 2].startDate!);
    if (daysBetween(d1, d3) <= 30) return true;
  }
  return false;
}

function calcGuiltyPleasure(games: Game[]): boolean {
  return games.some(g => getTotalHours(g) >= 50 && g.rating > 0 && g.rating <= 5);
}

function calcTheGhost(games: Game[]): boolean {
  const allLogs = getAllPlayLogs(games);
  if (allLogs.length < 2) return false;
  const dates = [...new Set(allLogs.map(({ log }) => log.date))].sort();
  for (let i = 1; i < dates.length; i++) {
    if (daysBetween(parseLocalDate(dates[i - 1]), parseLocalDate(dates[i])) >= 30) return true;
  }
  return false;
}

function calcSpeedrunShopper(games: Game[]): boolean {
  const purchased = games.filter(g => g.datePurchased);
  const dayPurchases: Record<string, number> = {};
  purchased.forEach(g => {
    dayPurchases[g.datePurchased!] = (dayPurchases[g.datePurchased!] || 0) + 1;
  });
  return Object.values(dayPurchases).some(c => c >= 3);
}

function calcContrarianII(games: Game[]): boolean {
  const played = games.filter(g => g.status !== 'Wishlist' && getTotalHours(g) > 0 && g.rating > 0);
  if (played.length < 3) return false;
  const sorted = [...played].sort((a, b) => getTotalHours(b) - getTotalHours(a));
  const mostPlayed = sorted[0];
  return played.every(g => g.rating >= mostPlayed.rating);
}

function calcTwoTimer(games: Game[]): boolean {
  const allLogs = getAllPlayLogs(games);
  const dayGames: Record<string, Set<string>> = {};
  allLogs.forEach(({ game, log }) => {
    if (!dayGames[log.date]) dayGames[log.date] = new Set();
    dayGames[log.date].add(game.id);
  });
  return Object.values(dayGames).filter(s => s.size >= 2).length >= 10;
}

function calcTheArchivist(games: Game[]): boolean {
  const owned = games.filter(g => g.status !== 'Wishlist');
  if (owned.length === 0) return false;
  return owned.every(g => (g.review || g.notes) && g.rating > 0 && g.playLogs && g.playLogs.length > 0);
}

// ── Master Evaluation ────────────────────────────────────────

/**
 * Evaluate a single tiered trophy against a value.
 * For "inverted" trophies (lower is better), pass `inverted: true`.
 */
function evaluateTieredTrophy(
  def: TrophyDefinition,
  value: number,
  inverted = false,
): TrophyProgress {
  if (!def.tiers || def.tiers.length === 0) {
    return {
      definition: def,
      earned: false,
      currentValue: value,
      currentTier: null,
      nextTier: 'bronze',
      progress: 0,
      points: 0,
    };
  }

  let currentTier: TrophyTierLevel | null = null;
  let points = 0;

  if (inverted) {
    // Lower is better (e.g., cost-per-hour, avg rating for tough critic)
    for (let i = def.tiers.length - 1; i >= 0; i--) {
      if (value <= def.tiers[i].threshold) {
        currentTier = def.tiers[i].tier;
        points = TIER_POINTS[def.tiers[i].tier];
        break;
      }
    }
  } else {
    for (let i = def.tiers.length - 1; i >= 0; i--) {
      if (value >= def.tiers[i].threshold) {
        currentTier = def.tiers[i].tier;
        points = TIER_POINTS[def.tiers[i].tier];
        break;
      }
    }
  }

  const earned = currentTier !== null;
  const tierIdx = currentTier ? TIER_ORDER.indexOf(currentTier) : -1;
  const nextTier = tierIdx < TIER_ORDER.length - 1 ? TIER_ORDER[tierIdx + 1] : null;

  // Calculate progress toward next tier
  let progress = 0;
  if (currentTier && tierIdx === TIER_ORDER.length - 1) {
    progress = 100; // Maxed out
  } else {
    const nextThreshold = nextTier ? def.tiers.find(t => t.tier === nextTier)!.threshold : def.tiers[0].threshold;
    const prevThreshold = currentTier ? def.tiers.find(t => t.tier === currentTier)!.threshold : 0;
    if (inverted) {
      if (prevThreshold === 0) {
        progress = value <= nextThreshold ? 100 : Math.max(0, (1 - (value - nextThreshold) / nextThreshold) * 100);
      } else {
        progress = Math.max(0, Math.min(100, ((prevThreshold - value) / (prevThreshold - nextThreshold)) * 100));
      }
    } else {
      progress = Math.min(100, ((value - prevThreshold) / (nextThreshold - prevThreshold)) * 100);
    }
  }

  return {
    definition: def,
    earned,
    currentValue: value,
    currentTier,
    nextTier,
    progress: Math.max(0, Math.min(100, progress)),
    points,
  };
}

function evaluateMilestone(def: TrophyDefinition, achieved: boolean): TrophyProgress {
  return {
    definition: def,
    earned: achieved,
    currentValue: achieved ? 1 : 0,
    currentTier: achieved ? 'gold' : null, // Milestones display as gold tier
    nextTier: achieved ? null : 'gold',
    progress: achieved ? 100 : 0,
    points: achieved ? MILESTONE_POINTS : 0,
  };
}

/**
 * Master function: evaluate all 100 trophies against game data.
 * Returns TrophyProgress for each trophy + total score.
 */
export function evaluateAllTrophies(games: Game[]): TrophyProgress[] {
  const defs = TROPHY_DEFINITIONS;
  const results: TrophyProgress[] = [];

  // First pass: calculate all non-legend trophies
  for (const def of defs) {
    if (def.category === 'legend' && def.id === 'library-titan') continue; // Second pass

    const result = evaluateTrophy(def, games, 0);
    results.push(result);
  }

  // Calculate intermediate score for Library Titan
  const intermediateScore = results.reduce((s, r) => s + r.points, 0);

  // Second pass: Library Titan
  const titanDef = defs.find(d => d.id === 'library-titan')!;
  results.push(evaluateTieredTrophy(titanDef, intermediateScore));

  return results;
}

function evaluateTrophy(def: TrophyDefinition, games: Game[], _trophyScore: number): TrophyProgress {
  // Milestone (one-time) trophies
  if (def.isMilestone) {
    return evaluateMilestoneById(def, games);
  }

  // Tiered trophies
  return evaluateTieredById(def, games);
}

function evaluateMilestoneById(def: TrophyDefinition, games: Game[]): TrophyProgress {
  switch (def.id) {
    case 'first-blood': return evaluateMilestone(def, calcFirstBlood(games));
    case 'the-collection-begins': return evaluateMilestone(def, calcCollectionBegins(games));
    case 'first-completion': return evaluateMilestone(def, calcFirstCompletion(games));
    case 'first-perfect-score': return evaluateMilestone(def, calcFirstPerfectScore(games));
    case 'first-heartbreak': return evaluateMilestone(def, calcFirstHeartbreak(games));
    case 'first-freebie': return evaluateMilestone(def, calcFirstFreebie(games));
    case 'first-franchise': return evaluateMilestone(def, calcFirstFranchise(games));
    case 'first-streak': return evaluateMilestone(def, calcFirstStreak(games));
    case 'first-budget': return evaluateMilestone(def, calcFirstBudget(games));
    case 'first-queue': return evaluateMilestone(def, calcFirstQueue(games));
    // Secrets
    case 'shelf-of-shame': return evaluateMilestone(def, calcShelfOfShame(games));
    case 'deja-vu': return evaluateMilestone(def, calcDejaVu(games));
    case 'the-flipper': return evaluateMilestone(def, calcTheFlipper(games));
    case 'guilty-pleasure': return evaluateMilestone(def, calcGuiltyPleasure(games));
    case 'the-ghost': return evaluateMilestone(def, calcTheGhost(games));
    case 'speedrun-shopper': return evaluateMilestone(def, calcSpeedrunShopper(games));
    case 'the-contrarian-ii': return evaluateMilestone(def, calcContrarianII(games));
    case 'two-timer': return evaluateMilestone(def, calcTwoTimer(games));
    case 'the-archivist': return evaluateMilestone(def, calcTheArchivist(games));
    case 'trophy-hunter': return evaluateMilestone(def, false); // Evaluated in hook after counting
    default: return evaluateMilestone(def, false);
  }
}

function evaluateTieredById(def: TrophyDefinition, games: Game[]): TrophyProgress {
  switch (def.id) {
    // Grind
    case 'century-club': return evaluateTieredTrophy(def, calcCenturyClub(games));
    case 'iron-lungs': return evaluateTieredTrophy(def, calcIronLungs(games));
    case 'the-streak': return evaluateTieredTrophy(def, calcTheStreak(games));
    case 'the-thousand': return evaluateTieredTrophy(def, calcTheThousand(games));
    case 'daily-ritual': return evaluateTieredTrophy(def, calcDailyRitual(games));
    case 'weekend-warrior': return evaluateTieredTrophy(def, calcWeekendWarrior(games));
    case 'comeback-kid': return evaluateTieredTrophy(def, calcComebackKid(games));
    case 'marathon-month': return evaluateTieredTrophy(def, calcMarathonMonth(games));
    case 'the-binger': return evaluateTieredTrophy(def, calcTheBinger(games));
    case 'slow-burn': return evaluateTieredTrophy(def, calcSlowBurn(games));
    case 'monthly-regular': return evaluateTieredTrophy(def, calcMonthlyRegular(games));
    case 'the-grinder': return evaluateTieredTrophy(def, calcTheGrinder(games));

    // Money
    case 'bargain-bin-king': return evaluateTieredTrophy(def, calcBargainBinKing(games));
    case 'penny-pincher': return evaluateTieredTrophy(def, calcPennyPincher(games), true);
    case 'big-spender': return evaluateTieredTrophy(def, calcBigSpender(games));
    case 'the-freeloader': return evaluateTieredTrophy(def, calcTheFreeloader(games));
    case 'discount-sniper': return evaluateTieredTrophy(def, calcDiscountSniper(games));
    case 'budget-master': return evaluateTieredTrophy(def, calcBudgetMaster(games));
    case 'the-investor': return evaluateTieredTrophy(def, calcTheInvestor(games));
    case 'value-flipper': return evaluateTieredTrophy(def, calcValueFlipper(games));
    case 'full-price-supporter': return evaluateTieredTrophy(def, calcFullPriceSupporter(games));
    case 'cost-conscious': return evaluateTieredTrophy(def, calcCostConscious(games), true);
    case 'the-whale': return evaluateTieredTrophy(def, calcTheWhale(games));
    case 'budget-warrior': return evaluateTieredTrophy(def, calcBudgetWarrior(games));

    // Finisher
    case 'completionist': return evaluateTieredTrophy(def, calcCompletionist(games));
    case 'speedrunner': return evaluateTieredTrophy(def, calcSpeedrunner(games), true);
    case 'the-closer': return evaluateTieredTrophy(def, calcTheCloser(games));
    case 'no-game-left-behind': return evaluateTieredTrophy(def, calcNoGameLeftBehind(games), true);
    case 'backlog-slayer': return evaluateTieredTrophy(def, calcBacklogSlayer(games));
    case 'completion-streak': return evaluateTieredTrophy(def, calcCompletionStreak(games));
    case 'the-sprint': return evaluateTieredTrophy(def, calcTheSprint(games));
    case 'resurrection': return evaluateTieredTrophy(def, calcResurrection(games));
    case 'one-and-done': return evaluateTieredTrophy(def, calcOneAndDone(games));
    case 'the-minimalist': return evaluateTieredTrophy(def, calcTheMinimalist(games));
    case 'epic-journey': return evaluateTieredTrophy(def, calcEpicJourney(games));
    case 'the-ender': return evaluateTieredTrophy(def, calcTheEnder(games));

    // Explorer
    case 'genre-tourist': return evaluateTieredTrophy(def, calcGenreTourist(games));
    case 'platform-hopper': return evaluateTieredTrophy(def, calcPlatformHopper(games));
    case 'franchise-devotee': return evaluateTieredTrophy(def, calcFranchiseDevotee(games));
    case 'new-horizons': return evaluateTieredTrophy(def, calcNewHorizons(games));
    case 'the-collector': return evaluateTieredTrophy(def, calcTheCollector(games));
    case 'source-diversifier': return evaluateTieredTrophy(def, calcSourceDiversifier(games));
    case 'variety-hour': return evaluateTieredTrophy(def, calcVarietyHour(games));
    case 'genre-breaker': return evaluateTieredTrophy(def, calcGenreBreaker(games));
    case 'the-rotation': return evaluateTieredTrophy(def, calcTheRotation(games));
    case 'seasonal-gamer': return evaluateTieredTrophy(def, calcSeasonalGamer(games));

    // Critic
    case 'tough-critic': return evaluateTieredTrophy(def, calcToughCritic(games), true);
    case 'eternal-optimist': return evaluateTieredTrophy(def, calcEternalOptimist(games));
    case 'perfect-10': return evaluateTieredTrophy(def, calcPerfect10(games));
    case 'balanced-palate': return evaluateTieredTrophy(def, calcBalancedPalate(games), true);
    case 'the-reviewer': return evaluateTieredTrophy(def, calcTheReviewer(games));
    case 'surprise-hit': return evaluateTieredTrophy(def, calcSurpriseHit(games));
    case 'money-pit': return evaluateTieredTrophy(def, calcMoneyPit(games));
    case 'the-contrarian': return evaluateTieredTrophy(def, calcTheContrarian(games));
    case 'critics-choice': return evaluateTieredTrophy(def, calcCriticsChoice(games));
    case 'rating-evolution': return evaluateTieredTrophy(def, calcRatingEvolution(games));

    // Personality
    case 'monogamist': return evaluateTieredTrophy(def, calcMonogamist(games));
    case 'juggler': return evaluateTieredTrophy(def, calcJuggler(games));
    case 'patient-gamer': return evaluateTieredTrophy(def, calcPatientGamer(games));
    case 'binge-and-purge': return evaluateTieredTrophy(def, calcBingeAndPurge(games));
    case 'creature-of-habit': return evaluateTieredTrophy(def, calcCreatureOfHabit(games));
    case 'the-abandoner': return evaluateTieredTrophy(def, calcTheAbandoner(games));
    case 'sunk-cost-survivor': return evaluateTieredTrophy(def, calcSunkCostSurvivor(games));
    case 'day-one': return evaluateTieredTrophy(def, calcDayOne(games));
    case 'queue-skipper': return evaluateTieredTrophy(def, calcQueueSkipper(games));
    case 'parallel-player': return evaluateTieredTrophy(def, calcParallelPlayer(games));
    case 'the-decider': return evaluateTieredTrophy(def, calcTheDecider(games));
    case 'hibernation-breaker': return evaluateTieredTrophy(def, calcHibernationBreaker(games));
    case 'the-revisionist': return evaluateTieredTrophy(def, calcTheRevisionist(games));
    case 'impulse-hour': return evaluateTieredTrophy(def, calcImpulseHour(games));

    // Legend
    case 'the-historian': return evaluateTieredTrophy(def, calcTheHistorian(games));
    case 'golden-ratio': return evaluateTieredTrophy(def, calcGoldenRatio(games));
    case 'backlog-zero': return evaluateTieredTrophy(def, calcBacklogZero(games));
    case 'triple-threat': return evaluateTieredTrophy(def, calcTripleThreat(games));
    case 'the-untouchable': return evaluateTieredTrophy(def, calcTheUntouchable(games));
    case 'soulmate-collector': return evaluateTieredTrophy(def, calcSoulmateCollector(games));
    case 'perfect-month': return evaluateTieredTrophy(def, calcPerfectMonth(games));
    case 'the-polymath': return evaluateTieredTrophy(def, calcThePolymath(games));
    case 'year-one': return evaluateTieredTrophy(def, calcYearOne(games));
    case 'library-titan': return evaluateTieredTrophy(def, calcLibraryTitan(games, 0));

    default: return evaluateTieredTrophy(def, 0);
  }
}

/**
 * Get trophy score summary for display in header.
 */
export function getTrophyScoreSummary(trophies: TrophyProgress[]): TrophyScoreSummary {
  const byCategory: Record<string, { earned: number; total: number; points: number }> = {};

  for (const t of trophies) {
    const cat = t.definition.category;
    if (!byCategory[cat]) byCategory[cat] = { earned: 0, total: 0, points: 0 };
    byCategory[cat].total++;
    if (t.earned) {
      byCategory[cat].earned++;
      byCategory[cat].points += t.points;
    }
  }

  return {
    totalScore: trophies.reduce((s, t) => s + t.points, 0),
    earnedCount: trophies.filter(t => t.earned).length,
    totalCount: trophies.length,
    byCategory,
    pinnedIds: [],
  };
}
