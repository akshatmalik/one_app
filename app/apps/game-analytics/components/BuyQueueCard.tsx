'use client';

import { useState } from 'react';
import { ExternalLink, Check, Trash2, ChevronDown, ChevronUp, GripVertical, Calendar, Star, Zap } from 'lucide-react';
import { PurchaseQueueEntry } from '../lib/types';
import clsx from 'clsx';

interface Props {
  entry: PurchaseQueueEntry;
  onUpdate: (id: string, updates: Partial<PurchaseQueueEntry>) => Promise<void>;
  onMarkPurchased: (id: string, price?: number) => Promise<void>;
  onDelete: (id: string) => void;
}

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

function psStoreUrl(gameName: string): string {
  return `https://store.playstation.com/search/${encodeURIComponent(gameName)}`;
}

function getPriceStatus(entry: PurchaseQueueEntry): { label: string; color: string; dot: string } | null {
  if (!entry.targetPrice || !entry.currentPrice) return null;
  const ratio = entry.currentPrice / entry.targetPrice;
  if (ratio <= 1) return { label: 'At target', color: 'text-emerald-400', dot: 'bg-emerald-400' };
  if (ratio <= 1.2) return { label: 'Almost there', color: 'text-yellow-400', dot: 'bg-yellow-400' };
  return { label: 'Above target', color: 'text-red-400', dot: 'bg-red-400' };
}

function getSavings(entry: PurchaseQueueEntry): string | null {
  if (!entry.msrpEstimate || !entry.currentPrice) return null;
  const saved = entry.msrpEstimate - entry.currentPrice;
  if (saved <= 0) return null;
  const pct = Math.round((saved / entry.msrpEstimate) * 100);
  return `${pct}% off`;
}

