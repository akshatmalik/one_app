'use client';

import { useState } from 'react';
import { X, Plus, Trash2, Clock, Calendar, MessageSquare } from 'lucide-react';
import { Game, PlayLog } from '../lib/types';
import { v4 as uuidv4 } from 'uuid';
import clsx from 'clsx';

interface PlayLogModalProps {
  game: Game;
  onSave: (playLogs: PlayLog[]) => Promise<void>;
  onClose: () => void;
}

// Get local date in YYYY-MM-DD format (not UTC)
function getLocalDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function PlayLogModal({ game, onSave, onClose }: PlayLogModalProps) {
  const [logs, setLogs] = useState<PlayLog[]>(game.playLogs || []);
  const [loading, setLoading] = useState(false);
  const [newLog, setNewLog] = useState({
    date: getLocalDateString(),
    hours: '1',
    notes: '',
  });

  const addLog = () => {
    const hours = parseFloat(newLog.hours) || 0;
    if (hours <= 0) return; // Don't add log with 0 or negative hours

    const log: PlayLog = {
      id: uuidv4(),
      date: newLog.date,
      hours: hours,
      notes: newLog.notes || undefined,
    };
    setLogs([log, ...logs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    setNewLog({
      date: getLocalDateString(),
      hours: '1',
      notes: '',
    });
  };

  const removeLog = (id: string) => {
    setLogs(logs.filter(l => l.id !== id));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await onSave(logs);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const totalLoggedHours = logs.reduce((sum, log) => sum + log.hours, 0);
  const totalHours = game.hours + totalLoggedHours; // Baseline + logged hours

  // Parse date string (YYYY-MM-DD) as local date to avoid timezone shift
  const parseLocalDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#12121a] border border-white/5 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <div>
            <h2 className="text-lg font-semibold text-white">Play Sessions</h2>
            <p className="text-xs text-white/40 mt-0.5">{game.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white/70 hover:bg-white/5 rounded-lg p-1.5 transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Stats Bar */}
        <div className="px-4 py-3 bg-white/[0.02] border-b border-white/5 flex items-center gap-6">
          <div>
            <div className="text-xs text-white/40">Baseline Hours</div>
            <div className="text-lg font-semibold text-white/40">{game.hours}h</div>
          </div>
          <div>
            <div className="text-xs text-white/40">Logged Hours</div>
            <div className="text-lg font-semibold text-purple-400">{totalLoggedHours.toFixed(1)}h</div>
          </div>
          <div>
            <div className="text-xs text-white/40">Total Hours</div>
            <div className="text-lg font-semibold text-white">{totalHours.toFixed(1)}h</div>
          </div>
        </div>

        {/* Add New Log */}
        <div className="p-4 border-b border-white/5">
          <div className="text-xs font-medium text-white/50 mb-2">Log a Session</div>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="block text-[10px] text-white/30 mb-1">Date</label>
              <input
                type="date"
                value={newLog.date}
                onChange={e => setNewLog({ ...newLog, date: e.target.value })}
                className="w-full px-2 py-2 bg-white/[0.03] border border-white/5 text-white rounded-lg text-xs focus:outline-none focus:bg-white/[0.05] focus:border-white/10 transition-all"
              />
            </div>
            <div className="w-24">
              <label className="block text-[10px] text-white/30 mb-1">Hours</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={newLog.hours}
                onChange={e => setNewLog({ ...newLog, hours: e.target.value })}
                className="w-full px-2 py-2 bg-white/[0.03] border border-white/5 text-white rounded-lg text-xs focus:outline-none focus:bg-white/[0.05] focus:border-white/10 transition-all"
                placeholder="1.0"
              />
              <button
                type="button"
                onClick={() => {
                  const current = parseFloat(newLog.hours) || 0;
                  setNewLog({ ...newLog, hours: (current + 0.5).toString() });
                }}
                className="w-full mt-1 px-2 py-1 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 rounded-lg text-[10px] font-medium transition-all"
              >
                +0.5
              </button>
            </div>
            <div className="flex-1">
              <label className="block text-[10px] text-white/30 mb-1">Notes (optional)</label>
              <input
                type="text"
                value={newLog.notes}
                onChange={e => setNewLog({ ...newLog, notes: e.target.value })}
                placeholder="What did you do?"
                className="w-full px-2 py-2 bg-white/[0.03] border border-white/5 text-white rounded-lg text-xs focus:outline-none focus:bg-white/[0.05] focus:border-white/10 transition-all placeholder:text-white/20"
              />
            </div>
            <button
              onClick={addLog}
              disabled={!newLog.hours || parseFloat(newLog.hours) <= 0}
              className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        {/* Logs List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {logs.length === 0 ? (
            <div className="text-center py-8">
              <Clock size={32} className="mx-auto mb-2 text-white/10" />
              <p className="text-white/30 text-sm">No sessions logged yet</p>
              <p className="text-white/20 text-xs mt-1">Add your first play session above</p>
            </div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="group flex items-start gap-3 p-3 bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 rounded-xl transition-all"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Calendar size={12} className="text-white/30" />
                    <span className="text-sm text-white/70">
                      {parseLocalDate(log.date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                    <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded-full font-medium">
                      {log.hours}h
                    </span>
                  </div>
                  {log.notes && (
                    <div className="flex items-start gap-2 mt-1.5">
                      <MessageSquare size={10} className="text-white/20 mt-0.5" />
                      <span className="text-xs text-white/40">{log.notes}</span>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => removeLog(log.id)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 text-white/30 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-white/5 flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2.5 bg-white/5 text-white/70 rounded-lg hover:bg-white/10 transition-all text-sm font-medium disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-all text-sm font-medium disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Sessions'}
          </button>
        </div>
      </div>
    </div>
  );
}
