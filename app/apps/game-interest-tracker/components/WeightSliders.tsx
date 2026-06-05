'use client';

import { SignalWeights } from '../lib/types';

interface Props {
  weights: SignalWeights;
  onChange: (weights: SignalWeights) => void;
}

const SIGNAL_LABELS: { key: keyof SignalWeights; label: string; auto: boolean }[] = [
  { key: 'youtubeBuzz', label: 'YouTube Buzz', auto: true },
  { key: 'wikipediaViews', label: 'Wikipedia Views', auto: true },
  { key: 'psStoreRank', label: 'PS Store Rank', auto: false },
  { key: 'subredditGrowth', label: 'Sub Growth', auto: false },
  { key: 'trendsIndex', label: 'Google Trends', auto: false },
];

export function WeightSliders({ weights, onChange }: Props) {
  const total = Object.values(weights).reduce((a, b) => a + b, 0);

  return (
    <div className="bg-gray-900/40 border border-white/8 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-medium text-sm">Signal Weights</h3>
        <span className="text-xs text-gray-500">Total: {total}</span>
      </div>
      <div className="space-y-2.5">
        {SIGNAL_LABELS.map(({ key, label, auto }) => (
          <div key={key} className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${auto ? 'bg-green-400' : 'bg-amber-400'}`} />
                <span className="text-xs text-gray-400">{label}</span>
              </div>
              <span className="text-xs font-medium text-white w-6 text-right">{weights[key]}</span>
            </div>
            <input
              type="range"
              min={0}
              max={60}
              step={5}
              value={weights[key]}
              onChange={e => onChange({ ...weights, [key]: parseInt(e.target.value, 10) })}
              className="w-full h-1.5 bg-gray-700 rounded-full appearance-none cursor-pointer accent-purple-500"
            />
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-600">Weights are relative — they don't need to sum to 100.</p>
    </div>
  );
}
