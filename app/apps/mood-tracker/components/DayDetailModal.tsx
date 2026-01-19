'use client';

import { useState, useEffect, useMemo } from 'react';
import { DayData, Tag, Category } from '../lib/types';
import { formatDate } from '../lib/utils';
import { MoodRatingSelector } from './MoodRatingSelector';
import { TagSelector } from './TagSelector';
import { DiaryEditor } from './DiaryEditor';
import { ChatSession } from '../hooks/useChatDiary';
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
  const [viewMode, setViewMode] = useState<'summary' | 'edit'>('summary');

  // Parse chat sessions if diary content is in chat format
  const chatSessions = useMemo<ChatSession[] | null>(() => {
    if (!dayData.diaryContent) return null;

    try {
      const parsed = JSON.parse(dayData.diaryContent);
      if (parsed.version === 'chat-v1' && Array.isArray(parsed.sessions)) {
        return parsed.sessions;
      }
    } catch (e) {
      // Not chat format, that's fine
    }
    return null;
  }, [dayData.diaryContent]);

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

          {/* Diary Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-white/70">Diary</h3>
              {chatSessions && chatSessions.length > 0 && (
                <button
                  onClick={() => setViewMode(prev => prev === 'summary' ? 'edit' : 'summary')}
                  className="text-xs px-3 py-1 bg-white/[0.02] border border-white/10 text-white/70 rounded hover:bg-white/[0.04] transition-colors"
                >
                  {viewMode === 'summary' ? '✏️ Edit Raw' : '📝 View Summaries'}
                </button>
              )}
            </div>

            {chatSessions && viewMode === 'summary' ? (
              /* Show chat summaries */
              <div className="space-y-4">
                {chatSessions.map((session, idx) => (
                  <div
                    key={session.sessionId}
                    className="bg-white/[0.02] border border-white/10 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-white/40">
                        {session.startTime} - {session.endTime}
                      </span>
                      <span className="text-xs text-white/40">Session {idx + 1}</span>
                    </div>
                    <p className="text-white/90 leading-relaxed whitespace-pre-wrap">
                      {session.summary}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              /* Show editor for manual editing */
              <DiaryEditor content={diaryContent} onChange={setDiaryContent} />
            )}
          </div>
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
