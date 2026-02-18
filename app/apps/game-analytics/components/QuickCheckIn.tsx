'use client';

import { useState } from 'react';
import { Clock, Check, ChevronDown } from 'lucide-react';
import { Game, SessionMood } from '../lib/types';
import clsx from 'clsx';

interface QuickCheckInProps {
  game: Game;
  onLogTime: (hours: number, mood?: SessionMood) => void;
  onOpenFullLog: () => void;
}

export function QuickCheckIn({ game, onLogTime, onOpenFullLog }: QuickCheckInProps) {
  const avgSession = game.playLogs && game.playLogs.length > 0
    ? Math.round(game.playLogs.reduce((s, l) => s + l.hours, 0) / game.playLogs.length * 10) / 10
    : 2;

  const [hours, setHours] = useState(avgSession);
  const [mood, setMood] = useState<SessionMood | undefined>();
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    onLogTime(hours, mood);
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 2000);
  };

  const presets = [0.5, 1, 1.5, 2, 3, 4, 5, 6];

  return (
    <div className="p-4 bg-white/[0.03] rounded-xl border border-white/5">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        {game.thumbnail && (
          <img src={game.thumbnail} alt="" className="w-10 h-10 rounded-lg object-cover" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white/70">Check in to</p>
          <p className="text-base font-bold text-white/90 truncate">{game.name}</p>
        </div>
      </div>

      {/* Hour presets */}
      <div className="flex flex-wrap gap-2 mb-4">
        {presets.map(h => (
          <button
            key={h}
            onClick={() => setHours(h)}
            className={clsx(
              'px-3 py-2 rounded-lg text-sm font-medium transition-all',
              hours === h
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'bg-white/5 text-white/40 border border-transparent'
            )}
          >
            {h}h
          </button>
        ))}
      </div>

      {/* Custom slider */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs text-white/30 mb-1">
          <span>Custom</span>
          <span className="text-white/60 font-medium">{hours}h</span>
        </div>
        <input
          type="range"
          min="0.5"
          max="12"
          step="0.5"
          value={hours}
          onChange={(e) => setHours(parseFloat(e.target.value))}
          className="w-full"
        />
      </div>

      {/* Mood — one-tap */}
      <div className="flex gap-2 mb-4">
        {([
          { value: 'great' as SessionMood, label: '🔥', name: 'Great' },
          { value: 'good' as SessionMood, label: '👍', name: 'Good' },
          { value: 'meh' as SessionMood, label: '😐', name: 'Meh' },
          { value: 'grind' as SessionMood, label: '💪', name: 'Grind' },
        ]).map(opt => (
          <button
            key={opt.value}
            onClick={() => setMood(mood === opt.value ? undefined : opt.value)}
            className={clsx(
              'flex-1 flex flex-col items-center gap-0.5 py-2 rounded-lg text-xs transition-all',
              mood === opt.value
                ? 'bg-purple-500/15 text-purple-400 border border-purple-500/20'
                : 'bg-white/[0.02] text-white/30 border border-transparent',
            )}
          >
            <span className="text-base">{opt.label}</span>
            <span className="text-[9px]">{opt.name}</span>
          </button>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleSubmit}
          disabled={submitted}
          className={clsx(
            'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all',
            submitted
              ? 'bg-emerald-500/20 text-emerald-400'
              : 'bg-blue-600/30 text-blue-300 active:bg-blue-600/50'
          )}
        >
          {submitted ? (
            <><Check size={16} /> Logged!</>
          ) : (
            <><Clock size={16} /> Check In — {hours}h</>
          )}
        </button>
        <button
          onClick={onOpenFullLog}
          className="p-3 bg-white/5 text-white/30 rounded-xl transition-all active:bg-white/10"
          title="Add details"
        >
          <ChevronDown size={16} />
        </button>
      </div>
    </div>
  );
}
