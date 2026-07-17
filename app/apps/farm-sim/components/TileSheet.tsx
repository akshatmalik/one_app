'use client';

import { useEffect, useState } from 'react';
import {
  Droplets,
  Hammer,
  Package,
  Pickaxe,
  Route,
  Shovel,
  Sprout,
  Trash2,
  Wheat,
  X,
} from 'lucide-react';
import { CropId, GameState, PlayerAction } from '../lib/types';
import { CROPS } from '../data/crops';
import { validActions, plantableCrops } from '../lib/engine/actions';
import { harvestYield } from '../lib/engine/crops';
import { connectedChannels } from '../lib/engine/water';
import { MANUAL_WATER_DRAW, GOLD_COST, MAX_WELLS } from '../lib/balance';

interface Props {
  state: GameState;
  idx: number;
  inRange: boolean;
  isWalking: boolean;
  waterCharges: number;
  dispatch: (action: PlayerAction) => boolean;
  onClose: () => void;
}

function Meter({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px] font-medium text-white/50">
        <span>{label}</span><span className="tabular-nums text-white/70">{Math.round(value)}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
    </div>
  );
}

function tileTitle(state: GameState, idx: number) {
  const tile = state.tiles[idx];
  if (tile.crop) return CROPS[tile.crop.cropId].name;
  const labels: Partial<Record<typeof tile.kind, string>> = {
    grass: 'Open ground', tilled: 'Tilled soil', channel: 'Irrigation channel',
    reservoir: 'Reservoir', well: 'Farm well', sprinkler: 'Sprinkler', shed: 'Farmhouse',
    mill: 'Flour mill', depot: 'Shipping depot', crate: 'Field crate', path: 'Farm road',
    brush: 'Dense brush', rock: 'Boulder', marsh: 'Wet ground', locked: 'Unowned land',
  };
  return labels[tile.kind] ?? tile.kind;
}

