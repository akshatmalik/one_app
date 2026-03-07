'use client';

import { useState } from 'react';
import {
  ExternalLink, Check, Trash2, ChevronDown, ChevronUp, GripVertical,
  Calendar, Star, Zap, Target, TrendingDown, TrendingUp, Minus,
  AlertCircle, Clock, Edit3, HelpCircle, ShoppingCart
} from 'lucide-react';
import { PurchaseQueueEntry } from '../lib/types';
import { Game } from '../lib/types';
import {
  getBuyConfidence,
  getPriceContext,
  getPredictedValue,
  getStoreUrl,
} from '../lib/calculations';
import clsx from 'clsx';

interface Props {
  entry: PurchaseQueueEntry;
  allGames: Game[];
  onUpdate: (id: string, updates: Partial<PurchaseQueueEntry>) => Promise<void>;
  onMarkPurchased: (id: string, price?: number) => Promise<void>;
  onDelete: (id: string) => void;
  onToggleMaybe?: () => void;
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

function getConfidenceColor(score: number): string {
  if (score >= 80) return 'text-emerald-400 bg-emerald-500/15';
  if (score >= 60) return 'text-blue-400 bg-blue-500/15';
  if (score >= 40) return 'text-yellow-400 bg-yellow-500/15';
  return 'text-red-400 bg-red-500/15';
}

export function BuyQueueCard({ entry, allGames, onUpdate, onMarkPurchased, onDelete, onToggleMaybe }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [editingCurrentPrice, setEditingCurrentPrice] = useState(false);
  const [editingTargetPrice, setEditingTargetPrice] = useState(false);
  const [editingReleaseDate, setEditingReleaseDate] = useState(false);
  const [priceInput, setPriceInput] = useState('');
  const [releaseDateInput, setReleaseDateInput] = useState('');
  const [showPurchaseConfirm, setShowPurchaseConfirm] = useState(false);
  const [purchasePriceInput, setPurchasePriceInput] = useState('');

  const upcoming = entry.releaseDate ? new Date(entry.releaseDate) > new Date() : false;
  const days = entry.releaseDate ? daysUntil(entry.releaseDate) : null;
  const priceStatus = getPriceStatus(entry);
  const savings = getSavings(entry);
  const isAtTarget = priceStatus?.glow ?? false;

  // Intelligence (Features #5, #6, #7)
  const confidence = getBuyConfidence(entry, allGames);
  const priceContext = getPriceContext(entry, allGames);
  const predicted = getPredictedValue(entry, allGames);
  const storeLinks = getStoreUrl(entry.gameName, entry.platform);

  const handlePriceBlur = async (field: 'currentPrice' | 'targetPrice') => {
    const val = parseFloat(priceInput);
    if (!isNaN(val) && val >= 0) {
      await onUpdate(entry.id, { [field]: val });
    }
    setEditingCurrentPrice(false);
    setEditingTargetPrice(false);
    setPriceInput('');
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

  // Countdown urgency level (Feature #3)
  const getCountdownStyle = () => {
    if (!upcoming || days === null) return null;
    if (days <= 7) return { urgency: 'imminent', color: 'text-red-400', bg: 'bg-red-500/15', pulse: true };
    if (days <= 30) return { urgency: 'soon', color: 'text-amber-400', bg: 'bg-amber-500/15', pulse: false };
    if (days <= 90) return { urgency: 'approaching', color: 'text-purple-400', bg: 'bg-purple-500/15', pulse: false };
    return { urgency: 'distant', color: 'text-white/40', bg: 'bg-white/5', pulse: false };
  };

  const countdown = getCountdownStyle();

  return (
    <div className={clsx(
      'rounded-xl overflow-hidden transition-all',
      entry.isMaybe
        ? 'border border-dashed border-amber-500/25 opacity-90'
        : isAtTarget
          ? 'border-2 border-emerald-500/40 buy-queue-price-glow'
          : 'border border-white/8 hover:border-white/12'
    )}>
      {/* Poster Banner (Feature #2) */}
      {entry.thumbnail ? (
        <div className="relative h-24 overflow-hidden">
          <img
            src={entry.thumbnail}
            alt={entry.gameName}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#12121a] via-[#12121a]/50 to-transparent" />

          {/* Countdown overlay (Feature #3) */}
          {upcoming && countdown && days !== null && (
            <div className={clsx(
              'absolute top-2 right-2 px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1',
              countdown.bg, countdown.color,
              countdown.pulse && 'buy-queue-countdown-pulse'
            )}>
              <Calendar size={11} />
              {days <= 0 ? 'Today!' : days <= 7 ? `${days}d!` : `${days}d`}
            </div>
          )}

          {/* Confidence badge (Feature #5) */}
          {allGames.length > 0 && (
            <div className={clsx(
              'absolute top-2 left-2 px-2 py-1 rounded-lg text-[11px] font-bold',
              getConfidenceColor(confidence.score)
            )}>
              {confidence.score}%
            </div>
          )}

          {/* Name + tags on image */}
          <div className="absolute bottom-2 left-3 right-3">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-sm font-semibold text-white truncate drop-shadow-lg">{entry.gameName}</span>
              {entry.isDayOneBuy && (
                <span className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-amber-500/25 text-amber-300 flex-shrink-0 backdrop-blur-sm">
                  <Zap size={9} />
                  Day 1
                </span>
              )}
              {entry.isMaybe && (
                <span className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 flex-shrink-0 backdrop-blur-sm">
                  <HelpCircle size={9} />
                  Maybe
                </span>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* No thumbnail — compact header */
        <div className="px-3 pt-3 pb-1">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-emerald-500/20 flex items-center justify-center flex-shrink-0">
              <span className="text-lg">🎮</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-sm font-medium text-white/90 truncate">{entry.gameName}</span>
                {entry.isDayOneBuy && (
                  <span className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 flex-shrink-0">
                    <Zap size={9} />
                    Day 1
                  </span>
                )}
                {entry.isMaybe && (
                  <span className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 flex-shrink-0">
                    <HelpCircle size={9} />
                    Maybe
                  </span>
                )}
              </div>
            </div>
            {/* Confidence badge inline */}
            {allGames.length > 0 && (
              <span className={clsx('text-[11px] font-bold px-2 py-0.5 rounded flex-shrink-0', getConfidenceColor(confidence.score))}>
                {confidence.score}%
              </span>
            )}
          </div>
        </div>
      )}

      {/* Card body */}
      <div className="bg-white/[0.03] px-3 pb-3 pt-2">
        {/* Meta row */}
        <div className="flex items-center gap-2 flex-wrap text-[11px]">
          {entry.platform && <span className="text-white/40">{entry.platform}</span>}
          {entry.genre && <span className="text-white/25">{entry.genre}</span>}
          {entry.metacriticScore && (
            <span className="flex items-center gap-0.5 text-white/30">
              <Star size={9} />
              {entry.metacriticScore}
            </span>
          )}
          {!upcoming && priceStatus && (
            <span className={clsx('flex items-center gap-1 ml-auto', priceStatus.color)}>
              <span className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0', priceStatus.dot)} />
              {priceStatus.label}
            </span>
          )}
        </div>

        {/* Release date — editable (Manual release date feature) */}
        <div className="mt-1.5 flex items-center gap-1 text-[11px]">
          <Calendar size={9} className="text-white/20" />
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
              className="text-white/25 hover:text-white/60 transition-colors underline decoration-dotted"
            >
              {entry.releaseDate
                ? (upcoming ? `Coming ${formatRelease(entry.releaseDate)}` : `Released ${formatRelease(entry.releaseDate)}`)
                : 'Set release date'
              }
            </button>
          )}
          {entry.releaseDate && (
            <button
              onClick={() => { setEditingReleaseDate(true); setReleaseDateInput(entry.releaseDate || ''); }}
              className="text-white/15 hover:text-white/40 transition-colors ml-0.5"
            >
              <Edit3 size={9} />
            </button>
          )}
        </div>

        {/* Price row */}
        <div className="mt-2 flex items-center gap-3 flex-wrap">
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
                onKeyDown={e => { if (e.key === 'Enter') handlePriceBlur('currentPrice'); if (e.key === 'Escape') setEditingCurrentPrice(false); }}
                className="w-16 bg-white/10 text-white text-xs px-1.5 py-0.5 rounded focus:outline-none"
                placeholder="$0"
                min="0"
              />
            ) : (
              <button
                onClick={() => { setEditingCurrentPrice(true); setPriceInput(entry.currentPrice?.toString() || ''); }}
                className="text-[11px] text-white/50 hover:text-white/80 transition-colors underline decoration-dotted"
              >
                {entry.currentPrice != null ? `$${entry.currentPrice}` : 'set'}
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
                onKeyDown={e => { if (e.key === 'Enter') handlePriceBlur('targetPrice'); if (e.key === 'Escape') setEditingTargetPrice(false); }}
                className="w-16 bg-white/10 text-white text-xs px-1.5 py-0.5 rounded focus:outline-none"
                placeholder="$0"
                min="0"
              />
            ) : (
              <button
                onClick={() => { setEditingTargetPrice(true); setPriceInput(entry.targetPrice?.toString() || ''); }}
                className="text-[11px] text-white/50 hover:text-white/80 transition-colors underline decoration-dotted"
              >
                {entry.targetPrice != null ? `$${entry.targetPrice}` : 'set'}
              </button>
            )}
          </div>

          {savings && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400">
              {savings}
            </span>
          )}
        </div>

