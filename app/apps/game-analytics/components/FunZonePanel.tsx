'use client';

import { useState } from 'react';
import { Game } from '../lib/types';
import { getSurpriseMe, getGamingSpiritAnimal, getLibraryYearbook } from '../lib/idea-fun';
import { Dices, Sparkles } from 'lucide-react';

interface FunZonePanelProps {
  games: Game[];
}

// NewIdeas100-June2026 — Wave 2: the Fun Zone (#100 Surprise Me, spirit animal, yearbook).
export function FunZonePanel({ games }: FunZonePanelProps) {
  const [seed, setSeed] = useState(() => Date.now());
  const surprise = getSurpriseMe(games, seed);
  const animal = getGamingSpiritAnimal(games);
  const yearbook = getLibraryYearbook(games);

  return (
    <div className="space-y-4">
      {/* Surprise Me (#100) */}
      <div className="rounded-xl border border-pink-500/20 bg-gradient-to-br from-pink-500/10 via-purple-500/10 to-blue-500/10 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-white/50">
            <Sparkles size={14} /> Surprise Me
          </div>
          <button
            onClick={() => setSeed(Math.floor(Math.random() * 1_000_000))}
            className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/20"
          >
            <Dices size={14} /> Surprise me
          </button>
        </div>
        <div className="mt-3 flex items-start gap-3">
          <span className="text-3xl">{surprise.emoji}</span>
          <div>
            <p className="text-sm font-semibold text-white">{surprise.title}</p>
            <p className="text-sm text-white/60">{surprise.body}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Spirit Animal */}
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <div className="mb-2 text-sm font-semibold text-white/80">Gaming Spirit Animal</div>
          <div className="flex items-center gap-3">
            <span className="text-4xl">{animal.emoji}</span>
            <div>
              <p className="font-semibold text-white">{animal.animal}</p>
              <p className="text-xs text-white/50">{animal.blurb}</p>
            </div>
          </div>
        </div>

        {/* Yearbook */}
        {yearbook.length > 0 && (
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <div className="mb-2 text-sm font-semibold text-white/80">Library Yearbook</div>
            <div className="space-y-1.5">
              {yearbook.map((y) => (
                <div key={y.title} className="flex items-center justify-between text-sm">
                  <span className="text-white/50">
                    {y.emoji} {y.title}
                  </span>
                  <span className="truncate pl-2 font-medium text-white">{y.game}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
