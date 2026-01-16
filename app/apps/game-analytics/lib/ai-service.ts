'use client';

import { getAI, getGenerativeModel, GoogleAIBackend } from 'firebase/ai';
import { initializeApp, getApps } from 'firebase/app';
import { WeekInReviewData } from './calculations';
import { Game } from './types';

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
  // Use Gemini 2.5 Flash model
  return getGenerativeModel(ai, { model: "gemini-2.5-flash" });
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
  | 'gaming-behavior'        // Fun behavioral observations
  | 'comeback-games'         // Games player returned to
  | 'binge-sessions'         // Marathon gaming insights
  | 'closing-reflection';    // Final reflection

/**
 * Result from AI generation including error information
 */
export interface AIBlurbResult {
  text: string;
  error?: string;
  isFallback: boolean;
}

/**
 * Generate contextual AI blurb based on gaming data and type
 */
export async function generateAIBlurb(
  data: WeekInReviewData,
  type: AIBlurbType
): Promise<AIBlurbResult> {
  const model = getAIModel();
  const prompt = buildPrompt(data, type);

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return {
      text: text.trim(),
      isFallback: false,
    };
  } catch (error) {
    console.error(`AI generation error for type "${type}":`, error);
    console.error('Error details:', JSON.stringify(error, null, 2));

    let errorMessage = 'Unknown error occurred';
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      errorMessage = error.message;
    } else if (typeof error === 'object' && error !== null) {
      errorMessage = JSON.stringify(error);
    }

    return {
      text: getFallbackBlurb(type),
      error: errorMessage,
      isFallback: true,
    };
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

Write a SHORT, fun 2-3 line observation about their ${data.gamingStyle} gaming style and ${data.totalHours.toFixed(1)} hours played.
Be punchy and enthusiastic. Keep it brief!`,

    'top-game-deep-dive': `${baseContext}

${data.topGame ? `They spent ${data.topGame.hours.toFixed(1)} hours on ${data.topGame.game.name} this week.` : ''}

Write a SHORT, fun 2-3 line comment about their dedication to this game.
Be creative and specific. Keep it brief!`,

    'session-patterns': `${baseContext}

Daily pattern: ${data.dailyHours.map(d => `${d.day}: ${d.hours.toFixed(1)}h`).join(', ')}
Session mix: ${data.marathonSessions} marathon, ${data.powerSessions} power, ${data.quickSessions} quick sessions

Write a SHORT, fun 2-3 line observation about their gaming rhythm.
Be playful about their pattern. Keep it brief!`,

    'achievement-motivation': `${baseContext}

${data.completedGames.length > 0 ? `Completed: ${data.completedGames.map(g => g.name).join(', ')}` : ''}
${data.milestonesReached.length > 0 ? `Milestones: ${data.milestonesReached.join(', ')}` : ''}

Write a SHORT, fun 2-3 line celebration of their achievements.
Be encouraging and upbeat. Keep it brief!`,

    'genre-insights': `${baseContext}

Genres: ${data.genresPlayed.join(', ') || 'Various'}
Diversity score: ${data.genreDiversityScore.toFixed(1)}/10

Write a SHORT, fun 2-3 line comment about their genre choices.
Be playful about their gaming taste. Keep it brief!`,

    'value-wisdom': `${baseContext}

${data.totalValueUtilized > 0 ? `Value utilized: $${data.totalValueUtilized.toFixed(2)}` : ''}
${data.bestValueGame ? `Best value: ${data.bestValueGame.game.name} at $${data.bestValueGame.costPerHour.toFixed(2)}/hour` : ''}

Write a SHORT, fun 2-3 line comment about their gaming value.
Be playful about bang-for-buck. Keep it brief!`,

    'gaming-behavior': `${baseContext}

Write a SHORT, fun 2-3 line observation about their gaming habits.
Be humorous and quirky. Keep it brief!`,

    'comeback-games': `${baseContext}

Games they returned to: ${data.gamesPlayed.filter(g => g.daysPlayed > 1).map(g => `${g.game.name} (${g.daysPlayed} days)`).join(', ') || 'N/A'}

Write a SHORT, fun 2-3 line comment about why they keep coming back to these games.
Be creative about player loyalty. Keep it brief!`,

    'binge-sessions': `${baseContext}

Marathon sessions: ${data.marathonSessions} (3h+)
${data.longestSession ? `Longest: ${data.longestSession.hours.toFixed(1)}h on ${data.longestSession.game.name}` : ''}

Write a SHORT, fun 2-3 line celebration of their epic gaming sessions.
Be enthusiastic about the marathons. Keep it brief!`,

    'closing-reflection': `${baseContext}

