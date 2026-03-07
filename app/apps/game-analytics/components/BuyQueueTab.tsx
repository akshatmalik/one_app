'use client';

import { useState, useMemo } from 'react';
import {
  Plus, ShoppingCart, Calendar, TrendingDown, Clock, PackageCheck,
  ChevronDown, ChevronUp, AlertTriangle, Settings, Sparkles,
  Tag, Gift, Target, Zap, BarChart2, Trophy, ArrowRight
} from 'lucide-react';
import { Game, BudgetSettings, PurchaseQueueEntry } from '../lib/types';
import { usePurchaseQueue } from '../hooks/usePurchaseQueue';
import { AddToBuyQueueModal } from './AddToBuyQueueModal';
import { BuyQueueCard } from './BuyQueueCard';
import {
  getQueueImpactSnapshot,
  getSaleSeasonIndicator,
  getPurchaseHistoryInsights,
} from '../lib/calculations';
import clsx from 'clsx';

interface Props {
  userId: string | null;
  wishlistGames: Game[];
  allGames: Game[];
  budgets: BudgetSettings[];
  yearSpent: number;
  onGoToBudget: () => void;
  onAddGameToLibrary?: (data: { name: string; price: number; platform?: string; genre?: string; thumbnail?: string; datePurchased?: string; status: string }) => void;
}

function formatMoney(n: number): string {
  return `$${n.toFixed(0)}`;
}

