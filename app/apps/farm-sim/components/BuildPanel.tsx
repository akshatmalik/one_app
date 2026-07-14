'use client';

import { GameState } from '../lib/types';
import { GOLD_COST, MAX_WELLS } from '../lib/balance';

export type BuildTool = 'channel' | 'well' | 'expand' | 'demolish';

interface Props {
  state: GameState;
  tool: BuildTool | null;
  onPick: (tool: BuildTool | null) => void;
}

export function BuildPanel({ state, tool, onPick }: Props) {
  const tools: { id: BuildTool; label: string; sub: string; disabled?: boolean }[] = [
    { id: 'channel', label: '〜 Channel', sub: `${GOLD_COST.channel}g · 2⚡` },
    {
      id: 'well',
      label: '🪣 Well',
      sub: `${GOLD_COST.well}g · 3⚡`,
      disabled: state.wells >= MAX_WELLS,
    },
    { id: 'expand', label: '➕ Buy land', sub: `${GOLD_COST.expandRing1}g+` },
    { id: 'demolish', label: '⛏️ Demolish', sub: '1⚡' },
  ];

  return (
    <div className="bg-slate-800 rounded-t-xl p-3 text-white">
      <div className="text-[11px] text-slate-400 mb-2">
        {tool
          ? `Tap a highlighted tile to ${tool === 'expand' ? 'buy it' : tool}. Tap the tool again to stop.`
          : 'Pick a tool, then tap tiles on the farm.'}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {tools.map((t) => (
          <button
            key={t.id}
            disabled={t.disabled}
            onClick={() => onPick(tool === t.id ? null : t.id)}
            className={`rounded-lg p-2 text-left border disabled:opacity-40 ${
              tool === t.id ? 'border-yellow-300 bg-slate-700' : 'border-slate-600 bg-slate-900/60'
            }`}
          >
            <div className="text-sm font-semibold">{t.label}</div>
            <div className="text-[10px] text-slate-400">{t.sub}</div>
          </button>
        ))}
      </div>
      {state.wells >= MAX_WELLS && (
        <div className="mt-2 text-[10px] text-amber-300/70">Max {MAX_WELLS} wells reached.</div>
      )}
    </div>
  );
}
