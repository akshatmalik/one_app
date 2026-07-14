'use client';

import { useState } from 'react';
import { GameState } from '../lib/types';
import { GRID_SIZE } from '../lib/balance';
import { TileCell } from './TileCell';
import { validActions } from '../lib/engine/actions';

interface Props {
  state: GameState;
  selectedIdx: number | null;
  onSelect: (idx: number) => void;
}

export function FarmGrid({ state, selectedIdx, onSelect }: Props) {
  const [zoomed, setZoomed] = useState(true);
  const size = zoomed ? 30 : 22;

  return (
    <div className="relative flex-1 overflow-auto bg-emerald-900/40 p-2">
      <button
        onClick={() => setZoomed((z) => !z)}
        className="sticky top-0 left-full z-20 float-right mb-1 rounded bg-black/50 px-2 py-1 text-[10px] text-white"
      >
        {zoomed ? '➖ zoom out' : '➕ zoom in'}
      </button>
      <div
        className="grid gap-0.5 mx-auto w-fit"
        style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, ${size}px)` }}
      >
        {state.tiles.map((tile, idx) => (
          <TileCell
            key={idx}
            tile={tile}
            size={size}
            selected={selectedIdx === idx}
            expandable={validActions(state, idx).includes('expand')}
            onTap={() => onSelect(idx)}
          />
        ))}
      </div>
    </div>
  );
}
