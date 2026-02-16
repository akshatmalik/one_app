/**
 * RAWG API Integration
 * Fetches game data including thumbnails from the RAWG Video Game Database
 * API Docs: https://api.rawg.io/docs/
 */

const RAWG_API_KEY = 'c0fbd2ba77b94fc7b5e0e0b2f029814e';
const RAWG_API_BASE = 'https://api.rawg.io/api';
const CACHE_PREFIX = 'rawg_cache_';
const CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface RAWGGameData {
  id: number;
  name: string;
  backgroundImage: string | null;
  rating: number;
  released: string;
  metacritic: number | null;
}

interface RAWGSearchResponse {
  count: number;
  results: Array<{
    id: number;
    name: string;
    background_image: string | null;
    rating: number;
    released: string;
    metacritic: number | null;
  }>;
}

interface CachedData {
  data: RAWGGameData | null;
  timestamp: number;
}

/**
 * Check if cached data is still valid
 */
function isCacheValid(cached: CachedData | null): boolean {
  if (!cached) return false;
  const age = Date.now() - cached.timestamp;
  return age < CACHE_EXPIRY;
}

/**
 * Get cached game data from localStorage
 */
function getFromCache(gameName: string): RAWGGameData | null {
  if (typeof window === 'undefined') return null;

  try {
    const cacheKey = `${CACHE_PREFIX}${gameName.toLowerCase().trim()}`;
    const cached = localStorage.getItem(cacheKey);
    if (!cached) return null;

    const parsedCache: CachedData = JSON.parse(cached);
    if (isCacheValid(parsedCache)) {
      return parsedCache.data;
    }

    // Clean up expired cache
    localStorage.removeItem(cacheKey);
    return null;
  } catch (e) {
    console.error('Error reading RAWG cache:', e);
    return null;
  }
}

/**
 * Save game data to localStorage cache
 */
function saveToCache(gameName: string, data: RAWGGameData | null): void {
  if (typeof window === 'undefined') return;

  try {
    const cacheKey = `${CACHE_PREFIX}${gameName.toLowerCase().trim()}`;
    const cacheData: CachedData = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(cacheKey, JSON.stringify(cacheData));
  } catch (e) {
    console.error('Error saving RAWG cache:', e);
    // If localStorage is full, try to clear old RAWG caches
    clearOldCaches();
  }
}

/**
 * Clear expired RAWG caches from localStorage
 */
function clearOldCaches(): void {
  if (typeof window === 'undefined') return;

  try {
    const now = Date.now();
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX)) {
        const cached = localStorage.getItem(key);
        if (cached) {
          try {
            const parsedCache: CachedData = JSON.parse(cached);
            if (now - parsedCache.timestamp >= CACHE_EXPIRY) {
              keysToRemove.push(key);
            }
          } catch {
            keysToRemove.push(key); // Remove corrupted cache
          }
        }
      }
    }

    keysToRemove.forEach(key => localStorage.removeItem(key));
  } catch (e) {
    console.error('Error clearing old caches:', e);
  }
}

/**
 * Search for a game on RAWG and return the best match
 */
