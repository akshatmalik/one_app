import { Game, GameStatus, PurchaseSource, SubscriptionSource, PlayLog } from './types';

export type ImportedGameData = Omit<Game, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;

export interface ImportRow {
  rowIndex: number;
  data: ImportedGameData;
  warnings: string[];
  isDuplicate: boolean;
  include: boolean;
}

export interface ImportParseResult {
  rows: ImportRow[];
  skippedRows: { rowIndex: number; reason: string }[];
  format: 'csv' | 'json';
}

const VALID_STATUSES: GameStatus[] = ['Not Started', 'In Progress', 'Completed', 'Wishlist', 'Abandoned'];
const VALID_SOURCES: PurchaseSource[] = ['Steam', 'PlayStation', 'Xbox', 'Nintendo', 'Epic', 'GOG', 'Physical', 'Other'];
const VALID_SUBSCRIPTIONS: SubscriptionSource[] = ['PS Plus', 'Game Pass', 'Epic Free', 'Prime Gaming', 'Humble Choice', 'Other'];

// Maps lenient/lowercased header variants → canonical field name. Lets the
// importer accept the app's own export headers AND hand-rolled spreadsheets.
const HEADER_ALIASES: Record<string, string> = {
  name: 'name', game: 'name', title: 'name',
  status: 'status',
  price: 'price', cost: 'price',
  'total hours': 'hours', hours: 'hours', hoursplayed: 'hours', 'hours played': 'hours',
  rating: 'rating', score: 'rating',
  platform: 'platform',
  genre: 'genre',
  franchise: 'franchise', series: 'franchise',
  'purchase source': 'purchaseSource', source: 'purchaseSource', store: 'purchaseSource',
  'date purchased': 'datePurchased', purchased: 'datePurchased', 'purchase date': 'datePurchased',
  'start date': 'startDate', started: 'startDate',
  'end date': 'endDate', completed: 'endDate', finished: 'endDate',
  notes: 'notes',
  review: 'review',
};

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase();
}

function normalizeStatus(value: string | undefined): GameStatus {
  if (!value) return 'Not Started';
  const trimmed = value.trim();
  const match = VALID_STATUSES.find(s => s.toLowerCase() === trimmed.toLowerCase());
  return match ?? 'Not Started';
}

function normalizeSource(value: string | undefined): PurchaseSource | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  return VALID_SOURCES.find(s => s.toLowerCase() === trimmed.toLowerCase());
}

function normalizeSubscription(value: string | undefined): SubscriptionSource | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  return VALID_SUBSCRIPTIONS.find(s => s.toLowerCase() === trimmed.toLowerCase());
}

function parseNumber(value: string | undefined): number {
  if (!value) return 0;
  const cleaned = value.replace(/[$,]/g, '').trim();
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function parseDate(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

// Hand-rolled RFC4180-ish CSV parser — handles quoted fields with embedded
// commas/newlines/escaped quotes, which a naive split(',') would break on.
function splitCSVRows(content: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  const text = content.replace(/\r\n/g, '\n');

  while (i < text.length) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += char;
      i++;
      continue;
    }
    if (char === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (char === ',') {
      row.push(field);
      field = '';
      i++;
      continue;
    }
    if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      i++;
      continue;
    }
    field += char;
    i++;
  }
  row.push(field);
  rows.push(row);

  return rows.filter(r => !(r.length === 1 && r[0].trim() === ''));
}

export function parseImportCSV(content: string, existingNames: Set<string>): ImportParseResult {
  const allRows = splitCSVRows(content);
  const skippedRows: { rowIndex: number; reason: string }[] = [];

  if (allRows.length === 0) {
    return { rows: [], skippedRows: [], format: 'csv' };
  }

  const headerRow = allRows[0].map(normalizeHeader);
  const fieldMap: Record<number, string> = {};
  headerRow.forEach((h, idx) => {
    const canonical = HEADER_ALIASES[h];
    if (canonical) fieldMap[idx] = canonical;
  });

  if (!Object.values(fieldMap).includes('name')) {
    return {
      rows: [],
      skippedRows: [{ rowIndex: 0, reason: 'No recognizable "Name" column found in header row' }],
      format: 'csv',
    };
  }

  const rows: ImportRow[] = [];

  for (let r = 1; r < allRows.length; r++) {
    const raw = allRows[r];
    const cells: Record<string, string> = {};
    raw.forEach((value, idx) => {
      const field = fieldMap[idx];
      if (field) cells[field] = value;
    });

    const name = (cells.name || '').trim();
    if (!name) {
      skippedRows.push({ rowIndex: r, reason: 'Missing game name' });
      continue;
    }

    const warnings: string[] = [];
    const status = normalizeStatus(cells.status);
    if (cells.status && status.toLowerCase() !== cells.status.trim().toLowerCase()) {
      warnings.push(`Unrecognized status "${cells.status}" — defaulted to "${status}"`);
    }

    const purchaseSource = normalizeSource(cells.purchaseSource);
    if (cells.purchaseSource && !purchaseSource) {
      warnings.push(`Unrecognized purchase source "${cells.purchaseSource}" — left blank`);
    }

    const data: ImportedGameData = {
      name,
      price: parseNumber(cells.price),
      hours: parseNumber(cells.hours),
      rating: parseNumber(cells.rating),
      status,
      platform: cells.platform?.trim() || undefined,
      genre: cells.genre?.trim() || undefined,
      franchise: cells.franchise?.trim() || undefined,
      purchaseSource,
      datePurchased: parseDate(cells.datePurchased),
      startDate: parseDate(cells.startDate),
      endDate: parseDate(cells.endDate),
      notes: cells.notes?.trim() || undefined,
      review: cells.review?.trim() || undefined,
    };

    rows.push({
      rowIndex: r,
      data,
      warnings,
      isDuplicate: existingNames.has(name.toLowerCase()),
      include: !existingNames.has(name.toLowerCase()),
    });
  }

  return { rows, skippedRows, format: 'csv' };
}

