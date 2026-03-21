'use client';

import { useState } from 'react';
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
  isBarricaded?: boolean;
  onNextStage: () => void;
  onBuildBarricade?: () => void;
  isLastStage: boolean;
}

const STAGE_LOOT_ITEMS: Record<number, { title: string; items: string[] }> = {
  1: {
    title: 'SCAVENGED',
    items: ['Canned food (3 days)', 'Field dressing × 4', 'Spare rounds (pistol)'],
  },
  2: {
    title: 'SECURED',
    items: ['Tactical vest (medium)', 'Lumber and wire (barricade materials)', 'Medical pack'],
  },
  3: {
    title: 'RECOVERED',
    items: ['Military-grade rifle', 'Trauma kit', 'Radio batteries'],
  },
};

export function StageCompleteScreen({
  stageNumber,
  totalStages,
  result,
  encounter,
  survivors,
  cardsRemaining,
  totalCards,
  isBarricaded,
  onNextStage,
  onBuildBarricade,
  isLastStage,
}: StageCompleteScreenProps) {
  const isVictory = result.result === 'player-victory';
  const [barricadeChoice, setBarricadeChoice] = useState<'none' | 'building' | 'done'>('none');

  const loot = STAGE_LOOT_ITEMS[stageNumber];
  const canBarricade = stageNumber === 2 && isVictory && !isLastStage && !isBarricaded && onBuildBarricade;

  const handleBuildBarricade = () => {
    if (!onBuildBarricade) return;
    setBarricadeChoice('building');
    setTimeout(() => {
      onBuildBarricade();
      setBarricadeChoice('done');
    }, 400);
  };

  return (
    <div className="min-h-screen flex flex-col bg-stone-950 text-stone-300">
      <RunStatusBar
        stageNumber={stageNumber}
        totalStages={totalStages}
        survivors={survivors}
        cardsRemaining={cardsRemaining}
        totalCards={totalCards}
        location={encounter.location}
        isBarricaded={isBarricaded}
      />

      <div className="flex-1 px-5 py-6 space-y-5 overflow-y-auto">
        {/* Stage result header */}
        <div>
          <p className="text-[9px] text-stone-700 font-mono tracking-widest uppercase mb-1">
            STAGE {stageNumber} OF {totalStages}
          </p>
          <h1 className={`text-3xl font-bold font-mono uppercase tracking-widest mb-1 ${
            isVictory ? 'text-stone-200' : 'text-red-800'
          }`}>
            {isVictory ? 'CLEARED' : 'FORCED OUT'}
          </h1>
          <p className="text-stone-600 text-sm font-mono">
            {encounter.name} — {isVictory ? 'secured' : 'too dangerous'}
          </p>
        </div>

        <div className="border-t border-stone-900" />

        {/* Quick combat stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="border border-stone-800 bg-stone-900 p-3 text-center">
            <p className="text-lg font-bold text-stone-300 font-mono">{result.damageDealt}</p>
            <p className="text-[8px] text-stone-700 font-mono tracking-widest uppercase mt-0.5">DEALT</p>
          </div>
          <div className="border border-stone-800 bg-stone-900 p-3 text-center">
            <p className="text-lg font-bold text-stone-300 font-mono">{result.damageTaken}</p>
            <p className="text-[8px] text-stone-700 font-mono tracking-widest uppercase mt-0.5">TAKEN</p>
          </div>
          <div className="border border-stone-800 bg-stone-900 p-3 text-center">
            <p className={`text-lg font-bold font-mono ${result.synergiesTriggered.length > 0 ? 'text-amber-700' : 'text-stone-600'}`}>
              {result.synergiesTriggered.length}
            </p>
            <p className="text-[8px] text-stone-700 font-mono tracking-widest uppercase mt-0.5">SYNERGY</p>
          </div>
        </div>

        {/* Survivor status */}
        <div>
          <p className="text-[9px] text-stone-700 font-mono tracking-widest uppercase mb-2">TEAM STATUS</p>
          <div className="border border-stone-800 bg-stone-900">
            {survivors.map((s, i) => {
              const hp = s.currentHealth ?? 0;
              const maxHp = s.maxHealth ?? 100;
              const pct = (hp / maxHp) * 100;
              const dead = hp <= 0;
              return (
                <div key={s.id} className={`flex items-center gap-3 px-3 py-2 ${i > 0 ? 'border-t border-stone-800' : ''}`}>
                  <span className={`text-xs font-mono uppercase w-24 truncate ${dead ? 'text-stone-700' : 'text-stone-400'}`}>
                    {dead ? '✕ ' : ''}{s.name}
                  </span>
                  <div className="flex-1 h-0.5 bg-stone-800">
                    <div
                      className={`h-full ${dead ? 'w-0' : pct > 60 ? 'bg-stone-500' : pct > 30 ? 'bg-amber-800' : 'bg-red-900'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-stone-600 w-14 text-right">{hp}/{maxHp}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Loot */}
        {isVictory && loot && (
          <div>
            <p className="text-[9px] text-stone-700 font-mono tracking-widest uppercase mb-2">
              {loot.title}
            </p>
            <div className="border border-stone-800 bg-stone-900">
              {loot.items.map((item, i) => (
                <div key={i} className={`px-3 py-2 text-xs text-stone-500 font-mono ${i > 0 ? 'border-t border-stone-800' : ''}`}>
                  — {item}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Barricade option — only at stage 2 victory, before stage 3 */}
        {canBarricade && barricadeChoice === 'none' && (
          <div>
            <p className="text-[9px] text-stone-700 font-mono tracking-widest uppercase mb-2">
              TACTICAL OPTION
            </p>
            <div className="border border-amber-900 bg-stone-900 p-4">
              <p className="text-xs text-stone-400 font-mono mb-1">
                You found lumber and wire. Stage 3 is the hardest. Build a barricade now?
              </p>
              <p className="text-[9px] text-amber-800 font-mono mb-3">
                BARRICADE: +30 DEFENSE for your team in Stage 3
              </p>
              <button
                onClick={handleBuildBarricade}
                disabled={barricadeChoice === 'building'}
                className="w-full py-2.5 bg-amber-900/30 hover:bg-amber-900/50 border border-amber-800 text-amber-600 font-mono text-xs tracking-widest uppercase transition-colors"
              >
                {barricadeChoice === 'building' ? 'BUILDING...' : 'BUILD BARRICADE'}
              </button>
            </div>
          </div>
        )}

        {barricadeChoice === 'done' && (
          <div className="border border-stone-700 bg-stone-900 px-3 py-2">
            <p className="text-xs text-stone-400 font-mono">▦ Barricade erected. Stage 3 team gets +30 defense.</p>
          </div>
        )}

        {/* Cards remaining note */}
        <div className="flex items-center justify-between border border-stone-900 px-3 py-2">
          <span className="text-[9px] text-stone-700 font-mono tracking-wider uppercase">Cards in deck</span>
          <span className="text-xs text-stone-600 font-mono">{cardsRemaining}</span>
        </div>
      </div>

      {/* Next action */}
      <div className="px-5 pb-8 pt-2">
        <button
          onClick={onNextStage}
          className="w-full py-3.5 bg-stone-800 hover:bg-stone-700 text-stone-200 font-mono font-bold text-sm tracking-widest uppercase border border-stone-700 transition-colors active:scale-[0.98]"
        >
          {isLastStage
            ? (isVictory ? 'RETURN TO BASE →' : 'FALL BACK →')
            : (isVictory ? `ADVANCE TO STAGE ${stageNumber + 1} →` : 'FALL BACK →')
          }
        </button>
      </div>
    </div>
  );
}
