'use client';

import { useState, useMemo, useCallback } from 'react';
import { Bell, X, CheckCheck } from 'lucide-react';
import { Game, BudgetSettings } from '../lib/types';
import { getAlertFeed, AlertItem } from '../lib/calculations';
import { useGoals } from '../hooks/useGoals';
import { useAuthContext } from '@/lib/AuthContext';
import clsx from 'clsx';

const DISMISS_KEY = 'ga-alert-dismissed';
const DISMISS_HOURS = 24;

function readDismissed(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(DISMISS_KEY) || '{}');
  } catch {
    return {};
  }
}

function writeDismissed(map: Record<string, string>) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DISMISS_KEY, JSON.stringify(map));
}

interface NotificationCenterProps {
  games: Game[];
  budgets: BudgetSettings[];
  onOpenBacklogTriage: () => void;
  onGoToTab: (tab: string) => void;
  onOpenGame: (gameId: string) => void;
}

const SEVERITY_DOT: Record<AlertItem['severity'], string> = {
  high: 'bg-red-500',
  medium: 'bg-amber-500',
  low: 'bg-blue-500',
};

export function NotificationCenter({ games, budgets, onOpenBacklogTriage, onGoToTab, onOpenGame }: NotificationCenterProps) {
  const { user } = useAuthContext();
  const { goals } = useGoals(user?.uid ?? null);
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState<Record<string, string>>(() => readDismissed());

  const alerts = useMemo(() => {
    if (games.length === 0) return [];
    const now = Date.now();
    return getAlertFeed(games, budgets, goals).filter(a => {
      const until = dismissed[a.id];
      return !until || new Date(until).getTime() < now;
    });
  }, [games, budgets, goals, dismissed]);

  const dismiss = useCallback((id: string) => {
    const next = { ...dismissed, [id]: new Date(Date.now() + DISMISS_HOURS * 60 * 60 * 1000).toISOString() };
    writeDismissed(next);
    setDismissed(next);
  }, [dismissed]);

  const dismissAll = useCallback(() => {
    const until = new Date(Date.now() + DISMISS_HOURS * 60 * 60 * 1000).toISOString();
    const next = { ...dismissed };
    alerts.forEach(a => { next[a.id] = until; });
    writeDismissed(next);
    setDismissed(next);
  }, [alerts, dismissed]);

  const handleAction = useCallback((alert: AlertItem) => {
    if (alert.category === 'backlog') {
      onOpenBacklogTriage();
    } else if (alert.category === 'queue' || alert.category === 'milestone') {
      if (alert.gameId) onOpenGame(alert.gameId);
    } else {
      onGoToTab('stats');
    }
    setOpen(false);
  }, [onOpenBacklogTriage, onOpenGame, onGoToTab]);

  const highestSeverity = alerts.some(a => a.severity === 'high') ? 'high' : alerts.some(a => a.severity === 'medium') ? 'medium' : alerts.length > 0 ? 'low' : null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className={clsx(
          'relative flex items-center gap-1.5 px-2.5 py-2 rounded-lg transition-all text-sm',
          open ? 'bg-white/10 text-white' : 'bg-white/5 text-white/60 hover:text-white/80'
        )}
        title="Notifications"
        aria-label="Notifications"
      >
        <Bell size={14} />
        {alerts.length > 0 && (
          <span
            className={clsx(
              'absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full text-[10px] font-semibold text-white flex items-center justify-center',
              highestSeverity === 'high' ? 'bg-red-500' : highestSeverity === 'medium' ? 'bg-amber-500' : 'bg-blue-500'
            )}
          >
            {alerts.length > 9 ? '9+' : alerts.length}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 w-80 max-h-[70vh] overflow-y-auto rounded-xl border border-white/10 bg-[#15151c] shadow-2xl">
            <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-white/5 sticky top-0 bg-[#15151c]">
              <h3 className="text-sm font-semibold text-white">Notifications</h3>
              {alerts.length > 0 && (
                <button
                  onClick={dismissAll}
                  className="flex items-center gap-1 text-[11px] text-white/40 hover:text-white/70 transition-colors"
                >
                  <CheckCheck size={12} /> Clear all
                </button>
              )}
            </div>

            {alerts.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-white/50">You&apos;re all caught up.</p>
                <p className="text-xs text-white/30 mt-1">No budget, queue, or goal alerts right now.</p>
              </div>
            ) : (
              <div className="py-1">
                {alerts.map(alert => (
                  <div key={alert.id} className="flex gap-2.5 px-3.5 py-3 border-b border-white/5 last:border-0 group">
                    <span className={clsx('w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0', SEVERITY_DOT[alert.severity])} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-1.5">
                        <span className="text-sm flex-shrink-0">{alert.icon}</span>
                        <p className="text-[13px] font-medium text-white leading-snug">{alert.title}</p>
                      </div>
                      <p className="text-[12px] text-white/50 leading-snug mt-0.5">{alert.message}</p>
                      <button
                        onClick={() => handleAction(alert)}
                        className="text-[11px] text-purple-400 hover:text-purple-300 font-medium mt-1.5 transition-colors"
                      >
                        {alert.actionLabel} →
                      </button>
                    </div>
                    <button
                      onClick={() => dismiss(alert.id)}
                      className="text-white/30 hover:text-white/70 transition-colors flex-shrink-0"
                      aria-label="Dismiss"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
