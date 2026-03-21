'use client';

import { CombatResult, CardInstance, Encounter } from '../lib/types';
import { RunStatusBar } from './RunStatusBar';

interface StageCompleteScreenProps {
  stageNumber: number;
  totalStages: number;
  result: CombatResult;
  encounter: Encounter;
  survivors: CardInstance[];
  cardsRemaining: number;
  totalCards: number;
  onNextStage: () => void;
  isLastStage: boolean;
}

export function StageCompleteScreen({
  stageNumber,
  totalStages,
  result,
  encounter,
  survivors,
  cardsRemaining,
  totalCards,
  onNextStage,
  isLastStage,
}: StageCompleteScreenProps) {
  const isVictory = result.result === 'player-victory';

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <RunStatusBar
        stageNumber={stageNumber}
        totalStages={totalStages}
        survivors={survivors}
        cardsRemaining={cardsRemaining}
        totalCards={totalCards}
        location={encounter.location}
      />

      <div className="flex-1 px-5 py-8 flex flex-col items-center justify-center">
        {/* Big result */}
        <div className="text-center mb-8">
          <p className="text-6xl mb-4">{isVictory ? '✅' : '❌'}</p>
          <h1 className="text-2xl font-bold text-white mb-1">
            {isVictory ? 'Area Cleared' : 'Forced Retreat'}
          </h1>
          <p className="text-white/40 text-sm">
            {isVictory
              ? `${encounter.name} — secured`
              : `${encounter.name} — too dangerous`
            }
          </p>
        </div>

        {/* Quick stats */}
        <div className="w-full grid grid-cols-3 gap-3 mb-6">
          <div className="bg-black/30 rounded-xl border border-white/5 p-3 text-center">
            <p className="text-xl font-bold text-green-400 font-mono">{result.damageDealt}</p>
            <p className="text-[9px] text-white/30 uppercase mt-1">Dealt</p>
          </div>
          <div className="bg-black/30 rounded-xl border border-white/5 p-3 text-center">
            <p className="text-xl font-bold text-red-400 font-mono">{result.damageTaken}</p>
            <p className="text-[9px] text-white/30 uppercase mt-1">Taken</p>
          </div>
          <div className="bg-black/30 rounded-xl border border-white/5 p-3 text-center">
            <p className="text-xl font-bold text-purple-400 font-mono">{result.synergiesTriggered.length}</p>
            <p className="text-[9px] text-white/30 uppercase mt-1">Synergies</p>
          </div>
        </div>

        {/* Survivor status */}
        <div className="w-full bg-black/20 rounded-2xl border border-white/5 p-4 mb-6">
          <p className="text-[10px] text-white/30 uppercase tracking-wider font-semibold mb-3">Team Status</p>
          {survivors.map(s => {
            const hp = s.currentHealth ?? 0;
            const maxHp = s.maxHealth ?? 100;
            const pct = (hp / maxHp) * 100;
            return (
              <div key={s.id} className="flex items-center gap-3 mb-2 last:mb-0">
                <span className="text-sm">{hp > 0 ? '👤' : '💀'}</span>
                <span className="text-sm text-white/60 w-24 truncate">{s.name}</span>
                <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${pct > 60 ? 'bg-emerald-500' : pct > 30 ? 'bg-amber-500' : pct > 0 ? 'bg-red-500' : 'bg-white/10'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-[10px] font-mono text-white/30 w-12 text-right">{hp}/{maxHp}</span>
              </div>
            );
          })}
        </div>

        {/* Loot */}
        {isVictory && encounter.rewardsText && (
          <div className="w-full bg-amber-500/5 border border-amber-500/10 rounded-xl px-4 py-3 mb-6">
            <p className="text-amber-400/70 text-sm">◆ {encounter.rewardsText}</p>
          </div>
        )}

        {/* Cards remaining */}
        <div className="w-full bg-black/20 rounded-xl border border-white/5 px-4 py-3 mb-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/40">Cards remaining in deck</span>
            <span className="text-sm font-mono text-white/60">{cardsRemaining}</span>
          </div>
        </div>
      </div>

      {/* Action */}
      <div className="px-5 pb-8 pt-2">
        <button
          onClick={onNextStage}
          className={`w-full py-4 font-bold text-lg rounded-2xl transition-all active:scale-[0.97] ${
            isVictory
              ? 'bg-green-700 hover:bg-green-600 text-white shadow-lg shadow-green-900/30'
              : 'bg-slate-700 hover:bg-slate-600 text-white'
          }`}
        >
          {isLastStage
            ? (isVictory ? 'Head Home' : 'Retreat Home')
            : (isVictory ? `Continue to Stage ${stageNumber + 1}` : 'Retreat Home')
          }
        </button>
      </div>
    </div>
  );
}