        {/* Intelligence line — price context (Feature #6) */}
        {allGames.length > 0 && priceContext.insight !== 'Not enough data yet' && (
          <div className="mt-1.5 flex items-center gap-1 text-[10px] text-white/25">
            {priceContext.comparison === 'below' ? <TrendingDown size={9} className="text-emerald-400/50" /> :
             priceContext.comparison === 'above' ? <TrendingUp size={9} className="text-red-400/50" /> :
             <Minus size={9} />}
            <span className="italic">{priceContext.insight}</span>
          </div>
        )}

        {/* Predicted value (Feature #7) */}
        {predicted && (
          <div className="mt-1 flex items-center gap-1 text-[10px] text-white/25">
            <Target size={9} className={clsx(
              predicted.predictedRating === 'Excellent' ? 'text-emerald-400/50' :
              predicted.predictedRating === 'Good' ? 'text-blue-400/50' :
              predicted.predictedRating === 'Fair' ? 'text-yellow-400/50' : 'text-red-400/50'
            )} />
            <span className="italic">Predicted: {predicted.predictedRating} ({predicted.insight})</span>
          </div>
        )}

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-center gap-1 mt-2 pt-2 border-t border-white/5 text-white/20 hover:text-white/40 transition-colors text-[11px]"
        >
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {expanded ? 'Less' : 'More'}
        </button>
      </div>

