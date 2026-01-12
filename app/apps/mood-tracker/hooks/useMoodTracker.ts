'use client';

import { useMemo } from 'react';
import { useDayEntries } from './useDayEntries';
import { useTags } from './useTags';
import { useCategories } from './useCategories';
import { useAppSettings } from './useAppSettings';
import { DayData, Tag } from '../lib/types';

/**
 * Combined hook for mood tracker functionality
 * Provides all data and operations needed for the app
 */
export function useMoodTracker() {
  const dayEntriesHook = useDayEntries();
  const tagsHook = useTags();
  const categoriesHook = useCategories();
  const settingsHook = useAppSettings();

  const loading =
    dayEntriesHook.loading ||
    tagsHook.loading ||
    categoriesHook.loading ||
    settingsHook.loading;

  const error =
    dayEntriesHook.error ||
    tagsHook.error ||
    categoriesHook.error ||
    settingsHook.error;

  /**
   * Get DayData for a specific day number
   */
  const getDayData = (dayNumber: number, date: string): DayData => {
    const entry = dayEntriesHook.entries.find(e => e.dayNumber === dayNumber);

    if (!entry) {
      return {
        dayNumber,
        date,
        mood: null,
        tags: [],
        diaryContent: '',
        hasEntry: false,
      };
    }

    const dayTags = tagsHook.tags.filter(tag => entry.tagIds.includes(tag.id));

    return {
      dayNumber,
      date,
      mood: entry.mood,
      tags: dayTags,
      diaryContent: entry.diaryContent,
      hasEntry: true,
    };
  };

  /**
   * Get tags for a specific category
   */
  const getTagsByCategory = (categoryId: string): Tag[] => {
    return tagsHook.tags.filter(tag => tag.categoryId === categoryId);
  };

  /**
   * Refresh all data
   */
  const refreshAll = async () => {
    await Promise.all([
      dayEntriesHook.refresh(),
      tagsHook.refresh(),
      categoriesHook.refresh(),
      settingsHook.refresh(),
    ]);
  };

  return {
    // Day entries
    entries: dayEntriesHook.entries,
    createEntry: dayEntriesHook.createEntry,
    updateEntry: dayEntriesHook.updateEntry,
    deleteEntry: dayEntriesHook.deleteEntry,
    getByDayNumber: dayEntriesHook.getByDayNumber,
    getByDateRange: dayEntriesHook.getByDateRange,

    // Tags
    tags: tagsHook.tags,
    createTag: tagsHook.createTag,
    updateTag: tagsHook.updateTag,
    deleteTag: tagsHook.deleteTag,
    getTagsByCategory,

    // Categories
    categories: categoriesHook.categories,
    createCategory: categoriesHook.createCategory,
    updateCategory: categoriesHook.updateCategory,
    deleteCategory: categoriesHook.deleteCategory,

    // Settings
    settings: settingsHook.settings,
    updateSettings: settingsHook.updateSettings,

    // State
    loading,
    error,

    // Utilities
    getDayData,
    refreshAll,
  };
}
