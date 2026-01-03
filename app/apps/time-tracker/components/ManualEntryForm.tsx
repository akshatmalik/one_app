'use client';

import { useState } from 'react';
import { useTimeEntries } from '../hooks/useTimeEntries';
import { useCategories } from '../hooks/useCategories';
import { calculateDuration, generateTimeOptions, getTodayDate } from '../lib/utils';
import { Plus, X } from 'lucide-react';

interface ManualEntryFormProps {
  date: string;
}

export function ManualEntryForm({ date }: ManualEntryFormProps) {
  const { addEntry, entries } = useTimeEntries(date);
  const { categories } = useCategories();
  const [isOpen, setIsOpen] = useState(false);

  const [formData, setFormData] = useState({
    activityName: '',
    categoryId: '',
    startTime: '09:00',
    endTime: '10:00',
    notes: '',
  });

  const timeOptions = generateTimeOptions();

  // Get activity suggestions from existing entries
  const activitySuggestions = Array.from(
    new Set(entries.map(e => e.activityName))
  ).slice(0, 10);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.activityName.trim()) {
      alert('Please enter an activity name');
      return;
    }

    const duration = calculateDuration(formData.startTime, formData.endTime);
    if (duration <= 0) {
      alert('End time must be after start time');
      return;
    }

    try {
      // Create ISO datetime strings for the selected date and times
      const startDateTime = new Date(`${date}T${formData.startTime}:00`).toISOString();
      const endDateTime = new Date(`${date}T${formData.endTime}:00`).toISOString();

      await addEntry({
        date,
        activityName: formData.activityName.trim(),
        categoryId: formData.categoryId || undefined,
        startTime: startDateTime,
        endTime: endDateTime,
        duration,
        notes: formData.notes.trim() || undefined,
      });

      // Reset form
      setFormData({
        activityName: '',
        categoryId: '',
        startTime: formData.endTime, // Next entry starts when this one ended
        endTime: formData.endTime,
        notes: '',
      });
      setIsOpen(false);
    } catch (error) {
      alert('Error adding entry: ' + (error as Error).message);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white/5 text-white/70 rounded-lg hover:bg-white/10 transition-colors border border-white/10"
      >
        <Plus className="w-5 h-5" />
        Add Manual Entry
      </button>
    );
  }

  return (
    <div className="bg-white/[0.03] rounded-lg border border-white/5 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Add Time Entry</h3>
        <button
          onClick={() => setIsOpen(false)}
          className="p-2 text-white/40 hover:text-white/70 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="manual-activity" className="block text-sm font-medium text-white/70 mb-1">
            Activity Name *
          </label>
          <input
            id="manual-activity"
            type="text"
            list="manual-activity-suggestions"
            value={formData.activityName}
            onChange={(e) => setFormData({ ...formData, activityName: e.target.value })}
            placeholder="What did you work on?"
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-white/30"
            autoFocus
          />
          <datalist id="manual-activity-suggestions">
            {activitySuggestions.map((suggestion, index) => (
              <option key={index} value={suggestion} />
            ))}
          </datalist>
        </div>

        <div>
          <label htmlFor="manual-category" className="block text-sm font-medium text-white/70 mb-1">
            Category (optional)
          </label>
          <select
            id="manual-category"
            value={formData.categoryId}
            onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
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

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="manual-start" className="block text-sm font-medium text-white/70 mb-1">
              Start Time *
            </label>
            <select
              id="manual-start"
              value={formData.startTime}
              onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white"
            >
              {timeOptions.map((time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="manual-end" className="block text-sm font-medium text-white/70 mb-1">
              End Time *
            </label>
            <select
              id="manual-end"
              value={formData.endTime}
              onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white"
            >
              {timeOptions.map((time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="manual-notes" className="block text-sm font-medium text-white/70 mb-1">
            Notes (optional)
          </label>
          <textarea
            id="manual-notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Add any notes about this activity..."
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none text-white placeholder-white/30"
            rows={2}
          />
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
          >
            Add Entry
          </button>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="px-4 py-2 bg-white/5 text-white/70 rounded-lg hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
