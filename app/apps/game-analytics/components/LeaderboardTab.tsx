'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Star, Clock, DollarSign, TrendingUp, Zap, Frown, Trophy, Medal,
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Swords, ListOrdered,
  RefreshCw, CheckCircle2, Info, Calendar, ExternalLink, LucideProps, LayoutGrid,
} from 'lucide-react';
import { GameWithMetrics } from '../hooks/useAnalytics';
import { useRankings, getPeriodKey, getPeriodLabel, getPeriodRange } from '../hooks/useRankings';
import { RankingPeriod, GameRanking, GameTier, GameAward } from '../lib/types';
import { useTierAssignments } from '../hooks/useTierAssignments';
import { logError } from '../lib/error-log';
import { ForwardRefExoticComponent, RefAttributes } from 'react';
import clsx from 'clsx';

// Small inline helper — award strip for a game in the leaderboard rows
function AwardStrip({ awards }: { awards?: GameAward[] }) {
  if (!awards || awards.length === 0) return null;
  const tierOrder: GameAward['periodType'][] = ['year', 'quarter', 'month', 'week'];
  const tierColor: Record<GameAward['periodType'], string> = {
    year: '#fbbf24', quarter: '#a855f7', month: '#facc15', week: '#60a5fa',
  };
  // Group by highest tier
  let topTier: GameAward['periodType'] | null = null;
  for (const t of tierOrder) {
    if (awards.some(a => a.periodType === t)) { topTier = t; break; }
  }
  if (!topTier) return null;
  const color = tierColor[topTier];
  const count = awards.length;
  const labels: Record<GameAward['periodType'], string> = { year: 'GOTY', quarter: 'GOTQ', month: 'GOTM', week: 'GOTW' };
  return (
    <span
      className="text-[8px] px-1.5 py-0.5 rounded font-bold flex-shrink-0"
      style={{ color, backgroundColor: `${color}18` }}
      title={`${count} award${count > 1 ? 's' : ''} — best: ${labels[topTier]}`}
    >
      🏆 {labels[topTier]}{count > 1 ? ` ×${count}` : ''}
    </span>
  );
}

// ── Classic leaderboard categories ──────────────────────────────────

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
      <div className={clsx('absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[10px] font-bold', tier.badge)}>
        {rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'} {tier.label}
      </div>
      <div className="mt-2 mb-2 w-14 h-14 rounded-lg overflow-hidden bg-white/5 flex-shrink-0">
        {game.thumbnail ? (
          <img src={game.thumbnail} alt={game.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl">🎮</div>
        )}
      </div>
      <p className="text-[11px] font-semibold text-white/90 text-center leading-tight line-clamp-2 mb-1">{game.name}</p>
      {value != null && <span className={clsx('text-sm font-bold', tier.text)}>{category.formatValue(value)}</span>}
      {game.genre && <span className="mt-1 text-[9px] text-white/30 truncate max-w-full">{game.genre}</span>}
      <AwardStrip awards={game.awards} />
    </div>
  );
}

// ── Tier Rank system ─────────────────────────────────────────────────

const GAME_TIERS: GameTier[] = ['S', 'A', 'B', 'C', 'D', 'F'];

const TIER_STYLES: Record<GameTier, {
  text: string; border: string; activeBg: string; activeBorder: string; tabBg: string;
}> = {
  S: { text: 'text-yellow-300',  border: 'border-yellow-400/20',  activeBg: 'bg-yellow-400/20',  activeBorder: 'border-yellow-400/60',  tabBg: 'bg-yellow-400/10' },
  A: { text: 'text-emerald-300', border: 'border-emerald-400/20', activeBg: 'bg-emerald-400/20', activeBorder: 'border-emerald-400/60', tabBg: 'bg-emerald-400/10' },
  B: { text: 'text-blue-300',    border: 'border-blue-400/20',    activeBg: 'bg-blue-400/20',    activeBorder: 'border-blue-400/60',    tabBg: 'bg-blue-400/10' },
  C: { text: 'text-purple-300',  border: 'border-purple-400/20',  activeBg: 'bg-purple-400/20',  activeBorder: 'border-purple-400/60',  tabBg: 'bg-purple-400/10' },
  D: { text: 'text-orange-300',  border: 'border-orange-400/20',  activeBg: 'bg-orange-400/20',  activeBorder: 'border-orange-400/60',  tabBg: 'bg-orange-400/10' },
  F: { text: 'text-red-400',     border: 'border-red-400/20',     activeBg: 'bg-red-400/15',     activeBorder: 'border-red-400/50',     tabBg: 'bg-red-400/10' },
};

// ── ELO Battle components ────────────────────────────────────────────

const ELO_PERIOD_OPTIONS: { value: RankingPeriod; label: string }[] = [
  { value: 'all', label: 'All Time' },
  { value: 'year', label: 'This Year' },
  { value: 'month', label: 'This Month' },
  { value: 'quarter', label: 'This Quarter' },
  { value: 'week', label: 'This Week' },
];

