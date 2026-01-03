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
import { Clock, Trash2 } from 'lucide-react';

interface DailyTimelineProps {
  date: string;
  entries: TimeEntry[];
  activePreset: SchedulePreset | null;
  onDeleteEntry: (id: string) => void;
}

export function DailyTimeline({ date, entries, activePreset, onDeleteEntry }: DailyTimelineProps) {
  const { categories } = useCategories();

  const sortedEntries = useMemo(() => sortTimeEntries(entries), [entries]);
  const totalDuration = useMemo(() => calculateTotalDuration(entries), [entries]);

  const getCategoryName = (categoryId?: string) => {
    if (!categoryId) return null;
    const category = categories.find(c => c.id === categoryId);
    return category?.name;
  };

  const getCategoryColor = (categoryId?: string) => {
    if (!categoryId) return '#E5E7EB';
    const category = categories.find(c => c.id === categoryId);
    return category?.color || '#E5E7EB';
  };

  const handleDelete = async (id: string, activityName: string) => {
    if (confirm(`Delete "${activityName}" entry?`)) {
      onDeleteEntry(id);
    }
  };

  if (sortedEntries.length === 0 && !activePreset) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">No time entries yet. Start a timer to track your time!</p>
        <p className="text-sm text-gray-400 mt-1">
          You can also set up schedule presets to plan your day.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Planned Schedule */}
      {activePreset && (
        <div className="bg-purple-50 rounded-lg border border-purple-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-purple-900">
              Planned Schedule: {activePreset.name}
            </h3>
            <span className="text-sm text-purple-600">
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
                  className="flex items-center gap-3 bg-white rounded p-2 text-sm"
                >
                  <div
                    className="w-1 h-8 rounded"
                    style={{ backgroundColor: categoryColor }}
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{block.activityName}</div>
                    {categoryName && (
                      <div className="text-xs text-gray-500">{categoryName}</div>
                    )}
                  </div>
                  <div className="text-gray-600">
                    {block.startTime} - {block.endTime}
                  </div>
                  <div className="text-gray-500 min-w-[60px] text-right">
                    {formatDuration(block.duration)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Actual Time Entries */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900">Actual Time Logged</h3>
          <span className="text-sm font-medium text-gray-600">
            Total: {formatDuration(totalDuration)}
          </span>
        </div>

        {sortedEntries.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-4">No entries yet</p>
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
                  className="flex items-center gap-3 border border-gray-200 rounded p-3 hover:bg-gray-50 transition-colors group"
                >
                  <div
                    className="w-1 h-12 rounded"
                    style={{ backgroundColor: categoryColor }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900">{entry.activityName}</div>
                    {categoryName && (
                      <div className="text-xs text-gray-500">{categoryName}</div>
                    )}
                    {entry.notes && (
                      <div className="text-xs text-gray-400 mt-1 truncate">{entry.notes}</div>
                    )}
                  </div>
                  <div className="text-sm text-gray-600 shrink-0">
                    {startTime} - {endTime}
                  </div>
                  <div className="text-sm font-medium text-gray-700 min-w-[60px] text-right">
                    {formatDuration(entry.duration)}
                  </div>
                  <button
                    onClick={() => handleDelete(entry.id, entry.activityName)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-600 transition-all"
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
