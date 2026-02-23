// Error logging for game-analytics — visible in UI (phone-friendly)

import { ErrorLogEntry } from './types';

const STORAGE_KEY = 'game-analytics-error-log';
const MAX_ENTRIES = 50;

function loadEntries(): ErrorLogEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveEntries(entries: ErrorLogEntry[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // If localStorage is full, silently fail
  }
}

export function logError(message: string, context?: string, error?: unknown): void {
  const entries = loadEntries();
  const entry: ErrorLogEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
    message,
    context,
    stack: error instanceof Error ? error.stack : undefined,
  };
  // Prepend so newest is first, keep max MAX_ENTRIES
  entries.unshift(entry);
  if (entries.length > MAX_ENTRIES) entries.splice(MAX_ENTRIES);
  saveEntries(entries);
  // Also log to console for dev
  console.error(`[GameAnalytics${context ? '/' + context : ''}]`, message, error ?? '');
}

export function getErrorLog(): ErrorLogEntry[] {
  return loadEntries();
}

export function clearErrorLog(): void {
  saveEntries([]);
}

export function getErrorCount(): number {
  return loadEntries().length;
}
