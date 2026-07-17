'use client';

import { Boxes, Clock3, Coins, Droplets, Factory, Hand, Hammer, Menu, Moon, Pickaxe, Sprout, Tractor, Wheat } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { CropId, GameState } from '../lib/types';
import { CROPS } from '../data/crops';
import { WEATHER_META } from '../data/weather';
import { RESERVOIR_CAP, SEASON_LENGTH } from '../lib/balance';
import { millStatus } from '../lib/engine/production';
import { productionProjection, waterProjection } from '../lib/engine/engineering';
import { dayOfSeason, seasonForDay } from '../lib/engine/weather';
import { CAN_MAX_CHARGES, ToolId } from '../lib/realtime/player';
import { formatClock } from '../lib/realtime/clock';

const BASE_TOOLS: { id: ToolId; Icon: LucideIcon; label: string; key: string }[] = [
  { id: 'hand', Icon: Hand, label: 'Harvest', key: '1' },
  { id: 'hoe', Icon: Pickaxe, label: 'Till', key: '2' },
  { id: 'can', Icon: Droplets, label: 'Water', key: '3' },
  { id: 'seeds', Icon: Sprout, label: 'Plant', key: '4' },
  { id: 'builder', Icon: Hammer, label: 'Build', key: '5' },
];

interface Props {
  state: GameState;
  tool: ToolId;
  waterCharges: number;
  selectedCrop: CropId | null;
  onMenu: () => void;
  onToolPick: (tool: ToolId) => void;
  onCropPick: (crop: CropId) => void;
  onMarket: () => void;
  onEndDay: () => void;
  facingIdx: number | null;
}

function targetReadout(state: GameState, idx: number | null): { title: string; detail: string; tone: string } | null {
  if (idx === null || !state.tiles[idx]) return null;
  const tile = state.tiles[idx];
  if (tile.crop) {
    const crop = CROPS[tile.crop.cropId];
    return {
      title: crop.name,
      detail: tile.crop.mature ? 'Ready to harvest' : `Growth ${tile.crop.growthDays}/${crop.growDays} · Moisture ${Math.round(tile.moisture)}%`,
      tone: tile.crop.mature ? 'text-[#f2c14e]' : tile.moisture < crop.waterNeed ? 'text-[#ef8f78]' : 'text-[#8fd6a1]',
    };
  }
  const labels: Partial<Record<typeof tile.kind, [string, string]>> = {
    grass: ['Meadow', 'Unworked ground'],
    tilled: ['Tilled soil', `Moisture ${Math.round(tile.moisture)}% · Nitrogen ${Math.round(tile.nitrogen)}%`],
    locked: ['Unowned land', 'Purchase the surrounding parcel'],
    brush: ['Dense brush', 'Clearing cost applies'],
    rock: ['Boulder', 'Clearing cost applies'],
    marsh: ['Wet ground', 'Drainage cost applies'],
    reservoir: ['Reservoir', `${Math.round(state.reservoir)} water stored`],
    channel: ['Irrigation channel', tile.irrigated ? 'Connected to water' : 'Disconnected'],
    sprinkler: ['Sprinkler', tile.irrigated ? 'Supplied' : 'No water connection'],
    well: ['Well', 'Adds 30 water each dawn'],
    crate: ['Field crate', state.fieldCrates.find((crate) => crate.idx === idx) ? `${state.fieldCrates.find((crate) => crate.idx === idx)!.wheat}/${state.fieldCrates.find((crate) => crate.idx === idx)!.capacity} wheat` : 'Local harvest storage'],
    mill: ['Flour mill', millStatus(state)],
    depot: ['Shipping depot', 'Exports flour and crops'],
    shed: ['Farmhouse', 'Farm operations base'],
    path: ['Farm road', 'Logistics access'],
  };
  const label = labels[tile.kind];
  return label ? { title: label[0], detail: label[1], tone: 'text-white' } : null;
}

