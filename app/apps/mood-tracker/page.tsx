'use client';

import { useState, useMemo } from 'react';
import { useMoodTracker } from './hooks/useMoodTracker';
import { ViewMode, DayData } from './lib/types';
import { getCurrentYear, getTodayDate } from './lib/utils';
import { YearGrid } from './components/YearGrid';
import { DayDetailModal } from './components/DayDetailModal';
import { ViewModeToggle } from './components/ViewModeToggle';
import { CategoryFilter } from './components/CategoryFilter';
import { TagManager } from './components/TagManager';
import { ErrorDisplay } from './components/ErrorDisplay';
import { VoiceJournalModal } from './components/VoiceJournalModal';
import { createDummyData } from './data/dummy-data';

export default function MoodTrackerPage() {
  const {
    entries,
    tags,
    categories,
    settings,
    loading,
    error,
    createEntry,
    updateEntry,
    createTag,
    deleteTag,
    createCategory,
    deleteCategory,
    updateSettings,
    getDayData,
    refreshAll,
  } = useMoodTracker();

  const [viewMode, setViewMode] = useState<ViewMode>('mood');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState(getCurrentYear());
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);
  const [showTagManager, setShowTagManager] = useState(false);
  const [showVoiceJournal, setShowVoiceJournal] = useState(false);
  const [generatingDummyData, setGeneratingDummyData] = useState(false);

  // Create a map for quick day data lookup
  const dayDataMap = useMemo(() => {
    const map = new Map<number, DayData>();
    entries.forEach((entry) => {
      const dayTags = tags.filter((tag) => entry.tagIds.includes(tag.id));
      map.set(entry.dayNumber, {
        dayNumber: entry.dayNumber,
        date: entry.date,
        mood: entry.mood,
        tags: dayTags,
        diaryContent: entry.diaryContent,
        hasEntry: true,
      });
    });
    return map;
  }, [entries, tags]);

  const handleDayClick = (dayData: DayData) => {
    setSelectedDay(dayData);
  };

  const handleSaveDay = async (
    mood: number | null,
    tagIds: string[],
    diaryContent: string
  ) => {
    if (!selectedDay) return;

    const existingEntry = entries.find(
      (e) => e.dayNumber === selectedDay.dayNumber
    );

    if (existingEntry) {
      // Update existing entry
      await updateEntry(existingEntry.id, {
        mood,
        tagIds,
        diaryContent,
      });
    } else {
      // Create new entry
      await createEntry({
        dayNumber: selectedDay.dayNumber,
        date: selectedDay.date,
        mood,
        tagIds,
        diaryContent,
      });
    }
  };

  const handleGenerateDummyData = async () => {
    if (!settings?.startDate) {
      alert('Please set a start date first (this should come from todo app settings).');
      return;
    }

    if (
      !confirm(
        'This will create dummy categories, tags, and 60 days of sample mood data. Continue?'
      )
    ) {
      return;
    }

    try {
      setGeneratingDummyData(true);
      await createDummyData(
        settings.startDate,
        createCategory,
        createTag,
        createEntry
      );
      await refreshAll();
      alert('Dummy data created successfully!');
    } catch (e) {
      alert(`Error creating dummy data: ${(e as Error).message}`);
    } finally {
      setGeneratingDummyData(false);
    }
  };

  const handleSetStartDate = async () => {
    const dateStr = prompt('Enter start date (YYYY-MM-DD):', getTodayDate());
    if (!dateStr) return;

    try {
      await updateSettings({ startDate: dateStr });
      alert('Start date updated!');
    } catch (e) {
      alert(`Error updating start date: ${(e as Error).message}`);
    }
  };

  // Wrapper functions for TagManager
  const handleCreateTag = async (name: string, emoji: string, categoryId: string): Promise<void> => {
    await createTag({ name, emoji, categoryId });
  };

  const handleCreateCategory = async (name: string, color: string): Promise<void> => {
    await createCategory({ name, color });
  };

  const handleVoiceJournalSave = async (
    mood: number | null,
    tagIds: string[],
    diaryContent: string
  ) => {
    // Use the current day for voice journal
    const today = getTodayDate();
    const todayEntry = entries.find(e => e.date === today);

    if (todayEntry) {
      await updateEntry(todayEntry.id, {
        mood,
        tagIds,
        diaryContent,
      });
    } else {
      // Calculate day number for today
      if (!settings?.startDate) return;
      const start = new Date(settings.startDate);
      const current = new Date(today);
      const diffTime = current.getTime() - start.getTime();
      const dayNumber = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;

      await createEntry({
        dayNumber,
        date: today,
        mood,
        tagIds,
        diaryContent,
      });
    }

    await refreshAll();
  };

  const handleVoiceJournalEdit = (dayData: DayData) => {
    setSelectedDay(dayData);
    setShowVoiceJournal(false);
  };

  if (loading && !settings) {
    return (
      <div className="min-h-[calc(100vh-60px)] flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-white/60">Loading mood tracker...</p>
        </div>
      </div>
    );
  }

  if (!settings?.startDate) {
    return (
      <div className="min-h-[calc(100vh-60px)] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white/[0.02] border border-white/5 rounded-lg p-6 text-center">
          <div className="text-4xl mb-4">📅</div>
          <h2 className="text-2xl font-bold text-white mb-2">
            Welcome to Mood Tracker!
          </h2>
          <p className="text-white/60 mb-6">
            No start date found. This app uses the same Day 1 concept as the Todo app.
            Please set up your todo app first, or manually set a start date.
          </p>
          <button
            onClick={handleSetStartDate}
            className="w-full px-6 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors"
          >
            Set Start Date
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-60px)] p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white/[0.02] border border-white/5 rounded-lg p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-white">Mood Tracker</h1>
              <p className="text-white/60 mt-1">
                Track your daily moods, tags, and journal entries
              </p>
              <p className="text-sm text-white/40 mt-1">
                Start Date: {settings.startDate} (Day 1)
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  console.log('[MoodTrackerPage] Voice Journal button clicked');
                  setShowVoiceJournal(true);
                }}
                className="px-4 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
              >
                <span>🎤</span>
                <span>Voice Journal</span>
              </button>
              <button
                onClick={() => setShowTagManager(true)}
                className="px-4 py-2 bg-white/[0.02] border border-white/10 text-white font-medium rounded-lg hover:bg-white/[0.04] transition-colors"
              >
                Manage Tags
              </button>
            </div>
          </div>

          <ErrorDisplay error={error} />

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-4">
            <ViewModeToggle mode={viewMode} onChange={setViewMode} />

            {viewMode === 'tags' && (
              <CategoryFilter
                categories={categories}
                selectedCategoryId={selectedCategoryId}
                onSelectCategory={setSelectedCategoryId}
              />
            )}

            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => setSelectedYear((y) => y - 1)}
                className="px-3 py-2 bg-white/[0.02] border border-white/10 rounded-lg hover:bg-white/[0.04] transition-colors text-white/70"
              >
                ←
              </button>
              <span className="px-4 py-2 font-medium text-white">
                {selectedYear}
              </span>
              <button
                onClick={() => setSelectedYear((y) => y + 1)}
                className="px-3 py-2 bg-white/[0.02] border border-white/10 rounded-lg hover:bg-white/[0.04] transition-colors text-white/70"
              >
                →
              </button>
            </div>
          </div>

          {/* Dev Tools */}
          {(entries.length === 0 || categories.length === 0) && (
            <div className="mt-4 p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
              <p className="text-sm text-purple-300 mb-2">
                <strong>Dev Mode:</strong> No data found. Want to generate dummy
                data for testing?
              </p>
              <button
                onClick={handleGenerateDummyData}
                disabled={generatingDummyData}
                className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                {generatingDummyData
                  ? 'Generating...'
                  : 'Generate Dummy Data (60 days)'}
              </button>
            </div>
          )}
        </div>

        {/* Year Grid */}
        <div className="bg-white/[0.02] border border-white/5 rounded-lg p-6">
          <YearGrid
            year={selectedYear}
            startDate={settings.startDate}
            dayDataMap={dayDataMap}
            viewMode={viewMode}
            selectedCategoryId={selectedCategoryId}
            tags={tags}
            categories={categories}
            onDayClick={handleDayClick}
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/[0.02] border border-white/5 rounded-lg p-6">
            <div className="text-sm font-medium text-white/40">Total Entries</div>
            <div className="text-3xl font-bold text-white mt-1">
              {entries.length}
            </div>
          </div>
          <div className="bg-white/[0.02] border border-white/5 rounded-lg p-6">
            <div className="text-sm font-medium text-white/40">Tags</div>
            <div className="text-3xl font-bold text-white mt-1">
              {tags.length}
            </div>
          </div>
          <div className="bg-white/[0.02] border border-white/5 rounded-lg p-6">
            <div className="text-sm font-medium text-white/40">Categories</div>
            <div className="text-3xl font-bold text-white mt-1">
              {categories.length}
            </div>
          </div>
        </div>
      </div>

      {/* Day Detail Modal */}
      {selectedDay && (
        <DayDetailModal
          dayData={selectedDay}
          tags={tags}
          categories={categories}
          onSave={handleSaveDay}
          onClose={() => setSelectedDay(null)}
        />
      )}

      {/* Tag Manager Modal */}
      {showTagManager && (
        <TagManager
          tags={tags}
          categories={categories}
          onCreateTag={handleCreateTag}
          onDeleteTag={deleteTag}
          onCreateCategory={handleCreateCategory}
          onDeleteCategory={deleteCategory}
          onClose={() => setShowTagManager(false)}
        />
      )}

      {/* Voice Journal Modal */}
      {showVoiceJournal && settings?.startDate && (
        <VoiceJournalModal
          currentDate={getTodayDate()}
          startDate={settings.startDate}
          currentDayNumber={(() => {
            const start = new Date(settings.startDate);
            const current = new Date(getTodayDate());
            const diffTime = current.getTime() - start.getTime();
            return Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
          })()}
          tags={tags}
          categories={categories}
          onSave={handleVoiceJournalSave}
          onEdit={handleVoiceJournalEdit}
          onClose={() => setShowVoiceJournal(false)}
          existingEntry={(() => {
            const todayEntry = entries.find(e => e.date === getTodayDate());
            if (!todayEntry) return null;
            const dayTags = tags.filter(tag => todayEntry.tagIds.includes(tag.id));
            return {
              dayNumber: todayEntry.dayNumber,
              date: todayEntry.date,
              mood: todayEntry.mood,
              tags: dayTags,
              diaryContent: todayEntry.diaryContent,
              hasEntry: true,
            };
          })()}
        />
      )}
    </div>
  );
}
