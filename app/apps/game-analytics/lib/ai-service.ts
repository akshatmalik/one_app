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
  | 'gaming-behavior'        // Fun behavioral observations
  | 'comeback-games'         // Games player returned to
  | 'binge-sessions'         // Marathon gaming insights
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
    console.error(`AI generation error for type "${type}":`, error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
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

Create an engaging opening insight about this player's gaming personality.
Their ${data.gamingStyle} style and ${data.totalHours.toFixed(1)} hours this week tell a story - what is it?
Be creative, enthusiastic, and personal. Use metaphors, analogies, or comparisons if they fit. Make them feel seen and understood.`,

    'top-game-deep-dive': `${baseContext}

${data.topGame ? `They spent ${data.topGame.hours.toFixed(1)} hours on ${data.topGame.game.name} this week.` : ''}

Provide a thoughtful, creative observation about their dedication to this game.
What does this level of focus reveal? Use your creativity - maybe a comparison, a story, or an interesting angle.
Be genuine and specific. Make it feel like you truly understand their connection to this game.`,

    'session-patterns': `${baseContext}

Daily pattern: ${data.dailyHours.map(d => `${d.day}: ${d.hours.toFixed(1)}h`).join(', ')}
Session mix: ${data.marathonSessions} marathon, ${data.powerSessions} power, ${data.quickSessions} quick sessions

Analyze their gaming rhythm and patterns in a creative, insightful way.
Find the interesting story in their data. Be constructive and make them see their habits in a new light.`,

    'achievement-motivation': `${baseContext}

${data.completedGames.length > 0 ? `Completed: ${data.completedGames.map(g => g.name).join(', ')}` : ''}
${data.milestonesReached.length > 0 ? `Milestones: ${data.milestonesReached.join(', ')}` : ''}

Write motivational, creative commentary about their progress and achievements.
Be encouraging and celebratory. If they had few achievements, celebrate their journey and exploration instead.
Use your creativity to make them feel proud of their gaming time.`,

    'genre-insights': `${baseContext}

Genres: ${data.genresPlayed.join(', ') || 'Various'}
Diversity score: ${data.genreDiversityScore.toFixed(1)}/10

Provide creative insights into their genre preferences and exploration.
What does their genre mix say about them? Use interesting comparisons or observations.
Be playful and insightful about their gaming palette.`,

    'value-wisdom': `${baseContext}

${data.totalValueUtilized > 0 ? `Value utilized: $${data.totalValueUtilized.toFixed(2)}` : ''}
${data.bestValueGame ? `Best value: ${data.bestValueGame.game.name} at $${data.bestValueGame.costPerHour.toFixed(2)}/hour` : ''}

Share creative insights about their gaming value and library utilization.
Celebrate smart habits or gently encourage diving into their collection. Be fun and financially savvy.
Make value feel rewarding, not restrictive.`,

    'gaming-behavior': `${baseContext}

Observe their gaming behavior with humor, creativity, and personality.
Find the quirky, interesting patterns. Late-night sessions? Weekend warrior? Game rotation rituals?
Be playful, make them smile, and celebrate what makes their gaming habits uniquely theirs.
Let your creativity shine - use comparisons, jokes, or fun observations.`,

    'comeback-games': `${baseContext}

Games they returned to: ${data.gamesPlayed.filter(g => g.daysPlayed > 1).map(g => `${g.game.name} (${g.daysPlayed} days)`).join(', ') || 'N/A'}

What makes these games irresistible? Why do they keep coming back?
Be creative and insightful about player loyalty. Maybe they're comfort food, maybe they're habit-forming.
Find the interesting story in their comeback champions.`,

    'binge-sessions': `${baseContext}

Marathon sessions: ${data.marathonSessions} (3h+)
${data.longestSession ? `Longest: ${data.longestSession.hours.toFixed(1)}h on ${data.longestSession.game.name}` : ''}

Celebrate their epic gaming sessions with enthusiasm and creativity!
These marathon moments create the best memories. Make binge gaming sound legendary.
Use your creativity - comparisons to movie marathons, epic adventures, or whatever fits.`,

    'closing-reflection': `${baseContext}

Create a memorable closing reflection on their gaming week.
Synthesize the story of their week creatively. Use whatever style feels right - poetic, motivational, humorous, or thoughtful.
End with something that makes them excited for next week.
This is your chance to leave a lasting impression - make it count!`,
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
    'gaming-behavior': "Your gaming habits tell a unique story. Every session, every choice, adds another chapter to your gaming journey.",
    'comeback-games': "The games you return to say a lot about what you love. There's comfort in the familiar, and that's beautiful.",
    'binge-sessions': "Epic gaming sessions create the best memories. When you find the zone, ride that wave!",
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
