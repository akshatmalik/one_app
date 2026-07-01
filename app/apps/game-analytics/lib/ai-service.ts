'use client';

import { Schema, FunctionDeclaration, Content } from 'firebase/ai';
import { getAIModel } from './ai-client';
import { stripJsonFences } from './ai-json';
import { WeekInReviewData, MonthInReviewData, OscarAward, buildTasteProfile, getTotalHours } from './calculations';
import { Game, TasteProfile } from './types';
import { WRITE_FUNCTION_DECLARATIONS, parseFunctionCall, PendingAction } from './ai-actions';
import { searchRAWGGame } from './rawg-api';

// Model factory lives in ./ai-client (shared across all AI services).

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
 * Generate dramatic narrator-style blurbs for each Oscar award category in one batch call.
 * Returns a map of category id → dramatic description string.
 * Falls back to empty object on failure (template descriptions are shown instead).
 */
export async function generateOscarAwardBlurbs(
  awards: OscarAward[],
  periodLabel: string,
): Promise<Record<string, string>> {
  if (awards.length === 0) return {};

  const model = getAIModel();

  const categoriesStr = awards
    .map(a => {
      const allNominees = [a.winner, ...a.nominees];
      const nomineeStr = allNominees
        .map(n => `${n.gameName} [${n.stat ?? n.reason}]`)
        .join(', ');
      return `"${a.category}": ${a.categoryLabel} — "${a.tagline}" — nominees: ${nomineeStr}`;
    })
    .join('\n');

  const categoryIds = awards.map(a => `"${a.category}": "2-3 sentence dramatic intro"`).join(',\n  ');

  const prompt = `You are a theatrical awards ceremony host narrating a gaming recap for ${periodLabel}.

For each award category below, write exactly 2-3 sentences of dramatic narrator-style introduction. Build suspense, name the specific nominees, and make the listener feel the weight of the moment. Be specific to the data — no generic filler phrases.

Categories:
${categoriesStr}

Respond with ONLY valid JSON (no markdown, no code fences):
{
  ${categoryIds}
}`;

  try {
    const result = await model.generateContent(prompt);
    const raw = result.response.text().trim();
    const jsonStr = raw.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();
    const parsed = JSON.parse(jsonStr);
    // Validate it's an object with string values
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed as Record<string, string>;
    }
    return {};
  } catch (e) {
    console.error('Oscar award blurbs error:', e);
    return {};
  }
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

// ── GAMING AWARDS NARRATIVE ────────────────────────────────────────

export interface AwardCeremonyNarrative {
  opening: string;
  /** pitches[categoryId][gameName] = one-line campaign pitch */
  pitches: Record<string, Record<string, string>>;
}

export interface AwardNomineeInput {
  name: string;
  hours: number;
  rating: number;
  genre?: string;
  weeklyWins?: number;   // how many weekly awards this game already has this month/quarter
  monthlyWins?: number;  // how many monthly awards this game already has this quarter/year
}

/**
 * Generate AI ceremony opening + per-nominee pitches for an awards ceremony.
 * Used for week, month, quarter, and year award ceremonies.
 */
export async function generateAwardNarrative(context: {
  periodLabel: string;
  periodType: 'week' | 'month' | 'quarter' | 'year';
  nominees: AwardNomineeInput[];
  categories: Array<{ id: string; label: string }>;
  priorContext?: string; // e.g. "Elden Ring won Game of the Week twice this month"
}): Promise<AwardCeremonyNarrative> {
  const model = getAIModel();

  const gamesStr = context.nominees
    .map(g => [
      `${g.name} (${g.hours.toFixed(1)}h, rated ${g.rating}/10${g.genre ? ', ' + g.genre : ''})`,
      g.weeklyWins ? `${g.weeklyWins} weekly win(s)` : '',
      g.monthlyWins ? `${g.monthlyWins} monthly win(s)` : '',
    ].filter(Boolean).join(' — '))
    .join('\n');

  const categoriesStr = context.categories.map(c => `"${c.id}": "${c.label}"`).join(', ');
  const nomineeNames = context.nominees.map(g => g.name);

  const prompt = `You are a witty, slightly dramatic gaming awards host presenting the ${context.periodLabel} ceremony.

Games in contention:
${gamesStr}

Award categories: ${categoriesStr}
${context.priorContext ? `\nStory so far: ${context.priorContext}` : ''}

Respond with ONLY valid JSON (no markdown, no code fences) in exactly this structure:
{
  "opening": "2-3 sentence ceremony opening. Reference specific games and hours. Build narrative tension — mention if any game is going for a sweep. Casual-dramatic tone.",
  "pitches": {
    ${context.categories.map(c =>
      `"${c.id}": {${nomineeNames.map(n => `"${n}": "1-sentence campaign pitch"`).join(', ')}}`
    ).join(',\n    ')}
  }
}

Pitch rules: each pitch is exactly 1 sentence, specific to that game's data, no generic praise.`;

  try {
    const result = await model.generateContent(prompt);
    const raw = result.response.text().trim();
    // Strip markdown fences if present
    const jsonStr = raw.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();
    const parsed = JSON.parse(jsonStr);
    return { opening: parsed.opening || '', pitches: parsed.pitches || {} };
  } catch (e) {
    console.error('Award narrative error:', e);
    return { opening: '', pitches: {} };
  }
}

