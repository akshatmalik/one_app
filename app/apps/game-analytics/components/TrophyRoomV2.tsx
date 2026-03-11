'use client';

import { useState, useMemo } from 'react';
import {
  Trophy, Medal, ChevronDown, ChevronUp, Pin, PinOff, Lock, Search, Filter,
} from 'lucide-react';
import clsx from 'clsx';
import { TrophyProgress, TrophyScoreSummary } from '../lib/trophy-calculations';
import {
  TrophyCategory,
  TrophyTierLevel,
  TROPHY_CATEGORY_LABELS,
  TROPHY_CATEGORY_ICONS,
  TIER_ORDER,
} from '../lib/trophy-definitions';

interface TrophyRoomV2Props {
  trophies: TrophyProgress[];
  summary: TrophyScoreSummary;
  pinnedIds: string[];
  onTogglePin: (trophyId: string) => void;
}

const TIER_COLORS: Record<TrophyTierLevel, string> = {
  bronze: 'text-amber-600',
  silver: 'text-gray-300',
  gold: 'text-yellow-400',
  platinum: 'text-cyan-300',
};

const TIER_BG: Record<TrophyTierLevel, string> = {
  bronze: 'bg-amber-900/20 border-amber-700/30',
  silver: 'bg-gray-400/10 border-gray-400/20',
  gold: 'bg-yellow-500/10 border-yellow-500/20',
  platinum: 'bg-cyan-500/10 border-cyan-500/20',
};

const TIER_GLOW: Record<TrophyTierLevel, string> = {
  bronze: 'shadow-amber-800/20',
  silver: 'shadow-gray-400/20',
  gold: 'shadow-yellow-500/30',
  platinum: 'shadow-cyan-400/30',
};

type FilterMode = 'all' | 'earned' | 'locked' | TrophyCategory;

