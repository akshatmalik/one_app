'use client';

import { useEffect, useState } from 'react';
import { GameState, Tile } from '../lib/types';
import { PlayerState, facingTileIdx, standingTileIdx } from '../lib/realtime/player';
import { GRID_SIZE } from '../lib/balance';
import { TILE_PX } from '../render/camera';

interface Props {
  state: GameState;
  player: PlayerState | null;
  fps: number;
}

function tileDesc(t: Tile | undefined): string {
  if (!t) return 'oob';
  const crop = t.crop ? ` [${t.crop.cropId} g${t.crop.growthDays}${t.crop.mature ? ' ✓' : ''}]` : '';
  return `${t.kind} m:${Math.round(t.moisture)} n:${Math.round(t.nitrogen)}${crop}`;
}

export function DevOverlay({ state, player, fps }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '`' || e.key === '~') setVisible(v => !v);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!visible || !player) return null;

  const fIdx = facingTileIdx(player, GRID_SIZE);
  const sIdx = standingTileIdx(player, GRID_SIZE);
  const facingTile = fIdx !== null ? state.tiles[fIdx] : undefined;
  const standingTile = state.tiles[sIdx];

  const col = Math.floor((player.x + 12) / TILE_PX);
  const row = Math.floor((player.y + 30) / TILE_PX);

  const rows: [string, string][] = [
    ['FPS',      `${fps}`],
    ['pos',      `px(${Math.round(player.x)}, ${Math.round(player.y)}) tile(${col}, ${row})`],
    ['facing',   `${player.facing} → idx ${fIdx ?? 'null'}`],
    ['tool',     player.tool],
    ['water💧',  `${player.waterCharges}`],
    ['standing', tileDesc(standingTile)],
    ['facing↑',  tileDesc(facingTile)],
    ['day',      `${state.day}`],
    ['gold',     `${Math.round(state.gold)}`],
    ['time',     `${state.time}`],
    ['reservoir',`${Math.round(state.reservoir)}`],
    ['tiles',    `${state.tiles.length}`],
  ];

  return (
    <div className="absolute top-16 right-2 z-50 pointer-events-none font-mono text-[10px] leading-relaxed">
      <div className="bg-black/80 border border-white/20 rounded-lg px-3 py-2 text-white/90 min-w-[240px]">
        <div className="text-yellow-400 font-bold mb-1">DEV  (` to toggle)</div>
        {rows.map(([k, v]) => (
          <div key={k} className="flex gap-2">
            <span className="text-white/40 w-20 shrink-0">{k}</span>
            <span className="text-green-300 break-all">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
