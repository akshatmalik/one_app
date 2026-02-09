'use client';

import { getAI, getGenerativeModel, GoogleAIBackend } from 'firebase/ai';
import { initializeApp, getApps } from 'firebase/app';
import { Game } from './types';

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

// Cache keys
const GAME_ONELINER_CACHE = 'game-oneliners-cache';
const MONTHLY_RECAP_CACHE = 'monthly-recap-cache';
const CHAPTER_TITLES_CACHE = 'chapter-titles-cache';
const MONTH_CHAPTER_TITLES_CACHE = 'month-chapter-titles-cache';
const WEEK_TITLES_CACHE = 'week-titles-cache';
const CACHE_TTL = 1000 * 60 * 60 * 4; // 4 hours

interface CacheEntry<T> {
  timestamp: number;
  data: T;
}

function getCache<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    if (Date.now() - entry.timestamp > CACHE_TTL) return null;
    return entry.data;
  } catch {
    return null;
  }
}

function setCache<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify({ timestamp: Date.now(), data }));
  } catch {
    // ignore
  }
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

/**
 * Clear all game AI caches
 */
export function clearGameAICache(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(GAME_ONELINER_CACHE);
  localStorage.removeItem(MONTHLY_RECAP_CACHE);
  localStorage.removeItem(CHAPTER_TITLES_CACHE);
  localStorage.removeItem(MONTH_CHAPTER_TITLES_CACHE);
  localStorage.removeItem(WEEK_TITLES_CACHE);
}
