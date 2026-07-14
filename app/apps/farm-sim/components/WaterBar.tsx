'use client';

import { GameState } from '../lib/types';
import { RESERVOIR_CAP } from '../lib/balance';

interface Props {
  state: GameState;
}

export function WaterBar({ state }: Props) {
  const pct = Math.max(0, Math.min(100, (state.reservoir / RESERVOIR_CAP) * 100));
  const low = state.reservoir < 30;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-sky-100 bg-slate-900">
      <span>💧</span>
      <div className="flex-1 h-2.5 rounded-full bg-slate-700 overflow-hidden">
        <div
          className={`h-full transition-all ${low ? 'bg-red-500' : 'bg-sky-400'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="tabular-nums shrink-0">
        {Math.round(state.reservoir)}/{RESERVOIR_CAP}
      </span>
      {state.wells > 0 && (
        <span className="shrink-0 text-sky-300/70">
          🪣×{state.wells}
        </span>
      )}
    </div>
  );
}
