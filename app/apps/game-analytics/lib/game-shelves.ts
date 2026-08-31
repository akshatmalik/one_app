'use client';

import { Game, GameStatus, SubscriptionSource } from './types';
import { getEffectiveLoveLevel } from './love';

export interface GameShelfRule {
  platforms?: string[];
  statuses?: GameStatus[];
  genres?: string[];
  subscriptionSource?: SubscriptionSource;
  maxExpectedHours?: number;
  minRating?: number;
  minLoveLevel?: number;
}

export interface GameShelf {
  id: string;
  name: string;
  description: string;
  mode: 'static' | 'smart';
  gameIds: string[];
  rules?: GameShelfRule;
  createdAt: string;
  updatedAt: string;
  isSystem?: boolean;
}

const keyFor = (userId: string) => `ga-game-shelves-${userId || 'local-user'}`;

export function loadGameShelves(userId: string): GameShelf[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(keyFor(userId)) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveGameShelves(userId: string, shelves: GameShelf[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(keyFor(userId), JSON.stringify(shelves));
  } catch {
    // Shelves are device-local organization; core library data remains intact.
  }
}

function commonValue(values: Array<string | undefined>): string | undefined {
  const normalized = values.filter((value): value is string => !!value);
  if (normalized.length === 0 || normalized.length !== values.length) return undefined;
  return normalized.every(value => value === normalized[0]) ? normalized[0] : undefined;
}

export function inferShelfFromSelection(selected: Game[]): {
  name: string;
  description: string;
  rules?: GameShelfRule;
} {
  const platform = commonValue(selected.map(game => game.platform));
  const genre = commonValue(selected.map(game => game.genre));
  const status = commonValue(selected.map(game => game.status)) as GameStatus | undefined;
  const allPsPlus = selected.length > 0 && selected.every(game => game.acquiredFree && game.subscriptionSource === 'PS Plus');
  const allShort = selected.length > 0 && selected.every(game => (game.expectedHours ?? Infinity) <= 15);
  const allLoved = selected.length > 0 && selected.every(game => (getEffectiveLoveLevel(game) ?? 0) >= 3);

  if (allLoved) {
    return {
      name: 'Games I Love',
      description: 'Personal favorites that meant more than their score.',
      rules: { minLoveLevel: 3 },
    };
  }
  if (allPsPlus) {
    return {
      name: 'PS Plus Picks',
      description: 'Games selected from your claimed PlayStation Plus collection.',
      rules: { subscriptionSource: 'PS Plus' },
    };
  }
  if (status === 'In Progress') {
    return {
      name: 'My Current Rotation',
      description: 'The games currently carrying your PlayStation story.',
      rules: { statuses: ['In Progress'] },
    };
  }
  if (allShort) {
    return {
      name: 'My Short PlayStation Stories',
      description: 'Focused games estimated at fifteen hours or less.',
      rules: { maxExpectedHours: 15, ...(platform ? { platforms: [platform] } : {}) },
    };
  }
  if (genre) {
    return {
      name: `${genre} Shelf`,
      description: `A living shelf built from your selected ${genre.toLowerCase()} games.`,
      rules: { genres: [genre], ...(platform ? { platforms: [platform] } : {}) },
    };
  }
  if (platform) {
    return {
      name: `${platform} Picks`,
      description: `A shelf built from your selected ${platform} games.`,
      rules: { platforms: [platform] },
    };
  }
  return {
    name: 'My Shelf',
    description: 'A hand-picked collection from your library.',
  };
}

export function getShelfGames(shelf: GameShelf, games: Game[]): Game[] {
  if (shelf.mode === 'static' || !shelf.rules) {
    const ids = new Set(shelf.gameIds);
    return games.filter(game => ids.has(game.id));
  }

  const { rules } = shelf;
  return games.filter(game => {
    if (rules.platforms?.length && (!game.platform || !rules.platforms.includes(game.platform))) return false;
    if (rules.statuses?.length && !rules.statuses.includes(game.status)) return false;
    if (rules.genres?.length && (!game.genre || !rules.genres.includes(game.genre))) return false;
    if (rules.subscriptionSource && game.subscriptionSource !== rules.subscriptionSource) return false;
    if (rules.maxExpectedHours !== undefined && (game.expectedHours ?? Infinity) > rules.maxExpectedHours) return false;
    if (rules.minRating !== undefined && (game.rating || 0) < rules.minRating) return false;
    if (rules.minLoveLevel !== undefined && (getEffectiveLoveLevel(game) ?? 0) < rules.minLoveLevel) return false;
    return true;
  });
}

export function getAutomaticGameShelves(games: Game[]): GameShelf[] {
  const now = new Date().toISOString();
  const definitions: Array<Omit<GameShelf, 'createdAt' | 'updatedAt'>> = [
    {
      id: 'system-current-rotation',
      name: 'Current Rotation',
      description: 'The games you are actively carrying forward.',
      mode: 'smart', gameIds: [], rules: { statuses: ['In Progress'] }, isSystem: true,
    },
    {
      id: 'system-ps-plus-unplayed',
      name: 'Claimed, Not Yet Played',
      description: 'PS Plus games waiting for their first chapter.',
      mode: 'smart', gameIds: [], rules: { statuses: ['Not Started'], subscriptionSource: 'PS Plus' }, isSystem: true,
    },
    {
      id: 'system-short-ps5',
      name: 'Short PS5 Stories',
      description: 'Focused PlayStation games estimated at fifteen hours or less.',
      mode: 'smart', gameIds: [], rules: { platforms: ['PS5'], maxExpectedHours: 15 }, isSystem: true,
    },
    {
      id: 'system-games-i-love',
      name: 'Games I Love',
      description: 'Personal favorites that meant more than their score.',
      mode: 'smart', gameIds: [], rules: { minLoveLevel: 3 }, isSystem: true,
    },
    {
      id: 'system-all-time-favorites',
      name: 'All-Time Favorites',
      description: 'The games you rated nine or higher.',
      mode: 'smart', gameIds: [], rules: { minRating: 9 }, isSystem: true,
    },
  ];
  return definitions
    .map(shelf => ({ ...shelf, createdAt: now, updatedAt: now }))
    .filter(shelf => getShelfGames(shelf, games).length > 0);
}
