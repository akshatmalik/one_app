'use client';

import type { LucideIcon } from 'lucide-react';
import { Brush, Droplets, Hammer, Package, Sprout, Waves } from 'lucide-react';
import { GameState } from '../lib/types';
import { GOLD_COST, MAX_WELLS } from '../lib/balance';

export type BuildTool = 'channel' | 'well' | 'sprinkler' | 'crate' | 'clear' | 'demolish';

interface Props {
  state: GameState;
  tool: BuildTool | null;
  onPick: (tool: BuildTool | null) => void;
}

export function BuildPanel({ state, tool, onPick }: Props) {
  const tools: {
    id: BuildTool;
    label: string;
    cost: string;
    effect: string;
    icon: LucideIcon;
    disabled?: boolean;
  }[] = [
    { id: 'channel', label: 'Channel', cost: `${GOLD_COST.channel}g`, effect: 'Carry water', icon: Waves },
    {
      id: 'well',
      label: 'Well',
      cost: `${GOLD_COST.well}g`,
      effect: '+30 water/day',
      icon: Droplets,
      disabled: state.wells >= MAX_WELLS,
    },
    {
      id: 'sprinkler',
      label: 'Sprinkler',
      cost: `${GOLD_COST.sprinkler}g`,
      effect: 'Channel adjacent',
      icon: Sprout,
    },
    {
      id: 'crate',
      label: 'Field crate',
      cost: `${GOLD_COST.fieldCrate}g`,
      effect: 'Harvest radius 4',
      icon: Package,
    },
    {
      id: 'clear',
      label: 'Clear land',
      cost: `${GOLD_COST.clearBrush}-${GOLD_COST.drainMarsh}g`,
      effect: 'Remove terrain',
      icon: Brush,
    },
    { id: 'demolish', label: 'Demolish', cost: 'Free', effect: 'Remove structure', icon: Hammer },
  ];

  return (
    <div className="bg-[#111a15] p-3 text-white">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase text-slate-300">Build tools</h2>
        <span className="text-[10px] font-medium text-slate-500" aria-live="polite">
          {tool ? `Active: ${tools.find((t) => t.id === tool)?.label}` : 'None active'}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2" role="toolbar" aria-label="Build tools">
        {tools.map((t) => (
          <button
            key={t.id}
            disabled={t.disabled}
            type="button"
            aria-pressed={tool === t.id}
            aria-label={`${t.label}: ${t.cost}, ${t.effect}${t.disabled ? ', unavailable' : ''}`}
            title={`${t.label} · ${t.cost} · ${t.effect}`}
            onClick={() => onPick(tool === t.id ? null : t.id)}
            className={`flex min-h-[68px] items-start gap-2 rounded-md border p-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d9b95f] disabled:cursor-not-allowed disabled:opacity-40 ${
              tool === t.id
                ? 'border-[#d9b95f] bg-[#d9b95f]/15 text-[#f3d778] shadow-[inset_3px_0_0_#d9b95f]'
                : 'border-white/10 bg-black/20 hover:border-white/20 hover:bg-white/5'
            }`}
          >
            <t.icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" strokeWidth={1.8} />
            <span className="min-w-0">
              <span className="block truncate text-xs font-semibold leading-4">{t.label}</span>
              <span className="mt-1 block truncate text-[10px] leading-3 text-slate-400">
                <span className="font-medium text-slate-300">{t.cost}</span> · {t.effect}
              </span>
            </span>
          </button>
        ))}
      </div>
      {state.wells >= MAX_WELLS && (
        <div className="mt-2 text-[10px] text-amber-300/70" role="status">
          Well limit reached ({MAX_WELLS})
        </div>
      )}
    </div>
  );
}
