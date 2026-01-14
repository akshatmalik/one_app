import { Category, Tag, DayEntry } from '../lib/types';
import { calculateDateFromDayNumber } from '../lib/utils';

// Dummy categories
export const DUMMY_CATEGORIES: Omit<Category, 'id' | 'userId' | 'createdAt' | 'updatedAt'>[] = [
  { name: 'Health', color: '#22C55E' },
  { name: 'Fun', color: '#8B5CF6' },
  { name: 'Work', color: '#3B82F6' },
];

// Dummy tags (will need category IDs after categories are created)
export const DUMMY_TAGS: Omit<Tag, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'categoryId'>[] = [
  { name: 'Running', emoji: '🏃' },
  { name: 'Gym', emoji: '💪' },
  { name: 'Gaming', emoji: '🎮' },
  { name: 'Friends', emoji: '🎉' },
  { name: 'Meeting', emoji: '💼' },
  { name: 'Reading', emoji: '📚' },
];

/**
 * Generate dummy day entries for testing
 * Creates 60 days of random mood data with tags
 */
export function generateDummyDayEntries(
  startDate: string,
  tagIds: string[]
): Omit<DayEntry, 'id' | 'userId' | 'createdAt' | 'updatedAt'>[] {
  const entries: Omit<DayEntry, 'id' | 'userId' | 'createdAt' | 'updatedAt'>[] = [];

  // Generate 60 days of data
  for (let dayNumber = 1; dayNumber <= 60; dayNumber++) {
    const date = calculateDateFromDayNumber(dayNumber, startDate);

    // Random mood (1-5) or null (20% chance of no mood)
    const mood = Math.random() > 0.2 ? Math.floor(Math.random() * 5) + 1 : null;

    // Random number of tags (0-3)
    const numTags = Math.floor(Math.random() * 4);
    const selectedTagIds: string[] = [];

    if (numTags > 0 && tagIds.length > 0) {
      const shuffled = [...tagIds].sort(() => Math.random() - 0.5);
      selectedTagIds.push(...shuffled.slice(0, Math.min(numTags, tagIds.length)));
    }

    // Simple diary content (some days have it, some don't)
    const hasDiary = Math.random() > 0.6;
    const diaryContent = hasDiary
      ? `<p>Day ${dayNumber} - ${getDiaryText(mood)}</p>`
      : '';

    entries.push({
      dayNumber,
      date,
      mood,
      tagIds: selectedTagIds,
      diaryContent,
    });
  }

  return entries;
}

function getDiaryText(mood: number | null): string {
  if (!mood) return 'Had a day.';

  const texts = {
    1: 'Really tough day. Hope tomorrow is better.',
    2: 'Not the best day, but got through it.',
    3: 'An okay day, nothing special.',
    4: 'Good day! Feeling positive.',
    5: 'Amazing day! Everything went great!',
  };

  return texts[mood as keyof typeof texts] || 'Had a day.';
}

/**
 * Create all dummy data in the correct order
 */
export async function createDummyData(
  startDate: string,
  createCategory: (categoryData: Omit<Category, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<Category>,
  createTag: (tagData: Omit<Tag, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<Tag>,
  createEntry: (entry: Omit<DayEntry, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<DayEntry>
): Promise<void> {
  // Create categories
  const categories = await Promise.all(
    DUMMY_CATEGORIES.map(cat => createCategory(cat))
  );

  // Create tags (2 per category)
  const tagIds: string[] = [];
  for (let i = 0; i < categories.length; i++) {
    const categoryTags = DUMMY_TAGS.slice(i * 2, (i + 1) * 2);
    for (const tagData of categoryTags) {
      const tag = await createTag({
        ...tagData,
        categoryId: categories[i].id,
      });
      tagIds.push(tag.id);
    }
  }

  // Create day entries
  const entries = generateDummyDayEntries(startDate, tagIds);
  await Promise.all(entries.map(entry => createEntry(entry)));
}
