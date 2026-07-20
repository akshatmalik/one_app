'use client';

import { ChevronDown, ChevronUp, Target } from 'lucide-react';
import { useState } from 'react';
import { GameState } from '../lib/types';
import { farmGoals, openingObjective } from '../lib/engine/opening';

export function OpeningObjective({ state }: { state: GameState }) {
  const [collapsed, setCollapsed] = useState(false);
  const opening = openingObjective(state);
  const goals = farmGoals(state);
  const goal = goals[0];
  if (!opening && !goal) return null;

  const title = opening?.title ?? goal.title;
  const target = opening?.target ?? goal.target;
  const reward = opening?.reward ?? goal.reward;
  const progress = Math.min(target, opening ? state.opening?.progress ?? 0 : goal.progress);
  const percent = target > 0 ? progress / target * 100 : 0;

  return (
    <aside className="pointer-events-auto absolute left-2 top-[calc(max(0.375rem,env(safe-area-inset-top))+3.1rem)] z-20 w-[min(240px,calc(100vw-1rem))] overflow-hidden rounded-md border border-white/10 bg-[#0d1511]/94 text-white shadow-xl backdrop-blur-xl md:left-4 md:top-[4.25rem]">
      <button type="button" onClick={() => setCollapsed((value) => !value)} aria-expanded={!collapsed} className="flex min-h-10 w-full items-center gap-2 px-2.5 text-left hover:bg-white/[0.06]">
        <Target size={15} className="shrink-0 text-[#efd275]" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[10px] font-bold">{opening ? title : `Next: ${title}`}</span>
          <span className="block text-[9px] tabular-nums text-white/50">{progress}/{target}</span>
        </span>
        {collapsed ? <ChevronDown size={14} className="text-white/45" /> : <ChevronUp size={14} className="text-white/45" />}
      </button>
      <div className="h-1 bg-white/10"><div className="h-full bg-[#efd275] transition-[width]" style={{ width: `${percent}%` }} /></div>
      {!collapsed ? <div className="px-2.5 py-2">
        <p className="text-[10px] font-medium text-white/75">{opening?.instruction ?? `${progress} of ${target}`}</p>
        <p className="mt-1 text-[9px] text-[#91ca8d]">Reward: {reward}</p>
        {!opening && goals.length > 1 ? <p className="mt-1.5 border-t border-white/10 pt-1.5 text-[9px] text-white/45">Also working toward: {goals.slice(1).map((goal) => goal.title).join(' · ')}</p> : null}
      </div> : null}
    </aside>
  );
}
