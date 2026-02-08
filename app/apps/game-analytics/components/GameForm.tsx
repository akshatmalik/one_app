'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { Game, GameStatus, PurchaseSource, SubscriptionSource } from '../lib/types';
import { calculateCostPerHour, getValueRating } from '../lib/calculations';
import clsx from 'clsx';

interface GameFormProps {
  onSubmit: (game: Omit<Game, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onClose: () => void;
  initialGame?: Game;
  existingFranchises?: string[];
}

const PLATFORMS = ['PC', 'PS5', 'PS4', 'Xbox Series', 'Xbox One', 'Switch', 'Mobile', 'Other'];
const GENRES = ['Action', 'Action-Adventure', 'RPG', 'JRPG', 'Horror', 'Platformer', 'Strategy', 'Simulation', 'Sports', 'Racing', 'Puzzle', 'Metroidvania', 'Roguelike', 'Souls-like', 'FPS', 'TPS', 'MMO', 'Indie', 'Adventure', 'Other'];
const PURCHASE_SOURCES: PurchaseSource[] = ['Steam', 'PlayStation', 'Xbox', 'Nintendo', 'Epic', 'GOG', 'Physical', 'Other'];
const SUBSCRIPTION_SOURCES: SubscriptionSource[] = ['PS Plus', 'Game Pass', 'Epic Free', 'Prime Gaming', 'Humble Choice', 'Other'];

// Capitalize first letter of each word
function toTitleCase(str: string): string {
  return str
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export function GameForm({ onSubmit, onClose, initialGame, existingFranchises = [] }: GameFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: initialGame?.name || '',
    price: initialGame?.price !== undefined ? initialGame.price.toString() : '',
    hours: initialGame?.hours !== undefined ? initialGame.hours.toString() : '',
    rating: initialGame?.rating || 8,
    status: (initialGame?.status || 'Not Started') as GameStatus,
    platform: initialGame?.platform || 'PS5',
    genre: initialGame?.genre || '',
    franchise: initialGame?.franchise || '',
    purchaseSource: initialGame?.purchaseSource || 'PlayStation' as PurchaseSource | '',
    acquiredFree: initialGame?.acquiredFree || false,
    originalPrice: initialGame?.originalPrice !== undefined ? initialGame.originalPrice.toString() : '',
    subscriptionSource: initialGame?.subscriptionSource || '' as SubscriptionSource | '',
    notes: initialGame?.notes || '',
    review: initialGame?.review || '',
    datePurchased: initialGame?.datePurchased || new Date().toISOString().split('T')[0],
    startDate: initialGame?.startDate || '',
    endDate: initialGame?.endDate || '',
    playLogs: initialGame?.playLogs || [],
  });

