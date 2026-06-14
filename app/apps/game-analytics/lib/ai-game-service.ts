'use client';

import { getAIModel } from './ai-client';
import { getCache as getCacheRaw, setCache } from './cache';
import { Game } from './types';
import { AIBlurbResult } from './ai-service';

// Cache keys
const GAME_INSIGHT_CACHE = 'game-insight-pack-v1';
const GAME_ONELINER_CACHE = 'game-oneliners-cache';
const MONTHLY_RECAP_CACHE = 'monthly-recap-cache';
const CHAPTER_TITLES_CACHE = 'chapter-titles-cache';
const MONTH_CHAPTER_TITLES_CACHE = 'month-chapter-titles-cache';
const WEEK_TITLES_CACHE = 'week-titles-cache';
const CACHE_TTL = 1000 * 60 * 60 * 4; // 4 hours

// Local wrapper so existing call sites keep their (key) signature with our 4h TTL.
function getCache<T>(key: string): T | null {
  return getCacheRaw<T>(key, CACHE_TTL);
}

/**
 * Generate AI one-liner for a specific game
 */
export async function generateGameOneLiner(game: Game, allGames: Game[]): Promise<string> {
  // Check cache
  const cached = getCache<Record<string, string>>(GAME_ONELINER_CACHE);
  if (cached && cached[game.id]) {
    return cached[game.id];
  }

  const totalHours = game.hours + (game.playLogs?.reduce((s, l) => s + l.hours, 0) || 0);
  const costPerHour = totalHours > 0 && game.price > 0 ? (game.price / totalHours).toFixed(2) : 'N/A';
  const sessions = game.playLogs?.length || 0;

  const lastNote = game.playLogs && game.playLogs.length > 0
    ? [...game.playLogs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].notes || ''
    : '';

  const prompt = `You are a witty gaming companion. Write ONE short, punchy sentence (max 15 words) about this game from the player's perspective. Be specific, clever, and fun.

Game: ${game.name} (${game.genre || 'Unknown genre'}, ${game.platform || 'Unknown platform'})
Status: ${game.status}
Hours: ${totalHours}h | Sessions: ${sessions} | Rating: ${game.rating}/10
Cost/hr: $${costPerHour} | Price paid: $${game.price}
${lastNote ? `Last note: "${lastNote}"` : ''}
${game.review ? `Review: "${game.review.slice(0, 100)}"` : ''}

Rules:
- Reference specific numbers or details from the data
- Be warm, not mean
- Don't start with "You" — be creative with the opener
- No quotes around the response
- Max 15 words

Return ONLY the one-liner, nothing else.`;

  try {
    const model = getAIModel();
    const result = await model.generateContent(prompt);
    const oneLiner = result.response.text().trim().replace(/^["']|["']$/g, '');

    // Update cache
    const existing = cached || {};
    existing[game.id] = oneLiner;
    setCache(GAME_ONELINER_CACHE, existing);

    return oneLiner;
  } catch (error) {
    console.error('AI game one-liner error:', error);
    return '';
  }
}

/**
 * Generate AI monthly recap narrative
 */
export async function generateMonthlyRecap(
  monthKey: string,
  events: Array<{ type: string; game: { name: string; genre?: string }; hours?: number; price?: number }>
): Promise<string> {
  const cached = getCache<Record<string, string>>(MONTHLY_RECAP_CACHE);
  if (cached && cached[monthKey]) {
    return cached[monthKey];
  }

  const playEvents = events.filter(e => e.type === 'play');
  const totalHours = playEvents.reduce((s, e) => s + (e.hours || 0), 0);
  const uniqueGames = [...new Set(playEvents.map(e => e.game.name))];
  const purchases = events.filter(e => e.type === 'purchase');
  const completions = events.filter(e => e.type === 'complete');

  const [year, month] = monthKey.split('-');
  const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const prompt = `Write a 1-2 sentence narrative recap of this player's gaming month. Be specific with game names and numbers. Write like a TV narrator doing a "previously on..." recap. Engaging but concise.

Month: ${monthName}
Total hours: ${totalHours.toFixed(1)}h across ${playEvents.length} sessions
Games played: ${uniqueGames.join(', ')}
New purchases: ${purchases.length > 0 ? purchases.map(p => `${p.game.name} ($${p.price})`).join(', ') : 'None'}
Completed: ${completions.length > 0 ? completions.map(c => c.game.name).join(', ') : 'None'}

Return ONLY the narrative, no labels or quotes.`;

  try {
    const model = getAIModel();
    const result = await model.generateContent(prompt);
    const recap = result.response.text().trim();

    const existing = cached || {};
    existing[monthKey] = recap;
    setCache(MONTHLY_RECAP_CACHE, existing);

    return recap;
  } catch (error) {
    console.error('AI monthly recap error:', error);
    return '';
  }
}

/**
 * Generate AI chapter titles for quarters of the year
 */
export async function generateYearChapterTitles(
  games: Game[],
  year: number = new Date().getFullYear()
): Promise<Record<string, string>> {
  const cacheKey = `${CHAPTER_TITLES_CACHE}-${year}`;
  const cached = getCache<Record<string, string>>(cacheKey);
  if (cached && Object.keys(cached).length > 0) {
    return cached;
  }

  // Build quarter summaries
  const quarters: Record<string, { games: string[]; hours: number; completions: string[] }> = {
    Q1: { games: [], hours: 0, completions: [] },
    Q2: { games: [], hours: 0, completions: [] },
    Q3: { games: [], hours: 0, completions: [] },
    Q4: { games: [], hours: 0, completions: [] },
  };

  games.forEach(game => {
    if (game.playLogs) {
      game.playLogs.forEach(log => {
        const logDate = new Date(log.date);
        if (logDate.getFullYear() !== year) return;
        const q = Math.floor(logDate.getMonth() / 3);
        const qKey = `Q${q + 1}`;
        if (!quarters[qKey].games.includes(game.name)) {
          quarters[qKey].games.push(game.name);
        }
        quarters[qKey].hours += log.hours;
      });
    }
    if (game.status === 'Completed' && game.endDate) {
      const endDate = new Date(game.endDate);
      if (endDate.getFullYear() === year) {
        const q = Math.floor(endDate.getMonth() / 3);
        quarters[`Q${q + 1}`].completions.push(game.name);
      }
    }
  });

  const quarterSummaries = Object.entries(quarters)
    .map(([q, data]) => `${q}: ${data.hours.toFixed(0)}h, games: ${data.games.join(', ') || 'none'}, completed: ${data.completions.join(', ') || 'none'}`)
    .join('\n');

  const prompt = `Name each quarter of this gamer's ${year} like a TV season chapter title. Be creative, specific to the games they played, and fun. 3-5 words each.

${quarterSummaries}

Return exactly 4 lines in format "Q1: Title Here" — one per quarter. Only quarters with activity get creative titles. Empty quarters get "The Quiet Quarter".`;

  try {
    const model = getAIModel();
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const titles: Record<string, string> = {};

    text.split('\n').forEach(line => {
      const match = line.match(/Q(\d):\s*(.+)/);
      if (match) {
        titles[`Q${match[1]}`] = match[2].trim();
      }
    });

    setCache(cacheKey, titles);
    return titles;
  } catch (error) {
    console.error('AI chapter titles error:', error);
    return { Q1: 'Winter Sessions', Q2: 'Spring Forward', Q3: 'Summer Gaming', Q4: 'Year-End Push' };
  }
}

/**
 * Generate AI chapter titles for individual months
 */
export async function generateMonthChapterTitles(
  games: Game[],
  monthKeys: string[]
): Promise<Record<string, string>> {
  const cached = getCache<Record<string, string>>(MONTH_CHAPTER_TITLES_CACHE);
  const results: Record<string, string> = cached || {};

  // Filter to only months we don't have cached
  const uncachedMonths = monthKeys.filter(mk => !results[mk]);
  if (uncachedMonths.length === 0) return results;

  // Build month summaries from game data
  const monthSummaries: Record<string, { games: string[]; hours: number; completions: string[] }> = {};
  uncachedMonths.forEach(mk => {
    monthSummaries[mk] = { games: [], hours: 0, completions: [] };
  });

  games.forEach(game => {
    if (game.playLogs) {
      game.playLogs.forEach(log => {
        const logMonthKey = log.date.substring(0, 7);
        if (monthSummaries[logMonthKey]) {
          if (!monthSummaries[logMonthKey].games.includes(game.name)) {
            monthSummaries[logMonthKey].games.push(game.name);
          }
          monthSummaries[logMonthKey].hours += log.hours;
        }
      });
    }
    if (game.status === 'Completed' && game.endDate) {
      const endMonthKey = game.endDate.substring(0, 7);
      if (monthSummaries[endMonthKey]) {
        monthSummaries[endMonthKey].completions.push(game.name);
      }
    }
  });

  const summaryText = uncachedMonths.map(mk => {
    const [year, month] = mk.split('-');
    const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const data = monthSummaries[mk];
    return `${monthName}: ${data.hours.toFixed(0)}h, games: ${data.games.join(', ') || 'none'}, completed: ${data.completions.join(', ') || 'none'}`;
  }).join('\n');

  const prompt = `Name each month of this gamer's timeline like a TV episode title. Be creative, specific to the games they played, and fun. 3-5 words each.

${summaryText}

Return one line per month in format "Month Year: Title Here" (e.g., "January 2025: The RPG Renaissance"). Months with no activity get "The Quiet Month".`;

  try {
    const model = getAIModel();
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    text.split('\n').forEach(line => {
      // Match "Month Year: Title" or "YYYY-MM: Title"
      const match = line.match(/(?:(\w+)\s+(\d{4})|(\d{4}-\d{2})):\s*(.+)/);
      if (match) {
        let monthKey: string;
        if (match[3]) {
          monthKey = match[3];
        } else {
          const monthNames: Record<string, string> = {
            January: '01', February: '02', March: '03', April: '04', May: '05', June: '06',
            July: '07', August: '08', September: '09', October: '10', November: '11', December: '12'
          };
          monthKey = `${match[2]}-${monthNames[match[1]] || '01'}`;
        }
        if (uncachedMonths.includes(monthKey)) {
          results[monthKey] = match[4].trim();
        }
      }
    });

    setCache(MONTH_CHAPTER_TITLES_CACHE, results);
    return results;
  } catch (error) {
    console.error('AI month chapter titles error:', error);
    return results;
  }
}

/**
 * Generate AI title for a week period based on activity
 */
export async function generateWeekTitles(
  games: Game[],
  periods: Array<{ key: string; label: string; startDate: string; endDate: string }>
): Promise<Record<string, string>> {
  const cached = getCache<Record<string, string>>(WEEK_TITLES_CACHE);
  const results: Record<string, string> = cached || {};

  const uncachedPeriods = periods.filter(p => !results[p.key]);
  if (uncachedPeriods.length === 0) return results;

  // Build period summaries
  const summaryText = uncachedPeriods.map(period => {
    const start = new Date(period.startDate);
    const end = new Date(period.endDate);
    const gamesPlayed: Record<string, number> = {};

    games.forEach(game => {
      if (game.playLogs) {
        game.playLogs.forEach(log => {
          const logDate = new Date(log.date);
          if (logDate >= start && logDate <= end) {
            gamesPlayed[game.name] = (gamesPlayed[game.name] || 0) + log.hours;
          }
        });
      }
    });

    const gamesList = Object.entries(gamesPlayed)
      .sort((a, b) => b[1] - a[1])
      .map(([name, hours]) => `${name} (${hours.toFixed(1)}h)`)
      .join(', ');
    const totalHours = Object.values(gamesPlayed).reduce((s, h) => s + h, 0);

    return `${period.label}: ${totalHours.toFixed(1)}h total, games: ${gamesList || 'none'}`;
  }).join('\n');

  const prompt = `Name each time period of this gamer's timeline like a TV episode title. Be creative, specific to the games they played, and fun. 3-5 words each.

${summaryText}

Return one line per period in format "Period Label: Title Here". Periods with no activity get "The Quiet Days".`;

  try {
    const model = getAIModel();
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    text.split('\n').forEach((line, i) => {
      if (i < uncachedPeriods.length) {
        const colonIdx = line.indexOf(':');
        if (colonIdx > -1) {
          results[uncachedPeriods[i].key] = line.substring(colonIdx + 1).trim();
        }
      }
    });

    setCache(WEEK_TITLES_CACHE, results);
    return results;
  } catch (error) {
    console.error('AI week titles error:', error);
    return results;
  }
}

// ─── Game Card Insight Pack ──────────────────────────────────────────────────

export interface SimilarGameSuggestion {
  name: string;
  genre: string;
  reason: string;
}

export interface GameInsightPack {
  narrativeSentence: string;  // "The Sentence" — cinematic summary of this game in your life
  uniquenessInsight: string;  // "The Only One" — AI-phrased uniqueness
  tasteInsight: string;       // "What This Reveals" — what this game says about you
  similarGames: SimilarGameSuggestion[]; // "You Might Also Love" — 3 games outside your library
  milestoneNarrative: string; // narrative about how fast/slow you hit milestones
}

export async function generateGameInsightPack(
  game: Game,
  allGames: Game[],
  uniquenessStatements: string[],
  milestoneSummary: Array<{ hours: number; daysToReach: number; isFastest: boolean; libraryAvgDays: number | null }>
): Promise<GameInsightPack> {
  const totalHours = game.hours + (game.playLogs?.reduce((s, l) => s + l.hours, 0) || 0);
  const cacheKey = `${game.id}-${Math.floor(totalHours)}-${game.rating}`;

  const cached = getCache<Record<string, GameInsightPack>>(GAME_INSIGHT_CACHE);
  if (cached && cached[cacheKey]) return cached[cacheKey];

  const ownedGames = allGames.filter(g => g.status !== 'Wishlist' && g.id !== game.id);
  const topRated = [...ownedGames]
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 6)
    .map(g => `${g.name} (${g.rating}/10, ${g.genre || '?'})`);

  const topPlayed = [...ownedGames]
    .sort((a, b) => {
      const aH = a.hours + (a.playLogs?.reduce((s, l) => s + l.hours, 0) || 0);
      const bH = b.hours + (b.playLogs?.reduce((s, l) => s + l.hours, 0) || 0);
      return bH - aH;
    })
    .slice(0, 5)
    .map(g => {
      const h = g.hours + (g.playLogs?.reduce((s, l) => s + l.hours, 0) || 0);
      return `${g.name} (${h}h, ${g.genre || '?'})`;
    });

  const genreStats: Record<string, { count: number; totalRating: number }> = {};
  ownedGames.forEach(g => {
    if (!g.genre) return;
    if (!genreStats[g.genre]) genreStats[g.genre] = { count: 0, totalRating: 0 };
    genreStats[g.genre].count++;
    genreStats[g.genre].totalRating += g.rating;
  });
  const genreContext = Object.entries(genreStats)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5)
    .map(([genre, s]) => `${genre} (${s.count} games, avg ${(s.totalRating / s.count).toFixed(1)}/10)`)
    .join(', ');

  const milestoneContext = milestoneSummary.length > 0
    ? milestoneSummary
        .map(m =>
          `${m.hours}h reached on day ${m.daysToReach}` +
          (m.libraryAvgDays ? ` (library avg ${m.libraryAvgDays}d)` : '') +
          (m.isFastest ? ' ← FASTEST in library' : '')
        )
        .join(' | ')
    : 'No play-log milestone data';

  const excludeNames = allGames.map(g => g.name).filter(Boolean).join(', ');
  const costPerHr = totalHours > 0 && game.price > 0 ? (game.price / totalHours).toFixed(2) : 'N/A';

  const prompt = `You are an insightful, sharp gaming companion. Analyze this specific game in the context of the player's full library.

=== THE GAME ===
Name: ${game.name} | Genre: ${game.genre || 'Unknown'} | Platform: ${game.platform || 'Unknown'} | Franchise: ${game.franchise || 'None'}
Status: ${game.status} | Hours: ${totalHours}h | Sessions: ${game.playLogs?.length || 0} | Rating: ${game.rating}/10
Price: $${game.price} | Cost/hr: $${costPerHr}
Purchased: ${game.datePurchased || '?'} | Started: ${game.startDate || '?'} | Completed: ${game.endDate || 'N/A'}

=== LIBRARY CONTEXT ===
Total owned games: ${ownedGames.length}
Top rated: ${topRated.join(', ')}
Most played: ${topPlayed.join(', ')}
Genre breakdown: ${genreContext || 'No genre data'}

=== MILESTONE SPEED ===
${milestoneContext}

=== UNIQUENESS STATEMENTS (computed from data) ===
${uniquenessStatements.slice(0, 6).join('\n') || 'None computed'}

=== EXCLUDE THESE (already in library) ===
${excludeNames.slice(0, 200)}

Generate EXACTLY 5 outputs separated by "|||". No extra text, no numbering.

OUTPUT 1 — NARRATIVE SENTENCE (max 18 words):
One cinematic sentence capturing this game's story in this player's life. Be specific with real numbers. Don't start with "You". Make it feel like a movie trailer line.

OUTPUT 2 — UNIQUENESS INSIGHT (max 22 words):
Take the most striking uniqueness statement above and rephrase it as a revelation. Make it feel like something the player would want to screenshot. Use specific facts.

OUTPUT 3 — TASTE INSIGHT (max 45 words):
What does playing/rating this game reveal about this player's deeper gaming identity? Be analytically sharp. Reference patterns from their library. Don't be generic. E.g.: "You're drawn to systems that reward patience — every game you've rated 8+ here shares that thread."

OUTPUT 4 — SIMILAR GAMES (exactly 3 games NOT in the exclude list):
Format: GameName|Genre|Why (max 12 words per line). 3 lines total. Base suggestions on what the player loves about this game AND their wider taste profile.

OUTPUT 5 — MILESTONE NARRATIVE (max 28 words):
If milestone data exists, write something specific and interesting about how fast or slow they hit milestones here vs their library. If no data, comment on their play pattern for this game.`;

  const fallback: GameInsightPack = {
    narrativeSentence: '',
    uniquenessInsight: uniquenessStatements[0] || '',
    tasteInsight: '',
    similarGames: [],
    milestoneNarrative: '',
  };

  try {
    const model = getAIModel();
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const parts = text.split('|||').map((s: string) => s.trim());

    if (parts.length < 4) return fallback;

    const similarGames: SimilarGameSuggestion[] = (parts[3] || '')
      .split('\n')
      .filter(Boolean)
      .slice(0, 3)
      .map(line => {
        const [name, genre, reason] = line.split('|').map(s => s.trim());
        return name && reason ? { name, genre: genre || 'Unknown', reason } : null;
      })
      .filter((x): x is SimilarGameSuggestion => x !== null);

    const pack: GameInsightPack = {
      narrativeSentence: parts[0] || '',
      uniquenessInsight: parts[1] || uniquenessStatements[0] || '',
      tasteInsight: parts[2] || '',
      similarGames,
      milestoneNarrative: parts[4] || '',
    };

    const existing = cached || {};
    existing[cacheKey] = pack;
    setCache(GAME_INSIGHT_CACHE, existing);

    return pack;
  } catch (error) {
    console.error('AI game insight pack error:', error);
    return fallback;
  }
}

