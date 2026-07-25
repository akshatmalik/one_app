'use client';

import { useState } from 'react';
import { CropId, GameState, PlayerAction } from '../lib/types';
import { CROPS } from '../data/crops';
import { plantableCrops } from '../lib/engine/actions';

interface Props {
  state: GameState;
  selection: number[];
  selectedCrop: CropId | null;
  onQueue: (actions: PlayerAction[], label: string) => void;
  onClear: () => void;
}

export function BulkActionBar({ state, selection, selectedCrop, onQueue, onClear }: Props) {
  const [showSeeds, setShowSeeds] = useState(false);

  const grass = selection.filter((i) => state.tiles[i].kind === 'grass');
  const tilled = selection.filter((i) => state.tiles[i].kind === 'tilled');
  const emptyTilled = tilled.filter((i) => !state.tiles[i].crop);
  const mature = selection.filter((i) => state.tiles[i].crop?.mature);
  const clearable = selection.filter((i) => state.tiles[i].kind === 'brush' || state.tiles[i].kind === 'tree');
  const minable = selection.filter((i) => state.tiles[i].kind === 'rock' || state.tiles[i].kind === 'marsh');

  const run = (indices: number[], make: (idx: number) => PlayerAction, label: string) => {
    onQueue(indices.map(make), label);
    setShowSeeds(false);
    if (indices.length > 0) onClear();
  };

  const btn = 'min-h-10 rounded-md border border-white/10 bg-white/[0.06] px-3 text-[11px] font-semibold text-white disabled:opacity-30';

  return (
    <section aria-label="Selected tile actions" className="fixed inset-x-3 bottom-[4.5rem] z-30 mx-auto max-w-xl space-y-2 rounded-md border border-white/10 bg-[#0d1511]/95 p-2 text-white shadow-2xl backdrop-blur-xl">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold">
          {selection.length} tile{selection.length === 1 ? '' : 's'} selected
        </span>
        <button onClick={onClear} className="min-h-8 rounded-md px-2 text-[10px] text-white/50 hover:bg-white/10">
          Exit selection
        </button>
      </div>

      {selection.length === 0 ? <div className="py-1 text-[10px] text-white/45">Tap farm tiles to build a work list.</div> : null}

      {/* seed strip for bulk plant */}
      {showSeeds && (
        <div className="grid grid-cols-4 gap-1">
          {plantableCrops(state).map(({ crop, inSeason }) => {
            const def = CROPS[crop];
            const owned = state.seeds[crop] ?? 0;
            const can = inSeason && owned > 0;
            return (
              <button
                key={crop}
                disabled={!can}
                onClick={() => run(emptyTilled, (idx) => ({ type: 'plant', idx, crop }), `Planted ${def.name} on`)}
                className={`min-h-12 rounded-md border p-1 text-center ${
                  can ? 'border-[#8fc58c]/40 bg-[#8fc58c]/10' : 'border-white/10 bg-black/20 opacity-40'
                }`}
              >
                <div className="text-lg leading-none">{def.emoji}</div>
                <div className="mt-0.5 truncate text-[8px] text-white/75">{def.name}</div>
                <div className="text-[8px] text-white/40">{!inSeason ? 'off-season' : `×${owned}`}</div>
              </button>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-3 gap-1.5">
        <button
          disabled={!grass.length}
          onClick={() => run(grass, (idx) => ({ type: 'till', idx }), 'Tilled')}
          className={btn}
        >
          Till ({grass.length})
        </button>
        <button
          disabled={!emptyTilled.length}
          onClick={() => selectedCrop
            ? run(emptyTilled, (idx) => ({ type: 'plant', idx, crop: selectedCrop }), `Plant ${CROPS[selectedCrop].name}`)
            : setShowSeeds((s) => !s)}
          className={btn}
        >
          {showSeeds ? 'Hide seeds' : selectedCrop ? `Plant (${emptyTilled.length})` : `Plant… (${emptyTilled.length})`}
        </button>
        <button
          disabled={!tilled.length}
          onClick={() => run(tilled, (idx) => ({ type: 'water', idx }), 'Watered')}
          className={btn}
        >
          Water ({tilled.length})
        </button>
        <button
          disabled={!mature.length}
          onClick={() => run(mature, (idx) => ({ type: 'harvest', idx }), 'Harvested')}
          className={btn}
        >
          Harvest ({mature.length})
        </button>
        <button disabled={!clearable.length} onClick={() => run(clearable, (idx) => ({ type: 'clearLand', idx }), 'Clear selected land')} className={btn}>
          Clear ({clearable.length})
        </button>
        <button disabled={!minable.length} onClick={() => run(minable, (idx) => ({ type: 'mine', idx }), 'Mine selected deposits')} className={btn}>
          Mine ({minable.length})
        </button>
      </div>

      <div className="text-[9px] text-white/40">
        Valid tiles are sorted from the farmer and added to the work queue.
      </div>
    </section>
  );
}
