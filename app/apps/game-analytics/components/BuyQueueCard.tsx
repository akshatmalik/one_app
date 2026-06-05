'use client';

import { useState } from 'react';
import {
  ExternalLink, Check, Trash2, ChevronDown, ChevronUp, GripVertical,
  Calendar, Zap, TrendingDown, TrendingUp, Minus,
  Clock, HelpCircle, ShoppingCart, Tag, RefreshCw
} from 'lucide-react';
import { PurchaseQueueEntry, PurchaseIntent } from '../lib/types';
import { Game } from '../lib/types';
import { getStoreUrl, getPriceFreshness } from '../lib/calculations';
import { fetchCheapestPrice } from '../lib/price-fetch';
import { LiveDealInfo } from '../hooks/useDealWatch';
import { PriceSparkline } from './PriceSparkline';
import clsx from 'clsx';

interface Props {
  entry: PurchaseQueueEntry;
  allGames: Game[];
  onUpdate: (id: string, updates: Partial<PurchaseQueueEntry>) => Promise<void>;
  onMarkPurchased: (id: string, price?: number) => Promise<void>;
  onDelete: (id: string) => void;
  onSetIntent?: (intent: PurchaseIntent) => void;
  verdict?: string;
  /** Running budget remaining after this card; `ghost` projects a maybe without counting it. */
  budgetLeft?: { remaining: number | null; isOver: boolean; ghost?: boolean } | null;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
  liveDeal?: LiveDealInfo | null;
}

