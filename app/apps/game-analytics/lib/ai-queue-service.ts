'use client';

import { getAI, getGenerativeModel, GoogleAIBackend } from 'firebase/ai';
import { initializeApp, getApps } from 'firebase/app';
import { QueueAIContext } from './calculations';

const firebaseConfig = {
  apiKey: "AIzaSyBS3IVvszDrm_zjjXu8TATgs1H-FlegHtM",
  authDomain: "oneapp-943e3.firebaseapp.com",
  projectId: "oneapp-943e3",
  storageBucket: "oneapp-943e3.firebasestorage.app",
  messagingSenderId: "1052736128978",
  appId: "1:1052736128978:web:9d42b47c6a343eac35aa0b",
};

function getAIModel() {
  const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  const ai = getAI(app, { backend: new GoogleAIBackend() });
  return getGenerativeModel(ai, { model: "gemini-2.5-flash" });
}

// Cache key for localStorage
const CACHE_KEY = 'queue-ai-cache';
const CACHE_TTL = 1000 * 60 * 60 * 4; // 4 hours

interface CachedAIResult {
  timestamp: number;
  queueHash: string;
  hypeChirps: string[];
  narrative: string;
  roast: string;
  hype: string;
  advisorSuggestion: string;
}

function getQueueHash(ctx: QueueAIContext): string {
  return ctx.queuedGames.map(g => `${g.name}:${g.queuePosition}:${g.hours}`).join('|');
}

function getCachedResult(): CachedAIResult | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cached: CachedAIResult = JSON.parse(raw);
    if (Date.now() - cached.timestamp > CACHE_TTL) return null;
    return cached;
  } catch {
    return null;
  }
}

function setCachedResult(result: CachedAIResult): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(result));
  } catch {
    // ignore storage errors
  }
}

function buildContextPrompt(ctx: QueueAIContext): string {
  const gamesList = ctx.queuedGames.map(g => {
    const parts = [`#${g.queuePosition} ${g.name} (${g.genre}, ${g.platform})`];
    parts.push(`Status: ${g.status}, ${g.hours}h played, $${g.price}`);
    if (g.daysSinceLastPlay >= 0) parts.push(`Last played: ${g.daysSinceLastPlay} days ago`);
    if (g.lastSessionNote) parts.push(`Last note: "${g.lastSessionNote}"`);
    if (g.daysSincePurchase > 0) parts.push(`Owned: ${g.daysSincePurchase} days`);
    return parts.join(' | ');
  }).join('\n');

  return `You are a witty, passionate gaming companion analyzing a player's "Up Next" queue.

PLAYER PROFILE:
- Gaming personality: ${ctx.personalityType}
- Activity level: ${ctx.activityLevel}
- Current streak: ${ctx.streak} days
- Velocity: ${ctx.velocity.toFixed(1)} hrs/day (last 7 days)
- Completion rate: ${ctx.completionRate}%
- Today: ${ctx.dayOfWeek}

QUEUE (${ctx.queuedGames.length} games, ~${ctx.totalQueueHours}h, $${ctx.totalQueueCost}):
${gamesList}

Genres in queue: ${ctx.genres.join(', ')}`;
}

/**
 * Generate AI hype chirps for the queue
 */
