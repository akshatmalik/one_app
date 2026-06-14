'use client';

import { Game } from '../lib/types';
import { getGamerLevel, getWeeklyQuests } from '../lib/idea-progression';
import { Gamepad2, ListChecks, Check } from 'lucide-react';

interface ProgressionPanelProps {
  games: Game[];
}

// NewIdeas100-June2026 — #27 Gamer Level/XP + #26 Quest Log.
export function ProgressionPanel({ games }: ProgressionPanelProps) {
  const lvl = getGamerLevel(games);
  const quests = getWeeklyQuests(games);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Level / XP (#27) */}
      <div className="rounded-xl border border-white/10 bg-gradient-to-br from-purple-500/10 to-indigo-500/10 p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-white/80">
          <Gamepad2 size={16} className="text-purple-400" /> Gamer Level
        </div>
        <div className="flex items-end gap-3">
          <div className="text-4xl font-black text-white">{lvl.level}</div>
          <div className="pb-1">
            <div className="text-sm font-semibold text-purple-200">{lvl.title}</div>
            <div className="text-[10px] text-white/40">{lvl.xp.toLocaleString()} XP total</div>
          </div>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-purple-400" style={{ width: `${Math.round(lvl.progress * 100)}%` }} />
        </div>
        <div className="mt-1 text-right text-[10px] text-white/40">
          {lvl.xpIntoLevel} / {lvl.xpForNextLevel} XP to level {lvl.level + 1}
        </div>
      </div>

      {/* Quest Log (#26) */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-white/80">
          <ListChecks size={16} className="text-emerald-400" /> Weekly Quests
        </div>
        <div className="space-y-2">
          {quests.map((q) => (
            <div key={q.id}>
              <div className="flex items-center justify-between text-sm">
                <span className={q.done ? 'text-emerald-300' : 'text-white/70'}>
                  {q.done && <Check size={12} className="mr-1 inline" />}
                  {q.label}
                </span>
                <span className="text-xs text-white/40">
                  {q.current}/{q.target}
                </span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className={`h-full rounded-full ${q.done ? 'bg-emerald-400' : 'bg-white/30'}`}
                  style={{ width: `${Math.min(100, (q.current / q.target) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
