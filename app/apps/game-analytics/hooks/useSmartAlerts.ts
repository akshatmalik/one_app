'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Game, BudgetSettings } from '../lib/types';
import { getSmartAlerts, SmartAlert } from '../lib/alerts';

const ENABLED_KEY = 'game-analytics-alerts-enabled';
const NOTIFIED_KEY = 'game-analytics-alerts-notified';
// Only push an OS notification for alerts urgent enough to interrupt the user
const NOTIFY_PRIORITY_THRESHOLD = 55;

type NotifiedLog = Record<string, string>; // alertId -> ISO date last notified

function storageKey(base: string, userId: string) {
  return `${base}-${userId || 'local-user'}`;
}

function loadEnabled(userId: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(storageKey(ENABLED_KEY, userId)) === 'true';
  } catch { return false; }
}

function loadNotifiedLog(userId: string): NotifiedLog {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(storageKey(NOTIFIED_KEY, userId));
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveNotifiedLog(userId: string, log: NotifiedLog) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(storageKey(NOTIFIED_KEY, userId), JSON.stringify(log));
  } catch { /* ignore quota errors */ }
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export type NotificationSupport = 'unsupported' | 'denied' | 'default' | 'granted';

export function useSmartAlerts(games: Game[], budgets: BudgetSettings[], userId: string | null) {
  const uid = userId || '';
  const alerts = useMemo<SmartAlert[]>(() => getSmartAlerts(games, budgets), [games, budgets]);

  const [enabled, setEnabled] = useState(false);
  const [permission, setPermission] = useState<NotificationSupport>('unsupported');
  const notifiedRef = useRef<NotifiedLog>({});

  // Load persisted preference + permission state on mount / user change
  useEffect(() => {
    setEnabled(loadEnabled(uid));
    notifiedRef.current = loadNotifiedLog(uid);
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission as NotificationSupport);
    } else {
      setPermission('unsupported');
    }
  }, [uid]);

  const requestPermission = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported' as const;
    try {
      const result = await Notification.requestPermission();
      setPermission(result as NotificationSupport);
      return result;
    } catch {
      return permission;
    }
  }, [permission]);

  const setAlertsEnabled = useCallback(async (next: boolean) => {
    if (next && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      const result = await requestPermission();
      if (result !== 'granted') {
        setEnabled(false);
        if (typeof window !== 'undefined') {
          localStorage.setItem(storageKey(ENABLED_KEY, uid), 'false');
        }
        return;
      }
    }
    setEnabled(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey(ENABLED_KEY, uid), String(next));
    }
  }, [uid, requestPermission]);

  // Fire OS notifications for new, urgent, not-yet-notified-today alerts
  useEffect(() => {
    if (!enabled) return;
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    const today = todayStr();
    const log = { ...notifiedRef.current };
    let changed = false;

    for (const alert of alerts) {
      if (alert.priority < NOTIFY_PRIORITY_THRESHOLD) continue;
      if (log[alert.id] === today) continue;

      try {
        new Notification(alert.title, {
          body: alert.body || undefined,
          tag: alert.id,
        });
      } catch { /* notifications can fail silently (e.g. permission revoked mid-session) */ }

      log[alert.id] = today;
      changed = true;
    }

    if (changed) {
      notifiedRef.current = log;
      saveNotifiedLog(uid, log);
    }
  }, [alerts, enabled, uid]);

  return {
    alerts,
    enabled,
    setAlertsEnabled,
    permission,
    requestPermission,
    urgentCount: alerts.filter(a => a.severity === 'critical').length,
  };
}
