'use client';

import { useState } from 'react';
import { RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { TrackedGame } from '../lib/types';
import { GameSignals } from '../lib/types';
import { CompositeScore, formatViews, formatLastFetch } from '../lib/calculations';

interface Props {
  game: TrackedGame;
  signals: GameSignals;
  score: CompositeScore | undefined;
  onManualChange: (field: 'psStoreRank' | 'subredditGrowth' | 'trendsIndex', value: number | null) => void;
}

function ManualInput({ value, onChange, placeholder, prefix, suffix }: {
  value: number | null;
  onChange: (v: number | null) => void;
  placeholder: string;
  prefix?: string;
  suffix?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const display = value !== null ? String(value) : '';

  return (
    <div className="flex items-center gap-1">
      {prefix && <span className="text-gray-500 text-xs">{prefix}</span>}
      <input
        type="number"
        className="w-16 bg-gray-800 border border-white/10 rounded-md px-2 py-1 text-sm text-white text-center focus:outline-none focus:border-purple-500 transition-colors"
        placeholder={placeholder}
        value={editing ? draft : display}
        onFocus={() => { setEditing(true); setDraft(display); }}
        onChange={e => setDraft(e.target.value)}
        onBlur={() => {
          setEditing(false);
          const n = parseFloat(draft);
          onChange(isNaN(n) ? null : n);
        }}
        onKeyDown={e => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        }}
      />
      {suffix && <span className="text-gray-500 text-xs">{suffix}</span>}
    </div>
  );
}

export function SignalRow({ game, signals, score, onManualChange }: Props) {
  const confidence = score?.confidence ?? 0;
  const composite = score?.composite ?? 0;

  return (
    <div className="bg-gray-900/40 border border-white/8 rounded-xl p-4 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: game.coverColor }}
            />
            <h3 className="text-white font-medium text-sm">{game.name}</h3>
          </div>
          <p className="text-gray-500 text-xs mt-0.5 ml-5">{game.developer} · {game.platform.join(', ')} · {game.releaseWindow}</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold" style={{ color: game.coverColor }}>
            {composite > 0 ? composite.toFixed(1) : '—'}
          </div>
          <div className="text-xs text-gray-500">{Math.round(confidence * 100)}% data</div>
        </div>
      </div>

      {/* Signals grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {/* Trailer Views - auto */}
        <div className="space-y-1">
          <div className="flex items-center gap-1">
            <Wifi className="w-3 h-3 text-green-400" />
            <span className="text-xs text-gray-400">Trailer Views</span>
          </div>
          <div className="text-sm font-medium text-white">
            {signals.trailerViews !== null ? formatViews(signals.trailerViews) : <span className="text-gray-600">—</span>}
          </div>
          <div className="text-xs text-gray-600">{formatLastFetch(signals.lastYouTubeFetch)}</div>
        </div>

        {/* Wikipedia - auto */}
        <div className="space-y-1">
          <div className="flex items-center gap-1">
            <Wifi className="w-3 h-3 text-green-400" />
            <span className="text-xs text-gray-400">Wiki Views/day</span>
          </div>
          <div className="text-sm font-medium text-white">
            {signals.wikipediaViews !== null ? formatViews(signals.wikipediaViews) : <span className="text-gray-600">—</span>}
          </div>
          <div className="text-xs text-gray-600">{formatLastFetch(signals.lastWikipediaFetch)}</div>
        </div>

        {/* PS Store Rank - manual */}
        <div className="space-y-1">
          <div className="flex items-center gap-1">
            <WifiOff className="w-3 h-3 text-amber-400" />
            <span className="text-xs text-gray-400">PS Store Rank</span>
          </div>
          <ManualInput
            value={signals.psStoreRank}
            onChange={v => onManualChange('psStoreRank', v)}
            placeholder="rank"
            prefix="#"
          />
        </div>

        {/* Subreddit Growth - manual */}
        <div className="space-y-1">
          <div className="flex items-center gap-1">
            <WifiOff className="w-3 h-3 text-amber-400" />
            <span className="text-xs text-gray-400">Sub Growth %</span>
          </div>
          <ManualInput
            value={signals.subredditGrowth}
            onChange={v => onManualChange('subredditGrowth', v)}
            placeholder="0.0"
            suffix="%"
          />
        </div>

        {/* Trends Index - manual */}
        <div className="space-y-1">
          <div className="flex items-center gap-1">
            <WifiOff className="w-3 h-3 text-amber-400" />
            <span className="text-xs text-gray-400">Trends (0–100)</span>
          </div>
          <ManualInput
            value={signals.trendsIndex}
            onChange={v => onManualChange('trendsIndex', v)}
            placeholder="0–100"
          />
        </div>
      </div>
    </div>
  );
}
