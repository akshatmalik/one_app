'use client';

/**
 * AI Action Registry
 * ------------------
 * Single source of truth for the actions the AI Gaming Coach can perform.
 *
 * Each write action has three faces:
 *   1. A Gemini `FunctionDeclaration` (so the model can propose it)
 *   2. A human-readable summary (rendered in the in-chat confirmation card)
 *   3. An executor binding to the existing app hooks (run only after the user confirms)
 *
 * Design rule: the model PROPOSES, the app DISPOSES. Gemini never touches storage
 * directly — it emits a structured intent that the host executes post-confirmation.
 *
 * Read tools (findGames, lookupGames) are handled inside ai-service.ts and run
 * without confirmation since they never mutate anything.
 */

import { Schema, FunctionDeclaration } from 'firebase/ai';
import {
  Game,
  GameStatus,
  PlayLog,
  PurchaseQueueEntry,
  SessionMood,
  SessionVibe,
  PurchaseSource,
} from './types';

// ── Constants shared with the schema ─────────────────────────────────────────

export const GAME_STATUSES: GameStatus[] = [
  'Not Started', 'In Progress', 'Completed', 'Wishlist', 'Abandoned',
];
const SESSION_MOODS: SessionMood[] = ['great', 'good', 'meh', 'grind'];
const SESSION_VIBES: SessionVibe[] = [
  'wind-down', 'competitive', 'exploration', 'story', 'achievement-hunting', 'social',
];
const PURCHASE_SOURCES: PurchaseSource[] = [
  'Steam', 'PlayStation', 'Xbox', 'Nintendo', 'Epic', 'GOG', 'Physical', 'Other',
];
export type InterestedDestination = 'queue' | 'wishlist' | 'both';
const DESTINATIONS: InterestedDestination[] = ['queue', 'wishlist', 'both'];

// ── Pending action shapes ────────────────────────────────────────────────────

export interface InterestedGameItem {
  name: string;
  destination: InterestedDestination;
  releaseDate?: string;
  genre?: string;
  platform?: string;
  thumbnail?: string;
  metacritic?: number;
  rawgRating?: number;
}

export interface AddGameArgs {
  name: string;
  price?: number;
  hours?: number;
  rating?: number;
  status?: GameStatus;
  platform?: string;
  genre?: string;
  franchise?: string;
  purchaseSource?: PurchaseSource;
  notes?: string;
  datePurchased?: string;
}

/** A write action the model has proposed, awaiting user confirmation. */
export type PendingAction =
  | { kind: 'addGame'; args: AddGameArgs }
  | { kind: 'addGames'; args: { games: InterestedGameItem[] } }
  | { kind: 'updateGame'; args: { gameId: string; updates: Partial<Game> } }
  | { kind: 'setGameStatus'; args: { gameId: string; status: GameStatus } }
  | { kind: 'logPlaySession'; args: { gameId: string; hours: number; date?: string; notes?: string; mood?: SessionMood; vibe?: SessionVibe } }
  | { kind: 'addToQueue'; args: { gameId: string } }
  | { kind: 'removeFromQueue'; args: { gameId: string } }
  | { kind: 'clearUpcoming'; args: Record<string, never> }
  | { kind: 'setBudget'; args: { year: number; amount: number } }
  | { kind: 'deleteGame'; args: { gameId: string } }
  | { kind: 'setReview'; args: { gameId: string; review: string } }
  | { kind: 'markSpecial'; args: { gameId: string; special: boolean } };

export type ActionKind = PendingAction['kind'];

/** Actions that destroy data get an extra-explicit confirmation in the UI. */
export const DESTRUCTIVE_ACTIONS: ActionKind[] = ['deleteGame', 'clearUpcoming'];

export function isDestructive(kind: ActionKind): boolean {
  return DESTRUCTIVE_ACTIONS.includes(kind);
}

// ── Host-provided executors ──────────────────────────────────────────────────

