'use client';

import { SubscriptionTier } from './types';

/**
 * Subscription (PS Plus) sync settings + state.
 *
 * Stored in localStorage (per user), SSR-safe. Like the Timeline Estimator
 * settings, this is device-local planning/config — not core game data — so it
 * deliberately skips the Hybrid/Firebase repository (and the Firestore rule it
 * would need). We can promote it to a synced store later if desired.
 */

export interface SubscriptionSettings {
  psPlusEnabled: boolean;
  psPlusTier: SubscriptionTier;
  lastSyncedMonth: string | null;     // 'YYYY-MM' — most recent month we pulled drops for
  backfillStartMonth: string | null;  // 'YYYY-MM' — earliest month the bootstrap reached
  dismissedMonths: string[];          // months the user cleared the "new drop" nudge for
}

export const DEFAULT_SUBSCRIPTION_SETTINGS: SubscriptionSettings = {
  psPlusEnabled: false,
  psPlusTier: 'Extra',
  lastSyncedMonth: null,
  backfillStartMonth: null,
  dismissedMonths: [],
};

const keyFor = (userId: string) => `ga-subscription-settings-${userId || 'local-user'}`;

export function loadSubscriptionSettings(userId: string): SubscriptionSettings {
  if (typeof window === 'undefined') return { ...DEFAULT_SUBSCRIPTION_SETTINGS };
  try {
    const raw = localStorage.getItem(keyFor(userId));
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SubscriptionSettings>;
      return {
        psPlusEnabled: !!parsed.psPlusEnabled,
        psPlusTier: parsed.psPlusTier || DEFAULT_SUBSCRIPTION_SETTINGS.psPlusTier,
        lastSyncedMonth: parsed.lastSyncedMonth ?? null,
        backfillStartMonth: parsed.backfillStartMonth ?? null,
        dismissedMonths: Array.isArray(parsed.dismissedMonths) ? parsed.dismissedMonths : [],
      };
    }
  } catch {
    /* fall through to defaults */
  }
  return { ...DEFAULT_SUBSCRIPTION_SETTINGS };
}

export function saveSubscriptionSettings(userId: string, settings: SubscriptionSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(keyFor(userId), JSON.stringify(settings));
  } catch {
    /* ignore quota / disabled storage */
  }
}

// ── Month helpers ───────────────────────────────────────────────────────────

/** 'YYYY-MM' key for a date (defaults to today). */
export function monthKey(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** 'July 2026' label for a 'YYYY-MM' key. */
export function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  if (!y || !m) return key;
  return `${MONTH_NAMES[m - 1]} ${y}`;
}

/** First day of a 'YYYY-MM' month, as 'YYYY-MM-01'. */
export function monthFirstDay(key: string): string {
  return `${key}-01`;
}

/** Step a 'YYYY-MM' key by `delta` months (negative = earlier). */
export function shiftMonth(key: string, delta: number): string {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return monthKey(d);
}

/** The most recent `count` month keys, newest first (excluding future months past `upTo`). */
export function recentMonths(count: number, upTo: string = monthKey()): string[] {
  const out: string[] = [];
  for (let i = 0; i < count; i++) out.push(shiftMonth(upTo, -i));
  return out;
}

/** Date of the first Tuesday of a month — when PS Plus monthly games typically refresh. */
function firstTuesday(year: number, monthIndex0: number): Date {
  const d = new Date(year, monthIndex0, 1);
  // getDay(): 0=Sun..6=Sat. Tuesday = 2.
  const offset = (2 - d.getDay() + 7) % 7;
  return new Date(year, monthIndex0, 1 + offset);
}

/**
 * The latest month whose PS Plus drop should be "out" as of `today`. PS Plus
 * monthly games refresh on the first Tuesday; before that the current month's
 * games aren't live yet, so the latest available drop is the previous month.
 */
export function latestAvailableMonth(today: Date = new Date()): string {
  const ft = firstTuesday(today.getFullYear(), today.getMonth());
  if (today >= ft) return monthKey(today);
  return shiftMonth(monthKey(today), -1);
}

/**
 * Is there a fresh drop the user hasn't synced (and hasn't dismissed the nudge for)?
 */
export function hasNewDrop(settings: SubscriptionSettings, today: Date = new Date()): boolean {
  if (!settings.psPlusEnabled) return false;
  const available = latestAvailableMonth(today);
  if (settings.dismissedMonths.includes(available)) return false;
  // No sync yet, or available month is newer than what we last pulled.
  return settings.lastSyncedMonth === null || available > settings.lastSyncedMonth;
}
