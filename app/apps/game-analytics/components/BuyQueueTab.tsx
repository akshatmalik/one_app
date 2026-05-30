'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  Plus, ShoppingCart, Calendar, TrendingDown, Clock, PackageCheck,
  Settings, Sparkles,
  Tag, Gift, Target, BarChart2, Trophy, ArrowRight, HelpCircle,
  ArrowUpDown, Wand2, Loader2, ListOrdered, X, Wallet
} from 'lucide-react';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, TouchSensor,
  useSensor, useSensors, DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Game, BudgetSettings, PurchaseQueueEntry } from '../lib/types';
import { usePurchaseQueue } from '../hooks/usePurchaseQueue';
import { AddToBuyQueueModal } from './AddToBuyQueueModal';
import { BuyQueueCard } from './BuyQueueCard';
import {
  getQueueImpactSnapshot,
  getBudgetFitScenarios,
  getSaleSeasonIndicator,
  getPurchaseHistoryInsights,
  getBuyConfidence,
  getPredictedValue,
  buildBuyQueueAIContext,
} from '../lib/calculations';
import { generateBuyQueueAdvice, BuyQueueAdvice } from '../lib/ai-buyqueue-service';
import clsx from 'clsx';

type SortMode = 'priority' | 'confidence' | 'price' | 'release' | 'value';

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: 'priority', label: 'Manual' },
  { value: 'confidence', label: 'Confidence' },
  { value: 'price', label: 'Price' },
  { value: 'release', label: 'Release' },
  { value: 'value', label: 'Value' },
];

const priceOf = (e: PurchaseQueueEntry): number =>
  e.targetPrice ?? e.currentPrice ?? e.msrpEstimate ?? 0;

const VALUE_RANK: Record<string, number> = { Excellent: 4, Good: 3, Fair: 2, Poor: 1 };

interface Props {
  userId: string | null;
  wishlistGames: Game[];
  allGames: Game[];
  budgets: BudgetSettings[];
  yearSpent: number;
  onGoToBudget: () => void;
  onAddGameToLibrary?: (data: { name: string; price: number; platform?: string; genre?: string; thumbnail?: string; datePurchased?: string; status: string }) => Promise<string | undefined>;
  onAddToPlayQueue?: (gameId: string) => Promise<void>;
}

/** Sortable wrapper so committed cards can be drag-reordered in Manual mode. */
function SortableBuyCard({ entry, children }: { entry: PurchaseQueueEntry; children: (handleProps: React.HTMLAttributes<HTMLButtonElement>) => React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: entry.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };
  return (
    <div ref={setNodeRef} style={style}>
      {children({ ...attributes, ...(listeners as React.HTMLAttributes<HTMLButtonElement>) })}
    </div>
  );
}

function formatMoney(n: number): string {
  return `$${n.toFixed(0)}`;
}