export interface AgentExecutors {
  addGame: (data: Omit<Game, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<Game>;
  updateGame: (id: string, updates: Partial<Game>) => Promise<Game>;
  deleteGame: (id: string) => Promise<void>;
  addToQueue: (gameId: string) => Promise<void>;
  removeFromQueue: (gameId: string) => Promise<void>;
  clearUpcoming: () => Promise<void>;
  setBudget: (year: number, amount: number) => Promise<void>;
  addPurchaseEntry: (
    data: Omit<PurchaseQueueEntry, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  ) => Promise<PurchaseQueueEntry>;
}

// ── Function declarations (what Gemini sees) ─────────────────────────────────

const gameItemSchema = Schema.object({
  properties: {
    name: Schema.string({ description: 'Exact game name' }),
    destination: Schema.enumString({
      enum: DESTINATIONS,
      description: 'queue = Purchase/Buy queue (best for unreleased), wishlist = library wishlist, both = add to both',
    }),
    releaseDate: Schema.string({ description: 'ISO date (YYYY-MM-DD) from the lookupGames result, omit if TBA/unknown' }),
    genre: Schema.string(),
    platform: Schema.string(),
    thumbnail: Schema.string({ description: 'Thumbnail URL from lookupGames' }),
    metacritic: Schema.number(),
    rawgRating: Schema.number(),
  },
  optionalProperties: ['releaseDate', 'genre', 'platform', 'thumbnail', 'metacritic', 'rawgRating'],
});

/**
 * The write tools. Names MUST match PendingAction['kind'] exactly — the dispatcher
 * relies on this 1:1 mapping.
 */
export const WRITE_FUNCTION_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: 'addGame',
    description: 'Add a single owned game to the library. Use for games the user owns or has played, not for "interested in" games (use addGames for those).',
    parameters: Schema.object({
      properties: {
        name: Schema.string(),
        price: Schema.number({ description: 'Price paid in dollars' }),
        hours: Schema.number({ description: 'Total hours played' }),
        rating: Schema.number({ description: 'Rating 1-10' }),
        status: Schema.enumString({ enum: GAME_STATUSES }),
        platform: Schema.string(),
        genre: Schema.string(),
        franchise: Schema.string(),
        purchaseSource: Schema.enumString({ enum: PURCHASE_SOURCES }),
        notes: Schema.string(),
        datePurchased: Schema.string({ description: 'ISO date YYYY-MM-DD' }),
      },
      optionalProperties: ['price', 'hours', 'rating', 'status', 'platform', 'genre', 'franchise', 'purchaseSource', 'notes', 'datePurchased'],
    }),
  },
  {
    name: 'addGames',
    description: 'Batch-add games the user is INTERESTED in (not yet owned). Always call lookupGames first to get real release dates and thumbnails, then pass them here. Default unreleased/TBA games to "queue" and already-released games to "wishlist" unless the user says otherwise.',
    parameters: Schema.object({
      properties: {
        games: Schema.array({ items: gameItemSchema, description: 'Games to add with their resolved metadata' }),
      },
    }),
  },
  {
    name: 'updateGame',
    description: 'Update fields on an existing game. Resolve gameId with findGames first. Only include fields that change.',
    parameters: Schema.object({
      properties: {
        gameId: Schema.string({ description: 'The id from findGames' }),
        name: Schema.string(),
        price: Schema.number(),
        hours: Schema.number(),
        rating: Schema.number({ description: '1-10' }),
        status: Schema.enumString({ enum: GAME_STATUSES }),
        platform: Schema.string(),
        genre: Schema.string(),
        franchise: Schema.string(),
        notes: Schema.string(),
      },
      optionalProperties: ['name', 'price', 'hours', 'rating', 'status', 'platform', 'genre', 'franchise', 'notes'],
    }),
  },
  {
    name: 'setGameStatus',
    description: 'Change a game\'s status (e.g. mark Completed, In Progress, Abandoned). Resolve gameId with findGames first. Auto-stamps start/end dates as appropriate.',
    parameters: Schema.object({
      properties: {
        gameId: Schema.string(),
        status: Schema.enumString({ enum: GAME_STATUSES }),
      },
    }),
  },
  {
    name: 'logPlaySession',
    description: 'Log a play session for a game. Resolve gameId with findGames first. Date defaults to today.',
    parameters: Schema.object({
      properties: {
        gameId: Schema.string(),
        hours: Schema.number({ description: 'Hours played in this session' }),
        date: Schema.string({ description: 'ISO date YYYY-MM-DD, defaults to today' }),
        notes: Schema.string(),
        mood: Schema.enumString({ enum: SESSION_MOODS }),
        vibe: Schema.enumString({ enum: SESSION_VIBES }),
      },
      optionalProperties: ['date', 'notes', 'mood', 'vibe'],
    }),
  },
  {
    name: 'addToQueue',
    description: 'Add an owned game to the "Up Next" play queue. Resolve gameId with findGames first.',
    parameters: Schema.object({ properties: { gameId: Schema.string() } }),
  },
  {
    name: 'removeFromQueue',
    description: 'Remove a game from the "Up Next" play queue. Resolve gameId with findGames first.',
    parameters: Schema.object({ properties: { gameId: Schema.string() } }),
  },
  {
    name: 'clearUpcoming',
    description: 'Clear all on-deck games from the Up Next queue, keeping only games currently In Progress.',
    parameters: Schema.object({ properties: {} }),
  },
  {
    name: 'setBudget',
    description: 'Set the yearly gaming budget for a given year.',
    parameters: Schema.object({
      properties: {
        year: Schema.number(),
        amount: Schema.number({ description: 'Budget in dollars' }),
      },
    }),
  },
  {
    name: 'deleteGame',
    description: 'Permanently delete a game from the library. Destructive — only when the user clearly asks. Resolve gameId with findGames first.',
    parameters: Schema.object({ properties: { gameId: Schema.string() } }),
  },
  {
    name: 'setReview',
    description: 'Set the user\'s written review/notes text on a game. Resolve gameId with findGames first.',
    parameters: Schema.object({
      properties: {
        gameId: Schema.string(),
        review: Schema.string(),
      },
    }),
  },
  {
    name: 'markSpecial',
    description: 'Flag or unflag a game as "special" (a personal favorite). Resolve gameId with findGames first.',
    parameters: Schema.object({
      properties: {
        gameId: Schema.string(),
        special: Schema.boolean(),
      },
    }),
  },
];

