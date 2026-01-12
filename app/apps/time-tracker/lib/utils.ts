/**
 * Time Tracker Utilities
 *
 * Helper functions for time calculations and formatting
 */

import { TimeEntry, TimeBlock, DayOfWeek, SchedulePreset } from './types';

/**
 * Parse time string (HH:mm) to minutes since midnight
 */
export function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Format minutes to HH:mm
 */
export function formatMinutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Calculate duration in minutes between two time strings (HH:mm)
 */
export function calculateDuration(startTime: string, endTime: string): number {
  const start = parseTimeToMinutes(startTime);
  const end = parseTimeToMinutes(endTime);
  return end >= start ? end - start : (24 * 60 - start) + end; // Handle overnight
}

/**
 * Calculate duration in minutes between two ISO datetime strings
 */
export function calculateDurationFromISO(startTime: string, endTime: string): number {
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  return Math.round((end - start) / (1000 * 60)); // Convert ms to minutes
}

/**
 * Format minutes to human-readable duration (e.g., "2h 30m", "45m")
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

/**
 * Format minutes to decimal hours (e.g., 150 minutes = 2.5h)
 */
export function formatDecimalHours(minutes: number): string {
  return (minutes / 60).toFixed(1) + 'h';
}

/**
 * Get current date in YYYY-MM-DD format
 */
export function getTodayDate(): string {
  const today = new Date();
  return formatDateToISO(today);
}

/**
 * Format Date object to YYYY-MM-DD
 */
export function formatDateToISO(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get day of week from date string (YYYY-MM-DD)
 */
export function getDayOfWeek(dateStr: string): DayOfWeek {
  const date = new Date(dateStr + 'T00:00:00'); // Ensure local timezone
  const days: DayOfWeek[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[date.getDay()];
}

/**
 * Format date string to readable format (e.g., "Monday, Jan 3")
 */
export function formatDateReadable(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  };
  return date.toLocaleDateString('en-US', options);
}

/**
 * Get date N days from given date
 */
export function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr + 'T00:00:00');
  date.setDate(date.getDate() + days);
  return formatDateToISO(date);
}

/**
 * Check if two dates are the same day
 */
export function isSameDay(date1: string, date2: string): boolean {
  return date1 === date2;
}

/**
 * Calculate day number relative to a start date
 * @param currentDate - Date to calculate day number for (YYYY-MM-DD)
 * @param startDate - Start date representing Day 1 (YYYY-MM-DD)
 * @returns Day number (1, 2, 3, etc.)
 */
export function calculateDayNumber(currentDate: string, startDate: string): number {
  const current = new Date(currentDate + 'T00:00:00');
  const start = new Date(startDate + 'T00:00:00');
  const diffTime = current.getTime() - start.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays + 1; // Start date is Day 1
}

/**
 * Calculate total duration from time entries
 */
export function calculateTotalDuration(entries: TimeEntry[]): number {
  return entries.reduce((total, entry) => total + entry.duration, 0);
}

/**
 * Group time entries by category
 */
export function groupEntriesByCategory(entries: TimeEntry[]): Record<string, TimeEntry[]> {
  return entries.reduce((acc, entry) => {
    const key = entry.categoryId || 'uncategorized';
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(entry);
    return acc;
  }, {} as Record<string, TimeEntry[]>);
}

/**
 * Get active schedule preset for a given date
 */
export function getActivePresetForDate(presets: SchedulePreset[], date: string): SchedulePreset | null {
  const dayOfWeek = getDayOfWeek(date);
  const activePresets = presets.filter(p =>
    p.isActive && p.daysOfWeek.includes(dayOfWeek)
  );

  // Return first matching preset (could be enhanced with priority later)
  return activePresets.length > 0 ? activePresets[0] : null;
}

/**
 * Round time to nearest 15-minute interval
 */
export function roundToNearestQuarter(date: Date): Date {
  const minutes = date.getMinutes();
  const rounded = Math.round(minutes / 15) * 15;
  const newDate = new Date(date);
  newDate.setMinutes(rounded);
  newDate.setSeconds(0);
  newDate.setMilliseconds(0);
  return newDate;
}

/**
 * Format time from Date object to HH:mm
 */
export function formatTimeFromDate(date: Date): string {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Get current time rounded to nearest 15 minutes in HH:mm format
 */
export function getCurrentTimeRounded(): string {
  return formatTimeFromDate(roundToNearestQuarter(new Date()));
}

/**
 * Calculate variance between planned and actual duration
 */
export function calculateVariance(planned: number, actual: number): number {
  return actual - planned;
}

/**
 * Format variance with +/- sign
 */
export function formatVariance(variance: number): string {
  const formatted = formatDuration(Math.abs(variance));
  return variance >= 0 ? `+${formatted}` : `-${formatted}`;
}

/**
 * Check if time block overlaps with existing blocks
 */
export function hasTimeOverlap(
  newBlock: { startTime: string; endTime: string },
  existingBlocks: TimeBlock[]
): boolean {
  const newStart = parseTimeToMinutes(newBlock.startTime);
  const newEnd = parseTimeToMinutes(newBlock.endTime);

  return existingBlocks.some(block => {
    const existingStart = parseTimeToMinutes(block.startTime);
    const existingEnd = parseTimeToMinutes(block.endTime);

    // Check for overlap
    return (newStart < existingEnd && newEnd > existingStart);
  });
}

/**
 * Generate time options for dropdowns (00:00 to 23:45 in 15-min intervals)
 */
export function generateTimeOptions(): string[] {
  const options: string[] = [];
  for (let hours = 0; hours < 24; hours++) {
    for (let minutes = 0; minutes < 60; minutes += 15) {
      const time = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      options.push(time);
    }
  }
  return options;
}

/**
 * Get time blocks sorted by start time
 */
export function sortTimeBlocks(blocks: TimeBlock[]): TimeBlock[] {
  return [...blocks].sort((a, b) =>
    parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime)
  );
}

/**
 * Get time entries sorted by start time
 */
export function sortTimeEntries(entries: TimeEntry[]): TimeEntry[] {
  return [...entries].sort((a, b) =>
    new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );
}
