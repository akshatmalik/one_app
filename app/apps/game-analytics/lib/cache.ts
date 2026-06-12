/**
 * Shared TTL localStorage cache.
 *
 * One implementation for the app's many "cache an AI/API result for a while"
 * needs (AI blurbs, recaps, chapter titles, RAWG lookups). SSR-safe and
 * fail-soft. Stored shape is { timestamp, data } so callers can read it back
 * with a different TTL without invalidating existing entries.
 */

interface CacheEntry<T> {
  timestamp: number;
  data: T;
}

/** Read a cached value, or null if missing/expired/corrupt. */
export function getCache<T>(key: string, ttlMs: number): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    if (Date.now() - entry.timestamp > ttlMs) return null;
    return entry.data;
  } catch {
    return null;
  }
}

/** Write a value with the current timestamp. */
export function setCache<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify({ timestamp: Date.now(), data }));
  } catch {
    // ignore quota / serialization errors
  }
}

/** Remove a cached entry. */
export function clearCache(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}
