'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  Plus, ShoppingCart, Calendar, PackageCheck,
  Settings, Sparkles, Percent, ChevronDown, ChevronUp,
  Tag, Gift, Target, BarChart2, ArrowRight, HelpCircle,
  Wand2, Loader2, ListOrdered, X, Wallet
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
  getQueueRunningTally,
  QueuePriceMode,
  getSaleSeasonIndicator,
  getPurchaseHistoryInsights,
  buildBuyQueueAIContext,
} from '../lib/calculations';
import { generateBuyQueueAdvice, BuyQueueAdvice } from '../lib/ai-buyqueue-service';
import clsx from 'clsx';

type PriceMode = 'full' | 'deal' | 'model';

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

/** Sortable wrapper so no-date committed cards can be drag-reordered. */
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
    maybeSpend,
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
  const [showLater, setShowLater] = useState(false);
  const [showBought, setShowBought] = useState(false);
  const [aiAdvice, setAiAdvice] = useState<BuyQueueAdvice | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [justPurchased, setJustPurchased] = useState<{ name: string; gameId: string } | null>(null);

  // Pricing scenario: your target deals (default), full MSRP, or a modeled % off.
  const [priceMode, setPriceMode] = useState<PriceMode>('deal');
  const [modelDiscount, setModelDiscount] = useState(0.33);

  useEffect(() => {
    try {
      const m = localStorage.getItem('buy-queue-price-mode');
      if (m === 'full' || m === 'deal' || m === 'model') setPriceMode(m);
      const d = localStorage.getItem('buy-queue-model-discount');
      if (d) { const n = parseFloat(d); if (!isNaN(n)) setModelDiscount(Math.min(0.8, Math.max(0, n))); }
    } catch { /* non-persistent is fine */ }
  }, []);

  const handlePriceMode = (m: PriceMode) => {
    setPriceMode(m);
    try { localStorage.setItem('buy-queue-price-mode', m); } catch { /* ignore */ }
  };
  const handleModelDiscount = (d: number) => {
    setModelDiscount(d);
    try { localStorage.setItem('buy-queue-model-discount', String(d)); } catch { /* ignore */ }
  };

  const mode = useMemo<QueuePriceMode>(
    () => priceMode === 'model' ? { kind: 'model', discount: modelDiscount } : { kind: priceMode },
    [priceMode, modelDiscount]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const currentYear = new Date().getFullYear();
  const yearBudget = budgets.find(b => b.year === currentYear)?.yearlyBudget ?? null;

  const entryById = useMemo(() => {
    const m = new Map<string, PurchaseQueueEntry>();
    entries.forEach(e => m.set(e.id, e));
    return m;
  }, [entries]);

  // ── Timeline grouping: Dated (available now → upcoming) · No date · Later ──
  const { datedCommitted, undatedCommitted, orderedCommitted, laterEntries } = useMemo(() => {
    const todayMid = new Date(); todayMid.setHours(0, 0, 0, 0);
    const dated = activeEntries.filter(e => e.releaseDate);
    const available = dated
      .filter(e => new Date(e.releaseDate!) <= todayMid)
      .sort((a, b) => a.priority - b.priority);
    const upcoming = dated
      .filter(e => new Date(e.releaseDate!) > todayMid)
      .sort((a, b) => new Date(a.releaseDate!).getTime() - new Date(b.releaseDate!).getTime());
    const datedCommitted = [...available, ...upcoming];
    const undatedCommitted = activeEntries.filter(e => !e.releaseDate).sort((a, b) => a.priority - b.priority);
    return {
      datedCommitted,
      undatedCommitted,
      orderedCommitted: [...datedCommitted, ...undatedCommitted],
      laterEntries: [...maybeEntries, ...deferredEntries],
    };
  }, [activeEntries, maybeEntries, deferredEntries]);

  // ── Running budget tally (current mode) + full/deal for comparison ──
  const tally = useMemo(() => getQueueRunningTally(orderedCommitted, yearBudget, yearSpent, mode), [orderedCommitted, yearBudget, yearSpent, mode]);
  const committedTotal = tally.rows.length ? tally.rows[tally.rows.length - 1].cumulative : 0;
  const ghost = useMemo(() => getQueueRunningTally(laterEntries, yearBudget, yearSpent, mode, committedTotal), [laterEntries, yearBudget, yearSpent, mode, committedTotal]);
  const fullTally = useMemo(() => getQueueRunningTally(orderedCommitted, yearBudget, yearSpent, { kind: 'full' }), [orderedCommitted, yearBudget, yearSpent]);
  const dealTally = useMemo(() => getQueueRunningTally(orderedCommitted, yearBudget, yearSpent, { kind: 'deal' }), [orderedCommitted, yearBudget, yearSpent]);

  const tallyMap = useMemo(() => new Map(tally.rows.map(r => [r.id, r])), [tally]);
  const ghostMap = useMemo(() => new Map(ghost.rows.map(r => [r.id, r])), [ghost]);

  const total = orderedCommitted.length;
  const fitNow = tally.rows.filter(r => !r.isOver).length;
  const fitFull = fullTally.rows.filter(r => !r.isOver).length;
  const fitDeal = dealTally.rows.filter(r => !r.isOver).length;
  const fullSum = fullTally.rows.length ? fullTally.rows[fullTally.rows.length - 1].cumulative : 0;
  const dealSum = dealTally.rows.length ? dealTally.rows[dealTally.rows.length - 1].cumulative : 0;
  const potentialSavings = Math.max(0, fullSum - dealSum);
  const overflowNames = tally.rows.filter(r => r.isOver).map(r => entryById.get(r.id)?.gameName).filter(Boolean) as string[];

  // Budget ring math — "planned" is the committed total under the current mode.
  const budgetUsed = yearSpent;
  const budgetPlanned = committedTotal;
  const budgetTotal = yearBudget ?? 0;
  const budgetRemaining = yearBudget != null ? yearBudget - budgetUsed - budgetPlanned : null;
  const isOverBudget = yearBudget != null && (budgetUsed + budgetPlanned) > yearBudget;
  const overBy = yearBudget != null ? Math.max(0, budgetUsed + budgetPlanned - yearBudget) : 0;
  const spentPct = budgetTotal > 0 ? Math.min(100, (budgetUsed / budgetTotal) * 100) : 0;
  const plannedPct = budgetTotal > 0 ? Math.min(100 - spentPct, (budgetPlanned / budgetTotal) * 100) : 0;

  // Bought / spent summary (free games never have a purchase price)
  const boughtSpent = useMemo(() => purchasedEntries.reduce((s, e) => s + (e.purchasePrice ?? 0), 0), [purchasedEntries]);

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
    const purchaseInsights = getPurchaseHistoryInsights(entries);
    const impact = getQueueImpactSnapshot(activeEntries, yearBudget, yearSpent);
    return { dayOneBuys, totalSavingsPotential, platformBreakdown, purchaseInsights, impact };
  }, [activeEntries, entries, yearBudget, yearSpent]);

  const wishlistForModal = wishlistGames.map(g => ({
    name: g.name,
    platform: g.platform,
    genre: g.genre,
    thumbnail: g.thumbnail,
  }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = undatedCommitted.map(e => e.id);
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

  // Renders a committed card with its budget-left chip + the cutoff divider.
  const renderCommittedCard = (entry: PurchaseQueueEntry, dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>) => {
    const row = tallyMap.get(entry.id);
    return (
      <div key={entry.id} className="space-y-2">
        {yearBudget != null && tally.cutoffId === entry.id && (
          <div className="flex items-center gap-2 py-0.5">
            <div className="flex-1 h-px bg-red-500/20" />
            <span className="text-[10px] text-red-400/70 uppercase tracking-wider">Budget runs out</span>
            <div className="flex-1 h-px bg-red-500/20" />
          </div>
        )}
        <BuyQueueCard
          entry={entry}
          allGames={allGames}
          onUpdate={updateEntry}
          onMarkPurchased={handleMarkPurchased}
          onDelete={handleDelete}
          onSetIntent={(intent) => setIntent(entry.id, intent)}
          budgetLeft={row ? { remaining: row.remaining, isOver: row.isOver } : null}
          dragHandleProps={dragHandleProps}
        />
      </div>
    );
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

    return (
      <div className="flex items-center gap-5">
        <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="transform -rotate-90">
            <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={strokeWidth} />
            <circle cx={size/2} cy={size/2} r={radius} fill="none"
              stroke="#10b981" strokeWidth={strokeWidth} strokeLinecap="round"
              strokeDasharray={`${spentDash} ${circumference - spentDash}`}
              strokeDashoffset={0}
              className="transition-all duration-700"
            />
            {plannedPct > 0 && (
              <circle cx={size/2} cy={size/2} r={radius} fill="none"
                stroke={isOverBudget ? '#ef4444' : '#f59e0b'} strokeWidth={strokeWidth} strokeLinecap="round"
                strokeDasharray={`${plannedDash} ${circumference - plannedDash}`}
                strokeDashoffset={-spentDash}
                className="transition-all duration-700"
              />
            )}
          </svg>
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

  const modeLabel = priceMode === 'full' ? 'full price' : priceMode === 'model' ? `${Math.round(modelDiscount * 100)}% off` : 'your deal prices';
  const isEmpty = orderedCommitted.length === 0 && laterEntries.length === 0;

  return (
    <div className="space-y-5">
      {/* Deal Alert Banner */}
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

      {/* Sale Season Badge */}
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

      {/* Budget card — ring + pricing model + how-many-fit headline */}
      <div className={clsx(
        'rounded-xl border p-4',
        isOverBudget ? 'bg-red-500/5 border-red-500/20' : 'bg-white/[0.02] border-white/5'
      )}>
        {yearBudget != null ? (
          <>
            {renderBudgetRing()}
            {total > 0 && (
              <div className="mt-3 pt-3 border-t border-white/5 space-y-2.5">
                {/* Pricing scenario control */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-white/30">Price assumption</span>
                  <div className="flex items-center bg-white/5 rounded-lg overflow-hidden">
                    {(['deal', 'full', 'model'] as PriceMode[]).map(m => (
                      <button
                        key={m}
                        onClick={() => handlePriceMode(m)}
                        className={clsx('px-2.5 py-1 text-[11px] transition-all',
                          priceMode === m
                            ? (m === 'deal' ? 'bg-emerald-500/15 text-emerald-400 font-medium' : 'bg-white/10 text-white/70 font-medium')
                            : 'text-white/30 hover:text-white/50')}
                      >
                        {m === 'deal' ? 'My deals' : m === 'full' ? 'Full price' : 'Model %'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Discount slider (model mode) */}
                {priceMode === 'model' && (
                  <div className="flex items-center gap-2">
                    <Percent size={12} className="text-emerald-400/70 flex-shrink-0" />
                    <input
                      type="range" min={0} max={80} step={5}
                      value={Math.round(modelDiscount * 100)}
                      onChange={e => handleModelDiscount(parseInt(e.target.value) / 100)}
                      className="flex-1 accent-emerald-500"
                    />
                    <span className="text-xs text-white/60 font-medium w-12 text-right">{Math.round(modelDiscount * 100)}% off</span>
                  </div>
                )}

                {/* "How many fit" headline */}
                <div className="flex items-start gap-2">
                  <Wallet size={14} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-white/60 leading-relaxed">
                    {fitNow >= total ? (
                      <>All <span className="font-medium text-white/90">{total}</span> picks fit at {modeLabel}.</>
                    ) : (
                      <>Budget fits your top <span className="font-medium text-emerald-400">{fitNow}</span> of {total} at {modeLabel}.</>
                    )}{' '}
                    {priceMode === 'full' && fitDeal > fitFull && (
                      <span className="text-white/40">Wait for deals → <span className="text-amber-400 font-medium">{fitDeal - fitFull} more</span> fit.</span>
                    )}
                    {priceMode === 'deal' && potentialSavings > 0 && (
                      <span className="text-white/40">Waiting saves ~<span className="text-emerald-400 font-medium">{formatMoney(potentialSavings)}</span> vs full price.</span>
                    )}
                    {priceMode === 'model' && (
                      <span className="text-white/40">That&apos;s <span className="text-emerald-400 font-medium">{fitNow}</span> games for <span className="text-white/60 font-medium">{formatMoney(committedTotal)}</span>.</span>
                    )}
                  </p>
                </div>

                {/* Spillover */}
                {overflowNames.length > 0 && (
                  <div className="flex items-start gap-1.5 text-[10px] text-amber-400/70">
                    <Target size={10} className="flex-shrink-0 mt-0.5" />
                    <span>Spills over: <span className="text-white/40">{overflowNames.slice(0, 3).join(', ')}{overflowNames.length > 3 ? `, +${overflowNames.length - 3} more` : ''}</span></span>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-white/50 uppercase tracking-wider">{currentYear} Budget</span>
              <p className="text-[11px] text-white/25 mt-1">Set a budget in Stats to track spend vs plan here</p>
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
              <span className="text-white font-medium">{activeEntries.length}</span> to buy
            </span>
          </div>
          {laterEntries.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-amber-400/70">
              <HelpCircle size={12} />
              <span>{laterEntries.length} later</span>
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
          {activeEntries.length > 0 && (
            <button
              onClick={handleAskAI}
              disabled={aiLoading}
              className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all',
                aiAdvice ? 'bg-purple-500/15 text-purple-400' : 'bg-white/5 text-white/40 hover:text-white/60')}
              title="Ask AI: should I buy these?"
            >
              {aiLoading ? <Loader2 size={13} className="animate-spin" /> : <Wand2 size={13} />}
            </button>
          )}
          <button
            onClick={() => setShowStats(!showStats)}
            className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all',
              showStats ? 'bg-emerald-500/15 text-emerald-400' : 'bg-white/5 text-white/40 hover:text-white/60')}
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

      {/* AI gut-check banner */}
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

      {/* Buy → Play handoff */}
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

      {/* Stats Dashboard */}
      {showStats && activeEntries.length > 0 && (
        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-4">
          <h3 className="text-xs font-medium text-white/50 uppercase tracking-wider">Queue Intelligence</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-white/[0.02]">
              <div className="text-lg font-semibold text-white/90">{activeEntries.length}</div>
              <div className="text-[11px] text-white/30">To buy</div>
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
          {Object.keys(stats.platformBreakdown).length > 0 && (
            <div>
              <div className="text-[11px] text-white/30 mb-2">By Platform</div>
              <div className="flex items-center gap-2 flex-wrap">
                {Object.entries(stats.platformBreakdown).sort((a, b) => b[1] - a[1]).map(([plat, count]) => (
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

      {/* Empty state */}
      {isEmpty && (
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

      {/* Dated group — release date order (available now → upcoming) */}
      {datedCommitted.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Calendar size={13} className="text-emerald-400" />
            <h3 className="text-xs font-medium text-white/50 uppercase tracking-wider">Dated</h3>
            <span className="text-[11px] text-white/25">{datedCommitted.length}</span>
          </div>
          <div className="space-y-2">
            {datedCommitted.map(entry => renderCommittedCard(entry))}
          </div>
        </div>
      )}

      {/* No-date group — priority order, drag to reorder */}
      {undatedCommitted.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <HelpCircle size={13} className="text-white/40" />
            <h3 className="text-xs font-medium text-white/50 uppercase tracking-wider">No date</h3>
            <span className="text-[11px] text-white/25">{undatedCommitted.length}</span>
            {undatedCommitted.length > 1 && (
              <span className="text-[10px] text-white/20 ml-auto">Drag to prioritize</span>
            )}
          </div>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={undatedCommitted.map(e => e.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {undatedCommitted.map(entry => (
                  <SortableBuyCard key={entry.id} entry={entry}>
                    {(handleProps) => renderCommittedCard(entry, handleProps)}
                  </SortableBuyCard>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}

      {/* Later / Maybe group — ghosted projection, collapsible */}
      {laterEntries.length > 0 && (
        <div className="space-y-2">
          <button
            onClick={() => setShowLater(!showLater)}
            className="flex items-center gap-2 w-full text-left"
          >
            {showLater ? <ChevronUp size={13} className="text-white/30" /> : <ChevronDown size={13} className="text-white/30" />}
            <Tag size={13} className="text-amber-400/70" />
            <h3 className="text-xs font-medium text-white/50 uppercase tracking-wider">Later / Maybe</h3>
            <span className="text-[11px] text-white/25">{laterEntries.length}</span>
            {maybeSpend > 0 && (
              <span className="text-[11px] text-amber-400/40 ml-auto">{formatMoney(laterEntries.reduce((s, e) => s + (e.targetPrice ?? e.currentPrice ?? e.msrpEstimate ?? 0), 0))} if added</span>
            )}
          </button>
          {showLater && (
            <div className="space-y-2">
              {laterEntries.map(entry => {
                const g = ghostMap.get(entry.id);
                return (
                  <BuyQueueCard
                    key={entry.id}
                    entry={entry}
                    allGames={allGames}
                    onUpdate={updateEntry}
                    onMarkPurchased={handleMarkPurchased}
                    onDelete={handleDelete}
                    onSetIntent={(intent) => setIntent(entry.id, intent)}
                    budgetLeft={g ? { remaining: g.remaining, isOver: g.isOver, ghost: true } : null}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Bought / spent — collapsible, bottom of the view */}
      {purchasedEntries.length > 0 && (
        <div className="space-y-2 pt-1">
          <button
            onClick={() => setShowBought(!showBought)}
            className="flex items-center gap-2 w-full text-left"
          >
            {showBought ? <ChevronUp size={13} className="text-white/30" /> : <ChevronDown size={13} className="text-white/30" />}
            <PackageCheck size={13} className="text-white/30" />
            <h3 className="text-xs font-medium text-white/50 uppercase tracking-wider">Bought</h3>
            <span className="text-[11px] text-white/25">{purchasedEntries.length}</span>
            <span className="text-[11px] text-white/40 ml-auto">
              Spent <span className="text-white/70 font-medium">{formatMoney(boughtSpent)}</span>
              {yearBudget != null && <span className="text-white/25"> of {formatMoney(yearBudget)}</span>}
              {stats.purchaseInsights.totalSaved > 0 && <span className="text-emerald-400/60"> · saved {formatMoney(stats.purchaseInsights.totalSaved)}</span>}
            </span>
          </button>
          {showBought && (
            <div className="space-y-2 opacity-70">
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
                  <PackageCheck size={11} className="text-emerald-400/60 flex-shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Wishlist nudge */}
      {wishlistGames.length > 0 && !isEmpty && (
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
