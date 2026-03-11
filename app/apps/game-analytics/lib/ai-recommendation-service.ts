'use client';

import { getAI, getGenerativeModel, GoogleAIBackend } from 'firebase/ai';
import { initializeApp, getApps } from 'firebase/app';
import { TasteProfile, GameRecommendation, Game, RecommendationCategory } from './types';
import { getTotalHours } from './calculations';
import { RAWGGameData, batchFetchRAWGData } from './rawg-api';

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

// Grounded model — uses Google Search to verify real games and find current releases
function getGroundedAIModel() {
  const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  const ai = getAI(app, { backend: new GoogleAIBackend() });
  return getGenerativeModel(ai, {
    model: "gemini-2.5-flash",
    tools: [{ googleSearch: {} }],
  } as Parameters<typeof getGenerativeModel>[1]);
}

// After AI generates game names, batch-fetch RAWG data (thumbnail, metacritic, rating) and attach
async function enrichWithRAWGData<T extends AIRecommendation>(recommendations: T[]): Promise<T[]> {
  if (recommendations.length === 0) return recommendations;
  try {
    const rawgMap = await batchFetchRAWGData(recommendations.map(r => r.gameName));
    return recommendations.map(r => {
      const data = rawgMap.get(r.gameName);
      if (!data) return r;
      return { ...r, thumbnail: data.backgroundImage, metacritic: data.metacritic, rawgRating: data.rating, rawgId: data.id };
    });
  } catch {
    return recommendations; // Graceful fallback — enrichment is best-effort
  }
}

export interface AIRecommendation {
  gameName: string;
  genre: string;
  platform: string;
  reason: string; // Personalized "why you'd love this"
  // RAWG-enriched metadata (populated after AI generation via batchFetchRAWGData)
  thumbnail?: string | null;
  metacritic?: number | null;
  rawgRating?: number | null;
  rawgId?: number | null;
}

export interface GameAnalysis {
  wouldLike: boolean;
  confidence: number; // 1-10
  reason: string;     // Personalized explanation
  concerns: string;   // What might not work for this user
}

/**
 * Build a rich context string from the full game library for AI prompts
 */
