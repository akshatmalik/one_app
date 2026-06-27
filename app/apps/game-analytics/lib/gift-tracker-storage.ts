'use client';

/**
 * Gift Finder's "already got them this" tracker — purely local planning data
 * (who you're shopping for, what you've already marked as bought for them),
 * same device-local localStorage pattern as queue-preferences.ts /
 * wishlist-priority.ts. Keyed per friend name so re-pasting the same code
 * later doesn't re-suggest something you already bought.
 */

interface GiftTrackerState {
  [friendName: string]: string[]; // game names marked as already gifted
}

const keyFor = (userId: string) => `ga-gift-tracker-${userId || 'local-user'}`;

function loadState(userId: string): GiftTrackerState {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(keyFor(userId));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveState(userId: string, state: GiftTrackerState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(keyFor(userId), JSON.stringify(state));
  } catch {
    /* ignore quota / disabled storage */
  }
}

export function getGiftedNames(userId: string, friendName: string): string[] {
  const state = loadState(userId);
  return state[friendName] ?? [];
}

export function markAsGifted(userId: string, friendName: string, gameName: string): string[] {
  const state = loadState(userId);
  const current = new Set(state[friendName] ?? []);
  current.add(gameName);
  state[friendName] = Array.from(current);
  saveState(userId, state);
  return state[friendName];
}

export function unmarkAsGifted(userId: string, friendName: string, gameName: string): string[] {
  const state = loadState(userId);
  state[friendName] = (state[friendName] ?? []).filter(n => n !== gameName);
  saveState(userId, state);
  return state[friendName];
}
