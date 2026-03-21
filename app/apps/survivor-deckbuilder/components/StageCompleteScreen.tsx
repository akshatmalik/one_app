'use client';

import { CombatResult, CardInstance, Encounter } from '../lib/types';

interface StageCompleteScreenProps {
  stageNumber: number;
  totalStages: number;
  result: CombatResult;
  encounter: Encounter;
  survivors: CardInstance[];
  onNextStage: () => void;
  isLastStage: boolean;
}

export function StageCompleteScreen({
  stageNumber,
  totalStages,
  result,
  encounter,
  survivors,
  onNextStage,
  isLastStage,
}: StageCompleteScreenProps) {
  const isVictory = result.result === 'player-victory';

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      {/* Stage progress */}
      <div className="px-6 pt-6 pb-2">
        <div className="flex items-center gap-2 mb-1">
          {Array.from({ length: totalStages }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full ${
                i < stageNumber ? 'bg-green-500' : 'bg-slate-700'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="flex-1 px-6 py-6 space-y-6">
        {/* Victory/defeat banner */}
        <div className="text-center py-8">
          <div className="text-6xl mb-4">{isVictory ? '🏆' : '💀'}</div>
          <h1 className="text-3xl font-bold mb-2">
            {isVictory ? `Stage ${stageNumber} Complete!` : `Stage ${stageNumber} Failed`}
          </h1>
          <p className="text-slate-400 text-lg">
            {isVictory
              ? `${encounter.name} conquered`
              : `${encounter.name} was too much`
            }
          </p>
        </div>

        {/* Combat summary */}
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Combat Summary
          </h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-green-400">{result.damageDealt}</p>
              <p className="text-xs text-slate-500">Dealt</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-400">{result.damageTaken}</p>
              <p className="text-xs text-slate-500">Taken</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-400">{result.synergiesTriggered.length}</p>
              <p className="text-xs text-slate-500">Synergies</p>
            </div>
          </div>
        </div>

        {/* Survivor status */}
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
          <h3 className="text-sm font-semibold text-blue-400 uppercase tracking-wider mb-3">
            Survivor Status
          </h3>
          <div className="space-y-3">
            {survivors.map(survivor => {
              const hp = survivor.currentHealth ?? 0;
              const maxHp = survivor.maxHealth ?? 100;
              const pct = (hp / maxHp) * 100;
              const isDead = hp <= 0;

              return (
                <div key={survivor.id} className="flex items-center gap-3">
                  <span className="text-2xl">{isDead ? '💀' : '👤'}</span>
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <span className={`text-sm font-semibold ${isDead ? 'text-slate-500' : 'text-white'}`}>
                        {survivor.name}
                      </span>
                      <span className="text-xs font-mono text-slate-400">{hp}/{maxHp}</span>
                    </div>
                    <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden mt-1">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          pct > 60 ? 'bg-green-500' : pct > 30 ? 'bg-yellow-500' : pct > 0 ? 'bg-red-500' : 'bg-slate-600'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Loot */}
        {isVictory && encounter.rewardsText && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-amber-400 uppercase tracking-wider mb-2">
              🎁 Loot Found
            </h3>
            <p className="text-amber-300">{encounter.rewardsText}</p>
          </div>
        )}

        {/* Synergies used */}
        {result.synergiesTriggered.length > 0 && (
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-purple-400 uppercase tracking-wider mb-2">
              ⚡ Synergies Triggered
            </h3>
            {result.synergiesTriggered.map(syn => (
              <p key={syn.id} className="text-purple-300 text-sm">
                {syn.name}: {syn.description}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* Action button */}
      <div className="px-6 pb-8 pt-4">
        {isVictory ? (
          <button
            onClick={onNextStage}
            className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-bold text-lg rounded-xl transition-colors active:scale-[0.98]"
          >
            {isLastStage ? '🏠 COMPLETE EXPEDITION' : `➡️ ADVANCE TO STAGE ${stageNumber + 1}`}
          </button>
        ) : (
          <button
            onClick={onNextStage}
            className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-bold text-lg rounded-xl transition-colors active:scale-[0.98]"
          >
            💀 RETREAT TO HOME BASE
          </button>
        )}
      </div>
    </div>
  );
}
