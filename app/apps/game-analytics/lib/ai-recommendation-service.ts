'use client';

import { getAI, getGenerativeModel, GoogleAIBackend } from 'firebase/ai';
import { initializeApp, getApps } from 'firebase/app';
import { TasteProfile, GameRecommendation, Game } from './types';
import { getTotalHours } from './calculations';

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

export interface AIRecommendation {
  gameName: string;
  genre: string;
  platform: string;
  reason: string; // Personalized "why you'd love this"
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
  const model = getAIModel();

  const profileContext = buildProfileContext(profile, games, dismissedNames, interestedNames, userPrompt);

  const prompt = `${profileContext}

Based on this gamer's full library and taste profile, suggest exactly ${count} real, specific games they would likely enjoy.

For each game, write a personalized "Why you'd love this" line that references THEIR specific data — mention their favorite games, hours, ratings, franchises, or patterns. Not generic marketing copy.

IMPORTANT:
- Only suggest REAL games that actually exist
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
  return parsed.filter(r =>
    !existingGameNames.some(n => n.toLowerCase() === r.gameName.toLowerCase()) &&
    !dismissedNames.some(n => n.toLowerCase() === r.gameName.toLowerCase())
  );
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
  const model = getAIModel();

  const profileContext = buildProfileContext(profile, games, [], interestedNames);

  const alreadyOwned = existingGameNames.some(n => n.toLowerCase() === gameName.toLowerCase());

  const prompt = `${profileContext}

${alreadyOwned ? `NOTE: This game is already in their library. Analyze based on their existing experience with similar games.\n` : ''}

The user is asking: "Would I like ${gameName}?"

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

  const model = getAIModel();
  const profileContext = buildProfileContext(profile, games, dismissedNames, interestedNames, userPrompt);

  const prompt = `${profileContext}

The user has shown INTEREST in these recommended games: ${interestedNames.join(', ')}
This tells you more about what they want RIGHT NOW. Use these as strong signals alongside their library data.

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
  return parsed.filter(r =>
    !existingGameNames.some(n => n.toLowerCase() === r.gameName.toLowerCase()) &&
    !dismissedNames.some(n => n.toLowerCase() === r.gameName.toLowerCase()) &&
    !interestedNames.some(n => n.toLowerCase() === r.gameName.toLowerCase())
  );
}
