'use client';

import { useState, useEffect } from 'react';
import { CombatResult, CardInstance, Encounter } from '../lib/types';
import { RunStatusBar } from './RunStatusBar';

interface CombatResolutionScreenProps {
  result: CombatResult;
  cardsPlayed: CardInstance[];
  encounter: Encounter;
  survivors: CardInstance[];
  stageNumber: number;
  totalStages: number;
  cardsRemaining: number;
  totalCards: number;
  isBarricaded?: boolean;
  onContinue: () => void;
}

export function CombatResolutionScreen({
  result,
  cardsPlayed,
  encounter,
  survivors,
  stageNumber,
  totalStages,
  cardsRemaining,
  totalCards,
  isBarricaded,
  onContinue,
}: CombatResolutionScreenProps) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (step < 4) {
      const timer = setTimeout(() => setStep(prev => prev + 1), 700);
      return () => clearTimeout(timer);
    }
  }, [step]);

  const { damageBreakdown: bd, synergiesTriggered } = result;
  const isVictory = result.result === 'player-victory';
  const isLoss = result.result === 'player-loss';

  return (
    <div className="min-h-screen flex flex-col bg-stone-950 text-stone-300">
      <RunStatusBar
        stageNumber={stageNumber}
        totalStages={totalStages}
        survivors={result.survivorsAfter}
        cardsRemaining={cardsRemaining}
        totalCards={totalCards}
        location={encounter.location}
        isBarricaded={isBarricaded}
      />

      <div className="flex-1 px-5 py-6 space-y-4 overflow-y-auto">
        {/* Cards deployed */}
        <div>
          <p className="text-[9px] text-stone-700 font-mono tracking-widest uppercase mb-1">DEPLOYED</p>
          <p className="text-stone-500 text-sm font-mono">
            {cardsPlayed.map(c => c.name).join(' + ')}
          </p>
        </div>

        <div className="border-t border-stone-900" />

        {/* Attack result */}
        {step >= 1 && (
          <div className="transition-all duration-300">
            <p className="text-[9px] text-stone-700 font-mono tracking-widest uppercase mb-2">YOUR ATTACK</p>
            <div className="space-y-1 border border-stone-800 bg-stone-900">
              {bd.baseSurvivorDamage > 0 && (
                <div className="flex justify-between px-3 py-1.5 border-b border-stone-800">
                  <span className="text-xs text-stone-500 font-mono">Base strike</span>
                  <span className="text-xs text-stone-400 font-mono">+{bd.baseSurvivorDamage}</span>
                </div>
              )}
              {bd.attributeBonus > 0 && (
                <div className="flex justify-between px-3 py-1.5 border-b border-stone-800">
                  <span className="text-xs text-stone-500 font-mono">Combat skill</span>
                  <span className="text-xs text-stone-400 font-mono">+{bd.attributeBonus}</span>
                </div>
              )}
              {bd.itemBonus > 0 && (
                <div className="flex justify-between px-3 py-1.5 border-b border-stone-800">
                  <span className="text-xs text-stone-500 font-mono">Equipment / gear</span>
                  <span className="text-xs text-stone-400 font-mono">+{bd.itemBonus}</span>
                </div>
              )}
              {bd.synergyBonus > 0 && (
                <div className="flex justify-between px-3 py-1.5 border-b border-stone-800">
                  <span className="text-xs text-amber-800 font-mono">⚡ Synergy</span>
                  <span className="text-xs text-amber-700 font-mono">+{bd.synergyBonus}</span>
                </div>
              )}
              <div className="flex justify-between px-3 py-2">
                <span className="text-xs text-stone-400 font-mono font-bold">TOTAL DEALT</span>
                <span className="text-base text-stone-200 font-mono font-bold">{bd.totalDamageDealt}</span>
              </div>
            </div>
          </div>
        )}

        {/* Enemy status */}
        {step >= 2 && (
          <div className="transition-all duration-300">
            <p className="text-[9px] text-stone-700 font-mono tracking-widest uppercase mb-2">ENEMY STATUS</p>
            <div className="space-y-1">
              {result.enemiesAfter.map((enemy, i) => {
                const dead = enemy.health <= 0;
                return (
                  <div key={i} className={`flex items-center justify-between border border-stone-800 px-3 py-2 ${dead ? 'bg-stone-900/30' : 'bg-stone-900'}`}>
                    <span className={`text-xs font-mono ${dead ? 'line-through text-stone-700' : 'text-stone-400'}`}>
                      {enemy.name}
                    </span>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-0.5 bg-stone-800">
                        <div
                          className={`h-full transition-all duration-700 ${dead ? 'bg-stone-800' : 'bg-red-900'}`}
                          style={{ width: `${Math.max(0, (enemy.health / enemy.maxHealth) * 100)}%` }}
                        />
                      </div>
                      <span className={`text-[10px] font-mono ${dead ? 'text-stone-700' : 'text-stone-500'}`}>
                        {dead ? 'DEAD' : `${Math.max(0, enemy.health)} hp`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Counter-attack */}
            {!isVictory && bd.netDamageTaken > 0 && (
              <div className="border border-stone-800 bg-stone-900 mt-1 px-3 py-2">
                <div className="flex justify-between text-xs">
                  <span className="text-stone-500 font-mono">Enemy counter</span>
                  <span className="text-red-800 font-mono">-{bd.netDamageTaken} HP</span>
                </div>
                {bd.defenseReduction > 0 && (
                  <div className="flex justify-between text-xs mt-0.5">
                    <span className="text-stone-700 font-mono">Blocked</span>
                    <span className="text-stone-600 font-mono">-{bd.defenseReduction}</span>
                  </div>
                )}
                {isBarricaded && (
                  <p className="text-[9px] text-amber-800 font-mono mt-1">▦ Barricade held</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Healing */}
        {step >= 3 && result.healingDone > 0 && (
          <div className="border border-stone-800 bg-stone-900 px-3 py-2">
            <p className="text-xs text-stone-500 font-mono">
              Healed {result.healingDone} HP across team
            </p>
          </div>
        )}

        {/* Final result */}
        {step >= 4 && (
          <div className={`border px-4 py-4 text-center ${
            isVictory
              ? 'border-stone-700 bg-stone-900'
              : isLoss
                ? 'border-red-900 bg-stone-900'
                : 'border-amber-900 bg-stone-900'
          }`}>
            <p className={`text-xl font-bold font-mono uppercase tracking-widest mb-1 ${
              isVictory ? 'text-stone-300' : isLoss ? 'text-red-700' : 'text-amber-700'
            }`}>
              {isVictory ? 'CLEAR' : isLoss ? 'TEAM DOWN' : 'STILL FIGHTING'}
            </p>
            <p className="text-xs text-stone-600 font-mono">
              {isVictory
                ? 'All hostiles neutralized. Area secured.'
                : isLoss
                  ? 'Your people couldn\'t hold. Pull out.'
                  : 'Enemies remain. Play more cards.'}
            </p>
          </div>
        )}
      </div>

      {/* Continue */}
      <div className="px-5 pb-8 pt-2">
        <button
          onClick={onContinue}
          disabled={step < 4}
          className={`w-full py-3.5 font-mono font-bold text-sm tracking-widest uppercase border transition-colors ${
            step >= 4
              ? 'bg-stone-800 hover:bg-stone-700 border-stone-700 text-stone-200 active:scale-[0.98]'
              : 'bg-stone-900 border-stone-900 text-stone-700 cursor-not-allowed'
          }`}
        >
          CONTINUE →
        </button>
      </div>
    </div>
  );
}