export function TrophyRoomV2({ trophies, summary, pinnedIds, onTogglePin }: TrophyRoomV2Props) {
  const [filter, setFilter] = useState<FilterMode>('all');
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = trophies;

    // Filter by mode
    if (filter === 'earned') list = list.filter(t => t.earned);
    else if (filter === 'locked') list = list.filter(t => !t.earned);
    else if (filter !== 'all') list = list.filter(t => t.definition.category === filter);

    // Search
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(t =>
        t.definition.name.toLowerCase().includes(q) ||
        t.definition.description.toLowerCase().includes(q)
      );
    }

    return list;
  }, [trophies, filter, search]);

  // Group by category
  const grouped = useMemo(() => {
    const groups: Record<string, TrophyProgress[]> = {};
    for (const t of filtered) {
      const cat = t.definition.category;
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(t);
    }
    // Sort within groups: earned first, then by progress
    for (const cat of Object.keys(groups)) {
      groups[cat].sort((a, b) => {
        if (a.earned && !b.earned) return -1;
        if (!a.earned && b.earned) return 1;
        // Among earned, sort by tier (higher first)
        if (a.earned && b.earned) {
          const aIdx = a.currentTier ? TIER_ORDER.indexOf(a.currentTier) : -1;
          const bIdx = b.currentTier ? TIER_ORDER.indexOf(b.currentTier) : -1;
          return bIdx - aIdx;
        }
        return b.progress - a.progress;
      });
    }
    return groups;
  }, [filtered]);

  const categoryOrder: TrophyCategory[] = ['grind', 'money', 'finisher', 'explorer', 'critic', 'personality', 'first', 'legend', 'secret'];

  return (
    <div className="space-y-4">
      {/* Header with score */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-white/50 flex items-center gap-2">
          <Trophy size={14} className="text-yellow-400" />
          Trophy Room
          <span className="text-yellow-400 font-bold">{summary.totalScore} pts</span>
        </h3>
        <span className="text-[10px] text-white/30">
          {summary.earnedCount}/{summary.totalCount} earned
        </span>
      </div>

      {/* Trophy Score Breakdown Bar */}
      <div className="h-2 bg-white/5 rounded-full overflow-hidden flex">
        {categoryOrder.map(cat => {
          const catData = summary.byCategory[cat];
          if (!catData || catData.earned === 0) return null;
          const width = (catData.earned / summary.totalCount) * 100;
          const colors: Record<string, string> = {
            grind: 'bg-orange-500', money: 'bg-emerald-500', finisher: 'bg-blue-500',
            explorer: 'bg-purple-500', critic: 'bg-yellow-500', personality: 'bg-pink-500',
            first: 'bg-red-500', legend: 'bg-amber-400', secret: 'bg-gray-400',
          };
          return (
            <div
              key={cat}
              className={`h-full ${colors[cat] || 'bg-white/20'}`}
              style={{ width: `${width}%` }}
              title={`${TROPHY_CATEGORY_LABELS[cat]}: ${catData.earned}/${catData.total}`}
            />
          );
        })}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 flex-wrap">
        {(['all', 'earned', 'locked'] as FilterMode[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={clsx(
              'px-2 py-1 text-[10px] rounded-md transition-colors capitalize',
              filter === f ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/50'
            )}
          >
            {f} {f === 'earned' ? `(${summary.earnedCount})` : f === 'locked' ? `(${summary.totalCount - summary.earnedCount})` : ''}
          </button>
        ))}
        <button
          onClick={() => setShowSearch(!showSearch)}
          className="px-2 py-1 text-white/30 hover:text-white/50 transition-colors ml-auto"
        >
          <Search size={12} />
        </button>
      </div>

      {/* Search */}
      {showSearch && (
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search trophies..."
          className="w-full px-3 py-1.5 text-xs bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/20 focus:outline-none focus:border-white/20"
          autoFocus
        />
      )}

      {/* Category Sections */}
      {categoryOrder.map(cat => {
        const catTrophies = grouped[cat];
        if (!catTrophies || catTrophies.length === 0) return null;

        const catData = summary.byCategory[cat];
        const isExpanded = expandedCategory === cat || filter === cat;
        const displayTrophies = isExpanded ? catTrophies : catTrophies.slice(0, 4);

        return (
          <div key={cat} className="border border-white/5 rounded-xl overflow-hidden">
            {/* Category Header */}
            <button
              onClick={() => setExpandedCategory(expandedCategory === cat ? null : cat)}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-white/[0.02] transition-colors"
            >
              <span className="text-sm">{TROPHY_CATEGORY_ICONS[cat]}</span>
              <span className="text-xs font-medium text-white/70 flex-1">{TROPHY_CATEGORY_LABELS[cat]}</span>
              {catData && (
                <span className="text-[10px] text-white/30">
                  {catData.earned}/{catData.total}
                </span>
              )}
              {isExpanded
                ? <ChevronUp size={12} className="text-white/20" />
                : <ChevronDown size={12} className="text-white/20" />
              }
            </button>

            {/* Trophy Grid */}
            <div className="px-3 pb-3">
              <div className="grid grid-cols-1 gap-2">
                {displayTrophies.map(t => (
                  <TrophyCard
                    key={t.definition.id}
                    trophy={t}
                    isPinned={pinnedIds.includes(t.definition.id)}
                    onTogglePin={() => onTogglePin(t.definition.id)}
                  />
                ))}
              </div>

              {!isExpanded && catTrophies.length > 4 && (
                <button
                  onClick={() => setExpandedCategory(cat)}
                  className="w-full mt-2 text-[10px] text-white/30 hover:text-white/50 flex items-center justify-center gap-1"
                >
                  <ChevronDown size={10} /> +{catTrophies.length - 4} more
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Trophy Card ──────────────────────────────────────────────

function TrophyCard({
  trophy, isPinned, onTogglePin,
}: {
  trophy: TrophyProgress;
  isPinned: boolean;
  onTogglePin: () => void;
}) {
  const { definition, earned, currentTier, nextTier, progress, points, currentValue } = trophy;
  const isSecret = definition.isSecret && !earned;

  return (
    <div
      className={clsx(
        'flex items-center gap-3 p-2.5 rounded-lg border transition-all',
        earned && currentTier ? TIER_BG[currentTier] : 'bg-white/[0.02] border-white/5',
        earned && currentTier ? `shadow-lg ${TIER_GLOW[currentTier]}` : '',
        !earned && 'opacity-60',
      )}
    >
      {/* Icon */}
      <div className={clsx(
        'w-9 h-9 rounded-lg flex items-center justify-center text-lg shrink-0',
        earned ? 'bg-white/10' : 'bg-white/5',
        !earned && 'grayscale',
      )}>
        {isSecret ? '❓' : definition.icon}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-white/80 truncate">
            {isSecret ? '???' : definition.name}
          </span>
          {earned && currentTier && (
            <span className={clsx('text-[9px] uppercase font-bold', TIER_COLORS[currentTier])}>
              {currentTier}
            </span>
          )}
          {earned && definition.isMilestone && (
            <span className="text-[9px] uppercase font-bold text-purple-400">✓</span>
          )}
        </div>
        <div className="text-[10px] text-white/40 truncate">
          {isSecret ? 'Keep playing to discover this trophy...' : definition.description}
        </div>

        {/* Progress bar for non-milestone locked trophies */}
        {!earned && !definition.isMilestone && !isSecret && (
          <div className="mt-1 flex items-center gap-2">
            <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-white/20 rounded-full transition-all"
                style={{ width: `${Math.max(progress, 2)}%` }}
              />
            </div>
            <span className="text-[9px] text-white/25 shrink-0">
              {nextTier ? `→ ${nextTier}` : ''}
            </span>
          </div>
        )}

        {/* Tier progress for earned non-maxed trophies */}
        {earned && nextTier && !definition.isMilestone && (
          <div className="mt-1 flex items-center gap-2">
            <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
              <div
                className={clsx('h-full rounded-full transition-all', currentTier === 'gold' ? 'bg-cyan-500/50' : currentTier === 'silver' ? 'bg-yellow-500/50' : 'bg-gray-400/50')}
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-[9px] text-white/25 shrink-0">→ {nextTier}</span>
          </div>
        )}
      </div>

      {/* Points + Pin */}
      <div className="flex flex-col items-end gap-1 shrink-0">
        {earned && points > 0 && (
          <span className="text-[10px] font-bold text-yellow-400/60">+{points}</span>
        )}
        {earned && (
          <button
            onClick={(e) => { e.stopPropagation(); onTogglePin(); }}
            className={clsx(
              'p-0.5 rounded transition-colors',
              isPinned ? 'text-yellow-400' : 'text-white/15 hover:text-white/30'
            )}
            title={isPinned ? 'Unpin from showcase' : 'Pin to showcase (max 5)'}
          >
            {isPinned ? <PinOff size={10} /> : <Pin size={10} />}
          </button>
        )}
      </div>
    </div>
  );
}
