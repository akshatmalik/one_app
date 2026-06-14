'use client';

import { useState, useEffect } from 'react';
import { Game } from '../lib/types';
import { getGenreGoalProgress } from '../lib/idea-analytics';
import { Target } from 'lucide-react';

interface GenreGoalsCardProps {
  games: Game[];
}

const TARGET_KEY = 'ga-genre-goal-target';

// NewIdeas100-June2026 — #38 Genre Goals.
export function GenreGoalsCard({ games }: GenreGoalsCardProps) {
  const [target, setTarget] = useState(5);

  useEffect(() => {
    const saved = localStorage.getItem(TARGET_KEY);
    if (saved) setTarget(parseInt(saved, 10) || 5);
  }, []);

  const updateTarget = (n: number) => {
    const clamped = Math.max(1, Math.min(30, n));
    setTarget(clamped);
    localStorage.setItem(TARGET_KEY, String(clamped));
  };

  const year = new Date().getFullYear();
  const { genresPlayed, count } = getGenreGoalProgress(games, year);
  const pct = Math.min(100, Math.round((count / target) * 100));
  const hit = count >= target;

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-white/80">
          <Target size={16} className="text-cyan-400" /> Genre Goal · {year}
        </div>
        <div className="flex items-center gap-1 text-xs text-white/40">
          <span>Target</span>
          <button onClick={() => updateTarget(target - 1)} className="h-5 w-5 rounded bg-white/10 hover:bg-white/20">−</button>
          <span className="w-5 text-center font-semibold text-white">{target}</span>
          <button onClick={() => updateTarget(target + 1)} className="h-5 w-5 rounded bg-white/10 hover:bg-white/20">+</button>
        </div>
      </div>
      <p className="mb-2 text-sm text-white/70">
        Played <span className="font-bold text-cyan-300">{count}</span> of {target} genres
        {hit ? ' — goal smashed! 🎉' : ` — ${target - count} to go.`}
      </p>
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
        <div className={`h-full rounded-full ${hit ? 'bg-emerald-400' : 'bg-cyan-400'}`} style={{ width: `${pct}%` }} />
      </div>
      {genresPlayed.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {genresPlayed.map((g) => (
            <span key={g} className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] text-white/60">
              {g}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
