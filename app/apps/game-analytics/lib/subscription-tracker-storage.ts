'use client';

/**
 * Subscription Value Tracker — tracks recurring gaming subscriptions
 * (Game Pass, PS Plus, Epic Free, Prime Gaming, Humble Choice, or anything
 * else) and what they cost, so the app can answer "is this still worth it?"
 * across every service, not just PS Plus. Personal cost/billing info, so it
 * stays device-local in localStorage rather than going through the
 * Hybrid/Firebase repository (same precedent as squad-storage.ts and
 * subscription-settings.ts — no Firestore rule needed).
 */

import { SubscriptionSource } from './types';

export type BillingCycle = 'monthly' | 'yearly';

export interface TrackedSubscription {
  id: string;
  service: SubscriptionSource;
  label?: string;          // custom name, used when service is 'Other'
  cost: number;             // price per billing cycle
  billingCycle: BillingCycle;
  startedAt: string;        // ISO date — when the user started paying
  cancelledAt: string | null; // ISO date, or null if still active
}

const keyFor = (userId: string) => `ga-subscription-tracker-${userId || 'local-user'}`;

const VALID_SOURCES: SubscriptionSource[] = ['PS Plus', 'Game Pass', 'Epic Free', 'Prime Gaming', 'Humble Choice', 'Other'];

function isValidSubscription(value: unknown): value is TrackedSubscription {
  if (!value || typeof value !== 'object') return false;
  const s = value as Record<string, unknown>;
  return (
    typeof s.id === 'string' &&
    typeof s.service === 'string' && VALID_SOURCES.includes(s.service as SubscriptionSource) &&
    typeof s.cost === 'number' &&
    (s.billingCycle === 'monthly' || s.billingCycle === 'yearly') &&
    typeof s.startedAt === 'string' &&
    (s.cancelledAt === null || typeof s.cancelledAt === 'string')
  );
}

export function getTrackedSubscriptions(userId: string): TrackedSubscription[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(keyFor(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidSubscription);
  } catch {
    return [];
  }
}

function saveTrackedSubscriptions(userId: string, subscriptions: TrackedSubscription[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(keyFor(userId), JSON.stringify(subscriptions));
  } catch {
    /* ignore quota / disabled storage */
  }
}

export function addTrackedSubscription(
  userId: string,
  input: { service: SubscriptionSource; label?: string; cost: number; billingCycle: BillingCycle; startedAt: string }
): TrackedSubscription {
  const subscription: TrackedSubscription = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    service: input.service,
    label: input.label?.trim() || undefined,
    cost: input.cost,
    billingCycle: input.billingCycle,
    startedAt: input.startedAt,
    cancelledAt: null,
  };
  const subscriptions = getTrackedSubscriptions(userId);
  saveTrackedSubscriptions(userId, [...subscriptions, subscription]);
  return subscription;
}

export function updateTrackedSubscription(
  userId: string,
  id: string,
  updates: Partial<Omit<TrackedSubscription, 'id'>>
): void {
  const subscriptions = getTrackedSubscriptions(userId);
  const idx = subscriptions.findIndex(s => s.id === id);
  if (idx === -1) return;
  const next = [...subscriptions];
  next[idx] = { ...next[idx], ...updates };
  saveTrackedSubscriptions(userId, next);
}

export function cancelTrackedSubscription(userId: string, id: string, cancelledAt: string = new Date().toISOString()): void {
  updateTrackedSubscription(userId, id, { cancelledAt });
}

export function removeTrackedSubscription(userId: string, id: string): void {
  const subscriptions = getTrackedSubscriptions(userId);
  saveTrackedSubscriptions(userId, subscriptions.filter(s => s.id !== id));
}
