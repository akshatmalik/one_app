import { Game } from './types';
import { getTotalHours, getValueRating, calculateCostPerHour } from './calculations';

// ──────────────────────────────────────────────────────────────────────────
// NewIdeas100-June2026 — Wave 1 stat features.
// Self-contained pure functions, so the 2,300-line calculations.ts stays put.
// ──────────────────────────────────────────────────────────────────────────

const VALUE_THRESHOLDS = { Excellent: 1, Good: 3, Fair: 5 } as const;

/** #20 Regret Refund Estimator — theoretical "refund" of barely-touched paid games. */
export function getRegretRefund(games: Game[]): {
  total: number;
  count: number;
  games: Array<{ name: string; price: number; hours: number }>;
} {
  const regrets = games
    .filter((g) => g.status !== 'Wishlist' && (g.price || 0) > 0 && getTotalHours(g) < 2)
    .map((g) => ({ name: g.name, price: g.price || 0, hours: getTotalHours(g) }))
    .sort((a, b) => b.price - a.price);
  return {
    total: regrets.reduce((s, g) => s + g.price, 0),
    count: regrets.length,
    games: regrets.slice(0, 8),
  };
}

/**
 * #21 Completion ETA — estimate a finish date for an in-progress game from the
 * player's recent personal pace (hours/week) and a genre-typical total length.
 */
export function getCompletionETA(
  game: Game,
  allGames: Game[]
): { etaDate: string | null; hoursRemaining: number; weeksRemaining: number } | null {
  if (game.status !== 'In Progress') return null;

  const played = getTotalHours(game);
  // Target length: explicit estimate, else median total hours of completed games in genre, else 20h.
  let target = game.expectedHours || 0;
  if (!target) {
    const peers = allGames
      .filter((g) => g.status === 'Completed' && g.genre === game.genre)
      .map(getTotalHours)
      .filter((h) => h > 0)
      .sort((a, b) => a - b);
    target = peers.length ? peers[Math.floor(peers.length / 2)] : 20;
  }
  const hoursRemaining = Math.max(0, target - played);

  // Personal pace: hours logged across all games in the last 28 days.
  const cutoff = Date.now() - 28 * 86400_000;
  let recentHours = 0;
  for (const g of allGames) {
    for (const log of g.playLogs || []) {
      if (new Date(log.date).getTime() >= cutoff) recentHours += log.hours || 0;
    }
  }
  const hoursPerWeek = recentHours / 4;
  if (hoursPerWeek <= 0) return { etaDate: null, hoursRemaining, weeksRemaining: Infinity };

  const weeksRemaining = hoursRemaining / hoursPerWeek;
  const eta = new Date(Date.now() + weeksRemaining * 7 * 86400_000);
  return { etaDate: eta.toISOString(), hoursRemaining, weeksRemaining };
}

/** #22 Value Tier Progress — hours needed to reach the next value tier. */
export function getValueTierProgress(game: Game): {
  tier: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  nextTier: 'Excellent' | 'Good' | 'Fair' | null;
  hoursToNext: number;
  costPerHour: number;
} | null {
  const price = game.price || 0;
  const hours = getTotalHours(game);
  if (price <= 0 || hours <= 0) return null;

  const cph = calculateCostPerHour(price, hours);
  const tier = getValueRating(cph);
  const order: Array<'Excellent' | 'Good' | 'Fair'> = ['Fair', 'Good', 'Excellent'];
  // Find the best tier strictly better than the current one.
  let nextTier: 'Excellent' | 'Good' | 'Fair' | null = null;
  if (tier === 'Poor') nextTier = 'Fair';
  else if (tier === 'Fair') nextTier = 'Good';
  else if (tier === 'Good') nextTier = 'Excellent';
  if (!nextTier || !order.includes(nextTier as 'Fair' | 'Good' | 'Excellent')) {
    if (tier === 'Excellent') return { tier, nextTier: null, hoursToNext: 0, costPerHour: cph };
  }

  const targetCph = VALUE_THRESHOLDS[nextTier as keyof typeof VALUE_THRESHOLDS];
  const hoursNeeded = price / targetCph; // hours at which cph hits the threshold
  return {
    tier,
    nextTier,
    hoursToNext: Math.max(0, hoursNeeded - hours),
    costPerHour: cph,
  };
}

