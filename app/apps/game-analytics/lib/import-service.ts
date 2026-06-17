import { Game, GameStatus, PurchaseSource } from './types';

export type ImportField =
  | 'skip'
  | 'name'
  | 'status'
  | 'price'
  | 'hours'
  | 'rating'
  | 'platform'
  | 'genre'
  | 'franchise'
  | 'purchaseSource'
  | 'datePurchased'
  | 'startDate'
  | 'endDate'
  | 'notes'
  | 'review';

export const IMPORT_FIELD_OPTIONS: { value: ImportField; label: string }[] = [
  { value: 'skip', label: '— Ignore —' },
  { value: 'name', label: 'Name' },
  { value: 'status', label: 'Status' },
  { value: 'price', label: 'Price' },
  { value: 'hours', label: 'Hours Played' },
  { value: 'rating', label: 'Rating (0–10)' },
  { value: 'platform', label: 'Platform' },
  { value: 'genre', label: 'Genre' },
  { value: 'franchise', label: 'Franchise' },
  { value: 'purchaseSource', label: 'Purchase Source' },
  { value: 'datePurchased', label: 'Date Purchased' },
  { value: 'startDate', label: 'Start Date' },
  { value: 'endDate', label: 'End Date' },
  { value: 'notes', label: 'Notes' },
  { value: 'review', label: 'Review' },
];

const STATUS_VALUES: GameStatus[] = ['Not Started', 'In Progress', 'Completed', 'Wishlist', 'Abandoned'];
const PURCHASE_SOURCE_VALUES: PurchaseSource[] = ['Steam', 'PlayStation', 'Xbox', 'Nintendo', 'Epic', 'GOG', 'Physical', 'Other'];

const STATUS_ALIASES: Record<string, GameStatus> = {
  playing: 'In Progress', active: 'In Progress', ongoing: 'In Progress', current: 'In Progress',
  done: 'Completed', finished: 'Completed', beat: 'Completed', beaten: 'Completed', complete: 'Completed',
  backlog: 'Not Started', unplayed: 'Not Started', owned: 'Not Started', tostart: 'Not Started', toplay: 'Not Started', notstarted: 'Not Started',
  dropped: 'Abandoned', quit: 'Abandoned', abandon: 'Abandoned', abandoned: 'Abandoned', shelved: 'Abandoned', dnf: 'Abandoned',
  want: 'Wishlist', planned: 'Wishlist', wanttoplay: 'Wishlist', wishlist: 'Wishlist', wishlisted: 'Wishlist',
};

const HEADER_ALIASES: Record<string, ImportField> = {
  name: 'name', title: 'name', game: 'name', gametitle: 'name', gamename: 'name',
  status: 'status', state: 'status',
  price: 'price', cost: 'price', paid: 'price', pricepaid: 'price', amountpaid: 'price',
  hours: 'hours', totalhours: 'hours', hoursplayed: 'hours', playtime: 'hours', timeplayed: 'hours',
  rating: 'rating', score: 'rating', myrating: 'rating', personalrating: 'rating',
  platform: 'platform', system: 'platform', console: 'platform',
  genre: 'genre', category: 'genre',
  franchise: 'franchise', series: 'franchise',
  purchasesource: 'purchaseSource', store: 'purchaseSource', source: 'purchaseSource', storefront: 'purchaseSource', platformbought: 'purchaseSource', boughtfrom: 'purchaseSource',
  datepurchased: 'datePurchased', purchasedate: 'datePurchased', dateadded: 'datePurchased', datebought: 'datePurchased', acquired: 'datePurchased',
  startdate: 'startDate', datestarted: 'startDate',
  enddate: 'endDate', datefinished: 'endDate', datecompleted: 'endDate',
  notes: 'notes', note: 'notes', comment: 'notes', comments: 'notes',
  review: 'review', thoughts: 'review',
  // Known computed/export-only columns we recognize but never write to
  costperhour: 'skip', valuerating: 'skip', roi: 'skip', blendscore: 'skip', playsessions: 'skip',
};

function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Parse CSV text into rows of string cells. Handles quoted fields
 * (including embedded commas, newlines, and escaped "" quotes).
 */
