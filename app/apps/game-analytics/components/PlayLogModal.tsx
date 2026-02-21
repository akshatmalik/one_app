'use client';

import { useState } from 'react';
import { X, Plus, Trash2, Clock, Calendar, MessageSquare } from 'lucide-react';
import { Game, PlayLog, SessionMood, SessionVibe } from '../lib/types';
import { parseLocalDate } from '../lib/calculations';
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

const NOTE_PROMPTS = [
  'What happened in the story?',
  'Any frustrating moments?',
  'Close to completing anything?',
  'What surprised you?',
  'How was the session overall?',
  'Any cool discoveries?',
  'Making good progress?',
];

export function PlayLogModal({ game, onSave, onClose }: PlayLogModalProps) {
  const [logs, setLogs] = useState<PlayLog[]>(game.playLogs || []);
  const [loading, setLoading] = useState(false);
  const [notesExpanded, setNotesExpanded] = useState(false);
  const [notesPromptIndex] = useState(() => Math.floor(Math.random() * NOTE_PROMPTS.length));
  const [newLog, setNewLog] = useState<{
    date: string;
    hours: string;
    notes: string;
    mood?: SessionMood;
    vibe?: SessionVibe;
  }>({
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
      mood: newLog.mood,
      vibe: newLog.vibe,
    };
    setLogs([log, ...logs].sort((a, b) => parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime()));
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

  // parseLocalDate imported from calculations

  return (
    <>
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
              <button
                type="button"
                onClick={() => setNotesExpanded(true)}
                className="w-full px-2 py-2 bg-white/[0.03] border border-white/5 text-left rounded-lg text-xs transition-all hover:bg-white/[0.05] hover:border-white/10"
              >
                {newLog.notes
                  ? <span className="text-white/70 line-clamp-1">{newLog.notes}</span>
                  : <span className="text-white/20">Add thoughts...</span>
                }
              </button>
            </div>
            <button
              onClick={addLog}
              disabled={!newLog.hours || parseFloat(newLog.hours) <= 0}
              className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus size={16} />
            </button>
          </div>

          {/* Mood & Vibe Tags */}
          <div className="mt-3 space-y-2">
            <div>
              <label className="block text-[10px] text-white/30 mb-1.5">Mood (optional)</label>
              <div className="flex gap-1.5">
                {([
                  { value: 'great', label: '🔥 Great', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
                  { value: 'good', label: '👍 Good', color: 'bg-blue-500/15 text-blue-400 border-blue-500/20' },
                  { value: 'meh', label: '😐 Meh', color: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20' },
                  { value: 'grind', label: '💪 Grind', color: 'bg-orange-500/15 text-orange-400 border-orange-500/20' },
                ] as const).map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setNewLog({ ...newLog, mood: newLog.mood === opt.value ? undefined : opt.value })}
                    className={clsx(
                      'px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all',
                      newLog.mood === opt.value
                        ? opt.color
                        : 'bg-white/[0.02] text-white/30 border-white/5 hover:border-white/10',
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-[10px] text-white/30 mb-1.5">Vibe (optional)</label>
              <div className="flex gap-1.5 flex-wrap">
                {([
                  { value: 'wind-down', label: '🌙 Wind-down' },
                  { value: 'competitive', label: '⚔️ Competitive' },
                  { value: 'exploration', label: '🗺️ Exploration' },
                  { value: 'story', label: '📖 Story' },
                  { value: 'achievement-hunting', label: '🏆 Achievements' },
                  { value: 'social', label: '👥 Social' },
                ] as const).map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setNewLog({ ...newLog, vibe: newLog.vibe === opt.value ? undefined : opt.value })}
                    className={clsx(
                      'px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all',
                      newLog.vibe === opt.value
                        ? 'bg-purple-500/15 text-purple-400 border-purple-500/20'
                        : 'bg-white/[0.02] text-white/30 border-white/5 hover:border-white/10',
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
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
                  {(log.mood || log.vibe) && (
                    <div className="flex items-center gap-1.5 mt-1">
                      {log.mood && (
                        <span className={clsx(
                          'text-[9px] px-1.5 py-0.5 rounded-full',
                          log.mood === 'great' && 'bg-emerald-500/10 text-emerald-400',
                          log.mood === 'good' && 'bg-blue-500/10 text-blue-400',
                          log.mood === 'meh' && 'bg-yellow-500/10 text-yellow-400',
                          log.mood === 'grind' && 'bg-orange-500/10 text-orange-400',
                        )}>
                          {log.mood === 'great' && '🔥'} {log.mood === 'good' && '👍'} {log.mood === 'meh' && '😐'} {log.mood === 'grind' && '💪'} {log.mood}
                        </span>
                      )}
                      {log.vibe && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400">
                          {log.vibe}
                        </span>
                      )}
                    </div>
                  )}
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

    {/* Notes bottom sheet */}
    {notesExpanded && (
      <div className="fixed inset-0 z-[60] flex flex-col justify-end">
        <div
          className="absolute inset-0 bg-black/50"
          onClick={() => setNotesExpanded(false)}
        />
        <div className="relative bg-[#12121a] border-t border-white/10 rounded-t-2xl p-4 pb-8 animate-bottom-sheet-up">
          <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-white/70">Session Notes</span>
            <button
              onClick={() => setNotesExpanded(false)}
              className="text-white/30 hover:text-white/60 hover:bg-white/5 rounded-lg p-1.5 transition-all"
            >
              <X size={16} />
            </button>
          </div>
          <textarea
            autoFocus
            value={newLog.notes}
            onChange={e => setNewLog({ ...newLog, notes: e.target.value })}
            placeholder={NOTE_PROMPTS[notesPromptIndex]}
            rows={6}
            className="w-full px-3 py-3 bg-white/[0.03] border border-white/5 text-white rounded-xl text-sm focus:outline-none focus:bg-white/[0.05] focus:border-purple-500/20 transition-all placeholder:text-white/20 resize-none leading-relaxed"
          />
          <div className="flex gap-3 mt-3">
            {newLog.notes && (
              <button
                onClick={() => setNewLog({ ...newLog, notes: '' })}
                className="px-4 py-2.5 bg-white/5 text-white/40 rounded-lg text-sm hover:bg-white/10 hover:text-white/60 transition-all"
              >
                Clear
              </button>
            )}
            <button
              onClick={() => setNotesExpanded(false)}
              className="flex-1 px-4 py-2.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-500 transition-all"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
