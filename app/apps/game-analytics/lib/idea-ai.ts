'use client';

import { getAIModel } from './ai-client';
import { getCache, setCache } from './cache';
import { Game } from './types';
import { getTotalHours } from './calculations';

// ──────────────────────────────────────────────────────────────────────────
// NewIdeas100-June2026 — AI batch (#79 Roast, #80 Horoscope, #87 Tonight's
// Forecast). All defensive: any failure returns a deterministic fallback so the
// app never breaks when AI is unavailable.
// ──────────────────────────────────────────────────────────────────────────

const DAY_TTL = 1000 * 60 * 60 * 20; // ~daily

function librarySummary(games: Game[]): string {
  const owned = games.filter((g) => g.status !== 'Wishlist');
  const top = [...owned]
    .sort((a, b) => getTotalHours(b) - getTotalHours(a))
    .slice(0, 6)
    .map((g) => `${g.name} (${getTotalHours(g).toFixed(0)}h, ${g.rating || '?'}/10, ${g.status})`)
    .join('; ');
  const totalHours = owned.reduce((s, g) => s + getTotalHours(g), 0);
  const spent = owned.reduce((s, g) => s + (g.price || 0), 0);
  const completed = owned.filter((g) => g.status === 'Completed').length;
  const abandoned = owned.filter((g) => g.status === 'Abandoned').length;
  const notStarted = owned.filter((g) => g.status === 'Not Started').length;
  return `Library: ${owned.length} games, ${totalHours.toFixed(0)}h total, $${spent.toFixed(0)} spent, ${completed} completed, ${abandoned} abandoned, ${notStarted} never started. Top games: ${top}.`;
}

async function runAI(prompt: string): Promise<string | null> {
  try {
    const model = getAIModel();
    const result = await model.generateContent(prompt);
    return result.response.text().trim().replace(/^["']|["']$/g, '');
  } catch (e) {
    console.error('idea-ai generation failed:', e);
    return null;
  }
}

/** #79 Roast My Library — loving brutality. */
export async function generateLibraryRoast(games: Game[]): Promise<{ text: string; ai: boolean }> {
  const cacheKey = 'idea-roast-v1';
  const cached = getCache<string>(cacheKey, DAY_TTL);
  if (cached) return { text: cached, ai: true };

  if (games.filter((g) => g.status !== 'Wishlist').length < 2)
    return { text: 'Add a few games and I’ll have plenty to roast you about.', ai: false };

  const prompt = `You are a witty, affectionate gaming roast comedian. Roast this person's gaming habits in 2-3 punchy sentences. Be funny and a little savage, but never genuinely mean. Reference specific numbers.\n\n${librarySummary(games)}\n\nReturn ONLY the roast.`;
  const out = await runAI(prompt);
  if (out) {
    setCache(cacheKey, out);
    return { text: out, ai: true };
  }
  // Fallback
  const abandoned = games.filter((g) => g.status === 'Abandoned').length;
  const notStarted = games.filter((g) => g.status === 'Not Started').length;
  return {
    text: `${notStarted} unplayed games and ${abandoned} abandoned ones. Your backlog isn't a library, it's a museum of good intentions.`,
    ai: false,
  };
}

/** #80 AI Gamer Horoscope — daily, playful. */
export async function generateGamingHoroscope(games: Game[]): Promise<{ text: string; ai: boolean }> {
  const dayKey = new Date().toISOString().slice(0, 10);
  const cacheKey = `idea-horoscope-${dayKey}`;
  const cached = getCache<string>(cacheKey, DAY_TTL);
  if (cached) return { text: cached, ai: true };

  const prompt = `You are a mystical gaming oracle. Write a short, fun "gaming horoscope" for today (2 sentences) based on this player's habits. Whimsical, like an astrology reading but about gaming. Reference a real pattern in their data.\n\n${librarySummary(games)}\n\nReturn ONLY the horoscope.`;
  const out = await runAI(prompt);
  if (out) {
    setCache(cacheKey, out);
    return { text: out, ai: true };
  }
  return {
    text: 'The stars suggest a short session today — something cozy from your backlog is calling. Resist the urge to buy something new.',
    ai: false,
  };
}

/** #87 Tonight's Forecast — what to play tonight. */
export async function generateTonightsForecast(games: Game[]): Promise<{ text: string; ai: boolean }> {
  const dayKey = new Date().toISOString().slice(0, 10);
  const cacheKey = `idea-forecast-${dayKey}`;
  const cached = getCache<string>(cacheKey, DAY_TTL);
  if (cached) return { text: cached, ai: true };

  const inProgress = games.filter((g) => g.status === 'In Progress');
  const candidates = (inProgress.length ? inProgress : games.filter((g) => g.status === 'Not Started'))
    .slice(0, 8)
    .map((g) => `${g.name} (${g.genre || '?'}, ${getTotalHours(g).toFixed(0)}h in)`)
    .join('; ');

  if (!candidates) return { text: 'Add some games and I’ll forecast your perfect night in.', ai: false };

  const prompt = `You are a gaming concierge. Recommend what this player should play TONIGHT in 1-2 sentences with a confidence feel (e.g. "tonight feels like a 2-hour X run"). Pick from their active/backlog games.\n\nCandidates: ${candidates}\n\nReturn ONLY the recommendation.`;
  const out = await runAI(prompt);
  if (out) {
    setCache(cacheKey, out);
    return { text: out, ai: true };
  }
  const pick = (inProgress[0] || games[0])?.name || 'something from your backlog';
  return { text: `Tonight feels like a session with ${pick} — pick up where you left off.`, ai: false };
}