// ── AI REVIEW INTERVIEW ────────────────────────────────────────────
// Gemini conducts a voice interview about a game: it transcribes the
// player's spoken answers, reads them in light of the player's taste,
// asks adaptive follow-ups, then synthesizes a reflective written review.

export interface ReviewGameContext {
  name: string;
  rating: number;
  genre?: string;
  hours: number;
  status: string;
  platform?: string;
}

export interface ReviewInterviewTurn {
  role: 'interviewer' | 'player';
  text: string;
}

export interface ReviewInterviewResponse {
  transcript: string;   // what the player just said (from audio); '' for the opening turn
  nextQuestion: string; // '' when the interview is complete
  done: boolean;
  error?: string;
}

export interface RecordedAudioInput {
  base64: string;
  mimeType: string;
}

/** Build a compact, prompt-friendly taste summary from the library. */
export function buildTasteSummary(allGames: Game[], excludeGameName?: string): string {
  const games = excludeGameName
    ? allGames.filter(g => g.name !== excludeGameName)
    : allGames;
  if (games.length === 0) return 'No prior library data yet — this may be one of their first tracked games.';

  const profile: TasteProfile = buildTasteProfile(games);
  const genreDetail = profile.favoriteGenreDetails
    .slice(0, 4)
    .map(d => `${d.genre} (avg ${d.avgRating.toFixed(1)}/10 over ${d.count})`)
    .join(', ');
  const top = profile.topGames
    .slice(0, 4)
    .map(g => `${g.name} ${g.rating.toFixed(1)}/10`)
    .join(', ');

  return [
    `Overall avg rating: ${profile.avgRating.toFixed(1)}/10.`,
    profile.topGenres.length ? `Favorite genres: ${profile.topGenres.slice(0, 4).join(', ')}.` : '',
    genreDetail ? `Genre ratings: ${genreDetail}.` : '',
    top ? `Top-rated games: ${top}.` : '',
    profile.avoidGenres.length ? `Tends to dislike: ${profile.avoidGenres.slice(0, 3).join(', ')}.` : '',
  ].filter(Boolean).join(' ');
}

function gameContextLine(game: ReviewGameContext): string {
  return `"${game.name}" — rated ${game.rating.toFixed(1)}/10, ${game.genre || 'unknown genre'}, ${game.hours.toFixed(0)}h played, status: ${game.status}${game.platform ? `, on ${game.platform}` : ''}.`;
}

function historyText(history: ReviewInterviewTurn[]): string {
  if (history.length === 0) return '(no exchange yet)';
  return history
    .map(t => `${t.role === 'interviewer' ? 'Interviewer' : 'Player'}: ${t.text}`)
    .join('\n');
}

/**
 * One interview turn. If `audio` is null, generates the opening question.
 * Otherwise transcribes the spoken answer and decides the next follow-up
 * (or finishes). Adaptive — references the player's words and taste.
 */