Write a SHORT, fun 2-3 line closing thought about their gaming week.
Be upbeat and forward-looking. Keep it brief!`,
  };

  return prompts[type];
}

/**
 * Fallback blurbs if AI generation fails
 */
function getFallbackBlurb(type: AIBlurbType): string {
  const fallbacks: Record<AIBlurbType, string> = {
    'opening-personality': "Your gaming week has its own unique rhythm and story.",
    'top-game-deep-dive': "When you find a game that clicks, magic happens.",
    'session-patterns': "Your gaming rhythm is uniquely yours.",
    'achievement-motivation': "Every hour played is progress earned.",
    'genre-insights': "You're exploring a diverse gaming palette.",
    'value-wisdom': "Smart gaming is about experiences, not just dollars.",
    'gaming-behavior': "Your gaming habits tell their own story.",
    'comeback-games': "The games you return to reveal what you truly love.",
    'binge-sessions': "Epic sessions create the best memories!",
    'closing-reflection': "Another week of adventures in the books. Here's to the next!",
  };

  return fallbacks[type];
}

/**
 * Generate multiple AI blurbs in parallel for better performance
 */
export async function generateMultipleBlurbs(
  data: WeekInReviewData,
  types: AIBlurbType[]
): Promise<Record<AIBlurbType, AIBlurbResult>> {
  const promises = types.map(async (type) => ({
    type,
    result: await generateAIBlurb(data, type),
  }));

  const results = await Promise.all(promises);

  return results.reduce((acc, { type, result }) => {
    acc[type] = result;
    return acc;
  }, {} as Record<AIBlurbType, AIBlurbResult>);
}

/**
 * Generate AI chat response with gaming data context
 */
export async function generateChatResponse(
  userMessage: string,
  context: {
    weekData: WeekInReviewData | null;
    monthGames: Game[];
    allGames: Game[];
    conversationHistory: Array<{ role: string; content: string }>;
  }
): Promise<string> {
  const model = getAIModel();

  // Build context prompt with gaming data
  const contextPrompt = buildChatContext(context);

  // Include recent conversation history (last 6 messages)
  const recentHistory = context.conversationHistory.slice(-6);
  const historyText = recentHistory
    .map((msg) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
    .join('\n');

  const fullPrompt = `${contextPrompt}

${historyText ? `Recent conversation:\n${historyText}\n` : ''}
User: ${userMessage}`;

  try {
    const result = await model.generateContent(fullPrompt);
    const text = result.response.text();
    return text.trim();
  } catch (error) {
    console.error('AI chat error:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    return "Sorry, I'm having trouble right now. Could you try asking that again?";
  }
}

/**
 * Build context prompt for chat with gaming data
 */
function buildChatContext(context: {
  weekData: WeekInReviewData | null;
  monthGames: Game[];
  allGames: Game[];
}): string {
  let contextText = `You are a friendly AI gaming coach and companion. You have access to the player's gaming data and can provide insights, recommendations, and answer questions about their gaming habits.

`;

  // Week data
  if (context.weekData) {
    contextText += `LAST WEEK DATA:
`;
    contextText += `- Total hours: ${context.weekData.totalHours.toFixed(1)}h
`;
    contextText += `- Games played: ${context.weekData.gamesPlayed.length}
`;
    contextText += `- Top game: ${context.weekData.topGame?.game.name || 'None'} (${context.weekData.topGame?.hours.toFixed(1) || 0}h)
`;
    contextText += `- Gaming style: ${context.weekData.gamingStyle}
`;
    contextText += `- Genres: ${context.weekData.genresPlayed.join(', ') || 'None'}
`;
    contextText += `- Completed: ${context.weekData.completedGames.length}

`;
  }

  // Month data
  if (context.monthGames.length > 0) {
    contextText += `LAST MONTH DATA:
`;
    contextText += `- Games played: ${context.monthGames.length}
`;
    const monthHours = context.monthGames.reduce((sum, g) => sum + (g.hours || 0), 0);
    contextText += `- Total hours: ${monthHours.toFixed(1)}h

`;
  }

  // Library overview
  if (context.allGames.length > 0) {
    const owned = context.allGames.filter(g => g.status !== 'Wishlist');
    const completed = owned.filter(g => g.status === 'Completed');
    contextText += `LIBRARY OVERVIEW:
`;
    contextText += `- Total games owned: ${owned.length}
`;
    contextText += `- Completed: ${completed.length}
`;
    contextText += `- Completion rate: ${owned.length > 0 ? ((completed.length / owned.length) * 100).toFixed(1) : 0}%

`;
  }

  return contextText;
}
