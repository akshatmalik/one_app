'use client';

/**
 * Steam library sync settings + state.
 *
 * Stored in localStorage only (per user), SSR-safe. The Steam API key is
 * user-provided and device-local by design — like the Timeline Estimator and
 * PS Plus sync settings, this is config/credentials, not core game data, so it
 * deliberately skips the Hybrid/Firebase repository. The key is never sent
 * anywhere except our own same-origin API route, which forwards it to Steam
 * per-request and does not persist it server-side.
 */

export interface SteamSyncSettings {
  steamId: string;          // SteamID64 or vanity name, as entered by the user
  apiKey: string;
  lastSyncedAt: string | null;     // ISO timestamp of the last successful fetch
  importedAppIds: number[];        // Steam appids already imported, to power "new since last sync"
}

export const DEFAULT_STEAM_SYNC_SETTINGS: SteamSyncSettings = {
  steamId: '',
  apiKey: '',
  lastSyncedAt: null,
  importedAppIds: [],
};

const keyFor = (userId: string) => `ga-steam-sync-${userId || 'local-user'}`;

export function loadSteamSyncSettings(userId: string): SteamSyncSettings {
  if (typeof window === 'undefined') return { ...DEFAULT_STEAM_SYNC_SETTINGS };
  try {
    const raw = localStorage.getItem(keyFor(userId));
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SteamSyncSettings>;
      return {
        steamId: parsed.steamId || '',
        apiKey: parsed.apiKey || '',
        lastSyncedAt: parsed.lastSyncedAt ?? null,
        importedAppIds: Array.isArray(parsed.importedAppIds) ? parsed.importedAppIds : [],
      };
    }
  } catch {
    /* fall through to defaults */
  }
  return { ...DEFAULT_STEAM_SYNC_SETTINGS };
}

export function saveSteamSyncSettings(userId: string, settings: SteamSyncSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(keyFor(userId), JSON.stringify(settings));
  } catch {
    /* ignore quota / disabled storage */
  }
}

export function clearSteamSyncSettings(userId: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(keyFor(userId));
  } catch {
    /* ignore */
  }
}
