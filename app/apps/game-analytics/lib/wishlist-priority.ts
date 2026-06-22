'use client';

/**
 * Wishlist Planner priority order — which game you're saving up for first.
 * Personal planning data like the queue preferences and estimator settings,
 * so it stays device-local in localStorage rather than going through the
 * Hybrid/Firebase repository (no Firestore rule needed).
 */

import { Game } from './types';

const keyFor = (userId: string) => `ga-wishlist-priority-${userId || 'local-user'}`;

export function loadWishlistPriority(userId: string): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(keyFor(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

export function saveWishlistPriority(userId: string, orderedIds: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(keyFor(userId), JSON.stringify(orderedIds));
  } catch {
    /* ignore quota / disabled storage */
  }
}

/**
 * Reconcile the saved order against the live wishlist: keep known games in
 * their saved relative order, append new wishlist games (oldest-added
 * first), and silently drop games no longer on the wishlist.
 */
export function resolveWishlistOrder(wishlistGames: Game[], savedOrder: string[]): Game[] {
  const byId = new Map(wishlistGames.map(g => [g.id, g]));
  const ordered: Game[] = [];
  const seen = new Set<string>();

  for (const id of savedOrder) {
    const game = byId.get(id);
    if (game && !seen.has(id)) {
      ordered.push(game);
      seen.add(id);
    }
  }

  const remaining = wishlistGames
    .filter(g => !seen.has(g.id))
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  return [...ordered, ...remaining];
}
