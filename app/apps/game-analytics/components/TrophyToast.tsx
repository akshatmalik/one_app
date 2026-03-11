'use client';

import { useEffect, useState } from 'react';
import { TrophyTierLevel } from '../lib/trophy-definitions';

interface TrophyToastProps {
  name: string;
  icon: string;
  tier: TrophyTierLevel | 'milestone';
  isUpgrade: boolean;
  onDismiss: () => void;
}

const TIER_STYLES: Record<string, { bg: string; border: string; text: string; label: string }> = {
  bronze: { bg: 'from-amber-900/90 to-amber-800/90', border: 'border-amber-600', text: 'text-amber-400', label: 'Bronze' },
  silver: { bg: 'from-gray-700/90 to-gray-600/90', border: 'border-gray-400', text: 'text-gray-300', label: 'Silver' },
  gold: { bg: 'from-yellow-900/90 to-yellow-800/90', border: 'border-yellow-500', text: 'text-yellow-400', label: 'Gold' },
  platinum: { bg: 'from-cyan-900/90 to-cyan-800/90', border: 'border-cyan-400', text: 'text-cyan-300', label: 'Platinum' },
  milestone: { bg: 'from-purple-900/90 to-purple-800/90', border: 'border-purple-400', text: 'text-purple-300', label: 'Milestone' },
};

export function TrophyToast({ name, icon, tier, isUpgrade, onDismiss }: TrophyToastProps) {
  const [visible, setVisible] = useState(false);
  const style = TIER_STYLES[tier] || TIER_STYLES.bronze;

  useEffect(() => {
    // Animate in
    const showTimer = setTimeout(() => setVisible(true), 50);

    // Auto-dismiss after 4 seconds
    const hideTimer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 300);
    }, 4000);

    return () => { clearTimeout(showTimer); clearTimeout(hideTimer); };
  }, [onDismiss]);

  return (
    <div
      className={`
        fixed top-4 left-1/2 -translate-x-1/2 z-[9999]
        transition-all duration-300 ease-out
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}
      `}
    >
      <button
        onClick={() => { setVisible(false); setTimeout(onDismiss, 300); }}
        className={`
          flex items-center gap-3 px-5 py-3 rounded-xl
          bg-gradient-to-r ${style.bg} border ${style.border}
          backdrop-blur-xl shadow-2xl shadow-black/50
          trophy-toast-shine cursor-pointer
          hover:scale-105 transition-transform
        `}
      >
        <span className="text-2xl trophy-toast-bounce">{icon}</span>
        <div>
          <div className="text-[10px] uppercase tracking-wider font-bold text-white/50">
            {isUpgrade ? `Upgraded to ${style.label}!` : 'Trophy Earned!'}
          </div>
          <div className="text-sm font-semibold text-white">{name}</div>
          <div className={`text-[10px] font-bold uppercase ${style.text}`}>
            {style.label}
          </div>
        </div>
        <div className="trophy-toast-sparkle ml-2">✨</div>
      </button>
    </div>
  );
}
