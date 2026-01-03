/**
 * Time Tracker Types
 *
 * Data model for daily schedule tracking and time logging
 */

// Day of week enum
export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

export const DAYS_OF_WEEK: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// Category for grouping activities
export interface Category {
  id: string;
  userId: string;
  name: string;
  color: string; // Hex color
  createdAt: string;
  updatedAt: string;
}

// Time block within a schedule preset (planned activity)
export interface TimeBlock {
  id: string;
  activityName: string;
  categoryId?: string;
  startTime: string; // Format: "HH:mm" (24-hour)
  endTime: string; // Format: "HH:mm" (24-hour)
  duration: number; // Minutes
}

// Schedule preset (template for specific days)
export interface SchedulePreset {
  id: string;
  userId: string;
  name: string; // e.g., "Workday", "Weekend", "Deep Work Day"
  daysOfWeek: DayOfWeek[]; // Which days this preset applies to
  timeBlocks: TimeBlock[];
  isActive: boolean; // Can be toggled on/off
  createdAt: string;
  updatedAt: string;
}

// Actual time entry (tracked time)
export interface TimeEntry {
  id: string;
  userId: string;
  date: string; // ISO date string (YYYY-MM-DD)
  activityName: string;
  categoryId?: string;
  startTime: string; // ISO datetime string
  endTime: string; // ISO datetime string
  duration: number; // Minutes
  scheduledBlockId?: string; // Link to planned block (if applicable)
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Active timer state (for currently running timer)
export interface ActiveTimer {
  activityName: string;
  categoryId?: string;
  startTime: string; // ISO datetime string
}

// Repository interfaces
export interface CategoryRepository {
  getAll(): Promise<Category[]>;
  getById(id: string): Promise<Category | null>;
  create(category: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>): Promise<Category>;
  update(id: string, updates: Partial<Category>): Promise<Category>;
  delete(id: string): Promise<void>;
  setUserId(userId: string): void;
}

export interface SchedulePresetRepository {
  getAll(): Promise<SchedulePreset[]>;
  getById(id: string): Promise<SchedulePreset | null>;
  getByDayOfWeek(day: DayOfWeek): Promise<SchedulePreset[]>;
  create(preset: Omit<SchedulePreset, 'id' | 'createdAt' | 'updatedAt'>): Promise<SchedulePreset>;
  update(id: string, updates: Partial<SchedulePreset>): Promise<SchedulePreset>;
  delete(id: string): Promise<void>;
  setUserId(userId: string): void;
}

export interface TimeEntryRepository {
  getAll(): Promise<TimeEntry[]>;
  getById(id: string): Promise<TimeEntry | null>;
  getByDate(date: string): Promise<TimeEntry[]>;
  getByDateRange(startDate: string, endDate: string): Promise<TimeEntry[]>;
  create(entry: Omit<TimeEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<TimeEntry>;
  update(id: string, updates: Partial<TimeEntry>): Promise<TimeEntry>;
  delete(id: string): Promise<void>;
  setUserId(userId: string): void;
}

// Analytics types
export interface DailySummary {
  date: string;
  totalPlanned: number; // Minutes
  totalActual: number; // Minutes
  variance: number; // Minutes (actual - planned)
  categoryBreakdown: {
    categoryId: string;
    categoryName: string;
    planned: number;
    actual: number;
  }[];
}

export interface TimeBlockComparison {
  blockId: string;
  activityName: string;
  categoryId?: string;
  plannedStart: string;
  plannedEnd: string;
  plannedDuration: number;
  actualEntries: TimeEntry[];
  actualDuration: number;
  variance: number;
}

// App settings (for day concept tracking)
export interface AppSettings {
  id: string;
  userId: string;
  startDate: string; // ISO date string (YYYY-MM-DD) - represents Day 1
  createdAt: string;
  updatedAt: string;
}

// Settings repository interface
export interface SettingsRepository {
  get(): Promise<AppSettings | null>;
  create(settings: Omit<AppSettings, 'id' | 'createdAt' | 'updatedAt'>): Promise<AppSettings>;
  update(id: string, updates: Partial<AppSettings>): Promise<AppSettings>;
  delete(id: string): Promise<void>;
  setUserId(userId: string): void;
}
