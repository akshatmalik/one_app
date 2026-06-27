'use client';

/**
 * "Gift Finder" — encode a compact, shareable snapshot of your Wishlist
 * (and your own saved priority order from the Wishlist Planner) into a short
 * text code a friend can paste in to figure out what to actually buy you.
 * Same no-accounts, no-server base64url-JSON pattern as versus-codes.ts and
 * coop-match.ts — deliberately strips price history, notes, and dates down
 * to just name/genre/platform/expected price/priority rank.
 */

import { Game } from './types';

export const GIFT_CODE_VERSION = 1;

export interface GiftItem {
  name: string;
  genre?: string;
  platform?: string;
  price: number; // expected price the wishlist owner entered (0 if unknown)
  priority: number; // 1-based rank, lower = wanted more
}

export interface GiftSnapshot {
  v: number;
  name: string;
  items: GiftItem[];
  generatedAt: string;
}

/**
 * `orderedWishlist` should already be in the owner's saved priority order
 * (e.g. `resolveWishlistOrder` output) so rank reflects what they actually
 * want most, not just creation date.
 */
export function buildGiftSnapshot(orderedWishlist: Game[], name: string): GiftSnapshot {
  return {
    v: GIFT_CODE_VERSION,
    name: name.trim().slice(0, 24) || 'Player',
    items: orderedWishlist.slice(0, 60).map((g, i) => ({
      name: g.name,
      genre: g.genre,
      platform: g.platform,
      price: g.price > 0 ? g.price : g.originalPrice ?? 0,
      priority: i + 1,
    })),
    generatedAt: new Date().toISOString(),
  };
}

function toBase64Url(input: string): string {
  const b64 = btoa(unescape(encodeURIComponent(input)));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(input: string): string {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4));
  return decodeURIComponent(escape(atob(padded + pad)));
}

export function encodeGiftCode(snapshot: GiftSnapshot): string {
  try {
    return toBase64Url(JSON.stringify(snapshot));
  } catch {
    return '';
  }
}

function isValidItem(value: unknown): value is GiftItem {
  if (!value || typeof value !== 'object') return false;
  const i = value as Record<string, unknown>;
  return typeof i.name === 'string' && typeof i.price === 'number' && typeof i.priority === 'number';
}

function isValidSnapshot(value: unknown): value is GiftSnapshot {
  if (!value || typeof value !== 'object') return false;
  const s = value as Record<string, unknown>;
  return (
    typeof s.v === 'number' &&
    typeof s.name === 'string' &&
    Array.isArray(s.items) &&
    s.items.every(isValidItem)
  );
}

export function decodeGiftCode(code: string): GiftSnapshot | null {
  const trimmed = code.trim();
  if (!trimmed) return null;
  try {
    const parsed = JSON.parse(fromBase64Url(trimmed));
    return isValidSnapshot(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export interface GiftPick {
  item: GiftItem;
  score: number; // higher = wanted more (derived from priority rank)
}

function scoreFor(item: GiftItem, totalItems: number): number {
  // Rank 1 (most wanted) scores highest; linearly decays to a floor of 1.
  return Math.max(1, totalItems - item.priority + 1);
}

/**
 * Exact 0/1 knapsack over the wishlist: which combination of items maximizes
 * total "want" score without going over budget. Wishlist snapshots are
 * capped at 60 items and budgets are whole dollars, so a integer-cents-free
 * DP table (budget rounded down to whole dollars) stays comfortably small.
 */
export function findBestGiftBundle(snapshot: GiftSnapshot, budget: number, excludeNames: Set<string> = new Set()): {
  bundle: GiftPick[];
  totalCost: number;
  totalScore: number;
  bestSingle: GiftPick | null;
} {
  const cap = Math.max(0, Math.floor(budget));
  const candidates = snapshot.items.filter(i => !excludeNames.has(i.name) && i.price > 0 && i.price <= cap + 0.001);
  const total = snapshot.items.length;

  const bestSingle = candidates
    .map(item => ({ item, score: scoreFor(item, total) }))
    .sort((a, b) => b.score - a.score || a.item.price - b.item.price)[0] ?? null;

  if (cap <= 0 || candidates.length === 0) {
    return { bundle: [], totalCost: 0, totalScore: 0, bestSingle };
  }

  const weights = candidates.map(i => Math.round(i.price));
  const values = candidates.map(i => scoreFor(i, total));
  const n = candidates.length;

  // dp[w] = best score achievable with budget w; keep[i][w] for reconstruction
  const dp: number[] = new Array(cap + 1).fill(0);
  const keep: Uint8Array[] = Array.from({ length: n }, () => new Uint8Array(cap + 1));

  for (let i = 0; i < n; i++) {
    for (let w = cap; w >= weights[i]; w--) {
      const candidateValue = dp[w - weights[i]] + values[i];
      if (candidateValue > dp[w]) {
        dp[w] = candidateValue;
        keep[i][w] = 1;
      }
    }
  }

  let w = cap;
  const chosen: GiftPick[] = [];
  for (let i = n - 1; i >= 0; i--) {
    if (keep[i][w]) {
      chosen.push({ item: candidates[i], score: values[i] });
      w -= weights[i];
    }
  }
  chosen.reverse();

  const totalCost = chosen.reduce((sum, p) => sum + p.item.price, 0);
  const totalScore = chosen.reduce((sum, p) => sum + p.score, 0);

  return { bundle: chosen, totalCost, totalScore, bestSingle };
}
