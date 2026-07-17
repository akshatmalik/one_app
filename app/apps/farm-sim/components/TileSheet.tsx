'use client';

import { useState } from 'react';
import { CropId, GameState, PlayerAction } from '../lib/types';
import { CROPS } from '../data/crops';
import { validActions, plantableCrops, expansionCost } from '../lib/engine/actions';
import { harvestYield } from '../lib/engine/crops';
import { connectedChannels } from '../lib/engine/water';
import { getPrice } from '../lib/engine/market';
import { MANUAL_WATER_DRAW, GOLD_COST, MAX_WELLS } from '../lib/balance';

interface Props {
  state: GameState;
  idx: number;
  dispatch: (a: PlayerAction) => boolean;
  onClose: () => void;
}

function Bar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className="w-14 text-slate-400">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-slate-700 overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
      <span className="w-8 text-right tabular-nums text-slate-300">{Math.round(value)}</span>
    </div>
  );
}

export function TileSheet({ state, idx, dispatch, onClose }: Props) {
  const [showSeeds, setShowSeeds] = useState(false);
  const tile = state.tiles[idx];
  const actions = validActions(state, idx);

  const btn =
    'flex-1 rounded-lg px-3 py-2 text-sm font-semibold text-white disabled:opacity-40 transition-colors';

  return (
    <div className="bg-slate-800 rounded-t-xl p-3 space-y-2 max-h-[42vh] overflow-y-auto">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white capitalize">
          {tile.crop ? CROPS[tile.crop.cropId].name : tile.kind === 'tilled' ? 'Tilled soil' : tile.kind}
        </h3>
        <button onClick={onClose} className="text-slate-400 text-lg leading-none px-2">
          ✕
        </button>
      </div>

      {/* ── PLANTED CROP ── */}
      {tile.crop && (
        <div className="space-y-2">
          <div className="text-xs text-slate-300">
            {tile.crop.mature ? (
              <span className="text-emerald-400 font-semibold">Ready to harvest!</span>
            ) : (
              <>
                Night {tile.crop.growthDays}/{CROPS[tile.crop.cropId].growDays}
                {tile.crop.regrowCounter ? ` · regrowing (${tile.crop.regrowCounter}d)` : ''}
                {' · '}drinks {CROPS[tile.crop.cropId].waterNeed}/night
              </>
            )}
          </div>
          <Bar label="Moisture" value={tile.moisture} color="bg-sky-400" />
          <Bar label="Soil N" value={tile.nitrogen} color="bg-lime-500" />
          {!tile.crop.mature && tile.moisture < CROPS[tile.crop.cropId].waterNeed && (
            <div className="text-[11px] font-semibold text-red-400">
              ⚠️ Will stress tonight — water it or lose growth.
            </div>
          )}
        </div>
      )}

      {/* ── EMPTY TILLED ── */}
      {tile.kind === 'tilled' && !tile.crop && (
        <div className="space-y-2">
          <Bar label="Moisture" value={tile.moisture} color="bg-sky-400" />
          <Bar label="Soil N" value={tile.nitrogen} color="bg-lime-500" />
        </div>
      )}

      {/* ── GRASS ── */}
      {tile.kind === 'grass' && (
        <div className="text-xs text-slate-400">Open grass · soil N {Math.round(tile.nitrogen)}</div>
      )}

      {/* ── CHANNEL / WELL connectivity ── */}
      {(tile.kind === 'channel' || tile.kind === 'well') && (
        <div className="text-xs">
          {tile.kind === 'channel' &&
            (connectedChannels(state.tiles).has(idx) ? (
              <span className="text-emerald-400">Connected to reservoir ✓</span>
            ) : (
              <span className="text-red-400">DISCONNECTED — carries no water ✗</span>
            ))}
          {tile.kind === 'well' && <span className="text-sky-300">Well · +30 water/night</span>}
        </div>
      )}

      {/* ── SEED STRIP (plant) ── */}
      {showSeeds && actions.includes('plant') && (
        <div className="grid grid-cols-3 gap-1.5 pt-1">
          {plantableCrops(state).map(({ crop, inSeason }) => {
            const def = CROPS[crop];
            const owned = state.seeds[crop] ?? 0;
            const canPlant = inSeason && owned > 0;
            return (
              <button
                key={crop}
                disabled={!canPlant}
                onClick={() => {
                  if (dispatch({ type: 'plant', idx, crop })) setShowSeeds(false);
                }}
                className={`rounded-lg p-1.5 text-center border ${
                  canPlant
                    ? 'border-emerald-600 bg-emerald-900/50'
                    : 'border-slate-700 bg-slate-900/50 opacity-50'
                }`}
              >
                <div className="text-lg leading-none">{def.emoji}</div>
                <div className="text-[9px] text-slate-300 mt-0.5">{def.name}</div>
                <div className="text-[9px] text-slate-500">
                  {!inSeason ? 'off-season' : `×${owned}`}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* ── ACTION BUTTONS ── */}
      <div className="flex gap-2 pt-1">
        {actions.includes('till') && (
          <button onClick={() => dispatch({ type: 'till', idx })} className={`${btn} bg-amber-700`}>
            Till <span className="opacity-70">1⚡</span>
          </button>
        )}
        {actions.includes('plant') && (
          <button
            onClick={() => setShowSeeds((s) => !s)}
            className={`${btn} bg-emerald-700`}
          >
            {showSeeds ? 'Cancel' : 'Plant…'}
          </button>
        )}
        {actions.includes('water') && (
          <button
            onClick={() => dispatch({ type: 'water', idx })}
            disabled={state.reservoir < MANUAL_WATER_DRAW}
            className={`${btn} bg-sky-700`}
          >
            Water <span className="opacity-70">1⚡💧{MANUAL_WATER_DRAW}</span>
          </button>
        )}
        {actions.includes('harvest') && tile.crop && (
          <button
            onClick={() => dispatch({ type: 'harvest', idx })}
            className={`${btn} bg-yellow-600`}
          >
            Harvest{' '}
            <span className="opacity-80">
              →{harvestYield(tile)} ≈{Math.round(harvestYield(tile) * getPrice(state, tile.crop.cropId))}g
            </span>
          </button>
        )}
        {actions.includes('buildChannel') && (
          <button
            onClick={() => dispatch({ type: 'buildChannel', idx })}
            disabled={state.gold < GOLD_COST.channel}
            className={`${btn} bg-sky-800`}
          >
            Channel <span className="opacity-70">2⚡ {GOLD_COST.channel}g</span>
          </button>
        )}
        {actions.includes('digWell') && (
          <button
            onClick={() => dispatch({ type: 'digWell', idx })}
            disabled={state.gold < GOLD_COST.well || state.wells >= MAX_WELLS}
            className={`${btn} bg-slate-600`}
          >
            Well <span className="opacity-70">3⚡ {GOLD_COST.well}g</span>
          </button>
        )}
        {actions.includes('demolish') && (
          <button onClick={() => dispatch({ type: 'demolish', idx })} className={`${btn} bg-red-800`}>
            Demolish <span className="opacity-70">1⚡</span>
          </button>
        )}
        {actions.includes('expand') && (
          <button
            onClick={() => dispatch({ type: 'expand', idx })}
            disabled={state.gold < expansionCost(idx)}
            className={`${btn} bg-purple-700`}
          >
            Buy land <span className="opacity-70">{expansionCost(idx)}g</span>
          </button>
        )}
      </div>
    </div>
  );
}
