'use client';

import { getAI, getGenerativeModel, GoogleAIBackend } from 'firebase/ai';
import { initializeApp, getApps } from 'firebase/app';
import { TasteProfile, GameRecommendation } from './types';

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
 * Build the taste profile context string for AI prompts
 */
function buildProfileContext(
  profile: TasteProfile,
  dismissed: string[],
  interested: string[],
  userPrompt?: string
): string {
  let context = `GAMER TASTE PROFILE:
Top genres (ranked by enjoyment × time): ${profile.topGenres.join(', ') || 'No clear preference yet'}
${profile.avoidGenres.length > 0 ? `Genres to avoid (low ratings/high abandonment): ${profile.avoidGenres.join(', ')}` : ''}
Platforms: ${profile.platforms.join(', ') || 'Not specified'}
Average session: ${profile.avgSessionHours}h
Preferred game length: ${profile.preferredGameLength}
Price sweet spot: ${profile.priceRange}
Average rating given: ${profile.avgRating}/10
Completion rate: ${profile.completionRate}%

TOP RATED GAMES (what they love):
${profile.topGames.map(g => `- ${g.name}: ${g.rating}/10, ${g.hours}h${g.genre ? `, ${g.genre}` : ''}`).join('\n')}

GENRE BREAKDOWN:
${profile.favoriteGenreDetails.map(g => `- ${g.genre}: avg ${g.avgRating}/10, avg ${g.avgHours}h, ${g.count} games`).join('\n')}`;

  if (dismissed.length > 0) {
    context += `\n\nPREVIOUSLY DISMISSED (do NOT suggest these or very similar games):
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
  existingGameNames: string[],
  dismissedNames: string[],
  interestedNames: string[],
  userPrompt?: string,
  count: number = 8
): Promise<AIRecommendation[]> {
  const model = getAIModel();

  const profileContext = buildProfileContext(profile, dismissedNames, interestedNames, userPrompt);

  const prompt = `${profileContext}

GAMES ALREADY IN THEIR LIBRARY (do NOT suggest any of these):
${existingGameNames.join(', ')}

Based on this gamer's taste profile, suggest exactly ${count} real, specific games they would likely enjoy.

For each game, write a personalized "Why you'd love this" line that references THEIR specific data — mention their favorite games, hours, ratings, or patterns. Not generic marketing copy.

IMPORTANT:
- Only suggest REAL games that actually exist
- Do NOT suggest games already in their library or previously dismissed
- Each suggestion must be a different game
- The "reason" should reference specific things from THEIR profile (e.g., "You put 120hrs into Elden Ring at 10/10 — this has similar...")
- If the user has a specific request, honor it while personalizing

Respond in this exact JSON format, nothing else:
[
  { "gameName": "Game Title", "genre": "Genre", "platform": "Best Platform", "reason": "Personalized reason referencing their data" }
]`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];
    const parsed = JSON.parse(jsonMatch[0]) as AIRecommendation[];
    // Filter out any that snuck through
    return parsed.filter(r =>
      !existingGameNames.some(n => n.toLowerCase() === r.gameName.toLowerCase()) &&
      !dismissedNames.some(n => n.toLowerCase() === r.gameName.toLowerCase())
    );
  } catch (error) {
    console.error('AI recommendation generation error:', error);
    return [];
  }
}

/**
 * "Would I like this game?" — Analyze a specific game against the user's profile
 */
export async function analyzeGameForUser(
  gameName: string,
  profile: TasteProfile,
  existingGameNames: string[],
  interestedNames: string[]
): Promise<GameAnalysis> {
  const model = getAIModel();

  const profileContext = buildProfileContext(profile, [], interestedNames);

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

Be honest — if it's not a good match, say so. Reference THEIR specific games and data in the explanation.

Respond in this exact JSON format, nothing else:
{
  "wouldLike": true/false,
  "confidence": 1-10,
  "reason": "Personalized explanation referencing their data (2-3 sentences)",
  "concerns": "What might not work for them (1 sentence, or empty string if none)"
}`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { wouldLike: false, confidence: 3, reason: 'Could not analyze this game right now.', concerns: '' };
    }
    return JSON.parse(jsonMatch[0]) as GameAnalysis;
  } catch (error) {
    console.error('AI game analysis error:', error);
    return { wouldLike: false, confidence: 3, reason: 'Could not analyze this game right now. Try again later.', concerns: '' };
  }
}

/**
 * Generate more recommendations based on games the user marked as "interested"
 * This feeds the approval loop — liked games refine future suggestions
 */
export async function generateRefinedRecommendations(
  profile: TasteProfile,
  existingGameNames: string[],
  dismissedNames: string[],
  interestedNames: string[],
  userPrompt?: string,
  count: number = 6
): Promise<AIRecommendation[]> {
  if (interestedNames.length === 0) {
    return generateRecommendations(profile, existingGameNames, dismissedNames, interestedNames, userPrompt, count);
  }

  const model = getAIModel();
  const profileContext = buildProfileContext(profile, dismissedNames, interestedNames, userPrompt);

  const prompt = `${profileContext}

GAMES ALREADY IN LIBRARY (do NOT suggest):
${existingGameNames.join(', ')}

The user has shown INTEREST in these recommended games: ${interestedNames.join(', ')}
This tells you more about what they want RIGHT NOW. Use these as strong signals alongside their library data.

Suggest exactly ${count} more real games that match the pattern of their interested games combined with their taste profile. Each suggestion should explain why it connects to both their library favorites AND the games they've been interested in.

Respond in this exact JSON format, nothing else:
[
  { "gameName": "Game Title", "genre": "Genre", "platform": "Best Platform", "reason": "Personalized reason connecting to their interests and library" }
]`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];
    const parsed = JSON.parse(jsonMatch[0]) as AIRecommendation[];
    return parsed.filter(r =>
      !existingGameNames.some(n => n.toLowerCase() === r.gameName.toLowerCase()) &&
      !dismissedNames.some(n => n.toLowerCase() === r.gameName.toLowerCase()) &&
      !interestedNames.some(n => n.toLowerCase() === r.gameName.toLowerCase())
    );
  } catch (error) {
    console.error('AI refined recommendation error:', error);
    return [];
  }
}
