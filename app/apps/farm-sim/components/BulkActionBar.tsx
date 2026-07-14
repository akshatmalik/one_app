'use client';

import { useState } from 'react';
import { GameState, PlayerAction } from '../lib/types';
import { CROPS } from '../data/crops';
import { plantableCrops } from '../lib/engine/actions';

interface Props {
  state: GameState;
  selection: number[];
  dispatchMany: (actions: PlayerAction[]) => number;
  onApplied: (count: number, label: string) => void;
  onClear: () => void;
}

export function BulkActionBar({ state, selection, dispatchMany, onApplied, onClear }: Props) {
  const [showSeeds, setShowSeeds] = useState(false);

  const grass = selection.filter((i) => state.tiles[i].kind === 'grass');
  const tilled = selection.filter((i) => state.tiles[i].kind === 'tilled');
  const emptyTilled = tilled.filter((i) => !state.tiles[i].crop);
  const mature = selection.filter((i) => state.tiles[i].crop?.mature);

  const run = (indices: number[], make: (idx: number) => PlayerAction, label: string) => {
    const n = dispatchMany(indices.map(make));
    onApplied(n, label);
    setShowSeeds(false);
    if (n > 0) onClear();
  };

  const btn = 'rounded-lg px-3 py-2 text-xs font-semibold text-white disabled:opacity-40';

  return (
    <div className="bg-slate-800 rounded-t-xl p-3 space-y-2 max-h-[42vh] overflow-y-auto">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-white">
          {selection.length} tile{selection.length === 1 ? '' : 's'} selected
        </span>
        <button onClick={onClear} className="text-slate-400 text-xs px-2">
          Clear
        </button>
      </div>

      {selection.length === 0 && (
        <div className="text-xs text-slate-500">Tap tiles on the farm to select them.</div>
      )}

      {/* seed strip for bulk plant */}
      {showSeeds && (
        <div className="grid grid-cols-3 gap-1.5">
          {plantableCrops(state).map(({ crop, inSeason }) => {
            const def = CROPS[crop];
            const owned = state.seeds[crop] ?? 0;
            const can = inSeason && owned > 0;
            return (
              <button
                key={crop}
                disabled={!can}
                onClick={() => run(emptyTilled, (idx) => ({ type: 'plant', idx, crop }), `Planted ${def.name} on`)}
                className={`rounded-lg p-1.5 text-center border ${
                  can ? 'border-emerald-600 bg-emerald-900/50' : 'border-slate-700 bg-slate-900/50 opacity-50'
                }`}
              >
                <div className="text-lg leading-none">{def.emoji}</div>
                <div className="text-[9px] text-slate-300 mt-0.5">{def.name}</div>
                <div className="text-[9px] text-slate-500">{!inSeason ? 'off-season' : `×${owned}`}</div>
              </button>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          disabled={!grass.length}
          onClick={() => run(grass, (idx) => ({ type: 'till', idx }), 'Tilled')}
          className={`${btn} bg-amber-700`}
        >
          Till ({grass.length})
        </button>
        <button
          disabled={!emptyTilled.length}
          onClick={() => setShowSeeds((s) => !s)}
          className={`${btn} bg-emerald-700`}
        >
          {showSeeds ? 'Cancel' : `Plant… (${emptyTilled.length})`}
        </button>
        <button
          disabled={!tilled.length}
          onClick={() => run(tilled, (idx) => ({ type: 'water', idx }), 'Watered')}
          className={`${btn} bg-sky-700`}
        >
          Water ({tilled.length})
        </button>
        <button
          disabled={!mature.length}
          onClick={() => run(mature, (idx) => ({ type: 'harvest', idx }), 'Harvested')}
          className={`${btn} bg-yellow-600`}
        >
          Harvest ({mature.length})
        </button>
      </div>

      <div className="text-[10px] text-slate-500">
        Bulk actions apply to matching tiles until you run out of AP, seeds, or water.
      </div>
    </div>
  );
}