export function BuyQueueTab({ userId, wishlistGames, allGames, budgets, yearSpent, onGoToBudget, onAddGameToLibrary, onAddToPlayQueue }: Props) {
  const {
    entries,
    activeEntries,
    maybeEntries,
    deferredEntries,
    purchasedEntries,
    loading,
    plannedSpend,
    fullPriceSpend,
    maybeSpend,
    deferredSpend,
    releasingSoon,
    addEntry,
    updateEntry,
    deleteEntry,
    markPurchased,
    setIntent,
    reorderEntries,
  } = usePurchaseQueue(userId);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showStats, setShowStats] = useState(false);
  // 'deal' = assume target/sale prices (default), 'full' = assume full MSRP now.
  const [pricingMode, setPricingMode] = useState<'deal' | 'full'>('deal');
  // Top-level view: the live queue ('watching') or already-bought history ('bought').
  const [mainView, setMainView] = useState<'watching' | 'bought'>('watching');

  // Restore the saved pricing preference once on mount.
  useEffect(() => {
    try {
      const saved = localStorage.getItem('buy-queue-pricing-mode');
      if (saved === 'full' || saved === 'deal') setPricingMode(saved);
    } catch {
      // ignore — non-persistent is fine
    }
  }, []);

  const handlePricingMode = (mode: 'deal' | 'full') => {
    setPricingMode(mode);
    try {
      localStorage.setItem('buy-queue-pricing-mode', mode);
    } catch {
      // ignore
    }
  };
  const [viewMode, setViewMode] = useState<'list' | 'timeline'>('list');
  const [sortMode, setSortMode] = useState<SortMode>('priority');
  const [aiAdvice, setAiAdvice] = useState<BuyQueueAdvice | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [justPurchased, setJustPurchased] = useState<{ name: string; gameId: string } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const currentYear = new Date().getFullYear();
  const yearBudget = budgets.find(b => b.year === currentYear)?.yearlyBudget ?? null;

  // Budget ring math — "planned" follows the selected pricing scenario.
  const budgetUsed = yearSpent;
  const budgetPlanned = pricingMode === 'full' ? fullPriceSpend : plannedSpend;
  const budgetTotal = yearBudget ?? 0;
  const budgetRemaining = yearBudget != null ? yearBudget - budgetUsed - budgetPlanned : null;
  const isOverBudget = yearBudget != null && (budgetUsed + budgetPlanned) > yearBudget;
  const overBy = yearBudget != null ? Math.max(0, budgetUsed + budgetPlanned - yearBudget) : 0;

  // Ring percentages
  const spentPct = budgetTotal > 0 ? Math.min(100, (budgetUsed / budgetTotal) * 100) : 0;
  const plannedPct = budgetTotal > 0 ? Math.min(100 - spentPct, (budgetPlanned / budgetTotal) * 100) : 0;

  // Budget fit — how many committed picks fit at full price vs deal price.
  const budgetFit = useMemo(
    () => getBudgetFitScenarios(activeEntries, yearBudget, yearSpent),
    [activeEntries, yearBudget, yearSpent]
  );

  // Sale season
  const saleSeason = useMemo(() => getSaleSeasonIndicator(), []);

  // Deal alerts — committed watches plus deferred (deferred is the discount-watch bucket)
  const dealsAtTarget = useMemo(() =>
    [...activeEntries, ...deferredEntries].filter(e =>
      e.currentPrice != null && e.targetPrice != null && e.currentPrice <= e.targetPrice
    ), [activeEntries, deferredEntries]);

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

  // Display order respects the active sort; drag only rewires Manual priority.
  const sortComparator = useMemo(() => {
    return (a: PurchaseQueueEntry, b: PurchaseQueueEntry): number => {
      switch (sortMode) {
        case 'confidence': return getBuyConfidence(b, allGames).score - getBuyConfidence(a, allGames).score;
        case 'price': return priceOf(a) - priceOf(b);
        case 'release': {
          const ra = a.releaseDate ? new Date(a.releaseDate).getTime() : Infinity;
          const rb = b.releaseDate ? new Date(b.releaseDate).getTime() : Infinity;
          return ra - rb;
        }
        case 'value': {
          const va = VALUE_RANK[getPredictedValue(a, allGames)?.predictedRating ?? ''] ?? 0;
          const vb = VALUE_RANK[getPredictedValue(b, allGames)?.predictedRating ?? ''] ?? 0;
          return vb - va;
        }
        default: return a.priority - b.priority;
      }
    };
  }, [sortMode, allGames]);

  const sortedCommitted = useMemo(() => [...activeEntries].sort(sortComparator), [activeEntries, sortComparator]);
  const sortedMaybe = useMemo(() => [...maybeEntries].sort(sortComparator), [maybeEntries, sortComparator]);
  const sortedDeferred = useMemo(() => [...deferredEntries].sort(sortComparator), [deferredEntries, sortComparator]);

  const dragEnabled = sortMode === 'priority';

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = sortedCommitted.map(e => e.id);
    const oldIndex = ids.indexOf(active.id as string);
    const newIndex = ids.indexOf(over.id as string);
    if (oldIndex < 0 || newIndex < 0) return;
    reorderEntries(arrayMove(ids, oldIndex, newIndex));
  };

  const handleAskAI = async () => {
    setAiLoading(true);
    try {
      const ctx = buildBuyQueueAIContext(activeEntries, maybeEntries, deferredEntries, allGames, yearBudget, yearSpent);
      const advice = await generateBuyQueueAdvice(ctx);
      setAiAdvice(advice);
    } finally {
      setAiLoading(false);
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Remove this game from your buy queue?')) {
      deleteEntry(id);
    }
  };

  const handleMarkPurchased = async (id: string, price?: number) => {
    const entry = entries.find(e => e.id === id);
    await markPurchased(id, price);

    // Auto-create in library (Feature #12), then offer the buy → play handoff (A3)
    if (entry && onAddGameToLibrary) {
      const newGameId = await onAddGameToLibrary({
        name: entry.gameName,
        price: price ?? entry.currentPrice ?? entry.targetPrice ?? 0,
        platform: entry.platform,
        genre: entry.genre,
        thumbnail: entry.thumbnail,
        datePurchased: new Date().toISOString().split('T')[0],
        status: 'Not Started',
      });
      if (newGameId && onAddToPlayQueue) {
        setJustPurchased({ name: entry.gameName, gameId: newGameId });
      }
    }
  };

  const existingEntryNames = useMemo(
    () => [...activeEntries, ...maybeEntries, ...deferredEntries, ...purchasedEntries].map(e => e.gameName),
    [activeEntries, maybeEntries, deferredEntries, purchasedEntries]
  );

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
      {mainView === 'watching' && dealsAtTarget.length > 0 && (
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
      {mainView === 'watching' && saleSeason && (
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
          <>
            {renderBudgetRing()}
            {activeEntries.length > 0 && (
              <div className="mt-3 pt-3 border-t border-white/5 space-y-2.5">
                {/* Pricing scenario toggle */}
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-white/30">Price assumption</span>
                  <div className="flex items-center bg-white/5 rounded-lg overflow-hidden">
                    <button
                      onClick={() => handlePricingMode('deal')}
                      className={clsx('px-2.5 py-1 text-[11px] transition-all',
                        pricingMode === 'deal' ? 'bg-emerald-500/15 text-emerald-400 font-medium' : 'text-white/30 hover:text-white/50')}
                    >
                      Deal price
                    </button>
                    <button
                      onClick={() => handlePricingMode('full')}
                      className={clsx('px-2.5 py-1 text-[11px] transition-all',
                        pricingMode === 'full' ? 'bg-white/10 text-white/70 font-medium' : 'text-white/30 hover:text-white/50')}
                    >
                      Full price
                    </button>
                  </div>
                </div>
                {/* "How many fit" headline */}
                <div className="flex items-start gap-2">
                  <Wallet size={14} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-white/60 leading-relaxed">
                    {(() => {
                      const fit = pricingMode === 'full' ? budgetFit.fullPrice : budgetFit.deal;
                      const allFit = fit.affordableCount >= budgetFit.total;
                      const label = pricingMode === 'full' ? 'full price' : 'deal prices';
                      return (
                        <>
                          {allFit ? (
                            <>All <span className="font-medium text-white/90">{budgetFit.total}</span> picks fit at {label}.</>
                          ) : (
                            <>Budget fits your top <span className="font-medium text-emerald-400">{fit.affordableCount}</span> of {budgetFit.total} at {label}.</>
                          )}{' '}
                          {pricingMode === 'full' && budgetFit.extraFromDeals > 0 && (
                            <span className="text-white/40">Wait for deals → <span className="text-amber-400 font-medium">{budgetFit.extraFromDeals} more</span> fit.</span>
                          )}
                          {pricingMode === 'deal' && budgetFit.potentialSavings > 0 && (
                            <span className="text-white/40">Waiting saves ~<span className="text-emerald-400 font-medium">{formatMoney(budgetFit.potentialSavings)}</span> vs full price.</span>
                          )}
                        </>
                      );
                    })()}
                  </p>
                </div>
                {/* Spillover games at the current assumption */}
                {(() => {
                  const fit = pricingMode === 'full' ? budgetFit.fullPrice : budgetFit.deal;
                  if (fit.overflowItems.length === 0) return null;
                  return (
                    <div className="flex items-start gap-1.5 text-[10px] text-amber-400/70">
                      <Target size={10} className="flex-shrink-0 mt-0.5" />
                      <span>
                        Spills over: <span className="text-white/40">{fit.overflowItems.slice(0, 3).join(', ')}{fit.overflowItems.length > 3 ? `, +${fit.overflowItems.length - 3} more` : ''}</span>
                      </span>
                    </div>
                  );
                })()}
              </div>
            )}
          </>
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

      {/* Watching | Bought switch */}
      <div className="flex items-center bg-white/5 rounded-lg overflow-hidden w-fit">
        <button
          onClick={() => setMainView('watching')}
          className={clsx('flex items-center gap-1.5 px-3 py-1.5 text-xs transition-all',
            mainView === 'watching' ? 'bg-white/10 text-white/80 font-medium' : 'text-white/40 hover:text-white/60')}
        >
          <ShoppingCart size={13} />
          Watching
          {activeEntries.length + maybeEntries.length + deferredEntries.length > 0 && (
            <span className="text-white/30">{activeEntries.length + maybeEntries.length + deferredEntries.length}</span>
          )}
        </button>
        <button
          onClick={() => setMainView('bought')}
          className={clsx('flex items-center gap-1.5 px-3 py-1.5 text-xs transition-all',
            mainView === 'bought' ? 'bg-white/10 text-white/80 font-medium' : 'text-white/40 hover:text-white/60')}
        >
          <PackageCheck size={13} />
          Bought
          {purchasedEntries.length > 0 && (
            <span className="text-white/30">{purchasedEntries.length}</span>
          )}
        </button>
      </div>

      {mainView === 'watching' && (
      <>
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <ShoppingCart size={16} className="text-emerald-400" />
            <span className="text-white/70 text-sm">
              <span className="text-white font-medium">{activeEntries.length}</span> watching
            </span>
          </div>
          {maybeEntries.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-amber-400/70">
              <HelpCircle size={12} />
              <span>{maybeEntries.length} maybe</span>
            </div>
          )}
          {deferredEntries.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-blue-400/70">
              <Tag size={12} />
              <span>{deferredEntries.length} deferred</span>
            </div>
          )}
          {releasingSoon > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-purple-400">
              <Calendar size={12} />
              <span>{releasingSoon} in 90d</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Sort control (A2) — list view only */}
          {viewMode === 'list' && activeEntries.length > 1 && (
            <div className="flex items-center gap-1.5 bg-white/5 rounded-lg pl-2 pr-1">
              <ArrowUpDown size={12} className="text-white/30" />
              <select
                value={sortMode}
                onChange={e => setSortMode(e.target.value as SortMode)}
                className="bg-transparent text-xs text-white/60 py-1.5 pr-1 focus:outline-none cursor-pointer"
              >
                {SORT_OPTIONS.map(o => (
                  <option key={o.value} value={o.value} className="bg-[#1a1a2e]">{o.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* AI gut-check (C1) */}
          {activeEntries.length > 0 && (
            <button
              onClick={handleAskAI}
              disabled={aiLoading}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all',
                aiAdvice ? 'bg-purple-500/15 text-purple-400' : 'bg-white/5 text-white/40 hover:text-white/60'
              )}
              title="Ask AI: should I buy these?"
            >
              {aiLoading ? <Loader2 size={13} className="animate-spin" /> : <Wand2 size={13} />}
            </button>
          )}

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

      {/* AI gut-check banner (C1) */}
      {aiAdvice && (
        <div className="rounded-xl border border-purple-500/20 bg-purple-500/[0.06] p-3">
          <div className="flex items-start gap-2">
            <div className="w-7 h-7 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
              <Wand2 size={14} className="text-purple-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-medium text-purple-400 uppercase tracking-wider mb-0.5">AI Gut Check</div>
              <p className="text-xs text-white/60 leading-relaxed">{aiAdvice.gutCheck}</p>
            </div>
            <button onClick={() => setAiAdvice(null)} className="text-white/20 hover:text-white/50 transition-colors flex-shrink-0">
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Buy → Play handoff (A3) */}
      {justPurchased && (
        <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.07] p-3 flex items-center gap-2">
          <PackageCheck size={15} className="text-emerald-400 flex-shrink-0" />
          <span className="text-xs text-white/60 flex-1 min-w-0 truncate">
            <span className="text-white/80 font-medium">{justPurchased.name}</span> added to your library. Queue it up to play?
          </span>
          <button
            onClick={async () => {
              if (onAddToPlayQueue) await onAddToPlayQueue(justPurchased.gameId);
              setJustPurchased(null);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-all flex-shrink-0"
          >
            <ListOrdered size={13} />
            Up Next
          </button>
          <button onClick={() => setJustPurchased(null)} className="text-white/20 hover:text-white/50 transition-colors flex-shrink-0">
            <X size={14} />
          </button>
        </div>
      )}

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
            {maybeEntries.length > 0 ? (
              <div className="p-3 rounded-lg bg-amber-500/[0.05] border border-amber-500/10">
                <div className="text-lg font-semibold text-amber-400/80">{maybeEntries.length}</div>
                <div className="text-[11px] text-white/30">
                  Maybe{maybeSpend > 0 ? ` · ${formatMoney(maybeSpend)}` : ''}
                </div>
              </div>
            ) : stats.totalSavingsPotential > 0 ? (
              <div className="p-3 rounded-lg bg-white/[0.02]">
                <div className="text-lg font-semibold text-emerald-400">{formatMoney(stats.totalSavingsPotential)}</div>
                <div className="text-[11px] text-white/30">Potential Savings</div>
              </div>
            ) : null}
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
              {/* Budget reaches only so far (D2) */}
              {yearBudget != null && stats.impact.overflowItems.length > 0 && (
                <div className="mt-2 flex items-start gap-1.5 text-[10px] text-amber-400/70">
                  <Target size={10} className="flex-shrink-0 mt-0.5" />
                  <span>
                    Budget covers your top <span className="font-medium text-amber-400">{stats.impact.affordableCount}</span> pick{stats.impact.affordableCount !== 1 ? 's' : ''}.
                    {' '}<span className="text-white/40">{stats.impact.overflowItems.slice(0, 3).join(', ')}{stats.impact.overflowItems.length > 3 ? '…' : ''}</span> spill over.
                  </span>
                </div>
              )}
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
      {activeEntries.length === 0 && maybeEntries.length === 0 && deferredEntries.length === 0 && (
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
          {/* Watching section — committed, drag-to-prioritize in Manual mode (A1/A2) */}
          {sortedCommitted.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Clock size={13} className="text-emerald-400" />
                <h3 className="text-xs font-medium text-white/50 uppercase tracking-wider">Watching</h3>
                <span className="text-[11px] text-white/25">{sortedCommitted.length}</span>
                {dragEnabled && sortedCommitted.length > 1 && (
                  <span className="text-[10px] text-white/20 ml-auto">Drag to prioritize</span>
                )}
              </div>
              {dragEnabled ? (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={sortedCommitted.map(e => e.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2">
                      {sortedCommitted.map(entry => (
                        <SortableBuyCard key={entry.id} entry={entry}>
                          {(handleProps) => (
                            <BuyQueueCard
                              entry={entry}
                              allGames={allGames}
                              onUpdate={updateEntry}
                              onMarkPurchased={handleMarkPurchased}
                              onDelete={handleDelete}
                              onSetIntent={(intent) => setIntent(entry.id, intent)}
                              verdict={aiAdvice?.verdicts[entry.gameName]}
                              dragHandleProps={handleProps}
                            />
                          )}
                        </SortableBuyCard>
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              ) : (
                <div className="space-y-2">
                  {sortedCommitted.map(entry => (
                    <BuyQueueCard
                      key={entry.id}
                      entry={entry}
                      allGames={allGames}
                      onUpdate={updateEntry}
                      onMarkPurchased={handleMarkPurchased}
                      onDelete={handleDelete}
                      onSetIntent={(intent) => setIntent(entry.id, intent)}
                      verdict={aiAdvice?.verdicts[entry.gameName]}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Maybe section */}
          {maybeEntries.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <HelpCircle size={13} className="text-amber-400/70" />
                <h3 className="text-xs font-medium text-white/50 uppercase tracking-wider">Maybe</h3>
                <span className="text-[11px] text-white/25">{maybeEntries.length}</span>
                {maybeSpend > 0 && (
                  <span className="text-[11px] text-amber-400/40 ml-auto">{formatMoney(maybeSpend)} possible</span>
                )}
              </div>
              <div className="space-y-2">
                {sortedMaybe.map(entry => (
                  <BuyQueueCard
                    key={entry.id}
                    entry={entry}
                    allGames={allGames}
                    onUpdate={updateEntry}
                    onMarkPurchased={handleMarkPurchased}
                    onDelete={handleDelete}
                    onSetIntent={(intent) => setIntent(entry.id, intent)}
                    verdict={aiAdvice?.verdicts[entry.gameName]}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Deferred section — waiting for a deal */}
          {deferredEntries.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Tag size={13} className="text-blue-400/70" />
                <h3 className="text-xs font-medium text-white/50 uppercase tracking-wider">Deferred — Waiting for a Deal</h3>
                <span className="text-[11px] text-white/25">{deferredEntries.length}</span>
                {deferredSpend > 0 && (
                  <span className="text-[11px] text-blue-400/40 ml-auto">{formatMoney(deferredSpend)} at full price</span>
                )}
              </div>
              <div className="space-y-2">
                {sortedDeferred.map(entry => (
                  <BuyQueueCard
                    key={entry.id}
                    entry={entry}
                    allGames={allGames}
                    onUpdate={updateEntry}
                    onMarkPurchased={handleMarkPurchased}
                    onDelete={handleDelete}
                    onSetIntent={(intent) => setIntent(entry.id, intent)}
                    verdict={aiAdvice?.verdicts[entry.gameName]}
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
          {monthlyPlan.map(month => {
            const monthlyBudget = yearBudget != null ? yearBudget / 12 : null;
            const overMonth = monthlyBudget != null && month.totalCost > monthlyBudget;
            const pacePct = monthlyBudget != null && monthlyBudget > 0
              ? Math.min(100, (month.totalCost / monthlyBudget) * 100) : 0;
            return (
            <div key={month.month} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar size={13} className="text-purple-400" />
                  <h3 className="text-xs font-medium text-white/50 uppercase tracking-wider">{month.month}</h3>
                  <span className="text-[11px] text-white/25">{month.entries.length} game{month.entries.length !== 1 ? 's' : ''}</span>
                </div>
                {month.totalCost > 0 && (
                  <span className={clsx('text-xs', overMonth ? 'text-red-400' : 'text-white/30')}>
                    {formatMoney(month.totalCost)}
                    {monthlyBudget != null && <span className="text-white/20"> / {formatMoney(monthlyBudget)}</span>}
                  </span>
                )}
              </div>
              {monthlyBudget != null && month.totalCost > 0 && (
                <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className={clsx('h-full rounded-full transition-all', overMonth ? 'bg-red-500/70' : 'bg-emerald-500/60')}
                    style={{ width: `${pacePct}%` }}
                  />
                </div>
              )}
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
                      onSetIntent={(intent) => setIntent(entry.id, intent)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-[11px] text-white/15">No planned purchases</div>
              )}
            </div>
            );
          })}
        </div>
      )}
      </>
      )}

      {/* Bought view — purchased history */}
      {mainView === 'bought' && (
        purchasedEntries.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-white/40">
                <PackageCheck size={13} className="text-white/30" />
                <span><span className="text-white/70 font-medium">{purchasedEntries.length}</span> purchased</span>
                {stats.purchaseInsights.totalSaved > 0 && (
                  <span className="text-emerald-400/60 ml-auto">Saved {formatMoney(stats.purchaseInsights.totalSaved)} vs MSRP</span>
                )}
              </div>
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
        ) : (
          <div className="text-center py-16 space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.03] flex items-center justify-center mx-auto">
              <PackageCheck size={28} className="text-white/10" />
            </div>
            <div>
              <p className="text-white/40 text-sm font-medium">Nothing bought yet</p>
              <p className="text-white/20 text-xs mt-1.5 max-w-xs mx-auto leading-relaxed">
                When you mark a queued game as purchased, it lands here with how much you saved versus full price.
              </p>
            </div>
          </div>
        )
      )}

      {/* Wishlist nudge (Feature #13) */}
      {mainView === 'watching' && wishlistGames.length > 0 && (activeEntries.length > 0 || maybeEntries.length > 0 || deferredEntries.length > 0) && (
        (() => {
          const queuedNames = new Set([...activeEntries, ...maybeEntries, ...deferredEntries].map(e => e.gameName.toLowerCase()));
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
          existingEntryNames={existingEntryNames}
        />
      )}
    </div>
  );
}
