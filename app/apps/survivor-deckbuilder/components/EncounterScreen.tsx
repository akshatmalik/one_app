'use client';

import { Encounter } from '../lib/types';

interface EncounterScreenProps {
  encounter: Encounter;
  stageNumber: number;
  totalStages: number;
  onEnterCombat: () => void;
}

export function EncounterScreen({
  encounter,
  stageNumber,
  totalStages,
  onEnterCombat,
}: EncounterScreenProps) {
  const totalHP = (encounter.enemies ?? []).reduce((sum, e) => sum + e.health, 0);
  const totalDmg = (encounter.enemies ?? []).reduce((sum, e) => sum + e.damage, 0);

  const difficultyColor = {
    easy: 'text-green-400 bg-green-400/10 border-green-400/30',
    medium: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
    hard: 'text-red-400 bg-red-400/10 border-red-400/30',
    very_hard: 'text-red-500 bg-red-500/10 border-red-500/30',
  }[encounter.difficulty ?? 'easy'];

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      {/* Stage indicator */}
      <div className="px-6 pt-6 pb-2">
        <div className="flex items-center gap-2 mb-1">
          {Array.from({ length: totalStages }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full ${
                i < stageNumber ? 'bg-green-500' : i === stageNumber - 1 ? 'bg-amber-400' : 'bg-slate-700'
              }`}
            />
          ))}
        </div>
        <p className="text-slate-500 text-sm">Stage {stageNumber} of {totalStages}</p>
      </div>

      {/* Encounter info */}
      <div className="flex-1 px-6 py-4 space-y-6">
        {/* Location & Difficulty */}
        <div className="flex items-center gap-3">
          {encounter.location && (
            <span className="text-sm text-slate-400 bg-slate-800 px-3 py-1 rounded-full">
              📍 {encounter.location}
            </span>
          )}
          <span className={`text-xs px-3 py-1 rounded-full border ${difficultyColor}`}>
            {(encounter.difficulty ?? 'easy').toUpperCase()}
          </span>
        </div>

        {/* Title & Description */}
        <div>
          <h1 className="text-3xl font-bold mb-3">{encounter.name}</h1>
          <p className="text-slate-300 text-lg leading-relaxed">
            {encounter.description}
          </p>
        </div>

        {/* Enemy roster */}
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4 space-y-3">
          <h3 className="text-sm font-semibold text-red-400 uppercase tracking-wider">
            Hostile Forces
          </h3>
          <div className="space-y-2">
            {(encounter.enemies ?? []).map((enemy, i) => (
              <div
                key={i}
                className="flex items-center justify-between bg-slate-800 rounded-lg px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">💀</span>
                  <div>
                    <p className="font-semibold">{enemy.name}</p>
                    <p className="text-xs text-slate-400">
                      ATK {enemy.damage} · DEF {enemy.defense}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-500 rounded-full"
                        style={{ width: '100%' }}
                      />
                    </div>
                    <span className="text-sm font-mono text-red-400 w-12 text-right">
                      {enemy.health}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Threat summary */}
          <div className="flex gap-4 pt-2 border-t border-slate-700">
            <div className="text-center flex-1">
              <p className="text-2xl font-bold text-red-400">{totalHP}</p>
              <p className="text-xs text-slate-500">Total HP</p>
            </div>
            <div className="text-center flex-1">
              <p className="text-2xl font-bold text-orange-400">{totalDmg}</p>
              <p className="text-xs text-slate-500">Total DMG</p>
            </div>
            <div className="text-center flex-1">
              <p className="text-2xl font-bold text-slate-300">{(encounter.enemies ?? []).length}</p>
              <p className="text-xs text-slate-500">Enemies</p>
            </div>
          </div>
        </div>

        {/* Rewards preview */}
        {encounter.rewardsText && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-3">
            <p className="text-amber-400 text-sm">
              🎁 <span className="font-semibold">Reward:</span> {encounter.rewardsText}
            </p>
          </div>
        )}
      </div>

      {/* Action button */}
      <div className="px-6 pb-8 pt-4">
        <button
          onClick={onEnterCombat}
          className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-bold text-lg rounded-xl transition-colors active:scale-[0.98]"
        >
          ⚔️ ENTER COMBAT
        </button>
      </div>
    </div>
  );
}