export async function conductReviewInterview(params: {
  game: ReviewGameContext;
  tasteSummary: string;
  history: ReviewInterviewTurn[];
  audio: RecordedAudioInput | null;
  textAnswer?: string;
  questionsAsked: number;
  maxQuestions: number;
}): Promise<ReviewInterviewResponse> {
  const { game, tasteSummary, history, audio, textAnswer, questionsAsked, maxQuestions } = params;
  const model = getAIModel();

  const base = `You are a sharp, warm interviewer helping a gamer reflect on a game they just rated, so they can write an honest review. Be specific and conversational, never generic or fawning. Ask about ONE thing at a time.

Game: ${gameContextLine(game)}
Player's taste profile: ${tasteSummary}

Conversation so far:
${historyText(history)}`;

  if (!audio && !textAnswer) {
    // Opening question
    const prompt = `${base}

Write the opening interview question. Make it specific to this game and their ${game.rating.toFixed(1)}/10 rating — if that rating is notably high or low versus their taste, lean into that. One short, natural question.

Respond with ONLY valid JSON (no markdown): {"transcript": "", "nextQuestion": "<your question>", "done": false}`;
    try {
      const result = await model.generateContent(prompt);
      const parsed = JSON.parse(stripJsonFences(result.response.text().trim()));
      return {
        transcript: '',
        nextQuestion: String(parsed.nextQuestion || ''),
        done: false,
      };
    } catch (e) {
      console.error('Review interview (opening) error:', e);
      return {
        transcript: '',
        nextQuestion: `What stood out most about ${game.name}?`,
        done: false,
        error: String(e),
      };
    }
  }

  const shouldWrap = questionsAsked + 1 >= maxQuestions;

  // Text answer path — no transcription needed
  if (textAnswer && !audio) {
    const prompt = `${base}

The player typed this answer: "${textAnswer}"

Decide the next move:
- If there is more worth exploring AND you have asked fewer than ${maxQuestions} questions, ask ONE follow-up that digs into something specific they said, or how this game compares to their taste. ${shouldWrap ? 'You have now reached the question limit, so set done=true and nextQuestion="".' : ''}
- If you have enough for a rich, honest review, set done=true and nextQuestion="".

Respond with ONLY valid JSON (no markdown): {"nextQuestion": "<next question or empty>", "done": <true|false>}`;
    try {
      const result = await model.generateContent(prompt);
      const parsed = JSON.parse(stripJsonFences(result.response.text().trim()));
      const done = Boolean(parsed.done) || shouldWrap;
      return {
        transcript: textAnswer,
        nextQuestion: done ? '' : String(parsed.nextQuestion || ''),
        done,
      };
    } catch (e) {
      console.error('Review interview (text turn) error:', e);
      return {
        transcript: textAnswer,
        nextQuestion: '',
        done: true,
        error: String(e),
      };
    }
  }

  const prompt = `${base}

The player just answered by voice — audio is attached.
1. Transcribe what they said accurately and concisely (clean up filler words, keep their meaning and voice).
2. Then decide the next move:
   - If there is more worth exploring AND you have asked fewer than ${maxQuestions} questions, ask ONE follow-up that digs into something specific they said, or how this game compares to their taste. ${shouldWrap ? 'You have now reached the question limit, so set done=true and nextQuestion="".' : ''}
   - If you have enough for a rich, honest review, set done=true and nextQuestion="".

Respond with ONLY valid JSON (no markdown): {"transcript": "<what they said>", "nextQuestion": "<next question or empty>", "done": <true|false>}`;

  try {
    const result = await model.generateContent([
      { text: prompt },
      { inlineData: { mimeType: audio!.mimeType, data: audio!.base64 } },
    ]);
    const parsed = JSON.parse(stripJsonFences(result.response.text().trim()));
    const done = Boolean(parsed.done) || shouldWrap;
    return {
      transcript: String(parsed.transcript || ''),
      nextQuestion: done ? '' : String(parsed.nextQuestion || ''),
      done,
    };
  } catch (e) {
    console.error('Review interview (voice turn) error:', e);
    return {
      transcript: '',
      nextQuestion: '',
      done: true,
      error: String(e),
    };
  }
}

// ── REVIEW CHAT ────────────────────────────────────────────────────
// Persistent back-and-forth chat about a specific game.
// Each call returns a single AI message. Caller saves history externally.

const REVIEW_CATEGORIES = ['gameplay/mechanics', 'story/world', 'visuals/atmosphere', 'sound/music', 'value for money', 'replayability', 'who it\'s for'];

export interface ReviewChatMessage {
  role: 'user' | 'ai';
  text: string;
}

