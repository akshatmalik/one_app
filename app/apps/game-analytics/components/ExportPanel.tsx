'use client';

import { useRef, useState } from 'react';
import { Download, FileSpreadsheet, FileJson, Clock, X, Upload, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { Game } from '../lib/types';
import {
  exportAsCSV, exportAsJSON, exportPlayLogsAsCSV, downloadFile,
  parseImportFile, ImportDraft,
} from '../lib/export-service';
import clsx from 'clsx';

interface ExportPanelProps {
  games: Game[];
  onClose: () => void;
  onImportGame?: (gameData: Omit<Game, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<Game>;
}

type Mode = 'export' | 'import';
type ImportStep = 'choose' | 'preview' | 'importing' | 'done';

export function ExportPanel({ games, onClose, onImportGame }: ExportPanelProps) {
  const [mode, setMode] = useState<Mode>('export');
  const [exported, setExported] = useState<string | null>(null);

  // Import state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStep, setImportStep] = useState<ImportStep>('choose');
  const [fileError, setFileError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<ImportDraft[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [result, setResult] = useState<{ imported: number; skipped: number; failed: number } | null>(null);

  const ownedGames = games.filter(g => g.status !== 'Wishlist');
  const totalSessions = games.reduce((s, g) => s + (g.playLogs?.length || 0), 0);
  const existingNames = new Set(games.map(g => g.name.trim().toLowerCase()));

  const handleFileSelected = async (file: File) => {
    setFileError(null);
    try {
      const content = await file.text();
      const { drafts: parsed, errors } = parseImportFile(content, file.name);
      if (parsed.length === 0) {
        setFileError(errors[0] || 'No games found in that file.');
        return;
      }
      setDrafts(parsed);
      setParseErrors(errors);
      setImportStep('preview');
    } catch {
      setFileError('Could not read that file. Try a CSV or JSON export.');
    }
  };

  const duplicateCount = drafts.filter(d => existingNames.has(d.name.trim().toLowerCase())).length;
  const toImport = skipDuplicates ? drafts.filter(d => !existingNames.has(d.name.trim().toLowerCase())) : drafts;

  const handleImport = async () => {
    if (!onImportGame) return;
    setImportStep('importing');
    setProgress({ done: 0, total: toImport.length });

    let imported = 0;
    let failed = 0;
    for (const draft of toImport) {
      try {
        await onImportGame(draft);
        imported++;
      } catch {
        failed++;
      }
      setProgress(p => ({ ...p, done: p.done + 1 }));
    }

    setResult({ imported, skipped: drafts.length - toImport.length, failed });
    setImportStep('done');
  };

  const resetImport = () => {
    setImportStep('choose');
    setFileError(null);
    setDrafts([]);
    setParseErrors([]);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleExport = (type: 'csv' | 'json' | 'play-logs') => {
    const now = new Date().toISOString().substring(0, 10);

    switch (type) {
      case 'csv': {
        const content = exportAsCSV(games);
        downloadFile(content, `game-library-${now}.csv`, 'text/csv');
        setExported('csv');
        break;
      }
      case 'json': {
        const content = exportAsJSON(games);
        downloadFile(content, `game-library-${now}.json`, 'application/json');
        setExported('json');
        break;
      }
      case 'play-logs': {
        const content = exportPlayLogsAsCSV(games);
        downloadFile(content, `play-sessions-${now}.csv`, 'text/csv');
        setExported('play-logs');
        break;
      }
    }

    setTimeout(() => setExported(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md mx-4 p-6 bg-[#0f0f1a] border border-white/10 rounded-2xl shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white/90">{mode === 'export' ? 'Export Data' : 'Import Library'}</h3>
          <button onClick={onClose} className="p-1 text-white/30 hover:text-white/60 transition-colors">
            <X size={18} />
          </button>
        </div>

        {onImportGame && (
          <div className="flex gap-1 p-1 mb-5 rounded-lg bg-white/[0.03] border border-white/5">
            {(['export', 'import'] as Mode[]).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={clsx(
                  'flex-1 py-1.5 text-xs font-medium rounded-md capitalize transition-colors',
                  mode === m ? 'bg-white/10 text-white/90' : 'text-white/40 hover:text-white/60',
                )}
              >
                {m}
              </button>
            ))}
          </div>
        )}

        {mode === 'export' ? (
        <>
        {/* Stats summary */}
        <div className="flex gap-4 mb-5 text-[11px] text-white/40">
          <span>{games.length} games</span>
          <span>{ownedGames.length} owned</span>
          <span>{totalSessions} play sessions</span>
        </div>

        <div className="space-y-3">
          {/* CSV Export */}
          <button
            onClick={() => handleExport('csv')}
            className={clsx(
              'w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left',
              exported === 'csv'
                ? 'bg-emerald-500/10 border-emerald-500/20'
                : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04]',
            )}
          >
            <FileSpreadsheet size={20} className="text-emerald-400 shrink-0" />
            <div className="flex-1">
              <div className="text-sm text-white/80 font-medium">
                {exported === 'csv' ? 'Downloaded!' : 'Library as CSV'}
              </div>
              <div className="text-[11px] text-white/30">Spreadsheet-ready with all fields and calculated metrics</div>
            </div>
            <Download size={14} className="text-white/20" />
          </button>

          {/* JSON Export */}
          <button
            onClick={() => handleExport('json')}
            className={clsx(
              'w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left',
              exported === 'json'
                ? 'bg-emerald-500/10 border-emerald-500/20'
                : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04]',
            )}
          >
            <FileJson size={20} className="text-blue-400 shrink-0" />
            <div className="flex-1">
              <div className="text-sm text-white/80 font-medium">
                {exported === 'json' ? 'Downloaded!' : 'Library as JSON'}
              </div>
              <div className="text-[11px] text-white/30">Full data backup including play logs and metrics</div>
            </div>
            <Download size={14} className="text-white/20" />
          </button>

          {/* Play Logs CSV */}
          <button
            onClick={() => handleExport('play-logs')}
            className={clsx(
              'w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left',
              exported === 'play-logs'
                ? 'bg-emerald-500/10 border-emerald-500/20'
                : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04]',
            )}
          >
            <Clock size={20} className="text-purple-400 shrink-0" />
            <div className="flex-1">
              <div className="text-sm text-white/80 font-medium">
                {exported === 'play-logs' ? 'Downloaded!' : 'Play Sessions as CSV'}
              </div>
              <div className="text-[11px] text-white/30">Every play session with date, hours, game, and notes</div>
            </div>
            <Download size={14} className="text-white/20" />
          </button>
        </div>
        </>
        ) : (
        <div>
          {importStep === 'choose' && (
            <>
              <p className="text-[12px] text-white/40 mb-4 leading-relaxed">
                Restore a backup or bring in games from a CSV/JSON file. Bring your own spreadsheet — we&apos;ll
                match columns like Name, Status, Price, Hours, Rating, Platform, and Genre automatically.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.json,application/json,text/csv"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelected(file);
                }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex flex-col items-center justify-center gap-2 p-8 rounded-xl border-2 border-dashed border-white/10 hover:border-white/20 hover:bg-white/[0.02] transition-all text-center"
              >
                <Upload size={22} className="text-white/30" />
                <span className="text-sm text-white/70 font-medium">Choose a CSV or JSON file</span>
                <span className="text-[11px] text-white/30">Exported from this app, or your own spreadsheet</span>
              </button>
              {fileError && (
                <div className="mt-3 flex items-start gap-2 text-[12px] text-red-400/90 bg-red-500/5 border border-red-500/10 rounded-lg p-3">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                  <span>{fileError}</span>
                </div>
              )}
            </>
          )}

          {importStep === 'preview' && (
            <>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3 text-[11px] text-white/40">
                <span>{drafts.length} games found</span>
                {duplicateCount > 0 && <span className="text-amber-400/80">{duplicateCount} already in your library</span>}
                {parseErrors.length > 0 && <span className="text-red-400/80">{parseErrors.length} rows skipped</span>}
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1.5 mb-4 pr-1">
                {drafts.slice(0, 30).map((d, i) => {
                  const isDup = existingNames.has(d.name.trim().toLowerCase());
                  return (
                    <div
                      key={i}
                      className={clsx(
                        'flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-[12px]',
                        isDup ? 'bg-amber-500/5 border border-amber-500/10' : 'bg-white/[0.02] border border-white/5',
                      )}
                    >
                      <span className="text-white/70 truncate">{d.name}</span>
                      <span className={clsx('shrink-0 text-[10px]', isDup ? 'text-amber-400/70' : 'text-white/30')}>
                        {isDup ? 'duplicate' : d.status}
                      </span>
                    </div>
                  );
                })}
                {drafts.length > 30 && (
                  <div className="text-center text-[11px] text-white/30 py-1">+{drafts.length - 30} more</div>
                )}
              </div>

              {duplicateCount > 0 && (
                <label className="flex items-center gap-2 mb-4 text-[12px] text-white/60 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={skipDuplicates}
                    onChange={e => setSkipDuplicates(e.target.checked)}
                    className="rounded accent-purple-500"
                  />
                  Skip games already in your library
                </label>
              )}

              <div className="flex gap-2">
                <button
                  onClick={resetImport}
                  className="flex-1 py-2.5 rounded-xl text-sm text-white/50 border border-white/10 hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  disabled={toImport.length === 0}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-purple-600 text-white hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Import {toImport.length} game{toImport.length === 1 ? '' : 's'}
                </button>
              </div>
            </>
          )}

          {importStep === 'importing' && (
            <div className="flex flex-col items-center justify-center gap-3 py-10">
              <Loader2 size={24} className="text-purple-400 animate-spin" />
              <span className="text-sm text-white/60">Importing {progress.done} of {progress.total}…</span>
            </div>
          )}

          {importStep === 'done' && result && (
            <div className="flex flex-col items-center text-center gap-3 py-6">
              <CheckCircle2 size={28} className="text-emerald-400" />
              <div className="text-sm text-white/80 font-medium">
                Imported {result.imported} game{result.imported === 1 ? '' : 's'}
              </div>
              <div className="text-[11px] text-white/40">
                {result.skipped > 0 && `${result.skipped} skipped as duplicates. `}
                {result.failed > 0 && `${result.failed} failed to import.`}
              </div>
              <button
                onClick={resetImport}
                className="mt-2 px-4 py-2 rounded-xl text-sm text-white/60 border border-white/10 hover:bg-white/5 transition-colors"
              >
                Import another file
              </button>
            </div>
          )}
        </div>
        )}
      </div>
    </div>
  );
}
