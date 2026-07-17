'use client';

import { GameState } from '../lib/types';
import { seasonForDay, dayOfSeason } from '../lib/engine/weather';
import { WEATHER_META } from '../data/weather';
import { FORECAST_ACCURACY } from '../lib/balance';

interface Props {
  state: GameState;
}

export function ForecastStrip({ state }: Props) {
  const today = state.weatherTruth[dayOfSeason(state.day)];
  const todayMeta = WEATHER_META[today];

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-sky-950/80 text-sky-100 text-xs border-b border-sky-900 overflow-x-auto">
      <span className="flex items-center gap-1 shrink-0">
        <span className="text-sky-400/70">today</span>
        <span className="text-base">{todayMeta.emoji}</span>
      </span>
      <span className="text-sky-700">│</span>
      {state.forecast.map((w, i) => {
        const acc = Math.round((FORECAST_ACCURACY[i] ?? 0.5) * 100);
        return (
          <span key={i} className="flex items-center gap-1 shrink-0">
            <span className="text-base">{w ? WEATHER_META[w].emoji : '❔'}</span>
            <span className="text-[10px] text-sky-400/60">{w ? `${acc}%` : '?'}</span>
          </span>
        );
      })}
      <span className="text-[10px] text-sky-500/50 ml-auto shrink-0 pl-2">3-day forecast</span>
    </div>
  );
}
