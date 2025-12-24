'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Game, GameStatus } from '../lib/types';
import { calculateCostPerHour } from '../lib/calculations';
import { searchGameImage } from '../lib/rawg-api';

interface GameFormProps {
  onSubmit: (game: Omit<Game, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onClose: () => void;
  initialGame?: Game;
}

export function GameForm({ onSubmit, onClose, initialGame }: GameFormProps) {
  const [loading, setLoading] = useState(false);
  const [fetchingImage, setFetchingImage] = useState(false);
  const [formData, setFormData] = useState({
    name: initialGame?.name || '',
    price: initialGame?.price || 0,
    hours: initialGame?.hours || 0,
    rating: initialGame?.rating || 8,
    status: (initialGame?.status || 'Completed') as GameStatus,
    notes: initialGame?.notes || '',
    datePurchased: initialGame?.datePurchased || new Date().toISOString().split('T')[0],
    imageUrl: initialGame?.imageUrl || '',
  });

  const costPerHour = calculateCostPerHour(formData.price, formData.hours);

  const handleFetchImage = async () => {
    if (!formData.name.trim()) {
      alert('Please enter a game name first');
      return;
    }

    setFetchingImage(true);
    try {
      const imageUrl = await searchGameImage(formData.name);
      if (imageUrl) {
        setFormData({ ...formData, imageUrl });
      } else {
        alert('No image found for this game. You can enter a custom URL.');
      }
    } catch (error) {
      console.error('Error fetching image:', error);
      alert('Failed to fetch game image');
    } finally {
      setFetchingImage(false);
    }
  };

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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          {initialGame ? 'Edit Game' : 'Add New Game'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Game Name"
            required
            value={formData.name}
            onChange={e =>
              setFormData({ ...formData, name: e.target.value })
            }
          />

          <Input
            label="Price ($)"
            type="number"
            step="0.01"
            required
            value={formData.price}
            onChange={e =>
              setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })
            }
          />

          <Input
            label="Hours Played"
            type="number"
            step="0.5"
            required
            value={formData.hours}
            onChange={e =>
              setFormData({ ...formData, hours: parseFloat(e.target.value) || 0 })
            }
          />

          {formData.hours > 0 && (
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-900">
                Cost per hour: <span className="font-semibold">${costPerHour.toFixed(2)}</span>
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rating (1-10)
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={formData.rating}
              onChange={e =>
                setFormData({ ...formData, rating: parseInt(e.target.value) })
              }
              className="w-full"
            />
            <p className="text-center text-sm text-gray-600 mt-1">
              {formData.rating} / 10
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={formData.status}
              onChange={e =>
                setFormData({ ...formData, status: e.target.value as GameStatus })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="Not Started">Not Started</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>
          </div>

          <Input
            label="Date Purchased"
            type="date"
            value={formData.datePurchased}
            onChange={e =>
              setFormData({ ...formData, datePurchased: e.target.value })
            }
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Game Image
            </label>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  placeholder="Image URL (optional)"
                  value={formData.imageUrl}
                  onChange={e =>
                    setFormData({ ...formData, imageUrl: e.target.value })
                  }
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleFetchImage}
                  disabled={fetchingImage || !formData.name}
                >
                  {fetchingImage ? '🔍' : '🎮'}
                </Button>
              </div>
              {formData.imageUrl && (
                <div className="relative w-full h-32 bg-gray-100 rounded-lg overflow-hidden">
                  <img
                    src={formData.imageUrl}
                    alt={formData.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = '/placeholder-game.png';
                    }}
                  />
                </div>
              )}
              <p className="text-xs text-gray-500">
                Click 🎮 to auto-fetch from RAWG database
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={e =>
                setFormData({ ...formData, notes: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              rows={3}
              placeholder="Optional notes..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? 'Saving...' : initialGame ? 'Update' : 'Add Game'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