function buildProfileContext(
  profile: TasteProfile,
  games: Game[],
  dismissed: string[],
  interested: string[],
  userPrompt?: string
): string {
  // Separate by status
  const owned = games.filter(g => g.status !== 'Wishlist');
  const wishlisted = games.filter(g => g.status === 'Wishlist');
  const inProgress = games.filter(g => g.status === 'In Progress');
  const completed = games.filter(g => g.status === 'Completed');
  const abandoned = games.filter(g => g.status === 'Abandoned');
  const notStarted = games.filter(g => g.status === 'Not Started');
  const special = games.filter(g => g.isSpecial);

  // Recently played (last 30 days)
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const recentlyPlayed = games.filter(g => {
    const lastLog = g.playLogs?.slice().sort((a, b) => b.date.localeCompare(a.date))[0];
    return lastLog && new Date(lastLog.date) >= thirtyDaysAgo;
  });

  // Build full library listing (compact format per game)
  const formatGame = (g: Game): string => {
    const hours = getTotalHours(g);
    const parts = [g.name];
    if (g.rating > 0) parts.push(`${g.rating}/10`);
    if (hours > 0) parts.push(`${hours}h`);
    parts.push(g.status);
    if (g.genre) parts.push(g.genre);
    if (g.platform) parts.push(g.platform);
    if (g.franchise) parts.push(`[${g.franchise}]`);
    if (g.isSpecial) parts.push('★SPECIAL');
    if (g.endDate) parts.push(`finished:${g.endDate}`);
    else if (g.startDate) parts.push(`started:${g.startDate}`);
    return parts.join(' | ');
  };

  let context = `GAMER TASTE PROFILE:
Top genres (by enjoyment × time): ${profile.topGenres.join(', ') || 'No clear preference yet'}
${profile.avoidGenres.length > 0 ? `Genres to avoid (low ratings/high abandonment): ${profile.avoidGenres.join(', ')}` : ''}
Platforms: ${profile.platforms.join(', ') || 'Not specified'}
Average session: ${profile.avgSessionHours}h
Preferred game length: ${profile.preferredGameLength}
Price sweet spot: ${profile.priceRange}
Average rating given: ${profile.avgRating}/10
Completion rate: ${profile.completionRate}%
Library: ${owned.length} owned, ${completed.length} completed, ${inProgress.length} in progress, ${abandoned.length} abandoned, ${notStarted.length} not started

GENRE BREAKDOWN:
${profile.favoriteGenreDetails.map(g => `- ${g.genre}: avg ${g.avgRating}/10, avg ${g.avgHours}h, ${g.count} games`).join('\n')}`;

  // Full library
  if (owned.length > 0) {
    context += `\n\nFULL LIBRARY (${owned.length} games — name | rating | hours | status | genre | platform | franchise | dates):
${owned.map(formatGame).join('\n')}`;
  }

  // Currently playing — strongest recency signal
  if (recentlyPlayed.length > 0) {
    context += `\n\nCURRENTLY ACTIVE (played in last 30 days):
${recentlyPlayed.map(g => `- ${g.name} (${getTotalHours(g)}h, ${g.rating}/10, ${g.genre || 'unknown genre'})`).join('\n')}`;
  }

  // Special favorites
  if (special.length > 0) {
    context += `\n\nEXPLICITLY MARKED AS SPECIAL/FAVORITE:
${special.map(g => `- ${g.name} (${g.rating}/10, ${getTotalHours(g)}h, ${g.genre || ''})`).join('\n')}`;
  }

  // Reviews — the user's own words
  const gamesWithReviews = games.filter(g => g.review && g.review.trim());
  if (gamesWithReviews.length > 0) {
    context += `\n\nUSER'S OWN REVIEWS (their words about games they've played):
${gamesWithReviews.map(g => `- ${g.name} (${g.rating}/10): "${g.review}"`).join('\n')}`;
  }

  // Franchises
  const franchises = new Map<string, Game[]>();
  for (const g of owned) {
    if (g.franchise) {
      if (!franchises.has(g.franchise)) franchises.set(g.franchise, []);
      franchises.get(g.franchise)!.push(g);
    }
  }
  if (franchises.size > 0) {
    context += `\n\nFRANCHISES (series they follow):
${[...franchises.entries()].map(([name, gs]) => {
  const avgRating = gs.reduce((s, g) => s + g.rating, 0) / gs.length;
  return `- ${name}: ${gs.length} games, avg ${avgRating.toFixed(1)}/10 (${gs.map(g => g.name).join(', ')})`;
}).join('\n')}`;
  }

  // Wishlist — stated interests
  if (wishlisted.length > 0) {
    context += `\n\nWISHLIST (games they want):
${wishlisted.map(g => `- ${g.name}${g.genre ? ` (${g.genre})` : ''}${g.platform ? ` [${g.platform}]` : ''}`).join('\n')}`;
  }

  // Abandoned — patterns to avoid
  if (abandoned.length > 0) {
    context += `\n\nABANDONED (didn't finish — watch for patterns):
${abandoned.map(g => `- ${g.name}: ${getTotalHours(g)}h, ${g.rating}/10, ${g.genre || 'unknown genre'}`).join('\n')}`;
  }

  if (dismissed.length > 0) {
    context += `\n\nPREVIOUSLY DISMISSED RECOMMENDATIONS (do NOT suggest these or very similar games):
${dismissed.join(', ')}`;
  }

  if (interested.length > 0) {
    context += `\n\nGAMES THEY'RE INTERESTED IN (suggest similar quality/style):
${interested.join(', ')}`;
  }

  if (userPrompt && userPrompt.trim()) {
    context += `\n\nUSER'S SPECIFIC REQUEST:
"${userPrompt.trim()}"
(Prioritize this request while still using the taste profile for personalization)`;
  }

  return context;
}

/**
 * Generate game recommendations based on taste profile
 */
