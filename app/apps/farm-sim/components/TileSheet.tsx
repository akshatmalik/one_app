'use client';

import { useEffect, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Droplets,
  Hammer,
  Package,
  Pickaxe,
  Route,
  ShoppingBasket,
  Shovel,
  Sprout,
  Trash2,
  Wheat,
  X,
} from 'lucide-react';
import { CropId, GameState, PlayerAction, SoilType } from '../lib/types';
import { CROPS } from '../data/crops';
import { validActions, plantableCrops } from '../lib/engine/actions';
import { harvestYield } from '../lib/engine/crops';
import { connectedChannels } from '../lib/engine/water';
import { GOLD_COST, MAX_WELLS, EXTRACTOR_BUILD_COST, EXTRACTOR_UPGRADE_COST, CRATE_CATCHMENT, GRID_SIZE } from '../lib/balance';
import { rowIndices } from '../lib/engine/toolProgression';

interface Props {
  state: GameState;
  idx: number;
  inRange: boolean;
  isWalking: boolean;
  waterCharges: number;
  waterCapacity: number;
  selectedCrop: CropId | null;
  paused: boolean;
  dispatch: (action: PlayerAction) => boolean;
  onRefillWater: () => boolean;
  onOpenMarket: () => void;
  anchor: { x: number; y: number };
  onClose: () => void;
}

function Meter({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px] font-medium text-white/55">
        <span>{label}</span><span className="tabular-nums text-white/75">{Math.round(value)}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10" role="meter" aria-label={label} aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}>
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
    reservoir: 'Reservoir', well: 'Farm well', sprinkler: 'Sprinkler', barn: 'Barn', coop: 'Chicken coop', shed: 'Farmhouse',
    market: 'Farm-gate produce stand', mill: 'Flour mill', depot: 'Shipping depot', crate: 'Field crate', path: 'Farm road',
    brush: 'Dense brush', rock: 'Boulder', marsh: 'Wet ground', locked: 'Unowned land',
    extractor: 'Automated extractor',
  };
  return labels[tile.kind] ?? tile.kind;
}

