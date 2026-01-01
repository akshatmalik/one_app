'use client';

import { useState } from 'react';
import { X, Clock, Plus } from 'lucide-react';
import { Game, PlayLog } from '../lib/types';
import { v4 as uuidv4 } from 'uuid';

interface QuickAddTimeModalProps {
  games: Game[];
  onSave: (gameId: string, playLog: PlayLog) => Promise<void>;
  onClose: () => void;
}

export function QuickAddTimeModal({ games, onSave, onClose }: QuickAddTimeModalProps) {
  const [selectedGameId, setSelectedGameId] = useState('');
  const [hours, setHours] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const ownedGames = games.filter(g => g.status !== 'Wishlist').sort((a, b) => a.name.localeCompare(b.name));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGameId || !hours || parseFloat(hours) <= 0) return;

    setSaving(true);
    try {
      const playLog: PlayLog = {
        id: uuidv4(),
        date,
        hours: parseFloat(hours),
        notes: notes.trim() || undefined,
      };
      await onSave(selectedGameId, playLog);
      onClose();
    } catch (error) {
      console.error('Failed to save play log:', error);
      alert('Failed to save play session. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#12121a] border border-white/10 rounded-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Plus size={20} className="text-purple-400" />
            <h2 className="text-lg font-semibold text-white">Quick Add Play Time</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white/70 hover:bg-white/5 rounded-lg p-1.5 transition-all"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Game Selection */}
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1.5">Select Game *</label>
            <select
              required
              value={selectedGameId}
              onChange={e => setSelectedGameId(e.target.value)}
              className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/10 text-white rounded-lg text-sm focus:outline-none focus:bg-white/[0.05] focus:border-purple-500/50 transition-all"
            >
              <option value="">Choose a game...</option>
              {ownedGames.map(game => (
                <option key={game.id} value={game.id}>
                  {game.name} {game.platform && `(${game.platform})`}
                </option>
              ))}
            </select>
          </div>

          {/* Hours and Date Row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">Hours Played *</label>
              <input
                type="number"
                required
                step="0.5"
                min="0.1"
                value={hours}
                onChange={e => setHours(e.target.value)}
                className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/10 text-white rounded-lg text-sm focus:outline-none focus:bg-white/[0.05] focus:border-purple-500/50 transition-all"
                placeholder="2.5"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">Date</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/10 text-white rounded-lg text-sm focus:outline-none focus:bg-white/[0.05] focus:border-purple-500/50 transition-all"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1.5">
              Notes <span className="text-white/30">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/10 text-white rounded-lg text-sm focus:outline-none focus:bg-white/[0.05] focus:border-purple-500/50 transition-all resize-none"
              placeholder="Add session notes..."
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white/70 rounded-lg transition-all text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !selectedGameId || !hours}
              className="flex-1 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-600/50 disabled:cursor-not-allowed text-white rounded-lg transition-all text-sm font-medium flex items-center justify-center gap-2"
            >
              <Clock size={16} />
              {saving ? 'Saving...' : 'Add Session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
