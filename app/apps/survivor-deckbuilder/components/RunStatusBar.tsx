'use client';

import { CardInstance } from '../lib/types';

interface RunStatusBarProps {
  stageNumber: number;
  totalStages: number;
  survivors: CardInstance[];
  cardsRemaining: number;
  totalCards: number;
  location?: string;
  isBarricaded?: boolean;
}

export function RunStatusBar({
  stageNumber,
  totalStages,
  survivors,
  cardsRemaining,
  totalCards,
  location,
  isBarricaded,
}: RunStatusBarProps) {
  return (
    <div className="bg-stone-950 border-b border-stone-800 px-4 py-2 sticky top-0 z-50">
      <div className="flex items-center justify-between mb-1.5">
        {/* Stage indicator */}
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-stone-600 font-mono tracking-widest uppercase">
            STAGE
          </span>
          <div className="flex gap-1 items-center">
            {Array.from({ length: totalStages }).map((_, i) => (
              <div
                key={i}
                className={`w-5 h-1.5 ${
                  i < stageNumber - 1
                    ? 'bg-stone-600'
                    : i === stageNumber - 1
                      ? 'bg-amber-600'
                      : 'bg-stone-800'
                }`}
              />
            ))}
          </div>
          <span className="text-[9px] text-stone-600 font-mono">
            {stageNumber}/{totalStages}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {isBarricaded && (
            <span className="text-[9px] text-amber-700 font-mono tracking-wider uppercase">
              ▦ FORTIFIED
            </span>
          )}
          {location && (
            <span className="text-[9px] text-stone-600 font-mono uppercase tracking-wider truncate max-w-[120px]">
              {location}
            </span>
          )}
          <span className="text-[9px] text-stone-700 font-mono">
            {cardsRemaining} cards
          </span>
        </div>
      </div>

      {/* Survivor HP */}
      <div className="flex items-center gap-3">
        {survivors.map(s => {
          const hp = s.currentHealth ?? 100;
          const maxHp = s.maxHealth ?? 100;
          const pct = (hp / maxHp) * 100;
          const dead = hp <= 0;

          return (
            <div key={s.id} className="flex-1">
              <div className="flex items-center justify-between mb-0.5">
                <span className={`text-[9px] font-mono uppercase tracking-wide truncate max-w-[60px] ${dead ? 'text-stone-700' : 'text-stone-500'}`}>
                  {s.name?.split(' ')[0]}
                </span>
                <span className={`text-[9px] font-mono ${dead ? 'text-stone-700' : 'text-stone-600'}`}>
                  {hp}
                </span>
              </div>
              <div className="h-0.5 bg-stone-800">
                <div
                  className={`h-full transition-all duration-500 ${
                    dead ? 'bg-stone-800' : pct > 60 ? 'bg-stone-500' : pct > 30 ? 'bg-amber-700' : 'bg-red-800'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
