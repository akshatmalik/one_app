'use client';

import { TrophyProgress } from '../lib/trophy-calculations';
import { TIER_POINTS, TrophyTierLevel } from '../lib/trophy-definitions';

interface TrophyShowcaseProps {
  pinnedTrophies: TrophyProgress[];
  totalScore: number;
  earnedCount: number;
  totalCount: number;
  onOpenTrophyRoom?: () => void;
}

const TIER_RING: Record<TrophyTierLevel, string> = {
  bronze: 'ring-amber-700/50',
  silver: 'ring-gray-400/50',
  gold: 'ring-yellow-500/50',
  platinum: 'ring-cyan-400/50',
};

const TIER_BG: Record<TrophyTierLevel, string> = {
  bronze: 'bg-amber-900/30',
  silver: 'bg-gray-500/20',
  gold: 'bg-yellow-500/20',
  platinum: 'bg-cyan-500/20',
};

export function TrophyShowcase({ pinnedTrophies, totalScore, earnedCount, totalCount, onOpenTrophyRoom }: TrophyShowcaseProps) {
  if (earnedCount === 0) return null;

  return (
    <button
      onClick={onOpenTrophyRoom}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 transition-colors group"
      title={`${earnedCount}/${totalCount} trophies earned — ${totalScore} points`}
    >
      {/* Trophy Score */}
      <div className="flex items-center gap-1">
        <span className="text-sm">🏆</span>
        <span className="text-xs font-bold text-yellow-400 group-hover:text-yellow-300 transition-colors">
          {totalScore}
        </span>
      </div>

      {/* Pinned Trophies */}
      {pinnedTrophies.length > 0 && (
        <div className="flex items-center -space-x-1 ml-1">
          {pinnedTrophies.slice(0, 5).map(t => (
            <div
              key={t.definition.id}
              className={`
                w-6 h-6 rounded-full flex items-center justify-center text-xs
                ring-1 ${t.currentTier ? TIER_RING[t.currentTier] : ''} ${t.currentTier ? TIER_BG[t.currentTier] : 'bg-white/5'}
              `}
              title={`${t.definition.name} (${t.currentTier})`}
            >
              {t.definition.icon}
            </div>
          ))}
        </div>
      )}

      {/* Count badge */}
      <span className="text-[10px] text-white/30 ml-1">
        {earnedCount}/{totalCount}
      </span>
    </button>
  );
}