export async function generateRecommendations(
  profile: TasteProfile,
  games: Game[],
  existingGameNames: string[],
  dismissedNames: string[],
  interestedNames: string[],
  userPrompt?: string,
  count: number = 8
): Promise<AIRecommendation[]> {
  const model = getGroundedAIModel();

  const profileContext = buildProfileContext(profile, games, dismissedNames, interestedNames, userPrompt);

  const prompt = `${profileContext}

Based on this gamer's full library and taste profile, suggest exactly ${count} real, specific games they would likely enjoy.

For each game, write a personalized "Why you'd love this" line that references THEIR specific data — mention their favorite games, hours, ratings, franchises, or patterns. Not generic marketing copy.

Use your search capability to find currently released games and verify they exist — prioritize recent high-quality titles alongside classics.

IMPORTANT:
- Only suggest REAL games that actually exist and are already released
- Do NOT suggest games already in their library, wishlist, or previously dismissed
- Each suggestion must be a different game
- The "reason" should reference specific things from THEIR profile (e.g., "You put 120hrs into Elden Ring at 10/10 — this has similar...")
- Consider their franchises, currently active games, and reviews for context
- If the user has a specific request, honor it while personalizing

Respond in this exact JSON format, nothing else:
[
  { "gameName": "Game Title", "genre": "Genre", "platform": "Best Platform", "reason": "Personalized reason referencing their data" }
]`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('AI returned no recommendations. Response: ' + text.slice(0, 200));
  const parsed = JSON.parse(jsonMatch[0]) as AIRecommendation[];
  const filtered = parsed.filter(r =>
    !existingGameNames.some(n => n.toLowerCase() === r.gameName.toLowerCase()) &&
    !dismissedNames.some(n => n.toLowerCase() === r.gameName.toLowerCase())
  );
  return enrichWithRAWGData(filtered);
}

/**
 * "Would I like this game?" — Analyze a specific game against the user's profile
 */
