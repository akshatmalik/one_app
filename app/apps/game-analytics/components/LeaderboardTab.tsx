'use client';

import { useState, useMemo } from 'react';
import { Star, Clock, DollarSign, TrendingUp, Zap, Frown, Trophy, Medal, ChevronDown, ChevronUp, LucideProps } from 'lucide-react';
import { GameWithMetrics } from '../hooks/useAnalytics';
import { ForwardRefExoticComponent, RefAttributes } from 'react';
import clsx from 'clsx';

interface LeaderboardTabProps {
  gamesWithMetrics: GameWithMetrics[];
}

type CategoryId = 'rating' | 'value' | 'hours' | 'roi' | 'speed' | 'regret';
type LucideIcon = ForwardRefExoticComponent<Omit<LucideProps, 'ref'> & RefAttributes<SVGSVGElement>>;

interface Category {
  id: CategoryId;
  label: string;
  icon: LucideIcon;
  desc: string;
  getValue: (g: GameWithMetrics) => number | null;
  formatValue: (v: number) => string;
  higherIsBetter: boolean;
  filter: (g: GameWithMetrics) => boolean;
}

const CATEGORIES: Category[] = [
  {
    id: 'rating',
    label: 'Best Rated',
    icon: Star,
    desc: 'Highest rated in your library',
    getValue: g => g.rating > 0 ? g.rating : null,
    formatValue: v => `${v.toFixed(1)}/10`,
    higherIsBetter: true,
    filter: g => g.status !== 'Wishlist' && g.rating > 0,
  },
  {
    id: 'value',
    label: 'Best Value',
    icon: DollarSign,
    desc: 'Lowest cost per hour',
    getValue: g => g.totalHours > 0 && g.price > 0 ? g.metrics.costPerHour : null,
    formatValue: v => `$${v.toFixed(2)}/hr`,
    higherIsBetter: false,
    filter: g => g.status !== 'Wishlist' && g.totalHours > 0 && g.price > 0,
  },
  {
    id: 'hours',
    label: 'Most Played',
    icon: Clock,
    desc: 'Most hours logged',
    getValue: g => g.totalHours > 0 ? g.totalHours : null,
    formatValue: v => `${v.toFixed(0)}h`,
    higherIsBetter: true,
    filter: g => g.status !== 'Wishlist' && g.totalHours > 0,
  },
  {
    id: 'roi',
    label: 'Best ROI',
    icon: TrendingUp,
    desc: 'Best return on investment',
    getValue: g => g.price > 0 ? g.metrics.roi : null,
    formatValue: v => v.toFixed(1),
    higherIsBetter: true,
    filter: g => g.status !== 'Wishlist' && g.price > 0 && g.totalHours > 0 && g.rating > 0,
  },
  {
    id: 'speed',
    label: 'Speed Runs',
    icon: Zap,
    desc: 'Fastest completions',
    getValue: g => g.metrics.daysToComplete != null ? g.metrics.daysToComplete : null,
    formatValue: v => `${v}d`,
    higherIsBetter: false,
    filter: g => g.status === 'Completed' && g.metrics.daysToComplete != null,
  },
  {
    id: 'regret',
    label: 'Biggest Regrets',
    icon: Frown,
    desc: 'Expensive and barely played',
    getValue: g => {
      if (g.price <= 0 || g.rating <= 0) return null;
      // Regret score: high price, low hours, low rating
      return (g.price * (10 - g.rating)) / Math.max(g.totalHours, 0.5);
    },
    formatValue: v => v.toFixed(1),
    higherIsBetter: false,
    filter: g => g.status !== 'Wishlist' && g.price > 0,
  },
];

const TIER_COLORS = {
  1: {
    border: 'border-yellow-400/60',
    bg: 'bg-yellow-400/10',
    text: 'text-yellow-300',
    badge: 'bg-yellow-400/20 text-yellow-300 border border-yellow-400/30',
    glow: 'shadow-yellow-400/20',
    label: '1st',
  },
  2: {
    border: 'border-slate-300/40',
    bg: 'bg-slate-300/5',
    text: 'text-slate-300',
    badge: 'bg-slate-300/20 text-slate-300 border border-slate-300/30',
    glow: 'shadow-slate-300/10',
    label: '2nd',
  },
  3: {
    border: 'border-amber-600/40',
    bg: 'bg-amber-600/5',
    text: 'text-amber-500',
    badge: 'bg-amber-600/20 text-amber-500 border border-amber-600/30',
    glow: 'shadow-amber-600/10',
    label: '3rd',
  },
};