export function TileSheet({ state, idx, inRange, isWalking, waterCharges, waterCapacity, selectedCrop, paused, dispatch, onRefillWater, onOpenMarket, anchor, onClose }: Props) {
  const [showSeeds, setShowSeeds] = useState(false);
  const [showBuild, setShowBuild] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [recentAction, setRecentAction] = useState<string | null>(null);
  const [recentCrop, setRecentCrop] = useState<CropId | null>(null);
  const tile = state.tiles[idx];
  const actions = validActions(state, idx);
  const suppliedChannels = connectedChannels(state.tiles);
  const sprinklerSupplied = tile.kind === 'sprinkler' && suppliedChannels.size > 0 && [...suppliedChannels].some((channelIdx) => {
    const rowDelta = Math.abs(Math.floor(channelIdx / GRID_SIZE) - Math.floor(idx / GRID_SIZE));
    const colDelta = Math.abs(channelIdx % GRID_SIZE - idx % GRID_SIZE);
    return rowDelta + colDelta === 1;
  });
  const crate = tile.kind === 'crate' ? state.fieldCrates.find((candidate) => candidate.idx === idx) : undefined;
  const crateRoute = crate ? state.haulRoutes.find((candidate) => candidate.crateId === crate.id) : undefined;
  const harvestUnits = tile.crop?.mature ? harvestYield(tile) : 0;
  const row = rowIndices(idx);
  const rowWaterCount = row.filter((targetIdx) => state.tiles[targetIdx].kind === 'tilled').length;
  const sprinklerBuildSupplied = tile.kind === 'grass' && [...suppliedChannels].some((channelIdx) => {
    const rowDelta = Math.abs(Math.floor(channelIdx / GRID_SIZE) - Math.floor(idx / GRID_SIZE));
    const colDelta = Math.abs(channelIdx % GRID_SIZE - idx % GRID_SIZE);
    return rowDelta + colDelta === 1;
  });
  const soilNames: Record<SoilType, string> = { loam: 'Loam', clay: 'Clay', sandy: 'Sandy' };
  const centerRow = Math.floor(idx / GRID_SIZE);
  const centerCol = idx % GRID_SIZE;
  const areaTiles = state.tiles.filter((_, targetIdx) => {
    const row = Math.floor(targetIdx / GRID_SIZE);
    const col = targetIdx % GRID_SIZE;
    return Math.abs(row - centerRow) <= 1 && Math.abs(col - centerCol) <= 1;
  });
  const tillAreaCount = areaTiles.filter((candidate) => candidate.kind === 'grass').length;
  const harvestAreaCount = areaTiles.filter((candidate) => candidate.crop?.mature).length;
  const plantAreaCount = selectedCrop
    ? Math.min(
      areaTiles.filter((candidate) => candidate.kind === 'tilled' && !candidate.crop).length,
      state.seeds[selectedCrop] ?? 0,
    )
    : 0;

  useEffect(() => {
    setShowSeeds(false);
    setShowBuild(false);
    setExpanded(false);
  }, [idx]);

  const contextKey = tile.crop?.mature ? 'crop-ready' : tile.crop ? 'crop-growing' : tile.kind === 'tilled' ? 'soil-empty' : tile.kind;

  useEffect(() => {
    setRecentAction(window.localStorage.getItem(`farm-recent-${contextKey}`));
    const crop = window.localStorage.getItem('farm-recent-crop') as CropId | null;
    setRecentCrop(crop && Object.hasOwn(CROPS, crop) ? crop : null);
  }, [contextKey]);

  const run = (action: PlayerAction) => {
    if (!inRange) return;
    if (dispatch(action)) {
      window.localStorage.setItem(`farm-recent-${contextKey}`, action.type);
      if (action.type === 'plant') {
        window.localStorage.setItem('farm-recent-crop', action.crop);
        setRecentCrop(action.crop);
      }
      setRecentAction(action.type);
      navigator.vibrate?.(12);
    }
  };
  const actionClass = (action: string) => `flex min-h-10 min-w-0 items-center justify-start gap-2 rounded-md border px-2.5 text-[11px] font-semibold text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-35 ${recentAction === action ? 'border-[#efd275]/55 bg-[#efd275]/12' : 'border-white/10 bg-white/[0.06]'}`;
  const status = isWalking ? 'Walking into range' : inRange ? 'Ready to work' : 'No reachable work position';
  const needsWater = !!tile.crop && !tile.crop.mature && tile.moisture < CROPS[tile.crop.cropId].waterNeed;
  const isWaterSource = tile.kind === 'reservoir' || tile.kind === 'well' || (tile.kind === 'channel' && suppliedChannels.has(idx));
  const hasBuildActions = actions.some((action) => ['buildChannel', 'buildSprinkler', 'buildFieldCrate', 'digWell'].includes(action));
  const quickCrop = selectedCrop ?? recentCrop;
  const marketOpen = !state.opening || state.opening.complete || state.opening.stage >= 5;
  const popupWidth = 224;
  const popupHeight = showSeeds || showBuild || expanded ? 350 : 240;
  const left = typeof window === 'undefined' ? anchor.x : Math.max(8, Math.min(anchor.x + (anchor.x > window.innerWidth - popupWidth - 28 ? -popupWidth - 18 : 18), window.innerWidth - popupWidth - 8));
  const top = typeof window === 'undefined' ? anchor.y : Math.max(58, Math.min(anchor.y + (anchor.y > window.innerHeight - popupHeight - 70 ? -popupHeight - 12 : 18), window.innerHeight - popupHeight - 58));

  return (
    <section
      aria-label={`Selected tile: ${tileTitle(state, idx)}`}
      onPointerDown={(event) => event.stopPropagation()}
      style={{ left, top, width: popupWidth }}
      className="pointer-events-auto fixed z-30 max-h-[min(350px,calc(100dvh-7rem))] overflow-y-auto rounded-md border border-white/10 bg-[#0d1511]/[0.97] text-white shadow-2xl backdrop-blur-xl"
    >
      <div className="sticky top-0 z-10 border-b border-white/10 bg-[#0d1511]/95 backdrop-blur-xl">
        <div className="flex h-10 items-center gap-1 px-2">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-[13px] font-bold">{tileTitle(state, idx)}</h2>
            <p className={`truncate text-[9px] ${inRange ? 'text-[#91ca8d]' : 'text-[#e6c36b]'}`}>{status}</p>
          </div>
          <button type="button" onClick={() => { setExpanded((value) => !value); setShowBuild(false); setShowSeeds(false); }} aria-expanded={expanded} aria-label={expanded ? 'Hide tile details' : 'Inspect tile'} className="grid size-8 place-items-center rounded-md text-white/55 hover:bg-white/10">
            {expanded ? <ChevronDown size={17} /> : <ChevronUp size={17} />}
          </button>
          <button type="button" onClick={onClose} aria-label="Close tile details" className="grid size-8 place-items-center rounded-md text-white/55 hover:bg-white/10 hover:text-white">
            <X size={17} />
          </button>
        </div>
      </div>

      <fieldset disabled={paused} className="space-y-2 p-2 disabled:opacity-60">
        {paused ? <p className="text-center text-[10px] font-semibold text-[#efd275]" role="status">Paused. Resume to work this tile.</p> : null}
        {expanded && tile.crop ? (
          <div className="grid grid-cols-3 gap-1.5" aria-label="Crop status">
            <div className="rounded-md bg-black/20 px-2 py-1.5"><span className="block text-[8px] uppercase text-white/40">Growth</span><span className="text-[11px] font-semibold">{tile.crop.mature ? 'Ready' : `${tile.crop.growthDays}/${CROPS[tile.crop.cropId].growDays} days`}</span></div>
            <div className={`rounded-md px-2 py-1.5 ${needsWater ? 'bg-[#9f4938]/25' : 'bg-black/20'}`}><span className="block text-[8px] uppercase text-white/40">Moisture</span><span className="text-[11px] font-semibold">{Math.round(tile.moisture)}%{needsWater ? ' low' : ''}</span></div>
            <div className="rounded-md bg-black/20 px-2 py-1.5"><span className="block text-[8px] uppercase text-white/40">Yield</span><span className="text-[11px] font-semibold">{harvestYield(tile)}</span></div>
          </div>
        ) : expanded ? (
          <div className="flex items-center gap-2 text-[10px] text-white/60">
            <span className="rounded-md bg-black/20 px-2 py-1.5">{soilNames[tile.soil]} soil</span>
            {(tile.kind === 'grass' || tile.kind === 'tilled') ? <span className="rounded-md bg-black/20 px-2 py-1.5">Nitrogen {Math.round(tile.nitrogen)}%</span> : null}
          </div>
        ) : null}

        {crate ? (
          <div className="rounded-md bg-black/20 px-2.5 py-2 text-[10px]">
            <div className="flex items-center justify-between"><span className="font-semibold text-white/70">Wheat storage</span><span className="font-bold tabular-nums text-[#f1d27a]">{crate.wheat}/{crate.capacity}</span></div>
            <p className="mt-1 text-white/45">Harvest radius {CRATE_CATCHMENT} · {crateRoute ? `${crateRoute.ratePerDay}/day route to mill` : 'manual hauling'}</p>
          </div>
        ) : null}

        {tile.kind === 'sprinkler' ? (
          <div className={`rounded-md px-2.5 py-2 text-[10px] ${sprinklerSupplied ? 'bg-[#4c8b69]/15 text-[#91ca8d]' : 'bg-[#9f4938]/20 text-[#efa08c]'}`}>
            {sprinklerSupplied ? 'Supplied · waters the surrounding 8 tiles at dawn' : 'Disconnected · place a supplied channel beside it'}
          </div>
        ) : null}

        {expanded ? (
          <div className="space-y-2.5 border-y border-white/10 py-2.5">
            {(tile.crop || tile.kind === 'tilled') ? (
              <div className="grid grid-cols-2 gap-3">
                <Meter label="Moisture" value={tile.moisture} tone="bg-[#69bde2]" />
                <Meter label="Soil nitrogen" value={tile.nitrogen} tone="bg-[#80b96c]" />
              </div>
            ) : null}
            {tile.crop ? <p className="text-[10px] text-white/60">{soilNames[tile.soil]} soil. {CROPS[tile.crop.cropId].preferredSoils.includes(tile.soil) ? 'Ideal soil for this crop.' : `Reduced to ${Math.round(CROPS[tile.crop.cropId].soilPenalty * 100)}% base yield.`}</p> : null}
            {tile.kind === 'locked' ? <p className="text-[10px] text-white/60">Purchase this parcel in Farm operations before entering or working it.</p> : null}
            {tile.kind === 'brush' ? <p className="text-[10px] text-white/60">Clear brush for 4 wood and usable land.</p> : null}
            {(tile.kind === 'rock' || tile.kind === 'marsh') && tile.deposit ? <p className="text-[10px] text-white/60">{tile.deposit.resource}: {tile.deposit.remaining}/{tile.deposit.max} remaining.</p> : null}
            {tile.kind === 'extractor' && tile.deposit ? <p className="text-[10px] text-[#91ca8d]">Extracting {tile.deposit.resource} each dawn. {tile.deposit.remaining} remaining.</p> : null}
            {tile.kind === 'channel' ? <p className={`text-[10px] ${suppliedChannels.has(idx) ? 'text-[#91ca8d]' : 'text-[#efa08c]'}`}>{suppliedChannels.has(idx) ? 'Connected and carrying water.' : 'Disconnected from the reservoir.'}</p> : null}
          </div>
        ) : null}

        {showSeeds && actions.includes('plant') ? (
          <div className="grid grid-cols-4 gap-1.5 border-y border-white/10 py-2">
            {plantableCrops(state).map(({ crop, inSeason }) => {
              const def = CROPS[crop];
              const owned = state.seeds[crop] ?? 0;
              return (
                <button
                  key={crop}
                  type="button"
                  disabled={!inRange || !inSeason || owned < 1}
                  aria-label={`${def.name}: ${owned} seeds${inSeason ? '' : ', out of season'}`}
                  onClick={() => { if (dispatch({ type: 'plant', idx, crop })) { window.localStorage.setItem('farm-recent-crop', crop); window.localStorage.setItem(`farm-recent-${contextKey}`, 'plant'); setRecentCrop(crop); setRecentAction('plant'); navigator.vibrate?.(12); setShowSeeds(false); } }}
                  className="min-h-14 min-w-0 rounded-md border border-white/10 bg-black/20 p-1 text-center disabled:opacity-35"
                >
                  <span className="block text-lg leading-5">{def.emoji}</span>
                  <span className="block truncate text-[8px] font-semibold">{def.name}</span>
                  <span className="block text-[9px] font-bold tabular-nums text-white/60">×{owned}</span>
                </button>
              );
            })}
          </div>
        ) : null}

        {!inRange ? (
          <div className="flex h-11 items-center justify-center gap-2 rounded-md bg-[#d9b95f]/10 text-[11px] font-semibold text-[#f1d27a]" role="status">
            <Route size={15} className={isWalking ? 'motion-safe:animate-pulse' : ''} />
            {isWalking ? 'Farmer is on the way' : 'No clear route to this tile'}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-1.5">
            {tile.kind === 'market' ? <button className={actionClass('market')} disabled={!marketOpen} onClick={onOpenMarket}><ShoppingBasket size={16} /> {marketOpen ? 'Sell produce and view orders' : 'Stand opens after first harvest'}</button> : null}
            {isWaterSource ? <button className={actionClass('refill')} disabled={waterCharges >= waterCapacity} onClick={() => { if (onRefillWater()) { window.localStorage.setItem(`farm-recent-${contextKey}`, 'refill'); setRecentAction('refill'); navigator.vibrate?.(18); } }}><Droplets size={16} /> {waterCharges >= waterCapacity ? `Can is full · ${waterCapacity}/${waterCapacity}` : `Refill can · ${waterCharges}/${waterCapacity}`}</button> : null}
            {actions.includes('till') ? <button className={actionClass('till')} onClick={() => run({ type: 'till', idx })}><Pickaxe size={16} /> Till soil</button> : null}
            {actions.includes('tillRow') ? <button className={actionClass('tillRow')} onClick={() => run({ type: 'tillRow', idx })}><Pickaxe size={16} /> Till three-tile row</button> : null}
            {actions.includes('tillArea') ? <button className={actionClass('tillArea')} disabled={state.items.fuel < 1 || tillAreaCount < 1} onClick={() => run({ type: 'tillArea', idx })}><Pickaxe size={16} /> Till {tillAreaCount} tiles · 1 fuel</button> : null}
            {actions.includes('plant') && quickCrop && !showSeeds ? <button className={actionClass('plant')} disabled={(state.seeds[quickCrop] ?? 0) < 1} onClick={() => run({ type: 'plant', idx, crop: quickCrop })}><Sprout size={16} /> Plant {CROPS[quickCrop].name} · {state.seeds[quickCrop]}</button> : null}
            {actions.includes('plant') ? <button className={actionClass('choose-crop')} onClick={() => setShowSeeds((value) => !value)}><Sprout size={16} /> {showSeeds ? 'Hide seeds' : quickCrop ? 'Choose another crop…' : 'Choose crop…'}</button> : null}
            {actions.includes('plantRow') && quickCrop ? <button className={actionClass('plantRow')} onClick={() => run({ type: 'plantRow', idx, crop: quickCrop })}><Sprout size={16} /> Plant {CROPS[quickCrop].name} row</button> : null}
            {actions.includes('plantArea') && selectedCrop ? <button className={actionClass('plantArea')} disabled={state.items.fuel < 1 || plantAreaCount < 1} onClick={() => run({ type: 'plantArea', idx, crop: selectedCrop })}><Sprout size={16} /> Seed {plantAreaCount} tiles · 1 fuel</button> : null}
            {actions.includes('water') ? <button className={actionClass('water')} title={waterCharges < 1 ? 'Refill at a well, reservoir, or supplied channel' : undefined} disabled={waterCharges < 1} onClick={() => run({ type: 'water', idx })}><Droplets size={16} /> Water · {waterCharges}</button> : null}
            {actions.includes('waterRow') ? <button className={actionClass('waterRow')} disabled={waterCharges < rowWaterCount} onClick={() => run({ type: 'waterRow', idx })}><Droplets size={16} /> Water row · {rowWaterCount} charges</button> : null}
            {actions.includes('harvest') ? <button className={actionClass('harvest')} onClick={() => run({ type: 'harvest', idx })}><Wheat size={16} /> Harvest {harvestUnits}</button> : null}
            {actions.includes('harvestRow') ? <button className={actionClass('harvestRow')} onClick={() => run({ type: 'harvestRow', idx })}><Wheat size={16} /> Harvest ready row</button> : null}
            {actions.includes('harvestArea') ? <button className={actionClass('harvestArea')} disabled={state.items.fuel < 1 || harvestAreaCount < 1} onClick={() => run({ type: 'harvestArea', idx })}><Wheat size={16} /> Harvest {harvestAreaCount} crops · 1 fuel</button> : null}
            {actions.includes('clearLand') ? <button className={actionClass('clearLand')} onClick={() => run({ type: 'clearLand', idx })}><Shovel size={16} /> Clear land</button> : null}
            {actions.includes('mine') ? <button className={actionClass('mine')} onClick={() => run({ type: 'mine', idx })}><Pickaxe size={16} /> Mine {tile.deposit?.resource ?? 'deposit'}</button> : null}
            {actions.includes('buildExtractor') ? <button className={actionClass('buildExtractor')} disabled={state.facilities.workshop.level < 1 || state.gold < EXTRACTOR_BUILD_COST.gold || state.items.bricks < EXTRACTOR_BUILD_COST.bricks} onClick={() => run({ type: 'buildExtractor', idx })}><Hammer size={16} /> Automate deposit</button> : null}
            {actions.includes('upgradeExtractor') ? <button className={actionClass('upgradeExtractor')} disabled={state.gold < EXTRACTOR_UPGRADE_COST.gold || state.items.bricks < EXTRACTOR_UPGRADE_COST.bricks || state.items.machineParts < EXTRACTOR_UPGRADE_COST.machineParts} onClick={() => { const extractor = state.extractors.find((candidate) => candidate.idx === idx); if (extractor) run({ type: 'upgradeExtractor', extractorId: extractor.id }); }}><Hammer size={16} /> Upgrade extractor</button> : null}
            {actions.includes('fertilize') && expanded ? <button className={actionClass('fertilize')} disabled={state.items.fertilizer < 1} onClick={() => run({ type: 'fertilize', idx })}><Sprout size={16} /> Fertilize · {state.items.fertilizer}</button> : null}
            {hasBuildActions ? <button className={actionClass('build')} onClick={() => { setShowBuild((value) => !value); setShowSeeds(false); setExpanded(false); }}><Hammer size={16} /> {showBuild ? 'Hide construction' : 'Build…'}</button> : null}
            {showBuild && actions.includes('buildChannel') ? <button className={actionClass('buildChannel')} disabled={state.gold < GOLD_COST.channel} onClick={() => run({ type: 'buildChannel', idx })}><Droplets size={16} /> Channel · {GOLD_COST.channel}g</button> : null}
            {showBuild && actions.includes('buildSprinkler') ? <button className={actionClass('buildSprinkler')} title={!sprinklerBuildSupplied ? 'Place beside a supplied channel' : undefined} disabled={state.gold < GOLD_COST.sprinkler || !sprinklerBuildSupplied} onClick={() => run({ type: 'buildSprinkler', idx })}><Sprout size={16} /> Sprinkler · {GOLD_COST.sprinkler}g</button> : null}
            {showBuild && actions.includes('buildFieldCrate') ? <button className={actionClass('buildFieldCrate')} disabled={state.gold < GOLD_COST.fieldCrate} onClick={() => run({ type: 'buildFieldCrate', idx })}><Package size={16} /> Field crate · {GOLD_COST.fieldCrate}g</button> : null}
            {showBuild && actions.includes('digWell') ? <button className={actionClass('digWell')} disabled={state.gold < GOLD_COST.well || state.wells >= MAX_WELLS} onClick={() => run({ type: 'digWell', idx })}><Hammer size={16} /> Well · {GOLD_COST.well}g</button> : null}
            {expanded && actions.includes('demolish') ? <button className={`${actionClass('demolish')} text-[#efa08c]`} onClick={() => run({ type: 'demolish', idx })}><Trash2 size={16} /> Remove</button> : null}
          </div>
        )}

        {inRange && actions.includes('water') && waterCharges < 1 ? <p className="text-[9px] text-[#efa08c]">Watering can empty. Select a well, reservoir, or supplied channel to refill it.</p> : null}
        {inRange && actions.includes('buildSprinkler') && !sprinklerBuildSupplied ? <p className="text-[9px] text-[#efa08c]">A sprinkler must touch a channel connected to the reservoir.</p> : null}

        {inRange && expanded && actions.includes('amendSoil') ? (
          <div>
            <div className="mb-1 text-[9px] font-bold uppercase text-white/40">Amend soil</div>
            <div className="grid grid-cols-3 gap-1.5">
              {(['loam', 'clay', 'sandy'] as SoilType[]).map((soil) => <button key={soil} type="button" disabled={tile.soil === soil || (soil === 'loam' ? state.items.fertilizer < 1 : soil === 'clay' ? state.resources.clay < 2 : state.resources.stone < 2)} onClick={() => run({ type: 'amendSoil', idx, soil })} className="min-h-10 rounded-md border border-white/10 bg-black/20 text-[10px] font-semibold disabled:opacity-30">{soilNames[soil]}</button>)}
            </div>
          </div>
        ) : null}
      </fieldset>
    </section>
  );
}