export function BuyQueueCard({ entry, onUpdate, onMarkPurchased, onDelete }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [editingCurrentPrice, setEditingCurrentPrice] = useState(false);
  const [editingTargetPrice, setEditingTargetPrice] = useState(false);
  const [priceInput, setPriceInput] = useState('');
  const [showPurchaseConfirm, setShowPurchaseConfirm] = useState(false);
  const [purchasePriceInput, setPurchasePriceInput] = useState('');

  const upcoming = entry.releaseDate ? new Date(entry.releaseDate) > new Date() : false;
  const days = entry.releaseDate ? daysUntil(entry.releaseDate) : null;
  const priceStatus = getPriceStatus(entry);
  const savings = getSavings(entry);

  const handlePriceBlur = async (field: 'currentPrice' | 'targetPrice') => {
    const val = parseFloat(priceInput);
    if (!isNaN(val) && val >= 0) {
      await onUpdate(entry.id, { [field]: val });
    }
    setEditingCurrentPrice(false);
    setEditingTargetPrice(false);
    setPriceInput('');
  };

  const handleMarkPurchased = async () => {
    const price = purchasePriceInput ? parseFloat(purchasePriceInput) : entry.currentPrice;
    await onMarkPurchased(entry.id, price);
    setShowPurchaseConfirm(false);
  };

  return (
    <div className="bg-white/[0.03] border border-white/8 rounded-xl overflow-hidden hover:border-white/12 transition-all">
      <div className="flex items-start gap-3 p-3">
        {/* Drag handle */}
        <div className="mt-1 text-white/15 cursor-grab flex-shrink-0">
          <GripVertical size={14} />
        </div>

        {/* Thumbnail */}
        <div className="flex-shrink-0">
          {entry.thumbnail ? (
            <img
              src={entry.thumbnail}
              alt={entry.gameName}
              className={clsx(
                'w-14 h-10 rounded-lg object-cover',
                upcoming ? 'ring-1 ring-purple-500/40' : 'ring-1 ring-white/10'
              )}
            />
          ) : (
            <div className="w-14 h-10 rounded-lg bg-white/5 flex items-center justify-center ring-1 ring-white/10">
              <span className="text-lg">🎮</span>
            </div>
          )}
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-sm font-medium text-white/90 truncate">{entry.gameName}</span>
                {entry.isDayOneBuy && (
                  <span className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 flex-shrink-0">
                    <Zap size={9} />
                    Day 1
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                {entry.platform && (
                  <span className="text-[11px] text-white/40">{entry.platform}</span>
                )}
                {entry.genre && (
                  <span className="text-[11px] text-white/25">{entry.genre}</span>
                )}
                {entry.metacriticScore && (
                  <span className="flex items-center gap-0.5 text-[11px] text-white/30">
                    <Star size={9} />
                    {entry.metacriticScore}
                  </span>
                )}
              </div>
            </div>

            {/* Right: release info or price status */}
            <div className="flex-shrink-0 text-right">
              {upcoming && entry.releaseDate && (
                <div className="flex items-center gap-1 text-purple-400 text-xs">
                  <Calendar size={11} />
                  <span>{days !== null && days >= 0 ? `${days}d` : 'Soon'}</span>
                </div>
              )}
              {!upcoming && priceStatus && (
                <div className={clsx('flex items-center gap-1 text-[11px]', priceStatus.color)}>
                  <span className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0', priceStatus.dot)} />
                  {priceStatus.label}
                </div>
              )}
            </div>
          </div>

          {/* Release date line */}
          {entry.releaseDate && (
            <div className="mt-1.5 text-[11px] text-white/25 flex items-center gap-1">
              <Calendar size={9} />
              {upcoming ? `Coming ${formatRelease(entry.releaseDate)}` : `Released ${formatRelease(entry.releaseDate)}`}
            </div>
          )}

          {/* Price row */}
          <div className="mt-2 flex items-center gap-3 flex-wrap">
            {/* MSRP */}
            {entry.msrpEstimate && (
              <div className="text-[11px] text-white/25">
                MSRP <span className="text-white/40">${entry.msrpEstimate}</span>
              </div>
            )}

            {/* Current price — inline editable */}
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-white/30">Now:</span>
              {editingCurrentPrice ? (
                <input
                  autoFocus
                  type="number"
                  value={priceInput}
                  onChange={e => setPriceInput(e.target.value)}
                  onBlur={() => handlePriceBlur('currentPrice')}
                  onKeyDown={e => { if (e.key === 'Enter') handlePriceBlur('currentPrice'); if (e.key === 'Escape') { setEditingCurrentPrice(false); } }}
                  className="w-16 bg-white/10 text-white text-xs px-1.5 py-0.5 rounded focus:outline-none"
                  placeholder="$0"
                  min="0"
                />
              ) : (
                <button
                  onClick={() => { setEditingCurrentPrice(true); setPriceInput(entry.currentPrice?.toString() || ''); }}
                  className="text-[11px] text-white/50 hover:text-white/80 transition-colors underline decoration-dotted"
                >
                  {entry.currentPrice != null ? `$${entry.currentPrice}` : 'set price'}
                </button>
              )}
            </div>

            {/* Target price — inline editable */}
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-white/30">Buy at:</span>
              {editingTargetPrice ? (
                <input
                  autoFocus
                  type="number"
                  value={priceInput}
                  onChange={e => setPriceInput(e.target.value)}
                  onBlur={() => handlePriceBlur('targetPrice')}
                  onKeyDown={e => { if (e.key === 'Enter') handlePriceBlur('targetPrice'); if (e.key === 'Escape') { setEditingTargetPrice(false); } }}
                  className="w-16 bg-white/10 text-white text-xs px-1.5 py-0.5 rounded focus:outline-none"
                  placeholder="$0"
                  min="0"
                />
              ) : (
                <button
                  onClick={() => { setEditingTargetPrice(true); setPriceInput(entry.targetPrice?.toString() || ''); }}
                  className="text-[11px] text-white/50 hover:text-white/80 transition-colors underline decoration-dotted"
                >
                  {entry.targetPrice != null ? `$${entry.targetPrice}` : 'set target'}
                </button>
              )}
            </div>

            {savings && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400">
                {savings}
              </span>
            )}
          </div>
        </div>

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-white/20 hover:text-white/50 transition-colors flex-shrink-0 mt-0.5"
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Expanded section */}
      {expanded && (
        <div className="px-4 pb-4 pt-0 border-t border-white/5 mt-1 space-y-3">
          {/* Notes */}
          {entry.notes && (
            <p className="text-xs text-white/40 italic">&quot;{entry.notes}&quot;</p>
          )}

          {/* Actions row */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* PS Store link */}
            <a
              href={psStoreUrl(entry.gameName)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 text-xs transition-all"
            >
              <ExternalLink size={12} />
              {entry.platform?.startsWith('Xbox') ? 'Xbox Store' : 'PS Store'}
            </a>

            {/* Bought It */}
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
                    placeholder="price paid"
                    className="w-24 bg-white/5 border border-white/10 rounded-lg pl-5 pr-2 py-1 text-xs text-white focus:outline-none focus:border-emerald-500/40"
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
                  Cancel
                </button>
              </div>
            )}

            {/* Delete */}
            <button
              onClick={() => onDelete(entry.id)}
              className="ml-auto flex items-center gap-1 px-2 py-1.5 rounded-lg text-red-400/50 hover:text-red-400 hover:bg-red-500/10 text-xs transition-all"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