export async function searchRAWGGame(gameName: string): Promise<RAWGGameData | null> {
  // Check cache first
  const cached = getFromCache(gameName);
  if (cached !== null) {
    return cached;
  }

  try {
    // Clean up the game name for better search results
    const cleanName = gameName
      .replace(/\s*\(.*?\)\s*/g, '') // Remove parentheses and contents
      .replace(/[™®©]/g, '') // Remove trademark symbols
      .replace(/:/g, '') // Remove colons
      .trim();

    const url = `${RAWG_API_BASE}/games?key=${RAWG_API_KEY}&search=${encodeURIComponent(cleanName)}&page_size=5`;

    const response = await fetch(url);
    if (!response.ok) {
      console.error('RAWG API error:', response.status);
      saveToCache(gameName, null); // Cache the failure to avoid repeated requests
      return null;
    }

    const data: RAWGSearchResponse = await response.json();

    if (data.results.length === 0) {
      saveToCache(gameName, null);
      return null;
    }

    // Find the best match (exact name match or first result)
    const bestMatch = data.results.find(game =>
      game.name.toLowerCase() === cleanName.toLowerCase()
    ) || data.results[0];

    const gameData: RAWGGameData = {
      id: bestMatch.id,
      name: bestMatch.name,
      backgroundImage: bestMatch.background_image,
      rating: bestMatch.rating,
      released: bestMatch.released,
      metacritic: bestMatch.metacritic,
    };

    saveToCache(gameName, gameData);
    return gameData;
  } catch (error) {
    console.error('Error fetching from RAWG:', error);
    saveToCache(gameName, null); // Cache failure
    return null;
  }
}

/**
 * Batch fetch game data for multiple games
 */
