'use client';

import { useState } from 'react';
import clsx from 'clsx';
import { Bell, BellOff, BellRing } from 'lucide-react';
import { SmartAlert, AlertSeverity } from '../lib/alerts';
import { NotificationSupport } from '../hooks/useSmartAlerts';

interface AlertsCenterProps {
  alerts: SmartAlert[];
  enabled: boolean;
  onSetEnabled: (next: boolean) => void;
  permission: NotificationSupport;
  onViewGame?: (gameId: string) => void;
}

const SEVERITY_STYLES: Record<AlertSeverity, string> = {
  critical: 'border-red-500/30 bg-red-500/10',
  warning: 'border-amber-500/30 bg-amber-500/10',
  info: 'border-white/10 bg-white/5',
};

export function AlertsCenter({ alerts, enabled, onSetEnabled, permission, onViewGame }: AlertsCenterProps) {
  const [open, setOpen] = useState(false);
  const urgentCount = alerts.filter(a => a.severity === 'critical').length;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative flex items-center gap-2 px-3 py-2 bg-white/5 text-white/60 hover:text-white/80 rounded-lg transition-all text-sm"
        title="Smart Alerts"
        aria-label="Smart Alerts"
      >
        <Bell size={16} />
        {urgentCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
            {urgentCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 w-80 max-h-[70vh] overflow-y-auto rounded-xl border border-white/10 bg-[#15151c] shadow-2xl py-2">
            <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
              <span className="text-xs font-semibold text-white/50 uppercase tracking-wide">Smart Alerts</span>
              <button
                onClick={() => onSetEnabled(!enabled)}
                disabled={permission === 'unsupported' || permission === 'denied'}
                className={clsx(
                  'flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium transition-all',
                  enabled ? 'bg-purple-500/20 text-purple-300' : 'bg-white/5 text-white/40 hover:text-white/60',
                  (permission === 'unsupported' || permission === 'denied') && 'opacity-40 cursor-not-allowed'
                )}
                title={
                  permission === 'unsupported'
                    ? 'Notifications are not supported in this browser'
                    : permission === 'denied'
                    ? 'Notifications are blocked in your browser settings'
                    : enabled
                    ? 'Turn off desktop notifications'
                    : 'Turn on desktop notifications'
                }
              >
                {enabled ? <BellRing size={12} /> : <BellOff size={12} />}
                {enabled ? 'On' : 'Off'}
              </button>
            </div>

            {permission === 'denied' && (
              <p className="px-4 py-2 text-[11px] text-amber-400/80">
                Notifications are blocked. Enable them in your browser&apos;s site settings to get desktop alerts.
              </p>
            )}

            {alerts.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-white/30">All quiet — no alerts right now.</p>
            ) : (
              <div className="py-1">
                {alerts.map(alert => (
                  <div
                    key={alert.id}
                    className={clsx(
                      'mx-2 my-1 rounded-lg border px-3 py-2.5',
                      SEVERITY_STYLES[alert.severity]
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-base leading-none mt-0.5">{alert.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white/90 leading-snug">{alert.title}</p>
                        {alert.body && (
                          <p className="text-xs text-white/50 mt-0.5 leading-snug">{alert.body}</p>
                        )}
                        {alert.gameId && onViewGame && (
                          <button
                            onClick={() => { onViewGame(alert.gameId!); setOpen(false); }}
                            className="mt-1.5 text-[11px] font-medium text-purple-300 hover:text-purple-200"
                          >
                            View game →
                          </button>
                        )}
                      </div>
                    </div>
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