export async function generateReviewChatResponse(params: {
  game: ReviewGameContext;
  tasteSummary: string;
  history: ReviewChatMessage[];
  userMessage: string | null; // null = opening message
}): Promise<string> {
  const { game, tasteSummary, history, userMessage } = params;
  const model = getAIModel();

  const gameInfo = `"${game.name}" — ${game.hours.toFixed(0)}h played, rated ${game.rating.toFixed(1)}/10, status: ${game.status}${game.genre ? `, genre: ${game.genre}` : ''}${game.platform ? `, on ${game.platform}` : ''}.`;

  const historyText = history.length > 0
    ? history.map(m => `${m.role === 'user' ? 'Player' : 'You'}: ${m.text}`).join('\n')
    : '';

  const coveredHints = history.map(m => m.text.toLowerCase()).join(' ');
  const uncovered = REVIEW_CATEGORIES.filter(cat => {
    const keywords = cat.split('/');
    return !keywords.some(kw => coveredHints.includes(kw));
  });

  let prompt: string;

  if (!userMessage) {
    // Opening message — no user input yet
    prompt = `You are a thoughtful friend helping a player reflect on a game they've spent time with. Your goal is to help them build a genuine, personal review through natural conversation over several messages.

Game: ${gameInfo}
Player's broader taste: ${tasteSummary}

Write your opening message. Reference something specific from the data — their rating, hours, or status — to make it feel personal. Ask ONE focused question to kick things off. NOT "what did you think?" — something more specific, like what surprised them, how it compared to their expectations, or what they'd tell a friend.

Keep it to 2-3 sentences total. Casual, warm, curious. No greeting like "Hey!" or "Hi there!".`;
  } else {
    prompt = `You are a thoughtful friend helping a player reflect on "${game.name}" and build a genuine personal review through conversation.

Game: ${gameInfo}
Player's broader taste: ${tasteSummary}

Conversation so far:
${historyText}

Player just said: "${userMessage}"

Respond naturally to what they said in 1-2 sentences. Then ask ONE specific follow-up question — either digging deeper into what they mentioned, or steering toward something not yet covered.

Categories not yet touched: ${uncovered.length > 0 ? uncovered.join(', ') : 'all covered — feel free to wrap up or dig deeper'}.

Stay casual and conversational. Respond to their actual words, don't just jump topics. 2-4 sentences total.`;
  }

  try {
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (e) {
    console.error('Review chat error:', e);
    if (!userMessage) {
      return `You've put ${game.hours.toFixed(0)} hours into ${game.name} and rated it ${game.rating.toFixed(1)}/10. What made you give it that score?`;
    }
    return "Tell me more about that — what specifically stood out?";
  }
}

/**
 * Synthesize the interview into a first-person, reflective written review.
 */
export async function synthesizeGameReview(params: {
  game: ReviewGameContext;
  tasteSummary: string;
  history: ReviewInterviewTurn[];
}): Promise<{ review: string; error?: string }> {
  const { game, tasteSummary, history } = params;
  const model = getAIModel();

  const prompt = `Based on this interview, write the player's review of ${game.name} in their own first-person voice.

Game: ${gameContextLine(game)}
Player's taste profile: ${tasteSummary}

Interview:
${historyText(history)}

Write 3-5 sentences. Capture their actual opinions and reasoning from the conversation — the highs, the lows, who it's for. Reflective and honest, like a thoughtful friend describing the game. No marketing fluff, no star ratings, no "in conclusion". Do not invent details they didn't mention.

Return ONLY the review prose — no headings, no quotes, no JSON.`;

  try {
    const result = await model.generateContent(prompt);
    return { review: result.response.text().trim() };
  } catch (e) {
    console.error('Review synthesis error:', e);
    // Fallback: stitch the player's own answers together.
    const fallback = history
      .filter(t => t.role === 'player')
      .map(t => t.text)
      .join(' ');
    return { review: fallback, error: String(e) };
  }
}

// ── AGENT MODE ─────────────────────────────────────────────────────
// Turns the chat into an agent that can perform app actions via Gemini
// function calling. The model PROPOSES write actions; the host executes
// them only after the user confirms (one confirmation per proposal turn).
// Read tools (findGames, lookupGames) run here directly — they never mutate.

export interface AgentChatContext {
  weekData: WeekInReviewData | null;
  monthGames: Game[];
  allGames: Game[];
}

export interface AgentActionResult {
  summary: string;
  ok: boolean;
}

/** Result of one agent turn: either plain text, or a set of actions awaiting confirmation. */
export type AgentTurn =
  | { kind: 'text'; text: string }
  | {
      kind: 'actions';
      text: string; // any prose the model said alongside the proposal (may be empty)
      actions: PendingAction[];
      /** Call after the user confirms + the host runs the actions. Resumes the model. */
      resume: (results: AgentActionResult[]) => Promise<AgentTurn>;
    };

const READ_FUNCTION_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: 'findGames',
    description: 'Search the user\'s library to resolve a game name to its id (needed before any update/log/status/queue/delete action). Returns matching games with ids. Call this whenever the user refers to a game by name.',
    parameters: Schema.object({
      properties: {
        query: Schema.string({ description: 'Partial or full game name to match. Omit to list everything.' }),
        status: Schema.enumString({
          enum: ['Not Started', 'In Progress', 'Completed', 'Wishlist', 'Abandoned', 'Pick Up Later'],
          description: 'Optional status filter',
        }),
      },
      optionalProperties: ['query', 'status'],
    }),
  },
  {
    name: 'lookupGames',
    description: 'Look up real metadata (release date, metacritic, rating, thumbnail) for games by name from the games database. ALWAYS call this before addGames so release dates are real, not guessed.',
    parameters: Schema.object({
      properties: {
        names: Schema.array({ items: Schema.string(), description: 'Game names to look up' }),
      },
    }),
  },
];

