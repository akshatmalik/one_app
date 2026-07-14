'use client';

import { CAN_MAX_CHARGES } from '../lib/realtime/player';
import type { ToolId } from '../lib/realtime/player';

const TOOLS: { id: ToolId; icon: string; label: string }[] = [
  { id: 'hand',    icon: '🤲', label: 'Harvest' },
  { id: 'hoe',     icon: '⛏',  label: 'Hoe' },
  { id: 'can',     icon: '🚿', label: 'Water' },
  { id: 'seeds',   icon: '🌱', label: 'Plant' },
  { id: 'builder', icon: '🔨', label: 'Build' },
];

interface Props {
  tool: ToolId;
  waterCharges: number;
  onPick: (t: ToolId) => void;
}

export function ToolBar({ tool, waterCharges, onPick }: Props) {
  return (
    <div className="flex items-stretch gap-1 px-2 py-1.5 bg-slate-800 border-t border-slate-700">
      {TOOLS.map((t) => (
        <button
          key={t.id}
          onClick={() => onPick(t.id)}
          className={`flex-1 flex flex-col items-center py-1.5 rounded-lg text-lg transition-colors ${
            tool === t.id
              ? 'bg-yellow-500/30 ring-1 ring-yellow-400 text-white'
              : 'bg-slate-700/50 text-slate-300 active:bg-slate-600'
          }`}
        >
          <span>{t.icon}</span>
          <span className="text-[9px] mt-0.5 font-medium">{t.label}</span>
          {t.id === 'can' && (
            <span className="text-[9px] text-sky-300 leading-none">
              {waterCharges}/{CAN_MAX_CHARGES}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