interface ImportJSONPlayLog {
  date?: string;
  hours?: number;
  notes?: string;
}

interface ImportJSONGame {
  name?: string;
  status?: string;
  price?: number;
  totalHours?: number;
  baselineHours?: number;
  hours?: number;
  rating?: number;
  platform?: string;
  genre?: string;
  franchise?: string;
  purchaseSource?: string;
  acquiredFree?: boolean;
  originalPrice?: number;
  subscriptionSource?: string;
  datePurchased?: string;
  startDate?: string;
  endDate?: string;
  notes?: string;
  review?: string;
  playLogs?: ImportJSONPlayLog[];
}

function mapJSONGame(raw: ImportJSONGame): ImportedGameData {
  const status = normalizeStatus(raw.status);
  const purchaseSource = normalizeSource(raw.purchaseSource);
  const subscriptionSource = normalizeSubscription(raw.subscriptionSource);

  const hours = typeof raw.baselineHours === 'number'
    ? raw.baselineHours
    : (typeof raw.hours === 'number' ? raw.hours : (typeof raw.totalHours === 'number' ? raw.totalHours : 0));

  const playLogs: PlayLog[] | undefined = Array.isArray(raw.playLogs) && raw.playLogs.length > 0
    ? raw.playLogs.map((log, idx) => ({
        id: `import-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 8)}`,
        date: parseDate(log.date) || new Date().toISOString(),
        hours: typeof log.hours === 'number' ? log.hours : 0,
        notes: log.notes || undefined,
      }))
    : undefined;

  return {
    name: (raw.name || '').trim(),
    price: typeof raw.price === 'number' ? raw.price : 0,
    hours,
    rating: typeof raw.rating === 'number' ? raw.rating : 0,
    status,
    platform: raw.platform || undefined,
    genre: raw.genre || undefined,
    franchise: raw.franchise || undefined,
    purchaseSource,
    acquiredFree: raw.acquiredFree || undefined,
    originalPrice: typeof raw.originalPrice === 'number' ? raw.originalPrice : undefined,
    subscriptionSource,
    datePurchased: parseDate(raw.datePurchased),
    startDate: parseDate(raw.startDate),
    endDate: parseDate(raw.endDate),
    notes: raw.notes || undefined,
    review: raw.review || undefined,
    playLogs,
  };
}

export function parseImportJSON(content: string, existingNames: Set<string>): ImportParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return { rows: [], skippedRows: [{ rowIndex: 0, reason: 'Invalid JSON — could not parse file' }], format: 'json' };
  }

  let rawGames: ImportJSONGame[];
  if (Array.isArray(parsed)) {
    rawGames = parsed as ImportJSONGame[];
  } else if (parsed && typeof parsed === 'object' && Array.isArray((parsed as { games?: unknown }).games)) {
    rawGames = (parsed as { games: ImportJSONGame[] }).games;
  } else {
    return { rows: [], skippedRows: [{ rowIndex: 0, reason: 'JSON must be an array of games or an object with a "games" array' }], format: 'json' };
  }

  const rows: ImportRow[] = [];
  const skippedRows: { rowIndex: number; reason: string }[] = [];

  rawGames.forEach((raw, idx) => {
    if (!raw || typeof raw !== 'object' || !raw.name || !raw.name.trim()) {
      skippedRows.push({ rowIndex: idx, reason: 'Missing game name' });
      return;
    }
    const data = mapJSONGame(raw);
    const warnings: string[] = [];
    if (raw.status && normalizeStatus(raw.status) !== raw.status) {
      warnings.push(`Unrecognized status "${raw.status}" — defaulted to "${data.status}"`);
    }
    const nameLower = data.name.toLowerCase();
    rows.push({
      rowIndex: idx,
      data,
      warnings,
      isDuplicate: existingNames.has(nameLower),
      include: !existingNames.has(nameLower),
    });
  });

  return { rows, skippedRows, format: 'json' };
}

export function parseImportContent(content: string, filename: string, existingGames: Game[]): ImportParseResult {
  const existingNames = new Set(existingGames.map(g => g.name.toLowerCase()));
  const trimmed = content.trim();
  const isJSON = filename.toLowerCase().endsWith('.json') || trimmed.startsWith('{') || trimmed.startsWith('[');

  if (isJSON) {
    return parseImportJSON(content, existingNames);
  }
  return parseImportCSV(content, existingNames);
}
