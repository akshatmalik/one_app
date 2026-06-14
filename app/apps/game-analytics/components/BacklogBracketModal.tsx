'use client';

import { useState, useMemo } from 'react';
import { Game } from '../lib/types';
import { X, Trophy, Swords } from 'lucide-react';

interface BacklogBracketModalProps {
  games: Game[];
  onClose: () => void;
  onChampion?: (game: Game) => void; // e.g. add to queue / start
}

function seedBracket(games: Game[], size: number): Game[] {
  // Prefer Not Started / In Progress owned games, shuffle, take `size`.
  const pool = games.filter((g) => g.status === 'Not Started' || g.status === 'In Progress');
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, size);
}

// NewIdeas100-June2026 — #68 Backlog Bracket tournament.
export function BacklogBracketModal({ games, onClose, onChampion }: BacklogBracketModalProps) {
  const size = useMemo(() => {
    const eligible = games.filter((g) => g.status === 'Not Started' || g.status === 'In Progress').length;
    return eligible >= 8 ? 8 : eligible >= 4 ? 4 : 2;
  }, [games]);

  const [round, setRound] = useState<Game[]>(() => seedBracket(games, size));
  const [nextRound, setNextRound] = useState<Game[]>([]);
  const [matchIdx, setMatchIdx] = useState(0);
  const [champion, setChampion] = useState<Game | null>(null);

  const eligibleCount = games.filter((g) => g.status === 'Not Started' || g.status === 'In Progress').length;

  const pick = (winner: Game) => {
    const advanced = [...nextRound, winner];
    const nextMatch = matchIdx + 2;
    if (nextMatch >= round.length) {
      // Round complete
      if (advanced.length === 1) {
        setChampion(advanced[0]);
        return;
      }
      setRound(advanced);
      setNextRound([]);
      setMatchIdx(0);
    } else {
      setNextRound(advanced);
      setMatchIdx(nextMatch);
    }
  };

  const a = round[matchIdx];
  const b = round[matchIdx + 1];
  const roundName =
    round.length >= 8 ? 'Quarterfinal' : round.length === 4 ? 'Semifinal' : round.length === 2 ? 'Final' : 'Match';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#12121a] p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Swords size={16} className="text-orange-400" /> Backlog Bracket
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white/80">
            <X size={18} />
          </button>
        </div>

        {eligibleCount < 2 ? (
          <p className="py-8 text-center text-sm text-white/40">Need at least 2 unfinished games to run a bracket.</p>
        ) : champion ? (
          <div className="py-6 text-center">
            <Trophy size={40} className="mx-auto mb-3 text-yellow-400" />
            <p className="text-xs uppercase tracking-wide text-white/40">Champion — play this next</p>
            <p className="mt-1 text-xl font-bold text-white">{champion.name}</p>
            <div className="mt-4 flex gap-2">
              <button onClick={onClose} className="flex-1 rounded-xl bg-white/5 px-4 py-2.5 text-sm text-white/70 hover:bg-white/10">
                Close
              </button>
              {onChampion && (
                <button
                  onClick={() => {
                    onChampion(champion);
                    onClose();
                  }}
                  className="flex-1 rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-purple-500"
                >
                  Add to Up Next
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            <p className="mb-3 text-center text-xs uppercase tracking-wide text-white/40">{roundName} · pick the winner</p>
            <div className="flex items-stretch gap-3">
              {[a, b].map((g, i) => (
                <button
                  key={g?.id || i}
                  onClick={() => g && pick(g)}
                  className="flex-1 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-center transition-all hover:border-purple-400/40 hover:bg-purple-500/10"
                >
                  {g?.thumbnail ? (
                    <img src={g.thumbnail} alt={g.name} className="mx-auto mb-2 h-20 w-20 rounded-lg object-cover" />
                  ) : (
                    <div className="mx-auto mb-2 flex h-20 w-20 items-center justify-center rounded-lg bg-white/5 text-2xl">🎮</div>
                  )}
                  <p className="text-sm font-medium text-white">{g?.name}</p>
                  <p className="text-[10px] text-white/40">{g?.genre || ''}</p>
                </button>
              ))}
            </div>
            <p className="mt-3 text-center text-[10px] text-white/30">VS — tap your choice to advance it</p>
          </>
        )}
      </div>
    </div>
  );
}