// ── Parse a raw Gemini function call into a typed PendingAction ───────────────

/**
 * Convert a raw {name, args} function call from Gemini into a typed PendingAction.
 * Returns null for unknown/read tool names. Coerces numeric strings defensively
 * since models occasionally emit numbers as strings.
 */
export function parseFunctionCall(name: string, rawArgs: Record<string, unknown>): PendingAction | null {
  const num = (v: unknown): number | undefined => {
    if (v === undefined || v === null || v === '') return undefined;
    const n = typeof v === 'number' ? v : parseFloat(String(v));
    return Number.isFinite(n) ? n : undefined;
  };
  const str = (v: unknown): string | undefined =>
    v === undefined || v === null ? undefined : String(v);

  switch (name) {
    case 'addGame': {
      const args: AddGameArgs = {
        name: str(rawArgs.name) ?? '',
        price: num(rawArgs.price),
        hours: num(rawArgs.hours),
        rating: num(rawArgs.rating),
        status: rawArgs.status as GameStatus | undefined,
        platform: str(rawArgs.platform),
        genre: str(rawArgs.genre),
        franchise: str(rawArgs.franchise),
        purchaseSource: rawArgs.purchaseSource as PurchaseSource | undefined,
        notes: str(rawArgs.notes),
        datePurchased: str(rawArgs.datePurchased),
      };
      if (!args.name) return null;
      return { kind: 'addGame', args };
    }
    case 'addGames': {
      const rawGames = Array.isArray(rawArgs.games) ? rawArgs.games : [];
      const games: InterestedGameItem[] = rawGames
        .map((g): InterestedGameItem | null => {
          const item = g as Record<string, unknown>;
          const gName = str(item.name);
          if (!gName) return null;
          const dest = (DESTINATIONS as string[]).includes(String(item.destination))
            ? (item.destination as InterestedDestination)
            : 'queue';
          return {
            name: gName,
            destination: dest,
            releaseDate: str(item.releaseDate),
            genre: str(item.genre),
            platform: str(item.platform),
            thumbnail: str(item.thumbnail),
            metacritic: num(item.metacritic),
            rawgRating: num(item.rawgRating),
          };
        })
        .filter((g): g is InterestedGameItem => g !== null);
      if (games.length === 0) return null;
      return { kind: 'addGames', args: { games } };
    }
    case 'updateGame': {
      const gameId = str(rawArgs.gameId);
      if (!gameId) return null;
      const updates: Partial<Game> = {};
      if (rawArgs.name !== undefined) updates.name = str(rawArgs.name);
      if (rawArgs.price !== undefined) updates.price = num(rawArgs.price);
      if (rawArgs.hours !== undefined) updates.hours = num(rawArgs.hours);
      if (rawArgs.rating !== undefined) updates.rating = num(rawArgs.rating);
      if (rawArgs.status !== undefined) updates.status = rawArgs.status as GameStatus;
      if (rawArgs.platform !== undefined) updates.platform = str(rawArgs.platform);
      if (rawArgs.genre !== undefined) updates.genre = str(rawArgs.genre);
      if (rawArgs.franchise !== undefined) updates.franchise = str(rawArgs.franchise);
      if (rawArgs.notes !== undefined) updates.notes = str(rawArgs.notes);
      if (Object.keys(updates).length === 0) return null;
      return { kind: 'updateGame', args: { gameId, updates } };
    }
    case 'setGameStatus': {
      const gameId = str(rawArgs.gameId);
      const status = rawArgs.status as GameStatus | undefined;
      if (!gameId || !status) return null;
      return { kind: 'setGameStatus', args: { gameId, status } };
    }
    case 'logPlaySession': {
      const gameId = str(rawArgs.gameId);
      const hours = num(rawArgs.hours);
      if (!gameId || hours === undefined) return null;
      return {
        kind: 'logPlaySession',
        args: {
          gameId,
          hours,
          date: str(rawArgs.date),
          notes: str(rawArgs.notes),
          mood: rawArgs.mood as SessionMood | undefined,
          vibe: rawArgs.vibe as SessionVibe | undefined,
        },
      };
    }
    case 'addToQueue': {
      const gameId = str(rawArgs.gameId);
      if (!gameId) return null;
      return { kind: 'addToQueue', args: { gameId } };
    }
    case 'removeFromQueue': {
      const gameId = str(rawArgs.gameId);
      if (!gameId) return null;
      return { kind: 'removeFromQueue', args: { gameId } };
    }
    case 'clearUpcoming':
      return { kind: 'clearUpcoming', args: {} };
    case 'setBudget': {
      const year = num(rawArgs.year);
      const amount = num(rawArgs.amount);
      if (year === undefined || amount === undefined) return null;
      return { kind: 'setBudget', args: { year, amount } };
    }
    case 'deleteGame': {
      const gameId = str(rawArgs.gameId);
      if (!gameId) return null;
      return { kind: 'deleteGame', args: { gameId } };
    }
    case 'setReview': {
      const gameId = str(rawArgs.gameId);
      const review = str(rawArgs.review);
      if (!gameId || review === undefined) return null;
      return { kind: 'setReview', args: { gameId, review } };
    }
    case 'markSpecial': {
      const gameId = str(rawArgs.gameId);
      if (!gameId) return null;
      return { kind: 'markSpecial', args: { gameId, special: rawArgs.special !== false } };
    }
    default:
      return null;
  }
}

