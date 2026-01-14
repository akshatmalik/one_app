// Constants for Mood Tracker app

// Storage keys
export const STORAGE_KEYS = {
  DAY_ENTRIES: 'mood-tracker-day-entries',
  TAGS: 'mood-tracker-tags',
  CATEGORIES: 'mood-tracker-categories',
  SETTINGS: 'mood-tracker-settings',
} as const;

// Firestore collection names
export const COLLECTIONS = {
  DAY_ENTRIES: 'moodTrackerDayEntries',
  TAGS: 'moodTrackerTags',
  CATEGORIES: 'moodTrackerCategories',
  SETTINGS: 'moodTrackerSettings',
} as const;

// Mood scale (1-5)
export const MOOD_SCALE = {
  MIN: 1,
  MAX: 5,
} as const;

// Mood colors (1-5 scale)
export const MOOD_COLORS: Record<number, string> = {
  1: '#EF4444', // red-500 - Terrible
  2: '#F97316', // orange-500 - Bad
  3: '#EAB308', // yellow-500 - Okay
  4: '#84CC16', // lime-500 - Good
  5: '#22C55E', // green-500 - Amazing
} as const;

// Mood labels
export const MOOD_LABELS: Record<number, string> = {
  1: 'Terrible',
  2: 'Bad',
  3: 'Okay',
  4: 'Good',
  5: 'Amazing',
} as const;

// Block size for year grid
export const BLOCK_SIZE = 20; // pixels

// Days in a week
export const DAYS_IN_WEEK = 7;

// Approximate weeks in a year
export const WEEKS_IN_YEAR = 53;