const READ_NAMES = new Set(['findGames', 'lookupGames']);

/** Minimal shape of the SDK response we rely on (text + functionCalls accessors). */
interface AgentResponse {
  text: () => string;
  functionCalls: () => Array<{ name: string; args: Record<string, unknown> }> | undefined;
}

function getAgentModel(systemInstruction: string) {
  return getAIModel({
    tools: [{ functionDeclarations: [...READ_FUNCTION_DECLARATIONS, ...WRITE_FUNCTION_DECLARATIONS] }],
    systemInstruction,
  });
}

function buildAgentSystemInstruction(context: AgentChatContext): string {
  return `You are an AI gaming coach AND assistant for a game-tracking app. You can BOTH answer questions about the player's gaming data and PERFORM actions on their behalf using the provided tools.

${buildChatContext(context)}

ACTION RULES:
- To act on an existing game (update, log a session, change status, queue, delete, review, mark special), FIRST call findGames to resolve the game's id, then call the write tool with that id.
- For games the user is "interested in" but doesn't own yet, FIRST call lookupGames to fetch real release dates and thumbnails, THEN call addGames. Default unreleased/TBA games to the "queue" destination and already-released games to "wishlist", unless the user specifies otherwise. If they say "both", use "both".
- For a game the user already owns/played, use addGame (not addGames).
- Avoid duplicates: before adding any game, call findGames to check it isn't already tracked. If it already exists and the user wants to change something about it, use updateGame/setGameStatus/logPlaySession on the existing game instead of adding a new copy. Only add a duplicate if the user explicitly insists.
- You may propose multiple write actions in one turn when the user asks for several things — they will be confirmed together.
- The app shows the user a confirmation card for every write action and runs it only if they approve. Do NOT ask "should I?" in prose — just call the tool; the confirmation UI handles approval. After an action runs you receive its result; then give a brief, friendly confirmation.
- Never invent release dates, ratings, or metadata — only use values returned by lookupGames or findGames.
- Keep prose concise and specific to the player's data.`;
}

async function executeReadTool(
  name: string,
  args: Record<string, unknown>,
  context: AgentChatContext,
): Promise<object> {
  if (name === 'findGames') {
    const query = args.query ? String(args.query).toLowerCase() : '';
    const status = args.status ? String(args.status) : '';
    const matches = context.allGames
      .filter(g => (!query || g.name.toLowerCase().includes(query)) && (!status || g.status === status))
      .slice(0, 20)
      .map(g => ({
        id: g.id,
        name: g.name,
        status: g.status,
        hours: Math.round(getTotalHours(g) * 10) / 10,
        rating: g.rating,
        genre: g.genre ?? null,
        platform: g.platform ?? null,
        inQueue: g.queuePosition !== undefined,
      }));
    return { count: matches.length, games: matches };
  }

  if (name === 'lookupGames') {
    const names: string[] = Array.isArray(args.names) ? args.names.map(String) : [];
    const results = await Promise.all(
      names.map(async (n) => {
        const data = await searchRAWGGame(n);
        return {
          query: n,
          found: !!data,
          name: data?.name ?? n,
          released: data?.released ?? null,
          metacritic: data?.metacritic ?? null,
          rawgRating: data?.rating ?? null,
          thumbnail: data?.backgroundImage ?? null,
        };
      }),
    );
    return { results };
  }

  return { error: `Unknown read tool: ${name}` };
}

