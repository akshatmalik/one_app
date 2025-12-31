'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { Game, GameStatus } from '../lib/types';
import { calculateCostPerHour, getValueRating } from '../lib/calculations';
import clsx from 'clsx';

interface GameFormProps {
  onSubmit: (game: Omit<Game, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onClose: () => void;
  initialGame?: Game;
}

const PLATFORMS = ['PC', 'PS5', 'PS4', 'Xbox Series', 'Xbox One', 'Switch', 'Mobile', 'Other'];
const GENRES = ['Action', 'Action-Adventure', 'RPG', 'JRPG', 'Horror', 'Platformer', 'Strategy', 'Simulation', 'Sports', 'Racing', 'Puzzle', 'Metroidvania', 'Roguelike', 'FPS', 'TPS', 'MMO', 'Other'];

export function GameForm({ onSubmit, onClose, initialGame }: GameFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: initialGame?.name || '',
    price: initialGame?.price || 0,
    hours: initialGame?.hours || 0,
    rating: initialGame?.rating || 8,
    status: (initialGame?.status || 'Not Started') as GameStatus,
    platform: initialGame?.platform || '',
    genre: initialGame?.genre || '',
    notes: initialGame?.notes || '',
    datePurchased: initialGame?.datePurchased || new Date().toISOString().split('T')[0],
  });

  const costPerHour = calculateCostPerHour(formData.price, formData.hours);
  const valueRating = getValueRating(costPerHour);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(formData);
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

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#12121a] border border-white/5 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/5 sticky top-0 bg-[#12121a]">
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
            <label className="block text-xs font-medium text-white/50 mb-1.5">Game Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/5 text-white rounded-lg text-sm focus:outline-none focus:bg-white/[0.05] focus:border-white/10 transition-all placeholder:text-white/30"
              placeholder="Enter game name"
            />
          </div>

          {/* Price & Hours Row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">Price ($)</label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.price}
                onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/5 text-white rounded-lg text-sm focus:outline-none focus:bg-white/[0.05] focus:border-white/10 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">Hours Played</label>
              <input
                type="number"
                step="0.5"
                required
                value={formData.hours}
                onChange={e => setFormData({ ...formData, hours: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/5 text-white rounded-lg text-sm focus:outline-none focus:bg-white/[0.05] focus:border-white/10 transition-all"
              />
            </div>
          </div>

          {/* Cost Per Hour Display */}
          {formData.hours > 0 && (
            <div className={clsx('px-3 py-2 rounded-lg text-sm', getValueColor(valueRating))}>
              <span className="font-medium">${costPerHour.toFixed(2)}/hr</span>
              <span className="text-white/40 ml-2">• {valueRating} value</span>
            </div>
          )}

          {/* Rating */}
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
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1.5">Status</label>
            <select
              value={formData.status}
              onChange={e => setFormData({ ...formData, status: e.target.value as GameStatus })}
              className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/5 text-white rounded-lg text-sm focus:outline-none focus:bg-white/[0.05] focus:border-white/10 transition-all"
            >
              <option value="Not Started">Not Started</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="Wishlist">Wishlist</option>
              <option value="Abandoned">Abandoned</option>
            </select>
          </div>

          {/* Platform & Genre Row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">Platform</label>
              <select
                value={formData.platform}
                onChange={e => setFormData({ ...formData, platform: e.target.value })}
                className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/5 text-white rounded-lg text-sm focus:outline-none focus:bg-white/[0.05] focus:border-white/10 transition-all"
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
                className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/5 text-white rounded-lg text-sm focus:outline-none focus:bg-white/[0.05] focus:border-white/10 transition-all"
              >
                <option value="">Select...</option>
                {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          </div>

          {/* Date Purchased */}
          {formData.status !== 'Wishlist' && (
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">Date Purchased</label>
              <input
                type="date"
                value={formData.datePurchased}
                onChange={e => setFormData({ ...formData, datePurchased: e.target.value })}
                className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/5 text-white rounded-lg text-sm focus:outline-none focus:bg-white/[0.05] focus:border-white/10 transition-all"
              />
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1.5">Notes</label>
            <textarea
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/5 text-white rounded-lg text-sm focus:outline-none focus:bg-white/[0.05] focus:border-white/10 transition-all resize-none"
              rows={2}
              placeholder="Optional notes..."
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
