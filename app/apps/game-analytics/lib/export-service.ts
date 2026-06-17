import { Game, GameStatus, PurchaseSource, PlayLog, SessionMood, SessionContext, SessionVibe } from './types';
import { getTotalHours, calculateMetrics } from './calculations';
import { v4 as uuidv4 } from 'uuid';

/**
 * Export games data as CSV string
 */
export function exportAsCSV(games: Game[]): string {
  const headers = [
    'Name', 'Status', 'Price', 'Total Hours', 'Rating',
    'Platform', 'Genre', 'Franchise', 'Purchase Source',
    'Date Purchased', 'Start Date', 'End Date',
    'Cost Per Hour', 'Value Rating', 'ROI', 'Blend Score',
    'Play Sessions', 'Notes', 'Review',
  ];

  const rows = games.map(game => {
    const totalHours = getTotalHours(game);
    const metrics = calculateMetrics(game);
    const sessionCount = game.playLogs?.length || 0;

    return [
      escapeCsvField(game.name),
      game.status,
      game.price.toFixed(2),
      totalHours.toFixed(1),
      game.rating.toString(),
      game.platform || '',
      game.genre || '',
      game.franchise || '',
      game.purchaseSource || '',
      game.datePurchased || '',
      game.startDate || '',
      game.endDate || '',
      metrics.costPerHour.toFixed(2),
      metrics.valueRating,
      metrics.roi.toFixed(1),
      metrics.blendScore.toFixed(1),
      sessionCount.toString(),
      escapeCsvField(game.notes || ''),
      escapeCsvField(game.review || ''),
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

function escapeCsvField(field: string): string {
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

/**
 * Export games data as formatted JSON string
 */
export function exportAsJSON(games: Game[]): string {
  const exportData = games.map(game => {
    const totalHours = getTotalHours(game);
    const metrics = calculateMetrics(game);

    return {
      name: game.name,
      status: game.status,
      price: game.price,
      totalHours,
      baselineHours: game.hours,
      rating: game.rating,
      platform: game.platform || null,
      genre: game.genre || null,
      franchise: game.franchise || null,
      purchaseSource: game.purchaseSource || null,
      acquiredFree: game.acquiredFree || false,
      originalPrice: game.originalPrice || null,
      subscriptionSource: game.subscriptionSource || null,
      datePurchased: game.datePurchased || null,
      startDate: game.startDate || null,
      endDate: game.endDate || null,
      notes: game.notes || null,
      review: game.review || null,
      playLogs: game.playLogs || [],
      metrics: {
        costPerHour: Math.round(metrics.costPerHour * 100) / 100,
        valueRating: metrics.valueRating,
        roi: Math.round(metrics.roi * 10) / 10,
        blendScore: Math.round(metrics.blendScore * 10) / 10,
        daysToComplete: metrics.daysToComplete,
      },
    };
  });

  return JSON.stringify({ exportedAt: new Date().toISOString(), gameCount: games.length, games: exportData }, null, 2);
}

/**
 * Export play logs as CSV for detailed session analysis
 */
export function exportPlayLogsAsCSV(games: Game[]): string {
  const headers = ['Date', 'Game', 'Hours', 'Notes', 'Genre', 'Platform'];

  const rows: string[] = [];
  games.forEach(game => {
    game.playLogs?.forEach(log => {
      rows.push([
        log.date,
        escapeCsvField(game.name),
        log.hours.toFixed(1),
        escapeCsvField(log.notes || ''),
        game.genre || '',
        game.platform || '',
      ].join(','));
    });
  });

  // Sort by date desc
  rows.sort((a, b) => b.localeCompare(a));

  return [headers.join(','), ...rows].join('\n');
}

// ── Library Import ─────────────────────────────────────────────
// Parses a CSV or JSON file back into game drafts ready for `addGame()`.
// Accepts both this app's own export formats (round-trip restore/migrate
// between devices) and reasonably plain spreadsheets/JSON arrays.

const VALID_STATUSES: GameStatus[] = ['Not Started', 'In Progress', 'Completed', 'Wishlist', 'Abandoned'];
const VALID_SOURCES: PurchaseSource[] = ['Steam', 'PlayStation', 'Xbox', 'Nintendo', 'Epic', 'GOG', 'Physical', 'Other'];
const VALID_MOODS: SessionMood[] = ['great', 'good', 'meh', 'grind'];
const VALID_CONTEXTS: SessionContext[] = ['solo', 'co-op', 'online', 'couch-co-op', 'stream'];
const VALID_VIBES: SessionVibe[] = ['wind-down', 'competitive', 'exploration', 'story', 'achievement-hunting', 'social'];

export interface ImportDraft {
  name: string;
  price: number;
  hours: number;
  rating: number;
  status: GameStatus;
  platform?: string;
  genre?: string;
  franchise?: string;
  purchaseSource?: PurchaseSource;
  datePurchased?: string;
  startDate?: string;
  endDate?: string;
  notes?: string;
  review?: string;
  playLogs?: PlayLog[];
}

export interface ImportParseResult {
  drafts: ImportDraft[];
  errors: string[];
}

function pickEnum<T extends string>(value: unknown, valid: T[]): T | undefined {
  if (typeof value !== 'string') return undefined;
  const lower = value.trim().toLowerCase();
  return valid.find(v => v.toLowerCase() === lower);
}

function parseStatus(value: unknown): GameStatus {
  return pickEnum(value, VALID_STATUSES) ?? 'Not Started';
}

function parseNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
  if (typeof value !== 'string') return fallback;
  const n = parseFloat(value.replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : fallback;
}

function clampRating(n: number): number {
  return Math.max(0, Math.min(10, n));
}

function trimmedOrUndefined(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/** Tokenizes raw CSV text into rows, respecting quoted fields (incl. embedded commas/newlines). */
function parseCsvContent(content: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  const len = content.length;

  while (i < len) {
    const char = content[i];
    if (inQuotes) {
      if (char === '"') {
        if (content[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += char; i++; continue;
    }
    if (char === '"') { inQuotes = true; i++; continue; }
    if (char === ',') { row.push(field); field = ''; i++; continue; }
    if (char === '\r') { i++; continue; }
    if (char === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue; }
    field += char; i++;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }

  return rows.filter(r => !(r.length === 1 && r[0].trim() === ''));
}

/** Parses a CSV file — either this app's own export, or a plain spreadsheet with a header row. */
export function parseGamesCSV(content: string): ImportParseResult {
  const rows = parseCsvContent(content);
  if (rows.length === 0) return { drafts: [], errors: ['That file is empty.'] };

  const header = rows[0].map(h => h.trim().toLowerCase());
  const colIndex = (...names: string[]): number => {
    for (const name of names) {
      const idx = header.indexOf(name);
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const idx = {
    name: colIndex('name'),
    status: colIndex('status'),
    price: colIndex('price'),
    hours: colIndex('total hours', 'hours'),
    rating: colIndex('rating'),
    platform: colIndex('platform'),
    genre: colIndex('genre'),
    franchise: colIndex('franchise'),
    source: colIndex('purchase source', 'source'),
    datePurchased: colIndex('date purchased', 'purchase date'),
    startDate: colIndex('start date'),
    endDate: colIndex('end date'),
    notes: colIndex('notes'),
    review: colIndex('review'),
  };

  if (idx.name === -1) {
    return { drafts: [], errors: ['No "Name" column found — make sure the first row has headers.'] };
  }

  const drafts: ImportDraft[] = [];
  const errors: string[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.every(f => f.trim() === '')) continue;
    const name = (row[idx.name] || '').trim();
    if (!name) { errors.push(`Row ${i + 1}: missing a name, skipped.`); continue; }

    drafts.push({
      name,
      status: idx.status !== -1 ? parseStatus(row[idx.status]) : 'Not Started',
      price: idx.price !== -1 ? parseNumber(row[idx.price]) : 0,
      hours: idx.hours !== -1 ? parseNumber(row[idx.hours]) : 0,
      rating: idx.rating !== -1 ? clampRating(parseNumber(row[idx.rating])) : 0,
      platform: idx.platform !== -1 ? trimmedOrUndefined(row[idx.platform]) : undefined,
      genre: idx.genre !== -1 ? trimmedOrUndefined(row[idx.genre]) : undefined,
      franchise: idx.franchise !== -1 ? trimmedOrUndefined(row[idx.franchise]) : undefined,
      purchaseSource: idx.source !== -1 ? pickEnum(row[idx.source], VALID_SOURCES) : undefined,
      datePurchased: idx.datePurchased !== -1 ? trimmedOrUndefined(row[idx.datePurchased]) : undefined,
      startDate: idx.startDate !== -1 ? trimmedOrUndefined(row[idx.startDate]) : undefined,
      endDate: idx.endDate !== -1 ? trimmedOrUndefined(row[idx.endDate]) : undefined,
      notes: idx.notes !== -1 ? trimmedOrUndefined(row[idx.notes]) : undefined,
      review: idx.review !== -1 ? trimmedOrUndefined(row[idx.review]) : undefined,
    });
  }

  return { drafts, errors };
}

function parsePlayLogs(value: unknown): PlayLog[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const logs: PlayLog[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== 'object') continue;
    const rec = entry as Record<string, unknown>;
    if (typeof rec.date !== 'string' || typeof rec.hours !== 'number') continue;
    logs.push({
      id: uuidv4(),
      date: rec.date,
      hours: rec.hours,
      notes: trimmedOrUndefined(rec.notes),
      mood: pickEnum(rec.mood, VALID_MOODS),
      context: pickEnum(rec.context, VALID_CONTEXTS),
      vibe: pickEnum(rec.vibe, VALID_VIBES),
    });
  }
  return logs.length > 0 ? logs : undefined;
}

/** Parses a JSON file — either this app's own `{ games: [...] }` export or a bare array. */
export function parseGamesJSON(content: string): ImportParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return { drafts: [], errors: ['That file is not valid JSON.'] };
  }

  let arr: unknown[];
  if (Array.isArray(parsed)) {
    arr = parsed;
  } else if (parsed && typeof parsed === 'object' && Array.isArray((parsed as Record<string, unknown>).games)) {
    arr = (parsed as Record<string, unknown>).games as unknown[];
  } else {
    return { drafts: [], errors: ['Unrecognized JSON format — expected an array of games or an exported library file.'] };
  }

  const drafts: ImportDraft[] = [];
  const errors: string[] = [];

  arr.forEach((item, i) => {
    if (!item || typeof item !== 'object') { errors.push(`Entry ${i + 1}: not a valid game, skipped.`); return; }
    const rec = item as Record<string, unknown>;
    const name = trimmedOrUndefined(rec.name);
    if (!name) { errors.push(`Entry ${i + 1}: missing a name, skipped.`); return; }

    const hoursValue = rec.baselineHours ?? rec.hours ?? rec.totalHours;

    drafts.push({
      name,
      status: parseStatus(rec.status),
      price: parseNumber(rec.price),
      hours: parseNumber(hoursValue),
      rating: clampRating(parseNumber(rec.rating)),
      platform: trimmedOrUndefined(rec.platform),
      genre: trimmedOrUndefined(rec.genre),
      franchise: trimmedOrUndefined(rec.franchise),
      purchaseSource: pickEnum(rec.purchaseSource, VALID_SOURCES),
      datePurchased: trimmedOrUndefined(rec.datePurchased),
      startDate: trimmedOrUndefined(rec.startDate),
      endDate: trimmedOrUndefined(rec.endDate),
      notes: trimmedOrUndefined(rec.notes),
      review: trimmedOrUndefined(rec.review),
      playLogs: parsePlayLogs(rec.playLogs),
    });
  });

  return { drafts, errors };
}

/** Detects format from filename/content and parses accordingly. */
export function parseImportFile(content: string, filename: string): ImportParseResult {
  const trimmed = content.trim();
  const looksLikeJson = filename.toLowerCase().endsWith('.json') || trimmed.startsWith('{') || trimmed.startsWith('[');
  return looksLikeJson ? parseGamesJSON(content) : parseGamesCSV(content);
}

/**
 * Trigger file download in the browser
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
