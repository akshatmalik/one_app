'use client';

import { useState, useMemo, useCallback } from 'react';
import { X, Upload, AlertTriangle, CheckCircle2, Trash2, ClipboardPaste, FileSpreadsheet } from 'lucide-react';
import { Game, GameStatus, PurchaseSource } from '../lib/types';
import clsx from 'clsx';

interface LibraryImportModalProps {
  onImportGames: (games: Omit<Game, 'id' | 'userId' | 'createdAt' | 'updatedAt'>[]) => Promise<void>;
  onClose: () => void;
  existingGameNames: string[];
}

type GameField = 'name' | 'price' | 'hours' | 'rating' | 'status' | 'platform' | 'genre' | 'franchise' | 'purchaseSource' | 'notes' | 'skip';

const FIELD_LABELS: Record<GameField, string> = {
  name: 'Name (required)',
  price: 'Price',
  hours: 'Hours Played',
  rating: 'Rating (0-10)',
  status: 'Status',
  platform: 'Platform',
  genre: 'Genre',
  franchise: 'Franchise',
  purchaseSource: 'Purchase Source',
  notes: 'Notes',
  skip: "Don't import",
};

const FIELD_ORDER: GameField[] = ['name', 'price', 'hours', 'rating', 'status', 'platform', 'genre', 'franchise', 'purchaseSource', 'notes', 'skip'];

const STATUS_VALUES: GameStatus[] = ['Not Started', 'In Progress', 'Completed', 'Wishlist', 'Abandoned'];
const SOURCE_VALUES: PurchaseSource[] = ['Steam', 'PlayStation', 'Xbox', 'Nintendo', 'Epic', 'GOG', 'Physical', 'Other'];

// Header text → field guess. Checked against a lowercased, trimmed header cell.
const HEADER_ALIASES: Record<string, GameField> = {
  name: 'name', title: 'name', game: 'name', 'game name': 'name', 'game title': 'name',
  price: 'price', cost: 'price', 'price paid': 'price', 'amount paid': 'price', paid: 'price',
  hours: 'hours', 'hours played': 'hours', playtime: 'hours', 'time played': 'hours', hrs: 'hours',
  rating: 'rating', score: 'rating', 'my rating': 'rating', 'personal rating': 'rating',
  status: 'status', state: 'status', progress: 'status',
  platform: 'platform', system: 'platform', console: 'platform',
  genre: 'genre', category: 'genre', type: 'genre',
  franchise: 'franchise', series: 'franchise',
  source: 'purchaseSource', 'purchase source': 'purchaseSource', store: 'purchaseSource', storefront: 'purchaseSource',
  notes: 'notes', comments: 'notes', review: 'notes', thoughts: 'notes',
};

const SAMPLE_TEMPLATE = 'Name, Price, Hours, Rating, Status, Platform, Genre\nElden Ring, 60, 85, 9, Completed, PC, RPG\nHades, 25, 40, 8, In Progress, Switch, Roguelike';

interface ParsedRow {
  raw: string[];
  name: string;
  price: number;
  hours: number;
  rating: number;
  status: GameStatus;
  platform?: string;
  genre?: string;
  franchise?: string;
  purchaseSource?: PurchaseSource;
  notes?: string;
  errors: string[];
  isDuplicate: boolean;
  excluded: boolean;
}

// Splits a delimited line into cells, respecting double-quoted fields that may
// contain the delimiter itself (basic CSV quoting — not a full RFC4180 parser).
function splitLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      cells.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

