'use client';

import { Run, CardInstance } from '../lib/types';

interface RunCompleteScreenProps {
  run: Run;
  isSuccess: boolean;
  onReturnHome: () => void;
}

export function RunCompleteScreen({
  run,
  isSuccess,
  onReturnHome,
}: RunCompleteScreenProps) {
  const stagesWon = run.stages.filter(s => s.result === 'completed').length;
  const stagesTotal = run.totalStages;
  const totalDamageDealt = run.lastCombatResult
    ? run.stages.reduce((sum, s) => sum + (s.cardsPlayed?.length ?? 0) * 10, 0) + (run.lastCombatResult?.damageDealt ?? 0)
    : 0;

  const survivorStatus = run.activeSurvivors.map(s => ({
    name: s.name,
    hp: s.currentHealth ?? 0,
    maxHp: s.maxHealth ?? 100,
    alive: (s.currentHealth ?? 0) > 0,
  }));

  const cardsUsed = new Set(run.playedCardsThisRun).size;

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      <div className="flex-1 px-6 py-8 space-y-6">
        {/* Result banner */}
        <div className="text-center py-8">
          <div className="text-7xl mb-4">{isSuccess ? '🎉' : '💀'}</div>
          <h1 className="text-4xl font-bold mb-3">
            {isSuccess ? 'EXPEDITION COMPLETE!' : 'EXPEDITION FAILED'}
          </h1>
          <p className="text-slate-400 text-lg">
            {isSuccess
              ? 'Your team made it back alive. Well done, survivor.'
              : 'Your team didn\'t make it. Rest, regroup, try again.'
            }
          </p>
        </div>

        {/* Stage results */}
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-5">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
            Stage Results
          </h3>
          <div className="space-y-3">
            {run.stages.map((stage, i) => (
              <div key={i} className="flex items-center justify-between bg-slate-800 rounded-lg px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="text-xl">
                    {stage.result === 'completed' ? '✅' : stage.result === 'skipped' ? '⏭️' : '❌'}
                  </span>
                  <div>
                    <p className="font-semibold">{stage.encounter?.name ?? `Stage ${stage.stageNum}`}</p>
                    <p className="text-xs text-slate-400 capitalize">{stage.result}</p>
                  </div>
                </div>
                <div className="text-sm text-slate-400">
                  {stage.cardsPlayed?.length ?? 0} cards played
                </div>
              </div>
            ))}

            {/* Show remaining stages as not attempted */}
            {run.stages.length < stagesTotal && (
              Array.from({ length: stagesTotal - run.stages.length }).map((_, i) => (
                <div key={`remaining-${i}`} className="flex items-center gap-3 bg-slate-800/50 rounded-lg px-4 py-3 opacity-40">
                  <span className="text-xl">⬜</span>
                  <p className="text-slate-500">Stage {run.stages.length + i + 1} — Not reached</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4 text-center">
            <p className="text-3xl font-bold text-green-400">{stagesWon}/{stagesTotal}</p>
            <p className="text-xs text-slate-500 mt-1">Stages Won</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4 text-center">
            <p className="text-3xl font-bold text-amber-400">{cardsUsed}</p>
            <p className="text-xs text-slate-500 mt-1">Cards Played</p>
          </div>
        </div>

        {/* Survivor final status */}
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-5">
          <h3 className="text-sm font-semibold text-blue-400 uppercase tracking-wider mb-4">
            Survivors
          </h3>
          <div className="space-y-3">
            {survivorStatus.map((s, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-2xl">{s.alive ? '👤' : '💀'}</span>
                <div className="flex-1">
                  <div className="flex justify-between">
                    <span className={`font-semibold ${s.alive ? 'text-white' : 'text-slate-500'}`}>
                      {s.name}
                    </span>
                    <span className="text-xs font-mono text-slate-400">{s.hp}/{s.maxHp}</span>
                  </div>
                  <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden mt-1">
                    <div
                      className={`h-full rounded-full ${
                        s.hp > 60 ? 'bg-green-500' : s.hp > 30 ? 'bg-yellow-500' : s.hp > 0 ? 'bg-red-500' : 'bg-slate-600'
                      }`}
                      style={{ width: `${(s.hp / s.maxHp) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Exhaustion notice */}
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-orange-400 mb-2">
            ⏰ Recovery Required
          </h3>
          <p className="text-sm text-orange-300">
            All cards used in this expedition need time to recover before the next run.
            Survivors and equipment need 1 day. Consumables are spent.
          </p>
        </div>
      </div>

      {/* Return home button */}
      <div className="px-6 pb-8 pt-4">
        <button
          onClick={onReturnHome}
          className={`w-full py-4 font-bold text-lg rounded-xl transition-colors active:scale-[0.98] ${
            isSuccess
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-slate-600 hover:bg-slate-500 text-white'
          }`}
        >
          🏠 RETURN TO HOME BASE
        </button>
      </div>
    </div>
  );
}