export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i];
    if (inQuotes) {
      if (char === '"') {
        if (normalized[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter(r => r.some(cell => cell.trim().length > 0));
}

/** Guess a field mapping for each header column based on common naming conventions. */
export function detectColumnMapping(headers: string[]): ImportField[] {
  return headers.map(h => HEADER_ALIASES[normalizeHeader(h)] || 'skip');
}

function parseDateLoose(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString().split('T')[0];
}

export interface ImportRowResult {
  name: string;
  data: Omit<Game, 'id' | 'userId' | 'createdAt' | 'updatedAt'> | null;
  isDuplicate: boolean;
  error: string | null;
}

/** Build a creatable Game payload from one raw CSV row, given a column mapping. */
export function buildGameFromRow(
  row: string[],
  mapping: ImportField[],
  existingNamesLower: Set<string>,
  forceWishlist: boolean
): ImportRowResult {
  const get = (field: ImportField): string => {
    const idx = mapping.indexOf(field);
    if (idx < 0 || row[idx] === undefined) return '';
    return row[idx].trim();
  };

  const name = get('name');
  if (!name) {
    return { name: '', data: null, isDuplicate: false, error: 'Missing name' };
  }

  const priceDigits = get('price').replace(/[^0-9.-]/g, '');
  const price = priceDigits ? Math.max(0, parseFloat(priceDigits) || 0) : 0;

  const hoursDigits = get('hours').replace(/[^0-9.-]/g, '');
  const hours = hoursDigits ? Math.max(0, parseFloat(hoursDigits) || 0) : 0;

  const ratingRaw = parseFloat(get('rating'));
  const rating = Number.isNaN(ratingRaw) ? 0 : Math.min(10, Math.max(0, ratingRaw));

  const statusRaw = get('status').toLowerCase().replace(/\s+/g, '');
  let status: GameStatus = 'Not Started';
  const directMatch = STATUS_VALUES.find(s => s.toLowerCase().replace(/\s+/g, '') === statusRaw);
  if (directMatch) {
    status = directMatch;
  } else if (statusRaw && STATUS_ALIASES[statusRaw]) {
    status = STATUS_ALIASES[statusRaw];
  }
  if (forceWishlist) status = 'Wishlist';

  const platform = get('platform') || undefined;
  const genre = get('genre') || undefined;
  const franchise = get('franchise') || undefined;

  const purchaseSourceRaw = get('purchaseSource').toLowerCase();
  const purchaseSource = PURCHASE_SOURCE_VALUES.find(p => p.toLowerCase() === purchaseSourceRaw);

  const datePurchased = parseDateLoose(get('datePurchased'));
  const startDate = parseDateLoose(get('startDate'));
  const endDate = parseDateLoose(get('endDate'));

  const notes = get('notes') || undefined;
  const review = get('review') || undefined;

  const data: Omit<Game, 'id' | 'userId' | 'createdAt' | 'updatedAt'> = {
    name,
    price,
    hours,
    rating,
    status,
    ...(platform && { platform }),
    ...(genre && { genre }),
    ...(franchise && { franchise }),
    ...(purchaseSource && { purchaseSource }),
    ...(datePurchased && { datePurchased }),
    ...(startDate && { startDate }),
    ...(endDate && { endDate }),
    ...(notes && { notes }),
    ...(review && { review }),
  };

  return {
    name,
    data,
    isDuplicate: existingNamesLower.has(name.toLowerCase()),
    error: null,
  };
}

/** A starter CSV that matches the same column layout produced by "Export → CSV". */
export function generateTemplateCSV(): string {
  const headers = ['Name', 'Status', 'Price', 'Total Hours', 'Rating', 'Platform', 'Genre', 'Franchise', 'Purchase Source', 'Date Purchased', 'Notes'];
  const example1 = ['Elden Ring', 'Completed', '59.99', '87', '9.5', 'PS5', 'RPG', 'Dark Souls', 'PlayStation', '2024-02-25', 'Incredible game'];
  const example2 = ['Hades II', 'Wishlist', '29.99', '0', '0', 'PC', 'Roguelike', 'Hades', 'Steam', '', ''];
  const escape = (v: string) => (v.includes(',') || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v);
  return [headers, example1, example2].map(r => r.map(escape).join(',')).join('\n');
}