/** #23 Personal Records Board — your gaming "world records". */
export function getPersonalRecords(games: Game[]): Array<{ label: string; value: string; game?: string }> {
  const records: Array<{ label: string; value: string; game?: string }> = [];

  // Longest single session
  let longest = { hours: 0, game: '' };
  for (const g of games) {
    for (const log of g.playLogs || []) {
      if ((log.hours || 0) > longest.hours) longest = { hours: log.hours, game: g.name };
    }
  }
  if (longest.hours > 0) records.push({ label: 'Longest session', value: `${longest.hours.toFixed(1)}h`, game: longest.game });

  // Most hours in one game
  const mostPlayed = [...games].sort((a, b) => getTotalHours(b) - getTotalHours(a))[0];
  if (mostPlayed && getTotalHours(mostPlayed) > 0)
    records.push({ label: 'Most hours', value: `${getTotalHours(mostPlayed).toFixed(0)}h`, game: mostPlayed.name });

  // Cheapest cost-per-hour among paid games with playtime
  const paid = games.filter((g) => (g.price || 0) > 0 && getTotalHours(g) > 0);
  const cheapest = paid.sort((a, b) => calculateCostPerHour(a.price, getTotalHours(a)) - calculateCostPerHour(b.price, getTotalHours(b)))[0];
  if (cheapest)
    records.push({ label: 'Best value', value: `$${calculateCostPerHour(cheapest.price, getTotalHours(cheapest)).toFixed(2)}/hr`, game: cheapest.name });

  // Highest rated
  const rated = games.filter((g) => (g.rating || 0) > 0).sort((a, b) => (b.rating || 0) - (a.rating || 0))[0];
  if (rated) records.push({ label: 'Highest rated', value: `${rated.rating}/10`, game: rated.name });

  // Priciest purchase
  const priciest = [...games].sort((a, b) => (b.price || 0) - (a.price || 0))[0];
  if (priciest && (priciest.price || 0) > 0) records.push({ label: 'Biggest splurge', value: `$${(priciest.price || 0).toFixed(0)}`, game: priciest.name });

  // Fastest completion (start → end)
  let fastest = { days: Infinity, game: '' };
  for (const g of games) {
    if (g.status === 'Completed' && g.startDate && g.endDate) {
      const d = (new Date(g.endDate).getTime() - new Date(g.startDate).getTime()) / 86400_000;
      if (d >= 0 && d < fastest.days) fastest = { days: d, game: g.name };
    }
  }
  if (fastest.game) records.push({ label: 'Fastest finish', value: `${Math.round(fastest.days)}d`, game: fastest.game });

  return records;
}

/** #24 Stat of the Day — a surprising fact, deterministic per calendar day. */
export function getStatOfTheDay(games: Game[]): { text: string; icon: string } | null {
  if (!games.length) return null;
  const totalHours = games.reduce((s, g) => s + getTotalHours(g), 0);
  const totalSpent = games.reduce((s, g) => s + (g.price || 0), 0);
  const completed = games.filter((g) => g.status === 'Completed').length;
  const owned = games.filter((g) => g.status !== 'Wishlist').length;
  const avgCph = totalHours > 0 ? totalSpent / totalHours : 0;

  const pool: Array<{ text: string; icon: string }> = [
    { icon: '⏱️', text: `You've logged ${totalHours.toFixed(0)} hours — that's ${(totalHours / 24).toFixed(1)} full days of gaming.` },
    { icon: '💸', text: `Across your library you've spent $${totalSpent.toFixed(0)} at an average of $${avgCph.toFixed(2)}/hour.` },
    { icon: '🏁', text: `You've completed ${completed} of ${owned} owned games — a ${owned ? Math.round((completed / owned) * 100) : 0}% finish rate.` },
    { icon: '🎮', text: `Your library holds ${games.length} games. The average one cost $${owned ? (totalSpent / owned).toFixed(0) : 0}.` },
    { icon: '🔥', text: `At your average value, every $1 buys you ${avgCph > 0 ? (1 / avgCph).toFixed(1) : '∞'} hours of play.` },
  ];
  // Day-seeded index so it's stable for the whole day but rotates daily.
  const dayIndex = Math.floor(Date.now() / 86400_000);
  return pool[dayIndex % pool.length];
}

const ENTERTAINMENT: Array<{ label: string; perHour: number; icon: string }> = [
  { label: 'movie tickets', perHour: 12, icon: '🎬' },
  { label: 'concerts', perHour: 25, icon: '🎤' },
  { label: 'dining out', perHour: 15, icon: '🍽️' },
  { label: 'lattes', perHour: 5, icon: '☕' },
];

