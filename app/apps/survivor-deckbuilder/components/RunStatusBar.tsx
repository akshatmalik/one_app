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
    <div className="bg-stone-950 border-b border-stone-900 px-4 py-2 sticky top-0 z-50">
      {/* Row 1: stage + location + cards */}
      <div className="flex items-center justify-between mb-1.5">
        {/* Stage dots */}
        <div className="flex items-center gap-1.5">
          {Array.from({ length: totalStages }).map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all ${
                i < stageNumber - 1
                  ? 'w-2 h-2 bg-stone-600'
                  : i === stageNumber - 1
                    ? 'w-2.5 h-2.5 bg-amber-500'
                    : 'w-2 h-2 bg-stone-800'
              }`}
            />
          ))}
          <span className="text-[9px] text-stone-600 font-mono ml-0.5">
            {stageNumber}/{totalStages}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isBarricaded && (
            <span className="text-[9px] text-amber-700 font-mono">▦</span>
          )}
          {location && (
            <span className="text-[9px] text-stone-600 font-mono uppercase truncate max-w-[100px]">
              {location}
            </span>
          )}
          <span className="text-[9px] text-stone-700 font-mono">
            {cardsRemaining}/{totalCards}
          </span>
        </div>
      </div>

      {/* Row 2: Survivor HP — compact pills */}
      <div className="flex items-center gap-2">
        {survivors.map(s => {
          const hp = s.currentHealth ?? 100;
          const maxHp = s.maxHealth ?? 100;
          const pct = (hp / maxHp) * 100;
          const dead = hp <= 0;

          const barColor = dead
            ? 'bg-stone-800'
            : pct > 60
              ? 'bg-stone-500'
              : pct > 30
                ? 'bg-amber-600'
                : 'bg-red-700';

          return (
            <div key={s.id} className="flex items-center gap-1.5 flex-1 min-w-0">
              <span className={`text-[9px] font-mono uppercase truncate max-w-[40px] ${dead ? 'text-stone-700' : 'text-stone-500'}`}>
                {s.name?.split(' ')[0]}
              </span>
              <div className="flex-1 h-1 bg-stone-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className={`text-[9px] font-mono tabular-nums ${dead ? 'text-stone-700' : 'text-stone-600'}`}>
                {hp}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
