'use client';

import { getAI, getGenerativeModel, GoogleAIBackend } from 'firebase/ai';
import { initializeApp, getApps } from 'firebase/app';
import { WeekInReviewData } from './calculations';

const firebaseConfig = {
  apiKey: "AIzaSyBS3IVvszDrm_zjjXu8TATgs1H-FlegHtM",
  authDomain: "oneapp-943e3.firebaseapp.com",
  projectId: "oneapp-943e3",
  storageBucket: "oneapp-943e3.firebasestorage.app",
  messagingSenderId: "1052736128978",
  appId: "1:1052736128978:web:9d42b47c6a343eac35aa0b",
};

// Initialize AI service
function getAIModel() {
  const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  const ai = getAI(app, { backend: new GoogleAIBackend() });
  return getGenerativeModel(ai, { model: "gemini-2.0-flash-exp" });
}

/**
 * AI Blurb Types - Different contexts for AI-generated insights
 */
export type AIBlurbType =
  | 'opening-personality'    // After opening, personality insights
  | 'top-game-deep-dive'     // After top game, deep analysis
  | 'session-patterns'       // After session types, pattern analysis
  | 'achievement-motivation' // After achievements, motivational
  | 'genre-insights'         // After genres, preference analysis
  | 'value-wisdom'           // After value screens, spending insights
  | 'closing-reflection';    // Final reflection

/**
 * Generate contextual AI blurb based on gaming data and type
 */
export async function generateAIBlurb(
  data: WeekInReviewData,
  type: AIBlurbType
): Promise<string> {
  const model = getAIModel();
  const prompt = buildPrompt(data, type);

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return text.trim();
  } catch (error) {
    console.error('AI generation error:', error);
    return getFallbackBlurb(type);
  }
}

/**
 * Build contextual prompts based on blurb type
 */
function buildPrompt(data: WeekInReviewData, type: AIBlurbType): string {
  const baseContext = `
You are a friendly, insightful gaming companion analyzing a player's week of gaming.

Gaming Data:
- Total hours: ${data.totalHours.toFixed(1)} hours
- Games played: ${data.gamesPlayed.length}
- Top game: ${data.topGame?.game.name || 'N/A'} (${data.topGame?.hours.toFixed(1) || 0}h)
- Daily pattern: ${data.dailyHours.map(d => `${d.day}: ${d.hours.toFixed(1)}h`).join(', ')}
- Gaming style: ${data.gamingStyle}
- Session types: ${data.marathonSessions} marathon (3h+), ${data.powerSessions} power (1-3h), ${data.quickSessions} quick (<1h)
- Completed games: ${data.completedGames.length}
- New games started: ${data.newGamesStarted.length}
- Achievements/milestones: ${data.milestonesReached.length}
- Genres: ${data.genresPlayed.join(', ') || 'N/A'}
- Average rating: ${data.averageEnjoymentRating.toFixed(1)}/10
${data.totalValueUtilized > 0 ? `- Value utilized: $${data.totalValueUtilized.toFixed(2)}` : ''}
`.trim();

  const prompts: Record<AIBlurbType, string> = {
    'opening-personality': `${baseContext}

Write a 2-3 sentence opening insight about this player's gaming personality this week. Be enthusiastic and observant.
Focus on their play style (${data.gamingStyle}), time commitment, and what it says about them as a gamer.
Make it personal and engaging, like a friend who knows their gaming habits well.`,

    'top-game-deep-dive': `${baseContext}

${data.topGame ? `The player spent ${data.topGame.hours.toFixed(1)} hours on ${data.topGame.game.name} this week.` : ''}

Write 2-3 sentences providing a deep, insightful observation about their dedication to this top game.
Consider the time invested, how it compares to other games, and what this focus might mean.
Be thoughtful and specific - avoid generic praise. Make it feel like you understand their journey with this game.`,

    'session-patterns': `${baseContext}

Write 2-3 sentences analyzing their gaming session patterns this week.
Look at daily distribution (${data.dailyHours.map(d => `${d.day}: ${d.hours.toFixed(1)}h`).join(', ')}), gaming style (${data.gamingStyle}), and session types (${data.marathonSessions} marathon, ${data.powerSessions} power, ${data.quickSessions} quick).
Provide a smart observation about their time management or gaming rhythm.
Be constructive and insightful, not judgmental.`,

    'achievement-motivation': `${baseContext}

${data.completedGames.length > 0 ? `Completed: ${data.completedGames.map(g => g.name).join(', ')}` : ''}
${data.milestonesReached.length > 0 ? `Milestones: ${data.milestonesReached.join(', ')}` : ''}

Write 2-3 sentences of motivational commentary about their achievements and progress.
Be genuinely encouraging and specific to their accomplishments.
If they had few/no achievements, still find something positive to highlight about their gaming journey.`,

    'genre-insights': `${baseContext}

Genres this week: ${data.genresPlayed.join(', ') || 'Various'}
Genre diversity score: ${data.genreDiversityScore.toFixed(1)}/10

Write 2-3 sentences analyzing their genre preferences and diversity this week.
Look for patterns, shifts, or interesting variety in their choices.
Provide insight into what their genre mix reveals about their gaming mood or exploration.
Be observant and thoughtful.`,

    'value-wisdom': `${baseContext}

${data.totalValueUtilized > 0 ? `Value utilized: $${data.totalValueUtilized.toFixed(2)}` : ''}
${data.bestValueGame ? `Best value: ${data.bestValueGame.game.name} at $${data.bestValueGame.costPerHour.toFixed(2)}/hour` : ''}

Write 2-3 sentences about their gaming value and spending wisdom this week.
Analyze how they're maximizing value from their library, or encourage them to dive into games they own.
Be financially mindful but fun - celebrate smart gaming habits.
Make it relevant and actionable.`,

    'closing-reflection': `${baseContext}

Write a 3-4 sentence closing reflection on their gaming week.
Synthesize the key themes: their time investment, game choices, achievements, and overall journey.
End with an encouraging forward-looking statement about the week ahead.
Be warm, personal, and make them feel good about their gaming time.
This is the finale - make it memorable and uplifting.`,
  };

  return prompts[type];
}

/**
 * Fallback blurbs if AI generation fails
 */
function getFallbackBlurb(type: AIBlurbType): string {
  const fallbacks: Record<AIBlurbType, string> = {
    'opening-personality': "Every gaming week tells a story. Let's dive into yours.",
    'top-game-deep-dive': "When you find a game that clicks, magic happens. That dedication is paying off.",
    'session-patterns': "Your gaming rhythm is unique to you - and that's what makes it special.",
    'achievement-motivation': "Progress isn't always measured in achievements. Every hour played is a step forward.",
    'genre-insights': "The beauty of gaming is the incredible variety at your fingertips. You're making the most of it.",
    'value-wisdom': "Smart gamers know it's not about the money spent, but the experiences earned.",
    'closing-reflection': "Another week of gaming in the books. Here's to the adventures ahead. Keep playing, keep exploring, keep being awesome.",
  };

  return fallbacks[type];
}

/**
 * Generate multiple AI blurbs in parallel for better performance
 */
export async function generateMultipleBlurbs(
  data: WeekInReviewData,
  types: AIBlurbType[]
): Promise<Record<AIBlurbType, string>> {
  const promises = types.map(async (type) => ({
    type,
    blurb: await generateAIBlurb(data, type),
  }));

  const results = await Promise.all(promises);

  return results.reduce((acc, { type, blurb }) => {
    acc[type] = blurb;
    return acc;
  }, {} as Record<AIBlurbType, string>);
}
