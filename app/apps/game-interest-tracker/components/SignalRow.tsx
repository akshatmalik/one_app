'use client';

import { useState } from 'react';
import { Wifi, WifiOff, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { TrackedGame, GameSignals } from '../lib/types';
import { CompositeScore, formatViews, formatLastFetch, formatLikeRate } from '../lib/calculations';

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
        onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
      />
      {suffix && <span className="text-gray-500 text-xs">{suffix}</span>}
    </div>
  );
}

export function SignalRow({ game, signals, score, onManualChange }: Props) {
  const [showVideos, setShowVideos] = useState(false);
  const composite = score?.composite ?? 0;
  const confidence = score?.confidence ?? 0;
  const buzz = signals.youtubeBuzz;

  return (
    <div className="bg-gray-900/40 border border-white/8 rounded-xl p-4 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: game.coverColor }} />
            <h3 className="text-white font-medium text-sm">{game.name}</h3>
          </div>
          <p className="text-gray-500 text-xs mt-0.5 ml-5">
            {game.developer} · {game.platform.join(', ')} · {game.releaseWindow}
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold" style={{ color: game.coverColor }}>
            {composite > 0 ? composite.toFixed(1) : '—'}
          </div>
          <div className="text-xs text-gray-500">{Math.round(confidence * 100)}% data</div>
        </div>
      </div>

      {/* Signal grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">

        {/* YouTube Buzz — auto */}
        <div className="space-y-1 col-span-2 sm:col-span-2">
          <div className="flex items-center gap-1">
            <Wifi className="w-3 h-3 text-green-400" />
            <span className="text-xs text-gray-400">YouTube Buzz</span>
          </div>
          {buzz ? (
            <div className="space-y-0.5">
              <div className="text-sm font-medium text-white">{formatViews(buzz.totalViews)} views</div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>{formatLikeRate(buzz.likeRate)} liked</span>
                <span>·</span>
                <span>{buzz.topVideos.length} videos</span>
                <button
                  onClick={() => setShowVideos(v => !v)}
                  className="flex items-center gap-0.5 text-purple-400 hover:text-purple-300 transition-colors"
                >
                  {showVideos ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  details
                </button>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-600">—</div>
          )}
          <div className="text-xs text-gray-600">{formatLastFetch(signals.lastYouTubeFetch)}</div>
        </div>

        {/* Wikipedia — auto */}
        <div className="space-y-1">
          <div className="flex items-center gap-1">
            <Wifi className="w-3 h-3 text-green-400" />
            <span className="text-xs text-gray-400">Wiki/day</span>
          </div>
          <div className="text-sm font-medium text-white">
            {signals.wikipediaViews !== null ? formatViews(signals.wikipediaViews) : <span className="text-gray-600">—</span>}
          </div>
          <div className="text-xs text-gray-600">{formatLastFetch(signals.lastWikipediaFetch)}</div>
        </div>

        {/* PS Store Rank — manual */}
        <div className="space-y-1">
          <div className="flex items-center gap-1">
            <WifiOff className="w-3 h-3 text-amber-400" />
            <span className="text-xs text-gray-400">PS Store #</span>
          </div>
          <ManualInput value={signals.psStoreRank} onChange={v => onManualChange('psStoreRank', v)} placeholder="rank" prefix="#" />
        </div>

        {/* Subreddit Growth — manual */}
        <div className="space-y-1">
          <div className="flex items-center gap-1">
            <WifiOff className="w-3 h-3 text-amber-400" />
            <span className="text-xs text-gray-400">Sub Growth</span>
          </div>
          <ManualInput value={signals.subredditGrowth} onChange={v => onManualChange('subredditGrowth', v)} placeholder="0.0" suffix="%" />
        </div>

      </div>

      {/* Trends — manual, below grid so it doesn't break 5-col layout */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <WifiOff className="w-3 h-3 text-amber-400" />
          <span className="text-xs text-gray-400">Google Trends (0–100):</span>
        </div>
        <ManualInput value={signals.trendsIndex} onChange={v => onManualChange('trendsIndex', v)} placeholder="0–100" />
      </div>

      {/* Top videos expanded */}
      {showVideos && buzz && buzz.topVideos.length > 0 && (
        <div className="border-t border-white/5 pt-3 space-y-2">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
            Top {buzz.topVideos.length} Videos · Buzz score: {buzz.buzzScore.toLocaleString()}
          </p>
          <div className="space-y-1.5">
            {buzz.topVideos.slice(0, 5).map((v, i) => (
              <div key={v.videoId} className="flex items-start gap-2">
                <span className="text-xs text-gray-600 w-4 flex-shrink-0 mt-0.5">{i + 1}.</span>
                <div className="flex-1 min-w-0">
                  <a
                    href={`https://youtube.com/watch?v=${v.videoId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-gray-300 hover:text-white transition-colors flex items-center gap-1 truncate"
                  >
                    <span className="truncate">{v.title}</span>
                    <ExternalLink className="w-2.5 h-2.5 flex-shrink-0" />
                  </a>
                  <div className="flex items-center gap-2 text-xs text-gray-600 mt-0.5">
                    <span>{formatViews(v.views)} views</span>
                    <span>·</span>
                    <span>{formatViews(v.likes)} likes</span>
                    <span>·</span>
                    <span>{v.channelTitle}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {buzz.topVideos.length > 5 && (
            <p className="text-xs text-gray-600">+{buzz.topVideos.length - 5} more included in score</p>
          )}
        </div>
      )}
    </div>
  );
}
