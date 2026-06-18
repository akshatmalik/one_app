'use client';

import { useState, useRef } from 'react';
import { X, FileUp, AlertTriangle, Loader2, CheckCircle2, ArrowLeft } from 'lucide-react';
import { Game } from '../lib/types';
import { parseImportContent, ImportRow, ImportedGameData } from '../lib/import-service';
import clsx from 'clsx';

interface ImportModalProps {
  games: Game[];
  onImport: (gameData: ImportedGameData) => Promise<Game>;
  onClose: () => void;
}

type Step = 'pick' | 'preview' | 'importing' | 'done';

export function ImportModal({ games, onImport, onClose }: ImportModalProps) {
  const [step, setStep] = useState<Step>('pick');
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [skipped, setSkipped] = useState<{ rowIndex: number; reason: string }[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [pastedText, setPastedText] = useState('');
  const [progress, setProgress] = useState(0);
  const [importedCount, setImportedCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleParse = (content: string, filename: string) => {
    setParseError(null);
    const result = parseImportContent(content, filename, games);
    if (result.rows.length === 0) {
      setParseError(
        result.skippedRows[0]?.reason || 'No valid games found in this file.'
      );
      return;
    }
    setRows(result.rows);
    setSkipped(result.skippedRows);
    setStep('preview');
  };

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const content = typeof reader.result === 'string' ? reader.result : '';
      handleParse(content, file.name);
    };
    reader.readAsText(file);
  };

  const handlePasteImport = () => {
    if (!pastedText.trim()) return;
    handleParse(pastedText, 'pasted.csv');
  };

  const toggleRow = (rowIndex: number) => {
    setRows(prev => prev.map(r => (r.rowIndex === rowIndex ? { ...r, include: !r.include } : r)));
  };

  const includedRows = rows.filter(r => r.include);

  const handleConfirmImport = async () => {
    setStep('importing');
    let done = 0;
    for (const row of includedRows) {
      try {
        await onImport(row.data);
      } catch {
        // Continue importing remaining rows even if one fails.
      }
      done++;
      setProgress(done);
    }
    setImportedCount(done);
    setStep('done');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={step === 'importing' ? undefined : onClose}>
      <div
        className="w-full max-w-lg max-h-[85vh] flex flex-col bg-[#0f0f1a] border border-white/10 rounded-2xl shadow-xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-2">
            {step === 'preview' && (
              <button onClick={() => setStep('pick')} className="p-1 text-white/30 hover:text-white/60 transition-colors -ml-1">
                <ArrowLeft size={16} />
              </button>
            )}
            <h3 className="text-lg font-bold text-white/90">Import Games</h3>
          </div>
          {step !== 'importing' && (
            <button onClick={onClose} className="p-1 text-white/30 hover:text-white/60 transition-colors">
              <X size={18} />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {step === 'pick' && (
            <div className="space-y-4">
              <p className="text-[12px] text-white/40 leading-relaxed">
                Bring in games from a CSV or JSON file — your own export from this app, or a spreadsheet you put
                together yourself. Only <span className="text-white/60">Name</span> is required; everything else
                (price, hours, rating, status, dates, notes) is optional.
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.json,text/csv,application/json"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center gap-4 p-4 rounded-xl border border-dashed border-white/15 bg-white/[0.02] hover:bg-white/[0.04] transition-all text-left"
              >
                <FileUp size={20} className="text-blue-400 shrink-0" />
                <div className="flex-1">
                  <div className="text-sm text-white/80 font-medium">Choose a file</div>
                  <div className="text-[11px] text-white/30">.csv or .json</div>
                </div>
              </button>

              <div className="flex items-center gap-2 text-[11px] text-white/30">
                <div className="flex-1 h-px bg-white/5" />
                <span>or paste CSV</span>
                <div className="flex-1 h-px bg-white/5" />
              </div>

              <textarea
                value={pastedText}
                onChange={e => setPastedText(e.target.value)}
                placeholder="Name,Status,Price,Total Hours,Rating,Platform,Genre&#10;Elden Ring,Completed,60,90,9.5,PlayStation,RPG"
                rows={5}
                className="w-full px-3 py-2 bg-white/[0.03] border border-white/10 rounded-lg text-[12px] text-white/80 placeholder:text-white/20 font-mono focus:outline-none focus:border-white/20 resize-none"
              />
              <button
                onClick={handlePasteImport}
                disabled={!pastedText.trim()}
                className="w-full py-2.5 rounded-lg bg-purple-600/80 hover:bg-purple-600 disabled:bg-white/5 disabled:text-white/20 text-white text-sm font-medium transition-colors"
              >
                Parse pasted text
              </button>

              {parseError && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-[12px] text-red-300">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                  <span>{parseError}</span>
                </div>
              )}
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-[12px] text-white/50">
                <span>{rows.length} games found</span>
                <span>{includedRows.length} selected</span>
              </div>

              {skipped.length > 0 && (
                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300">
                  <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                  <span>{skipped.length} row{skipped.length === 1 ? '' : 's'} skipped (missing a name)</span>
                </div>
              )}

              <div className="space-y-1.5 max-h-[40vh] overflow-y-auto">
                {rows.map(row => (
                  <label
                    key={row.rowIndex}
                    className={clsx(
                      'flex items-start gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors',
                      row.include ? 'bg-white/[0.03] border-white/10' : 'bg-white/[0.01] border-white/5 opacity-50'
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={row.include}
                      onChange={() => toggleRow(row.rowIndex)}
                      className="mt-0.5 accent-purple-500"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[13px] text-white/80 font-medium truncate">{row.data.name}</span>
                        {row.isDuplicate && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wide bg-amber-500/15 text-amber-300">
                            already in library
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-white/30">
                        {row.data.status} · {row.data.platform || 'No platform'} · {row.data.hours}h
                      </div>
                      {row.warnings.map((w, i) => (
                        <div key={i} className="text-[10px] text-amber-300/70 mt-0.5">{w}</div>
                      ))}
                    </div>
                  </label>
                ))}
              </div>

              <button
                onClick={handleConfirmImport}
                disabled={includedRows.length === 0}
                className="w-full py-2.5 rounded-lg bg-purple-600/80 hover:bg-purple-600 disabled:bg-white/5 disabled:text-white/20 text-white text-sm font-medium transition-colors"
              >
                Import {includedRows.length} game{includedRows.length === 1 ? '' : 's'}
              </button>
            </div>
          )}

          {step === 'importing' && (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <Loader2 size={28} className="text-purple-400 animate-spin" />
              <div className="text-sm text-white/60">Importing {progress} / {includedRows.length}…</div>
            </div>
          )}

          {step === 'done' && (
            <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
              <CheckCircle2 size={32} className="text-emerald-400" />
              <div className="text-base text-white/80 font-medium">
                {importedCount} game{importedCount === 1 ? '' : 's'} imported
              </div>
              <div className="text-[12px] text-white/40">Your library has been updated.</div>
              <button
                onClick={onClose}
                className="mt-2 px-5 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white/80 text-sm font-medium transition-colors"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
