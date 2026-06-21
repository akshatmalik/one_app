'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Loader2, CheckCircle2, AlertTriangle, ArrowLeft, ExternalLink, RefreshCw } from 'lucide-react';
import clsx from 'clsx';
import { Game } from '../lib/types';
import { ImportRow, ImportedGameData } from '../lib/import-service';
import {
  fetchSteamLibrary,
  mapSteamGamesToImportRows,
  buildAppIdMap,
  SteamOwnedGame,
} from '../lib/steam-import-service';
import { loadSteamSyncSettings, saveSteamSyncSettings } from '../lib/steam-settings';

interface SteamSyncModalProps {
  userId: string;
  games: Game[];
  onImport: (gameData: ImportedGameData) => Promise<Game>;
  onClose: () => void;
}

type Step = 'setup' | 'fetching' | 'preview' | 'importing' | 'done';

export function SteamSyncModal({ userId, games, onImport, onClose }: SteamSyncModalProps) {
  const settingsRef = useRef(loadSteamSyncSettings(userId));
  const [step, setStep] = useState<Step>('setup');
  const [steamId, setSteamId] = useState(settingsRef.current.steamId);
  const [apiKey, setApiKey] = useState(settingsRef.current.apiKey);
  const [remember, setRemember] = useState(!!(settingsRef.current.steamId || settingsRef.current.apiKey));
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [profileName, setProfileName] = useState<string | null>(null);
  const [steamGames, setSteamGames] = useState<SteamOwnedGame[]>([]);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [progress, setProgress] = useState(0);
  const [importedCount, setImportedCount] = useState(0);

  const lastSyncedAt = settingsRef.current.lastSyncedAt;

  // Re-derive rows whenever the live games list changes while previewing, so
  // duplicate flags stay accurate if the user adds something mid-flow.
  useEffect(() => {
    if (step !== 'preview') return;
    setRows(mapSteamGamesToImportRows(steamGames, games, settingsRef.current.importedAppIds));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const handleFetch = async () => {
    if (!steamId.trim() || !apiKey.trim()) return;
    setFetchError(null);
    setStep('fetching');

    if (remember) {
      saveSteamSyncSettings(userId, { ...settingsRef.current, steamId: steamId.trim(), apiKey: apiKey.trim() });
    }

    const result = await fetchSteamLibrary(steamId.trim(), apiKey.trim());
    if (!result.success) {
      setFetchError(result.error);
      setStep('setup');
      return;
    }
    if (result.games.length === 0) {
      setFetchError('Synced successfully, but no games were found on this account.');
      setStep('setup');
      return;
    }

    setProfileName(result.profileName);
    setSteamGames(result.games);
    setRows(mapSteamGamesToImportRows(result.games, games, settingsRef.current.importedAppIds));
    setStep('preview');

    // Remember the name -> appid mapping for every game on the account (not just
    // imported ones) so Achievement Hunter can look up achievements for games
    // already in the library without requiring a re-sync.
    if (remember) {
      const updated = {
        ...settingsRef.current,
        appIdMap: { ...settingsRef.current.appIdMap, ...buildAppIdMap(result.games) },
      };
      settingsRef.current = updated;
      saveSteamSyncSettings(userId, updated);
    }
  };

  const toggleRow = (rowIndex: number) => {
    setRows(prev => prev.map(r => (r.rowIndex === rowIndex ? { ...r, include: !r.include } : r)));
  };

  const includedRows = rows.filter(r => r.include);

  const handleConfirmImport = async () => {
    setStep('importing');
    let done = 0;
    const newlyImportedAppIds: number[] = [];
    for (const row of includedRows) {
      try {
        await onImport(row.data);
        const matching = steamGames.find(sg => sg.name === row.data.name);
        if (matching) newlyImportedAppIds.push(matching.appId);
      } catch {
        // Continue importing remaining rows even if one fails.
      }
      done++;
      setProgress(done);
    }
    setImportedCount(done);

    const updated = {
      ...settingsRef.current,
      steamId: remember ? steamId.trim() : settingsRef.current.steamId,
      apiKey: remember ? apiKey.trim() : settingsRef.current.apiKey,
      lastSyncedAt: new Date().toISOString(),
      importedAppIds: Array.from(new Set([...settingsRef.current.importedAppIds, ...newlyImportedAppIds])),
    };
    settingsRef.current = updated;
    saveSteamSyncSettings(userId, updated);

    setStep('done');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={step === 'importing' || step === 'fetching' ? undefined : onClose}>
      <div
        className="w-full max-w-lg max-h-[85vh] flex flex-col bg-[#0f0f1a] border border-white/10 rounded-2xl shadow-xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-2">
            {step === 'preview' && (
              <button onClick={() => setStep('setup')} className="p-1 text-white/30 hover:text-white/60 transition-colors -ml-1">
                <ArrowLeft size={16} />
              </button>
            )}
            <h3 className="text-lg font-bold text-white/90">Sync Steam Library</h3>
          </div>
          {step !== 'importing' && step !== 'fetching' && (
            <button onClick={onClose} className="p-1 text-white/30 hover:text-white/60 transition-colors">
              <X size={18} />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {step === 'setup' && (
            <div className="space-y-4">
              <p className="text-[12px] text-white/40 leading-relaxed">
                Pull every game you own on Steam — with real playtime — straight into your library. No manual
                entry. Your Steam profile and game details must be set to <span className="text-white/60">Public</span> for this to work.
              </p>

              <div className="space-y-1">
                <label className="text-[11px] text-white/40">Steam API key</label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder="Paste your key here"
                  className="w-full px-3 py-2 bg-white/[0.03] border border-white/10 rounded-lg text-[13px] text-white/80 placeholder:text-white/20 focus:outline-none focus:border-white/20"
                />
                <a
                  href="https://steamcommunity.com/dev/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-blue-400/80 hover:text-blue-400"
                >
                  Get a free key from steamcommunity.com/dev/apikey <ExternalLink size={10} />
                </a>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-white/40">SteamID64 or custom URL name</label>
                <input
                  type="text"
                  value={steamId}
                  onChange={e => setSteamId(e.target.value)}
                  placeholder="e.g. 76561198012345678 or your profile name"
                  className="w-full px-3 py-2 bg-white/[0.03] border border-white/10 rounded-lg text-[13px] text-white/80 placeholder:text-white/20 focus:outline-none focus:border-white/20"
                />
                <span className="text-[11px] text-white/25">
                  Find it on your Steam profile page URL — either steamcommunity.com/id/<span className="text-white/40">name</span> or .../profiles/<span className="text-white/40">number</span>
                </span>
              </div>

              <label className="flex items-center gap-2 text-[11px] text-white/40 cursor-pointer">
                <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} className="accent-purple-500" />
                Remember on this device (stored locally only — never synced to the cloud)
              </label>

              {lastSyncedAt && (
                <div className="text-[11px] text-white/30">Last synced {new Date(lastSyncedAt).toLocaleString()}</div>
              )}

              <button
                onClick={handleFetch}
                disabled={!steamId.trim() || !apiKey.trim()}
                className="w-full py-2.5 rounded-lg bg-purple-600/80 hover:bg-purple-600 disabled:bg-white/5 disabled:text-white/20 text-white text-sm font-medium transition-colors"
              >
                Fetch my library
              </button>

              {fetchError && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-[12px] text-red-300">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                  <span>{fetchError}</span>
                </div>
              )}
            </div>
          )}

          {step === 'fetching' && (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <Loader2 size={28} className="text-purple-400 animate-spin" />
              <div className="text-sm text-white/60">Talking to Steam…</div>
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-[12px] text-white/50">
                <span>{profileName ? `${profileName} · ` : ''}{rows.length} games found</span>
                <span>{includedRows.length} selected</span>
              </div>

              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-300">
                <RefreshCw size={13} className="shrink-0 mt-0.5" />
                <span>Already-imported and already-owned games are unchecked by default. Steam doesn&apos;t report purchase price, so price comes in as $0 — edit each game afterward if you want it.</span>
              </div>

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
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={row.data.thumbnail} alt="" className="w-12 h-6 object-cover rounded shrink-0 bg-white/5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[13px] text-white/80 font-medium truncate">{row.data.name}</span>
                        {row.isDuplicate && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wide bg-amber-500/15 text-amber-300">
                            already have it
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-white/30">{row.data.status} · {row.data.hours}h played</div>
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
                {importedCount} game{importedCount === 1 ? '' : 's'} imported from Steam
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