export function HudBar({
  state,
  tool,
  waterCharges,
  selectedCrop,
  onMenu,
  onToolPick,
  onCropPick,
  onMarket,
  onEndDay,
  facingIdx,
}: Props) {
  const season = seasonForDay(state.day);
  const dayInSeason = dayOfSeason(state.day) + 1;
  const weather = state.weatherTruth[dayOfSeason(state.day)];
  const waterPct = Math.min(100, (state.reservoir / RESERVOIR_CAP) * 100);
  const production = productionProjection(state);
  const water = waterProjection(state);
  const tools = [...BASE_TOOLS];
  if (state.upgrades.includes('tractor')) tools.push({ id: 'tractor', Icon: Tractor, label: 'Tractor', key: '6' });
  if (state.upgrades.includes('seeder')) tools.push({ id: 'seeder', Icon: Wheat, label: 'Seeder', key: '7' });
  const target = targetReadout(state, facingIdx);

  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 p-2">
        <div className="mx-auto flex min-h-12 max-w-6xl items-center gap-1.5 border border-white/10 bg-[#111713]/95 px-2 py-1.5 text-white shadow-xl backdrop-blur-md md:gap-3">
          <button
            type="button"
            onClick={onMenu}
            aria-label="Open menu"
            title="Menu"
            className="pointer-events-auto grid h-9 w-9 shrink-0 place-items-center rounded-md text-white/70 hover:bg-white/10 hover:text-white"
          >
            <Menu size={18} />
          </button>

          <div className="shrink-0 border-l border-white/10 pl-2 leading-tight">
            <div className="text-[10px] font-semibold uppercase text-[#86c98a]">{season}</div>
            <div className="text-xs font-bold">Day {dayInSeason}<span className="text-white/35">/{SEASON_LENGTH}</span></div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 border-l border-white/10 pl-2 font-semibold tabular-nums text-[#f1d27a]" title="Farm time">
            <Clock3 size={14} />
            <span className="text-xs">{formatClock(state.time)}</span>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 border-l border-white/10 pl-2">
            <span className="text-lg" aria-hidden="true">{WEATHER_META[weather].emoji}</span>
            <div className="leading-tight">
              <div className="hidden text-[9px] uppercase text-white/35 sm:block">Today</div>
              <div className="text-[10px] font-semibold text-white/75 sm:text-xs">{WEATHER_META[weather].label}</div>
            </div>
          </div>

          <div className="hidden min-w-0 items-center gap-2 border-l border-white/10 pl-2 lg:flex">
            <span className="text-[9px] uppercase text-white/35">Next</span>
            {state.forecast.map((item, index) => (
              <span key={index} className="flex items-center gap-1 text-[10px] text-white/65">
                <span aria-hidden="true">{item ? WEATHER_META[item].emoji : '?'}</span>
                {item ? WEATHER_META[item].label : 'Unknown'}
              </span>
            ))}
          </div>

          <button type="button" onClick={onMarket} className="pointer-events-auto hidden min-w-0 flex-1 items-center gap-2 border-l border-white/10 pl-3 text-left hover:text-[#f1d27a] md:flex">
            <Factory size={16} className="shrink-0 text-[#f1d27a]" />
            <span className="truncate text-xs">{millStatus(state)}</span>
          </button>

          <div className="ml-auto flex shrink-0 items-center gap-2 text-xs font-semibold tabular-nums">
            <span className="hidden items-center gap-1 text-[#d9b95f] sm:flex" title="Stored wheat">
              <Boxes size={14} /> {production.crateWheat}/{production.capacity}
            </span>
            <span className="hidden items-center gap-1 text-[#75bde7] sm:flex" title={`Dawn demand ${water.demand}, well supply ${water.supply}`}>
              <Droplets size={14} /> {Math.round(waterPct)}% · {water.demand}/{water.supply}
            </span>
            <span className="flex items-center gap-1 text-[#f1d27a]">
              <Coins size={14} /> {Math.round(state.gold)}
            </span>
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 p-2">
        {tool === 'seeds' ? (
          <div className="pointer-events-auto mx-auto mb-1 flex w-fit max-w-full gap-1 overflow-x-auto border border-white/10 bg-[#111713]/95 p-1 shadow-xl backdrop-blur-md">
            {(Object.keys(CROPS) as CropId[]).map((crop) => {
              const active = selectedCrop === crop;
              const quantity = state.seeds[crop] ?? 0;
              return (
                <button
                  type="button"
                  key={crop}
                  disabled={quantity === 0}
                  onClick={() => onCropPick(crop)}
                  aria-label={`${CROPS[crop].name}, ${quantity} seeds`}
                  className={`h-12 w-12 shrink-0 rounded-md border text-center disabled:opacity-30 ${active ? 'border-[#f1d27a] bg-[#f1d27a]/15' : 'border-transparent hover:bg-white/10'}`}
                >
                  <span className="block text-lg leading-5">{CROPS[crop].emoji}</span>
                  <span className="block text-[9px] text-white/60">{quantity}</span>
                </button>
              );
            })}
          </div>
        ) : null}

        {target ? (
          <div className="mx-auto mb-1 flex w-fit max-w-[calc(100vw-1rem)] items-center gap-2 border border-white/10 bg-[#101914]/95 px-3 py-1.5 shadow-lg backdrop-blur-md">
            <span className={`text-xs font-bold ${target.tone}`}>{target.title}</span>
            <span className="h-3 w-px bg-white/15" />
            <span className="truncate text-[10px] text-white/55">{target.detail}</span>
          </div>
        ) : null}

        <div className="pointer-events-auto mx-auto flex w-fit max-w-full items-center gap-1 overflow-x-auto border border-white/10 bg-[#111713]/95 p-1 shadow-2xl backdrop-blur-md">
          <button
            type="button"
            onClick={onMarket}
            aria-label="Open farm operations"
            title="Farm operations"
            className="grid h-12 w-12 shrink-0 place-items-center rounded-md text-[#f1d27a] hover:bg-white/10"
          >
            <Factory size={21} />
          </button>
          <div className="mx-0.5 h-8 w-px shrink-0 bg-white/10" />
          {tools.map((item) => {
            const active = tool === item.id;
            return (
              <button
                type="button"
                key={item.id}
                onClick={() => onToolPick(item.id)}
                aria-label={item.label}
                title={`${item.label} (${item.key})`}
                className={`relative h-12 w-12 shrink-0 rounded-md border text-center ${active ? 'border-[#f1d27a] bg-[#f1d27a]/15' : 'border-transparent hover:bg-white/10'}`}
              >
                <item.Icon size={19} strokeWidth={1.8} className="mx-auto mb-0.5" />
                <span className="block text-[9px] text-white/55">{item.label}</span>
                {item.id === 'can' ? (
                  <span className="absolute inset-x-1 bottom-0.5 flex gap-px">
                    {Array.from({ length: CAN_MAX_CHARGES }, (_, index) => (
                      <span key={index} className={`h-0.5 flex-1 ${index < waterCharges ? 'bg-[#75bde7]' : 'bg-white/10'}`} />
                    ))}
                  </span>
                ) : null}
              </button>
            );
          })}
          <div className="mx-0.5 h-8 w-px shrink-0 bg-white/10" />
          <button
            type="button"
            onClick={onEndDay}
            aria-label="End day"
            title="Sleep until 06:00"
            className="grid h-12 w-12 shrink-0 place-items-center rounded-md text-[#aeb8e8] hover:bg-white/10"
          >
            <Moon size={21} />
          </button>
        </div>
      </div>
    </>
  );
}
