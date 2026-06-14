import { Game } from './types';
import { getTotalHours } from './calculations';

// ──────────────────────────────────────────────────────────────────────────
// NewIdeas100-June2026 — Wave 2: the "fun" layer.
// Deterministic (non-AI) generators that feed the Surprise Me grab-bag (#100),
// Spirit Animal (#36-style), Restaurant Review, and Library Yearbook captions.
// ──────────────────────────────────────────────────────────────────────────

function libraryShape(games: Game[]) {
  const owned = games.filter((g) => g.status !== 'Wishlist');
  const totalHours = owned.reduce((s, g) => s + getTotalHours(g), 0);
  const completed = owned.filter((g) => g.status === 'Completed').length;
  const abandoned = owned.filter((g) => g.status === 'Abandoned').length;
  const notStarted = owned.filter((g) => g.status === 'Not Started').length;
  const avgHours = owned.length ? totalHours / owned.length : 0;
  const completionRate = owned.length ? completed / owned.length : 0;
  const backlogRate = owned.length ? notStarted / owned.length : 0;
  return { owned, totalHours, completed, abandoned, notStarted, avgHours, completionRate, backlogRate };
}

/** Gaming Spirit Animal — playstyle archetype as an animal. */
export function getGamingSpiritAnimal(games: Game[]): { animal: string; emoji: string; blurb: string } {
  const s = libraryShape(games);
  if (s.owned.length === 0) return { animal: 'Blank-Slate Owl', emoji: '🦉', blurb: 'A fresh library, full of potential.' };

  if (s.avgHours >= 40)
    return { animal: 'Hibernating Bear', emoji: '🐻', blurb: 'Long, deep playthroughs. When you commit, you commit hard.' };
  if (s.backlogRate >= 0.5)
    return { animal: 'Hoarding Squirrel', emoji: '🐿️', blurb: 'You stockpile games for a winter that never quite comes.' };
  if (s.completionRate >= 0.6)
    return { animal: 'Determined Beaver', emoji: '🦫', blurb: 'You finish what you start. Few things go unbuilt.' };
  if (s.avgHours <= 8)
    return { animal: 'Curious Hummingbird', emoji: '🐦', blurb: 'You flit between games, sampling nectar everywhere.' };
  if (s.abandoned >= s.completed && s.abandoned > 0)
    return { animal: 'Restless Cat', emoji: '🐈', blurb: 'Easily intrigued, easily bored. The next game always looks shinier.' };
  return { animal: 'Balanced Fox', emoji: '🦊', blurb: 'Adaptable and varied — a bit of everything, mastered with cunning.' };
}

/** Gaming Restaurant Review — your habits framed as a restaurant critic's verdict. */
export function getGamingRestaurantReview(games: Game[]): { stars: number; headline: string; review: string } {
  const s = libraryShape(games);
  const stars = Math.max(1, Math.min(5, Math.round(1 + s.completionRate * 3 + (s.avgHours > 15 ? 1 : 0))));
  const headline =
    stars >= 4 ? 'A satisfying establishment' : stars === 3 ? 'Solid, if a little uneven' : 'Ambitious menu, shaky execution';
  const review =
    `Generous portions — ${s.totalHours.toFixed(0)} hours served across ${s.owned.length} dishes. ` +
    (s.completionRate >= 0.5
      ? 'Patrons tend to clean their plates. '
      : 'Many plates leave the kitchen barely touched. ') +
    (s.backlogRate >= 0.4 ? 'The pantry is dangerously overstocked. ' : 'The pantry is well-managed. ') +
    `${stars} stars.`;
  return { stars, headline, review };
}

/** Library Yearbook — superlative captions for notable games. */
export function getLibraryYearbook(games: Game[]): Array<{ title: string; game: string; emoji: string }> {
  const owned = games.filter((g) => g.status !== 'Wishlist');
  if (!owned.length) return [];
  const entries: Array<{ title: string; game: string; emoji: string }> = [];

  const mostPlayed = [...owned].sort((a, b) => getTotalHours(b) - getTotalHours(a))[0];
  if (mostPlayed && getTotalHours(mostPlayed) > 0) entries.push({ title: 'Most Popular', game: mostPlayed.name, emoji: '👑' });

  const abandoned = owned.filter((g) => g.status === 'Abandoned').sort((a, b) => getTotalHours(b) - getTotalHours(a))[0];
  if (abandoned) entries.push({ title: 'Most Likely to Be Forgotten', game: abandoned.name, emoji: '👻' });

  const priciest = [...owned].sort((a, b) => (b.price || 0) - (a.price || 0))[0];
  if (priciest && (priciest.price || 0) > 0) entries.push({ title: 'Best Dressed (Priciest)', game: priciest.name, emoji: '💎' });

  const bestRated = owned.filter((g) => (g.rating || 0) > 0).sort((a, b) => (b.rating || 0) - (a.rating || 0))[0];
  if (bestRated) entries.push({ title: 'Class Valedictorian', game: bestRated.name, emoji: '🎓' });

  const sleeper = owned
    .filter((g) => (g.price || 0) <= 20 && getTotalHours(g) >= 15)
    .sort((a, b) => getTotalHours(b) - getTotalHours(a))[0];
  if (sleeper) entries.push({ title: 'Biggest Sleeper Hit', game: sleeper.name, emoji: '🌟' });

  return entries;
}

export type SurpriseKind = 'spirit-animal' | 'restaurant' | 'yearbook';

/** #100 Surprise Me — one tap returns a random delight, seedable for variety. */
export function getSurpriseMe(
  games: Game[],
  seed = Date.now()
): { kind: SurpriseKind; title: string; body: string; emoji: string } {
  const kinds: SurpriseKind[] = ['spirit-animal', 'restaurant', 'yearbook'];
  const kind = kinds[Math.abs(seed) % kinds.length];

  if (kind === 'spirit-animal') {
    const a = getGamingSpiritAnimal(games);
    return { kind, title: `Your spirit animal: ${a.animal}`, body: a.blurb, emoji: a.emoji };
  }
  if (kind === 'restaurant') {
    const r = getGamingRestaurantReview(games);
    return { kind, title: `${'★'.repeat(r.stars)}${'☆'.repeat(5 - r.stars)} — ${r.headline}`, body: r.review, emoji: '🍽️' };
  }
  const yb = getLibraryYearbook(games);
  if (yb.length) {
    const pick = yb[Math.abs(seed) % yb.length];
    return { kind, title: `Yearbook: ${pick.title}`, body: pick.game, emoji: pick.emoji };
  }
  const a = getGamingSpiritAnimal(games);
  return { kind: 'spirit-animal', title: `Your spirit animal: ${a.animal}`, body: a.blurb, emoji: a.emoji };
}