function EloTierBadge({ elo }: { elo: number }) {
  let label: string;
  let cls: string;
  if (elo >= 1300) { label = '🏆 Legend'; cls = 'text-yellow-300 bg-yellow-400/10 border-yellow-400/30'; }
  else if (elo >= 1200) { label = '💎 Elite'; cls = 'text-blue-300 bg-blue-400/10 border-blue-400/30'; }
  else if (elo >= 1100) { label = '⭐ Pro'; cls = 'text-purple-300 bg-purple-400/10 border-purple-400/30'; }
  else if (elo >= 1000) { label = '🎮 Ranked'; cls = 'text-white/60 bg-white/5 border-white/10'; }
  else { label = '📉 Low'; cls = 'text-white/30 bg-white/[0.02] border-white/5'; }
  return (
    <span className={clsx('text-[9px] font-semibold px-1.5 py-0.5 rounded border', cls)}>{label}</span>
  );
}

interface BattleCardProps {
  game: GameWithMetrics;
  ranking?: GameRanking;
  onPick: () => void;
  disabled: boolean;
  isWinner?: boolean;
  isLoser?: boolean;
}

function BattleCard({ game, ranking, onPick, disabled, isWinner, isLoser }: BattleCardProps) {
  return (
    <button
      onClick={onPick}
      disabled={disabled}
      className={clsx(
        'relative flex flex-col items-center gap-3 p-4 rounded-2xl border w-full transition-colors duration-150',
        'bg-white/[0.02] border-white/10',
        !disabled && !isWinner && !isLoser && 'hover:bg-white/[0.06] hover:border-purple-400/40 hover:scale-[1.02] active:scale-[0.98]',
        isWinner && 'battle-win-flash bg-emerald-500/[0.04]',
        isLoser  && 'battle-lose-flash',
        disabled && !isWinner && !isLoser && 'opacity-50 cursor-not-allowed',
      )}
    >
      {/* Thumbnail */}
      <div className="w-20 h-20 rounded-xl overflow-hidden bg-white/5 flex-shrink-0">
        {game.thumbnail ? (
          <img src={game.thumbnail} alt={game.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">🎮</div>
        )}
      </div>

      {/* Name */}
      <p className="text-sm font-semibold text-white/90 text-center leading-snug line-clamp-2">
        {game.name}
      </p>

      {/* ELO + battles */}
      <div className="flex flex-col items-center gap-1">
        {ranking ? (
          <>
            <span className="text-xl font-bold text-white/80">{ranking.eloScore}</span>
            <EloTierBadge elo={ranking.eloScore} />
            <span className="text-[10px] text-white/30 mt-0.5">
              {ranking.wins}W · {ranking.losses}L · {ranking.battlesCount} battles
            </span>
          </>
        ) : (
          <>
            <span className="text-xl font-bold text-white/40">1000</span>
            <span className="text-[10px] text-white/30">Unranked</span>
          </>
        )}
      </div>

      {/* Genre/platform */}
      {(game.genre || game.platform) && (
        <span className="text-[10px] text-white/30 text-center truncate w-full">
          {[game.genre, game.platform].filter(Boolean).join(' · ')}
        </span>
      )}

      {/* Pick label */}
      {!disabled && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100">
          <span className="text-[10px] text-purple-400 font-semibold">TAP TO PICK</span>
        </div>
      )}
    </button>
  );
}

// ── Main component ───────────────────────────────────────────────────

type LeaderboardView = 'classic' | 'battle' | 'elo-rankings';

interface LeaderboardTabProps {
  gamesWithMetrics: GameWithMetrics[];
  userId: string | null;
}