export async function generateHypeChirps(ctx: QueueAIContext): Promise<string[]> {
  const cached = getCachedResult();
  const hash = getQueueHash(ctx);
  if (cached && cached.queueHash === hash && cached.hypeChirps.length > 0) {
    return cached.hypeChirps;
  }

  const model = getAIModel();
  const prompt = `${buildContextPrompt(ctx)}

Generate 4-5 SHORT, punchy chirps (1-2 sentences each) to hype the player about their queue. Each chirp should reference specific games, hours, genres, or patterns in their data.

Chirp styles:
1. A chirp about the NOW PLAYING game (motivational, referencing their progress/momentum)
2. A chirp about what's ON DECK / coming next (build excitement for the transition)
3. A chirp about a deep backlog game (funny/sympathetic about waiting)
4. A stat-based chirp (reference hours, money, genres — make it feel alive)
5. A day-of-week or situational chirp (it's ${ctx.dayOfWeek} — what should they do?)

Be specific. Use the actual game names and numbers. Be punchy, not formal. Think hype announcer mixed with supportive friend.

Return ONLY the chirps, one per line, no numbering or labels.`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const chirps = text.split('\n').filter(l => l.trim().length > 0).slice(0, 5);

    // Update cache
    const existing = cached || { timestamp: 0, queueHash: '', hypeChirps: [], narrative: '', roast: '', hype: '', advisorSuggestion: '' };
    setCachedResult({ ...existing, timestamp: Date.now(), queueHash: hash, hypeChirps: chirps });

    return chirps;
  } catch (error) {
    console.error('AI hype chirps error:', error);
    return getFallbackChirps(ctx);
  }
}

/**
 * Generate AI narrative thread for the queue
 */
export async function generateNarrativeThread(ctx: QueueAIContext): Promise<string> {
  const cached = getCachedResult();
  const hash = getQueueHash(ctx);
  if (cached && cached.queueHash === hash && cached.narrative) {
    return cached.narrative;
  }

  const model = getAIModel();
  const prompt = `${buildContextPrompt(ctx)}

Write a SHORT narrative (3-4 sentences) that tells the story of this player's gaming queue as a "season" or journey. Connect the games thematically, reference genres shifting, and make it feel like a curated playlist/season of entertainment.

Be specific with game names. Be enthusiastic but concise. Write in second person ("You're deep in..."). Make it feel intentional and exciting, like a TV season preview.

Return ONLY the narrative paragraph, no labels or headers.`;

  try {
    const result = await model.generateContent(prompt);
    const narrative = result.response.text().trim();

    const existing = cached || { timestamp: 0, queueHash: '', hypeChirps: [], narrative: '', roast: '', hype: '', advisorSuggestion: '' };
    setCachedResult({ ...existing, timestamp: Date.now(), queueHash: hash, narrative });

    return narrative;
  } catch (error) {
    console.error('AI narrative error:', error);
    return getFallbackNarrative(ctx);
  }
}

/**
 * Generate AI roast of the queue
 */
export async function generateQueueRoast(ctx: QueueAIContext): Promise<string> {
  const cached = getCachedResult();
  const hash = getQueueHash(ctx);
  if (cached && cached.queueHash === hash && cached.roast) {
    return cached.roast;
  }

  const model = getAIModel();
  const prompt = `${buildContextPrompt(ctx)}

ROAST this player's gaming queue. Be brutally funny but not mean-spirited. Reference:
- How many games they have vs how many they'll actually finish
- Genre patterns that are funny
- Games sitting untouched for months
- Their pace vs their ambition
- Any contradictions in their queue (like 5 massive RPGs back-to-back)

Keep it to 3-4 sentences. Be specific with game names and numbers. Think comedian doing a roast, not a bully.

Return ONLY the roast, no labels.`;

  try {
    const result = await model.generateContent(prompt);
    const roast = result.response.text().trim();

    const existing = cached || { timestamp: 0, queueHash: '', hypeChirps: [], narrative: '', roast: '', hype: '', advisorSuggestion: '' };
    setCachedResult({ ...existing, timestamp: Date.now(), queueHash: hash, roast });

    return roast;
  } catch (error) {
    console.error('AI roast error:', error);
    return `${ctx.queuedGames.length} games in the queue. At your current pace, you'll finish them all by the time the PS7 comes out.`;
  }
}

/**
 * Generate AI hype-up of the queue
 */