/** #25 Cost in Real-World Units — reframe your $/hr playfully. */
export function getRealWorldUnits(games: Game[]): {
  costPerHour: number;
  comparisons: Array<{ label: string; icon: string; multiplier: number; saved: number }>;
} | null {
  const totalHours = games.reduce((s, g) => s + getTotalHours(g), 0);
  const totalSpent = games.reduce((s, g) => s + (g.price || 0), 0);
  if (totalHours <= 0) return null;
  const cph = totalSpent / totalHours;
  const comparisons = ENTERTAINMENT.map((e) => ({
    label: e.label,
    icon: e.icon,
    multiplier: cph > 0 ? e.perHour / cph : Infinity,
    saved: Math.max(0, (e.perHour - cph) * totalHours),
  }));
  return { costPerHour: cph, comparisons };
}

/** #18 Taste Twin Genres — genres you treat alike (similar avg rating & hours). */
export function getTasteTwinGenres(games: Game[]): Array<{ a: string; b: string; similarity: number }> {
  const byGenre = new Map<string, { ratings: number[]; hours: number[] }>();
  for (const g of games) {
    if (!g.genre) continue;
    const e = byGenre.get(g.genre) || { ratings: [], hours: [] };
    if ((g.rating || 0) > 0) e.ratings.push(g.rating);
    e.hours.push(getTotalHours(g));
    byGenre.set(g.genre, e);
  }
  const profile = (e: { ratings: number[]; hours: number[] }) => ({
    rating: e.ratings.length ? e.ratings.reduce((s, r) => s + r, 0) / e.ratings.length : 0,
    hours: e.hours.length ? e.hours.reduce((s, h) => s + h, 0) / e.hours.length : 0,
  });
  const genres = [...byGenre.keys()];
  const pairs: Array<{ a: string; b: string; similarity: number }> = [];
  for (let i = 0; i < genres.length; i++) {
    for (let j = i + 1; j < genres.length; j++) {
      const pa = profile(byGenre.get(genres[i])!);
      const pb = profile(byGenre.get(genres[j])!);
      const ratingDelta = Math.abs(pa.rating - pb.rating); // 0-10
      const hoursDelta = Math.min(1, Math.abs(pa.hours - pb.hours) / 40); // normalized
      const similarity = Math.round((1 - (ratingDelta / 10) * 0.6 - hoursDelta * 0.4) * 100);
      pairs.push({ a: genres[i], b: genres[j], similarity });
    }
  }
  return pairs.sort((x, y) => y.similarity - x.similarity).slice(0, 5);
}

/** #74 Beat the Clock — games with a finish-by deadline and whether you're on track. */
export function getDeadlineGames(games: Game[]): Array<{
  name: string;
  deadline: string;
  daysLeft: number;
  onTrack: boolean | null;
}> {
  const now = Date.now();
  return games
    .filter((g) => g.deadline && g.status !== 'Completed' && g.status !== 'Wishlist')
    .map((g) => {
      const daysLeft = Math.ceil((new Date(g.deadline!).getTime() - now) / 86400_000);
      const eta = getCompletionETA(g, games);
      // On track if the ETA lands before the deadline.
      let onTrack: boolean | null = null;
      if (eta && eta.etaDate) onTrack = new Date(eta.etaDate).getTime() <= new Date(g.deadline!).getTime();
      else if (eta && eta.weeksRemaining === Infinity) onTrack = false;
      return { name: g.name, deadline: g.deadline!, daysLeft, onTrack };
    })
    .sort((a, b) => a.daysLeft - b.daysLeft);
}

/** #55 Completion Confidence — non-AI heuristic 0-100 that you'll finish a game. */
export function getCompletionConfidence(game: Game, allGames: Game[]): { score: number; label: string } | null {
  if (game.status !== 'In Progress') return null;
  const hours = getTotalHours(game);

  // Genre completion rate
  const genrePeers = allGames.filter((g) => g.genre === game.genre && g.status !== 'Wishlist' && g.status !== 'Not Started');
  const genreCompleted = genrePeers.filter((g) => g.status === 'Completed').length;
  const genreRate = genrePeers.length ? genreCompleted / genrePeers.length : 0.5;

  // Recency of last session
  const logs = (game.playLogs || []).map((l) => new Date(l.date).getTime()).sort((a, b) => b - a);
  const daysSince = logs.length ? (Date.now() - logs[0]) / 86400_000 : 999;
  const recencyScore = daysSince <= 7 ? 1 : daysSince <= 30 ? 0.6 : daysSince <= 60 ? 0.3 : 0.1;

  // Hours invested (more invested → more likely to finish)
  const investmentScore = Math.min(1, hours / 15);

  const score = Math.round((genreRate * 0.4 + recencyScore * 0.4 + investmentScore * 0.2) * 100);
  const label = score >= 70 ? 'Likely to finish' : score >= 40 ? 'Could go either way' : 'At risk of stalling';
  return { score, label };
}
