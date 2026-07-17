'use client';

import { GameState } from '../lib/types';
import { seasonForDay, dayOfSeason } from '../lib/engine/weather';
import { SEASON_LENGTH } from '../lib/balance';

interface Props {
  state: GameState;
  onMenu: () => void;
}

export function HudBar({ state, onMenu }: Props) {
  const season = seasonForDay(state.day);
  const dayInSeason = dayOfSeason(state.day) + 1;
  const apLow = state.ap <= 2;

  return (
    <div className="flex items-center justify-between gap-2 px-3 py-2 bg-emerald-950/90 text-white border-b border-emerald-800">
      <button
        onClick={onMenu}
        className="flex flex-col items-start leading-tight"
        aria-label="Open menu"
      >
        <span className="text-sm font-semibold">
          {season} · Day {dayInSeason}
          <span className="text-emerald-400/70">/{SEASON_LENGTH}</span>
        </span>
        <span className="text-[10px] text-emerald-300/60">Total day {state.day} · tap for menu</span>
      </button>
      <div className="flex items-center gap-3 text-sm font-semibold">
        <span className="flex items-center gap-1">
          <span>💰</span>
          <span>{Math.round(state.gold)}</span>
        </span>
        <span
          className={`flex items-center gap-1 rounded px-1.5 py-0.5 ${
            apLow ? 'bg-red-600/40 text-red-100' : 'bg-emerald-800/60'
          }`}
        >
          <span>⚡</span>
          <span>
            {state.ap}/{state.apMax}
          </span>
        </span>
      </div>
    </div>
  );
}
