'use client';

import { getAI, getGenerativeModel, GoogleAIBackend } from 'firebase/ai';
import { initializeApp, getApps } from 'firebase/app';
import { WeekInReviewData, MonthInReviewData } from './calculations';
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

  // Build game-specific context for deeper blurbs
  const topGameContext = data.topGame
    ? `Top game: ${data.topGame.game.name} (${data.topGame.hours.toFixed(1)}h, ${data.topGame.percentage.toFixed(0)}% of total, ${data.topGame.sessions} sessions, rated ${data.topGame.game.rating}/10, genre: ${data.topGame.game.genre || 'unknown'}, status: ${data.topGame.game.status})`
    : '';
  const completionContext = data.completedGames.length > 0
    ? `Completed this week: ${data.completedGames.map(g => g.name).join(', ')}`
    : '';
  const streakContext = data.longestStreak > 0 ? `Gaming streak: ${data.longestStreak} consecutive days` : '';
  const valueContext = data.bestValueGame
    ? `Best value: ${data.bestValueGame.game.name} at $${data.bestValueGame.costPerHour.toFixed(2)}/hr`
    : '';

  const prompts: Record<AIBlurbType, string> = {
    'opening-personality': `${baseContext}
${topGameContext}
${streakContext}

Write 2-3 sentences about this player's week. Reference specific games by name, specific numbers, and their ${data.gamingStyle} style. Don't use generic phrases like "what a week!" - be specific and data-driven. Tone: casual friend, not a hype announcer.`,

    'top-game-deep-dive': `${baseContext}
${topGameContext}
${data.topGame?.game.review ? `Player's own review: "${data.topGame.game.review}"` : ''}
${data.topGame ? `Total hours all-time on this game: ${data.topGame.game.hours}h` : ''}

Write 2-3 sentences specifically about ${data.topGame?.game.name || 'their top game'}. Reference the game by name, the hours invested, and what their playtime pattern suggests about how they're experiencing it. If they wrote a review, reference it. No generic "dedication" praise.`,

    'session-patterns': `${baseContext}
Daily breakdown: ${data.dailyHours.map(d => `${d.day}: ${d.hours.toFixed(1)}h (${d.gameNames.join(', ') || 'rest'})`).join(' | ')}
${data.longestSession ? `Longest single session: ${data.longestSession.hours.toFixed(1)}h of ${data.longestSession.game.name} on ${data.longestSession.day}` : ''}
${data.busiestDay ? `Biggest day: ${data.busiestDay.day} with ${data.busiestDay.hours.toFixed(1)}h across ${data.busiestDay.sessions} sessions` : ''}
Rest days: ${data.restDays.join(', ') || 'none'}

Write 2-3 sentences analyzing their specific daily pattern. Name the days, the games they played on specific days, and what it reveals. Be observational, not cheerleading.`,

    'achievement-motivation': `${baseContext}
${completionContext}

Write a SHORT, fun 2-3 line celebration of their achievements.
Be encouraging and upbeat. Keep it brief!`,

    'genre-insights': `${baseContext}

Genres: ${data.genresPlayed.join(', ') || 'Various'}
Diversity score: ${data.genreDiversityScore}/10

Write a SHORT, fun 2-3 line comment about their genre choices.
Be playful about their gaming taste. Keep it brief!`,

    'value-wisdom': `${baseContext}
${valueContext}

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
${completionContext}
${valueContext}
${streakContext}
Games played this week: ${data.gamesPlayed.map(g => `${g.game.name} (${g.hours.toFixed(1)}h)`).join(', ')}

Write 2-3 sentences as a closing reflection. Reference the specific games and numbers from their week. Include one forward-looking thought about what's next. Tone: thoughtful friend wrapping up a conversation, not a motivational poster.`,
  };

  return prompts[type];
}

/**
 * Fallback blurbs if AI generation fails
 */
function getFallbackBlurb(type: AIBlurbType): string {
  // Fallbacks should be silent/invisible - not generic motivational filler
  const fallbacks: Record<AIBlurbType, string> = {
    'opening-personality': '',
    'top-game-deep-dive': '',
    'session-patterns': '',
    'achievement-motivation': '',
    'genre-insights': '',
    'value-wisdom': '',
    'gaming-behavior': '',
    'comeback-games': '',
    'binge-sessions': '',
    'closing-reflection': '',
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

// ── MONTH AI BLURBS ──────────────────────────────────────────────

export type MonthAIBlurbType = 'month-opening' | 'month-closing';

export async function generateMonthAIBlurb(
  data: MonthInReviewData,
  type: MonthAIBlurbType
): Promise<AIBlurbResult> {
  const model = getAIModel();
  const prompt = buildMonthBlurbPrompt(data, type);

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return { text: text.trim(), isFallback: false };
  } catch (error) {
    console.error(`Month AI blurb error for "${type}":`, error);
    return { text: '', error: String(error), isFallback: true };
  }
}

function buildMonthBlurbPrompt(data: MonthInReviewData, type: MonthAIBlurbType): string {
  const baseContext = `Gaming month: ${data.monthLabel}
- Total hours: ${data.totalHours.toFixed(1)}h across ${data.uniqueGames} games
- ${data.daysActive} active days, ${data.totalSessions} sessions
- Top game: ${data.topGame?.game.name || 'N/A'} (${data.topGame?.hours.toFixed(1) || 0}h, ${data.topGame?.percentage.toFixed(0) || 0}% of time)
- All games: ${data.gamesPlayed.map(g => `${g.game.name} (${g.hours.toFixed(1)}h)`).join(', ')}
- Genres: ${data.genreBreakdown.map(g => `${g.genre} ${g.percentage.toFixed(0)}%`).join(', ') || 'N/A'}
- Completed: ${data.completedGames.map(g => g.name).join(', ') || 'none'}
- New starts: ${data.newGamesStarted.map(g => g.name).join(', ') || 'none'}
- Spent: $${data.totalSpent.toFixed(0)}
- Longest streak: ${data.longestStreak} days
- vs last month: ${data.vsLastMonth.hoursDiff > 0 ? '+' : ''}${data.vsLastMonth.hoursDiff.toFixed(1)}h (${data.vsLastMonth.trend})`;

  if (type === 'month-opening') {
    return `${baseContext}

You are a witty gaming analyst. Write 2-3 sentences setting the scene for this player's month. Reference specific games by name and specific numbers. Be specific and data-driven. Casual friend tone, not a hype announcer. Don't start with "What a month" or any generic opener.`;
  } else {
    return `${baseContext}

Write 2-3 sentences as a closing reflection on this gaming month. Reference the specific highlights, the journey, and one forward-looking thought about what's next. Thoughtful friend tone, specific to the data. Don't start with generic phrases.`;
  }
}

export async function generateMonthBlurbs(
  data: MonthInReviewData
): Promise<Record<MonthAIBlurbType, AIBlurbResult>> {
  const types: MonthAIBlurbType[] = ['month-opening', 'month-closing'];
  const results = await Promise.all(
    types.map(async (type) => ({ type, result: await generateMonthAIBlurb(data, type) }))
  );
  return results.reduce((acc, { type, result }) => {
    acc[type] = result;
    return acc;
  }, {} as Record<MonthAIBlurbType, AIBlurbResult>);
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
