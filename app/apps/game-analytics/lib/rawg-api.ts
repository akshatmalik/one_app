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
