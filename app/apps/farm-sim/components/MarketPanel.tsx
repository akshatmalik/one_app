'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, Boxes, Factory, Hammer, LandPlot, PackageOpen, Pickaxe, Route, Sprout, Waves } from 'lucide-react';
import { FacilityId, GameState, ItemId, ParcelId, PlayerAction, ResourceId, UpgradeId } from '../lib/types';
import { CROPS, CROP_IDS } from '../data/crops';
import { availableCrops, millAvailable, nextCropUnlock } from '../lib/engine/opening';
import { cultivatedTiles, upgradeRequirement } from '../lib/engine/toolProgression';
import { getPrice } from '../lib/engine/market';
import { FLOUR_EXPORT_PRICE, GOLD_COST, GRID_SIZE, HAUL_ROUTE_LEVELS, MACHINE_COST, MILL_LEVELS, PARCEL_COST, UPGRADES } from '../lib/balance';
import { millStatus } from '../lib/engine/production';
import { productionProjection, waterProjection } from '../lib/engine/engineering';
import { PARCELS, parcelIndices } from '../lib/engine/parcels';
import { FACILITY_CAPACITY, FACILITY_NAMES, FACILITY_UPGRADES, ITEM_SELL_VALUES, RECIPES, RECIPE_IDS } from '../data/economy';
import { ContractBoard } from './ContractBoard';

interface Props {
  state: GameState;
  dispatch: (action: PlayerAction) => boolean;
  standMode?: boolean;
}

type Tab = 'production' | 'crafting' | 'stock' | 'land' | 'export' | 'orders' | 'seeds' | 'equipment';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'production', label: 'Production' },
  { id: 'crafting', label: 'Craft' },
  { id: 'stock', label: 'Stock' },
  { id: 'land', label: 'Land' },
  { id: 'export', label: 'Sell' },
  { id: 'orders', label: 'Orders' },
  { id: 'seeds', label: 'Seeds' },
  { id: 'equipment', label: 'Tools' },
];

const RESOURCE_IDS: ResourceId[] = ['wood', 'stone', 'clay', 'coal', 'ironOre'];
const ITEM_IDS = Object.keys(ITEM_SELL_VALUES) as ItemId[];

function ingredientHave(state: GameState, input: (typeof RECIPES)[keyof typeof RECIPES]['inputs'][number]): number {
  if (input.kind === 'crop') return state.inventory[input.id] ?? 0;
  if (input.kind === 'resource') return state.resources[input.id] ?? 0;
  return state.items[input.id] ?? 0;
}