  const priceNum = parseFloat(formData.price) || 0;
  const hoursNum = parseFloat(formData.hours) || 0;
  const costPerHour = calculateCostPerHour(priceNum, hoursNum);
  const valueRating = getValueRating(costPerHour);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit({
        ...formData,
        name: toTitleCase(formData.name.trim()),
        franchise: formData.franchise ? toTitleCase(formData.franchise.trim()) : undefined,
        price: parseFloat(formData.price) || 0,
        hours: parseFloat(formData.hours) || 0,
        originalPrice: formData.originalPrice ? parseFloat(formData.originalPrice) : undefined,
        purchaseSource: formData.purchaseSource || undefined,
        acquiredFree: formData.acquiredFree || undefined,
        subscriptionSource: formData.acquiredFree && formData.subscriptionSource ? formData.subscriptionSource : undefined,
        startDate: formData.startDate || undefined,
        endDate: formData.endDate || undefined,
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const getValueColor = (rating: string) => {
    switch (rating) {
      case 'Excellent': return 'text-emerald-400 bg-emerald-500/10';
      case 'Good': return 'text-blue-400 bg-blue-500/10';
      case 'Fair': return 'text-yellow-400 bg-yellow-500/10';
      case 'Poor': return 'text-red-400 bg-red-500/10';
      default: return 'text-white/50 bg-white/5';
    }
  };

  const isOwned = formData.status !== 'Wishlist';
  const showPlayDates = isOwned && (formData.status === 'In Progress' || formData.status === 'Completed' || formData.status === 'Abandoned');

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#12121a] border border-white/5 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/5 sticky top-0 bg-[#12121a] z-10">
          <h2 className="text-lg font-semibold text-white">
            {initialGame ? 'Edit Game' : 'Add Game'}
          </h2>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white/70 hover:bg-white/5 rounded-lg p-1.5 transition-all"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Game Name */}
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1.5">Game Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/5 text-white rounded-lg text-sm focus:outline-none focus:bg-white/[0.05] focus:border-white/10 transition-all placeholder:text-white/30"
              placeholder="Enter game name"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1.5">Status</label>
            <div className="grid grid-cols-5 gap-1.5">
              {(['Not Started', 'In Progress', 'Completed', 'Wishlist', 'Abandoned'] as GameStatus[]).map(status => (
                <button
                  key={status}
                  type="button"
                  onClick={() => {
                    const today = new Date().toISOString().split('T')[0];
                    const updates: Partial<typeof formData> = { status };
                    // Auto-fill dates on status change
                    if (status === 'Completed' && !formData.endDate) {
                      updates.endDate = today;
                    }
                    if (status === 'In Progress' && !formData.startDate) {
                      updates.startDate = today;
                    }
                    if (status === 'Abandoned' && !formData.endDate) {
                      updates.endDate = today;
                    }
                    setFormData({ ...formData, ...updates });
                  }}
                  className={clsx(
                    'px-2 py-1.5 rounded-lg text-[10px] font-medium transition-all',
                    formData.status === status
                      ? status === 'Completed' ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/50'
                        : status === 'In Progress' ? 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/50'
                        : status === 'Wishlist' ? 'bg-purple-500/20 text-purple-400 ring-1 ring-purple-500/50'
                        : status === 'Abandoned' ? 'bg-red-500/20 text-red-400 ring-1 ring-red-500/50'
                        : 'bg-white/10 text-white/70 ring-1 ring-white/20'
                      : 'bg-white/[0.03] text-white/40 hover:bg-white/[0.06]'
                  )}
                >
                  {status === 'Not Started' ? 'Backlog' : status}
                </button>
              ))}
            </div>
          </div>

          {/* Price & Hours Row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">
                Paid Price ($) {formData.acquiredFree && <span className="text-emerald-400 text-[10px]">• Free</span>}
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={e => setFormData({ ...formData, price: e.target.value })}
                className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/5 text-white rounded-lg text-sm focus:outline-none focus:bg-white/[0.05] focus:border-white/10 transition-all"
                placeholder="0.00"
                disabled={formData.acquiredFree}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">Original Price ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.originalPrice}
                onChange={e => setFormData({ ...formData, originalPrice: e.target.value })}
                className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/5 text-white rounded-lg text-sm focus:outline-none focus:bg-white/[0.05] focus:border-white/10 transition-all"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Discount Display */}
          {(() => {
            const paidPrice = parseFloat(formData.price) || 0;
            const origPrice = parseFloat(formData.originalPrice) || 0;
            const discount = origPrice > paidPrice && paidPrice >= 0 ? ((origPrice - paidPrice) / origPrice) * 100 : 0;
            const savings = origPrice - paidPrice;

            if (discount > 0) {
              return (
                <div className="px-3 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 text-sm flex items-center justify-between">
                  <span className="font-medium">{discount.toFixed(0)}% discount!</span>
                  <span className="text-xs">Saved ${savings.toFixed(2)}</span>
                </div>
              );
            }
            return null;
          })()}

          {/* Hours */}
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1.5">Total Hours</label>
            <input
              type="number"
              step="0.5"
              min="0"
              value={formData.hours}
              onChange={e => setFormData({ ...formData, hours: e.target.value })}
              className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/5 text-white rounded-lg text-sm focus:outline-none focus:bg-white/[0.05] focus:border-white/10 transition-all"
              placeholder="0.0"
            />
            <button
              type="button"
              onClick={() => {
                const current = parseFloat(formData.hours) || 0;
                setFormData({ ...formData, hours: (current + 0.5).toString() });
              }}
              className="w-full mt-2 px-3 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 rounded-lg text-sm font-medium transition-all"
            >
              +0.5 Hour
            </button>
          </div>

          {/* Cost Per Hour Display */}
          {hoursNum > 0 && priceNum > 0 && (
            <div className={clsx('px-3 py-2 rounded-lg text-sm', getValueColor(valueRating))}>
              <span className="font-medium">${costPerHour.toFixed(2)}/hr</span>
              <span className="text-white/40 ml-2">• {valueRating} value</span>
            </div>
          )}

          {/* Rating - only show for games that have been played */}
          {formData.status !== 'Not Started' && formData.status !== 'Wishlist' && (
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">
                Rating <span className="text-white/70 font-semibold">{formData.rating}/10</span>
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={formData.rating}
                onChange={e => setFormData({ ...formData, rating: parseInt(e.target.value) })}
                className="w-full"
              />
              <div className="flex justify-between text-[10px] text-white/30 mt-1">
                <span>Awful</span>
                <span>Meh</span>
                <span>Good</span>
                <span>Great</span>
                <span>Masterpiece</span>
              </div>
            </div>
          )}

          {/* Platform, Genre, Source Row */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">Platform</label>
              <select
                value={formData.platform}
                onChange={e => setFormData({ ...formData, platform: e.target.value })}
                className="w-full px-2 py-2.5 bg-white/[0.03] border border-white/5 text-white rounded-lg text-xs focus:outline-none focus:bg-white/[0.05] focus:border-white/10 transition-all"
              >
                <option value="">Select...</option>
                {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">Genre</label>
              <select
                value={formData.genre}
                onChange={e => setFormData({ ...formData, genre: e.target.value })}
                className="w-full px-2 py-2.5 bg-white/[0.03] border border-white/5 text-white rounded-lg text-xs focus:outline-none focus:bg-white/[0.05] focus:border-white/10 transition-all"
              >
                <option value="">Select...</option>
                {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">Source</label>
              <select
                value={formData.purchaseSource}
                onChange={e => setFormData({ ...formData, purchaseSource: e.target.value as PurchaseSource })}
                className="w-full px-2 py-2.5 bg-white/[0.03] border border-white/5 text-white rounded-lg text-xs focus:outline-none focus:bg-white/[0.05] focus:border-white/10 transition-all"
              >
                <option value="">Select...</option>
                {PURCHASE_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Franchise */}
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1.5">
              Franchise / Series
              <span className="text-white/30 ml-1 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              list="franchise-suggestions"
              value={formData.franchise}
              onChange={e => setFormData({ ...formData, franchise: e.target.value })}
              className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/5 text-white rounded-lg text-sm focus:outline-none focus:bg-white/[0.05] focus:border-white/10 transition-all placeholder:text-white/30"
              placeholder="e.g. The Witcher, Final Fantasy, Souls"
            />
            <datalist id="franchise-suggestions">
              {existingFranchises.map(f => <option key={f} value={f} />)}
            </datalist>
          </div>

          {/* Free/Subscription Section */}
          {isOwned && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-white/5" />
                <span className="text-[10px] text-white/30 uppercase tracking-wider">Subscription / Free</span>
                <div className="h-px flex-1 bg-white/5" />
              </div>

              {/* Acquired Free Toggle */}
              <div className="flex items-center justify-between p-3 bg-white/[0.02] rounded-lg">
                <div>
                  <div className="text-sm text-white/80">Acquired Free</div>
                  <div className="text-[10px] text-white/40">From PS Plus, Game Pass, etc.</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const newAcquiredFree = !formData.acquiredFree;
                    setFormData({
                      ...formData,
                      acquiredFree: newAcquiredFree,
                      price: newAcquiredFree ? '0' : formData.price,
                    });
                  }}
                  className={clsx(
                    'w-11 h-6 rounded-full transition-all relative',
                    formData.acquiredFree ? 'bg-emerald-500' : 'bg-white/10'
                  )}
                >
                  <div className={clsx(
                    'w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all',
                    formData.acquiredFree ? 'left-5' : 'left-0.5'
                  )} />
                </button>
              </div>

              {/* Subscription Details */}
              {formData.acquiredFree && (
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5">Subscription Source</label>
                  <select
                    value={formData.subscriptionSource}
                    onChange={e => setFormData({ ...formData, subscriptionSource: e.target.value as SubscriptionSource })}
                    className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/5 text-white rounded-lg text-sm focus:outline-none focus:bg-white/[0.05] focus:border-white/10 transition-all"
                  >
                    <option value="">Select...</option>
                    {SUBSCRIPTION_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Date Section */}
          {isOwned && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-white/5" />
                <span className="text-[10px] text-white/30 uppercase tracking-wider">Dates</span>
                <div className="h-px flex-1 bg-white/5" />
              </div>

              <div className={clsx('grid gap-3', showPlayDates ? 'grid-cols-3' : 'grid-cols-1')}>
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5">Purchased</label>
                  <input
                    type="date"
                    value={formData.datePurchased}
                    onChange={e => setFormData({ ...formData, datePurchased: e.target.value })}
                    className="w-full px-2 py-2.5 bg-white/[0.03] border border-white/5 text-white rounded-lg text-xs focus:outline-none focus:bg-white/[0.05] focus:border-white/10 transition-all"
                  />
                </div>
                {showPlayDates && (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-white/50 mb-1.5">Started</label>
                      <input
                        type="date"
                        value={formData.startDate}
                        onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                        className="w-full px-2 py-2.5 bg-white/[0.03] border border-white/5 text-white rounded-lg text-xs focus:outline-none focus:bg-white/[0.05] focus:border-white/10 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-white/50 mb-1.5">Finished</label>
                      <input
                        type="date"
                        value={formData.endDate}
                        onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                        className="w-full px-2 py-2.5 bg-white/[0.03] border border-white/5 text-white rounded-lg text-xs focus:outline-none focus:bg-white/[0.05] focus:border-white/10 transition-all"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1.5">Quick Notes</label>
            <input
              type="text"
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/5 text-white rounded-lg text-sm focus:outline-none focus:bg-white/[0.05] focus:border-white/10 transition-all"
              placeholder="Brief note (e.g. 'Day one purchase')"
            />
          </div>

          {/* Review */}
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1.5">Your Review</label>
            <textarea
              value={formData.review}
              onChange={e => setFormData({ ...formData, review: e.target.value })}
              className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/5 text-white rounded-lg text-sm focus:outline-none focus:bg-white/[0.05] focus:border-white/10 transition-all resize-none"
              rows={4}
              placeholder="Write your detailed review... What did you love? What could be better? Would you recommend it?"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2.5 bg-white/5 text-white/70 rounded-lg hover:bg-white/10 transition-all text-sm font-medium disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-all text-sm font-medium disabled:opacity-50"
            >
              {loading ? 'Saving...' : initialGame ? 'Update' : 'Add Game'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
