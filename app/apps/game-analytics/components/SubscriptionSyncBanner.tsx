'use client';

import { useEffect, useState } from 'react';
import { Gift, X, ArrowRight } from 'lucide-react';
import {
  loadSubscriptionSettings,
  saveSubscriptionSettings,
  hasNewDrop,
  latestAvailableMonth,
  monthLabel,
} from '../lib/subscription-settings';

interface SubscriptionSyncBannerProps {
  userId: string | null;
  /** Change this (e.g. pass the active tab) to make the banner re-read settings. */
  recheckKey?: string | number;
  /** Open the PS Plus panel in Discover. */
  onOpen: () => void;
}

/**
 * Subtle "new month's PS Plus games are out" nudge. Purely settings-driven —
 * shows when tracking is enabled and the latest available drop hasn't been
 * synced (and the user hasn't dismissed this month's nudge).
 */
export function SubscriptionSyncBanner({ userId, recheckKey, onOpen }: SubscriptionSyncBannerProps) {
  const [show, setShow] = useState(false);
  const [month, setMonth] = useState('');

  useEffect(() => {
    const s = loadSubscriptionSettings(userId || '');
    setShow(hasNewDrop(s));
    setMonth(latestAvailableMonth());
  }, [userId, recheckKey]);

  if (!show) return null;

  const dismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    const s = loadSubscriptionSettings(userId || '');
    if (!s.dismissedMonths.includes(month)) {
      saveSubscriptionSettings(userId || '', { ...s, dismissedMonths: [...s.dismissedMonths, month] });
    }
    setShow(false);
  };

  return (
    <div
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') onOpen(); }}
      className="mb-4 flex items-center gap-3 bg-gradient-to-r from-indigo-500/10 to-blue-500/10 border border-indigo-500/15 rounded-xl px-4 py-3 cursor-pointer hover:from-indigo-500/15 hover:to-blue-500/15 transition-all"
    >
      <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center shrink-0">
        <Gift size={15} className="text-indigo-300" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-white font-medium">{monthLabel(month)}&apos;s PS Plus games are out</div>
        <div className="text-[11px] text-white/40">Find this month&apos;s free games and add the ones you want</div>
      </div>
      <div className="flex items-center gap-1 text-indigo-300/80 text-xs font-medium shrink-0">
        Find them <ArrowRight size={13} />
      </div>
      <button onClick={dismiss} className="text-white/20 hover:text-white/50 transition-colors shrink-0" title="Dismiss">
        <X size={14} />
      </button>
    </div>
  );
}