export async function analyzeGameForUser(
  gameName: string,
  profile: TasteProfile,
  games: Game[],
  existingGameNames: string[],
  interestedNames: string[]
): Promise<GameAnalysis> {
  const model = getGroundedAIModel();

  const profileContext = buildProfileContext(profile, games, [], interestedNames);

  const alreadyOwned = existingGameNames.some(n => n.toLowerCase() === gameName.toLowerCase());

  const prompt = `${profileContext}

${alreadyOwned ? `NOTE: This game is already in their library. Analyze based on their existing experience with similar games.\n` : ''}

The user is asking: "Would I like ${gameName}?"

Use your search capability to look up "${gameName}" — confirm it exists, its genre, typical playtime, and critical reception before analyzing.

Analyze whether this specific game matches their taste profile. Consider:
1. Genre alignment with their preferences
2. Typical game length vs their sweet spot
3. Price point vs their usual spending
4. Similarity to their highest-rated games
5. Any patterns that suggest they might NOT enjoy it (e.g., they abandon this genre often)
6. Their reviews and franchise preferences
7. Their currently active games

Be honest — if it's not a good match, say so. Reference THEIR specific games and data in the explanation.

Respond in this exact JSON format, nothing else:
{
  "wouldLike": true/false,
  "confidence": 1-10,
  "reason": "Personalized explanation referencing their data (2-3 sentences)",
  "concerns": "What might not work for them (1 sentence, or empty string if none)"
}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('AI could not analyze this game. Response: ' + text.slice(0, 200));
  }
  return JSON.parse(jsonMatch[0]) as GameAnalysis;
}

/**
 * Generate more recommendations based on games the user marked as "interested"
 * This feeds the approval loop — liked games refine future suggestions
 */
export async function generateRefinedRecommendations(
  profile: TasteProfile,
  games: Game[],
  existingGameNames: string[],
  dismissedNames: string[],
  interestedNames: string[],
  userPrompt?: string,
  count: number = 6
): Promise<AIRecommendation[]> {
  if (interestedNames.length === 0) {
    return generateRecommendations(profile, games, existingGameNames, dismissedNames, interestedNames, userPrompt, count);
  }

  const model = getGroundedAIModel();
  const profileContext = buildProfileContext(profile, games, dismissedNames, interestedNames, userPrompt);

  const prompt = `${profileContext}

The user has shown INTEREST in these recommended games: ${interestedNames.join(', ')}
This tells you more about what they want RIGHT NOW. Use these as strong signals alongside their library data.

Use your search capability to find currently released games similar to their interested titles — prioritize real, verified games.

Suggest exactly ${count} more real games that match the pattern of their interested games combined with their taste profile. Each suggestion should explain why it connects to both their library favorites AND the games they've been interested in.

Respond in this exact JSON format, nothing else:
[
  { "gameName": "Game Title", "genre": "Genre", "platform": "Best Platform", "reason": "Personalized reason connecting to their interests and library" }
]`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('AI returned no recommendations. Response: ' + text.slice(0, 200));
  const parsed = JSON.parse(jsonMatch[0]) as AIRecommendation[];
  const filtered = parsed.filter(r =>
    !existingGameNames.some(n => n.toLowerCase() === r.gameName.toLowerCase()) &&
    !dismissedNames.some(n => n.toLowerCase() === r.gameName.toLowerCase()) &&
    !interestedNames.some(n => n.toLowerCase() === r.gameName.toLowerCase())
  );
  return enrichWithRAWGData(filtered);
}

// ── Upcoming Games Scoring ──────────────────────────────────────────────────

export interface UpcomingGameScore {
  gameName: string;
  hypeScore: number;         // 1-10
  reason: string;            // Personalized "why you'd be hyped for this"
}

/**
 * Score a batch of upcoming games against the user's taste profile using AI.
 * Returns personalized hype scores and reasons.
 */
export async function scoreUpcomingGames(
  upcomingGames: Array<{ name: string; genre?: string; metacritic?: number | null; rating?: number; released?: string }>,
  profile: TasteProfile,
  games: Game[]
): Promise<UpcomingGameScore[]> {
  if (upcomingGames.length === 0) return [];

  const model = getAIModel();

  const profileContext = buildProfileContext(profile, games, [], []);

  const gameList = upcomingGames.map(g => {
    const parts = [g.name];
    if (g.genre) parts.push(`genre: ${g.genre}`);
    if (g.metacritic) parts.push(`MC: ${g.metacritic}`);
    if (g.rating) parts.push(`rating: ${g.rating}/5`);
    if (g.released) parts.push(`releasing: ${g.released}`);
    return parts.join(' | ');
  }).join('\n');

  const prompt = `${profileContext}

UPCOMING/UNRELEASED GAMES TO SCORE:
${gameList}

For each upcoming game, score how well it matches this gamer's taste profile on a scale of 1-10.
Write a short personalized "why you'd be hyped" reason that references THEIR specific games, genres, and patterns.

IMPORTANT:
- Base scores on genre alignment, franchise connections, and play style compatibility
- Reference specific games from their library in the reasons
- Be honest — if it's not a good match, give it a low score
- Score 8+ only for games that strongly match their demonstrated preferences

Respond in this exact JSON format, nothing else:
[
  { "gameName": "Game Title", "hypeScore": 8, "reason": "Personalized reason referencing their library" }
]`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];

  try {
    return JSON.parse(jsonMatch[0]) as UpcomingGameScore[];
  } catch {
    return [];
  }
}

// ── Recommendation Chat ──────────────────────────────────────────────────────

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  recommendedGameNames?: string[]; // populated for assistant messages from chat
}

export interface ChatRecommendation extends AIRecommendation {
  category: RecommendationCategory;
  categoryContext?: string;
}

export interface ChatResponse {
  reply: string;
  recommendations: ChatRecommendation[];
}

const SIX_DIMENSION_FRAMEWORK = `
You evaluate games across six dimensions (0-10):
1. Hook Strength — how immediately engaging the opening experience is
2. Mechanical Satisfaction — how good executing core gameplay feels (responsiveness, feedback, depth)
3. Narrative Coherence — whether the story follows internal logic with grounded character motivations
4. World Logic — whether the world/systems make consistent internal sense
5. Pacing/Pull Forward — whether something continuously draws the player to keep going
6. Engagement Without Stopping — whether the game works in short bursts / podcast-friendly sessions

When a user describes what they want, map their words to these dimensions:
- "gripping story from minute one" → high Hook Strength + Narrative Coherence
- "tight mechanics, no fluff" → high Mechanical Satisfaction
- "I can play while watching TV / short sessions" → high Engagement Without Stopping
- "something to really immerse myself in" → high Narrative Coherence + World Logic + Pacing
- "atmospheric and dark" → high Narrative Coherence + World Logic
- "feel something / emotional" → high Narrative Coherence + Hook Strength
- "chill / relaxing" → high Engagement Without Stopping + lower Mechanical Satisfaction intensity
- "challenging / mastery" → high Mechanical Satisfaction + Pacing

Use this framework to score candidate games against the user's request and explain picks in dimension language when helpful.
`;

/**
 * Generate recommendations in response to a natural language chat message.
 * Returns both an AI reply and 3-5 recommended games.
 */
export async function generateChatRecommendations(
  userMessage: string,
  conversationHistory: ChatMessage[],
  profile: TasteProfile,
  games: Game[],
  existingGameNames: string[],
  dismissedNames: string[],
  interestedNames: string[]
): Promise<ChatResponse> {
  const model = getGroundedAIModel();

  const profileContext = buildProfileContext(profile, games, dismissedNames, interestedNames);

  // Format conversation history for the prompt (last 6 messages)
  const historyText = conversationHistory.slice(-6).map(m =>
    `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`
  ).join('\n');

  const prompt = `${profileContext}

${SIX_DIMENSION_FRAMEWORK}

${historyText ? `CONVERSATION HISTORY:\n${historyText}\n` : ''}
User: ${userMessage}

The user is telling you what kind of game experience they're looking for right now. Your job:
1. Write a short, conversational reply (2-3 sentences max) that acknowledges what they want and briefly explains why your picks fit
2. Recommend exactly 3-5 real games that match their request AND align with their personal taste profile

For each game:
- Write a personalized "reason" referencing BOTH their request AND their specific library data (mention their games, ratings, hours, patterns)
- Assign a category: "because-you-loved", "hidden-gem", "popular-in-genre", "try-something-different", or "general"
- If "because-you-loved", add "categoryContext" with the specific game name it connects to

RULES:
- Use your search capability to verify recommended games exist and are released — prioritize finding real current titles
- Do NOT suggest games already in their library, wishlist, or previously dismissed
- Be honest — reference the six dimensions when helpful but keep it natural, not robotic
- The reply should feel like a knowledgeable friend, not a formal system

Respond in this exact JSON format, nothing else:
{
  "reply": "Your conversational reply here",
  "recommendations": [
    { "gameName": "Game Title", "genre": "Genre", "platform": "Best Platform", "reason": "Personalized reason", "category": "because-you-loved", "categoryContext": "Elden Ring" }
  ]
}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('AI returned invalid response. Response: ' + text.slice(0, 200));

  const parsed = JSON.parse(jsonMatch[0]) as ChatResponse;
  const filtered = parsed.recommendations.filter(r =>
    !existingGameNames.some(n => n.toLowerCase() === r.gameName.toLowerCase()) &&
    !dismissedNames.some(n => n.toLowerCase() === r.gameName.toLowerCase())
  );
  parsed.recommendations = await enrichWithRAWGData(filtered);
  return parsed;
}

