'use client';

import { Run } from '../lib/types';

interface RunCompleteScreenProps {
  run: Run;
  isSuccess: boolean;
  onReturnHome: () => void;
}

export function RunCompleteScreen({ run, isSuccess, onReturnHome }: RunCompleteScreenProps) {
  const stagesWon = run.stages.filter(s => s.result === 'completed').length;
  const isRetreat = run.isRetreat;

  const headline = isRetreat
    ? 'PULLED OUT'
    : isSuccess
      ? 'BACK ALIVE'
      : 'LOST OUT THERE';

  const subline = isRetreat
    ? 'Your team fell back before engaging. Live to fight another day.'
    : isSuccess
      ? `All ${run.totalStages} stages cleared. Your people made it home.`
      : 'The run ended badly. Cards need time to recover.';

  return (
    <div className="min-h-screen flex flex-col bg-stone-950 text-stone-300">
      <div className="flex-1 px-5 py-8 flex flex-col">
        {/* Hero headline */}
        <div className="mb-8">
          <p className="text-[9px] text-stone-700 font-mono tracking-widest uppercase mb-3">
            ── EXPEDITION COMPLETE ──────────────────
          </p>
          <h1 className={`text-4xl font-bold font-mono uppercase tracking-widest mb-2 ${
            isSuccess && !isRetreat ? 'text-stone-200' : isRetreat ? 'text-amber-800' : 'text-red-800'
          }`}>
            {headline}
          </h1>
          <p className="text-stone-500 text-sm font-mono leading-relaxed">
            {subline}
          </p>
        </div>

        {/* Stage log */}
        <div className="mb-5">
          <p className="text-[9px] text-stone-700 font-mono tracking-widest uppercase mb-2">
            EXPEDITION LOG
          </p>
          <div className="border border-stone-800">
            {run.stages.map((stage, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 px-3 py-2.5 ${i > 0 ? 'border-t border-stone-800' : ''} bg-stone-900`}
              >
                <span className={`text-[10px] font-mono w-4 ${
                  stage.result === 'completed' ? 'text-stone-400' : stage.result === 'skipped' ? 'text-amber-800' : 'text-red-800'
                }`}>
                  {stage.result === 'completed' ? '✓' : stage.result === 'skipped' ? '→' : '✕'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-stone-400 font-mono truncate">
                    {stage.encounter?.name ?? `Stage ${stage.stageNum}`}
                  </p>
                  <p className="text-[9px] text-stone-700 font-mono uppercase">
                    {stage.result === 'completed' ? 'CLEARED' : stage.result === 'skipped' ? 'BYPASSED' : 'FAILED'}
                  </p>
                </div>
              </div>
            ))}
            {Array.from({ length: Math.max(0, run.totalStages - run.stages.length) }).map((_, i) => (
              <div key={`empty-${i}`} className="flex items-center gap-3 px-3 py-2.5 border-t border-stone-800 bg-stone-900 opacity-30">
                <span className="text-[10px] font-mono text-stone-700 w-4">—</span>
                <p className="text-xs text-stone-700 font-mono">NOT REACHED</p>
              </div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 mb-5">
          <div className="border border-stone-800 bg-stone-900 p-3 text-center">
            <p className="text-2xl font-bold text-stone-300 font-mono">{stagesWon}/{run.totalStages}</p>
            <p className="text-[8px] text-stone-700 font-mono tracking-widest uppercase mt-0.5">STAGES CLEARED</p>
          </div>
          <div className="border border-stone-800 bg-stone-900 p-3 text-center">
            <p className="text-2xl font-bold text-stone-300 font-mono">{run.consumedCardIds.length}</p>
            <p className="text-[8px] text-stone-700 font-mono tracking-widest uppercase mt-0.5">CONSUMED</p>
          </div>
        </div>

        {/* Survivors */}
        <div className="mb-5">
          <p className="text-[9px] text-stone-700 font-mono tracking-widest uppercase mb-2">SURVIVORS</p>
          <div className="border border-stone-800">
            {run.activeSurvivors.map((s, i) => {
              const hp = s.currentHealth ?? 0;
              const maxHp = s.maxHealth ?? 100;
              const alive = hp > 0;
              return (
                <div key={i} className={`flex items-center gap-3 px-3 py-2 ${i > 0 ? 'border-t border-stone-800' : ''} bg-stone-900`}>
                  <span className={`text-xs font-mono uppercase w-24 truncate ${alive ? 'text-stone-400' : 'text-stone-700'}`}>
                    {alive ? '' : '✕ '}{s.name}
                  </span>
                  <div className="flex-1 h-0.5 bg-stone-800">
                    <div
                      className={`h-full ${!alive ? '' : hp / maxHp > 0.6 ? 'bg-stone-500' : hp / maxHp > 0.3 ? 'bg-amber-800' : 'bg-red-900'}`}
                      style={{ width: `${(hp / maxHp) * 100}%` }}
                    />
                  </div>
                  <span className="text-[9px] font-mono text-stone-700 w-14 text-right">{hp}/{maxHp}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recovery notice */}
        <div className="border border-stone-900 px-3 py-2">
          <p className="text-[9px] text-stone-700 font-mono">
            Cards used will need 1 day to recover before next expedition.
          </p>
        </div>
      </div>

      {/* Return */}
      <div className="px-5 pb-8 pt-2">
        <button
          onClick={onReturnHome}
          className="w-full py-3.5 bg-stone-800 hover:bg-stone-700 text-stone-200 font-mono font-bold text-sm tracking-widest uppercase border border-stone-700 transition-colors active:scale-[0.98]"
        >
          RETURN TO BASE →
        </button>
      </div>
    </div>
  );
}