      {/* Expanded section */}
      {expanded && (
        <div className="px-3 pb-3 bg-white/[0.03] space-y-3">
          {/* Confidence breakdown (Feature #5) */}
          {confidence.factors.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[11px] text-white/30 font-medium">Buy Confidence: {confidence.score}%</div>
              {confidence.factors.map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-[11px]">
                  <div className="flex-1 min-w-0">
                    <span className="text-white/40">{f.label}</span>
                  </div>
                  <div className="w-16 h-1.5 bg-white/5 rounded-full overflow-hidden flex-shrink-0">
                    <div
                      className={clsx(
                        'h-full rounded-full transition-all',
                        f.value >= 70 ? 'bg-emerald-500' : f.value >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                      )}
                      style={{ width: `${Math.min(100, f.value)}%` }}
                    />
                  </div>
                  <span className="text-white/25 text-[10px] w-8 text-right">{f.value.toFixed(0)}%</span>
                </div>
              ))}
              {confidence.factors.length > 0 && (
                <p className="text-[10px] text-white/20 italic">{confidence.factors[0].insight}</p>
              )}
            </div>
          )}

          {/* Notes */}
          {entry.notes && (
            <p className="text-xs text-white/40 italic">&quot;{entry.notes}&quot;</p>
          )}

          {/* Actions row */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Store links (Feature #19) */}
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

            {/* Maybe toggle */}
            {onToggleMaybe && (
              <button
                onClick={onToggleMaybe}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all',
                  entry.isMaybe
                    ? 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20'
                    : 'bg-amber-500/10 text-amber-400/70 hover:bg-amber-500/20 hover:text-amber-400'
                )}
              >
                {entry.isMaybe ? (
                  <><ShoppingCart size={12} /> Commit</>
                ) : (
                  <><HelpCircle size={12} /> Maybe</>
                )}
              </button>
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
