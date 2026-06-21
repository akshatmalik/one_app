/**
 * Achievement Hunter — fetches per-game Steam achievement progress through
 * the existing server-side proxy at /apps/game-analytics/api/steam, using the
 * appid map `SteamSyncModal` already persists into `SteamSyncSettings`.
 *
 * Caches per (steamId, appid) in localStorage with a 12h TTL, same pattern as
 * `rawg-api.ts`'s thumbnail cache — achievements don't change often, and this
 * avoids re-hitting three Steam endpoints per game on every modal open.
 */

export interface SteamAchievement {
  apiName: string;
  displayName: string;
  description: string;
  icon: string;
  iconGray: string;
  achieved: boolean;
  unlockTime: number;
  globalPercent: number | null;
}

export interface GameAchievementSummary {
  appId: number;
  gameName: string;
  hasStats: boolean;
  achievements: SteamAchievement[];
  unlocked: number;
  total: number;
  error?: string;
}

interface CachedEntry {
  cachedAt: number;
  summary: GameAchievementSummary;
}

const CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const cacheKey = (steamId: string, appId: number) => `ga-steam-achv-${steamId}-${appId}`;

function readCache(steamId: string, appId: number): GameAchievementSummary | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(cacheKey(steamId, appId));
    if (!raw) return null;
    const entry: CachedEntry = JSON.parse(raw);
    if (Date.now() - entry.cachedAt > CACHE_TTL_MS) return null;
    return entry.summary;
  } catch {
    return null;
  }
}

function writeCache(steamId: string, appId: number, summary: GameAchievementSummary): void {
  if (typeof window === 'undefined') return;
  try {
    const entry: CachedEntry = { cachedAt: Date.now(), summary };
    localStorage.setItem(cacheKey(steamId, appId), JSON.stringify(entry));
  } catch {
    /* ignore quota / disabled storage */
  }
}

export async function fetchGameAchievements(
  steamId: string,
  apiKey: string,
  appId: number,
  gameName: string,
  opts: { skipCache?: boolean } = {}
): Promise<GameAchievementSummary> {
  if (!opts.skipCache) {
    const cached = readCache(steamId, appId);
    if (cached) return cached;
  }

  try {
    const params = new URLSearchParams({ mode: 'achievements', steamId, key: apiKey, appid: String(appId) });
    const res = await fetch(`/apps/game-analytics/api/steam?${params.toString()}`);
    const data = await res.json();

    if (!data || !data.success) {
      return { appId, gameName, hasStats: false, achievements: [], unlocked: 0, total: 0, error: data?.error || 'Lookup failed' };
    }

    const summary: GameAchievementSummary = {
      appId,
      gameName,
      hasStats: !!data.hasStats,
      achievements: Array.isArray(data.achievements) ? data.achievements : [],
      unlocked: data.unlocked || 0,
      total: data.total || 0,
    };
    writeCache(steamId, appId, summary);
    return summary;
  } catch {
    return { appId, gameName, hasStats: false, achievements: [], unlocked: 0, total: 0, error: 'Network error' };
  }
}

/**
 * Sequentially fetches achievements for a list of (appId, gameName) pairs,
 * throttled like the RAWG thumbnail fetcher to stay polite to Steam's API,
 * reporting progress as each game resolves.
 */
export async function fetchAllAchievements(
  steamId: string,
  apiKey: string,
  targets: { appId: number; gameName: string }[],
  onProgress?: (done: number, total: number, latest: GameAchievementSummary) => void
): Promise<GameAchievementSummary[]> {
  const results: GameAchievementSummary[] = [];
  for (let i = 0; i < targets.length; i++) {
    const { appId, gameName } = targets[i];
    const summary = await fetchGameAchievements(steamId, apiKey, appId, gameName);
    results.push(summary);
    onProgress?.(i + 1, targets.length, summary);
    if (i < targets.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }
  return results;
}
