'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  FlaskConical,
  RotateCcw,
  X,
  Search,
  TrendingUp,
  TrendingDown,
  Minus,
  DollarSign,
  Clock,
  CheckCircle,
  CreditCard,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Game } from '../lib/types';
import { getTotalHours, getGamingCreditScore } from '../lib/calculations';
import clsx from 'clsx';

interface WhatIfLabProps {
  games: Game[];
}

interface SimStats {
  totalSpent: number;
  avgCostPerHour: number;
  completionRate: number;
  creditScore: number;
  creditLabel: string;
  creditColor: string;
  gameCount: number;
}

type PresetKey = 'no-regrets' | '7plus-only' | 'skip-freebies' | 'clear-backlog' | null;

function computeSimStats(allGames: Game[], removedIds: Set<string>, backlogHours: boolean): SimStats {
  const owned = allGames.filter(g => g.status !== 'Wishlist');
  const simGames = owned.filter(g => !removedIds.has(g.id));

  // For backlog mode, synthesise games with added hours
  const effectiveGames: Game[] = backlogHours
    ? simGames.map(g => {
        if (g.status === 'Not Started') {
          const totalH = getTotalHours(g);
          return { ...g, hours: Math.max(20, totalH) };
        }
        return g;
      })
    : simGames;

  const totalSpent = effectiveGames.reduce((s, g) => s + g.price, 0);

  const paidPlayed = effectiveGames.filter(g => g.price > 0 && getTotalHours(g) > 0);
  const avgCostPerHour =
    paidPlayed.length > 0
      ? paidPlayed.reduce((s, g) => s + g.price / getTotalHours(g), 0) / paidPlayed.length
      : 0;

  const started = effectiveGames.filter(g => g.status !== 'Not Started');
  const completed = effectiveGames.filter(g => g.status === 'Completed');
  const completionRate = started.length > 0 ? (completed.length / started.length) * 100 : 0;

  const scoreData = getGamingCreditScore(effectiveGames);

  return {
    totalSpent,
    avgCostPerHour,
    completionRate,
    creditScore: scoreData.score,
    creditLabel: scoreData.label,
    creditColor: scoreData.color,
    gameCount: effectiveGames.length,
  };
}

function getPresetIds(games: Game[], preset: PresetKey): Set<string> {
  const owned = games.filter(g => g.status !== 'Wishlist');
  switch (preset) {
    case 'no-regrets': {
      // Expensive games with almost no hours AND low rating
      const ids = owned
        .filter(g => {
          const h = getTotalHours(g);
          const isRegret = g.price > 25 && h < 3 && (g.rating === 0 || g.rating <= 5);
          return isRegret;
        })
        .map(g => g.id);
      return new Set(ids);
    }
    case '7plus-only': {
      const ids = owned
        .filter(g => g.rating > 0 && g.rating < 7)
        .map(g => g.id);
      return new Set(ids);
    }
    case 'skip-freebies': {
      const ids = owned.filter(g => g.acquiredFree).map(g => g.id);
      return new Set(ids);
    }
    default:
      return new Set();
  }
}

