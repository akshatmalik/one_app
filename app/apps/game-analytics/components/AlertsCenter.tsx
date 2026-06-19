'use client';

import { useState } from 'react';
import { Bell, BellRing, X, Clock3 } from 'lucide-react';
import clsx from 'clsx';
import { GameAlert, AlertSeverity } from '../lib/calculations';

const SEVERITY_STYLES: Record<AlertSeverity, { border: string; bg: string; text: string }> = {
  critical: { border: 'border-red-500/30', bg: 'bg-red-500/10', text: 'text-red-300' },
  warning: { border: 'border-amber-500/30', bg: 'bg-amber-500/10', text: 'text-amber-300' },
  info: { border: 'border-blue-500/30', bg: 'bg-blue-500/10', text: 'text-blue-300' },
};

interface AlertsCenterProps {
  alerts: GameAlert[];
  criticalCount: number;
  warningCount: number;
  permission: NotificationPermission | 'unsupported';
  onRequestPermission: () => void;
  onDismiss: (alert: GameAlert) => void;
  onSnooze: (alert: GameAlert) => void;
  onAction: (alert: GameAlert) => void;
}

export function AlertsCenter({
  alerts,
  criticalCount,
  warningCount,
  permission,
  onRequestPermission,
  onDismiss,
  onSnooze,
  onAction,
}: AlertsCenterProps) {
  const [open, setOpen] = useState(false);

  const badgeCount = criticalCount + warningCount;
  const hasAlerts = alerts.length > 0;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={clsx(
          'relative flex items-center gap-1.5 px-2.5 py-2 rounded-lg transition-all text-sm',
          hasAlerts ? 'bg-white/5 text-white/80 hover:text-white' : 'bg-white/5 text-white/60 hover:text-white/80'
        )}
        title="Alerts"
        aria-label="Alerts"
      >
        {criticalCount > 0 ? <BellRing size={16} className="text-red-400" /> : <Bell size={16} />}
        {badgeCount > 0 && (
          <span
            className={clsx(
              'absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold flex items-center justify-center',
              criticalCount > 0 ? 'bg-red-500 text-white' : 'bg-amber-500 text-black'
            )}
          >
            {badgeCount > 9 ? '9+' : badgeCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 w-[320px] max-w-[90vw] bg-[#1a1a2e] border border-white/10 rounded-xl shadow-2xl max-h-[70vh] overflow-y-auto">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
              <span className="text-sm font-semibold text-white">Alerts</span>
              <button onClick={() => setOpen(false)} className="text-white/40 hover:text-white/70">
                <X size={14} />
              </button>
            </div>

            {permission === 'default' && (
              <button
                onClick={onRequestPermission}
                className="w-full text-left px-4 py-2.5 text-[12px] text-purple-300 hover:bg-white/5 border-b border-white/5"
              >
                Enable desktop alerts for budget &amp; queue warnings →
              </button>
            )}

            {alerts.length === 0 ? (
              <div className="px-4 py-8 text-center text-white/40 text-sm">
                All clear. Nothing needs your attention right now.
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {alerts.map(alert => {
                  const style = SEVERITY_STYLES[alert.severity];
                  return (
                    <div key={`${alert.id}:${alert.severity}`} className={clsx('px-4 py-3', style.bg)}>
                      <div className="flex items-start gap-2">
                        <span className="text-base leading-none mt-0.5">{alert.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className={clsx('text-[13px] font-medium', style.text)}>{alert.title}</p>
                          <p className="text-[12px] text-white/60 mt-0.5">{alert.message}</p>
                          <div className="flex items-center gap-3 mt-2">
                            <button
                              onClick={() => { onAction(alert); setOpen(false); }}
                              className={clsx('text-[11px] font-medium px-2 py-1 rounded-md border', style.border, style.text, 'hover:opacity-80')}
                            >
                              {alert.actionLabel}
                            </button>
                            <button
                              onClick={() => onSnooze(alert)}
                              className="text-[11px] text-white/40 hover:text-white/70 flex items-center gap-1"
                              title="Snooze for a day"
                            >
                              <Clock3 size={11} /> Snooze
                            </button>
                            <button
                              onClick={() => onDismiss(alert)}
                              className="text-[11px] text-white/40 hover:text-white/70 ml-auto"
                            >
                              Dismiss
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
