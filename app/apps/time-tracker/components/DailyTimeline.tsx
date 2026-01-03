'use client';

import { useMemo } from 'react';
import { TimeEntry, SchedulePreset } from '../lib/types';
import { useCategories } from '../hooks/useCategories';
import {
  formatDuration,
  formatTimeFromDate,
  calculateTotalDuration,
  sortTimeEntries,
} from '../lib/utils';
import { Clock, Trash2, Play } from 'lucide-react';

interface DailyTimelineProps {
  date: string;
  entries: TimeEntry[];
  activePreset: SchedulePreset | null;
  onDeleteEntry: (id: string) => void;
  onStartTimer?: (activityName: string, categoryId?: string) => void;
  isToday?: boolean;
}

export function DailyTimeline({ date, entries, activePreset, onDeleteEntry, onStartTimer, isToday = false }: DailyTimelineProps) {
  const { categories } = useCategories();

  const sortedEntries = useMemo(() => sortTimeEntries(entries), [entries]);
  const totalDuration = useMemo(() => calculateTotalDuration(entries), [entries]);

  const getCategoryName = (categoryId?: string) => {
    if (!categoryId) return null;
    const category = categories.find(c => c.id === categoryId);
    return category?.name;
  };

  const getCategoryColor = (categoryId?: string) => {
    if (!categoryId) return '#4B5563';
    const category = categories.find(c => c.id === categoryId);
    return category?.color || '#4B5563';
  };

  const handleDelete = async (id: string, activityName: string) => {
    if (confirm(`Delete "${activityName}" entry?`)) {
      onDeleteEntry(id);
    }
  };

  if (sortedEntries.length === 0 && !activePreset) {
    return (
      <div className="bg-white/[0.03] rounded-lg border border-white/5 p-8 text-center">
        <Clock className="w-12 h-12 text-white/20 mx-auto mb-3" />
        <p className="text-white/60">No time entries yet. Start a timer to track your time!</p>
        <p className="text-sm text-white/40 mt-1">
          You can also set up schedule presets to plan your day.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Planned Schedule */}
      {activePreset && (
        <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-purple-300">
              Planned Schedule: {activePreset.name}
            </h3>
            <span className="text-sm text-purple-400">
              {formatDuration(activePreset.timeBlocks.reduce((sum, block) => sum + block.duration, 0))}
            </span>
          </div>
          <div className="grid gap-2">
            {activePreset.timeBlocks.map((block) => {
              const categoryName = getCategoryName(block.categoryId);
              const categoryColor = getCategoryColor(block.categoryId);

              return (
                <div
                  key={block.id}
                  className="flex items-center gap-3 bg-white/5 rounded p-2 text-sm group hover:bg-white/10 transition-colors"
                >
                  <div
                    className="w-1 h-8 rounded"
                    style={{ backgroundColor: categoryColor }}
                  />
                  <div className="flex-1">
                    <div className="font-medium text-white">{block.activityName}</div>
                    {categoryName && (
                      <div className="text-xs text-white/50">{categoryName}</div>
                    )}
                  </div>
                  <div className="text-white/60">
                    {block.startTime} - {block.endTime}
                  </div>
                  <div className="text-white/50 min-w-[60px] text-right">
                    {formatDuration(block.duration)}
                  </div>
                  {isToday && onStartTimer && (
                    <button
                      onClick={() => onStartTimer(block.activityName, block.categoryId)}
                      className="opacity-0 group-hover:opacity-100 p-2 text-white/60 hover:text-purple-400 transition-all"
                      title="Start timer for this activity"
                    >
                      <Play className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Actual Time Entries */}
      <div className="bg-white/[0.03] rounded-lg border border-white/5 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-white">Actual Time Logged</h3>
          <span className="text-sm font-medium text-white/60">
            Total: {formatDuration(totalDuration)}
          </span>
        </div>

        {sortedEntries.length === 0 ? (
          <p className="text-white/40 text-sm text-center py-4">No entries yet</p>
        ) : (
          <div className="grid gap-2">
            {sortedEntries.map((entry) => {
              const startTime = formatTimeFromDate(new Date(entry.startTime));
              const endTime = formatTimeFromDate(new Date(entry.endTime));
              const categoryName = getCategoryName(entry.categoryId);
              const categoryColor = getCategoryColor(entry.categoryId);

              return (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 border border-white/5 rounded p-3 hover:bg-white/5 transition-colors group"
                >
                  <div
                    className="w-1 h-12 rounded"
                    style={{ backgroundColor: categoryColor }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-white">{entry.activityName}</div>
                    {categoryName && (
                      <div className="text-xs text-white/50">{categoryName}</div>
                    )}
                    {entry.notes && (
                      <div className="text-xs text-white/40 mt-1 truncate">{entry.notes}</div>
                    )}
                  </div>
                  <div className="text-sm text-white/60 shrink-0">
                    {startTime} - {endTime}
                  </div>
                  <div className="text-sm font-medium text-white/70 min-w-[60px] text-right">
                    {formatDuration(entry.duration)}
                  </div>
                  <button
                    onClick={() => handleDelete(entry.id, entry.activityName)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-white/40 hover:text-red-400 transition-all"
                    title="Delete entry"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