function DeltaBadge({
  value,
  positive,
  prefix = '',
  suffix = '',
  invert = false,
}: {
  value: number;
  positive: boolean;
  prefix?: string;
  suffix?: string;
  invert?: boolean;
}) {
  if (Math.abs(value) < 0.001) {
    return (
      <span className="flex items-center gap-0.5 text-white/30 text-xs">
        <Minus size={10} /> no change
      </span>
    );
  }
  const isGood = invert ? !positive : positive;
  return (
    <span
      className={clsx(
        'flex items-center gap-0.5 text-xs font-medium',
        isGood ? 'text-emerald-400' : 'text-red-400'
      )}
    >
      {isGood ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
      {prefix}{Math.abs(value).toFixed(value < 10 ? 2 : 0)}{suffix}
    </span>
  );
}

const PRESETS: { key: PresetKey; label: string; emoji: string; description: string }[] = [
  {
    key: 'no-regrets',
    label: 'No Regrets',
    emoji: '🧹',
    description: 'Remove games you paid $25+ for but barely played (< 3h, rated ≤ 5)',
  },
  {
    key: '7plus-only',
    label: '7+ Only',
    emoji: '⭐',
    description: 'Remove all games you rated below 7/10',
  },
  {
    key: 'skip-freebies',
    label: 'Skip Freebies',
    emoji: '🎁',
    description: 'Remove subscription / free games from the calculation',
  },
  {
    key: 'clear-backlog',
    label: 'Clear Backlog',
    emoji: '📦',
    description: 'Simulate completing all unplayed games (adds 20h each)',
  },
];

export function WhatIfLab({ games }: WhatIfLabProps) {
  const [activePreset, setActivePreset] = useState<PresetKey>(null);
  const [customRemovedIds, setCustomRemovedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [showPicker, setShowPicker] = useState(false);

  const owned = useMemo(() => games.filter(g => g.status !== 'Wishlist'), [games]);

  const presetRemovedIds = useMemo(
    () => (activePreset && activePreset !== 'clear-backlog' ? getPresetIds(games, activePreset) : new Set<string>()),
    [games, activePreset]
  );

  const allRemovedIds = useMemo(() => {
    const merged = new Set(presetRemovedIds);
    customRemovedIds.forEach(id => merged.add(id));
    return merged;
  }, [presetRemovedIds, customRemovedIds]);

  const backlogMode = activePreset === 'clear-backlog';

  const currentStats = useMemo(() => computeSimStats(games, new Set(), false), [games]);
  const simStats = useMemo(
    () => computeSimStats(games, allRemovedIds, backlogMode),
    [games, allRemovedIds, backlogMode]
  );

  const removedGames = useMemo(
    () => owned.filter(g => allRemovedIds.has(g.id)),
    [owned, allRemovedIds]
  );

  const pickerGames = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return owned
      .filter(g => !presetRemovedIds.has(g.id)) // don't show preset-removed in picker
      .filter(g => !q || g.name.toLowerCase().includes(q) || (g.genre?.toLowerCase().includes(q)));
  }, [owned, presetRemovedIds, searchQuery]);

  const toggleCustomGame = useCallback((id: string) => {
    setCustomRemovedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handlePreset = (key: PresetKey) => {
    if (activePreset === key) {
      setActivePreset(null);
    } else {
      setActivePreset(key);
    }
    setCustomRemovedIds(new Set());
  };

  const resetAll = () => {
    setActivePreset(null);
    setCustomRemovedIds(new Set());
    setSearchQuery('');
  };

  const hasChanges = allRemovedIds.size > 0 || backlogMode;
  const spentDelta = currentStats.totalSpent - simStats.totalSpent;
  const cphDelta = currentStats.avgCostPerHour - simStats.avgCostPerHour;
  const compDelta = simStats.completionRate - currentStats.completionRate;
  const scoreDelta = simStats.creditScore - currentStats.creditScore;

  if (owned.length < 3) return null;

  return (
    <div className="p-4 bg-gradient-to-br from-violet-500/5 to-indigo-500/5 border border-violet-500/15 rounded-xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FlaskConical size={16} className="text-violet-400" />
          <h4 className="text-sm font-semibold text-white">What-If Lab</h4>
          <span className="text-[10px] text-white/30 bg-violet-500/10 border border-violet-500/20 px-1.5 py-0.5 rounded-full">
            interactive
          </span>
        </div>
        {hasChanges && (
          <button
            onClick={resetAll}
            className="flex items-center gap-1 text-xs text-white/40 hover:text-white/60 transition-colors"
          >
            <RotateCcw size={11} />
            Reset
          </button>
        )}
      </div>

      <p className="text-xs text-white/40 leading-relaxed">
        Remove games from your universe and watch your stats shift in real-time.
        <span className="text-violet-400"> Pick a scenario below</span> or custom-select games.
      </p>

      {/* Preset Buttons */}
      <div className="grid grid-cols-2 gap-2">
        {PRESETS.map(p => (
          <button
            key={p.key}
            onClick={() => handlePreset(p.key)}
            title={p.description}
            className={clsx(
              'flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium transition-all text-left',
              activePreset === p.key
                ? 'bg-violet-500/25 border border-violet-400/40 text-white'
                : 'bg-white/[0.03] border border-white/8 text-white/60 hover:text-white/80 hover:bg-white/[0.06]'
            )}
          >
            <span className="text-base leading-none">{p.emoji}</span>
            <span>{p.label}</span>
            {activePreset === p.key && (
              <span className="ml-auto text-violet-400">
                <Sparkles size={10} />
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Before / After Stats Grid */}
      {hasChanges && (
        <div className="space-y-2">
          <div className="text-[10px] text-white/30 uppercase tracking-wider">Impact on your library</div>
          <div className="grid grid-cols-2 gap-2">

            {/* Total Spent */}
            <div className="p-3 bg-white/[0.03] border border-white/8 rounded-lg space-y-1.5">
              <div className="flex items-center gap-1.5 text-white/40">
                <DollarSign size={11} />
                <span className="text-[10px]">Total Spent</span>
              </div>
              <div className="text-base font-bold text-white">
                ${simStats.totalSpent.toFixed(0)}
              </div>
              {!backlogMode && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-white/25 line-through">${currentStats.totalSpent.toFixed(0)}</span>
                  {spentDelta !== 0 && (
                    <DeltaBadge
                      value={spentDelta}
                      positive={spentDelta > 0}
                      prefix="-$"
                      invert={false}
                    />
                  )}
                </div>
              )}
              {backlogMode && (
                <div className="text-[10px] text-white/30">Spend unchanged</div>
              )}
            </div>

            {/* Avg $/hr */}
            <div className="p-3 bg-white/[0.03] border border-white/8 rounded-lg space-y-1.5">
              <div className="flex items-center gap-1.5 text-white/40">
                <Clock size={11} />
                <span className="text-[10px]">Avg $/hr</span>
              </div>
              <div className={clsx(
                'text-base font-bold',
                simStats.avgCostPerHour < currentStats.avgCostPerHour ? 'text-emerald-400' :
                simStats.avgCostPerHour > currentStats.avgCostPerHour ? 'text-red-400' : 'text-white'
              )}>
                ${simStats.avgCostPerHour.toFixed(2)}/hr
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-white/25 line-through">${currentStats.avgCostPerHour.toFixed(2)}/hr</span>
                <DeltaBadge
                  value={Math.abs(cphDelta)}
                  positive={cphDelta > 0}
                  prefix={cphDelta > 0 ? '-$' : '+$'}
                  suffix="/hr"
                  invert={false}
                />
              </div>
            </div>

            {/* Completion Rate */}
            <div className="p-3 bg-white/[0.03] border border-white/8 rounded-lg space-y-1.5">
              <div className="flex items-center gap-1.5 text-white/40">
                <CheckCircle size={11} />
                <span className="text-[10px]">Completion Rate</span>
              </div>
              <div className={clsx(
                'text-base font-bold',
                simStats.completionRate > currentStats.completionRate ? 'text-emerald-400' :
                simStats.completionRate < currentStats.completionRate ? 'text-red-400' : 'text-white'
              )}>
                {simStats.completionRate.toFixed(0)}%
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-white/25 line-through">{currentStats.completionRate.toFixed(0)}%</span>
                <DeltaBadge
                  value={Math.abs(compDelta)}
                  positive={compDelta >= 0}
                  prefix={compDelta >= 0 ? '+' : '-'}
                  suffix="%"
                />
              </div>
            </div>

            {/* Credit Score */}
            <div className="p-3 bg-white/[0.03] border border-white/8 rounded-lg space-y-1.5">
              <div className="flex items-center gap-1.5 text-white/40">
                <CreditCard size={11} />
                <span className="text-[10px]">Credit Score</span>
              </div>
              <div
                className="text-base font-bold"
                style={{ color: simStats.creditColor }}
              >
                {simStats.creditScore}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-white/25 line-through">{currentStats.creditScore}</span>
                <DeltaBadge
                  value={Math.abs(scoreDelta)}
                  positive={scoreDelta >= 0}
                  prefix={scoreDelta >= 0 ? '+' : '-'}
                />
              </div>
            </div>
          </div>

          {/* Removed games count */}
          {allRemovedIds.size > 0 && (
            <div className="text-[10px] text-white/30 text-center">
              Simulating your library without{' '}
              <span className="text-violet-400 font-medium">{allRemovedIds.size} game{allRemovedIds.size !== 1 ? 's' : ''}</span>
              {' '}({simStats.gameCount} remaining)
            </div>
          )}
          {backlogMode && allRemovedIds.size === 0 && (
            <div className="text-[10px] text-white/30 text-center">
              Simulating <span className="text-violet-400 font-medium">20h added</span> to each unplayed game
            </div>
          )}
        </div>
      )}

      {/* Removed Game Chips */}
      {removedGames.length > 0 && (
        <div className="space-y-2">
          <div className="text-[10px] text-white/30 uppercase tracking-wider">Removed from simulation</div>
          <div className="flex flex-wrap gap-1.5">
            {removedGames.slice(0, 12).map(g => (
              <button
                key={g.id}
                onClick={() => {
                  if (customRemovedIds.has(g.id)) {
                    toggleCustomGame(g.id);
                  }
                  // preset-removed games can't be individually un-removed (must clear preset)
                }}
                className={clsx(
                  'flex items-center gap-1 px-2 py-1 rounded-full text-[10px] transition-all',
                  customRemovedIds.has(g.id)
                    ? 'bg-red-500/15 border border-red-500/25 text-red-300 hover:bg-red-500/20'
                    : 'bg-violet-500/10 border border-violet-500/20 text-violet-300 cursor-default'
                )}
              >
                <span className="truncate max-w-[90px]">{g.name}</span>
                {customRemovedIds.has(g.id) && <X size={9} />}
              </button>
            ))}
            {removedGames.length > 12 && (
              <span className="flex items-center px-2 py-1 text-[10px] text-white/30">
                +{removedGames.length - 12} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Custom Game Picker Toggle */}
      <button
        onClick={() => setShowPicker(v => !v)}
        className="w-full flex items-center justify-between px-3 py-2 bg-white/[0.02] border border-white/8 rounded-lg text-xs text-white/50 hover:text-white/70 hover:bg-white/[0.04] transition-all"
      >
        <span>Custom-remove individual games</span>
        {showPicker ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>

      {showPicker && (
        <div className="space-y-2">
          {/* Search */}
          <div className="relative">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search games…"
              className="w-full pl-8 pr-3 py-2 bg-white/[0.04] border border-white/10 rounded-lg text-xs text-white placeholder-white/25 focus:outline-none focus:border-violet-500/50"
            />
          </div>

          {/* Game List */}
          <div className="max-h-48 overflow-y-auto space-y-0.5 pr-1">
            {pickerGames.length === 0 && (
              <div className="text-center text-[11px] text-white/25 py-4">No games found</div>
            )}
            {pickerGames.map(g => {
              const isRemoved = customRemovedIds.has(g.id);
              const hours = getTotalHours(g);
              return (
                <button
                  key={g.id}
                  onClick={() => toggleCustomGame(g.id)}
                  className={clsx(
                    'w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-all',
                    isRemoved
                      ? 'bg-red-500/8 border border-red-500/15 opacity-60'
                      : 'bg-white/[0.02] hover:bg-white/[0.04] border border-transparent'
                  )}
                >
                  {g.thumbnail ? (
                    <img src={g.thumbnail} alt="" className="w-7 h-7 object-cover rounded shrink-0" loading="lazy" />
                  ) : (
                    <div className="w-7 h-7 bg-white/5 rounded shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className={clsx('text-xs font-medium truncate', isRemoved ? 'line-through text-white/30' : 'text-white/80')}>
                      {g.name}
                    </div>
                    <div className="text-[10px] text-white/25">
                      ${g.price > 0 ? g.price.toFixed(0) : '0'} ·{' '}
                      {hours > 0 ? `${hours.toFixed(0)}h` : 'not played'}
                      {g.rating > 0 ? ` · ${g.rating}/10` : ''}
                    </div>
                  </div>
                  <div className={clsx(
                    'shrink-0 text-[10px] font-medium',
                    isRemoved ? 'text-red-400' : 'text-white/20'
                  )}>
                    {isRemoved ? '✕' : '−'}
                  </div>
                </button>
              );
            })}
          </div>

          {customRemovedIds.size > 0 && (
            <button
              onClick={() => setCustomRemovedIds(new Set())}
              className="text-[10px] text-white/30 hover:text-white/50 transition-colors"
            >
              Clear custom selection
            </button>
          )}
        </div>
      )}

      {!hasChanges && (
        <div className="text-center text-[11px] text-white/25 py-2">
          Select a scenario above to see how your stats change
        </div>
      )}
    </div>
  );
}
