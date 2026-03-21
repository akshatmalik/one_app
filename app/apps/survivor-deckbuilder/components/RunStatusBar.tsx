'use client';

import { CardInstance } from '../lib/types';

interface RunStatusBarProps {
  stageNumber: number;
  totalStages: number;
  survivors: CardInstance[];
  cardsRemaining: number;
  totalCards: number;
  location?: string;
}

export function RunStatusBar({
  stageNumber,
  totalStages,
  survivors,
  cardsRemaining,
  totalCards,
  location,
}: RunStatusBarProps) {
  return (
    <div className="bg-black/60 backdrop-blur-md border-b border-white/10 px-4 py-3 sticky top-0 z-50">
      {/* Top row: stage + location */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {/* Stage pips */}
          <div className="flex gap-1">
            {Array.from({ length: totalStages }).map((_, i) => (
              <div
                key={i}
                className={`w-2.5 h-2.5 rounded-full border ${
                  i < stageNumber
                    ? 'bg-green-500 border-green-400'
                    : i === stageNumber - 1
                      ? 'bg-amber-500 border-amber-400 animate-pulse'
                      : 'bg-white/10 border-white/20'
                }`}
              />
            ))}
          </div>
          <span className="text-[10px] text-white/40 font-mono">
            STAGE {stageNumber}/{totalStages}
          </span>
        </div>

        {location && (
          <span className="text-[10px] text-white/50 font-semibold uppercase tracking-wider">
            ◆ {location}
          </span>
        )}
      </div>

      {/* Bottom row: survivor HP + deck count */}
      <div className="flex items-center gap-3">
        {/* Survivor HP bars */}
        {survivors.map(s => {
          const hp = s.currentHealth ?? 100;
          const maxHp = s.maxHealth ?? 100;
          const pct = (hp / maxHp) * 100;

          return (
            <div key={s.id} className="flex-1">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[9px] text-white/50 font-semibold truncate max-w-[60px]">
                  {s.name?.split(' ')[0]}
                </span>
                <span className="text-[9px] text-white/30 font-mono">{hp}</span>
              </div>
              <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    pct > 60 ? 'bg-emerald-500' : pct > 30 ? 'bg-amber-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}

        {/* Deck count */}
        <div className="flex flex-col items-center pl-2 border-l border-white/10">
          <span className="text-sm font-bold text-white/70">{cardsRemaining}</span>
          <span className="text-[8px] text-white/30 uppercase">Deck</span>
        </div>
      </div>
    </div>
  );
}