// ── Human-readable summary for the confirmation card ─────────────────────────

const nameOf = (games: Game[], id: string): string =>
  games.find(g => g.id === id)?.name ?? 'this game';

export function summarizeAction(action: PendingAction, games: Game[]): string {
  switch (action.kind) {
    case 'addGame': {
      const a = action.args;
      const bits = [
        a.price !== undefined ? `$${a.price}` : null,
        a.rating !== undefined ? `${a.rating}/10` : null,
        a.status,
        a.hours !== undefined ? `${a.hours}h` : null,
      ].filter(Boolean);
      return `Add "${a.name}"${bits.length ? ` (${bits.join(', ')})` : ''} to your library`;
    }
    case 'addGames':
      return `Add ${action.args.games.length} game${action.args.games.length === 1 ? '' : 's'} you're interested in`;
    case 'updateGame': {
      const fields = Object.entries(action.args.updates)
        .map(([k, v]) => `${k} → ${v}`)
        .join(', ');
      return `Update "${nameOf(games, action.args.gameId)}": ${fields}`;
    }
    case 'setGameStatus':
      return `Mark "${nameOf(games, action.args.gameId)}" as ${action.args.status}`;
    case 'logPlaySession': {
      const a = action.args;
      return `Log ${a.hours}h on "${nameOf(games, a.gameId)}"${a.date ? ` (${a.date})` : ' (today)'}`;
    }
    case 'addToQueue':
      return `Add "${nameOf(games, action.args.gameId)}" to Up Next`;
    case 'removeFromQueue':
      return `Remove "${nameOf(games, action.args.gameId)}" from Up Next`;
    case 'clearUpcoming':
      return 'Clear all on-deck games from Up Next (keeps games In Progress)';
    case 'setBudget':
      return `Set ${action.args.year} budget to $${action.args.amount}`;
    case 'deleteGame':
      return `Permanently delete "${nameOf(games, action.args.gameId)}"`;
    case 'setReview':
      return `Save a review on "${nameOf(games, action.args.gameId)}"`;
    case 'markSpecial':
      return `${action.args.special ? 'Mark' : 'Unmark'} "${nameOf(games, action.args.gameId)}" as special`;
  }
}

