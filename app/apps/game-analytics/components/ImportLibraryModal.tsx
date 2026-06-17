'use client';

import { useMemo, useRef, useState } from 'react';
import { X, Upload, FileText, Download, CheckCircle2, AlertTriangle, ArrowLeft, Loader2 } from 'lucide-react';
import { Game } from '../lib/types';
import {
  parseCSV,
  detectColumnMapping,
  buildGameFromRow,
  generateTemplateCSV,
  IMPORT_FIELD_OPTIONS,
  ImportField,
  ImportRowResult,
} from '../lib/import-service';
import { downloadFile } from '../lib/export-service';
import clsx from 'clsx';

interface ImportLibraryModalProps {
  onImport: (games: Omit<Game, 'id' | 'userId' | 'createdAt' | 'updatedAt'>[]) => Promise<void>;
  onClose: () => void;
  existingGameNames: string[];
}

type Step = 'input' | 'review' | 'done';

const PREVIEW_LIMIT = 30;

export function ImportLibraryModal({ onImport, onClose, existingGameNames }: ImportLibraryModalProps) {
  const [step, setStep] = useState<Step>('input');
  const [rawText, setRawText] = useState('');
  const [hasHeader, setHasHeader] = useState(true);
  const [forceWishlist, setForceWishlist] = useState(false);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [headerLabels, setHeaderLabels] = useState<string[]>([]);
  const [dataRows, setDataRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<ImportField[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const existingNamesLower = useMemo(
    () => new Set(existingGameNames.map(n => n.toLowerCase())),
    [existingGameNames]
  );

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => setRawText(String(reader.result || ''));
    reader.readAsText(file);
  };

  const handleParse = () => {
    const rows = parseCSV(rawText);
    if (rows.length === 0) {
      setParseError('Couldn\'t find any rows in that data — paste CSV text or a simple list of game names.');
      return;
    }

    let header: string[];
    let data: string[][];
    let detected: ImportField[];

    if (hasHeader) {
      header = rows[0];
      data = rows.slice(1);
      detected = detectColumnMapping(header);
      // If nothing in the header matched a known field, treat column 0 as the name
      if (!detected.some(f => f !== 'skip') && header.length > 0) {
        detected[0] = 'name';
      }
    } else {
      header = rows[0].map((_, i) => `Column ${i + 1}`);
      data = rows;
      detected = header.map((_, i) => (i === 0 ? 'name' : 'skip'));
    }

    if (data.length === 0) {
      setParseError('That looked like only a header row — add at least one game.');
      return;
    }

    setHeaderLabels(header);
    setDataRows(data);
    setMapping(detected);
    setParseError(null);
    setStep('review');
  };

  const preview: ImportRowResult[] = useMemo(
    () => dataRows.map(row => buildGameFromRow(row, mapping, existingNamesLower, forceWishlist)),
    [dataRows, mapping, existingNamesLower, forceWishlist]
  );

  const validNew = preview.filter(r => r.data && !(skipDuplicates && r.isDuplicate));
  const duplicateCount = preview.filter(r => r.isDuplicate).length;
  const invalidCount = preview.filter(r => !r.data).length;

  const updateMapping = (colIndex: number, field: ImportField) => {
    setMapping(prev => prev.map((f, i) => (i === colIndex ? field : f)));
  };

  const handleImport = async () => {
    if (validNew.length === 0 || importing) return;
    setImporting(true);
    setParseError(null);
    try {
      const games = validNew.map(r => r.data!);
      await onImport(games);
      setImportResult({ imported: games.length, skipped: preview.length - games.length });
      setStep('done');
    } catch (e) {
      setParseError(`Import failed: ${(e as Error).message}`);
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadTemplate = () => {
    downloadFile(generateTemplateCSV(), 'game-library-template.csv', 'text/csv');
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#12121a] border border-white/5 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/5 shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-white">Import Library</h2>
            <p className="text-xs text-white/40 mt-0.5">Bring in games from a spreadsheet, Steam export, or a plain list</p>
          </div>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white/70 hover:bg-white/5 rounded-lg p-1.5 transition-all"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Step 1: Input */}
          {step === 'input' && (
            <>
              <div className="border border-dashed border-white/10 rounded-xl p-5 text-center">
                <Upload size={22} className="text-white/30 mx-auto mb-2" />
                <p className="text-sm text-white/60 mb-3">Upload a CSV file</p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/70 text-xs font-medium rounded-lg transition-all"
                >
                  Choose file
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv,text/plain"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) handleFile(file);
                    e.target.value = '';
                  }}
                />
              </div>

              <div className="flex items-center gap-2 text-white/20 text-[11px]">
                <div className="flex-1 h-px bg-white/5" />
                OR PASTE
                <div className="flex-1 h-px bg-white/5" />
              </div>

              <textarea
                value={rawText}
                onChange={e => setRawText(e.target.value)}
                placeholder={'Name,Status,Price,Total Hours,Rating\nElden Ring,Completed,59.99,87,9.5\nHades II,Wishlist,29.99,0,0\n\nOr just paste a plain list of game names, one per line.'}
                rows={8}
                className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/5 text-white text-sm rounded-lg focus:outline-none focus:border-purple-500/40 font-mono placeholder:text-white/20 resize-none"
              />

              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 text-xs text-white/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasHeader}
                    onChange={e => setHasHeader(e.target.checked)}
                    className="accent-purple-500"
                  />
                  First row is a header
                </label>
                <button
                  onClick={handleDownloadTemplate}
                  className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/60 transition-colors"
                >
                  <Download size={12} /> Download CSV template
                </button>
              </div>

              {parseError && (
                <div className="flex items-start gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-300">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5" /> {parseError}
                </div>
              )}
            </>
          )}

          {/* Step 2: Mapping + Preview */}
          {step === 'review' && (
            <>
              <div className="flex flex-wrap items-center gap-3 px-3 py-2 bg-white/[0.03] rounded-lg text-xs">
                <span className="text-emerald-400 font-medium">{validNew.length} to import</span>
                {duplicateCount > 0 && <span className="text-amber-400/80">{duplicateCount} duplicate{duplicateCount !== 1 ? 's' : ''}</span>}
                {invalidCount > 0 && <span className="text-white/30">{invalidCount} missing a name</span>}
                <span className="text-white/30">· {dataRows.length} row{dataRows.length !== 1 ? 's' : ''} total</span>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 text-xs text-white/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={skipDuplicates}
                    onChange={e => setSkipDuplicates(e.target.checked)}
                    className="accent-purple-500"
                  />
                  Skip games already in your library
                </label>
                <label className="flex items-center gap-2 text-xs text-white/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={forceWishlist}
                    onChange={e => setForceWishlist(e.target.checked)}
                    className="accent-purple-500"
                  />
                  Import all as Wishlist
                </label>
              </div>

              {/* Column mapping */}
              <div>
                <p className="text-[11px] text-white/30 mb-1.5">Map each column to a field</p>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {headerLabels.map((label, i) => (
                    <div key={i} className="shrink-0 w-36">
                      <div className="text-[10px] text-white/40 truncate mb-1" title={label}>{label}</div>
                      <select
                        value={mapping[i] || 'skip'}
                        onChange={e => updateMapping(i, e.target.value as ImportField)}
                        className="w-full px-2 py-1.5 bg-white/[0.03] border border-white/5 text-white text-xs rounded-lg focus:outline-none"
                      >
                        {IMPORT_FIELD_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {/* Preview table */}
              <div className="border border-white/5 rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-white/[0.03] text-white/40 text-left">
                      <th className="px-3 py-2 font-medium">Name</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                      <th className="px-3 py-2 font-medium">Price</th>
                      <th className="px-3 py-2 font-medium">Hours</th>
                      <th className="px-3 py-2 font-medium">Rating</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.slice(0, PREVIEW_LIMIT).map((r, i) => (
                      <tr
                        key={i}
                        className={clsx(
                          'border-t border-white/5',
                          !r.data && 'bg-red-500/5 text-white/30',
                          r.data && r.isDuplicate && 'bg-amber-500/5 text-white/40',
                          r.data && !r.isDuplicate && 'text-white/70'
                        )}
                      >
                        <td className="px-3 py-1.5 truncate max-w-[180px]">
                          {r.name || <span className="italic text-red-400/70">missing name</span>}
                        </td>
                        <td className="px-3 py-1.5">{r.data?.status || '—'}</td>
                        <td className="px-3 py-1.5">{r.data ? `$${r.data.price.toFixed(2)}` : '—'}</td>
                        <td className="px-3 py-1.5">{r.data ? r.data.hours : '—'}</td>
                        <td className="px-3 py-1.5">{r.data ? r.data.rating : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {preview.length > PREVIEW_LIMIT && (
                  <div className="px-3 py-2 text-[11px] text-white/30 border-t border-white/5">
                    + {preview.length - PREVIEW_LIMIT} more row{preview.length - PREVIEW_LIMIT !== 1 ? 's' : ''}
                  </div>
                )}
              </div>

              {parseError && (
                <div className="flex items-start gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-300">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5" /> {parseError}
                </div>
              )}
            </>
          )}

          {/* Step 3: Done */}
          {step === 'done' && importResult && (
            <div className="flex flex-col items-center justify-center text-center py-8 gap-3">
              <CheckCircle2 size={40} className="text-emerald-400" />
              <p className="text-white font-semibold text-lg">
                {importResult.imported} game{importResult.imported !== 1 ? 's' : ''} added!
              </p>
              {importResult.skipped > 0 && (
                <p className="text-white/40 text-sm">{importResult.skipped} row{importResult.skipped !== 1 ? 's' : ''} skipped (duplicates or missing a name)</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 p-4 border-t border-white/5 shrink-0">
          {step === 'review' ? (
            <button
              onClick={() => setStep('input')}
              className="flex items-center gap-1.5 px-3 py-2 text-white/50 hover:text-white/80 text-xs font-medium transition-all"
            >
              <ArrowLeft size={14} /> Back
            </button>
          ) : (
            <div className="flex items-center gap-1.5 text-white/30 text-xs">
              <FileText size={14} /> CSV or plain text
            </div>
          )}

          {step === 'input' && (
            <button
              onClick={handleParse}
              disabled={!rawText.trim()}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-white/10 disabled:text-white/30 text-white text-sm font-medium rounded-lg transition-all"
            >
              Continue
            </button>
          )}
          {step === 'review' && (
            <button
              onClick={handleImport}
              disabled={validNew.length === 0 || importing}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-white/10 disabled:text-white/30 text-white text-sm font-medium rounded-lg transition-all"
            >
              {importing && <Loader2 size={14} className="animate-spin" />}
              Import {validNew.length} Game{validNew.length !== 1 ? 's' : ''}
            </button>
          )}
          {step === 'done' && (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg transition-all ml-auto"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
