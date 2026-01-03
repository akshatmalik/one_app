'use client';

import { useState, useMemo } from 'react';
import { useTimer } from '../hooks/useTimer';
import { useCategories } from '../hooks/useCategories';
import { useTimeEntries } from '../hooks/useTimeEntries';
import { formatDuration } from '../lib/utils';
import { Play, Square, X } from 'lucide-react';

export function TimerControls() {
  const { activeTimer, elapsedMinutes, isRunning, startTimer, stopTimer, cancelTimer } = useTimer();
  const { categories } = useCategories();
  const { entries } = useTimeEntries(); // Get all entries for suggestions

  const [activityName, setActivityName] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);

  // Get unique activity names for autocomplete suggestions
  const activitySuggestions = useMemo(() => {
    const activityMap = new Map<string, { name: string; count: number; lastUsed: string }>();

    entries.forEach(entry => {
      const existing = activityMap.get(entry.activityName);
      if (existing) {
        existing.count++;
        if (entry.startTime > existing.lastUsed) {
          existing.lastUsed = entry.startTime;
        }
      } else {
        activityMap.set(entry.activityName, {
          name: entry.activityName,
          count: 1,
          lastUsed: entry.startTime,
        });
      }
    });

    // Sort by most recent first, then by frequency
    return Array.from(activityMap.values())
      .sort((a, b) => {
        const dateCompare = new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime();
        return dateCompare !== 0 ? dateCompare : b.count - a.count;
      })
      .map(item => item.name)
      .slice(0, 10); // Limit to 10 suggestions
  }, [entries]);

  const handleStart = () => {
    if (!activityName.trim()) return;
    startTimer(activityName.trim(), selectedCategoryId || undefined);
    setActivityName('');
    setSelectedCategoryId('');
  };

  const handleStop = async () => {
    await stopTimer(notes.trim() || undefined);
    setNotes('');
    setShowNotes(false);
  };

  const handleCancel = () => {
    if (confirm('Cancel this timer? Time will not be saved.')) {
      cancelTimer();
      setNotes('');
      setShowNotes(false);
    }
  };

  const getCategoryName = (categoryId?: string) => {
    if (!categoryId) return 'No category';
    const category = categories.find(c => c.id === categoryId);
    return category?.name || 'Unknown';
  };

  const getCategoryColor = (categoryId?: string) => {
    if (!categoryId) return '#6B7280';
    const category = categories.find(c => c.id === categoryId);
    return category?.color || '#6B7280';
  };

  if (isRunning && activeTimer) {
    return (
      <div className="bg-white/[0.03] rounded-lg border border-white/5 p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: getCategoryColor(activeTimer.categoryId) }}
              />
              <span className="text-sm text-white/60">{getCategoryName(activeTimer.categoryId)}</span>
            </div>
            <h3 className="text-xl font-semibold text-white">{activeTimer.activityName}</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCancel}
              className="p-2 text-white/40 hover:text-red-400 transition-colors"
              title="Cancel timer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
            <span className="text-sm font-medium text-red-400">Recording</span>
          </div>
          <div className="text-3xl font-bold text-red-400">
            {formatDuration(elapsedMinutes)}
          </div>
        </div>

        {showNotes && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-white/70 mb-1">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about this time entry..."
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none text-white placeholder-white/30"
              rows={3}
            />
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={handleStop}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
          >
            <Square className="w-5 h-5" />
            Stop & Save
          </button>
          {!showNotes && (
            <button
              onClick={() => setShowNotes(true)}
              className="px-4 py-3 bg-white/5 text-white/70 rounded-lg hover:bg-white/10 transition-colors"
            >
              Add Notes
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/[0.03] rounded-lg border border-white/5 p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Start Timer</h3>

      <div className="space-y-4">
        <div>
          <label htmlFor="activity" className="block text-sm font-medium text-white/70 mb-1">
            Activity Name *
          </label>
          <input
            id="activity"
            type="text"
            list="activity-suggestions"
            value={activityName}
            onChange={(e) => setActivityName(e.target.value)}
            placeholder="e.g., Deep Work, Meeting, Exercise"
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-white/30"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && activityName.trim()) {
                handleStart();
              }
            }}
            autoComplete="off"
          />
          <datalist id="activity-suggestions">
            {activitySuggestions.map((suggestion, index) => (
              <option key={index} value={suggestion} />
            ))}
          </datalist>
        </div>

        <div>
          <label htmlFor="category" className="block text-sm font-medium text-white/70 mb-1">
            Category (optional)
          </label>
          <select
            id="category"
            value={selectedCategoryId}
            onChange={(e) => setSelectedCategoryId(e.target.value)}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white"
          >
            <option value="">No category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleStart}
          disabled={!activityName.trim()}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:bg-white/10 disabled:cursor-not-allowed font-medium"
        >
          <Play className="w-5 h-5" />
          Start Timer
        </button>
      </div>
    </div>
  );
}