export async function generateQueueHype(ctx: QueueAIContext): Promise<string> {
  const cached = getCachedResult();
  const hash = getQueueHash(ctx);
  if (cached && cached.queueHash === hash && cached.hype) {
    return cached.hype;
  }

  const model = getAIModel();
  const prompt = `${buildContextPrompt(ctx)}

HYPE UP this player about their gaming queue! Be genuinely enthusiastic and encouraging. Reference:
- The quality and variety of games they have lined up
- Their current momentum and dedication
- Specific games they should be excited about
- How their queue shows great taste
- Make them feel like their gaming life is awesome

Keep it to 3-4 sentences. Be specific with game names. Think supportive best friend who's also a gamer.

Return ONLY the hype, no labels.`;

  try {
    const result = await model.generateContent(prompt);
    const hype = result.response.text().trim();

    const existing = cached || { timestamp: 0, queueHash: '', hypeChirps: [], narrative: '', roast: '', hype: '', advisorSuggestion: '' };
    setCachedResult({ ...existing, timestamp: Date.now(), queueHash: hash, hype });

    return hype;
  } catch (error) {
    console.error('AI hype error:', error);
    return `Your queue is stacked with incredible games. ${ctx.queuedGames[0]?.name || 'Your current game'} is getting the attention it deserves, and the lineup behind it is chef's kiss.`;
  }
}

/**
 * Generate AI queue advisor suggestion
 */
export async function generateQueueAdvice(ctx: QueueAIContext): Promise<string> {
  const cached = getCachedResult();
  const hash = getQueueHash(ctx);
  if (cached && cached.queueHash === hash && cached.advisorSuggestion) {
    return cached.advisorSuggestion;
  }

  const model = getAIModel();
  const prompt = `${buildContextPrompt(ctx)}

As a gaming queue advisor, analyze this queue and suggest improvements. Consider:
- Should any games be moved up or down based on the player's patterns?
- Is the genre flow good or should they break up similar games?
- Are there games at risk of being abandoned based on shelf time?
- Is the balance of long vs short games healthy?
- Any tactical suggestions (like clearing a short game first for momentum)?

Give 2-3 specific, actionable suggestions. Be concise. Reference game names. Format as short bullet points.

Return ONLY the suggestions, no headers.`;

  try {
    const result = await model.generateContent(prompt);
    const advice = result.response.text().trim();

    const existing = cached || { timestamp: 0, queueHash: '', hypeChirps: [], narrative: '', roast: '', hype: '', advisorSuggestion: '' };
    setCachedResult({ ...existing, timestamp: Date.now(), queueHash: hash, advisorSuggestion: advice });

    return advice;
  } catch (error) {
    console.error('AI advisor error:', error);
    return 'Consider mixing up genres between long games to avoid fatigue. Clear shorter games first for quick wins.';
  }
}

/**
 * Clear the AI cache (e.g., when queue changes)
 */
export function clearQueueAICache(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(CACHE_KEY);
}

// Fallback chirps when AI is unavailable
function getFallbackChirps(ctx: QueueAIContext): string[] {
  const chirps: string[] = [];
  const g = ctx.queuedGames;

  if (g.length > 0 && g[0].status === 'In Progress') {
    chirps.push(`${g[0].hours}h into ${g[0].name}. Keep pushing.`);
  }
  if (g.length > 1) {
    chirps.push(`${g[1].name} is waiting in the wings.`);
  }
  if (g.length > 4) {
    chirps.push(`${g.length} games deep. That's commitment.`);
  }
  chirps.push(`$${ctx.totalQueueCost} invested in ~${ctx.totalQueueHours}h of gaming ahead.`);

  return chirps;
}

function getFallbackNarrative(ctx: QueueAIContext): string {
  const g = ctx.queuedGames;
  if (g.length === 0) return 'Your queue is empty — time to fill it with adventures.';
  const genres = ctx.genres.join(', ');
  return `Your gaming season: ${g.length} games spanning ${genres}. From ${g[0].name} to ${g[g.length - 1].name}, it's a journey worth taking.`;
}
