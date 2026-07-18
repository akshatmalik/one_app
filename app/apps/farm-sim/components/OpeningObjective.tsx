'use client';

import { ChevronDown, ChevronUp, Target } from 'lucide-react';
import { useState } from 'react';
import { GameState } from '../lib/types';
import { openingObjective } from '../lib/engine/opening';

export function OpeningObjective({ state }: { state: GameState }) {
  const [collapsed, setCollapsed] = useState(false);
  const objective = openingObjective(state);
  if (!objective || !state.opening) return null;

  const progress = Math.min(objective.target, state.opening.progress);
  const percent = objective.target > 0 ? progress / objective.target * 100 : 0;

  return (
    <aside className="pointer-events-auto absolute left-2 top-[calc(max(0.375rem,env(safe-area-inset-top))+3.1rem)] z-20 w-[min(240px,calc(100vw-1rem))] overflow-hidden rounded-md border border-white/10 bg-[#0d1511]/94 text-white shadow-xl backdrop-blur-xl md:left-4 md:top-[4.25rem]">
      <button type="button" onClick={() => setCollapsed((value) => !value)} aria-expanded={!collapsed} className="flex min-h-10 w-full items-center gap-2 px-2.5 text-left hover:bg-white/[0.06]">
        <Target size={15} className="shrink-0 text-[#efd275]" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[10px] font-bold">{objective.title}</span>
          <span className="block text-[9px] tabular-nums text-white/50">{progress}/{objective.target}</span>
        </span>
        {collapsed ? <ChevronDown size={14} className="text-white/45" /> : <ChevronUp size={14} className="text-white/45" />}
      </button>
      <div className="h-1 bg-white/10"><div className="h-full bg-[#efd275] transition-[width]" style={{ width: `${percent}%` }} /></div>
      {!collapsed ? <div className="px-2.5 py-2">
        <p className="text-[10px] font-medium text-white/75">{objective.instruction}</p>
        <p className="mt-1 text-[9px] text-[#91ca8d]">Reward: {objective.reward}</p>
      </div> : null}
    </aside>
  );
}
