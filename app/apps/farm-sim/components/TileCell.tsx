'use client';

import { CropId, Tile, TileKind } from '../lib/types';
import { CROPS } from '../data/crops';

interface Props {
  tile: Tile;
  size: number;
  selected: boolean;
  expandable: boolean;
  onTap: () => void;
}

// Growth stage 0..3 → emoji font size.
function stageOf(tile: Tile): number {
  const crop = tile.crop;
  if (!crop) return -1;
  if (crop.mature) return 3;
  const def = CROPS[crop.cropId];
  const frac = def.growDays > 0 ? crop.growthDays / def.growDays : 0;
  if (frac >= 0.66) return 2;
  if (frac >= 0.33) return 1;
  return 0;
}

const KIND_BG: Record<TileKind, string> = {
  grass: 'bg-emerald-500',
  tilled: 'bg-[#8B5A2B]',
  channel: 'bg-blue-400',
  reservoir: 'bg-blue-600',
  well: 'bg-blue-300',
  sprinkler: 'bg-gray-400',
  barn: 'bg-red-800',
  coop: 'bg-yellow-700',
  shed: 'bg-amber-800',
  mill: 'bg-stone-500',
  depot: 'bg-stone-600',
  crate: 'bg-amber-700',
  path: 'bg-amber-200',
  brush: 'bg-green-800',
  rock: 'bg-stone-500',
  marsh: 'bg-cyan-900',
  locked: 'bg-gray-800',
};

export function TileCell({ tile, size, selected, expandable, onTap }: Props) {
  const stage = stageOf(tile);
  const crop = tile.crop;
  const def = crop ? CROPS[crop.cropId] : null;
  const stageFont = ['text-[9px]', 'text-xs', 'text-base', 'text-xl'][Math.max(0, stage)];

  // Moisture tint: a blue inner glow for tilled tiles.
  const moistureOpacity = tile.kind === 'tilled' ? Math.min(0.5, tile.moisture / 200) : 0;

  const dry = crop && def && tile.moisture < def.waterNeed;

  return (
    <button
      onClick={onTap}
      style={{ width: size, height: size }}
      className={`relative shrink-0 rounded-sm border transition-all ${KIND_BG[tile.kind]} ${
        selected ? 'border-yellow-300 ring-2 ring-yellow-300 z-10' : 'border-black/20'
      }`}
      aria-label={`tile ${tile.kind}`}
    >
      {/* moisture inner glow */}
      {moistureOpacity > 0 && (
        <span
          className="absolute inset-1 rounded-sm bg-sky-400 pointer-events-none"
          style={{ opacity: moistureOpacity }}
        />
      )}

      {/* reservoir / well / channel icons */}
      {tile.kind === 'reservoir' && <span className="absolute inset-0 grid place-items-center text-sm">🚰</span>}
      {tile.kind === 'well' && <span className="absolute inset-0 grid place-items-center text-sm">🪣</span>}
      {tile.kind === 'channel' && (
        <span className="absolute inset-0 grid place-items-center text-[10px] opacity-70">〜</span>
      )}

      {/* crop */}
      {def && (
        <span
          className={`absolute inset-0 grid place-items-center ${stageFont} ${
            crop!.mature ? 'animate-bounce' : ''
          }`}
        >
          {def.emoji}
        </span>
      )}

      {/* irrigated dot */}
      {tile.irrigated && (
        <span className="absolute top-0 right-0 text-[8px] leading-none">💧</span>
      )}

      {/* stressed badge */}
      {dry && <span className="absolute bottom-0 left-0 text-[9px] leading-none">🥀</span>}

    </button>
  );
}
