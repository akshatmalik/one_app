// Utility functions for Mood Tracker

/**
 * Calculate day number from a date and start date
 */
export function calculateDayNumber(date: string, startDate: string): number {
  const dateObj = new Date(date);
  const startDateObj = new Date(startDate);
  const diffTime = dateObj.getTime() - startDateObj.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays + 1; // Day 1 is the start date
}

/**
 * Calculate date from day number and start date
 */
export function calculateDateFromDayNumber(dayNumber: number, startDate: string): string {
  const startDateObj = new Date(startDate);
  const targetDate = new Date(startDateObj);
  targetDate.setDate(startDateObj.getDate() + dayNumber - 1); // Day 1 is the start date
  return targetDate.toISOString().split('T')[0];
}

/**
 * Get all days in a year starting from start date
 */
export function getYearDays(year: number, startDate: string): Array<{
  dayNumber: number;
  date: string;
  month: number;
  weekday: number; // 0 = Sunday, 1 = Monday, etc.
}> {
  const days: Array<{
    dayNumber: number;
    date: string;
    month: number;
    weekday: number;
  }> = [];

  const startDateObj = new Date(startDate);
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31);

  // Calculate which day number corresponds to the start of the year
  const startDayNumber = calculateDayNumber(yearStart.toISOString().split('T')[0], startDate);

  // Iterate through all days in the year
  for (let d = new Date(yearStart); d <= yearEnd; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    const dayNumber = calculateDayNumber(dateStr, startDate);

    days.push({
      dayNumber,
      date: dateStr,
      month: d.getMonth(),
      weekday: d.getDay(),
    });
  }

  return days;
}

/**
 * Get current year
 */
export function getCurrentYear(): number {
  return new Date().getFullYear();
}

/**
 * Get today's date as ISO string (YYYY-MM-DD)
 */
export function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Format date for display (e.g., "Jan 1, 2024")
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Get month name from month number (0-11)
 */
export function getMonthName(month: number): string {
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  return monthNames[month];
}

/**
 * Get weekday name from weekday number (0-6)
 */
export function getWeekdayName(weekday: number, short: boolean = true): string {
  const weekdayNames = short
    ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return weekdayNames[weekday];
}

/**
 * Organize days into a grid (weeks x weekdays)
 */
export function organizeDaysIntoGrid(days: Array<{
  dayNumber: number;
  date: string;
  month: number;
  weekday: number;
}>): Array<Array<{
  dayNumber: number;
  date: string;
  month: number;
  weekday: number;
} | null>> {
  const grid: Array<Array<{
    dayNumber: number;
    date: string;
    month: number;
    weekday: number;
  } | null>> = [];

  if (days.length === 0) return grid;

  // Find the first Monday of the year (or use first day)
  let currentWeek: Array<{
    dayNumber: number;
    date: string;
    month: number;
    weekday: number;
  } | null> = new Array(7).fill(null);

  let weekIndex = 0;

  days.forEach((day) => {
    // weekday: 0 = Sunday, 1 = Monday, ... 6 = Saturday
    // We want: Monday = 0, Tuesday = 1, ... Sunday = 6
    const gridWeekday = day.weekday === 0 ? 6 : day.weekday - 1;

    // If this is Monday and we already have data in current week, start a new week
    if (gridWeekday === 0 && currentWeek.some(d => d !== null)) {
      grid.push(currentWeek);
      currentWeek = new Array(7).fill(null);
    }

    currentWeek[gridWeekday] = day;

    // If this is Sunday (last day of week), push the week
    if (gridWeekday === 6) {
      grid.push(currentWeek);
      currentWeek = new Array(7).fill(null);
    }
  });

  // Push any remaining days
  if (currentWeek.some(d => d !== null)) {
    grid.push(currentWeek);
  }

  return grid;
}
