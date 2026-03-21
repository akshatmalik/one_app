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
  onContinue,
}: CombatResolutionScreenProps) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (step < 3) {
      const timer = setTimeout(() => setStep(prev => prev + 1), 800);
      return () => clearTimeout(timer);
    }
  }, [step]);

  const { damageBreakdown: bd, synergiesTriggered } = result;
  const isVictory = result.result === 'player-victory';
  const isLoss = result.result === 'player-loss';

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <RunStatusBar
        stageNumber={stageNumber}
        totalStages={totalStages}
        survivors={result.survivorsAfter}
        cardsRemaining={cardsRemaining}
        totalCards={totalCards}
        location={encounter.location}
      />

      <div className="flex-1 px-5 py-6 space-y-4 overflow-y-auto">
        {/* What you played */}
        <div className="text-center mb-2">
          <p className="text-white/30 text-xs uppercase tracking-wider font-semibold">Combat Round</p>
          <p className="text-white/60 text-sm mt-1">
            You played <span className="text-white font-semibold">{cardsPlayed.map(c => c.name).join(' + ')}</span>
          </p>
        </div>

        {/* Damage dealt */}
        <div className={`bg-green-500/5 border border-green-500/10 rounded-2xl p-4 transition-all duration-500 ${step >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}>
          <p className="text-[10px] text-green-400/60 uppercase tracking-wider font-semibold mb-3">
            Your Attack
          </p>
          <div className="space-y-1.5">
            {bd.baseSurvivorDamage > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Base damage</span>
                <span className="text-green-400 font-mono">+{bd.baseSurvivorDamage}</span>
              </div>
            )}
            {bd.attributeBonus > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Combat skill</span>
                <span className="text-green-400 font-mono">+{bd.attributeBonus}</span>
              </div>
            )}
            {bd.itemBonus > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Equipment</span>
                <span className="text-green-400 font-mono">+{bd.itemBonus}</span>
              </div>
            )}
            {bd.synergyBonus > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-purple-300">⚡ Synergy</span>
                <span className="text-purple-400 font-mono">+{bd.synergyBonus}</span>
              </div>
            )}
            <div className="border-t border-white/5 pt-2 flex justify-between">
              <span className="text-white/70 font-semibold text-sm">Total dealt</span>
              <span className="text-green-400 font-bold text-xl font-mono">{bd.totalDamageDealt}</span>
            </div>
          </div>
        </div>

        {/* Enemy status */}
        <div className={`bg-red-500/5 border border-red-500/10 rounded-2xl p-4 transition-all duration-500 ${step >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}>
          <p className="text-[10px] text-red-400/60 uppercase tracking-wider font-semibold mb-3">
            Enemy Status
          </p>
          <div className="space-y-2">
            {result.enemiesAfter.map((enemy, i) => {
              const dead = enemy.health <= 0;
              return (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={dead ? 'opacity-30' : ''}>{dead ? '☠' : '💀'}</span>
                    <span className={`text-sm ${dead ? 'line-through text-white/20' : 'text-white/60'}`}>
                      {enemy.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-black/40 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-1000 ${dead ? 'bg-white/10' : 'bg-red-500'}`}
                        style={{ width: `${Math.max(0, (enemy.health / enemy.maxHealth) * 100)}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-mono text-white/30 w-10 text-right">
                      {Math.max(0, enemy.health)}/{enemy.maxHealth}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Counter-attack */}
          {!isVictory && bd.netDamageTaken > 0 && (
            <div className="mt-3 pt-3 border-t border-white/5">
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Enemy counter-attack</span>
                <span className="text-red-400 font-mono">-{bd.netDamageTaken}</span>
              </div>
              {bd.defenseReduction > 0 && (
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-white/30">Your defense blocked</span>
                  <span className="text-blue-400 font-mono">-{bd.defenseReduction}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Healing */}
        {result.healingDone > 0 && (
          <div className={`bg-emerald-500/5 border border-emerald-500/10 rounded-2xl px-4 py-3 transition-all duration-500 ${step >= 2 ? 'opacity-100' : 'opacity-0'}`}>
            <p className="text-emerald-400/70 text-sm">
              💚 Healed {result.healingDone} HP across your team
            </p>
          </div>
        )}

        {/* Result */}
        {step >= 3 && (
          <div className={`rounded-2xl p-5 text-center transition-all duration-500 ${
            isVictory
              ? 'bg-green-500/10 border border-green-500/20'
              : isLoss
                ? 'bg-red-500/10 border border-red-500/20'
                : 'bg-amber-500/10 border border-amber-500/20'
          }`}>
            <p className="text-3xl mb-2">{isVictory ? '🏆' : isLoss ? '💀' : '⚔️'}</p>
            <p className={`font-bold text-lg ${isVictory ? 'text-green-400' : isLoss ? 'text-red-400' : 'text-amber-400'}`}>
              {isVictory ? 'Enemies Defeated' : isLoss ? 'Team Down' : 'Combat Continues'}
            </p>
            {isVictory && (
              <p className="text-white/40 text-sm mt-1">All threats eliminated. Area secured.</p>
            )}
            {isLoss && (
              <p className="text-white/40 text-sm mt-1">Your survivors couldn&apos;t hold. Fall back.</p>
            )}
          </div>
        )}
      </div>

      {/* Continue */}
      <div className="px-5 pb-8 pt-2">
        <button
          onClick={onContinue}
          disabled={step < 3}
          className={`w-full py-4 font-bold text-lg rounded-2xl transition-all active:scale-[0.97] ${
            step >= 3
              ? isVictory
                ? 'bg-green-700 hover:bg-green-600 text-white shadow-lg shadow-green-900/30'
                : 'bg-slate-700 hover:bg-slate-600 text-white'
              : 'bg-white/5 text-white/20 cursor-not-allowed'
          }`}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
