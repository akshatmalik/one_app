import { Game } from './types';
import { ImportRow, ImportedGameData } from './import-service';

/**
 * Steam library sync — fetches owned games via the server-side proxy at
 * /apps/game-analytics/api/steam and maps them into the same `ImportRow`
 * shape the CSV/JSON importer already uses, so the preview/dedupe/checkbox
 * UI conventions stay identical across both import paths.
 */

export interface SteamOwnedGame {
  appId: number;
  name: string;
  playtimeForeverMinutes: number;
  headerImageUrl: string;
}

export type SteamFetchResult =
  | { success: true; profileName: string | null; games: SteamOwnedGame[] }
  | { success: false; error: string };

export async function fetchSteamLibrary(steamId: string, apiKey: string): Promise<SteamFetchResult> {
  try {
    const params = new URLSearchParams({ steamId, key: apiKey });
    const res = await fetch(`/apps/game-analytics/api/steam?${params.toString()}`);
    const data = await res.json();
    if (data && data.success) {
      return { success: true, profileName: data.profileName ?? null, games: data.games ?? [] };
    }
    return { success: false, error: (data && data.error) || 'Steam sync failed for an unknown reason.' };
  } catch {
    return { success: false, error: 'Could not reach the sync service. Check your connection and try again.' };
  }
}

/** Steam reports playtime in minutes — round to the nearest tenth of an hour. */
export function minutesToHours(minutes: number): number {
  return Math.round((minutes / 60) * 10) / 10;
}

/**
 * Maps Steam's owned-games list into `ImportRow`s, in the same shape/contract
 * `parseImportContent` produces for CSV/JSON. Rows for games already in the
 * library are flagged as duplicates and unchecked by default, same as the
 * file importer. Rows for appids already recorded in `importedAppIds` (from a
 * prior sync) are also unchecked, so re-syncing surfaces new purchases
 * without re-offering ones already brought in.
 */
export function mapSteamGamesToImportRows(
  steamGames: SteamOwnedGame[],
  existingGames: Game[],
  importedAppIds: number[] = []
): ImportRow[] {
  const existingNames = new Set(existingGames.map(g => g.name.toLowerCase()));
  const importedSet = new Set(importedAppIds);

  return steamGames.map((sg, idx): ImportRow => {
    const nameLower = sg.name.toLowerCase();
    const isDuplicate = existingNames.has(nameLower) || importedSet.has(sg.appId);
    const hours = minutesToHours(sg.playtimeForeverMinutes);

    const data: ImportedGameData = {
      name: sg.name,
      status: hours > 0 ? 'In Progress' : 'Not Started',
      price: 0,
      hours,
      rating: 0,
      platform: 'Steam',
      purchaseSource: 'Steam',
      thumbnail: sg.headerImageUrl,
      notes: 'Imported from Steam library sync — price unknown, edit to add what you paid.',
    };

    return {
      rowIndex: idx,
      data,
      warnings: [],
      isDuplicate,
      include: !isDuplicate,
    };
  });
}