export function TileSheet({ state, idx, inRange, isWalking, waterCharges, dispatch, onClose }: Props) {
  const [showSeeds, setShowSeeds] = useState(false);
  const tile = state.tiles[idx];
  const actions = validActions(state, idx);

  useEffect(() => setShowSeeds(false), [idx]);

  const run = (action: PlayerAction) => {
    if (!inRange) return;
    if (dispatch(action)) navigator.vibrate?.(12);
  };
  const actionClass = 'flex min-h-12 items-center justify-center gap-2 rounded-md border border-white/10 bg-white/[0.06] px-3 text-xs font-semibold text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-35';

  return (
    <section
      aria-label={`Selected tile: ${tileTitle(state, idx)}`}
      onPointerDown={(event) => event.stopPropagation()}
      className="pointer-events-auto absolute inset-x-0 bottom-0 z-30 max-h-[62dvh] overflow-y-auto border-t border-white/10 bg-[#101713]/[0.98] pb-[max(0.75rem,env(safe-area-inset-bottom))] text-white shadow-[0_-18px_55px_rgba(0,0,0,0.38)] backdrop-blur-xl md:bottom-4 md:left-auto md:right-4 md:w-[360px] md:rounded-md md:border"
    >
      <div className="sticky top-0 z-10 flex min-h-14 items-center gap-3 border-b border-white/10 bg-[#101713]/95 px-4 backdrop-blur-xl">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-bold">{tileTitle(state, idx)}</h2>
          <p className="mt-0.5 text-[10px] text-white/45">
            {isWalking ? 'Walking into range' : inRange ? 'Ready to work' : 'Select a reachable edge'}
          </p>
        </div>
        <button type="button" onPointerDown={(event) => { event.stopPropagation(); onClose(); }} aria-label="Close tile details" className="grid size-10 place-items-center rounded-md text-white/55 hover:bg-white/10 hover:text-white">
          <X size={18} />
        </button>
      </div>

      <div className="space-y-4 p-4">
        {tile.crop ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-md bg-black/20 px-3 py-2 text-xs">
              <span className={tile.crop.mature ? 'font-semibold text-[#f1d27a]' : 'text-white/65'}>
                {tile.crop.mature ? 'Ready to harvest' : `Growth ${tile.crop.growthDays} of ${CROPS[tile.crop.cropId].growDays} days`}
              </span>
              <span className="text-white/40">Yield {harvestYield(tile)}</span>
            </div>
            <Meter label="Moisture" value={tile.moisture} tone="bg-[#69bde2]" />
            <Meter label="Soil nitrogen" value={tile.nitrogen} tone="bg-[#80b96c]" />
            {!tile.crop.mature && tile.moisture < CROPS[tile.crop.cropId].waterNeed ? (
              <p className="text-[11px] font-medium text-[#efa08c]">Needs water before the next dawn.</p>
            ) : null}
          </div>
        ) : tile.kind === 'tilled' ? (
          <div className="grid grid-cols-2 gap-4">
            <Meter label="Moisture" value={tile.moisture} tone="bg-[#69bde2]" />
            <Meter label="Soil nitrogen" value={tile.nitrogen} tone="bg-[#80b96c]" />
          </div>
        ) : null}

        {tile.kind === 'grass' ? <p className="text-xs text-white/50">Healthy open soil with {Math.round(tile.nitrogen)}% nitrogen.</p> : null}
        {tile.kind === 'locked' ? <p className="text-xs text-white/50">Purchase this parcel from Farm operations before working here.</p> : null}
        {['brush', 'rock', 'marsh'].includes(tile.kind) ? <p className="text-xs text-white/50">Clear this terrain to extend the usable farm.</p> : null}
        {tile.kind === 'channel' ? <p className={`text-xs ${connectedChannels(state.tiles).has(idx) ? 'text-[#8fd6a1]' : 'text-[#efa08c]'}`}>{connectedChannels(state.tiles).has(idx) ? 'Connected and carrying water' : 'Disconnected from the reservoir'}</p> : null}

        {showSeeds && actions.includes('plant') ? (
          <div className="grid grid-cols-3 gap-2 border-y border-white/10 py-3">
            {plantableCrops(state).map(({ crop, inSeason }) => {
              const def = CROPS[crop];
              const owned = state.seeds[crop] ?? 0;
              return (
                <button
                  key={crop}
                  type="button"
                  disabled={!inRange || !inSeason || owned < 1}
                  onClick={() => { if (dispatch({ type: 'plant', idx, crop })) { navigator.vibrate?.(12); setShowSeeds(false); } }}
                  className="min-h-16 rounded-md border border-white/10 bg-black/20 p-2 text-center disabled:opacity-30"
                >
                  <span className="block text-xl">{def.emoji}</span>
                  <span className="block truncate text-[10px] font-semibold">{def.name}</span>
                  <span className="block text-[9px] text-white/40">{inSeason ? `${owned} seeds` : 'Out of season'}</span>
                </button>
              );
            })}
          </div>
        ) : null}

        {!inRange ? (
          <div className="flex h-12 items-center justify-center gap-2 rounded-md bg-[#d9b95f]/10 text-xs font-semibold text-[#f1d27a]">
            <Route size={16} className={isWalking ? 'animate-pulse' : ''} />
            {isWalking ? 'Farmer is on the way' : 'No clear route to this tile'}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {actions.includes('till') ? <button className={actionClass} onClick={() => run({ type: 'till', idx })}><Pickaxe size={17} /> Till soil</button> : null}
            {actions.includes('plant') ? <button className={actionClass} onClick={() => setShowSeeds((value) => !value)}><Sprout size={17} /> {showSeeds ? 'Hide seeds' : 'Plant crop'}</button> : null}
            {actions.includes('water') ? <button className={actionClass} disabled={state.reservoir < MANUAL_WATER_DRAW || waterCharges < 1} onClick={() => run({ type: 'water', idx })}><Droplets size={17} /> Water · {waterCharges}</button> : null}
            {actions.includes('harvest') ? <button className={actionClass} onClick={() => run({ type: 'harvest', idx })}><Wheat size={17} /> Harvest</button> : null}
            {actions.includes('clearLand') ? <button className={actionClass} onClick={() => run({ type: 'clearLand', idx })}><Shovel size={17} /> Clear land</button> : null}
            {actions.includes('buildChannel') ? <button className={actionClass} disabled={state.gold < GOLD_COST.channel} onClick={() => run({ type: 'buildChannel', idx })}><Droplets size={17} /> Channel · {GOLD_COST.channel}g</button> : null}
            {actions.includes('buildSprinkler') ? <button className={actionClass} disabled={state.gold < GOLD_COST.sprinkler} onClick={() => run({ type: 'buildSprinkler', idx })}><Sprout size={17} /> Sprinkler · {GOLD_COST.sprinkler}g</button> : null}
            {actions.includes('buildFieldCrate') ? <button className={actionClass} disabled={state.gold < GOLD_COST.fieldCrate} onClick={() => run({ type: 'buildFieldCrate', idx })}><Package size={17} /> Crate · {GOLD_COST.fieldCrate}g</button> : null}
            {actions.includes('digWell') ? <button className={actionClass} disabled={state.gold < GOLD_COST.well || state.wells >= MAX_WELLS} onClick={() => run({ type: 'digWell', idx })}><Hammer size={17} /> Well · {GOLD_COST.well}g</button> : null}
            {actions.includes('demolish') ? <button className={`${actionClass} text-[#efa08c]`} onClick={() => run({ type: 'demolish', idx })}><Trash2 size={17} /> Remove</button> : null}
          </div>
        )}
      </div>
    </section>
  );
}