export function BuyQueueTab({ userId, wishlistGames, allGames, budgets, yearSpent, onGoToBudget, onAddGameToLibrary }: Props) {
  const {
    entries,
    activeEntries,
    upcomingEntries,
    availableEntries,
    purchasedEntries,
    loading,
    plannedSpend,
    releasingSoon,
    addEntry,
    updateEntry,
    deleteEntry,
    markPurchased,
  } = usePurchaseQueue(userId);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showPurchased, setShowPurchased] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'timeline'>('list');

  const currentYear = new Date().getFullYear();
  const yearBudget = budgets.find(b => b.year === currentYear)?.yearlyBudget ?? null;

  // Budget ring math
  const budgetUsed = yearSpent;
  const budgetPlanned = plannedSpend;
  const budgetTotal = yearBudget ?? 0;
  const budgetRemaining = yearBudget != null ? yearBudget - budgetUsed - budgetPlanned : null;
  const isOverBudget = yearBudget != null && (budgetUsed + budgetPlanned) > yearBudget;
  const overBy = yearBudget != null ? Math.max(0, budgetUsed + budgetPlanned - yearBudget) : 0;

  // Ring percentages
  const spentPct = budgetTotal > 0 ? Math.min(100, (budgetUsed / budgetTotal) * 100) : 0;
  const plannedPct = budgetTotal > 0 ? Math.min(100 - spentPct, (budgetPlanned / budgetTotal) * 100) : 0;

  // Sale season
  const saleSeason = useMemo(() => getSaleSeasonIndicator(), []);

  // Deal alerts
  const dealsAtTarget = useMemo(() =>
    activeEntries.filter(e =>
      e.currentPrice != null && e.targetPrice != null && e.currentPrice <= e.targetPrice
    ), [activeEntries]);

  // Stats
  const stats = useMemo(() => {
    const dayOneBuys = activeEntries.filter(e => e.isDayOneBuy).length;
    const totalSavingsPotential = activeEntries.reduce((sum, e) => {
      if (!e.msrpEstimate || !e.targetPrice) return sum;
      return sum + Math.max(0, e.msrpEstimate - e.targetPrice);
    }, 0);
    const platformBreakdown = activeEntries.reduce<Record<string, number>>((acc, e) => {
      if (e.platform) acc[e.platform] = (acc[e.platform] || 0) + 1;
      return acc;
    }, {});
    const genreBreakdown = activeEntries.reduce<Record<string, number>>((acc, e) => {
      if (e.genre) acc[e.genre] = (acc[e.genre] || 0) + 1;
      return acc;
    }, {});
    const purchaseInsights = getPurchaseHistoryInsights(entries);
    const impact = getQueueImpactSnapshot(activeEntries, yearBudget, yearSpent);
    return { dayOneBuys, totalSavingsPotential, platformBreakdown, genreBreakdown, purchaseInsights, impact };
  }, [activeEntries, entries, yearBudget, yearSpent]);

  // Monthly timeline view data
  const monthlyPlan = useMemo(() => {
    if (viewMode !== 'timeline') return [];
    const months: { month: string; entries: PurchaseQueueEntry[]; totalCost: number }[] = [];
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const monthStr = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      const monthEntries = activeEntries.filter(e => {
        if (!e.releaseDate) return i === 0; // no release date → show in current month
        const rel = new Date(e.releaseDate);
        return rel.getMonth() === d.getMonth() && rel.getFullYear() === d.getFullYear();
      });
      if (monthEntries.length > 0 || i === 0) {
        const totalCost = monthEntries.reduce((s, e) => s + (e.targetPrice ?? e.currentPrice ?? e.msrpEstimate ?? 0), 0);
        months.push({ month: monthStr, entries: monthEntries, totalCost });
      }
    }
    return months;
  }, [activeEntries, viewMode]);

  const wishlistForModal = wishlistGames.map(g => ({
    name: g.name,
    platform: g.platform,
    genre: g.genre,
    thumbnail: g.thumbnail,
  }));

  const handleDelete = (id: string) => {
    if (window.confirm('Remove this game from your buy queue?')) {
      deleteEntry(id);
    }
  };

  const handleMarkPurchased = async (id: string, price?: number) => {
    const entry = entries.find(e => e.id === id);
    await markPurchased(id, price);

    // Auto-create in library (Feature #12)
    if (entry && onAddGameToLibrary) {
      onAddGameToLibrary({
        name: entry.gameName,
        price: price ?? entry.currentPrice ?? entry.targetPrice ?? 0,
        platform: entry.platform,
        genre: entry.genre,
        thumbnail: entry.thumbnail,
        datePurchased: new Date().toISOString().split('T')[0],
        status: 'Not Started',
      });
    }
  };

  // SVG budget ring helper
  const renderBudgetRing = () => {
    if (yearBudget == null) return null;
    const size = 120;
    const strokeWidth = 10;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const spentDash = (spentPct / 100) * circumference;
    const plannedDash = (plannedPct / 100) * circumference;
    const spentOffset = 0;
    const plannedOffset = circumference - spentDash;

    return (
      <div className="flex items-center gap-5">
        <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="transform -rotate-90">
            {/* Background track */}
            <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={strokeWidth} />
            {/* Spent arc */}
            <circle cx={size/2} cy={size/2} r={radius} fill="none"
              stroke="#10b981" strokeWidth={strokeWidth} strokeLinecap="round"
              strokeDasharray={`${spentDash} ${circumference - spentDash}`}
              strokeDashoffset={spentOffset}
              className="transition-all duration-700"
            />
            {/* Planned arc */}
            {plannedPct > 0 && (
              <circle cx={size/2} cy={size/2} r={radius} fill="none"
                stroke={isOverBudget ? '#ef4444' : '#f59e0b'} strokeWidth={strokeWidth} strokeLinecap="round"
                strokeDasharray={`${plannedDash} ${circumference - plannedDash}`}
                strokeDashoffset={-spentDash}
                className="transition-all duration-700"
              />
            )}
          </svg>
          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {isOverBudget ? (
              <>
                <span className="text-xs text-red-400 font-medium">Over by</span>
                <span className="text-lg font-bold text-red-400">{formatMoney(overBy)}</span>
              </>
            ) : (
              <>
                <span className="text-[10px] text-white/40">Left</span>
                <span className="text-lg font-bold text-white/90">
                  {budgetRemaining != null ? formatMoney(Math.max(0, budgetRemaining)) : '—'}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="space-y-2 flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-white/50 uppercase tracking-wider">{currentYear} Budget</span>
            <span className="text-xs text-white/30">{formatMoney(budgetTotal)}</span>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-[11px]">
              <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
              <span className="text-white/40">Spent</span>
              <span className="text-white/70 font-medium ml-auto">{formatMoney(budgetUsed)}</span>
            </div>
            {budgetPlanned > 0 && (
              <div className="flex items-center gap-2 text-[11px]">
                <span className={clsx('w-2 h-2 rounded-full flex-shrink-0', isOverBudget ? 'bg-red-500' : 'bg-amber-400')} />
                <span className="text-white/40">Queued</span>
                <span className="text-white/70 font-medium ml-auto">{formatMoney(budgetPlanned)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-white/30 text-sm">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Deal Alert Banner (Feature #11) */}
      {dealsAtTarget.length > 0 && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.08] p-3 buy-queue-deal-alert">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
              <Target size={16} className="text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-emerald-400">
                {dealsAtTarget.length} game{dealsAtTarget.length !== 1 ? 's' : ''} at target price!
              </div>
              <div className="text-[11px] text-emerald-400/60 truncate">
                {dealsAtTarget.map(e => e.gameName).join(', ')}
              </div>
            </div>
            <Sparkles size={14} className="text-emerald-400/50 flex-shrink-0" />
          </div>
        </div>
      )}

      {/* Sale Season Badge (Feature #20) */}
      {saleSeason && (
        <div className={clsx(
          'flex items-center gap-2 px-3 py-2 rounded-lg text-xs',
          saleSeason.inSeason
            ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
            : 'bg-white/[0.02] border border-white/5 text-white/40'
        )}>
          <Tag size={12} />
          <span className="font-medium">{saleSeason.label}</span>
          {!saleSeason.inSeason && saleSeason.daysUntil <= 30 && (
            <span className="text-[10px] text-white/25 ml-auto">Consider waiting</span>
          )}
        </div>
      )}

      {/* Budget Ring (Feature #1) */}
      <div className={clsx(
        'rounded-xl border p-4',
        isOverBudget ? 'bg-red-500/5 border-red-500/20' : 'bg-white/[0.02] border-white/5'
      )}>
        {yearBudget != null ? (
          renderBudgetRing()
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-white/50 uppercase tracking-wider">{currentYear} Budget</span>
              <p className="text-[11px] text-white/25 mt-1">
                Set a budget in Stats to track spend vs plan here
              </p>
            </div>
            <button
              onClick={onGoToBudget}
              className="flex items-center gap-1.5 text-[11px] text-white/30 hover:text-white/60 transition-colors px-3 py-1.5 rounded-lg bg-white/5"
            >
              <Settings size={11} />
              Set Budget
            </button>
          </div>
        )}
      </div>

      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <ShoppingCart size={16} className="text-emerald-400" />
            <span className="text-white/70 text-sm">
              <span className="text-white font-medium">{activeEntries.length}</span> watching
            </span>
          </div>
          {releasingSoon > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-purple-400">
              <Calendar size={12} />
              <span>{releasingSoon} in 90d</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle (Feature #14) */}
          <div className="flex items-center bg-white/5 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('list')}
              className={clsx('px-2.5 py-1.5 text-xs transition-all', viewMode === 'list' ? 'bg-white/10 text-white/80' : 'text-white/30')}
            >
              List
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className={clsx('px-2.5 py-1.5 text-xs transition-all', viewMode === 'timeline' ? 'bg-white/10 text-white/80' : 'text-white/30')}
            >
              Plan
            </button>
          </div>

          <button
            onClick={() => setShowStats(!showStats)}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all',
              showStats ? 'bg-emerald-500/15 text-emerald-400' : 'bg-white/5 text-white/40 hover:text-white/60'
            )}
          >
            <BarChart2 size={13} />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-all"
          >
            <Plus size={14} />
            Add
          </button>
        </div>
      </div>

      {/* Stats Dashboard (Feature #15) */}
      {showStats && activeEntries.length > 0 && (
        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-4">
          <h3 className="text-xs font-medium text-white/50 uppercase tracking-wider">Queue Intelligence</h3>

          {/* Quick stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-white/[0.02]">
              <div className="text-lg font-semibold text-white/90">{activeEntries.length}</div>
              <div className="text-[11px] text-white/30">Watching</div>
            </div>
            <div className="p-3 rounded-lg bg-white/[0.02]">
              <div className="text-lg font-semibold text-amber-400">{stats.dayOneBuys}</div>
              <div className="text-[11px] text-white/30">Day 1 Buys</div>
            </div>
            <div className="p-3 rounded-lg bg-white/[0.02]">
              <div className="text-lg font-semibold text-white/90">{formatMoney(plannedSpend)}</div>
              <div className="text-[11px] text-white/30">Planned</div>
            </div>
            {stats.totalSavingsPotential > 0 && (
              <div className="p-3 rounded-lg bg-white/[0.02]">
                <div className="text-lg font-semibold text-emerald-400">{formatMoney(stats.totalSavingsPotential)}</div>
                <div className="text-[11px] text-white/30">Potential Savings</div>
              </div>
            )}
          </div>

          {/* "If You Bought Everything" Snapshot (Feature #16) */}
          {stats.impact.totalCost > 0 && (
            <div className="p-3 rounded-lg bg-white/[0.03] border border-white/5">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={12} className="text-purple-400" />
                <span className="text-xs font-medium text-white/50">If You Bought Everything</span>
              </div>
              <div className="flex items-center gap-4 flex-wrap text-[11px]">
                <span className="text-white/70 font-medium">{formatMoney(stats.impact.totalCost)} total</span>
                {stats.impact.overBudget != null && stats.impact.overBudget > 0 && (
                  <span className="text-red-400">{formatMoney(stats.impact.overBudget)} over budget</span>
                )}
                <span className="text-white/40">{stats.impact.newLibrarySize} games</span>
              </div>
              {stats.impact.genreBreakdown.length > 0 && (
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  {stats.impact.genreBreakdown.slice(0, 4).map(g => (
                    <span key={g.genre} className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-white/40">
                      {g.genre} ({g.count})
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Platform breakdown */}
          {Object.keys(stats.platformBreakdown).length > 0 && (
            <div>
              <div className="text-[11px] text-white/30 mb-2">By Platform</div>
              <div className="flex items-center gap-2 flex-wrap">
                {Object.entries(stats.platformBreakdown)
                  .sort((a, b) => b[1] - a[1])
                  .map(([plat, count]) => (
                    <div key={plat} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 text-xs">
                      <span className="text-white/60">{plat}</span>
                      <span className="text-white/30">{count}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty state (Feature #18) */}
      {activeEntries.length === 0 && (
        <div className="text-center py-16 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-white/[0.03] flex items-center justify-center mx-auto">
            <ShoppingCart size={28} className="text-white/10" />
          </div>
          <div>
            <p className="text-white/50 text-sm font-medium">Your buy queue is empty</p>
            <p className="text-white/20 text-xs mt-1.5 max-w-xs mx-auto leading-relaxed">
              Either you&apos;re incredibly disciplined, or there&apos;s nothing worth playing. We both know it&apos;s not the second one.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium transition-all hover:bg-emerald-500"
            >
              <Plus size={14} />
              Add a game
            </button>
            {wishlistGames.length > 0 && (
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-500/10 text-purple-400 text-sm transition-all hover:bg-purple-500/20"
              >
                <Gift size={14} />
                From Wishlist
              </button>
            )}
          </div>
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <>
          {/* Upcoming section */}
          {upcomingEntries.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Calendar size={13} className="text-purple-400" />
                <h3 className="text-xs font-medium text-white/50 uppercase tracking-wider">Upcoming</h3>
                <span className="text-[11px] text-white/25">{upcomingEntries.length}</span>
              </div>
              <div className="space-y-2">
                {upcomingEntries.map(entry => (
                  <BuyQueueCard
                    key={entry.id}
                    entry={entry}
                    allGames={allGames}
                    onUpdate={updateEntry}
                    onMarkPurchased={handleMarkPurchased}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Released / Price Watch section */}
          {availableEntries.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Clock size={13} className="text-emerald-400" />
                <h3 className="text-xs font-medium text-white/50 uppercase tracking-wider">
                  {upcomingEntries.length > 0 ? 'Released — Price Watch' : 'Watching'}
                </h3>
                <span className="text-[11px] text-white/25">{availableEntries.length}</span>
              </div>
              <div className="space-y-2">
                {availableEntries.map(entry => (
                  <BuyQueueCard
                    key={entry.id}
                    entry={entry}
                    allGames={allGames}
                    onUpdate={updateEntry}
                    onMarkPurchased={handleMarkPurchased}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Timeline/Plan View (Feature #14) */}
      {viewMode === 'timeline' && (
        <div className="space-y-4">
          {monthlyPlan.length === 0 && activeEntries.length === 0 && (
            <p className="text-center text-white/25 text-sm py-8">No games to show in the timeline</p>
          )}
          {monthlyPlan.map(month => (
            <div key={month.month} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar size={13} className="text-purple-400" />
                  <h3 className="text-xs font-medium text-white/50 uppercase tracking-wider">{month.month}</h3>
                  <span className="text-[11px] text-white/25">{month.entries.length} game{month.entries.length !== 1 ? 's' : ''}</span>
                </div>
                {month.totalCost > 0 && (
                  <span className="text-xs text-white/30">{formatMoney(month.totalCost)}</span>
                )}
              </div>
              {month.entries.length > 0 ? (
                <div className="space-y-2">
                  {month.entries.map(entry => (
                    <BuyQueueCard
                      key={entry.id}
                      entry={entry}
                      allGames={allGames}
                      onUpdate={updateEntry}
                      onMarkPurchased={handleMarkPurchased}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-[11px] text-white/15">No planned purchases</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Purchased history (Feature #17 - Enhanced) */}
      {purchasedEntries.length > 0 && (
        <div className="space-y-2">
          <button
            onClick={() => setShowPurchased(!showPurchased)}
            className="flex items-center gap-2 text-xs text-white/30 hover:text-white/50 transition-colors w-full"
          >
            {showPurchased ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            <PackageCheck size={12} className="text-white/25" />
            <span>{purchasedEntries.length} purchased</span>
            {stats.purchaseInsights.totalSaved > 0 && (
              <span className="text-emerald-400/50 ml-auto">Saved {formatMoney(stats.purchaseInsights.totalSaved)}</span>
            )}
          </button>
          {showPurchased && (
            <div className="space-y-3">
              {/* Purchase insights summary */}
              {purchasedEntries.length >= 2 && (
                <div className="flex items-center gap-4 flex-wrap px-3 py-2 bg-white/[0.02] rounded-lg text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <Trophy size={10} className="text-amber-400" />
                    <span className="text-white/40">Queue purchases:</span>
                    <span className="text-white/60 font-medium">{stats.purchaseInsights.gamesFromQueue}</span>
                  </div>
                  {stats.purchaseInsights.totalSaved > 0 && (
                    <div className="flex items-center gap-1.5">
                      <TrendingDown size={10} className="text-emerald-400" />
                      <span className="text-white/40">Saved vs MSRP:</span>
                      <span className="text-emerald-400 font-medium">{formatMoney(stats.purchaseInsights.totalSaved)}</span>
                    </div>
                  )}
                  {stats.purchaseInsights.avgWaitDays > 0 && (
                    <div className="flex items-center gap-1.5">
                      <Clock size={10} className="text-white/30" />
                      <span className="text-white/40">Avg wait:</span>
                      <span className="text-white/60 font-medium">{stats.purchaseInsights.avgWaitDays}d</span>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2 opacity-60">
                {purchasedEntries.map(entry => (
                  <div key={entry.id} className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                    {entry.thumbnail ? (
                      <img src={entry.thumbnail} alt="" className="w-10 h-7 rounded object-cover flex-shrink-0 grayscale" />
                    ) : (
                      <div className="w-10 h-7 rounded bg-white/5 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white/50 truncate">{entry.gameName}</div>
                      <div className="flex items-center gap-2 text-[11px] text-white/25">
                        {entry.purchasePrice != null && <span>Paid ${entry.purchasePrice}</span>}
                        {entry.msrpEstimate && entry.purchasePrice != null && entry.msrpEstimate > entry.purchasePrice && (
                          <span className="text-emerald-400/60">Saved ${(entry.msrpEstimate - entry.purchasePrice).toFixed(0)}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-emerald-400/60 text-[11px]">
                      <PackageCheck size={11} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Wishlist nudge (Feature #13) */}
      {wishlistGames.length > 0 && activeEntries.length > 0 && (
        (() => {
          const queuedNames = new Set(activeEntries.map(e => e.gameName.toLowerCase()));
          const untracked = wishlistGames.filter(g => !queuedNames.has(g.name.toLowerCase()));
          if (untracked.length === 0) return null;
          return (
            <div className="flex items-center gap-2 px-3 py-2 bg-purple-500/[0.05] border border-purple-500/10 rounded-lg text-[11px]">
              <Gift size={12} className="text-purple-400/50 flex-shrink-0" />
              <span className="text-white/30">
                {untracked.length} wishlist game{untracked.length !== 1 ? 's' : ''} not in your buy queue
              </span>
              <button
                onClick={() => setShowAddModal(true)}
                className="ml-auto text-purple-400/60 hover:text-purple-400 transition-colors flex items-center gap-1"
              >
                Track <ArrowRight size={10} />
              </button>
            </div>
          );
        })()
      )}

      {/* Add modal */}
      {showAddModal && (
        <AddToBuyQueueModal
          onAdd={addEntry}
          onClose={() => setShowAddModal(false)}
          nextPriority={activeEntries.length + 1}
          wishlistGames={wishlistForModal}
          allGames={allGames}
        />
      )}
    </div>
  );
}