/**
 * Drive the model forward from a response, auto-handling read tools until it
 * either returns prose or proposes write actions (which pause for confirmation).
 */
async function advanceAgent(
  chat: ReturnType<ReturnType<typeof getAgentModel>['startChat']>,
  initialResponse: AgentResponse,
  context: AgentChatContext,
): Promise<AgentTurn> {
  let response = initialResponse;

  for (let i = 0; i < 8; i++) {
    const calls = response.functionCalls() ?? [];
    if (!calls || calls.length === 0) {
      return { kind: 'text', text: response.text() || 'Done.' };
    }

    const reads = calls.filter((c: { name: string }) => READ_NAMES.has(c.name));
    const writes = calls.filter((c: { name: string }) => !READ_NAMES.has(c.name));

    // Resolve read tools immediately — they're side-effect free.
    const readParts = await Promise.all(
      reads.map(async (c: { name: string; args: Record<string, unknown> }) => ({
        functionResponse: { name: c.name, response: await executeReadTool(c.name, c.args, context) },
      })),
    );

    if (writes.length > 0) {
      // Parse each write into a PendingAction (parallel array; nulls = invalid).
      const parsed = writes.map((c: { name: string; args: Record<string, unknown> }) =>
        parseFunctionCall(c.name, c.args),
      );
      const actions = parsed.filter((a: PendingAction | null): a is PendingAction => a !== null);

      if (actions.length === 0) {
        // Nothing executable — tell the model and keep going.
        const errParts = writes.map((c: { name: string }) => ({
          functionResponse: { name: c.name, response: { error: 'Invalid or incomplete arguments.' } },
        }));
        response = (await chat.sendMessage([...readParts, ...errParts])).response as unknown as AgentResponse;
        continue;
      }

      const text = response.text() || '';
      const resume = async (results: AgentActionResult[]): Promise<AgentTurn> => {
        let ri = 0;
        const writeParts = writes.map((c: { name: string }, idx: number) => {
          if (parsed[idx] === null) {
            return { functionResponse: { name: c.name, response: { error: 'Invalid arguments, skipped.' } } };
          }
          const r = results[ri++];
          return {
            functionResponse: {
              name: c.name,
              response: r
                ? { success: r.ok, result: r.summary }
                : { success: false, result: 'No result returned.' },
            },
          };
        });
        const next = (await chat.sendMessage([...readParts, ...writeParts])).response as unknown as AgentResponse;
        return advanceAgent(chat, next, context);
      };

      return { kind: 'actions', text, actions, resume };
    }

    // Reads only — feed results back and continue the loop.
    response = (await chat.sendMessage(readParts)).response as unknown as AgentResponse;
  }

  return { kind: 'text', text: response.text() || 'Done.' };
}

/**
 * Start one agent turn. Returns plain text or a set of actions awaiting
 * confirmation (with a `resume` continuation to call after they run).
 */
export async function runAgentTurn(params: {
  userMessage: string;
  context: AgentChatContext;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
}): Promise<AgentTurn> {
  const { userMessage, context, history } = params;
  const model = getAgentModel(buildAgentSystemInstruction(context));

  // Gemini requires history to start with a user turn and alternate roles.
  // Merge consecutive same-role messages (e.g. proposal text + cancel note).
  const mappedHistory: Content[] = [];
  for (const m of history.slice(-12)) {
    const role: 'user' | 'model' = m.role === 'user' ? 'user' : 'model';
    const last = mappedHistory[mappedHistory.length - 1];
    if (last && last.role === role) {
      last.parts.push({ text: m.content });
    } else {
      mappedHistory.push({ role, parts: [{ text: m.content }] });
    }
  }
  while (mappedHistory.length && mappedHistory[0].role !== 'user') {
    mappedHistory.shift();
  }

  try {
    const chat = model.startChat({ history: mappedHistory });
    const response = (await chat.sendMessage(userMessage)).response as unknown as AgentResponse;
    return await advanceAgent(chat, response, context);
  } catch (error) {
    console.error('Agent turn error:', error);
    return { kind: 'text', text: "Sorry, I hit a snag processing that. Mind trying again?" };
  }
}