// ─── Story So Far — chronicle stretch blurbs ─────────────────────────────────

const CHRONICLE_BLURBS_CACHE = 'chronicle-blurbs-cache-v1';

export interface ChronicleStretchInput {
  key: string;       // stable id for this stretch
  name: string;
  genre?: string;
  hours: number;
  days: number;      // distinct days active
  sessions: number;
  cadenceLabel: string;
  isReturn: boolean;
  rating: number;
  completed: boolean;
  startLabel: string; // e.g. "May 3"
}

/**
 * Generate one short, specific blurb per play stretch in a single batched AI
 * call. Returns a map of stretch key → blurb. Cached per range key. Stretches
 * not covered by the AI response simply won't appear in the map (caller falls
 * back to the template blurb).
 */
export async function generateChronicleBlurbs(
  rangeKey: string,
  stretches: ChronicleStretchInput[]
): Promise<Record<string, string>> {
  const cacheAll = getCache<Record<string, Record<string, string>>>(CHRONICLE_BLURBS_CACHE) || {};
  const cached = cacheAll[rangeKey];
  if (cached && stretches.every(s => cached[s.key])) {
    return cached;
  }

  if (stretches.length === 0) return {};

  // Cap to keep the prompt sane; chronicle UI shows newest-relevant first anyway.
  const capped = stretches.slice(0, 40);

  const lines = capped.map((s, i) => {
    const bits = [
      `${s.hours % 1 === 0 ? s.hours : s.hours.toFixed(1)}h`,
      `${s.days} day${s.days > 1 ? 's' : ''}`,
      `${s.sessions} session${s.sessions > 1 ? 's' : ''}`,
    ];
    if (s.genre) bits.push(s.genre);
    if (s.cadenceLabel) bits.push(s.cadenceLabel);
    if (s.isReturn) bits.push('a comeback');
    if (s.completed) bits.push('COMPLETED here');
    bits.push(`rated ${s.rating}/10`);
    return `${i + 1}. ${s.name} (started ${s.startLabel}): ${bits.join(', ')}`;
  }).join('\n');

  const prompt = `You are narrating a gamer's "story so far" — a chronological scroll of what they played and for how long. For EACH play stretch below, write ONE short blurb (max 14 words) that captures the feel of that chapter. Be specific with the numbers, warm, and a little cinematic. Don't start every line with "You". No quotes.

${lines}

Return exactly ${capped.length} lines, each in the format "N: blurb" (N is the number above). Nothing else.`;

  try {
    const model = getAIModel();
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const map: Record<string, string> = {};

    text.split('\n').forEach(line => {
      const match = line.match(/^\s*(\d+)[:.)]\s*(.+)$/);
      if (match) {
        const idx = parseInt(match[1], 10) - 1;
        if (idx >= 0 && idx < capped.length) {
          map[capped[idx].key] = match[2].trim().replace(/^["']|["']$/g, '');
        }
      }
    });

    cacheAll[rangeKey] = { ...(cacheAll[rangeKey] || {}), ...map };
    setCache(CHRONICLE_BLURBS_CACHE, cacheAll);
    return map;
  } catch (error) {
    console.error('AI chronicle blurbs error:', error);
    return {};
  }
}

/**
 * Clear all game AI caches
 */
export function clearGameAICache(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(GAME_INSIGHT_CACHE);
  localStorage.removeItem(GAME_ONELINER_CACHE);
  localStorage.removeItem(MONTHLY_RECAP_CACHE);
  localStorage.removeItem(CHAPTER_TITLES_CACHE);
  localStorage.removeItem(MONTH_CHAPTER_TITLES_CACHE);
  localStorage.removeItem(WEEK_TITLES_CACHE);
  localStorage.removeItem(CHRONICLE_BLURBS_CACHE);
}

// ─── Quarter blurbs ──────────────────────────────────────────────────────────

export type { AIBlurbResult } from './ai-service';
export type QuarterAIBlurbType = 'quarter-opening' | 'quarter-closing' | 'quarter-hot-take';
export type YearAIBlurbType = 'year-opening' | 'year-closing' | 'year-hot-take';

export async function generateQuarterBlurbs(
  quarterLabel: string,
  topGame: string | null,
  totalHours: number,
  topGenre: string | null,
  completions: number,
): Promise<Partial<Record<QuarterAIBlurbType, AIBlurbResult>>> {
  const cacheKey = `quarter-blurbs-${quarterLabel}`;
  const cached = getCache<Partial<Record<QuarterAIBlurbType, AIBlurbResult>>>(cacheKey);
  if (cached) return cached;

  const context = `Quarter: ${quarterLabel}. Top game: ${topGame || 'none'}. Hours: ${totalHours.toFixed(0)}h. Top genre: ${topGenre || 'mixed'}. Completions: ${completions}.`;

  const fallbacks: Partial<Record<QuarterAIBlurbType, AIBlurbResult>> = {
    'quarter-opening': { text: `${quarterLabel} — a quarter of ${topGenre ? topGenre + ' adventures' : 'gaming adventures'}. ${totalHours.toFixed(0)} hours lived.`, isFallback: true },
    'quarter-closing': { text: `${quarterLabel} is sealed. ${completions > 0 ? `${completions} game${completions > 1 ? 's' : ''} conquered.` : 'Next quarter awaits.'} The journey continues.`, isFallback: true },
    'quarter-hot-take': { text: topGame ? `${topGame} was the heartbeat of ${quarterLabel}.` : `${quarterLabel}: ${totalHours.toFixed(0)} hours you'll never regret.`, isFallback: true },
  };

  try {
    const model = getAIModel();
    const prompt = `Gaming quarter recap. ${context}\n\nGenerate 3 short texts separated by "|||":\n1. Opening (1 sentence, poetic, about what the quarter meant)\n2. Closing (1 sentence, reflective, closing chapter)\n3. Hot take (1 bold provocative sentence about the quarter)\n\nBe specific, use the data. No generic phrases.`;
    const genResult = await model.generateContent(prompt);
    const text = genResult.response.text();
    const parts = text.split('|||').map((s: string) => s.trim());
    const result: Partial<Record<QuarterAIBlurbType, AIBlurbResult>> = {
      'quarter-opening': { text: parts[0] || fallbacks['quarter-opening']!.text, isFallback: false },
      'quarter-closing': { text: parts[1] || fallbacks['quarter-closing']!.text, isFallback: false },
      'quarter-hot-take': { text: parts[2] || fallbacks['quarter-hot-take']!.text, isFallback: false },
    };
    setCache(cacheKey, result);
    return result;
  } catch {
    setCache(cacheKey, fallbacks);
    return fallbacks;
  }
}

export async function generateYearBlurbs(
  year: number,
  topGame: string | null,
  totalHours: number,
  topGenre: string | null,
  completions: number,
  totalSpent: number,
): Promise<Partial<Record<YearAIBlurbType, AIBlurbResult>>> {
  const cacheKey = `year-blurbs-${year}`;
  const cached = getCache<Partial<Record<YearAIBlurbType, AIBlurbResult>>>(cacheKey);
  if (cached) return cached;

  const context = `Year: ${year}. Top game: ${topGame || 'none'}. Total hours: ${totalHours.toFixed(0)}h. Top genre: ${topGenre || 'varied'}. Completions: ${completions}. Total spent: $${totalSpent.toFixed(0)}.`;

  const fallbacks: Partial<Record<YearAIBlurbType, AIBlurbResult>> = {
    'year-opening': { text: `${year} — ${totalHours.toFixed(0)} hours of gaming history, sealed and delivered.`, isFallback: true },
    'year-closing': { text: `${year} is done. ${completions} games completed, ${totalHours.toFixed(0)} hours lived. ${year + 1} is yours.`, isFallback: true },
    'year-hot-take': { text: topGame ? `${topGame} was the defining game of ${year} — and it wasn't close.` : `${year}: ${totalHours.toFixed(0)} hours that defined who you are as a gamer.`, isFallback: true },
  };

  try {
    const model = getAIModel();
    const prompt = `Gaming year-end recap. ${context}\n\nGenerate 3 texts separated by "|||":\n1. Grand opening reflection (2 sentences, epic and cinematic, about what the gaming year meant)\n2. Closing letter to the year (2 sentences, retrospective, welcoming next year)\n3. Hot take (1 absolutely bold sentence that captures the year's essence)\n\nBe specific and emotionally resonant. Use the data.`;
    const genResult = await model.generateContent(prompt);
    const text = genResult.response.text();
    const parts = text.split('|||').map((s: string) => s.trim());
    const result: Partial<Record<YearAIBlurbType, AIBlurbResult>> = {
      'year-opening': { text: parts[0] || fallbacks['year-opening']!.text, isFallback: false },
      'year-closing': { text: parts[1] || fallbacks['year-closing']!.text, isFallback: false },
      'year-hot-take': { text: parts[2] || fallbacks['year-hot-take']!.text, isFallback: false },
    };
    setCache(cacheKey, result);
    return result;
  } catch {
    setCache(cacheKey, fallbacks);
    return fallbacks;
  }
}
