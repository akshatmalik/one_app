'use client';

import { useMemo, useState } from 'react';
import { Zap, ChevronDown, ChevronUp, TrendingUp, Star, Target, Clock } from 'lucide-react';
import { Game } from '../lib/types';
import { getValueUnlockData, ValueUnlockItem, ValueTier } from '../lib/calculations';
import clsx from 'clsx';

interface ValueUnlockProps {
  games: Game[];
}

const TIER_META: Record<ValueTier, { label: string; color: string; bg: string; border: string }> = {
  Excellent: { label: 'Excellent', color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.25)' },
  Good:      { label: 'Good',      color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.25)' },
  Fair:      { label: 'Fair',      color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)' },
  Poor:      { label: 'Poor',      color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.25)'  },
  Unplayed:  { label: 'Unplayed',  color: '#6b7280', bg: 'rgba(107,114,128,0.1)', border: 'rgba(107,114,128,0.2)' },
};

function TierBadge({ tier, small }: { tier: ValueTier; small?: boolean }) {
  const m = TIER_META[tier];
  return (
    <span
      className={clsx('rounded-md font-medium', small ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5')}
      style={{ color: m.color, background: m.bg, border: `1px solid ${m.border}` }}
    >
      {m.label}
    </span>
  );
}

function ProgressBar({ percent, tier }: { percent: number; tier: ValueTier }) {
  const color = TIER_META[tier].color;
  return (
    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${Math.min(percent, 100)}%`, backgroundColor: color }}
      />
    </div>
  );
}

function GameValueRow({ item, rank }: { item: ValueUnlockItem; rank?: number }) {
  const nextMeta = item.nextTierName ? TIER_META[item.nextTierName] : null;
  const hours = item.hoursToNextTier;

  return (
    <div className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-xl border border-white/5 hover:border-white/10 transition-all">
      {/* Rank number */}
      {rank !== undefined && (
        <span className="text-[11px] font-bold text-white/20 w-4 shrink-0 text-center">{rank}</span>
      )}

      {/* Thumbnail */}
      <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/5 shrink-0">
        {item.game.thumbnail ? (
          <img src={item.game.thumbnail} alt="" className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/20 text-lg">🎮</div>
        )}
      </div>

      {/* Main info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-sm font-medium text-white/80 truncate">{item.game.name}</span>
          {item.isQuickWin && (
            <span className="shrink-0 text-[10px] font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-1.5 py-0.5 rounded-full">
              QUICK WIN
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 mb-1.5">
          <TierBadge tier={item.currentTier} small />
          {nextMeta && hours !== null && (
            <>
              <span className="text-white/20 text-[10px]">→</span>
              <TierBadge tier={item.nextTierName!} small />
            </>
          )}
        </div>

        {hours !== null && (
          <ProgressBar percent={item.progressPercent} tier={item.currentTier} />
        )}
      </div>

      {/* Right: hours needed */}
      {hours !== null && nextMeta ? (
        <div className="shrink-0 text-right">
          <div className="text-sm font-bold" style={{ color: nextMeta.color }}>
            {hours < 1 ? `${Math.round(hours * 60)}m` : `${hours}h`}
          </div>
          <div className="text-[10px] text-white/30">to {nextMeta.label}</div>
        </div>
      ) : item.currentTier === 'Excellent' ? (
        <div className="shrink-0">
          <Star size={16} className="text-emerald-400" />
        </div>
      ) : null}
    </div>
  );
}

export function ValueUnlock({ games }: ValueUnlockProps) {
  const [showAll, setShowAll] = useState(false);

  const data = useMemo(() => getValueUnlockData(games), [games]);

  const owned = games.filter(g => g.status !== 'Wishlist' && g.price > 0);
  if (owned.length < 2) return null;

  const hasQuickWins = data.quickWins.length > 0;
  const hasExcellent = data.alreadyExcellent.length > 0;

  const displayInProgress = showAll ? data.inProgress : data.inProgress.slice(0, 3);

  const improvementPct = data.currentLibraryCph > 0
    ? Math.round(((data.currentLibraryCph - data.projectedLibraryCph) / data.currentLibraryCph) * 100)
    : 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-white/50 flex items-center gap-2">
          <Zap size={14} className="text-amber-400" />
          Value Unlock
        </h3>
        {data.currentLibraryCph > 0 && (
          <span className="text-xs text-white/30">
            Library avg: <span className="text-white/60 font-medium">${data.currentLibraryCph}/hr</span>
          </span>
        )}
      </div>

      {/* Hero: Library value improvement card */}
      {hasQuickWins && data.libraryImprovement > 0 && (
        <div className="p-4 bg-gradient-to-br from-amber-500/10 to-emerald-500/10 border border-amber-500/15 rounded-xl">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-400/10 rounded-lg shrink-0">
              <TrendingUp size={16} className="text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white/90">
                {data.totalQuickWinHours}h unlocks better library value
              </p>
              <p className="text-xs text-white/50 mt-0.5">
                Playing your {data.quickWins.length} quick win{data.quickWins.length !== 1 ? 's' : ''} drops
                your avg from{' '}
                <span className="text-white/70 font-medium">${data.currentLibraryCph}/hr</span>
                {' '}→{' '}
                <span className="text-emerald-400 font-medium">${data.projectedLibraryCph}/hr</span>
                {improvementPct > 0 && (
                  <span className="text-emerald-400"> ({improvementPct}% better)</span>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Wins */}
      {hasQuickWins && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Target size={12} className="text-amber-400" />
            <span className="text-xs text-white/40 font-medium">Quick Wins — under 3 hours away</span>
          </div>
          <div className="space-y-2">
            {data.quickWins.map((item, i) => (
              <GameValueRow key={item.game.id} item={item} rank={i + 1} />
            ))}
          </div>
        </div>
      )}

      {/* In Progress unlocks */}
      {data.inProgress.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Clock size={12} className="text-blue-400" />
            <span className="text-xs text-white/40 font-medium">Longer Journey</span>
          </div>
          <div className="space-y-2">
            {displayInProgress.map((item, i) => (
              <GameValueRow key={item.game.id} item={item} rank={i + 1} />
            ))}
          </div>
          {data.inProgress.length > 3 && (
            <button
              onClick={() => setShowAll(v => !v)}
              className="mt-2 flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors w-full justify-center py-1"
            >
              {showAll ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {showAll ? 'Show less' : `Show ${data.inProgress.length - 3} more`}
            </button>
          )}
        </div>
      )}

      {/* Already Excellent — celebrate wins */}
      {hasExcellent && (
        <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <Star size={12} className="text-emerald-400" />
            <span className="text-xs text-emerald-400/80 font-medium">
              Excellent Value — {data.alreadyExcellent.length} game{data.alreadyExcellent.length !== 1 ? 's' : ''} mastered
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {data.alreadyExcellent.slice(0, 6).map(item => (
              <div key={item.game.id} className="flex items-center gap-1.5 px-2 py-1 bg-emerald-500/10 rounded-lg border border-emerald-500/15">
                {item.game.thumbnail && (
                  <img src={item.game.thumbnail} alt="" className="w-4 h-4 rounded object-cover" loading="lazy" />
                )}
                <span className="text-[11px] text-emerald-300/80 truncate max-w-[100px]">{item.game.name}</span>
                <span className="text-[10px] text-emerald-400/60">${item.currentCph}/hr</span>
              </div>
            ))}
            {data.alreadyExcellent.length > 6 && (
              <span className="text-[11px] text-white/30 px-2 py-1">+{data.alreadyExcellent.length - 6} more</span>
            )}
          </div>
        </div>
      )}

      {/* Empty state: everything is already excellent */}
      {!hasQuickWins && data.inProgress.length === 0 && hasExcellent && (
        <div className="text-center py-4 text-white/30 text-sm">
          🏆 Your whole library is Excellent value — you&apos;re doing great!
        </div>
      )}
    </div>
  );
}
