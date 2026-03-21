'use client';

import { useState, useEffect } from 'react';
import { CombatResult, CardInstance } from '../lib/types';

interface CombatResolutionScreenProps {
  result: CombatResult;
  cardsPlayed: CardInstance[];
  onContinue: () => void;
}

export function CombatResolutionScreen({
  result,
  cardsPlayed,
  onContinue,
}: CombatResolutionScreenProps) {
  const [revealStep, setRevealStep] = useState(0);
  const totalSteps = 4;

  // Auto-advance reveal animation
  useEffect(() => {
    if (revealStep < totalSteps) {
      const timer = setTimeout(() => setRevealStep(prev => prev + 1), 600);
      return () => clearTimeout(timer);
    }
  }, [revealStep]);

  const { damageBreakdown: bd, synergiesTriggered } = result;
  const isVictory = result.result === 'player-victory';
  const isLoss = result.result === 'player-loss';

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      {/* Header */}
      <div className="px-6 pt-6 pb-4">
        <h2 className="text-xl font-bold text-center">
          {isVictory ? '⚔️ Combat Resolved' : isLoss ? '💀 Combat Resolved' : '⚔️ Combat Round'}
        </h2>
      </div>

      <div className="flex-1 px-6 space-y-4 overflow-y-auto pb-4">
        {/* Cards Played */}
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Cards Played
          </h3>
          <div className="flex gap-2">
            {cardsPlayed.map(card => (
              <div key={card.id} className="bg-slate-700 rounded-lg px-3 py-2 flex-1">
                <p className="text-sm font-semibold">{card.name}</p>
                <p className="text-xs text-slate-400 capitalize">{card.type}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Damage Dealt */}
        <div
          className={`bg-slate-800/50 rounded-xl border border-slate-700 p-4 transition-all duration-500 ${
            revealStep >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <h3 className="text-xs font-semibold text-green-400 uppercase tracking-wider mb-3">
            ⚔️ Damage Dealt
          </h3>
          <div className="space-y-2">
            {bd.baseSurvivorDamage > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-300">Survivor base damage</span>
                <span className="text-green-400 font-mono">+{bd.baseSurvivorDamage}</span>
              </div>
            )}
            {bd.attributeBonus > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-300">Combat attribute bonus</span>
                <span className="text-green-400 font-mono">+{bd.attributeBonus}</span>
              </div>
            )}
            {bd.itemBonus > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-300">Item/action bonus</span>
                <span className="text-green-400 font-mono">+{bd.itemBonus}</span>
              </div>
            )}
            {bd.synergyBonus > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-purple-400">
                  ⚡ Synergy bonus
                  {synergiesTriggered.length > 0 && (
                    <span className="text-xs ml-1">
                      ({synergiesTriggered.map(s => s.name).join(', ')})
                    </span>
                  )}
                </span>
                <span className="text-purple-400 font-mono">+{bd.synergyBonus}</span>
              </div>
            )}
            <div className="border-t border-slate-600 pt-2 flex justify-between text-sm font-bold">
              <span>Total damage dealt</span>
              <span className="text-green-400 font-mono text-lg">{bd.totalDamageDealt}</span>
            </div>
          </div>
        </div>

        {/* Enemy Status */}
        <div
          className={`bg-slate-800/50 rounded-xl border border-slate-700 p-4 transition-all duration-500 ${
            revealStep >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <h3 className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-3">
            Enemy Status
          </h3>
          <div className="space-y-2">
            {result.enemiesAfter.map((enemy, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={enemy.health <= 0 ? 'opacity-40' : ''}>
                    {enemy.health <= 0 ? '☠️' : '💀'}
                  </span>
                  <span className={`text-sm ${enemy.health <= 0 ? 'line-through text-slate-500' : 'text-slate-300'}`}>
                    {enemy.name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ${
                        enemy.health <= 0 ? 'bg-slate-600' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.max(0, (enemy.health / enemy.maxHealth) * 100)}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono text-red-400 w-10 text-right">
                    {Math.max(0, enemy.health)}/{enemy.maxHealth}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Damage Taken */}
        <div
          className={`bg-slate-800/50 rounded-xl border border-slate-700 p-4 transition-all duration-500 ${
            revealStep >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <h3 className="text-xs font-semibold text-orange-400 uppercase tracking-wider mb-3">
            {isVictory ? '🛡️ Enemies Eliminated Before Attacking' : '💥 Counter-Attack'}
          </h3>
          {isVictory ? (
            <p className="text-sm text-green-400">All enemies defeated — no damage taken!</p>
          ) : (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-300">Enemy attack power</span>
                <span className="text-red-400 font-mono">{bd.totalEnemyDamage}</span>
              </div>
              {bd.defenseReduction > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-300">Your defense reduction</span>
                  <span className="text-blue-400 font-mono">-{bd.defenseReduction}</span>
                </div>
              )}
              <div className="border-t border-slate-600 pt-2 flex justify-between text-sm font-bold">
                <span>Net damage taken</span>
                <span className="text-red-400 font-mono text-lg">{bd.netDamageTaken}</span>
              </div>
            </div>
          )}
        </div>

        {/* Survivor Status */}
        <div
          className={`bg-slate-800/50 rounded-xl border border-slate-700 p-4 transition-all duration-500 ${
            revealStep >= 4 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <h3 className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-3">
            Survivor Status
          </h3>
          <div className="space-y-2">
            {result.survivorsAfter.map(survivor => {
              const hp = survivor.currentHealth ?? 0;
              const maxHp = survivor.maxHealth ?? 100;
              const pct = (hp / maxHp) * 100;
              const isDead = hp <= 0;

              return (
                <div key={survivor.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={isDead ? 'opacity-40' : ''}>
                      {isDead ? '💀' : '👤'}
                    </span>
                    <span className={`text-sm ${isDead ? 'line-through text-slate-500' : 'text-slate-300'}`}>
                      {survivor.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-1000 ${
                          pct > 60 ? 'bg-green-500' : pct > 30 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono text-green-400 w-14 text-right">
                      {hp}/{maxHp}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {result.healingDone > 0 && (
            <p className="text-xs text-green-400 mt-2">💚 Healed {result.healingDone} HP</p>
          )}
        </div>

        {/* Result banner */}
        {revealStep >= totalSteps && (
          <div
            className={`rounded-xl p-4 text-center font-bold text-lg ${
              isVictory
                ? 'bg-green-500/20 border border-green-500/40 text-green-400'
                : isLoss
                  ? 'bg-red-500/20 border border-red-500/40 text-red-400'
                  : 'bg-yellow-500/20 border border-yellow-500/40 text-yellow-400'
            }`}
          >
            {isVictory && '🏆 VICTORY — All enemies defeated!'}
            {isLoss && '💀 DEFEAT — All survivors down!'}
            {!isVictory && !isLoss && '⚔️ Combat continues...'}
          </div>
        )}
      </div>

      {/* Continue button */}
      <div className="px-6 pb-8 pt-4">
        <button
          onClick={onContinue}
          disabled={revealStep < totalSteps}
          className={`w-full py-4 font-bold text-lg rounded-xl transition-all active:scale-[0.98] ${
            revealStep >= totalSteps
              ? isVictory
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : isLoss
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-amber-600 hover:bg-amber-700 text-white'
              : 'bg-slate-700 text-slate-500 cursor-not-allowed'
          }`}
        >
          CONTINUE
        </button>
      </div>
    </div>
  );
}