export async function batchFetchRAWGData(gameNames: string[]): Promise<Map<string, RAWGGameData | null>> {
  const results = new Map<string, RAWGGameData | null>();

  // Process in batches of 5 to avoid overwhelming the API
  const batchSize = 5;
  for (let i = 0; i < gameNames.length; i += batchSize) {
    const batch = gameNames.slice(i, i + batchSize);
    const promises = batch.map(name => searchRAWGGame(name));
    const batchResults = await Promise.all(promises);

    batch.forEach((name, idx) => {
      results.set(name, batchResults[idx]);
    });

    // Add a small delay between batches to be respectful to the API
    if (i + batchSize < gameNames.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  return results;
}

/**
 * Get thumbnail URL for a game (with fallback)
 */
export function getGameThumbnail(gameData: RAWGGameData | null): string | null {
  return gameData?.backgroundImage || null;
}

/**
 * Search RAWG and return multiple results for browsing
 */
export async function searchRAWGGames(query: string, pageSize: number = 10): Promise<RAWGGameData[]> {
  try {
    const cleanName = query
      .replace(/\s*\(.*?\)\s*/g, '')
      .replace(/[™®©]/g, '')
      .replace(/:/g, '')
      .trim();

    const url = `${RAWG_API_BASE}/games?key=${RAWG_API_KEY}&search=${encodeURIComponent(cleanName)}&page_size=${pageSize}`;
    const response = await fetch(url);
    if (!response.ok) return [];

    const data: RAWGSearchResponse = await response.json();
    return data.results.map(r => ({
      id: r.id,
      name: r.name,
      backgroundImage: r.background_image,
      rating: r.rating,
      released: r.released,
      metacritic: r.metacritic,
    }));
  } catch {
    return [];
  }
}

// Map app genre names to RAWG genre slugs
const GENRE_TO_RAWG_SLUG: Record<string, string> = {
  'Action': 'action',
  'Action-Adventure': 'action,adventure',
  'RPG': 'role-playing-games-rpg',
  'JRPG': 'role-playing-games-rpg',
  'Horror': 'action',
  'Platformer': 'platformer',
  'Strategy': 'strategy',
  'Simulation': 'simulation',
  'Sports': 'sports',
  'Racing': 'racing',
  'Puzzle': 'puzzle',
  'Metroidvania': 'platformer',
  'Roguelike': 'indie',
  'Souls-like': 'role-playing-games-rpg',
  'FPS': 'shooter',
  'TPS': 'shooter',
  'MMO': 'massively-multiplayer',
  'Indie': 'indie',
  'Adventure': 'adventure',
};

// Map app platform names to RAWG platform IDs
const PLATFORM_TO_RAWG_ID: Record<string, string> = {
  'PC': '4',
  'PS5': '187',
  'PS4': '18',
  'Xbox Series': '186',
  'Xbox One': '1',
  'Switch': '7',
};

export function getRAWGGenreSlugs(appGenres: string[]): string {
  const slugs = new Set<string>();
  for (const genre of appGenres) {
    const slug = GENRE_TO_RAWG_SLUG[genre];
    if (slug) {
      slug.split(',').forEach(s => slugs.add(s));
    }
  }
  return Array.from(slugs).join(',');
}

export function getRAWGPlatformIds(appPlatform: string): string {
  return PLATFORM_TO_RAWG_ID[appPlatform] || '';
}

export interface BrowseOptions {
  genres?: string;        // RAWG genre slugs comma-separated
  platforms?: string;     // RAWG platform IDs comma-separated
  dates?: string;         // Date range e.g. "2026-01-01,2026-12-31"
  ordering?: string;      // e.g. "-metacritic", "-rating", "-released"
  metacritic?: string;    // e.g. "75,100"
  pageSize?: number;
}

/**
 * Browse RAWG games with filters (for discovery)
 */
export async function browseRAWGGames(options: BrowseOptions): Promise<RAWGGameData[]> {
  try {
    const params = new URLSearchParams({
      key: RAWG_API_KEY,
      page_size: (options.pageSize || 15).toString(),
    });

    if (options.genres) params.set('genres', options.genres);
    if (options.platforms) params.set('platforms', options.platforms);
    if (options.dates) params.set('dates', options.dates);
    if (options.ordering) params.set('ordering', options.ordering);
    if (options.metacritic) params.set('metacritic', options.metacritic);

    const url = `${RAWG_API_BASE}/games?${params.toString()}`;
    const response = await fetch(url);
    if (!response.ok) return [];

    const data: RAWGSearchResponse = await response.json();
    return data.results.map(r => ({
      id: r.id,
      name: r.name,
      backgroundImage: r.background_image,
      rating: r.rating,
      released: r.released,
      metacritic: r.metacritic,
    }));
  } catch {
    return [];
  }
}

// ── Upcoming & Released Game Discovery ──────────────────────────────────────

const UPCOMING_CACHE_PREFIX = 'rawg_upcoming_';
const UPCOMING_CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

interface UpcomingCacheData {
  games: RAWGGameData[];
  timestamp: number;
}

function getUpcomingFromCache(key: string): RAWGGameData[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const cached = localStorage.getItem(`${UPCOMING_CACHE_PREFIX}${key}`);
    if (!cached) return null;
    const parsed: UpcomingCacheData = JSON.parse(cached);
    if (Date.now() - parsed.timestamp < UPCOMING_CACHE_EXPIRY) {
      return parsed.games;
    }
    localStorage.removeItem(`${UPCOMING_CACHE_PREFIX}${key}`);
    return null;
  } catch {
    return null;
  }
}

function saveUpcomingToCache(key: string, games: RAWGGameData[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${UPCOMING_CACHE_PREFIX}${key}`, JSON.stringify({
      games,
      timestamp: Date.now(),
    }));
  } catch {
    // localStorage full — ignore
  }
}

export interface UpcomingFilters {
  genres: string[];     // App genre names (mapped to RAWG slugs internally)
  platforms: string[];  // App platform names (mapped to RAWG IDs internally)
}

/**
 * Fetch upcoming/unreleased games filtered by user's taste profile.
 * Returns games in three time windows: this-month, next-few-months, later.
 */
export async function getUpcomingGames(
  filters: UpcomingFilters,
  ownedGameNames: string[]
): Promise<{ thisMonth: RAWGGameData[]; nextFewMonths: RAWGGameData[]; later: RAWGGameData[] }> {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  // Time windows
  const oneMonthOut = new Date(today);
  oneMonthOut.setMonth(oneMonthOut.getMonth() + 1);
  const oneMonthStr = oneMonthOut.toISOString().slice(0, 10);

  const threeMonthsOut = new Date(today);
  threeMonthsOut.setMonth(threeMonthsOut.getMonth() + 3);
  const threeMonthsStr = threeMonthsOut.toISOString().slice(0, 10);

  const oneYearOut = new Date(today);
  oneYearOut.setFullYear(oneYearOut.getFullYear() + 1);
  const oneYearStr = oneYearOut.toISOString().slice(0, 10);

  const genreSlugs = getRAWGGenreSlugs(filters.genres);
  const platformIds = filters.platforms
    .map(p => PLATFORM_TO_RAWG_ID[p])
    .filter(Boolean)
    .join(',');

  const ownedLower = new Set(ownedGameNames.map(n => n.toLowerCase()));

  const fetchWindow = async (dateRange: string, cacheKey: string): Promise<RAWGGameData[]> => {
    const cached = getUpcomingFromCache(cacheKey);
    if (cached) return cached.filter(g => !ownedLower.has(g.name.toLowerCase()));

    const options: BrowseOptions = {
      dates: dateRange,
      ordering: '-added', // Most anticipated first
      pageSize: 20,
    };
    if (genreSlugs) options.genres = genreSlugs;
    if (platformIds) options.platforms = platformIds;

    const results = await browseRAWGGames(options);
    saveUpcomingToCache(cacheKey, results);
    return results.filter(g => !ownedLower.has(g.name.toLowerCase()));
  };

  // Fetch all three windows (in sequence to respect rate limits)
  const thisMonth = await fetchWindow(
    `${todayStr},${oneMonthStr}`,
    `this-month-${genreSlugs}-${platformIds}`
  );

  await new Promise(resolve => setTimeout(resolve, 200));

  const nextFewMonths = await fetchWindow(
    `${oneMonthStr},${threeMonthsStr}`,
    `next-months-${genreSlugs}-${platformIds}`
  );

  await new Promise(resolve => setTimeout(resolve, 200));

  const later = await fetchWindow(
    `${threeMonthsStr},${oneYearStr}`,
    `later-${genreSlugs}-${platformIds}`
  );

  return { thisMonth, nextFewMonths, later };
}

/**
 * Fetch released games for recommendation categories.
 * Returns high-quality released games in user's preferred genres (excluding owned).
 */
export async function getReleasedRecommendations(
  filters: UpcomingFilters,
  ownedGameNames: string[],
  stretchGenre?: string
): Promise<RAWGGameData[]> {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const fiveYearsAgo = new Date(today);
  fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
  const fiveYearsStr = fiveYearsAgo.toISOString().slice(0, 10);

  const allGenres = [...filters.genres];
  if (stretchGenre && !allGenres.includes(stretchGenre)) {
    allGenres.push(stretchGenre);
  }

  const genreSlugs = getRAWGGenreSlugs(allGenres);
  const platformIds = filters.platforms
    .map(p => PLATFORM_TO_RAWG_ID[p])
    .filter(Boolean)
    .join(',');

  const ownedLower = new Set(ownedGameNames.map(n => n.toLowerCase()));

  const cacheKey = `released-${genreSlugs}-${platformIds}`;
  const cached = getUpcomingFromCache(cacheKey);
  if (cached) return cached.filter(g => !ownedLower.has(g.name.toLowerCase()));

  const options: BrowseOptions = {
    dates: `${fiveYearsStr},${todayStr}`,
    metacritic: '70,100',
    ordering: '-metacritic',
    pageSize: 30,
  };
  if (genreSlugs) options.genres = genreSlugs;
  if (platformIds) options.platforms = platformIds;

  const results = await browseRAWGGames(options);
  saveUpcomingToCache(cacheKey, results);
  return results.filter(g => !ownedLower.has(g.name.toLowerCase()));
}

/**
 * Clear all RAWG caches (useful for debugging or forcing refresh)
 */
export function clearAllRAWGCaches(): void {
  if (typeof window === 'undefined') return;

  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    console.log(`Cleared ${keysToRemove.length} RAWG caches`);
  } catch (e) {
    console.error('Error clearing RAWG caches:', e);
  }
}