const INTENT_OPTIONS: { value: PurchaseIntent; label: string; icon: typeof ShoppingCart; active: string }[] = [
  { value: 'committed', label: 'Watching', icon: ShoppingCart, active: 'bg-emerald-500/15 text-emerald-400' },
  { value: 'maybe', label: 'Maybe', icon: HelpCircle, active: 'bg-amber-500/15 text-amber-400' },
  { value: 'deferred', label: 'Deferred', icon: Tag, active: 'bg-blue-500/15 text-blue-400' },
];

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function formatRelease(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

function getPriceStatus(entry: PurchaseQueueEntry): { label: string; color: string; dot: string; glow: boolean } | null {
  if (!entry.targetPrice || !entry.currentPrice) return null;
  const ratio = entry.currentPrice / entry.targetPrice;
  if (ratio <= 1) return { label: 'At target!', color: 'text-emerald-400', dot: 'bg-emerald-400', glow: true };
  if (ratio <= 1.2) return { label: 'Almost there', color: 'text-yellow-400', dot: 'bg-yellow-400', glow: false };
  return { label: 'Above target', color: 'text-red-400/60', dot: 'bg-red-400', glow: false };
}

function getSavings(entry: PurchaseQueueEntry): string | null {
  if (!entry.msrpEstimate || !entry.currentPrice) return null;
  const saved = entry.msrpEstimate - entry.currentPrice;
  if (saved <= 0) return null;
  const pct = Math.round((saved / entry.msrpEstimate) * 100);
  return `${pct}% off`;
}

export function BuyQueueCard({ entry, onUpdate, onMarkPurchased, onDelete, onSetIntent, budgetLeft, dragHandleProps, liveDeal }: Props) {
  const intent: PurchaseIntent = entry.intent ?? (entry.isMaybe ? 'maybe' : 'committed');
  const isMaybe = intent === 'maybe';
  const isDeferred = intent === 'deferred';
  const [expanded, setExpanded] = useState(false);
  const [editingCurrentPrice, setEditingCurrentPrice] = useState(false);
  const [editingTargetPrice, setEditingTargetPrice] = useState(false);
  const [editingReleaseDate, setEditingReleaseDate] = useState(false);
  const [priceInput, setPriceInput] = useState('');
  const [releaseDateInput, setReleaseDateInput] = useState('');
  const [showPurchaseConfirm, setShowPurchaseConfirm] = useState(false);
  const [purchasePriceInput, setPurchasePriceInput] = useState('');
  const [fetchingPrice, setFetchingPrice] = useState(false);
  const [fetchMsg, setFetchMsg] = useState<string | null>(null);

  const upcoming = entry.releaseDate ? new Date(entry.releaseDate) > new Date() : false;
  const days = entry.releaseDate ? daysUntil(entry.releaseDate) : null;
  const priceStatus = getPriceStatus(entry);
  const savings = getSavings(entry);
  const isAtTarget = (priceStatus?.glow ?? false) || (liveDeal?.isAtTarget ?? false);

  const storeLinks = getStoreUrl(entry.gameName, entry.platform);

  const handlePriceBlur = async (field: 'currentPrice' | 'targetPrice') => {
    const val = parseFloat(priceInput);
    if (!isNaN(val) && val >= 0) {
      if (field === 'currentPrice') {
        const today = new Date().toISOString().split('T')[0];
        const history = entry.priceHistory ? [...entry.priceHistory] : [];
        const last = history[history.length - 1];
        if (last && last.date === today) {
          history[history.length - 1] = { date: today, price: val };
        } else if (!last || last.price !== val) {
          history.push({ date: today, price: val });
        }
        await onUpdate(entry.id, { currentPrice: val, priceHistory: history });
      } else {
        await onUpdate(entry.id, { [field]: val });
      }
    }
    setEditingCurrentPrice(false);
    setEditingTargetPrice(false);
    setPriceInput('');
  };

  // Manual price history
  const priceHistory = entry.priceHistory ?? [];
  const lowestSeen = priceHistory.length > 0 ? Math.min(...priceHistory.map(p => p.price)) : null;
  const firstSeen = priceHistory.length > 0 ? priceHistory[0].price : null;
  const priceTrend =
    entry.currentPrice != null && firstSeen != null
      ? entry.currentPrice < firstSeen ? 'down' : entry.currentPrice > firstSeen ? 'up' : 'flat'
      : null;
  const atLowest = lowestSeen != null && entry.currentPrice != null && entry.currentPrice <= lowestSeen;

  // Stale-price nudge
  const freshness = getPriceFreshness(entry);

  const handleFetchPrice = async () => {
    setFetchingPrice(true);
    setFetchMsg(null);
    try {
      const result = await fetchCheapestPrice(entry.gameName);
      if (result) {
        const today = new Date().toISOString().split('T')[0];
        const history = entry.priceHistory ? [...entry.priceHistory] : [];
        const last = history[history.length - 1];
        if (last && last.date === today) history[history.length - 1] = { date: today, price: result.price };
        else if (!last || last.price !== result.price) history.push({ date: today, price: result.price });
        await onUpdate(entry.id, { currentPrice: result.price, priceHistory: history });
        setFetchMsg(`${result.source}: $${result.price}`);
      } else {
        setFetchMsg('No price found — enter manually');
      }
    } catch {
      setFetchMsg('Lookup failed — enter manually');
    } finally {
      setFetchingPrice(false);
      setTimeout(() => setFetchMsg(null), 4000);
    }
  };

  const handleReleaseDateBlur = async () => {
    if (releaseDateInput) {
      await onUpdate(entry.id, { releaseDate: releaseDateInput });
    }
    setEditingReleaseDate(false);
    setReleaseDateInput('');
  };

  const handleMarkPurchased = async () => {
    const price = purchasePriceInput ? parseFloat(purchasePriceInput) : entry.currentPrice;
    await onMarkPurchased(entry.id, price);
    setShowPurchaseConfirm(false);
  };

  // Countdown urgency
  const getCountdownStyle = () => {
    if (!upcoming || days === null) return null;
    if (days <= 7) return { color: 'text-red-400', bg: 'bg-red-500/15', pulse: true };
    if (days <= 30) return { color: 'text-amber-400', bg: 'bg-amber-500/15', pulse: false };
    if (days <= 90) return { color: 'text-purple-400', bg: 'bg-purple-500/15', pulse: false };
    return { color: 'text-white/40', bg: 'bg-white/5', pulse: false };
  };
  const countdown = getCountdownStyle();

  // Day-1 / status badges (date-related identity only)
  const renderBadges = (variant: 'overlay' | 'inline') => (
    <>
      {entry.isDayOneBuy && (
        <span className={clsx('flex items-center gap-0.5 text-[9px] px-1 py-0.5 rounded flex-shrink-0',
          variant === 'overlay' ? 'bg-amber-500/25 text-amber-300' : 'bg-amber-500/15 text-amber-400')}>
          <Zap size={8} />Day 1
        </span>
      )}
      {isMaybe && (
        <span className={clsx('flex items-center gap-0.5 text-[9px] px-1 py-0.5 rounded flex-shrink-0',
          variant === 'overlay' ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-500/15 text-amber-400')}>
          <HelpCircle size={8} />Maybe
        </span>
      )}
      {isDeferred && (
        <span className={clsx('flex items-center gap-0.5 text-[9px] px-1 py-0.5 rounded flex-shrink-0',
          variant === 'overlay' ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-500/15 text-blue-400')}>
          <Tag size={8} />Deferred
        </span>
      )}
    </>
  );

  return (
    <div className="flex items-stretch gap-1.5">
      {dragHandleProps && (
        <button
          {...dragHandleProps}
          className="flex-shrink-0 flex items-center justify-center w-5 rounded-lg text-white/15 hover:text-white/50 hover:bg-white/5 cursor-grab active:cursor-grabbing transition-colors touch-none"
          aria-label="Drag to reorder"
        >
          <GripVertical size={13} />
        </button>
      )}
    <div className={clsx(
      'flex-1 min-w-0 rounded-lg overflow-hidden transition-all',
      isMaybe
        ? 'border border-dashed border-amber-500/25 opacity-90'
        : isDeferred
          ? 'border border-dashed border-blue-500/25 opacity-95'
          : isAtTarget
            ? 'border-2 border-emerald-500/40 buy-queue-price-glow'
            : 'border border-white/8 hover:border-white/12'
    )}>
      {/* Header — compact thumbnail or icon, name + date badges */}
      {entry.thumbnail ? (
        <div className="relative h-14 overflow-hidden">
          <img src={entry.thumbnail} alt={entry.gameName} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#12121a] via-[#12121a]/60 to-transparent" />
          {upcoming && countdown && days !== null && (
            <div className={clsx(
              'absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-1',
              countdown.bg, countdown.color, countdown.pulse && 'buy-queue-countdown-pulse'
            )}>
              <Calendar size={10} />
              {days <= 0 ? 'Today!' : `${days}d`}
            </div>
          )}
          <div className="absolute bottom-1.5 left-2.5 right-2.5 flex items-center gap-1.5">
            <span className="text-sm font-semibold text-white truncate drop-shadow-lg">{entry.gameName}</span>
            {renderBadges('overlay')}
          </div>
        </div>
      ) : (
        <div className="px-2.5 pt-2 pb-1 flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-gradient-to-br from-purple-500/20 to-emerald-500/20 flex items-center justify-center flex-shrink-0">
            <span className="text-sm">🎮</span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
            <span className="text-sm font-medium text-white/90 truncate">{entry.gameName}</span>
            {renderBadges('inline')}
          </div>
        </div>
      )}

      {/* Compact body — dates + prices only */}
      <div className="bg-white/[0.03] px-2.5 pb-2 pt-1.5 space-y-1.5">
        {/* Date + price status */}
        <div className="flex items-center gap-2 text-[11px]">
          <Calendar size={10} className="text-white/20 flex-shrink-0" />
          {editingReleaseDate ? (
            <input
              autoFocus
              type="date"
              value={releaseDateInput}
              onChange={e => setReleaseDateInput(e.target.value)}
              onBlur={handleReleaseDateBlur}
              onKeyDown={e => { if (e.key === 'Enter') handleReleaseDateBlur(); if (e.key === 'Escape') setEditingReleaseDate(false); }}
              className="bg-white/10 text-white text-[11px] px-1.5 py-0.5 rounded focus:outline-none"
            />
          ) : (
            <button
              onClick={() => { setEditingReleaseDate(true); setReleaseDateInput(entry.releaseDate || ''); }}
              className="text-white/35 hover:text-white/60 transition-colors underline decoration-dotted"
            >
              {entry.releaseDate
                ? (upcoming ? `Coming ${formatRelease(entry.releaseDate)}` : `Released ${formatRelease(entry.releaseDate)}`)
                : 'Set date'}
            </button>
          )}
          <div className="ml-auto flex items-center gap-2 flex-shrink-0">
            {!upcoming && priceStatus && (
              <span className={clsx('flex items-center gap-1', priceStatus.color)}>
                <span className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0', priceStatus.dot)} />
                {priceStatus.label}
              </span>
            )}
            {budgetLeft && budgetLeft.remaining != null && (
              <span className={clsx('px-1.5 py-0.5 rounded text-[10px] font-medium',
                budgetLeft.ghost ? 'border border-dashed border-white/15 text-white/35'
                  : budgetLeft.isOver ? 'bg-red-500/15 text-red-400'
                    : 'bg-white/5 text-white/55')}>
                {budgetLeft.ghost
                  ? `would leave $${Math.round(budgetLeft.remaining)}`
                  : budgetLeft.isOver
                    ? `over $${Math.abs(Math.round(budgetLeft.remaining))}`
                    : `$${Math.round(budgetLeft.remaining)} left`}
              </span>
            )}
          </div>
        </div>

        {/* Price row */}
        <div className="flex items-center gap-2.5 flex-wrap text-[11px]">
          {entry.msrpEstimate && (
            <span className="text-white/25">MSRP <span className="text-white/40">${entry.msrpEstimate}</span></span>
          )}
          <div className="flex items-center gap-1">
            <span className="text-white/30">Now</span>
            {editingCurrentPrice ? (
              <input
                autoFocus
                type="number"
                value={priceInput}
                onChange={e => setPriceInput(e.target.value)}
                onBlur={() => handlePriceBlur('currentPrice')}
                onKeyDown={e => { if (e.key === 'Enter') handlePriceBlur('currentPrice'); if (e.key === 'Escape') setEditingCurrentPrice(false); }}
                className="w-14 bg-white/10 text-white text-xs px-1.5 py-0.5 rounded focus:outline-none"
                placeholder="$0"
                min="0"
              />
            ) : (
              <button
                onClick={() => { setEditingCurrentPrice(true); setPriceInput(entry.currentPrice?.toString() || ''); }}
                className="text-white/50 hover:text-white/80 transition-colors underline decoration-dotted"
              >
                {entry.currentPrice != null ? `$${entry.currentPrice}` : 'set'}
              </button>
            )}
            <button
              onClick={handleFetchPrice}
              disabled={fetchingPrice}
              title="Look up current PC price (CheapShark)"
              className="text-white/20 hover:text-emerald-400 transition-colors"
            >
              <RefreshCw size={10} className={clsx(fetchingPrice && 'animate-spin')} />
            </button>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-white/30">Buy at</span>
            {editingTargetPrice ? (
              <input
                autoFocus
                type="number"
                value={priceInput}
                onChange={e => setPriceInput(e.target.value)}
                onBlur={() => handlePriceBlur('targetPrice')}
                onKeyDown={e => { if (e.key === 'Enter') handlePriceBlur('targetPrice'); if (e.key === 'Escape') setEditingTargetPrice(false); }}
                className="w-14 bg-white/10 text-white text-xs px-1.5 py-0.5 rounded focus:outline-none"
                placeholder="$0"
                min="0"
              />
            ) : (
              <button
                onClick={() => { setEditingTargetPrice(true); setPriceInput(entry.targetPrice?.toString() || ''); }}
                className="text-white/50 hover:text-white/80 transition-colors underline decoration-dotted"
              >
                {entry.targetPrice != null ? `$${entry.targetPrice}` : 'set'}
              </button>
            )}
          </div>
          {savings && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400">{savings}</span>
          )}
          {liveDeal && (
            <span className={clsx(
              'flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded',
              liveDeal.isAtTarget
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                : 'bg-white/5 text-white/35',
            )}>
              <span className={clsx('w-1 h-1 rounded-full flex-shrink-0', liveDeal.isAtTarget ? 'bg-emerald-400' : 'bg-white/20')} />
              PC ${liveDeal.price}
            </span>
          )}
        </div>

        {/* Stale-price nudge + live-fetch result */}
        {freshness.isStale && freshness.daysSinceCheck != null && entry.currentPrice != null && (
          <button
            onClick={handleFetchPrice}
            disabled={fetchingPrice}
            className="flex items-center gap-1 text-[10px] text-amber-400/70 hover:text-amber-400 transition-colors"
          >
            <Clock size={9} />
            Checked {freshness.daysSinceCheck}d ago — still ${entry.currentPrice}?
            <RefreshCw size={9} className={clsx(fetchingPrice && 'animate-spin')} />
          </button>
        )}
        {fetchMsg && <div className="text-[10px] text-white/40">{fetchMsg}</div>}

        {/* Price history sparkline */}
        {lowestSeen != null && priceHistory.length >= 2 && (
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-[10px] text-white/30 min-w-0">
              {priceTrend === 'down' ? <TrendingDown size={9} className="text-emerald-400/60" /> :
               priceTrend === 'up' ? <TrendingUp size={9} className="text-red-400/50" /> :
               <Minus size={9} className="text-white/20" />}
              <span>Low <span className={clsx('font-medium', atLowest ? 'text-emerald-400' : 'text-white/50')}>${lowestSeen}</span></span>
              {atLowest && <span className="text-[9px] px-1 py-0.5 rounded bg-emerald-500/15 text-emerald-400">best</span>}
            </div>
            <PriceSparkline history={priceHistory} target={entry.targetPrice} />
          </div>
        )}

        {/* Expand toggle — actions only */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-center gap-1 pt-1.5 border-t border-white/5 text-white/20 hover:text-white/40 transition-colors text-[11px]"
        >
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {expanded ? 'Less' : 'More'}
        </button>
      </div>

      {/* Expanded section — actions only */}
      {expanded && (
        <div className="px-2.5 pb-2.5 bg-white/[0.03] flex items-center gap-2 flex-wrap">
          {storeLinks.map((store, i) => (
            <a
              key={i}
              href={store.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 text-xs transition-all"
            >
              <ExternalLink size={12} />
              {store.label}
            </a>
          ))}

          {!showPurchaseConfirm ? (
            <button
              onClick={() => { setShowPurchaseConfirm(true); setPurchasePriceInput(entry.currentPrice?.toString() || ''); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-xs transition-all"
            >
              <Check size={12} />
              Bought It
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <div className="relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-white/30 text-xs">$</span>
                <input
                  type="number"
                  autoFocus
                  value={purchasePriceInput}
                  onChange={e => setPurchasePriceInput(e.target.value)}
                  placeholder="paid"
                  className="w-20 bg-white/5 border border-white/10 rounded-lg pl-5 pr-2 py-1 text-xs text-white focus:outline-none focus:border-emerald-500/40"
                />
              </div>
              <button
                onClick={handleMarkPurchased}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs hover:bg-emerald-500 transition-all"
              >
                Confirm
              </button>
              <button
                onClick={() => setShowPurchaseConfirm(false)}
                className="text-white/30 hover:text-white/60 text-xs transition-colors"
              >
                ×
              </button>
            </div>
          )}

          {onSetIntent && (
            <div className="flex items-center rounded-lg bg-white/5 overflow-hidden">
              {INTENT_OPTIONS.map(opt => {
                const Icon = opt.icon;
                const selected = intent === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => onSetIntent(opt.value)}
                    className={clsx(
                      'flex items-center gap-1 px-2.5 py-1.5 text-[11px] transition-all',
                      selected ? opt.active : 'text-white/30 hover:text-white/55'
                    )}
                  >
                    <Icon size={11} />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          )}

          <button
            onClick={() => onDelete(entry.id)}
            className="ml-auto flex items-center gap-1 px-2 py-1.5 rounded-lg text-red-400/50 hover:text-red-400 hover:bg-red-500/10 text-xs transition-all"
          >
            <Trash2 size={12} />
          </button>
        </div>
      )}
    </div>
    </div>
  );
}
