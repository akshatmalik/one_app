'use client';

import { GameState } from '../lib/types';
import { seasonForDay, dayOfSeason } from '../lib/engine/weather';
import { SEASON_LENGTH, RESERVOIR_CAP } from '../lib/balance';
import { WEATHER_META } from '../data/weather';
import { FORECAST_ACCURACY } from '../lib/balance';
import type { ToolId } from '../lib/realtime/player';
import { CAN_MAX_CHARGES } from '../lib/realtime/player';
import { CropId } from '../lib/types';
import { CROPS } from '../data/crops';

const TOOLS: { id: ToolId; icon: string; label: string }[] = [
  { id: 'hand',    icon: '🤲', label: 'Harvest' },
  { id: 'hoe',     icon: '⛏',  label: 'Hoe' },
  { id: 'can',     icon: '🚿', label: 'Water' },
  { id: 'seeds',   icon: '🌱', label: 'Plant' },
  { id: 'builder', icon: '🔨', label: 'Build' },
];

const SEASON_COLORS: Record<string, string> = {
  Spring: 'text-emerald-300',
  Summer: 'text-yellow-300',
  Fall:   'text-orange-300',
};

interface Props {
  state: GameState;
  tool: ToolId;
  waterCharges: number;
  selectedCrop: CropId | null;
  onMenu: () => void;
  onToolPick: (t: ToolId) => void;
  onCropPick: (c: CropId) => void;
  onMarket: () => void;
  onEndDay: () => void;
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
}: Props) {
  const season      = seasonForDay(state.day);
  const dayInSeason = dayOfSeason(state.day) + 1;
  const today       = state.weatherTruth[dayOfSeason(state.day)];
  const todayMeta   = WEATHER_META[today];
  const waterPct    = Math.max(0, Math.min(100, (state.reservoir / RESERVOIR_CAP) * 100));
  const waterLow    = state.reservoir < 30;
  const apPct       = (state.ap / state.apMax) * 100;
  const apLow       = state.ap <= 2;

  return (
    <>
      {/* ── TOP BAR — season, gold, AP, weather ─────────────────────────── */}
      <div className="absolute top-0 left-0 right-0 z-10 pointer-events-none">
        <div className="flex items-center gap-2 px-3 pt-3 pb-2">

          {/* Season / day pill */}
          <button
            onClick={onMenu}
            className="pointer-events-auto flex items-center gap-1.5 rounded-xl px-3 py-1.5
                       bg-black/60 backdrop-blur-sm border border-white/10 shadow-lg"
          >
            <span className={`text-xs font-bold ${SEASON_COLORS[season] ?? 'text-white'}`}>
              {season}
            </span>
            <span className="text-white/50 text-xs">·</span>
            <span className="text-white text-xs font-semibold">
              Day {dayInSeason}
              <span className="text-white/30">/{SEASON_LENGTH}</span>
            </span>
            <span className="text-white/30 text-xs ml-0.5">≡</span>
          </button>

          <div className="flex-1" />

          {/* Weather */}
          <div className="pointer-events-auto flex items-center gap-1 rounded-xl px-2 py-1.5
                          bg-black/60 backdrop-blur-sm border border-white/10 shadow-lg">
            <span className="text-base leading-none">{todayMeta.emoji}</span>
            <div className="flex gap-0.5 items-center">
              {state.forecast.map((w, i) => {
                const acc = Math.round((FORECAST_ACCURACY[i] ?? 0.5) * 100);
                return (
                  <span key={i} className="flex flex-col items-center">
                    <span className="text-[11px] leading-none">{w ? WEATHER_META[w].emoji : '❔'}</span>
                    <span className="text-[8px] text-white/30">{acc}%</span>
                  </span>
                );
              })}
            </div>
          </div>

          {/* Gold */}
          <div className="pointer-events-auto flex items-center gap-1 rounded-xl px-3 py-1.5
                          bg-black/60 backdrop-blur-sm border border-white/10 shadow-lg">
            <span className="text-sm">💰</span>
            <span className="text-yellow-300 font-bold text-sm tabular-nums">{Math.round(state.gold)}</span>
          </div>
        </div>

        {/* AP + Water bars — thin strips right under the top pills */}
        <div className="flex gap-2 px-3 pb-1">
          {/* AP bar */}
          <div className="flex items-center gap-1.5 flex-1">
            <span className="text-[10px] text-white/50">⚡</span>
            <div className="flex-1 h-1.5 rounded-full bg-black/40 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${apLow ? 'bg-red-400' : 'bg-yellow-400'}`}
                style={{ width: `${apPct}%` }}
              />
            </div>
            <span className={`text-[10px] tabular-nums font-bold ${apLow ? 'text-red-300' : 'text-white/60'}`}>
              {state.ap}/{state.apMax}
            </span>
          </div>
          {/* Water bar */}
          <div className="flex items-center gap-1.5 flex-1">
            <span className="text-[10px] text-white/50">💧</span>
            <div className="flex-1 h-1.5 rounded-full bg-black/40 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${waterLow ? 'bg-red-400' : 'bg-sky-400'}`}
                style={{ width: `${waterPct}%` }}
              />
            </div>
            <span className={`text-[10px] tabular-nums font-bold ${waterLow ? 'text-red-300' : 'text-white/60'}`}>
              {Math.round(state.reservoir)}/{RESERVOIR_CAP}
            </span>
          </div>
        </div>
      </div>

      {/* ── BOTTOM HUD — tools + actions ─────────────────────────────────── */}
      <div className="absolute bottom-0 left-0 right-0 z-10 pointer-events-none">

        {/* Seeds strip (above tools, only when seeds tool active) */}
        {tool === 'seeds' && (
          <div className="pointer-events-auto flex gap-1.5 px-3 pb-1">
            {(Object.keys(CROPS) as CropId[]).map((cropId) => {
              const def = CROPS[cropId];
              const qty = state.seeds[cropId] ?? 0;
              const active = selectedCrop === cropId;
              return (
                <button
                  key={cropId}
                  disabled={qty === 0}
                  onClick={() => onCropPick(cropId)}
                  className={`flex-1 flex flex-col items-center py-1.5 rounded-xl border transition-all
                    ${active
                      ? 'bg-green-500/40 border-green-400 shadow-[0_0_8px_rgba(74,222,128,0.4)]'
                      : qty === 0
                        ? 'bg-black/30 border-white/5 opacity-40'
                        : 'bg-black/50 border-white/10 active:bg-white/10'
                    }`}
                >
                  <span className="text-base leading-none">{def.emoji}</span>
                  <span className="text-[9px] text-white/60 font-medium">{qty > 0 ? `×${qty}` : '0'}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Tool bar */}
        <div className="pointer-events-auto flex gap-1.5 px-3 pb-1">
          {TOOLS.map((t) => {
            const active = tool === t.id;
            return (
              <button
                key={t.id}
                onClick={() => onToolPick(t.id)}
                className={`flex-1 flex flex-col items-center py-2 rounded-xl border transition-all text-lg
                  ${active
                    ? 'bg-yellow-400/20 border-yellow-400/60 shadow-[0_0_10px_rgba(250,204,21,0.3)]'
                    : 'bg-black/50 border-white/10 active:bg-white/10'
                  }`}
              >
                <span className="leading-none">{t.icon}</span>
                <span className="text-[9px] text-white/60 font-medium mt-0.5">{t.label}</span>
                {t.id === 'can' && (
                  <div className="flex gap-0.5 mt-0.5">
                    {Array.from({ length: CAN_MAX_CHARGES }).map((_, i) => (
                      <span
                        key={i}
                        className={`w-1 h-1 rounded-full ${i < waterCharges ? 'bg-sky-400' : 'bg-white/15'}`}
                      />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Action bar */}
        <div className="pointer-events-auto flex gap-2 px-3 pb-4">
          <button
            onClick={onMarket}
            className="flex-1 rounded-xl py-2.5 text-sm font-bold
                       bg-amber-600/80 border border-amber-500/50 backdrop-blur-sm
                       shadow-lg active:bg-amber-700 transition-colors"
          >
            🛒 Market
          </button>
          <button
            onClick={onEndDay}
            className="flex-1 rounded-xl py-2.5 text-sm font-bold
                       bg-indigo-600/80 border border-indigo-500/50 backdrop-blur-sm
                       shadow-lg active:bg-indigo-700 transition-colors
                       shadow-[0_0_16px_rgba(99,102,241,0.4)]"
          >
            🌙 End Day
          </button>
        </div>
      </div>
    </>
  );
}
