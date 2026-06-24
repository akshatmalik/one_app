'use client';

/**
 * "Common Ground" — encode just your Wishlist into a short, shareable text
 * code so a friend can paste it back in and see what overlaps with their own
 * wishlist. No accounts, no server round-trip: a base64url-encoded JSON blob
 * containing only Wishlist-status games (never owned/played games, ratings,
 * spend, or any other library data). Mirrors the privacy-first pattern used
 * by Rival Check (lib/versus-codes.ts), kept as a fully separate file so that
 * file never needs to change.
 */

import { Game } from './types';

export const COOP_CODE_VERSION = 1;
const MAX_ITEMS = 60;

export interface WishlistShareItem {
  name: string;
  price: number;
  genre?: string;
}

export interface CoopSnapshot {
  v: number;
  name: string;
  items: WishlistShareItem[];
  generatedAt: string;
}

export function buildCoopSnapshot(games: Game[], name: string): CoopSnapshot {
  const items: WishlistShareItem[] = games
    .filter(g => g.status === 'Wishlist')
    .slice(0, MAX_ITEMS)
    .map(g => ({
      name: g.name,
      price: g.price,
      genre: g.genre,
    }));

  return {
    v: COOP_CODE_VERSION,
    name: name.trim().slice(0, 24) || 'Player',
    items,
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

export function encodeCoopCode(snapshot: CoopSnapshot): string {
  try {
    return toBase64Url(JSON.stringify(snapshot));
  } catch {
    return '';
  }
}

function isValidItem(value: unknown): value is WishlistShareItem {
  if (!value || typeof value !== 'object') return false;
  const i = value as Record<string, unknown>;
  return typeof i.name === 'string' && typeof i.price === 'number';
}

function isValidSnapshot(value: unknown): value is CoopSnapshot {
  if (!value || typeof value !== 'object') return false;
  const s = value as Record<string, unknown>;
  return (
    typeof s.v === 'number' &&
    typeof s.name === 'string' &&
    Array.isArray(s.items) &&
    s.items.every(isValidItem)
  );
}

export function decodeCoopCode(code: string): CoopSnapshot | null {
  const trimmed = code.trim();
  if (!trimmed) return null;
  try {
    const parsed = JSON.parse(fromBase64Url(trimmed));
    return isValidSnapshot(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

export interface CoopComparison {
  shared: { mine: WishlistShareItem; theirs: WishlistShareItem }[];
  theirsOnly: WishlistShareItem[];
  mineOnlyCount: number;
}

export function compareWishlists(myGames: Game[], friend: CoopSnapshot): CoopComparison {
  const mine: WishlistShareItem[] = myGames
    .filter(g => g.status === 'Wishlist')
    .map(g => ({ name: g.name, price: g.price, genre: g.genre }));

  const mineByName = new Map(mine.map(item => [normalizeName(item.name), item]));

  const shared: { mine: WishlistShareItem; theirs: WishlistShareItem }[] = [];
  const theirsOnly: WishlistShareItem[] = [];

  for (const theirs of friend.items) {
    const matched = mineByName.get(normalizeName(theirs.name));
    if (matched) {
      shared.push({ mine: matched, theirs });
    } else {
      theirsOnly.push(theirs);
    }
  }

  const sharedNames = new Set(shared.map(s => normalizeName(s.mine.name)));
  const mineOnlyCount = mine.filter(item => !sharedNames.has(normalizeName(item.name))).length;

  return { shared, theirsOnly, mineOnlyCount };
}
