'use client';

import { useState, useEffect } from 'react';
import { DayData, Tag, Category } from '../lib/types';
import { formatDate } from '../lib/utils';
import { MoodRatingSelector } from './MoodRatingSelector';
import { TagSelector } from './TagSelector';
import { DiaryEditor } from './DiaryEditor';
import clsx from 'clsx';

interface DayDetailModalProps {
  dayData: DayData;
  tags: Tag[];
  categories: Category[];
  onSave: (mood: number | null, tagIds: string[], diaryContent: string) => Promise<void>;
  onClose: () => void;
}

export function DayDetailModal({
  dayData,
  tags,
  categories,
  onSave,
  onClose,
}: DayDetailModalProps) {
  const [mood, setMood] = useState<number | null>(dayData.mood);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(
    dayData.tags.map(t => t.id)
  );
  const [diaryContent, setDiaryContent] = useState<string>(dayData.diaryContent);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when dayData changes
  useEffect(() => {
    setMood(dayData.mood);
    setSelectedTagIds(dayData.tags.map(t => t.id));
    setDiaryContent(dayData.diaryContent);
    setError(null);
  }, [dayData]);

  const handleToggleTag = (tagId: string) => {
    setSelectedTagIds(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      await onSave(mood, selectedTagIds, diaryContent);
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-[#0a0a0f] border border-white/10 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-[#0a0a0f] border-b border-white/10 p-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">
              Day {dayData.dayNumber}
            </h2>
            <p className="text-sm text-white/60">{formatDate(dayData.date)}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white/60 transition-colors text-2xl"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <MoodRatingSelector value={mood} onChange={setMood} />

          <TagSelector
            tags={tags}
            categories={categories}
            selectedTagIds={selectedTagIds}
            onToggleTag={handleToggleTag}
          />

          <DiaryEditor content={diaryContent} onChange={setDiaryContent} />
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-[#0a0a0f] border-t border-white/10 p-4 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-white/70 hover:text-white font-medium transition-colors"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className={clsx(
              'px-6 py-2 bg-purple-600 text-white font-medium rounded-lg',
              'hover:bg-purple-700 transition-colors',
              saving && 'opacity-50 cursor-not-allowed'
            )}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
