'use client';

import { useState } from 'react';
import {
  Coins,
  Droplets,
  Factory,
  Hand,
  Hammer,
  Menu,
  Moon,
  Pause,
  Pickaxe,
  Play,
  Sprout,
  Tractor,
  Wheat,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { CropId, GameState } from '../lib/types';
import { CROPS } from '../data/crops';
import { WEATHER_META } from '../data/weather';
import { dayOfSeason, seasonForDay } from '../lib/engine/weather';
import { ToolId } from '../lib/realtime/player';
import { formatClock } from '../lib/realtime/clock';
import { waterProjection } from '../lib/engine/engineering';
import { availableCrops, irrigationAvailable } from '../lib/engine/opening';

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
  waterCapacity: number;
  selectedCrop: CropId | null;
  paused: boolean;
  endDayDisabled: boolean;
  timeScale: 1 | 2 | 4;
  hideDock?: boolean;
  operationsUnlocked?: boolean;
  onTogglePause: () => void;
  onCycleSpeed: () => void;
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
  waterCapacity,
  selectedCrop,
  paused,
  endDayDisabled,
  timeScale,
  hideDock = false,
  operationsUnlocked = true,
  onTogglePause,
  onCycleSpeed,
  onMenu,
  onToolPick,
  onCropPick,
  onMarket,
  onEndDay,
}: Props) {
  const [panel, setPanel] = useState<'tools' | 'seeds' | 'forecast' | null>(null);
  const season = seasonForDay(state.day);
  const day = dayOfSeason(state.day) + 1;
  const weather = state.weatherTruth[dayOfSeason(state.day)];
  const water = waterProjection(state);
  const tools = BASE_TOOLS.filter((item) => item.id !== 'builder' || irrigationAvailable(state));
  if (state.upgrades.includes('tractor')) tools.push({ id: 'tractor', Icon: Tractor, label: 'Tractor' });
  if (state.upgrades.includes('seeder')) tools.push({ id: 'seeder', Icon: Wheat, label: 'Seeder' });
  const active = tools.find((item) => item.id === tool) ?? tools[0];
  const visibleCrop = selectedCrop ?? 'wheat';

  const pickTool = (next: ToolId) => {
    onToolPick(next);
    setPanel(next === 'seeds' ? 'seeds' : null);
  };

  const pickCrop = (crop: CropId) => {
    onCropPick(crop);
    onToolPick('seeds');
    setPanel(null);
  };

  return (
    <>
      <header className="pointer-events-none absolute inset-x-0 top-0 z-20 px-2 pt-[max(0.375rem,env(safe-area-inset-top))] text-white md:px-4 md:pt-4">
        <div className="pointer-events-auto mx-auto flex h-11 max-w-6xl items-center rounded-md border border-white/10 bg-[#0d1511]/92 px-1 shadow-xl backdrop-blur-xl">
          <button type="button" onClick={onMenu} aria-label="Open menu" className="grid size-10 shrink-0 place-items-center rounded-md text-white/65 hover:bg-white/10 hover:text-white">
            <Menu size={18} />
          </button>
          <div className="w-12 shrink-0 border-l border-white/10 px-1.5 leading-none min-[390px]:w-14 min-[390px]:px-2">
            <p className="truncate text-[8px] font-bold uppercase text-[#91ca8d]"><span className="min-[390px]:hidden">{season.slice(0, 3)} {day}</span><span className="hidden min-[390px]:inline">{season} {day}</span></p>
            <p className="mt-1 text-xs font-bold tabular-nums">{formatClock(state.time)}</p>
          </div>
          <button
            type="button"
            onClick={() => setPanel((value) => value === 'forecast' ? null : 'forecast')}
            aria-expanded={panel === 'forecast'}
            aria-label="Show three-day weather forecast"
            className="flex min-w-0 items-center gap-1 rounded-md border-l border-white/10 px-1.5 hover:bg-white/10"
          >
            <span className="sr-only">Weather: {WEATHER_META[weather].label}</span>
            <span className="text-base" aria-hidden="true">{WEATHER_META[weather].emoji}</span>
            <span className="hidden truncate text-[9px] font-semibold text-white/55 min-[430px]:block" aria-hidden="true">{WEATHER_META[weather].label}</span>
          </button>
          <div className="ml-auto flex items-center gap-1 text-xs font-semibold tabular-nums">
            <span
              className={`flex items-center gap-1 px-1 ${water.sustainable ? 'text-[#71bddd]' : 'text-[#efa08c]'}`}
              role="status"
              aria-label={`Reservoir ${Math.round(state.reservoir)}. Projected dawn demand ${Math.round(water.demand)}. ${water.sustainable ? 'Water supply is sufficient.' : 'Water shortage projected.'}`}
              title={`${Math.round(state.reservoir)} water · ${Math.round(water.demand)} projected demand`}
            ><Droplets size={13} />{Math.round(state.reservoir)}</span>
            <span className="flex items-center gap-1 px-1 text-[#efd275]"><Coins size={14} />{Math.round(state.gold)}</span>
            <button
              type="button"
              onClick={onCycleSpeed}
              aria-label={`Game speed ${timeScale} times. Change speed.`}
              className="grid h-10 min-w-8 place-items-center rounded-md text-[10px] font-bold text-white/70 hover:bg-white/10"
            >{timeScale}×</button>
            <button
              type="button"
              onClick={onTogglePause}
              aria-label={paused ? 'Resume game' : 'Pause game'}
              aria-pressed={paused}
              className={`grid size-10 place-items-center rounded-md ${paused ? 'bg-[#efd275] text-[#17201d]' : 'text-white hover:bg-white/10'}`}
            >
              {paused ? <Play size={18} fill="currentColor" /> : <Pause size={18} fill="currentColor" />}
            </button>
          </div>
        </div>
      </header>

      {!hideDock && <div className="pointer-events-none absolute inset-x-0 bottom-0 z-40 px-2 pb-[max(0.375rem,env(safe-area-inset-bottom))] md:bottom-4 md:left-4 md:right-auto md:p-0">
        {panel ? (
          <div className="pointer-events-auto mx-auto mb-1.5 max-w-sm rounded-md border border-white/10 bg-[#0d1511]/95 p-2 text-white shadow-2xl backdrop-blur-xl md:mx-0 md:w-[360px]">
            <div className="mb-1 flex h-8 items-center justify-between px-1">
              <span className="text-[10px] font-bold uppercase text-white/45">{panel === 'tools' ? 'Choose tool' : panel === 'seeds' ? 'Seeds on hand' : 'Weather forecast'}</span>
              <button type="button" onClick={() => setPanel(null)} aria-label="Close picker" className="grid size-8 place-items-center rounded-md text-white/55 hover:bg-white/10"><X size={15} /></button>
            </div>
            {panel === 'tools' ? (
              <div className="grid grid-cols-5 gap-1">
                {tools.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => pickTool(item.id)}
                    aria-pressed={tool === item.id}
                    className={`relative flex h-12 min-w-0 flex-col items-center justify-center gap-0.5 rounded-md border text-[9px] font-medium ${tool === item.id ? 'border-[#efd275] bg-[#efd275]/12 text-[#efd275]' : 'border-transparent text-white/65 hover:bg-white/[0.07]'}`}
                  >
                    <item.Icon size={17} />
                    <span className="max-w-full truncate px-1">{item.label}</span>
                    {item.id === 'can' ? <span className="absolute inset-x-2 bottom-0.5 h-0.5 bg-white/10"><span className="block h-full bg-[#71bddd]" style={{ width: `${waterCharges / waterCapacity * 100}%` }} /></span> : null}
                  </button>
                ))}
              </div>
            ) : panel === 'seeds' ? (
              <div className="flex gap-1 overflow-x-auto pb-1" role="group" aria-label="Seed inventory">
                {availableCrops(state).map((crop) => {
                  const count = state.seeds[crop] ?? 0;
                  return (
                    <button
                      type="button"
                      key={crop}
                      onClick={() => pickCrop(crop)}
                      disabled={count < 1}
                      aria-label={`${CROPS[crop].name}: ${count} seeds`}
                      className={`h-14 w-14 shrink-0 rounded-md border text-center disabled:opacity-40 ${selectedCrop === crop ? 'border-[#efd275] bg-[#efd275]/10' : 'border-white/10 bg-black/20'}`}
                    >
                      <span className="block text-lg leading-5">{CROPS[crop].emoji}</span>
                      <span className="block truncate px-1 text-[8px] text-white/55">{CROPS[crop].name}</span>
                      <span className="block text-[10px] font-bold tabular-nums text-white">×{count}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1" role="list" aria-label="Three-day weather forecast">
                {state.forecast.map((nextWeather, index) => (
                  <div key={`${index}-${nextWeather ?? 'unknown'}`} className="rounded-md border border-white/10 bg-black/20 px-1 py-2 text-center" role="listitem">
                    <span className="block text-[9px] font-semibold uppercase text-white/45">{index === 0 ? 'Tomorrow' : `Day +${index + 1}`}</span>
                    <span className="mt-1 block text-lg leading-5" aria-hidden="true">{nextWeather ? WEATHER_META[nextWeather].emoji : '—'}</span>
                    <span className="mt-1 block truncate text-[9px] font-semibold text-white/70">{nextWeather ? WEATHER_META[nextWeather].label : 'Unknown'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}

        <nav aria-label="Farm controls" className="pointer-events-auto mx-auto grid h-12 max-w-sm grid-cols-4 rounded-md border border-white/10 bg-[#0d1511]/94 p-0.5 text-white shadow-2xl backdrop-blur-xl md:mx-0 md:w-[360px]">
          <button type="button" onClick={() => setPanel((value) => value === 'tools' ? null : 'tools')} aria-expanded={panel === 'tools'} className="flex min-w-0 flex-col items-center justify-center rounded-md text-[8px] font-semibold text-white/70 hover:bg-white/[0.07]">
            <active.Icon size={17} className="text-[#efd275]" /><span className="max-w-full truncate px-1">{active.label}</span>
          </button>
          <button type="button" onClick={() => setPanel((value) => value === 'seeds' ? null : 'seeds')} aria-expanded={panel === 'seeds'} aria-label={`${CROPS[visibleCrop].name}: ${state.seeds[visibleCrop] ?? 0} seeds`} className="flex min-w-0 flex-col items-center justify-center rounded-md text-[8px] font-semibold text-white/70 hover:bg-white/[0.07]">
            <span className="text-base leading-4" aria-hidden="true">{CROPS[visibleCrop].emoji}</span>
            <span className="max-w-full truncate px-1 tabular-nums">{CROPS[visibleCrop].name} ×{state.seeds[visibleCrop] ?? 0}</span>
          </button>
          <button type="button" onClick={() => { setPanel(null); onMarket(); }} disabled={!operationsUnlocked} className="grid place-items-center rounded-md text-white/65 hover:bg-white/[0.07] disabled:opacity-25" aria-label={operationsUnlocked ? 'Farm operations' : 'Farm operations unlock after the first harvest'}><Factory size={18} /></button>
          <button type="button" onClick={onEndDay} disabled={endDayDisabled} className="grid place-items-center rounded-md text-[#b7bde6] hover:bg-white/[0.07] disabled:opacity-35" aria-label="Sleep and end day"><Moon size={18} /></button>
        </nav>
        <span className="sr-only" aria-live="polite">{CROPS[visibleCrop].name}: {state.seeds[visibleCrop] ?? 0} seeds remaining</span>
      </div>}
    </>
  );
}