// ── Validation & dedup (surfaced as warnings in the confirmation card) ───────

/** Loose name match for duplicate detection: case/space/punctuation-insensitive. */
function normalizeName(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function findByName(games: Game[], name: string): Game | undefined {
  const target = normalizeName(name);
  return games.find(g => normalizeName(g.name) === target);
}

const ID_ACTIONS: ActionKind[] = [
  'updateGame', 'setGameStatus', 'logPlaySession', 'addToQueue',
  'removeFromQueue', 'deleteGame', 'setReview', 'markSpecial',
];

/**
 * Non-blocking checks shown to the user before they confirm: duplicate adds,
 * out-of-range values, missing game references. Returning warnings (not errors)
 * keeps the user in control — they can drop a flagged item or proceed anyway.
 */
export function validateAction(action: PendingAction, games: Game[]): string[] {
  const warnings: string[] = [];

  if (ID_ACTIONS.includes(action.kind)) {
    const id = (action.args as { gameId?: string }).gameId;
    if (id && !games.some(g => g.id === id)) {
      warnings.push("Couldn't find that game in your library — it may have been deleted.");
    }
  }

  switch (action.kind) {
    case 'addGame': {
      const dup = findByName(games, action.args.name);
      if (dup) warnings.push(`"${dup.name}" is already in your library (${dup.status}). This would create a duplicate.`);
      if (action.args.rating !== undefined && (action.args.rating < 0 || action.args.rating > 10)) {
        warnings.push(`Rating ${action.args.rating} is out of range — it'll be clamped to 1–10.`);
      }
      if (action.args.price !== undefined && action.args.price < 0) warnings.push('Negative price will be treated as $0.');
      if (action.args.hours !== undefined && action.args.hours < 0) warnings.push('Negative hours will be treated as 0.');
      break;
    }
    case 'addGames': {
      for (const g of action.args.games) {
        const dup = findByName(games, g.name);
        if (dup) warnings.push(`"${g.name}" is already in your library (${dup.status}).`);
      }
      break;
    }
    case 'updateGame': {
      const r = action.args.updates.rating;
      if (r !== undefined && (r < 0 || r > 10)) warnings.push(`Rating ${r} is out of range — it'll be clamped to 1–10.`);
      const p = action.args.updates.price;
      if (p !== undefined && p < 0) warnings.push('Negative price will be treated as $0.');
      break;
    }
    case 'logPlaySession':
      if (action.args.hours <= 0) warnings.push('Session hours should be greater than 0.');
      break;
    case 'setBudget':
      if (action.args.amount < 0) warnings.push('Budget cannot be negative.');
      break;
    default:
      break;
  }

  return warnings;
}

// ── Execute a confirmed action ───────────────────────────────────────────────

/** Clamp a rating into the app's 1–10 scale (0/undefined left as-is for "unrated"). */
function clampRating(r: number | undefined): number | undefined {
  if (r === undefined) return undefined;
  if (r === 0) return 0; // 0 = explicitly unrated
  return Math.min(10, Math.max(1, r));
}

const nonNeg = (n: number | undefined): number | undefined =>
  n === undefined ? undefined : Math.max(0, n);

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function genId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Run a confirmed action against the host executors. Returns a short result
 * string that is fed back to the model so its closing message is accurate.
 * Throws on failure (the caller surfaces the error in chat).
 */
export async function executeAction(
  action: PendingAction,
  executors: AgentExecutors,
  games: Game[],
): Promise<string> {
  // Hard guard: actions on an existing game must reference a real id.
  if (ID_ACTIONS.includes(action.kind)) {
    const id = (action.args as { gameId?: string }).gameId;
    if (!id || !games.some(g => g.id === id)) {
      throw new Error("That game isn't in your library anymore.");
    }
  }

  switch (action.kind) {
    case 'addGame': {
      const a = action.args;
      await executors.addGame({
        name: a.name,
        price: nonNeg(a.price) ?? 0,
        hours: nonNeg(a.hours) ?? 0,
        rating: clampRating(a.rating) ?? 0,
        status: a.status ?? 'Not Started',
        platform: a.platform,
        genre: a.genre,
        franchise: a.franchise,
        purchaseSource: a.purchaseSource,
        notes: a.notes,
        datePurchased: a.datePurchased,
      });
      return `Added "${a.name}" to the library.`;
    }
    case 'addGames': {
      const results: string[] = [];
      for (const item of action.args.games) {
        const toQueue = item.destination === 'queue' || item.destination === 'both';
        const toWishlist = item.destination === 'wishlist' || item.destination === 'both';
        if (toQueue) {
          await executors.addPurchaseEntry({
            gameName: item.name,
            thumbnail: item.thumbnail,
            platform: item.platform,
            genre: item.genre,
            releaseDate: item.releaseDate,
            metacriticScore: item.metacritic,
            rawgRating: item.rawgRating,
            isDayOneBuy: false,
            priority: 999,
            purchased: false,
            intent: 'committed',
            addedAt: new Date().toISOString(),
          });
        }
        if (toWishlist) {
          await executors.addGame({
            name: item.name,
            price: 0,
            hours: 0,
            rating: 0,
            status: 'Wishlist',
            genre: item.genre,
            platform: item.platform,
            thumbnail: item.thumbnail,
          });
        }
        results.push(`${item.name} → ${item.destination}`);
      }
      return `Added: ${results.join('; ')}.`;
    }
    case 'updateGame': {
      const updates = { ...action.args.updates };
      if (updates.rating !== undefined) updates.rating = clampRating(updates.rating);
      if (updates.price !== undefined) updates.price = nonNeg(updates.price);
      if (updates.hours !== undefined) updates.hours = nonNeg(updates.hours);
      await executors.updateGame(action.args.gameId, updates);
      return `Updated "${nameOf(games, action.args.gameId)}".`;
    }
    case 'setGameStatus': {
      const { gameId, status } = action.args;
      const game = games.find(g => g.id === gameId);
      const updates: Partial<Game> = { status };
      if (status === 'In Progress' && !game?.startDate) updates.startDate = todayISO();
      if ((status === 'Completed' || status === 'Abandoned') && !game?.endDate) updates.endDate = todayISO();
      await executors.updateGame(gameId, updates);
      return `"${nameOf(games, gameId)}" is now ${status}.`;
    }
    case 'logPlaySession': {
      const { gameId, hours, date, notes, mood, vibe } = action.args;
      const game = games.find(g => g.id === gameId);
      const logDate = date ?? todayISO();
      const safeHours = Math.max(0, hours);
      const newLog: PlayLog = { id: genId(), date: logDate, hours: safeHours, notes, mood, vibe };
      const existing = game?.playLogs ?? [];
      const updates: Partial<Game> = { playLogs: [...existing, newLog] };
      // Auto-start a backlog game on its first session, mirroring the manual flow.
      if (game?.status === 'Not Started' && existing.length === 0) {
        updates.status = 'In Progress';
        updates.startDate = logDate;
      }
      await executors.updateGame(gameId, updates);
      return `Logged ${hours}h on "${nameOf(games, gameId)}".`;
    }
    case 'addToQueue':
      await executors.addToQueue(action.args.gameId);
      return `Added "${nameOf(games, action.args.gameId)}" to Up Next.`;
    case 'removeFromQueue':
      await executors.removeFromQueue(action.args.gameId);
      return `Removed "${nameOf(games, action.args.gameId)}" from Up Next.`;
    case 'clearUpcoming':
      await executors.clearUpcoming();
      return 'Cleared the on-deck queue.';
    case 'setBudget':
      await executors.setBudget(action.args.year, action.args.amount);
      return `Set the ${action.args.year} budget to $${action.args.amount}.`;
    case 'deleteGame': {
      const label = nameOf(games, action.args.gameId);
      await executors.deleteGame(action.args.gameId);
      return `Deleted "${label}".`;
    }
    case 'setReview':
      await executors.updateGame(action.args.gameId, { review: action.args.review });
      return `Saved your review on "${nameOf(games, action.args.gameId)}".`;
    case 'markSpecial':
      await executors.updateGame(action.args.gameId, { isSpecial: action.args.special });
      return `${action.args.special ? 'Marked' : 'Unmarked'} "${nameOf(games, action.args.gameId)}" as special.`;
  }
}
