'use client';

import { useMemo } from 'react';
import { X, Radar, Gamepad2, Sparkles } from 'lucide-react';
import { Game } from '../lib/types';
import { getReplayCandidates, ReplayCandidate } from '../lib/calculations';
import { formatCurrency } from '../lib/format';

interface ReplayRadarModalProps {
  games: Game[];
  onOpenGame: (gameId: string) => void;
  onClose: () => void;
}

function ReplayRow({ candidate, onOpenGame }: { candidate: ReplayCandidate; onOpenGame: (gameId: string) => void }) {
  const { game } = candidate;
  return (
    <button
      onClick={() => onOpenGame(game.id)}
      className="w-full flex items-center gap-3 p-2.5 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition-colors text-left"
    >
      {game.thumbnail ? (
        <img src={game.thumbnail} alt={game.name} className="w-12 h-12 object-cover rounded-lg shrink-0" loading="lazy" />
      ) : (
        <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
          <Gamepad2 size={18} className="text-white/20" />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div className="text-[13px] text-white/85 font-medium truncate">{game.name}</div>
          <span
            className="text-[10px] px-1.5 py-0.5 rounded font-medium whitespace-nowrap shrink-0"
            style={{ color: candidate.tierColor, backgroundColor: candidate.tierBgColor }}
          >
            {candidate.tier}
          </span>
        </div>
        <div className="text-[11px] text-white/35 mt-0.5 truncate">{candidate.headline}</div>
        <div className="text-[10px] text-white/25 mt-1">
          {candidate.totalHours}h played · {candidate.daysSinceLastPlayed}d dormant
          {candidate.costPerHour > 0 && <> · {formatCurrency(candidate.costPerHour)}/hr</>}
        </div>
      </div>
    </button>
  );
}

export function ReplayRadarModal({ games, onOpenGame, onClose }: ReplayRadarModalProps) {
  const candidates = useMemo(() => getReplayCandidates(games), [games]);
  const topTier = useMemo(() => candidates.filter(c => c.tier === 'Overdue').length, [candidates]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg max-h-[85vh] flex flex-col bg-[#0f0f1a] border border-white/10 rounded-2xl shadow-xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-2">
            <Radar size={18} className="text-emerald-400" />
            <h3 className="text-lg font-bold text-white/90">Replay Radar</h3>
          </div>
          <button onClick={onClose} className="p-1 text-white/30 hover:text-white/60 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {candidates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
              <Radar size={28} className="text-white/15" />
              <div className="text-[13px] text-white/40">Nothing dormant worth flagging right now</div>
              <div className="text-[11px] text-white/25 max-w-xs">
                Games you&apos;ve put down for 3+ weeks will show up here, ranked by how worth it a revisit would be.
              </div>
            </div>
          ) : (
            <>
              {topTier > 0 && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/20">
                  <Sparkles size={14} className="text-emerald-400 shrink-0" />
                  <div className="text-[12px] text-emerald-100/80">
                    <span className="text-white/90 font-medium">{topTier} game{topTier === 1 ? '' : 's'}</span> are
                    overdue for a replay — high rating or unfinished business, sitting dormant.
                  </div>
                </div>
              )}
              <div className="space-y-2">
                {candidates.map(candidate => (
                  <ReplayRow key={candidate.game.id} candidate={candidate} onOpenGame={onOpenGame} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