function itemLabel(id: string): string {
  const words = id.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function fieldLocation(idx: number): string {
  const row = Math.floor(idx / GRID_SIZE);
  const col = idx % GRID_SIZE;
  const vertical = row < GRID_SIZE / 3 ? 'North' : row > GRID_SIZE * 2 / 3 ? 'South' : '';
  const horizontal = col < GRID_SIZE / 3 ? 'West' : col > GRID_SIZE * 2 / 3 ? 'East' : '';
  return `${vertical}${horizontal}` || 'Central';
}

export function MarketPanel({ state, dispatch, standMode = false }: Props) {
  const guidedOpening = !!state.opening && !state.opening.complete;
  const [tab, setTab] = useState<Tab>(standMode || guidedOpening ? 'export' : 'stock');
  const [saleReceipt, setSaleReceipt] = useState<string | null>(null);
  const productionUnlocked = millAvailable(state);
  const craftingUnlocked = Object.values(state.facilities).some((facility) => facility.level > 0) || cultivatedTiles(state) >= 75;
  const equipmentUnlocked = (Object.keys(UPGRADES) as UpgradeId[]).some((id) => state.upgrades.includes(id) || upgradeRequirement(state, id).met);
  const visibleTabs = standMode || guidedOpening
    ? TABS.filter((item) => item.id === 'export' || (!guidedOpening && (item.id === 'orders' || item.id === 'seeds')))
    : TABS.filter((item) => {
      if (item.id === 'export' || item.id === 'orders') return false;
      if (item.id === 'production') return productionUnlocked;
      if (item.id === 'crafting') return craftingUnlocked;
      if (item.id === 'equipment') return equipmentUnlocked;
      return true;
    });
  const production = productionProjection(state);
  const water = waterProjection(state);
  const nextMillLevel = state.mill.level < 3 ? (state.mill.level + 1 as 1 | 2 | 3) : null;
  const nextMill = nextMillLevel ? MILL_LEVELS[nextMillLevel] : null;
  const cropUnlock = nextCropUnlock(state);

  useEffect(() => {
    if (!visibleTabs.some((item) => item.id === tab)) setTab(visibleTabs[0]?.id ?? 'stock');
  }, [standMode, guidedOpening, productionUnlocked, craftingUnlocked, equipmentUnlocked, tab]);

  const sell = (action: PlayerAction, receipt: string) => {
    if (!dispatch(action)) return;
    setSaleReceipt(receipt);
    window.setTimeout(() => setSaleReceipt(null), 2200);
    navigator.vibrate?.([18, 25, 28]);
  };

  return (
    <div className="h-full overflow-y-auto bg-[#111a15] p-3 text-white md:p-4">
      <div className="sticky top-0 z-10 mb-4 flex gap-1 overflow-x-auto border-b border-white/10 bg-[#111a15] pb-2" role="tablist" aria-label="Farm operations">
        {visibleTabs.map((item) => (
          <button type="button" role="tab" aria-selected={tab === item.id} key={item.id} onClick={() => setTab(item.id)} className={`min-w-fit flex-1 rounded px-2 py-2 text-[11px] font-semibold ${tab === item.id ? 'bg-[#e0bd5d] text-[#132019]' : 'text-white/55 hover:bg-white/[0.08] hover:text-white'}`}>{item.label}</button>
        ))}
      </div>

      {saleReceipt ? <div role="status" className="mb-3 border border-[#efd275]/35 bg-[#efd275]/10 px-3 py-2 text-center text-sm font-bold text-[#f4d978] shadow-[0_0_24px_rgba(239,210,117,0.08)]">{saleReceipt}</div> : null}

      {tab === 'production' && (
        <div className="space-y-4">
          {state.mill.commissioned ? <>
          <div>
            <div className="mb-2 text-[10px] font-semibold uppercase text-white/40">Wheat flow</div>
            <div className="flex items-stretch border border-white/10 bg-[#0c130f] p-2">
              <FlowNode label="Crates" value={`${production.crateWheat}`} tone="text-[#e0bd5d]" />
              <ArrowRight size={14} className="mt-4 shrink-0 text-white/25" />
              <FlowNode label="Routes" value={`${production.routeRate}/d`} tone={production.routeRate > 0 ? 'text-[#8fd6a1]' : 'text-white/35'} />
              <ArrowRight size={14} className="mt-4 shrink-0 text-white/25" />
              <FlowNode label="Mill" value={`${state.mill.input}`} tone={state.mill.commissioned ? 'text-[#8fd6a1]' : 'text-[#ef8f78]'} />
              <ArrowRight size={14} className="mt-4 shrink-0 text-white/25" />
              <FlowNode label="Flour" value={`${state.mill.output}`} tone="text-[#87c9e8]" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-px overflow-hidden border border-white/10 bg-white/10">
            <Metric icon={<PackageOpen size={14} />} label="Storage" value={`${production.crateWheat}/${production.capacity}`} sub={production.daysToFull === null ? 'No recent inflow' : `${production.daysToFull.toFixed(1)} days to full`} />
            <Metric icon={<Route size={14} />} label="Transport" value={`${production.routeRate}/day`} sub={`${state.haulRoutes.length} active route${state.haulRoutes.length === 1 ? '' : 's'}`} />
            <Metric icon={<Factory size={14} />} label="Mill capacity" value={`${state.mill.ratePerDay}/day`} sub={production.daysToClear === null ? 'No queue' : `${production.daysToClear.toFixed(1)} days queued`} />
            <Metric icon={<Waves size={14} />} label="Water balance" value={`${water.supply}/${water.demand}`} sub={water.sustainable ? 'Supply covers demand' : `${water.netDraw} short at dawn`} warning={!water.sustainable} />
          </div>
          </> : null}

          <section className="border-y border-white/10 py-3">
            <div className="mb-2 flex items-start justify-between gap-3">
              <div><h3 className="text-sm font-bold">{state.mill.commissioned ? MILL_LEVELS[state.mill.level as 1 | 2 | 3].name : 'Flour mill plans'}</h3><p className="mt-0.5 text-xs text-white/45">{state.mill.commissioned ? millStatus(state) : 'Build your first grain-processing line'}</p></div>
              <span className="text-xs tabular-nums text-white/55">{state.mill.input} → {state.mill.output}</span>
            </div>
            <Progress value={state.mill.input} max={state.mill.inputCapacity} tone="bg-[#8fd6a1]" />
            {!state.mill.commissioned ? (
              <Command onClick={() => dispatch({ type: 'commissionMill' })} disabled={state.gold < GOLD_COST.mill}>Build mill · {GOLD_COST.mill}g</Command>
            ) : nextMill ? (
              <Command onClick={() => dispatch({ type: 'upgradeMill' })} disabled={state.gold < nextMill.cost}>Install {nextMill.name} · {nextMill.cost}g · {nextMill.rate}/day</Command>
            ) : <div className="text-xs text-emerald-300">Maximum 12-unit grinding line installed.</div>}
          </section>

          {state.mill.commissioned ? <div>
            <h3 className="mb-2 text-[11px] font-semibold uppercase text-white/40">Field storage and routes</h3>
            <div className="space-y-2">
              {state.fieldCrates.length === 0 ? <p className="text-xs text-white/45">Build field storage from a grass tile when carrying grain to the mill becomes slow.</p> : null}
              {state.fieldCrates.map((crate, index) => {
                const route = state.haulRoutes.find((candidate) => candidate.crateId === crate.id);
                const routeStatus = production.crateStatuses.find((candidate) => candidate.crateId === crate.id);
                const freeMill = state.mill.inputCapacity - state.mill.input;
                const loadQty = Math.min(crate.wheat, freeMill);
                const nextRouteLevel = route && route.level < 3 ? (route.level + 1 as 2 | 3) : null;
                const nextRoute = nextRouteLevel ? HAUL_ROUTE_LEVELS[nextRouteLevel] : null;
                return (
                  <div key={crate.id} className="border border-white/10 bg-[#0c130f] p-3">
                    <div className="mb-2 flex items-center justify-between"><span className="text-xs font-bold">{fieldLocation(crate.idx)} field · Crate {index + 1}</span><span className="text-xs tabular-nums text-[#f1d27a]">{crate.wheat}/{crate.capacity}</span></div>
                    <Progress value={crate.wheat} max={crate.capacity} tone={crate.wheat >= crate.capacity ? 'bg-[#ef8f78]' : 'bg-[#e0bd5d]'} />
                    <div className={`mb-2 mt-1 text-[9px] ${routeStatus?.state === 'active' ? 'text-[#8fd6a1]' : routeStatus?.state === 'blocked' ? 'text-[#efa08c]' : 'text-white/45'}`}>{routeStatus?.label ?? (route ? `Automated route · ${route.ratePerDay} wheat/day` : 'Manual hauling only')}</div>
                    <div className="flex flex-wrap gap-1.5">
                      <SmallButton onClick={() => dispatch({ type: 'loadMillFromCrate', crateId: crate.id, qty: loadQty })} disabled={loadQty < 1}>Haul {loadQty} now</SmallButton>
                      <SmallButton onClick={() => dispatch({ type: 'upgradeFieldCrate', crateId: crate.id })} disabled={state.gold < GOLD_COST.wheatStorage}>+12 capacity · {GOLD_COST.wheatStorage}g</SmallButton>
                      {!route ? <SmallButton onClick={() => dispatch({ type: 'buildHaulRoute', crateId: crate.id })} disabled={!state.mill.commissioned || state.gold < HAUL_ROUTE_LEVELS[1].cost}>Automate · {HAUL_ROUTE_LEVELS[1].cost}g</SmallButton> : nextRoute ? <SmallButton onClick={() => dispatch({ type: 'upgradeHaulRoute', routeId: route.id })} disabled={state.gold < nextRoute.cost}>Route {nextRoute.rate}/day · {nextRoute.cost}g</SmallButton> : <span className="px-2 py-1 text-[10px] text-emerald-300">Route 12/day</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div> : null}
        </div>
      )}

      {tab === 'crafting' && (
        <div className="space-y-4">
          <p className="text-xs leading-5 text-white/50">Process harvests and mined resources into higher-value goods. Each facility has a daily batch limit that grows with upgrades.</p>
          {(['kiln', 'kitchen', 'workshop'] as FacilityId[]).map((facilityId) => {
            const facility = state.facilities[facilityId];
            const next = facility.level < 3 ? FACILITY_UPGRADES[facilityId][facility.level] : null;
            const canUpgrade = !!next && state.gold >= next.gold && Object.entries(next.resources).every(([id, qty]) => state.resources[id as ResourceId] >= (qty ?? 0)) && Object.entries(next.items ?? {}).every(([id, qty]) => state.items[id as ItemId] >= (qty ?? 0));
            const upgradeInputs = next ? [...Object.entries(next.resources), ...Object.entries(next.items ?? {})].filter(([, qty]) => (qty ?? 0) > 0).map(([id, qty]) => `${qty} ${id}`).join(' · ') : '';
            const recipes = RECIPE_IDS.map((id) => RECIPES[id]).filter((recipe) => recipe.facility === facilityId);
            return <section key={facilityId} className="border-y border-white/10 py-3">
              <div className="mb-3 flex items-start justify-between gap-3"><div><h3 className="text-sm font-bold">{FACILITY_NAMES[facilityId]}</h3><p className="text-[10px] text-white/40">Level {facility.level} · {facility.usedToday}/{FACILITY_CAPACITY[facility.level]} batches used today</p>{next ? <p className="mt-1 text-[9px] text-white/35">Next: {next.gold}g · {upgradeInputs}</p> : null}</div>{next ? <SmallButton onClick={() => dispatch({ type: 'upgradeFacility', facility: facilityId })} disabled={!canUpgrade}>Upgrade</SmallButton> : <span className="text-[10px] text-emerald-300">Max level</span>}</div>
              {facility.level === 0 ? <p className="text-xs text-[#f1d27a]">Build the first level to unlock this production line.</p> : <div className="space-y-2">{recipes.map((recipe) => {
                const capacity = FACILITY_CAPACITY[facility.level] - facility.usedToday;
                const inputMax = Math.min(...recipe.inputs.map((input) => Math.floor(ingredientHave(state, input) / input.qty)));
                const canCraft = facility.level >= recipe.level && capacity > 0 && inputMax > 0;
                return <div key={recipe.id} className="bg-black/20 p-2.5"><div className="flex items-center gap-2"><div className="min-w-0 flex-1"><div className="text-xs font-semibold">{recipe.name} <span className="text-white/35">×{recipe.output.qty}</span></div><div className="mt-0.5 text-[9px] text-white/40">{recipe.inputs.map((input) => `${input.qty} ${itemLabel(input.id)}`).join(' + ')} · L{recipe.level}</div></div><SmallButton onClick={() => dispatch({ type: 'craft', recipe: recipe.id, qty: 1 })} disabled={!canCraft}>Make</SmallButton></div><p className="mt-1.5 text-[9px] text-white/35">{recipe.description}</p></div>;
              })}</div>}
            </section>;
          })}
        </div>
      )}

      {tab === 'stock' && (
        <div className="space-y-4">
          <StockGroup title="Materials" icon={<Pickaxe size={14} />} entries={RESOURCE_IDS.filter((id) => state.resources[id] > 0).map((id) => ({ id, value: state.resources[id], note: id }))} empty="Cleared and mined materials appear here." />
          <StockGroup title="Processed goods" icon={<Hammer size={14} />} entries={ITEM_IDS.filter((id) => state.items[id] > 0).map((id) => ({ id, value: state.items[id], note: `${itemLabel(id)} · ${ITEM_SELL_VALUES[id]}g` }))} empty="Crafted goods will appear here." />
          <StockGroup title="Harvest inventory" icon={<Boxes size={14} />} entries={CROP_IDS.filter((id) => state.inventory[id] > 0).map((id) => ({ id, value: state.inventory[id], note: CROPS[id].name }))} empty="Harvested crops appear here." />
        </div>
      )}

      {tab === 'land' && (
        <div className="space-y-2">
          <div className="mb-3 flex items-center gap-2 text-xs text-white/50"><LandPlot size={15} /> Buy space when the current layout becomes the constraint.</div>
          {(Object.keys(PARCELS) as ParcelId[]).filter((id) => state.parcels[id] || PARCELS[id].requires.every((required) => state.parcels[required])).map((id) => {
            const parcel = PARCELS[id];
            const owned = state.parcels[id];
            const available = parcel.requires.every((required) => state.parcels[required]);
            const clearable = parcelIndices(parcel).filter((idx) => ['brush', 'rock', 'marsh'].includes(state.tiles[idx].kind)).length;
            return <div key={id} className="flex items-center gap-3 border-b border-white/[0.08] py-3"><div className="min-w-0 flex-1"><div className="text-xs font-bold">{parcel.name}</div><div className="text-[10px] text-white/40">{owned ? `${clearable} terrain tiles remain` : `${parcel.terrain} ground · ${parcelIndices(parcel).length} tiles`}</div></div><button onClick={() => dispatch({ type: 'purchaseParcel', parcel: id })} disabled={owned || !available || state.gold < PARCEL_COST[id]} className="rounded-md bg-[#d9b95f] px-2.5 py-1.5 text-xs font-bold text-[#17201d] disabled:bg-white/[0.08] disabled:text-white/30">{owned ? 'Owned' : !available ? 'Adjacent land first' : `${PARCEL_COST[id]}g`}</button></div>;
          })}
        </div>
      )}

      {tab === 'export' && (
        <div className="space-y-3">
          <div className="border-b border-[#d9b95f]/30 pb-3"><div className="text-sm font-bold">Today at the farm gate</div><div className="mt-0.5 text-xs text-white/45">Choose produce, confirm sale, collect earnings immediately.</div></div>
          {state.mill.commissioned || state.mill.output > 0 ? <div className="flex items-center justify-between border-b border-white/[0.08] py-2"><div><div className="text-xs font-semibold">Flour</div><div className="text-[10px] text-white/45">{FLOUR_EXPORT_PRICE}g each · {state.mill.output} ready</div></div><Command onClick={() => sell({ type: 'exportFlour', qty: state.mill.output }, `Sold ${state.mill.output} flour · +${state.mill.output * FLOUR_EXPORT_PRICE}g`)} disabled={state.mill.output < 1}>Sell all</Command></div> : null}
          {state.fieldCrates.map((crate, index) => <div key={crate.id} className="flex items-center justify-between border-b border-white/[0.08] py-2"><span className="text-xs">Raw wheat · field store {index + 1}</span><SmallButton onClick={() => sell({ type: 'exportWheatFromCrate', crateId: crate.id, qty: crate.wheat }, `Sold ${crate.wheat} wheat`)} disabled={crate.wheat < 1}>Sell {crate.wheat}</SmallButton></div>)}
          {availableCrops(state).map((crop) => { const have = state.inventory[crop]; const total = Math.round(getPrice(state, crop) * have * 10) / 10; return <div key={crop} className="flex items-center gap-2 border-b border-white/[0.08] py-2"><span className="text-lg">{CROPS[crop].emoji}</span><span className="flex-1 text-xs font-semibold">{CROPS[crop].name}<span className="mt-0.5 block text-[9px] font-normal text-white/40">{getPrice(state, crop).toFixed(1)}g each</span></span><span className="text-xs font-bold tabular-nums text-white/70">×{have}</span><SmallButton onClick={() => sell({ type: 'sell', crop, qty: have }, `Sold ${have} ${CROPS[crop].name} · +${total}g`)} disabled={have < 1}>Sell · {total}g</SmallButton></div>; })}
          {ITEM_IDS.filter((item) => item !== 'flour' && state.items[item] > 0).length > 0 ? <div className="pt-2 text-[10px] font-semibold uppercase text-white/35">Processed goods</div> : null}
          {ITEM_IDS.filter((item) => item !== 'flour' && state.items[item] > 0).map((item) => { const have = state.items[item]; return <div key={item} className="flex items-center gap-2 border-b border-white/[0.08] py-2"><span className="min-w-0 flex-1 text-xs font-semibold">{itemLabel(item)}</span><span className="text-xs text-white/45">{have} · {ITEM_SELL_VALUES[item]}g</span><SmallButton onClick={() => sell({ type: 'sellItem', item, qty: have }, `Sold ${have} ${itemLabel(item)} · +${have * ITEM_SELL_VALUES[item]}g`)} disabled={have < 1}>Sell all</SmallButton></div>; })}
        </div>
      )}

      {tab === 'orders' && <ContractBoard state={state} dispatch={dispatch} />}

      {tab === 'seeds' && <div><div className="grid grid-cols-1 gap-2 min-[380px]:grid-cols-2">{availableCrops(state).map((crop) => <div key={crop} className="flex items-center gap-2 border border-white/[0.08] bg-black/[0.15] p-2"><Sprout size={15} className="shrink-0 text-emerald-300" /><div className="min-w-0 flex-1"><div className="truncate text-xs font-semibold">{CROPS[crop].name}</div><div className="text-[10px] text-white/40">{CROPS[crop].seedCost}g · {state.seeds[crop]} seeds</div><div className="truncate text-[9px] text-white/30">{CROPS[crop].growDays} days · {CROPS[crop].yieldUnits} yield · {CROPS[crop].preferredSoils.join('/')}</div></div><div className="flex shrink-0 flex-col gap-1"><SmallButton ariaLabel={`Buy one ${CROPS[crop].name} seed`} onClick={() => dispatch({ type: 'buySeeds', crop, qty: 1 })} disabled={state.gold < CROPS[crop].seedCost}>+1</SmallButton><SmallButton ariaLabel={`Buy five ${CROPS[crop].name} seeds`} onClick={() => dispatch({ type: 'buySeeds', crop, qty: 5 })} disabled={state.gold < CROPS[crop].seedCost * 5}>+5</SmallButton></div></div>)}</div>{cropUnlock ? <p className="mt-3 text-[10px] text-[#e6c36b]">Next supplier crop: {CROPS[cropUnlock.crop].name} at {cropUnlock.at} cultivated tiles · currently {cropUnlock.current}</p> : null}</div>}

      {tab === 'equipment' && <div className="space-y-3">
        <section className="border-y border-white/[0.08] py-3">
          <div className="flex items-center gap-2"><div className="min-w-0 flex-1"><div className="text-xs font-semibold">Fuel reserve</div><div className="text-[10px] text-white/40">Current reserve: {state.items.fuel ?? 0} · 10g each</div></div><div className="flex shrink-0 gap-1"><SmallButton ariaLabel="Buy one fuel" onClick={() => dispatch({ type: 'buyItem', item: 'fuel', qty: 1 })} disabled={state.gold < 10}>Buy 1</SmallButton><SmallButton ariaLabel="Buy five fuel" onClick={() => dispatch({ type: 'buyItem', item: 'fuel', qty: 5 })} disabled={state.gold < 50}>Buy 5</SmallButton></div></div>
        </section>
        {(Object.keys(UPGRADES) as UpgradeId[]).filter((id) => id !== 'truck' && (state.upgrades.includes(id) || upgradeRequirement(state, id).met)).map((id) => { const upgrade = UPGRADES[id]; const owned = state.upgrades.includes(id); const requirement = upgradeRequirement(state, id); const parts = id === 'tractor' ? MACHINE_COST.tractor.machineParts : id === 'seeder' ? MACHINE_COST.seeder.machineParts : 0; return <div key={id} className="flex items-center gap-2 border-b border-white/[0.08] py-3"><div className="min-w-0 flex-1"><div className="text-xs font-semibold">{upgrade.name}</div><div className="text-[10px] text-white/40">{upgrade.effect}</div>{parts > 0 ? <div className="text-[10px] text-white/35">Requires {parts} machine parts · current {state.items.machineParts}</div> : null}</div><SmallButton onClick={() => dispatch({ type: 'buyUpgrade', upgrade: id })} disabled={owned || !requirement.met || state.gold < upgrade.cost || state.items.machineParts < parts}>{owned ? 'Owned' : `${upgrade.cost}g`}</SmallButton></div>; })}
      </div>}
    </div>
  );
}

function FlowNode({ label, value, tone }: { label: string; value: string; tone: string }) {
  return <div className="min-w-0 flex-1 text-center"><div className="text-[9px] uppercase text-white/35">{label}</div><div className={`mt-1 text-sm font-bold tabular-nums ${tone}`}>{value}</div></div>;
}

function Progress({ value, max, tone }: { value: number; max: number; tone: string }) {
  const percent = max > 0 ? Math.min(100, Math.max(0, value / max * 100)) : 0;
  return <div className="h-1.5 overflow-hidden bg-white/[0.08]"><div className={`h-full ${tone}`} style={{ width: `${percent}%` }} /></div>;
}

function Metric({ icon, label, value, sub, warning = false }: { icon: React.ReactNode; label: string; value: string; sub: string; warning?: boolean }) {
  return <div className="bg-[#111a15] p-2.5"><div className="flex items-center gap-1.5 text-[9px] font-semibold uppercase text-white/40">{icon}{label}</div><div className={`mt-1 text-base font-bold tabular-nums ${warning ? 'text-[#ef8f78]' : 'text-white'}`}>{value}</div><div className="text-[9px] text-white/40">{sub}</div></div>;
}

function StockGroup({ title, icon, entries, empty }: { title: string; icon: React.ReactNode; entries: Array<{ id: string; value: number; note: string }>; empty?: string }) {
  return <section><div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase text-white/40">{icon}{title}</div>{entries.length === 0 ? <p className="border-y border-white/10 py-3 text-xs text-white/35">{empty}</p> : <div className="grid grid-cols-2 gap-px bg-white/10">{entries.map((entry) => <div key={entry.id} className="bg-[#111a15] p-2.5"><div className="truncate text-xs font-semibold">{entry.note}</div><div className="mt-1 text-lg font-bold tabular-nums text-[#f1d27a]">{entry.value}</div></div>)}</div>}</section>;
}

function Command({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return <button onClick={onClick} disabled={disabled} className="rounded-md bg-[#d9b95f] px-3 py-2 text-xs font-bold text-[#17201d] disabled:opacity-35">{children}</button>;
}

function SmallButton({ children, onClick, disabled, ariaLabel }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; ariaLabel?: string }) {
  return <button onClick={onClick} disabled={disabled} aria-label={ariaLabel} className="min-h-9 rounded-md border border-white/[0.15] px-2 py-1 text-[10px] font-semibold hover:bg-white/[0.08] disabled:opacity-30">{children}</button>;
}