function detectDelimiter(firstLine: string): string {
  const tabCount = (firstLine.match(/\t/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  return tabCount >= commaCount && tabCount > 0 ? '\t' : ',';
}

function guessFieldForHeader(header: string): GameField {
  const key = header.toLowerCase().trim();
  return HEADER_ALIASES[key] || 'skip';
}

function parseNumber(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const cleaned = value.replace(/[^0-9.\-]/g, '');
  const num = parseFloat(cleaned);
  return Number.isFinite(num) ? num : fallback;
}

function parseStatus(value: string | undefined): GameStatus {
  if (!value) return 'Not Started';
  const normalized = value.trim().toLowerCase();
  const match = STATUS_VALUES.find(s => s.toLowerCase() === normalized);
  if (match) return match;
  if (normalized.includes('progress') || normalized.includes('playing')) return 'In Progress';
  if (normalized.includes('complet') || normalized.includes('done') || normalized.includes('finish')) return 'Completed';
  if (normalized.includes('wish')) return 'Wishlist';
  if (normalized.includes('abandon') || normalized.includes('drop')) return 'Abandoned';
  return 'Not Started';
}

function parseSource(value: string | undefined): PurchaseSource | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  const match = SOURCE_VALUES.find(s => s.toLowerCase() === normalized);
  return match;
}

export function LibraryImportModal({ onImportGames, onClose, existingGameNames }: LibraryImportModalProps) {
  const [step, setStep] = useState<'paste' | 'map' | 'preview'>('paste');
  const [rawText, setRawText] = useState('');
  const [hasHeaderRow, setHasHeaderRow] = useState(true);
  const [fieldMap, setFieldMap] = useState<GameField[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [dataLines, setDataLines] = useState<string[][]>([]);
  const [excludedRows, setExcludedRows] = useState<Set<number>>(new Set());
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);

  const existingNamesLower = useMemo(
    () => new Set(existingGameNames.map(n => n.toLowerCase().trim())),
    [existingGameNames]
  );

  const handleAnalyze = useCallback(() => {
    const lines = rawText.split('\n').map(l => l.trimEnd()).filter(l => l.trim().length > 0);
    if (lines.length === 0) return;

    const delimiter = detectDelimiter(lines[0]);
    const allRows = lines.map(l => splitLine(l, delimiter));
    const columnCount = allRows[0].length;

    let headerRow: string[];
    let body: string[][];
    if (hasHeaderRow) {
      headerRow = allRows[0];
      body = allRows.slice(1);
    } else {
      headerRow = Array.from({ length: columnCount }, (_, i) => `Column ${i + 1}`);
      body = allRows;
    }

    const guessedMap = headerRow.map(h => (hasHeaderRow ? guessFieldForHeader(h) : 'skip'));
    // If nothing was guessed as "name", fall back to the first column.
    if (!guessedMap.includes('name') && guessedMap.length > 0) {
      guessedMap[0] = 'name';
    }

    setHeaders(headerRow);
    setFieldMap(guessedMap);
    setDataLines(body);
    setExcludedRows(new Set());
    setStep('map');
  }, [rawText, hasHeaderRow]);

  const nameColumnIndex = fieldMap.indexOf('name');

  const parsedRows: ParsedRow[] = useMemo(() => {
    if (step !== 'preview') return [];
    return dataLines.map((cells, idx) => {
      const getValue = (field: GameField): string | undefined => {
        const colIdx = fieldMap.indexOf(field);
        return colIdx >= 0 ? cells[colIdx] : undefined;
      };

      const name = (nameColumnIndex >= 0 ? cells[nameColumnIndex] : '')?.trim() || '';
      const errors: string[] = [];
      if (!name) errors.push('Missing name');

      const isDuplicate = name.length > 0 && existingNamesLower.has(name.toLowerCase());

      return {
        raw: cells,
        name,
        price: parseNumber(getValue('price'), 0),
        hours: parseNumber(getValue('hours'), 0),
        rating: Math.max(0, Math.min(10, parseNumber(getValue('rating'), 0))),
        status: parseStatus(getValue('status')),
        platform: getValue('platform')?.trim() || undefined,
        genre: getValue('genre')?.trim() || undefined,
        franchise: getValue('franchise')?.trim() || undefined,
        purchaseSource: parseSource(getValue('purchaseSource')),
        notes: getValue('notes')?.trim() || undefined,
        errors,
        isDuplicate,
        excluded: excludedRows.has(idx),
      };
    });
  }, [step, dataLines, fieldMap, nameColumnIndex, existingNamesLower, excludedRows]);

  const validRows = parsedRows.filter(r => !r.excluded && r.errors.length === 0);

  const toggleExcluded = (idx: number) => {
    setExcludedRows(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  const handleImport = async () => {
    if (validRows.length === 0) return;
    setImporting(true);
    try {
      const games: Omit<Game, 'id' | 'userId' | 'createdAt' | 'updatedAt'>[] = validRows.map(row => ({
        name: row.name,
        price: row.price,
        hours: row.hours,
        rating: row.rating,
        status: row.status,
        platform: row.platform,
        genre: row.genre,
        franchise: row.franchise,
        purchaseSource: row.purchaseSource,
        notes: row.notes,
      }));
      await onImportGames(games);
      setImportResult(`Imported ${games.length} game${games.length !== 1 ? 's' : ''}!`);
      setTimeout(() => onClose(), 1200);
    } catch {
      setImportResult('Something went wrong during import. Please try again.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#12121a] border border-white/5 rounded-2xl w-full max-w-2xl max-h-[88vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/5 shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <FileSpreadsheet size={18} className="text-purple-400" />
              Import Library
            </h2>
            <p className="text-xs text-white/40 mt-0.5">
              Paste a spreadsheet export or CSV to bulk-add your games
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white/70 hover:bg-white/5 rounded-lg p-1.5 transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 px-4 pt-3 shrink-0 text-[11px]">
          {(['paste', 'map', 'preview'] as const).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <span
                className={clsx(
                  'w-5 h-5 rounded-full flex items-center justify-center font-medium',
                  step === s ? 'bg-purple-500 text-white' : 'bg-white/10 text-white/40'
                )}
              >
                {i + 1}
              </span>
              <span className={step === s ? 'text-white/80' : 'text-white/30'}>
                {s === 'paste' ? 'Paste data' : s === 'map' ? 'Map columns' : 'Preview & import'}
              </span>
              {i < 2 && <span className="text-white/20 mx-1">→</span>}
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {step === 'paste' && (
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-xs text-white/50">
                <input
                  type="checkbox"
                  checked={hasHeaderRow}
                  onChange={(e) => setHasHeaderRow(e.target.checked)}
                  className="rounded"
                />
                First row is a header row
              </label>
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder={`Paste CSV or spreadsheet rows here, e.g.:\n\n${SAMPLE_TEMPLATE}`}
                rows={10}
                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-white/90 placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-purple-500/50 font-mono"
              />
              <button
                type="button"
                onClick={() => setRawText(SAMPLE_TEMPLATE)}
                className="flex items-center gap-1.5 text-[11px] text-purple-400 hover:text-purple-300"
              >
                <ClipboardPaste size={12} /> Use example data
              </button>
              <p className="text-[11px] text-white/30">
                Works with copy-paste from Excel, Google Sheets, Steam library exports, or any
                comma/tab-separated text. You&apos;ll map columns and preview before anything is added.
              </p>
            </div>
          )}

          {step === 'map' && (
            <div className="space-y-3">
              <p className="text-xs text-white/40">
                We guessed a field for each column — adjust anything that looks wrong. At least one
                column must map to &quot;Name&quot;.
              </p>
              <div className="space-y-2">
                {headers.map((header, idx) => (
                  <div key={idx} className="flex items-center gap-3 bg-white/[0.03] rounded-lg p-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white/80 truncate font-medium">{header}</p>
                      <p className="text-[10px] text-white/30 truncate">
                        e.g. &quot;{dataLines[0]?.[idx] ?? ''}&quot;
                      </p>
                    </div>
                    <select
                      value={fieldMap[idx] || 'skip'}
                      onChange={(e) => {
                        const next = [...fieldMap];
                        next[idx] = e.target.value as GameField;
                        setFieldMap(next);
                      }}
                      className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white/80 focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                    >
                      {FIELD_ORDER.map(f => (
                        <option key={f} value={f} className="bg-[#1a1a2e]">
                          {FIELD_LABELS[f]}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
              {nameColumnIndex < 0 && (
                <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 rounded-lg p-2.5">
                  <AlertTriangle size={14} />
                  Map a column to &quot;Name&quot; to continue.
                </div>
              )}
              <p className="text-[11px] text-white/30">{dataLines.length} row{dataLines.length !== 1 ? 's' : ''} detected</p>
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <p className="text-white/50">
                  {validRows.length} of {parsedRows.length} row{parsedRows.length !== 1 ? 's' : ''} ready to import
                </p>
              </div>
              <div className="space-y-1.5 max-h-[40vh] overflow-y-auto">
                {parsedRows.map((row, idx) => (
                  <div
                    key={idx}
                    className={clsx(
                      'flex items-center gap-3 rounded-lg p-2.5 text-xs',
                      row.excluded
                        ? 'bg-white/[0.02] opacity-40'
                        : row.errors.length > 0
                          ? 'bg-red-500/10'
                          : row.isDuplicate
                            ? 'bg-amber-500/10'
                            : 'bg-white/[0.03]'
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => toggleExcluded(idx)}
                      className="shrink-0 text-white/30 hover:text-white/60"
                      title={row.excluded ? 'Include this row' : 'Exclude this row'}
                    >
                      {row.excluded ? <Trash2 size={14} /> : row.errors.length > 0 ? (
                        <AlertTriangle size={14} className="text-red-400" />
                      ) : (
                        <CheckCircle2 size={14} className="text-emerald-400/70" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-white/80 font-medium truncate">
                        {row.name || <span className="italic text-white/30">No name</span>}
                        {row.isDuplicate && !row.excluded && (
                          <span className="ml-2 text-[10px] text-amber-400 font-normal">already in library</span>
                        )}
                      </p>
                      <p className="text-white/30 truncate">
                        ${row.price} · {row.hours}h · {row.rating}/10 · {row.status}
                        {row.platform ? ` · ${row.platform}` : ''}
                        {row.genre ? ` · ${row.genre}` : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              {importResult && (
                <div className="flex items-center gap-2 text-sm text-emerald-400 bg-emerald-500/10 rounded-lg p-3">
                  <CheckCircle2 size={16} />
                  {importResult}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 p-4 border-t border-white/5 shrink-0">
          <button
            onClick={() => {
              if (step === 'map') setStep('paste');
              else if (step === 'preview') setStep('map');
              else onClose();
            }}
            className="px-4 py-2 text-sm text-white/50 hover:text-white/80 transition-all"
          >
            {step === 'paste' ? 'Cancel' : 'Back'}
          </button>
          {step === 'paste' && (
            <button
              onClick={handleAnalyze}
              disabled={rawText.trim().length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 disabled:opacity-40 disabled:hover:bg-purple-600 transition-all text-sm font-medium"
            >
              Continue
            </button>
          )}
          {step === 'map' && (
            <button
              onClick={() => setStep('preview')}
              disabled={nameColumnIndex < 0}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 disabled:opacity-40 disabled:hover:bg-purple-600 transition-all text-sm font-medium"
            >
              Preview
            </button>
          )}
          {step === 'preview' && (
            <button
              onClick={handleImport}
              disabled={importing || validRows.length === 0 || !!importResult}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 disabled:opacity-40 disabled:hover:bg-purple-600 transition-all text-sm font-medium"
            >
              <Upload size={14} />
              {importing ? 'Importing…' : `Import ${validRows.length} Game${validRows.length !== 1 ? 's' : ''}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
