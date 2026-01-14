/**
 * Utility functions for voice journal feature
 */

/**
 * Parse relative date references to actual dates
 * @param dateReference - Natural language date reference (e.g., "today", "yesterday")
 * @param currentDate - Current date as ISO string
 * @returns ISO date string
 */
export function parseDateReference(
  dateReference: string,
  currentDate: string
): string {
  const current = new Date(currentDate);
  const lowerRef = dateReference.toLowerCase().trim();

  // Today
  if (lowerRef.includes('today') || lowerRef.includes('now')) {
    return currentDate;
  }

  // Yesterday
  if (lowerRef.includes('yesterday')) {
    const yesterday = new Date(current);
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
  }

  // Days ago (e.g., "2 days ago", "three days ago")
  const daysAgoMatch = lowerRef.match(/(\d+|one|two|three|four|five|six|seven)\s*days?\s*ago/i);
  if (daysAgoMatch) {
    const numberWords: Record<string, number> = {
      one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7
    };
    const daysStr = daysAgoMatch[1].toLowerCase();
    const days = numberWords[daysStr] || parseInt(daysStr, 10);

    const date = new Date(current);
    date.setDate(date.getDate() - days);
    return date.toISOString().split('T')[0];
  }

  // Specific weekdays (default to most recent past occurrence)
  const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const weekdayIndex = weekdays.findIndex(day => lowerRef.includes(day));

  if (weekdayIndex !== -1) {
    const targetDay = weekdayIndex;
    const currentDay = current.getDay();

    // Calculate days to go back
    let daysBack = currentDay - targetDay;
    if (daysBack <= 0) {
      daysBack += 7; // Go back to previous week
    }

    const date = new Date(current);
    date.setDate(date.getDate() - daysBack);
    return date.toISOString().split('T')[0];
  }

  // Default to current date if can't parse
  return currentDate;
}

/**
 * Calculate day number from a date and start date
 * @param date - Target date as ISO string
 * @param startDate - Start date as ISO string (Day 1)
 * @returns Day number (1-based)
 */
export function calculateDayNumber(date: string, startDate: string): number {
  const targetDate = new Date(date);
  const start = new Date(startDate);

  const diffTime = targetDate.getTime() - start.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  return diffDays + 1; // Day 1 is the start date
}

/**
 * Format current time as timestamp string
 * @returns Time string in format "2:30 PM"
 */
export function getCurrentTimestamp(): string {
  const now = new Date();
  let hours = now.getHours();
  const minutes = now.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';

  hours = hours % 12;
  hours = hours ? hours : 12; // Convert 0 to 12

  const minutesStr = minutes < 10 ? `0${minutes}` : `${minutes}`;

  return `${hours}:${minutesStr} ${ampm}`;
}

/**
 * Format voice journal entry for diary content
 * @param content - Transcript content
 * @param timestamp - Time of recording
 * @returns Formatted markdown string
 */
export function formatVoiceEntry(content: string, timestamp: string): string {
  return `📝 **${timestamp}** (via 🎤 voice)\n${content}`;
}

/**
 * Append voice entry to existing diary content
 * @param existingContent - Current diary content
 * @param newEntry - New voice entry to append
 * @returns Updated diary content
 */
export function appendVoiceEntry(existingContent: string, newEntry: string): string {
  if (!existingContent || existingContent.trim() === '') {
    return newEntry;
  }

  return `${existingContent}\n\n---\n\n${newEntry}`;
}

/**
 * Clean up transcript text
 * Remove common filler words and fix formatting
 */
export function cleanTranscript(transcript: string): string {
  let cleaned = transcript.trim();

  // Remove common filler words (but be gentle, preserve natural tone)
  const fillerWords = /\b(um|uh|like|you know|basically|actually|literally)\b/gi;
  cleaned = cleaned.replace(fillerWords, '');

  // Remove extra spaces
  cleaned = cleaned.replace(/\s+/g, ' ');

  // Capitalize first letter
  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }

  // Ensure it ends with punctuation
  if (cleaned.length > 0 && !/[.!?]$/.test(cleaned)) {
    cleaned += '.';
  }

  return cleaned.trim();
}

/**
 * Guess mood emoji based on rating
 */
export function getMoodEmoji(mood: number | null): string {
  if (mood === null) return '😐';
  if (mood <= 1) return '😢';
  if (mood <= 2) return '😕';
  if (mood <= 3) return '😐';
  if (mood <= 4) return '😊';
  return '😄';
}

/**
 * Format date for display
 * @param date - ISO date string
 * @returns Formatted date like "January 14, 2026"
 */
export function formatDateForDisplay(date: string): string {
  const d = new Date(date);
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  };
  return d.toLocaleDateString('en-US', options);
}
