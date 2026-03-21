'use client';

import { Run } from '../lib/types';

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

  const survivorStatus = run.activeSurvivors.map(s => ({
    name: s.name,
    hp: s.currentHealth ?? 0,
    maxHp: s.maxHealth ?? 100,
    alive: (s.currentHealth ?? 0) > 0,
  }));

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <div className="flex-1 px-5 py-8 flex flex-col items-center justify-center">
        {/* Hero */}
        <div className="text-center mb-8">
          <p className="text-7xl mb-4">{isSuccess ? '🏠' : '💀'}</p>
          <h1 className="text-3xl font-bold text-white mb-2">
            {isSuccess ? 'Home Safe' : 'Expedition Lost'}
          </h1>
          <p className="text-white/40 text-sm max-w-xs mx-auto">
            {isSuccess
              ? 'Your team made it back. Rest up. There\'s always tomorrow.'
              : 'Sometimes you don\'t make it home. Dust off and try again.'
            }
          </p>
        </div>

        {/* Stage results */}
        <div className="w-full bg-black/20 rounded-2xl border border-white/5 p-4 mb-6">
          <p className="text-[10px] text-white/30 uppercase tracking-wider font-semibold mb-3">
            Expedition Log
          </p>
          <div className="space-y-2">
            {run.stages.map((stage, i) => (
              <div key={i} className="flex items-center gap-3 bg-black/20 rounded-xl px-4 py-3">
                <span className="text-xl">
                  {stage.result === 'completed' ? '✅' : stage.result === 'skipped' ? '⏭' : '❌'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white/70 truncate">
                    {stage.encounter?.name ?? `Stage ${stage.stageNum}`}
                  </p>
                  <p className="text-[10px] text-white/30 capitalize">{stage.result}</p>
                </div>
              </div>
            ))}

            {/* Unvisited stages */}
            {Array.from({ length: Math.max(0, run.totalStages - run.stages.length) }).map((_, i) => (
              <div key={`empty-${i}`} className="flex items-center gap-3 bg-black/10 rounded-xl px-4 py-3 opacity-30">
                <span className="text-xl">⬜</span>
                <p className="text-sm text-white/30">Not reached</p>
              </div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="w-full grid grid-cols-2 gap-3 mb-6">
          <div className="bg-black/20 rounded-xl border border-white/5 p-4 text-center">
            <p className="text-3xl font-bold text-white/80">{stagesWon}/{run.totalStages}</p>
            <p className="text-[9px] text-white/30 uppercase mt-1">Stages Cleared</p>
          </div>
          <div className="bg-black/20 rounded-xl border border-white/5 p-4 text-center">
            <p className="text-3xl font-bold text-white/80">{new Set(run.playedCardsThisRun).size}</p>
            <p className="text-[9px] text-white/30 uppercase mt-1">Cards Used</p>
          </div>
        </div>

        {/* Survivors */}
        <div className="w-full bg-black/20 rounded-2xl border border-white/5 p-4 mb-6">
          <p className="text-[10px] text-white/30 uppercase tracking-wider font-semibold mb-3">Survivors</p>
          {survivorStatus.map((s, i) => (
            <div key={i} className="flex items-center gap-3 mb-2 last:mb-0">
              <span className="text-lg">{s.alive ? '👤' : '💀'}</span>
              <span className={`text-sm w-24 truncate ${s.alive ? 'text-white/60' : 'text-white/20'}`}>{s.name}</span>
              <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    s.hp / s.maxHp > 0.6 ? 'bg-emerald-500' : s.hp / s.maxHp > 0.3 ? 'bg-amber-500' : s.hp > 0 ? 'bg-red-500' : 'bg-white/5'
                  }`}
                  style={{ width: `${(s.hp / s.maxHp) * 100}%` }}
                />
              </div>
              <span className="text-[10px] font-mono text-white/20 w-12 text-right">{s.hp}/{s.maxHp}</span>
            </div>
          ))}
        </div>

        {/* Recovery notice */}
        <div className="w-full bg-orange-500/5 border border-orange-500/10 rounded-xl px-4 py-3">
          <p className="text-xs text-orange-400/60">
            ⏰ Cards used need 1 day to recover before next expedition.
          </p>
        </div>
      </div>

      {/* Return home */}
      <div className="px-5 pb-8 pt-2">
        <button
          onClick={onReturnHome}
          className={`w-full py-4 font-bold text-lg rounded-2xl transition-all active:scale-[0.97] shadow-lg ${
            isSuccess
              ? 'bg-green-700 hover:bg-green-600 text-white shadow-green-900/30'
              : 'bg-slate-700 hover:bg-slate-600 text-white shadow-slate-900/30'
          }`}
        >
          Return to Home Base
        </button>
      </div>
    </div>
  );
}
