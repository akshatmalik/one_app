// Core data types for Mood Tracker

export interface DayEntry {
  id: string;
  userId: string;
  dayNumber: number;        // 1, 2, 3... (relative from start date)
  date: string;             // ISO date (YYYY-MM-DD)
  mood: number | null;      // 1-5 scale (null = not rated)
  tagIds: string[];         // References to tags
  diaryContent: string;     // Tiptap HTML/JSON
  createdAt: string;
  updatedAt: string;
}

export interface Tag {
  id: string;
  userId: string;
  name: string;             // "Running", "Gaming"
  emoji: string;            // "🏃", "🎮"
  categoryId: string;       // Reference to category
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  userId: string;
  name: string;             // "Health", "Fun", "Work"
  color: string;            // Hex color for visual distinction
  createdAt: string;
  updatedAt: string;
}

export interface MoodTrackerSettings {
  id: string;
  userId: string;
  startDate: string;        // ISO date - Day 1
  createdAt: string;
  updatedAt: string;
}

// Repository interfaces
export interface DayEntryRepository {
  getAll(): Promise<DayEntry[]>;
  getById(id: string): Promise<DayEntry | null>;
  getByDayNumber(dayNumber: number): Promise<DayEntry | null>;
  getByDateRange(startDate: string, endDate: string): Promise<DayEntry[]>;
  create(entry: Omit<DayEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<DayEntry>;
  update(id: string, updates: Partial<DayEntry>): Promise<DayEntry>;
  delete(id: string): Promise<void>;
  setUserId(userId: string): void;
}

export interface TagRepository {
  getAll(): Promise<Tag[]>;
  getById(id: string): Promise<Tag | null>;
  getByCategoryId(categoryId: string): Promise<Tag[]>;
  create(tag: Omit<Tag, 'id' | 'createdAt' | 'updatedAt'>): Promise<Tag>;
  update(id: string, updates: Partial<Tag>): Promise<Tag>;
  delete(id: string): Promise<void>;
  setUserId(userId: string): void;
}

export interface CategoryRepository {
  getAll(): Promise<Category[]>;
  getById(id: string): Promise<Category | null>;
  create(category: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>): Promise<Category>;
  update(id: string, updates: Partial<Category>): Promise<Category>;
  delete(id: string): Promise<void>;
  setUserId(userId: string): void;
}

export interface SettingsRepository {
  get(): Promise<MoodTrackerSettings | null>;
  set(settings: Omit<MoodTrackerSettings, 'id' | 'createdAt' | 'updatedAt'>): Promise<MoodTrackerSettings>;
  setUserId(userId: string): void;
}

// UI types
export type ViewMode = 'mood' | 'tags';

export interface DayData {
  dayNumber: number;
  date: string;
  mood: number | null;
  tags: Tag[];
  diaryContent: string;
  hasEntry: boolean;
}

// Voice Journal types
export interface InterpretedData {
  targetDate: string;           // ISO date string
  dayNumber: number;            // Calculated day number
  mood: number | null;          // 1-5 or null if not mentioned
  existingTagIds: string[];     // Matched to existing tags
  suggestedNewTags: Array<{     // New tags to create
    name: string;
    emoji: string;
    categoryId: string;
  }>;
  diaryContent: string;         // Full transcript
  timestamp: string;            // Time of recording (HH:MM AM/PM)
  confidence: 'high' | 'medium' | 'low';
  ambiguities: string[];        // Things AI wasn't sure about
}

export interface VoiceJournalEntry {
  timestamp: string;            // "2:30 PM"
  content: string;              // Transcript
  addedVia: 'voice';           // Marker for voice entries
}
