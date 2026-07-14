'use client';

import { DayRecap as DayRecapType } from '../lib/types';
import { WEATHER_META } from '../data/weather';

interface Props {
  recap: DayRecapType;
  onClose: () => void;
}

const SEV_STYLE: Record<string, string> = {
  good: 'bg-emerald-900/60 border-emerald-600 text-emerald-100',
  bad: 'bg-red-900/50 border-red-700 text-red-100',
  info: 'bg-slate-800 border-slate-600 text-slate-200',
};

export function DayRecap({ recap, onClose }: Props) {
  const meta = WEATHER_META[recap.weather];
  const nextMeta = WEATHER_META[recap.nextWeather];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center p-3">
      <div className="w-full max-w-sm bg-slate-900 rounded-xl p-4 space-y-3 max-h-[80vh] overflow-y-auto">
        <div className="text-center">
          <div className="text-4xl">{meta.emoji}</div>
          <div className="text-white font-bold">Day {recap.day} · {meta.label}</div>
        </div>

        <div className="space-y-1.5">
          {recap.events.map((e, i) => (
            <div
              key={i}
              className={`rounded-lg border px-3 py-2 text-xs ${SEV_STYLE[e.severity]}`}
            >
              {e.text}
            </div>
          ))}
        </div>

        <div className="rounded-lg bg-emerald-950 border border-emerald-800 p-3 text-center text-emerald-100">
          <div className="text-[11px] text-emerald-400/70">Tomorrow</div>
          <div className="text-sm font-semibold">
            Day {recap.nextDay} · {nextMeta.emoji} {nextMeta.label}
          </div>
          <div className="text-[11px] text-emerald-300/70 mt-1">
            💧 {Math.round(recap.reservoir)} in reservoir
            {recap.harvestReadyCount > 0 && ` · 🌾 ${recap.harvestReadyCount} ready to harvest`}
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full rounded-lg bg-emerald-600 py-3 text-white font-bold"
        >
          Start Day {recap.nextDay} ▸
        </button>
      </div>
    </div>
  );
}
