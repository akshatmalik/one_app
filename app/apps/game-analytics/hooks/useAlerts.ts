'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Game, BudgetSettings, GamingGoal, PurchaseQueueEntry } from '../lib/types';
import { getActiveAlerts, getPriceWatchAlerts, getAnniversaryAlerts, ALERT_SEVERITY_ORDER, GameAlert, AlertCategory } from '../lib/calculations';
import { getMilestoneProximityAlerts, TrophyProgress } from '../lib/trophy-calculations';

const DISMISSED_KEY_PREFIX = 'game-analytics-alerts-dismissed';
const NOTIFIED_KEY_PREFIX = 'game-analytics-alerts-notified';
const MUTED_CATEGORIES_KEY_PREFIX = 'game-analytics-alerts-muted-categories';
const SNOOZE_DAYS = 1;

interface DismissedMap {
  [alertId: string]: string; // ISO date until which the alert is hidden
}

function readMap(key: string): DismissedMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeMap(key: string, map: DismissedMap) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(map));
  } catch {
    // localStorage full or unavailable — alert dismissal just won't persist
  }
}

function readCategorySet(key: string): Set<AlertCategory> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(key);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function writeCategorySet(key: string, set: Set<AlertCategory>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify([...set]));
  } catch {
    // localStorage full or unavailable — mute preference just won't persist
  }
}

export interface LiveSessionAlertInput {
  gameId: string;
  gameName: string;
  elapsedMs: number;
}

/**
 * Computes the active alert feed and layers on user-controlled dismissal/snooze
 * state plus an opt-in browser Notification ping for newly-surfaced alerts.
 */
export function useAlerts(
  games: Game[],
  budgets: BudgetSettings[],
  goals: GamingGoal[],
  userId: string | null,
  liveSession?: LiveSessionAlertInput | null,
  purchaseQueue: PurchaseQueueEntry[] = [],
  trophies: TrophyProgress[] = []
) {
  const dismissedKey = `${DISMISSED_KEY_PREFIX}-${userId || 'local-user'}`;
  const notifiedKey = `${NOTIFIED_KEY_PREFIX}-${userId || 'local-user'}`;
  const mutedCategoriesKey = `${MUTED_CATEGORIES_KEY_PREFIX}-${userId || 'local-user'}`;

  const [dismissed, setDismissed] = useState<DismissedMap>(() => readMap(dismissedKey));
  const [mutedCategories, setMutedCategories] = useState<Set<AlertCategory>>(() => readCategorySet(mutedCategoriesKey));
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(
    () => (typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported')
  );

  const rawAlerts = useMemo(
    () => [
      ...getActiveAlerts(games, budgets, goals, liveSession ?? null),
      ...getPriceWatchAlerts(purchaseQueue),
      ...getAnniversaryAlerts(games),
      ...getMilestoneProximityAlerts(trophies),
    ].sort((a, b) => ALERT_SEVERITY_ORDER[a.severity] - ALERT_SEVERITY_ORDER[b.severity]),
    [games, budgets, goals, liveSession, purchaseQueue, trophies]
  );

  const now = Date.now();
  // Dismissal is keyed by id+severity so an alert that escalates (e.g. budget
  // warning -> budget critical) resurfaces even if the milder version was dismissed.
  const alerts = useMemo(
    () => rawAlerts.filter(a => {
      if (mutedCategories.has(a.category)) return false;
      const until = dismissed[`${a.id}:${a.severity}`];
      return !until || new Date(until).getTime() <= now;
    }),
    [rawAlerts, dismissed, mutedCategories, now]
  );

  // Fire a browser notification once per unique alert id, only for the
  // higher-signal tiers so an enabled user isn't spammed with "info" alerts.
  useEffect(() => {
    if (permission !== 'granted' || typeof window === 'undefined') return;
    const notified = readMap(notifiedKey);
    let changed = false;
    alerts.forEach(a => {
      if (a.severity === 'info') return;
      if (notified[a.id]) return;
      try {
        new Notification(a.title, { body: a.message, tag: a.id });
      } catch {
        // Notification constructor can throw in some embedded/sandboxed contexts
      }
      notified[a.id] = new Date().toISOString();
      changed = true;
    });
    if (changed) writeMap(notifiedKey, notified);
  }, [alerts, permission, notifiedKey]);

  const requestPermission = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    const result = await Notification.requestPermission();
    setPermission(result);
  }, []);

  const dismissAlert = useCallback((alert: GameAlert) => {
    setDismissed(prev => {
      const next = { ...prev, [`${alert.id}:${alert.severity}`]: new Date(8640000000000000).toISOString() };
      writeMap(dismissedKey, next);
      return next;
    });
  }, [dismissedKey]);

  const snoozeAlert = useCallback((alert: GameAlert) => {
    setDismissed(prev => {
      const until = new Date(Date.now() + SNOOZE_DAYS * 24 * 60 * 60 * 1000).toISOString();
      const next = { ...prev, [`${alert.id}:${alert.severity}`]: until };
      writeMap(dismissedKey, next);
      return next;
    });
  }, [dismissedKey]);

  const toggleCategoryMute = useCallback((category: AlertCategory) => {
    setMutedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      writeCategorySet(mutedCategoriesKey, next);
      return next;
    });
  }, [mutedCategoriesKey]);

  return {
    alerts,
    criticalCount: alerts.filter(a => a.severity === 'critical').length,
    warningCount: alerts.filter(a => a.severity === 'warning').length,
    permission,
    requestPermission,
    dismissAlert,
    snoozeAlert,
    mutedCategories,
    toggleCategoryMute,
  };
}
