'use client';

import { useState } from 'react';
import {
  Clock3,
  Coins,
  Droplets,
  Factory,
  Hand,
  Hammer,
  Menu,
  Moon,
  Pickaxe,
  Sprout,
  Tractor,
  Wrench,
  Wheat,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { CropId, GameState } from '../lib/types';
import { CROPS } from '../data/crops';
import { WEATHER_META } from '../data/weather';
import { RESERVOIR_CAP } from '../lib/balance';
import { dayOfSeason, seasonForDay } from '../lib/engine/weather';
import { CAN_MAX_CHARGES, ToolId } from '../lib/realtime/player';
import { formatClock } from '../lib/realtime/clock';

const BASE_TOOLS: { id: ToolId; Icon: LucideIcon; label: string }[] = [
  { id: 'hand', Icon: Hand, label: 'Harvest' },
  { id: 'hoe', Icon: Pickaxe, label: 'Till' },
  { id: 'can', Icon: Droplets, label: 'Water' },
  { id: 'seeds', Icon: Sprout, label: 'Plant' },
  { id: 'builder', Icon: Hammer, label: 'Build' },
];

interface Props {
  state: GameState;
  tool: ToolId;
  waterCharges: number;
  selectedCrop: CropId | null;
  hasSelection: boolean;
  onMenu: () => void;
  onToolPick: (tool: ToolId) => void;
  onCropPick: (crop: CropId) => void;
  onMarket: () => void;
  onEndDay: () => void;
}

export function HudBar({
  state,
  tool,
  waterCharges,
  selectedCrop,
  hasSelection,
  onMenu,
  onToolPick,
  onCropPick,
  onMarket,
  onEndDay,
}: Props) {
  const [toolsOpen, setToolsOpen] = useState(false);
  const season = seasonForDay(state.day);
  const day = dayOfSeason(state.day) + 1;
  const weather = state.weatherTruth[dayOfSeason(state.day)];
  const water = Math.min(100, Math.round(state.reservoir / RESERVOIR_CAP * 100));
  const tools = [...BASE_TOOLS];
  if (state.upgrades.includes('tractor')) tools.push({ id: 'tractor', Icon: Tractor, label: 'Tractor' });
  if (state.upgrades.includes('seeder')) tools.push({ id: 'seeder', Icon: Wheat, label: 'Seeder' });
  const active = tools.find((item) => item.id === tool) ?? tools[0];

  const pickTool = (next: ToolId) => {
    onToolPick(next);
    if (next !== 'seeds') setToolsOpen(false);
  };
  const openMarket = () => {
    setToolsOpen(false);
    onMarket();
  };

  return (
    <>
      <header className="pointer-events-none absolute inset-x-0 top-0 z-20 px-2 pt-[max(0.5rem,env(safe-area-inset-top))] text-white md:px-4 md:pt-4">
        <div className="pointer-events-auto mx-auto flex h-12 max-w-6xl items-center gap-2 rounded-md border border-white/10 bg-[#101713]/90 px-1.5 shadow-xl backdrop-blur-xl">
          <button type="button" onClick={onMenu} aria-label="Open menu" className="grid size-9 shrink-0 place-items-center rounded-md text-white/65 hover:bg-white/10 hover:text-white">
            <Menu size={18} />
          </button>
          <div className="min-w-0 border-l border-white/10 pl-2 leading-tight">
            <p className="truncate text-[9px] font-semibold uppercase text-[#91ca8d]">{season} · Day {day}</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs font-bold tabular-nums"><Clock3 size={13} className="text-white/45" />{formatClock(state.time)}</p>
          </div>
          <div className="flex min-w-0 items-center gap-1.5 border-l border-white/10 pl-2">
            <span className="text-base" aria-hidden="true">{WEATHER_META[weather].emoji}</span>
            <span className="hidden truncate text-[10px] font-semibold text-white/60 min-[360px]:block">{WEATHER_META[weather].label}</span>
          </div>
          <div className="ml-auto flex items-center gap-2 pr-1 text-xs font-semibold tabular-nums">
            <span className="hidden items-center gap-1 text-[#71bddd] min-[410px]:flex"><Droplets size={14} />{water}%</span>
            <span className="flex items-center gap-1 text-[#efd275]"><Coins size={14} />{Math.round(state.gold)}</span>
          </div>
        </div>
      </header>

      {!hasSelection ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:bottom-4 md:left-4 md:right-auto md:p-0">
          {toolsOpen ? (
            <div className="pointer-events-auto mx-auto mb-2 max-w-sm rounded-md border border-white/10 bg-[#101713]/95 p-2 text-white shadow-2xl backdrop-blur-xl md:mx-0 md:w-[352px]">
              <div className="mb-2 flex h-8 items-center justify-between px-1">
                <span className="text-[10px] font-semibold uppercase text-white/45">Tools</span>
                <button type="button" onClick={() => setToolsOpen(false)} aria-label="Close tools" className="grid size-8 place-items-center rounded-md text-white/50 hover:bg-white/10"><X size={15} /></button>
              </div>
              <div className="grid grid-cols-5 gap-1">
                {tools.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => pickTool(item.id)}
                    aria-pressed={tool === item.id}
                    className={`relative flex h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-md border text-[9px] font-medium ${tool === item.id ? 'border-[#efd275] bg-[#efd275]/12 text-[#efd275]' : 'border-transparent text-white/60 hover:bg-white/[0.07]'}`}
                  >
                    <item.Icon size={18} />
                    <span className="max-w-full truncate px-1">{item.label}</span>
                    {item.id === 'can' ? <span className="absolute inset-x-2 bottom-1 h-0.5 bg-white/10"><span className="block h-full bg-[#71bddd]" style={{ width: `${waterCharges / CAN_MAX_CHARGES * 100}%` }} /></span> : null}
                  </button>
                ))}
              </div>
              {tool === 'seeds' ? (
                <div className="mt-2 flex gap-1 overflow-x-auto border-t border-white/10 pt-2">
                  {(Object.keys(CROPS) as CropId[]).map((crop) => (
                    <button
                      type="button"
                      key={crop}
                      disabled={(state.seeds[crop] ?? 0) < 1}
                      onClick={() => { onCropPick(crop); setToolsOpen(false); }}
                      className={`h-12 w-12 shrink-0 rounded-md border text-center disabled:opacity-30 ${selectedCrop === crop ? 'border-[#efd275] bg-[#efd275]/10' : 'border-white/10 bg-black/20'}`}
                    >
                      <span className="block text-lg leading-5">{CROPS[crop].emoji}</span>
                      <span className="block text-[9px] text-white/45">{state.seeds[crop] ?? 0}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          <nav aria-label="Farm controls" className="pointer-events-auto mx-auto grid h-14 max-w-sm grid-cols-4 rounded-md border border-white/10 bg-[#101713]/92 p-1 text-white shadow-2xl backdrop-blur-xl md:mx-0 md:w-[352px]">
            <button type="button" onClick={() => setToolsOpen((value) => !value)} className="flex min-w-0 items-center justify-center gap-2 rounded-md text-xs font-semibold text-white/70 hover:bg-white/[0.07]">
              <active.Icon size={18} className="text-[#efd275]" /><span className="truncate">{active.label}</span>
            </button>
            <button type="button" onClick={openMarket} className="grid place-items-center rounded-md text-white/60 hover:bg-white/[0.07]" aria-label="Farm operations"><Factory size={19} /></button>
            <button type="button" onClick={() => pickTool('builder')} className="grid place-items-center rounded-md text-white/60 hover:bg-white/[0.07]" aria-label="Build"><Wrench size={19} /></button>
            <button type="button" onClick={onEndDay} className="grid place-items-center rounded-md text-[#b7bde6] hover:bg-white/[0.07]" aria-label="End day"><Moon size={19} /></button>
          </nav>
        </div>
      ) : null}
    </>
  );
}