function PodiumCard({ game, rank, category }: { game: GameWithMetrics; rank: 1 | 2 | 3; category: Category }) {
  const tier = TIER_COLORS[rank];
  const value = category.getValue(game);

  return (
    <div className={clsx(
      'relative flex flex-col items-center rounded-xl border p-3 transition-all',
      tier.border, tier.bg,
      rank === 1 ? 'scale-105' : 'opacity-90',
    )}>
      {/* Rank badge */}
      <div className={clsx('absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[10px] font-bold', tier.badge)}>
        {rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'} {tier.label}
      </div>

      {/* Thumbnail */}
      <div className="mt-2 mb-2 w-14 h-14 rounded-lg overflow-hidden bg-white/5 flex-shrink-0">
        {game.thumbnail ? (
          <img src={game.thumbnail} alt={game.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl">🎮</div>
        )}
      </div>

      {/* Name */}
      <p className="text-[11px] font-semibold text-white/90 text-center leading-tight line-clamp-2 mb-1">
        {game.name}
      </p>

      {/* Value */}
      {value != null && (
        <span className={clsx('text-sm font-bold', tier.text)}>
          {category.formatValue(value)}
        </span>
      )}

      {/* Genre */}
      {game.genre && (
        <span className="mt-1 text-[9px] text-white/30 truncate max-w-full">{game.genre}</span>
      )}
    </div>
  );
}

export function LeaderboardTab({ gamesWithMetrics }: LeaderboardTabProps) {
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>('rating');
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [genreFilter, setGenreFilter] = useState<string>('all');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [showAll, setShowAll] = useState(false);

  const category = CATEGORIES.find(c => c.id === selectedCategory)!;

  // Available filter options
  const years = useMemo(() => {
    const ys = new Set<string>();
    gamesWithMetrics.forEach(g => {
      const d = g.datePurchased || g.createdAt;
      if (d) ys.add(new Date(d).getFullYear().toString());
    });
    return ['all', ...Array.from(ys).sort().reverse()];
  }, [gamesWithMetrics]);

  const genres = useMemo(() => {
    const gs = new Set<string>();
    gamesWithMetrics.forEach(g => { if (g.genre) gs.add(g.genre); });
    return ['all', ...Array.from(gs).sort()];
  }, [gamesWithMetrics]);

  const platforms = useMemo(() => {
    const ps = new Set<string>();
    gamesWithMetrics.forEach(g => { if (g.platform) ps.add(g.platform); });
    return ['all', ...Array.from(ps).sort()];
  }, [gamesWithMetrics]);

  // Filtered + sorted games for the selected category
  const ranked = useMemo(() => {
    let filtered = gamesWithMetrics.filter(category.filter);

    // Apply filters
    if (yearFilter !== 'all') {
      filtered = filtered.filter(g => {
        const d = g.datePurchased || g.createdAt;
        return d && new Date(d).getFullYear().toString() === yearFilter;
      });
    }
    if (genreFilter !== 'all') filtered = filtered.filter(g => g.genre === genreFilter);
    if (platformFilter !== 'all') filtered = filtered.filter(g => g.platform === platformFilter);

    // Sort
    const withValues = filtered
      .map(g => ({ game: g, value: category.getValue(g) }))
      .filter(x => x.value != null) as { game: GameWithMetrics; value: number }[];

    withValues.sort((a, b) =>
      category.higherIsBetter ? b.value - a.value : a.value - b.value
    );

    return withValues;
  }, [gamesWithMetrics, category, yearFilter, genreFilter, platformFilter]);

  const podium = ranked.slice(0, 3);
  const rest = ranked.slice(3);
  const visibleRest = showAll ? rest : rest.slice(0, 7);

  const SelectFilter = ({ value, onChange, options, label }: {
    value: string;
    onChange: (v: string) => void;
    options: string[];
    label: string;
  }) => (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white/70 focus:outline-none focus:border-white/20"
    >
      <option value="all">{label}</option>
      {options.filter(o => o !== 'all').map(o => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  );

  return (
    <div className="space-y-4">
      {/* Category selector */}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {CATEGORIES.map(cat => {
          const Icon = cat.icon;
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => { setSelectedCategory(cat.id); setShowAll(false); }}
              className={clsx(
                'flex flex-col items-center gap-1 p-2.5 rounded-xl border text-center transition-all',
                isSelected
                  ? 'bg-purple-500/20 border-purple-400/40 text-purple-300'
                  : 'bg-white/[0.02] border-white/5 text-white/40 hover:text-white/60 hover:border-white/10'
              )}
            >
              <Icon size={16} className={isSelected ? 'text-purple-400' : ''} />
              <span className="text-[10px] font-medium leading-tight">{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <SelectFilter value={yearFilter} onChange={setYearFilter} options={years} label="All Years" />
        <SelectFilter value={genreFilter} onChange={setGenreFilter} options={genres} label="All Genres" />
        <SelectFilter value={platformFilter} onChange={setPlatformFilter} options={platforms} label="All Platforms" />
        {(yearFilter !== 'all' || genreFilter !== 'all' || platformFilter !== 'all') && (
          <button
            onClick={() => { setYearFilter('all'); setGenreFilter('all'); setPlatformFilter('all'); }}
            className="text-[11px] text-white/40 hover:text-white/60 underline"
          >
            Clear
          </button>
        )}
        <span className="ml-auto text-[11px] text-white/30">{ranked.length} games</span>
      </div>

      {ranked.length === 0 ? (
        <div className="text-center py-12 text-white/30 text-sm">
          No games match the current filters for this category.
        </div>
      ) : (
        <>
          {/* Podium */}
          {podium.length > 0 && (
            <div className="mb-2">
              <div className="flex items-center gap-1.5 mb-3">
                <Trophy size={14} className="text-yellow-400" />
                <span className="text-xs font-semibold text-white/60">{category.desc}</span>
              </div>
              <div className={clsx(
                'grid gap-3',
                podium.length === 1 ? 'grid-cols-1 max-w-[140px] mx-auto' :
                podium.length === 2 ? 'grid-cols-2 max-w-xs mx-auto' :
                'grid-cols-3'
              )}>
                {/* Arrange: 2nd | 1st | 3rd */}
                {podium.length >= 2 && (
                  <div className="mt-4">
                    <PodiumCard game={podium[1].game} rank={2} category={category} />
                  </div>
                )}
                <PodiumCard game={podium[0].game} rank={1} category={category} />
                {podium.length >= 3 && (
                  <div className="mt-8">
                    <PodiumCard game={podium[2].game} rank={3} category={category} />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Full ranked list */}
          {rest.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[11px] text-white/30 font-medium uppercase tracking-wider mb-2">Full Rankings</p>
              {visibleRest.map(({ game, value }, idx) => (
                <div
                  key={game.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-colors"
                >
                  {/* Rank number */}
                  <span className="text-[11px] text-white/30 font-mono w-6 text-right flex-shrink-0">
                    #{idx + 4}
                  </span>

                  {/* Thumbnail */}
                  <div className="w-8 h-8 rounded-md overflow-hidden bg-white/5 flex-shrink-0">
                    {game.thumbnail ? (
                      <img src={game.thumbnail} alt={game.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-sm">🎮</div>
                    )}
                  </div>

                  {/* Name + meta */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-white/80 truncate">{game.name}</p>
                    <p className="text-[10px] text-white/30 truncate">
                      {[game.genre, game.platform].filter(Boolean).join(' · ')}
                    </p>
                  </div>

                  {/* Value */}
                  <span className="text-xs font-bold text-white/60 flex-shrink-0">
                    {category.formatValue(value)}
                  </span>

                  {/* Medal for top ranks if using medal icons */}
                  {idx < 3 && (
                    <Medal size={12} className="text-white/20 flex-shrink-0" />
                  )}
                </div>
              ))}

              {rest.length > 7 && (
                <button
                  onClick={() => setShowAll(s => !s)}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 text-[11px] text-white/30 hover:text-white/50 transition-colors"
                >
                  {showAll ? <><ChevronUp size={12} /> Show less</> : <><ChevronDown size={12} /> Show all {rest.length} remaining</>}
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