export function LeaderboardTab({ gamesWithMetrics, userId }: LeaderboardTabProps) {
  // ── Classic mode state ─────────────────────────────────────────
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>('rating');
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [genreFilter, setGenreFilter] = useState<string>('all');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [showAll, setShowAll] = useState(false);

  // ── View + ELO state ────────────────────────────────────────────
  const [view, setView] = useState<LeaderboardView>('classic');
  const [eloPeriod, setEloPeriod] = useState<RankingPeriod>('all');
  const [periodOffset, setPeriodOffset] = useState(0); // 0 = current, 1 = one back, etc.

  // ── Tier Rank state ──────────────────────────────────────────────
  const [tierPhase, setTierPhase] = useState<'assign' | 'battle'>('assign');
  const [selectedBattleTier, setSelectedBattleTier] = useState<GameTier | null>(null);

  // Reset offset when period type changes
  useEffect(() => { setPeriodOffset(0); }, [eloPeriod]);

  const targetDate = useMemo(() => {
    const d = new Date();
    switch (eloPeriod) {
      case 'week':    d.setDate(d.getDate() - periodOffset * 7); break;
      case 'month':   d.setMonth(d.getMonth() - periodOffset); break;
      case 'quarter': d.setMonth(d.getMonth() - periodOffset * 3); break;
      case 'year':    d.setFullYear(d.getFullYear() - periodOffset); break;
      default: break;
    }
    return d;
  }, [eloPeriod, periodOffset]);

  const periodKey = useMemo(() => getPeriodKey(eloPeriod, targetDate), [eloPeriod, targetDate]);
  const currentPeriodLabel = useMemo(() => getPeriodLabel(eloPeriod, targetDate), [eloPeriod, targetDate]);

  const { rankings, battles, loading: rankLoading, submitting, indexError, recordBattle, getBattleCount, getNextPair } =
    useRankings(userId, eloPeriod, periodKey);

  // ── Battle state ────────────────────────────────────────────────
  const [currentPair, setCurrentPair] = useState<[string, string] | null>(null);
  const [lastResult, setLastResult] = useState<{ winner: string; loser: string; winnerChange: number; loserChange: number } | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [pickedWinnerId, setPickedWinnerId] = useState<string | null>(null);
  const [battleKey, setBattleKey] = useState(0);
  const resultTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Eligible games for battles: for 'all', any owned game with rating/hours;
  // for specific periods, only games with play logs in that period window.
  const eligibleGames = useMemo(() => {
    const owned = gamesWithMetrics.filter(g => g.status !== 'Wishlist' && (g.rating > 0 || g.totalHours > 0));
    const range = getPeriodRange(eloPeriod, targetDate);
    if (!range) return owned; // 'all' — no period filter
    const { start, end } = range;
    return owned.filter(g =>
      g.playLogs?.some(log => {
        const d = new Date(log.date);
        return d >= start && d <= end;
      })
    );
  }, [gamesWithMetrics, eloPeriod, targetDate]);
  const eligibleIds = useMemo(() => eligibleGames.map(g => g.id), [eligibleGames]);

  // ── Tier assignments (persisted per userId + periodKey) ──────────
  const { assignments, assignTier, removeTier, clearAll, assignedCount } =
    useTierAssignments(userId, periodKey);

  // Reset tier phase when the period changes
  useEffect(() => {
    setTierPhase('assign');
    setSelectedBattleTier(null);
  }, [periodKey]);

  // How many eligible games are assigned to each tier
  const tierCounts = useMemo(() => {
    const counts: Partial<Record<GameTier, number>> = {};
    for (const id of eligibleIds) {
      const tier = assignments[id];
      if (tier) counts[tier] = (counts[tier] || 0) + 1;
    }
    return counts;
  }, [eligibleIds, assignments]);

  // Tiers that have 2+ assigned games (can run battles)
  const battleableTiers = useMemo(
    () => GAME_TIERS.filter(t => (tierCounts[t] || 0) >= 2),
    [tierCounts],
  );

  // IDs eligible for battle in the currently selected tier
  const tierEligibleIds = useMemo(() => {
    if (!selectedBattleTier) return [];
    return eligibleGames
      .filter(g => assignments[g.id] === selectedBattleTier)
      .map(g => g.id);
  }, [eligibleGames, assignments, selectedBattleTier]);

  // Pick next pair within the selected tier
  useEffect(() => {
    if (view !== 'battle' || tierPhase !== 'battle') return;
    if (rankLoading) { setCurrentPair(null); return; }
    if (tierEligibleIds.length < 2) { setCurrentPair(null); return; }
    const pair = getNextPair(tierEligibleIds);
    setCurrentPair(pair);
  }, [view, tierPhase, battles, tierEligibleIds, getNextPair, rankLoading]);

  // Bump battleKey whenever the pair changes so entrance animations re-fire
  const currentPairKey = currentPair ? `${currentPair[0]}|${currentPair[1]}` : null;
  useEffect(() => {
    if (currentPairKey) setBattleKey(k => k + 1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPairKey]);

  // Classic leaderboard data
  const category = CATEGORIES.find(c => c.id === selectedCategory)!;

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

  const ranked = useMemo(() => {
    let filtered = gamesWithMetrics.filter(category.filter);
    if (yearFilter !== 'all') {
      filtered = filtered.filter(g => {
        const d = g.datePurchased || g.createdAt;
        return d && new Date(d).getFullYear().toString() === yearFilter;
      });
    }
    if (genreFilter !== 'all') filtered = filtered.filter(g => g.genre === genreFilter);
    if (platformFilter !== 'all') filtered = filtered.filter(g => g.platform === platformFilter);
    const withValues = filtered
      .map(g => ({ game: g, value: category.getValue(g) }))
      .filter(x => x.value != null) as { game: GameWithMetrics; value: number }[];
    withValues.sort((a, b) => category.higherIsBetter ? b.value - a.value : a.value - b.value);
    return withValues;
  }, [gamesWithMetrics, category, yearFilter, genreFilter, platformFilter]);

  const podium = ranked.slice(0, 3);
  const rest = ranked.slice(3);
  const visibleRest = showAll ? rest : rest.slice(0, 7);

  // ELO rankings view — sorted by ELO, merged with game data
  const eloRanked = useMemo(() => {
    return rankings
      .map(r => ({ ranking: r, game: gamesWithMetrics.find(g => g.id === r.gameId) }))
      .filter(x => x.game)
      .sort((a, b) => b.ranking.eloScore - a.ranking.eloScore) as { ranking: GameRanking; game: GameWithMetrics }[];
  }, [rankings, gamesWithMetrics]);

  // Also add unranked eligible games to ELO view
  const eloRankedWithUnranked = useMemo(() => {
    const rankedIds = new Set(eloRanked.map(x => x.game.id));
    const unranked = eligibleGames
      .filter(g => !rankedIds.has(g.id))
      .map(g => ({ ranking: null as GameRanking | null, game: g }));
    return [...eloRanked, ...unranked];
  }, [eloRanked, eligibleGames]);

  // Handle battle pick
  async function handlePick(winnerId: string, loserId: string) {
    if (!currentPair || submitting) return;

    // Immediately flash the chosen winner before the async round-trip
    setPickedWinnerId(winnerId);

    try {
      // Snapshot current ELOs for the result display
      const winnerR = rankings.find(r => r.gameId === winnerId);
      const loserR = rankings.find(r => r.gameId === loserId);

      await recordBattle(winnerId, loserId);

      // Show result flash
      const winnerGame = gamesWithMetrics.find(g => g.id === winnerId);
      const loserGame = gamesWithMetrics.find(g => g.id === loserId);
      if (winnerGame && loserGame) {
        const wElo = winnerR?.eloScore ?? 1000;
        const lElo = loserR?.eloScore ?? 1000;
        const expectedWin = 1 / (1 + Math.pow(10, (lElo - wElo) / 400));
        const k = 32;
        const wChange = Math.round(k * (1 - expectedWin));
        const lChange = Math.round(k * (0 - (1 - expectedWin)));
        setLastResult({
          winner: winnerGame.name,
          loser: loserGame.name,
          winnerChange: wChange,
          loserChange: lChange,
        });
        setShowResult(true);
        if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
        resultTimerRef.current = setTimeout(() => {
          setShowResult(false);
          setPickedWinnerId(null);
        }, 800);
      }

      // Next pair is set via the useEffect watching battles
    } catch (err) {
      setPickedWinnerId(null);
      logError('Battle pick failed', 'handlePick', err);
    }
  }

  const SelectFilter = ({ value, onChange, options, label }: {
    value: string; onChange: (v: string) => void; options: string[]; label: string;
  }) => (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white/70 focus:outline-none focus:border-white/20"
    >
      <option value="all">{label}</option>
      {options.filter(o => o !== 'all').map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );

  return (
    <div className="space-y-4">

      {/* View toggle */}
      <div className="grid grid-cols-3 gap-1 p-1 bg-white/[0.03] border border-white/5 rounded-xl">
        {([
          { id: 'classic' as LeaderboardView, label: 'Leaderboard', icon: Trophy },
          { id: 'battle' as LeaderboardView, label: 'Tier Rank', icon: LayoutGrid },
          { id: 'elo-rankings' as LeaderboardView, label: 'ELO Rankings', icon: ListOrdered },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setView(id)}
            className={clsx(
              'flex flex-col items-center gap-1 py-2 px-1 rounded-lg text-center transition-all',
              view === id
                ? 'bg-purple-500/20 border border-purple-400/30 text-purple-300'
                : 'text-white/40 hover:text-white/60'
            )}
          >
            <Icon size={15} />
            <span className="text-[10px] font-medium leading-tight">{label}</span>
          </button>
        ))}
      </div>

      {/* ── CLASSIC LEADERBOARD ─────────────────────────────────── */}
      {view === 'classic' && (
        <>
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
              >Clear</button>
            )}
            <span className="ml-auto text-[11px] text-white/30">{ranked.length} games</span>
          </div>

          {ranked.length === 0 ? (
            <div className="text-center py-12 text-white/30 text-sm">No games match the current filters.</div>
          ) : (
            <>
              {podium.length > 0 && (
                <div className="mb-2">
                  <div className="flex items-center gap-1.5 mb-3">
                    <Trophy size={14} className="text-yellow-400" />
                    <span className="text-xs font-semibold text-white/60">{category.desc}</span>
                  </div>
                  <div className={clsx(
                    'grid gap-3',
                    podium.length === 1 ? 'grid-cols-1 max-w-[140px] mx-auto' :
                    podium.length === 2 ? 'grid-cols-2 max-w-xs mx-auto' : 'grid-cols-3'
                  )}>
                    {podium.length >= 2 && <div className="mt-4"><PodiumCard game={podium[1].game} rank={2} category={category} /></div>}
                    <PodiumCard game={podium[0].game} rank={1} category={category} />
                    {podium.length >= 3 && <div className="mt-8"><PodiumCard game={podium[2].game} rank={3} category={category} /></div>}
                  </div>
                </div>
              )}

              {rest.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[11px] text-white/30 font-medium uppercase tracking-wider mb-2">Full Rankings</p>
                  {visibleRest.map(({ game, value }, idx) => (
                    <div key={game.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-colors">
                      <span className="text-[11px] text-white/30 font-mono w-6 text-right flex-shrink-0">#{idx + 4}</span>
                      <div className="w-8 h-8 rounded-md overflow-hidden bg-white/5 flex-shrink-0">
                        {game.thumbnail
                          ? <img src={game.thumbnail} alt={game.name} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center text-sm">🎮</div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-white/80 truncate">{game.name}</p>
                        <p className="text-[10px] text-white/30 truncate">{[game.genre, game.platform].filter(Boolean).join(' · ')}</p>
                      </div>
                      <span className="text-xs font-bold text-white/60 flex-shrink-0">{category.formatValue(value)}</span>
                      {idx < 3 && <Medal size={12} className="text-white/20 flex-shrink-0" />}
                    </div>
                  ))}
                  {rest.length > 7 && (
                    <button onClick={() => setShowAll(s => !s)} className="w-full flex items-center justify-center gap-1.5 py-2.5 text-[11px] text-white/30 hover:text-white/50 transition-colors">
                      {showAll ? <><ChevronUp size={12} /> Show less</> : <><ChevronDown size={12} /> Show all {rest.length} remaining</>}
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ── FIREBASE INDEX ERROR BANNER ─────────────────────────── */}
      {indexError && (view === 'battle' || view === 'elo-rankings') && (
        <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-400/30">
          <Info size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0 space-y-2">
            <p className="text-xs font-semibold text-amber-300">Firestore index required</p>
            <p className="text-[11px] text-white/50 leading-relaxed">
              This query needs a composite index that hasn&apos;t been created yet. Click the link below to open Firebase Console and create it — takes about 2 minutes to build.
            </p>
            <a
              href={indexError}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-400/30 text-amber-300 text-[11px] font-medium hover:bg-amber-500/30 transition-colors"
            >
              <ExternalLink size={11} /> Create index in Firebase Console →
            </a>
            <p className="text-[10px] text-white/25 break-all">{indexError}</p>
          </div>
        </div>
      )}

      {/* ── TIER RANK ────────────────────────────────────────────── */}
      {view === 'battle' && (
        <div className="space-y-4">
          {/* Period type selector */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] text-white/40">Period:</span>
            {ELO_PERIOD_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setEloPeriod(opt.value)}
                className={clsx(
                  'px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all border',
                  eloPeriod === opt.value
                    ? 'bg-purple-500/20 border-purple-400/30 text-purple-300'
                    : 'border-white/5 text-white/40 hover:text-white/60 hover:border-white/10'
                )}
              >{opt.label}</button>
            ))}
          </div>

          {/* Period nav bar */}
          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08]">
            <button
              onClick={() => setPeriodOffset(o => o + 1)}
              disabled={eloPeriod === 'all'}
              className="p-1 rounded-lg text-white/30 hover:text-white/60 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
              aria-label="Previous period"
            ><ChevronLeft size={14} /></button>
            <div className="flex items-center gap-1.5">
              <Calendar size={12} className="text-purple-400" />
              <span className="text-xs font-semibold text-white/80">{currentPeriodLabel}</span>
              {periodOffset > 0 && (
                <span className="text-[10px] text-white/30 ml-1">({periodOffset} {eloPeriod}{periodOffset > 1 ? 's' : ''} ago)</span>
              )}
            </div>
            <button
              onClick={() => setPeriodOffset(o => Math.max(0, o - 1))}
              disabled={eloPeriod === 'all' || periodOffset === 0}
              className="p-1 rounded-lg text-white/30 hover:text-white/60 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
              aria-label="Next period"
            ><ChevronRight size={14} /></button>
          </div>

          {eligibleGames.length < 2 ? (
            <div className="text-center py-10 text-white/30 text-sm">
              {eloPeriod === 'all'
                ? 'Add at least 2 played games to start ranking.'
                : `No games played in ${currentPeriodLabel}. Log play sessions or try a different period.`}
            </div>

          ) : tierPhase === 'assign' ? (
            /* ── PHASE 1: ASSIGN TIERS ─────────────────────────────── */
            <div className="space-y-3">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-white/70">Step 1 — Assign Tiers</p>
                  <p className="text-[10px] text-white/30 mt-0.5">
                    {assignedCount} / {eligibleGames.length} assigned
                  </p>
                </div>
                {assignedCount > 0 && (
                  <button
                    onClick={clearAll}
                    className="text-[10px] text-white/25 hover:text-white/50 transition-colors"
                  >Reset all</button>
                )}
              </div>

              {/* Progress bar */}
              <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full rounded-full bg-purple-500/60 transition-all duration-300"
                  style={{ width: `${eligibleGames.length > 0 ? (assignedCount / eligibleGames.length) * 100 : 0}%` }}
                />
              </div>

              {/* Tier legend */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {GAME_TIERS.map(tier => {
                  const s = TIER_STYLES[tier];
                  const count = tierCounts[tier] || 0;
                  return (
                    <span
                      key={tier}
                      className={clsx('inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border', s.activeBg, s.activeBorder, s.text)}
                    >
                      {tier}{count > 0 && <span className="font-normal opacity-60">×{count}</span>}
                    </span>
                  );
                })}
              </div>

              {/* Game list */}
              <div className="space-y-1.5">
                {eligibleGames.map(game => {
                  const assigned = assignments[game.id] as GameTier | undefined;
                  return (
                    <div
                      key={game.id}
                      className={clsx(
                        'flex items-center gap-2.5 px-2.5 py-2 rounded-xl border transition-colors',
                        assigned
                          ? `${TIER_STYLES[assigned].tabBg} ${TIER_STYLES[assigned].activeBorder}`
                          : 'bg-white/[0.02] border-white/[0.05]',
                      )}
                    >
                      {/* Thumbnail */}
                      <div className="w-8 h-8 rounded-md overflow-hidden bg-white/5 flex-shrink-0">
                        {game.thumbnail
                          ? <img src={game.thumbnail} alt={game.name} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center text-sm">🎮</div>}
                      </div>
                      {/* Name */}
                      <div className="flex-1 min-w-0">
                        <p className={clsx('text-xs font-medium truncate transition-colors', assigned ? TIER_STYLES[assigned].text : 'text-white/60')}>
                          {game.name}
                        </p>
                      </div>
                      {/* Tier buttons */}
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        {GAME_TIERS.map(tier => {
                          const s = TIER_STYLES[tier];
                          const isActive = assigned === tier;
                          return (
                            <button
                              key={tier}
                              onClick={() => isActive ? removeTier(game.id) : assignTier(game.id, tier)}
                              className={clsx(
                                'w-7 h-7 rounded-md text-[11px] font-bold border transition-all',
                                isActive
                                  ? `${s.activeBg} ${s.activeBorder} ${s.text}`
                                  : 'border-white/[0.08] text-white/20 hover:border-white/25 hover:text-white/50',
                              )}
                            >{tier}</button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* CTA */}
              {battleableTiers.length > 0 ? (
                <button
                  onClick={() => {
                    setSelectedBattleTier(battleableTiers[0]);
                    setTierPhase('battle');
                  }}
                  className="w-full py-3 rounded-xl bg-purple-500/20 border border-purple-400/30 text-purple-300 text-sm font-semibold hover:bg-purple-500/30 transition-colors"
                >
                  Battle within tiers →
                </button>
              ) : (
                <p className="text-center text-[11px] text-white/25 py-2">
                  Assign at least 2 games to the same tier to start battling.
                </p>
              )}
            </div>

          ) : (
            /* ── PHASE 2: BATTLE WITHIN TIER ───────────────────────── */
            <div className="space-y-4">
              {/* Back link + tier tab strip */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setTierPhase('assign')}
                  className="flex items-center gap-1 text-[11px] text-white/35 hover:text-white/60 transition-colors flex-shrink-0"
                >
                  <ChevronLeft size={12} /> Edit tiers
                </button>
                <div className="flex items-center gap-1 flex-wrap">
                  {GAME_TIERS.map(tier => {
                    const count = tierCounts[tier] || 0;
                    if (count < 2) return null;
                    const s = TIER_STYLES[tier];
                    const isActive = selectedBattleTier === tier;
                    return (
                      <button
                        key={tier}
                        onClick={() => {
                          setSelectedBattleTier(tier);
                          setCurrentPair(null);
                        }}
                        className={clsx(
                          'px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all',
                          isActive
                            ? `${s.activeBg} ${s.activeBorder} ${s.text}`
                            : 'border-white/[0.08] text-white/30 hover:border-white/20 hover:text-white/50',
                        )}
                      >
                        {tier} <span className="font-normal opacity-60 ml-0.5">{count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Info */}
              <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/5 border border-blue-400/15">
                <Info size={13} className="text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-white/50 leading-relaxed">
                  Battling within <span className={clsx('font-bold', selectedBattleTier ? TIER_STYLES[selectedBattleTier].text : '')}>
                    {selectedBattleTier} tier
                  </span> — {tierEligibleIds.length} games,{' '}
                  {tierEligibleIds.length * (tierEligibleIds.length - 1) / 2} pairs.
                  <span className="ml-1 text-white/30">{battles.length} battle{battles.length !== 1 ? 's' : ''} recorded for {currentPeriodLabel}.</span>
                </p>
              </div>

              {tierEligibleIds.length < 2 ? (
                <div className="text-center py-8 text-white/30 text-sm">
                  Select a tier with 2+ games to battle.
                </div>
              ) : !currentPair ? (
                <div className="text-center py-10 space-y-3">
                  <CheckCircle2 size={32} className="mx-auto text-emerald-400" />
                  <p className="text-sm font-semibold text-white/70">Tier {selectedBattleTier} is fully ranked!</p>
                  <p className="text-xs text-white/30">All pairs compared. Switch to another tier or view ELO Rankings.</p>
                  <button
                    onClick={() => setView('elo-rankings')}
                    className="mt-2 px-4 py-2 rounded-xl bg-purple-500/20 border border-purple-400/30 text-purple-300 text-sm font-medium hover:bg-purple-500/30 transition-colors"
                  >View Rankings →</button>
                </div>
              ) : (
                <>
                  {/* Progress */}
                  <div className="flex items-center justify-between text-[11px] text-white/30">
                    <span>{battles.length} battles recorded this period</span>
                    <span>{tierEligibleIds.length * (tierEligibleIds.length - 1) / 2} pairs in tier {selectedBattleTier}</span>
                  </div>

                  {/* Battle cards */}
                  <div className="relative">
                    {showResult && lastResult && (
                      <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-black/50 backdrop-blur-[2px] pointer-events-none">
                        <div className="battle-result-pop text-center space-y-1 px-4 py-3 rounded-xl bg-white/[0.06] border border-white/10">
                          <p className="text-base font-bold text-white">{lastResult.winner} wins!</p>
                          <p className="text-sm font-semibold text-emerald-400">+{lastResult.winnerChange} ELO</p>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3 group">
                      {currentPair.map((gameId, idx) => {
                        const game = gamesWithMetrics.find(g => g.id === gameId);
                        const ranking = rankings.find(r => r.gameId === gameId);
                        if (!game) return null;
                        const otherId = currentPair[idx === 0 ? 1 : 0];
                        const isWinner = pickedWinnerId === gameId;
                        const isLoser  = pickedWinnerId !== null && pickedWinnerId !== gameId;
                        return (
                          <div
                            key={`${gameId}-${battleKey}`}
                            className={idx === 0 ? 'battle-enter-left' : 'battle-enter-right'}
                          >
                            <BattleCard
                              game={game}
                              ranking={ranking}
                              onPick={() => handlePick(gameId, otherId)}
                              disabled={submitting}
                              isWinner={isWinner}
                              isLoser={isLoser}
                            />
                          </div>
                        );
                      })}
                    </div>

                    {/* VS separator */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none">
                      <div className="w-9 h-9 rounded-full bg-[#1a1a2e] border-2 border-white/10 flex items-center justify-center">
                        <span className="text-[11px] font-black text-white/50">VS</span>
                      </div>
                    </div>
                  </div>

                  {/* Skip pair */}
                  <button
                    onClick={() => {
                      const shuffled = [...tierEligibleIds].sort(() => Math.random() - 0.5);
                      const pair = getNextPair(shuffled);
                      if (pair && (pair[0] !== currentPair[0] || pair[1] !== currentPair[1])) {
                        setCurrentPair(pair);
                      }
                    }}
                    className="w-full py-2 text-[11px] text-white/25 hover:text-white/40 transition-colors"
                  >
                    Skip this pair →
                  </button>

                  {currentPair && (() => {
                    const pairCount = getBattleCount(currentPair[0], currentPair[1]);
                    return pairCount > 0 ? (
                      <p className="text-center text-[10px] text-white/25">
                        This pair has battled {pairCount} time{pairCount !== 1 ? 's' : ''} before.
                      </p>
                    ) : null;
                  })()}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── ELO RANKINGS ─────────────────────────────────────────── */}
      {view === 'elo-rankings' && (
        <div className="space-y-4">
          {/* Period type selector */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] text-white/40">Period:</span>
            {ELO_PERIOD_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setEloPeriod(opt.value)}
                className={clsx(
                  'px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all border',
                  eloPeriod === opt.value
                    ? 'bg-purple-500/20 border-purple-400/30 text-purple-300'
                    : 'border-white/5 text-white/40 hover:text-white/60 hover:border-white/10'
                )}
              >{opt.label}</button>
            ))}
          </div>

          {/* Period key: label + prev/next navigation */}
          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/3 border border-white/8">
            <button
              onClick={() => setPeriodOffset(o => o + 1)}
              disabled={eloPeriod === 'all'}
              className="p-1 rounded-lg text-white/30 hover:text-white/60 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
              aria-label="Previous period"
            ><ChevronLeft size={14} /></button>
            <div className="flex items-center gap-1.5">
              <Calendar size={12} className="text-purple-400" />
              <span className="text-xs font-semibold text-white/80">{currentPeriodLabel}</span>
              {periodOffset > 0 && (
                <span className="text-[10px] text-white/30 ml-1">({periodOffset} {eloPeriod}{periodOffset > 1 ? 's' : ''} ago)</span>
              )}
            </div>
            <button
              onClick={() => setPeriodOffset(o => Math.max(0, o - 1))}
              disabled={eloPeriod === 'all' || periodOffset === 0}
              className="p-1 rounded-lg text-white/30 hover:text-white/60 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
              aria-label="Next period"
            ><ChevronRight size={14} /></button>
          </div>

          {rankLoading ? (
            <div className="text-center py-8 text-white/30 text-sm flex items-center justify-center gap-2">
              <RefreshCw size={14} className="animate-spin" /> Loading rankings…
            </div>
          ) : eloRankedWithUnranked.length === 0 ? (
            <div className="text-center py-10 text-white/30 text-sm">
              No eligible games found. Add games with ratings or play time to get started.
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between text-[11px] text-white/30">
                <span>{eloRanked.length} ranked · {eloRankedWithUnranked.length - eloRanked.length} unranked</span>
                <button
                  onClick={() => setView('battle')}
                  className="flex items-center gap-1 text-purple-400 hover:text-purple-300 transition-colors"
                >
                  <LayoutGrid size={11} /> Tier Rank
                </button>
              </div>

              {/* Top 3 podium */}
              {eloRanked.length >= 1 && (
                <div className={clsx(
                  'grid gap-3',
                  eloRanked.length === 1 ? 'grid-cols-1 max-w-[140px] mx-auto' :
                  eloRanked.length === 2 ? 'grid-cols-2 max-w-xs mx-auto' : 'grid-cols-3'
                )}>
                  {eloRanked.length >= 2 && (
                    <div className="mt-4">
                      <div className={clsx('relative flex flex-col items-center rounded-xl border p-3', TIER_COLORS[2].border, TIER_COLORS[2].bg, 'opacity-90')}>
                        <div className={clsx('absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[10px] font-bold', TIER_COLORS[2].badge)}>🥈 2nd</div>
                        <div className="mt-2 mb-1 w-12 h-12 rounded-lg overflow-hidden bg-white/5">
                          {eloRanked[1].game.thumbnail
                            ? <img src={eloRanked[1].game.thumbnail} alt={eloRanked[1].game.name} className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center text-xl">🎮</div>}
                        </div>
                        <p className="text-[10px] font-semibold text-white/90 text-center line-clamp-2 mb-1">{eloRanked[1].game.name}</p>
                        <span className={clsx('text-sm font-bold', TIER_COLORS[2].text)}>{eloRanked[1].ranking.eloScore}</span>
                        <EloTierBadge elo={eloRanked[1].ranking.eloScore} />
                        <AwardStrip awards={eloRanked[1].game.awards} />
                      </div>
                    </div>
                  )}
                  <div className={clsx('relative flex flex-col items-center rounded-xl border p-3 scale-105', TIER_COLORS[1].border, TIER_COLORS[1].bg)}>
                    <div className={clsx('absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[10px] font-bold', TIER_COLORS[1].badge)}>🥇 1st</div>
                    <div className="mt-2 mb-1 w-14 h-14 rounded-lg overflow-hidden bg-white/5">
                      {eloRanked[0].game.thumbnail
                        ? <img src={eloRanked[0].game.thumbnail} alt={eloRanked[0].game.name} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-2xl">🎮</div>}
                    </div>
                    <p className="text-[11px] font-semibold text-white/90 text-center line-clamp-2 mb-1">{eloRanked[0].game.name}</p>
                    <span className={clsx('text-base font-bold', TIER_COLORS[1].text)}>{eloRanked[0].ranking.eloScore}</span>
                    <EloTierBadge elo={eloRanked[0].ranking.eloScore} />
                    <AwardStrip awards={eloRanked[0].game.awards} />
                  </div>
                  {eloRanked.length >= 3 && (
                    <div className="mt-8">
                      <div className={clsx('relative flex flex-col items-center rounded-xl border p-3', TIER_COLORS[3].border, TIER_COLORS[3].bg, 'opacity-90')}>
                        <div className={clsx('absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[10px] font-bold', TIER_COLORS[3].badge)}>🥉 3rd</div>
                        <div className="mt-2 mb-1 w-12 h-12 rounded-lg overflow-hidden bg-white/5">
                          {eloRanked[2].game.thumbnail
                            ? <img src={eloRanked[2].game.thumbnail} alt={eloRanked[2].game.name} className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center text-xl">🎮</div>}
                        </div>
                        <p className="text-[10px] font-semibold text-white/90 text-center line-clamp-2 mb-1">{eloRanked[2].game.name}</p>
                        <span className={clsx('text-sm font-bold', TIER_COLORS[3].text)}>{eloRanked[2].ranking.eloScore}</span>
                        <EloTierBadge elo={eloRanked[2].ranking.eloScore} />
                        <AwardStrip awards={eloRanked[2].game.awards} />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Full list */}
              {eloRankedWithUnranked.length > 3 && (
                <div className="space-y-1.5 mt-2">
                  <p className="text-[11px] text-white/30 font-medium uppercase tracking-wider mb-2">All Games</p>
                  {eloRankedWithUnranked.slice(3).map(({ ranking, game }, idx) => (
                    <div key={game.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-colors">
                      <span className="text-[11px] text-white/30 font-mono w-6 text-right flex-shrink-0">
                        {ranking ? `#${idx + 4}` : '—'}
                      </span>
                      <div className="w-8 h-8 rounded-md overflow-hidden bg-white/5 flex-shrink-0">
                        {game.thumbnail
                          ? <img src={game.thumbnail} alt={game.name} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center text-sm">🎮</div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-white/80 truncate">{game.name}</p>
                        <p className="text-[10px] text-white/30 truncate">
                          {[game.genre, game.platform].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                      {ranking ? (
                        <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                          <span className="text-xs font-bold text-white/70">{ranking.eloScore}</span>
                          <span className="text-[9px] text-white/30">{ranking.wins}W·{ranking.losses}L</span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-white/25 italic flex-shrink-0">Unranked</span>
                      )}
                      {ranking && <EloTierBadge elo={ranking.eloScore} />}
                      <AwardStrip awards={game.awards} />
                    </div>
                  ))}
                </div>
              )}

              {eloRanked.length === 0 && (
                <div className="text-center py-6 text-white/30 text-sm">
                  <p>No ELO data yet for {getPeriodLabel(eloPeriod)}.</p>
                  <button
                    onClick={() => setView('battle')}
                    className="mt-3 px-4 py-2 rounded-xl bg-purple-500/20 border border-purple-400/30 text-purple-300 text-sm font-medium hover:bg-purple-500/30 transition-colors"
                  >Assign Tiers →</button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
