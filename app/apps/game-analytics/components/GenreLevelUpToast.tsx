'use client';

import { useEffect, useState } from 'react';
import { GenreRankTitle } from '../lib/calculations';

interface GenreLevelUpToastProps {
  genre: string;
  level: number;
  rank: GenreRankTitle;
  isMainClass: boolean;
  isRankUp: boolean;
  stacked?: boolean;
  onDismiss: () => void;
}

const RANK_COLORS: Record<GenreRankTitle, string> = {
  Novice: '#9ca3af',
  Apprentice: '#22c55e',
  Adept: '#3b82f6',
  Expert: '#a855f7',
  Master: '#f59e0b',
  Legend: '#f43f5e',
};

export function GenreLevelUpToast({ genre, level, rank, isMainClass, isRankUp, stacked, onDismiss }: GenreLevelUpToastProps) {
  const [visible, setVisible] = useState(false);
  const color = RANK_COLORS[rank] ?? '#9ca3af';

  useEffect(() => {
    const showTimer = setTimeout(() => setVisible(true), 50);

    const hideTimer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 300);
    }, 4000);

    return () => { clearTimeout(showTimer); clearTimeout(hideTimer); };
  }, [onDismiss]);

  return (
    <div
      className={`
        fixed left-1/2 -translate-x-1/2 z-[9999]
        transition-all duration-300 ease-out
        ${stacked ? 'top-20' : 'top-4'}
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}
      `}
    >
      <button
        onClick={() => { setVisible(false); setTimeout(onDismiss, 300); }}
        className="flex items-center gap-3 px-5 py-3 rounded-xl bg-gradient-to-r from-rose-900/90 to-amber-800/90 border backdrop-blur-xl shadow-2xl shadow-black/50 trophy-toast-shine cursor-pointer hover:scale-105 transition-transform"
        style={{ borderColor: color }}
      >
        <span className="text-2xl trophy-toast-bounce">{isMainClass ? '👑' : '⚔️'}</span>
        <div>
          <div className="text-[10px] uppercase tracking-wider font-bold text-white/50">
            {isRankUp ? `Reached ${rank}!` : 'Level Up!'}
          </div>
          <div className="text-sm font-semibold text-white">{genre} — Level {level}</div>
          {isMainClass && (
            <div className="text-[10px] font-bold uppercase" style={{ color }}>Main Class</div>
          )}
        </div>
        <div className="trophy-toast-sparkle ml-2">✨</div>
      </button>
    </div>
  );
}
