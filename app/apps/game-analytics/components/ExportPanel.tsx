'use client';

import { useState } from 'react';
import { Download, FileSpreadsheet, FileJson, Clock, X } from 'lucide-react';
import { Game } from '../lib/types';
import { exportAsCSV, exportAsJSON, exportPlayLogsAsCSV, downloadFile } from '../lib/export-service';
import clsx from 'clsx';

interface ExportPanelProps {
  games: Game[];
  onClose: () => void;
}

export function ExportPanel({ games, onClose }: ExportPanelProps) {
  const [exported, setExported] = useState<string | null>(null);

  const ownedGames = games.filter(g => g.status !== 'Wishlist');
  const totalSessions = games.reduce((s, g) => s + (g.playLogs?.length || 0), 0);

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
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-white/90">Export Data</h3>
          <button onClick={onClose} className="p-1 text-white/30 hover:text-white/60 transition-colors">
            <X size={18} />
          </button>
        </div>

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
      </div>
    </div>
  );
}