// ── Categorized Released Recommendations ────────────────────────────────────

export interface CategorizedRecommendation extends AIRecommendation {
  category: RecommendationCategory;
  categoryContext?: string; // e.g. "Elden Ring" for "Because You Loved..."
}

/**
 * Generate recommendations with AI-assigned categories.
 * Categories: hidden-gem, popular-in-genre, because-you-loved, try-something-different, general
 */
export async function generateCategorizedRecommendations(
  profile: TasteProfile,
  games: Game[],
  existingGameNames: string[],
  dismissedNames: string[],
  interestedNames: string[],
  userPrompt?: string,
  count: number = 8
): Promise<CategorizedRecommendation[]> {
  const model = getGroundedAIModel();

  const profileContext = buildProfileContext(profile, games, dismissedNames, interestedNames, userPrompt);

  const topGames = games
    .filter(g => g.rating >= 8 && g.status !== 'Wishlist')
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 5)
    .map(g => g.name);

  const prompt = `${profileContext}

Suggest exactly ${count} real games organized into these categories:

1. "because-you-loved" (2-3 games) — Similar to their highest rated games (${topGames.join(', ')}). Include "categoryContext" with the specific game name it connects to.
2. "hidden-gem" (2 games) — Lesser-known gems that match their taste but they likely haven't heard of.
3. "popular-in-genre" (2 games) — Well-known, critically acclaimed games in their favorite genres they haven't played.
4. "try-something-different" (1-2 games) — A genre they DON'T usually play but would likely enjoy based on their patterns.

For each game, write a personalized "why you'd love this" reason referencing THEIR specific data.

Use your search capability to verify these are real, currently released games — especially for the hidden-gem category where hallucination risk is highest.

IMPORTANT:
- Only suggest REAL games that actually exist and are ALREADY RELEASED
- Do NOT suggest games already in their library, wishlist, or previously dismissed
- Each suggestion must be a different game

Respond in this exact JSON format, nothing else:
[
  { "gameName": "Game Title", "genre": "Genre", "platform": "Best Platform", "reason": "Personalized reason", "category": "because-you-loved", "categoryContext": "Elden Ring" }
]`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('AI returned no recommendations. Response: ' + text.slice(0, 200));

  const parsed = JSON.parse(jsonMatch[0]) as CategorizedRecommendation[];
  const filtered = parsed.filter(r =>
    !existingGameNames.some(n => n.toLowerCase() === r.gameName.toLowerCase()) &&
    !dismissedNames.some(n => n.toLowerCase() === r.gameName.toLowerCase())
  );
  return enrichWithRAWGData(filtered);
}
