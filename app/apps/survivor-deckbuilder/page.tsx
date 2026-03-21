'use client';

import { useState } from 'react';
import { useGame } from './hooks/useGame';
import { CardInstance } from './lib/types';
import { RunScreen } from './components/RunScreen';
import { PrepareRunScreen } from './components/PrepareRunScreen';

type View = 'home' | 'prepare' | 'run';

export default function SurvivorDeckBuilder() {
  const {
    gameState,
    currentRun,
    loading,
    getSurvivors,
    getItems,
    getActions,
    getAvailableCards,
    startRun,
    enterCombat,
    playCards,
    continueAfterCombat,
    advanceToNextStage,
    completeRun,
    advanceDay,
    retreatFromExpedition,
    buildHomeBarricade,
    resetGame,
  } = useGame();

  const [view, setView] = useState<View>('home');
  const [barricadeError, setBarricadeError] = useState<string | null>(null);

  const activeView = currentRun ? 'run' : view;

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center">
        <p className="text-stone-700 font-mono text-xs tracking-widest uppercase animate-pulse">
          LOADING...
        </p>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center px-8">
        <p className="text-red-900 font-mono text-sm mb-4">SYSTEM FAILURE</p>
        <button
          onClick={resetGame}
          className="px-6 py-2 border border-stone-700 text-stone-400 font-mono text-xs tracking-widest uppercase hover:bg-stone-900 transition-colors"
        >
          RESET
        </button>
      </div>
    );
  }

  // === RUN VIEW ===
  if (activeView === 'run' && currentRun) {
    return (
      <RunScreen
        run={currentRun}
        onEnterCombat={enterCombat}
        onPlayCards={async (cards: CardInstance[]) => {
          await playCards(cards);
        }}
        onContinueAfterCombat={continueAfterCombat}
        onAdvanceStage={async () => {
          await advanceToNextStage();
        }}
        onCompleteRun={async () => {
          await completeRun();
          setView('home');
        }}
        onRetreat={async () => {
          await retreatFromExpedition();
        }}
      />
    );
  }

  // === PREPARE VIEW ===
  if (activeView === 'prepare') {
    return (
      <PrepareRunScreen
        survivors={getSurvivors()}
        items={getItems()}
        actions={getActions()}
        onLaunch={async (deck: CardInstance[]) => {
          await startRun(deck);
        }}
        onBack={() => setView('home')}
      />
    );
  }

  // === HOME BASE ===
  const availableCards = getAvailableCards();
  const exhaustedCards = gameState.deck.filter(c => c.exhausted);
  const completedRuns = gameState.homeBase.completedRuns;
  const survivors = getSurvivors();
  const items = getItems();
  const actions = getActions();

  const availableSurvivors = availableCards.filter(c => c.type === 'survivor');
  const canLaunch = availableSurvivors.length >= 2
    && availableCards.filter(c => c.type !== 'survivor').length >= 2;

  const totalRuns = completedRuns.length;
  const successfulRuns = completedRuns.filter(r => r.status === 'completed').length;

  const mats = gameState.homeBase.rawMaterials ?? { scrapMetal: 0, wood: 0, cloth: 0, medicalSupplies: 0 };
  const canBarricade = (mats.wood ?? 0) >= 3 && (mats.scrapMetal ?? 0) >= 2;

  return (
    <div className="min-h-screen bg-stone-950 text-stone-300">
      <div className="min-h-full flex flex-col">
        {/* Header */}
        <div className="px-5 pt-8 pb-6 border-b border-stone-900">
          <p className="text-[9px] text-stone-700 font-mono tracking-widest uppercase mb-2">
            ── SAFE HOUSE ─────────────────────────
          </p>
          <h1 className="text-3xl font-bold text-stone-200 uppercase tracking-wider font-mono mb-1">
            SURVIVOR
          </h1>
          <p className="text-stone-600 text-sm font-mono">
            Day {totalRuns + 1}. The road isn&apos;t going to clear itself.
          </p>
        </div>

        {/* Status grid */}
        <div className="px-5 py-4 border-b border-stone-900">
          <div className="grid grid-cols-3 gap-2">
            <div className="border border-stone-800 bg-stone-900 p-3 text-center">
              <p className="text-xl font-bold text-stone-300 font-mono">{availableCards.length}</p>
              <p className="text-[8px] text-stone-700 font-mono tracking-widest uppercase mt-0.5">READY</p>
            </div>
            <div className="border border-stone-800 bg-stone-900 p-3 text-center">
              <p className="text-xl font-bold text-stone-300 font-mono">{exhaustedCards.length}</p>
              <p className="text-[8px] text-stone-700 font-mono tracking-widest uppercase mt-0.5">RECOVERING</p>
            </div>
            <div className="border border-stone-800 bg-stone-900 p-3 text-center">
              <p className="text-xl font-bold text-stone-300 font-mono">{successfulRuns}/{totalRuns}</p>
              <p className="text-[8px] text-stone-700 font-mono tracking-widest uppercase mt-0.5">RUNS</p>
            </div>
          </div>
        </div>

        {/* Survivors roster — compact: name, role, HP bar only */}
        <div className="px-5 py-4 border-b border-stone-900">
          <p className="text-[9px] text-stone-700 font-mono tracking-widest uppercase mb-2">SURVIVORS</p>
          <div className="space-y-1">
            {survivors.map(s => {
              const hp = s.currentHealth ?? s.maxHealth ?? 100;
              const maxHp = s.maxHealth ?? 100;
              const pct = (hp / maxHp) * 100;
              return (
                <div key={s.id} className={`flex items-center gap-3 border border-stone-800 px-3 py-2 ${s.exhausted ? 'bg-stone-900/40 opacity-50' : 'bg-stone-900'}`}>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-mono uppercase font-bold ${s.exhausted ? 'text-stone-600' : 'text-stone-300'}`}>
                      {s.name}
                    </p>
                    <p className="text-[9px] text-stone-600 font-mono uppercase">
                      {s.role} {s.exhausted ? `· RECOVERING (${s.recoveryTime}d)` : '· READY'}
                    </p>
                  </div>
                  <div className="w-16 h-0.5 bg-stone-800">
                    <div
                      className={`h-full ${pct > 60 ? 'bg-stone-500' : pct > 30 ? 'bg-amber-800' : 'bg-red-900'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-[9px] text-stone-600 font-mono w-10 text-right">{hp}/{maxHp}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Gear inventory */}
        <div className="px-5 py-4 border-b border-stone-900">
          <p className="text-[9px] text-stone-700 font-mono tracking-widest uppercase mb-2">
            INVENTORY ({availableCards.filter(c => c.type !== 'survivor').length} ready)
          </p>
          <div className="flex flex-wrap gap-1">
            {[...items, ...actions].map(card => (
              <span
                key={card.id}
                className={`text-[10px] font-mono border px-2 py-0.5 ${
                  card.exhausted
                    ? 'border-stone-900 text-stone-700 bg-stone-900/30'
                    : 'border-stone-800 text-stone-500 bg-stone-900'
                }`}
              >
                {card.name}{card.exhausted ? ` (${card.recoveryTime}d)` : ''}
              </span>
            ))}
          </div>
        </div>

        {/* Raw materials */}
        {(mats.wood > 0 || mats.scrapMetal > 0 || mats.cloth > 0 || mats.medicalSupplies > 0) && (
          <div className="px-5 py-3 border-b border-stone-900">
            <p className="text-[9px] text-stone-700 font-mono tracking-widest uppercase mb-1.5">MATERIALS</p>
            <div className="flex gap-3 flex-wrap">
              {mats.wood > 0 && (
                <span className="text-[9px] text-stone-600 font-mono">▤ Wood ×{mats.wood}</span>
              )}
              {mats.scrapMetal > 0 && (
                <span className="text-[9px] text-stone-600 font-mono">⚙ Scrap ×{mats.scrapMetal}</span>
              )}
              {mats.cloth > 0 && (
                <span className="text-[9px] text-stone-600 font-mono">◫ Cloth ×{mats.cloth}</span>
              )}
              {mats.medicalSupplies > 0 && (
                <span className="text-[9px] text-stone-600 font-mono">✚ Med ×{mats.medicalSupplies}</span>
              )}
            </div>
          </div>
        )}

        {/* Base defenses — barricade */}
        <div className="px-5 py-4 border-b border-stone-900">
          <p className="text-[9px] text-stone-700 font-mono tracking-widest uppercase mb-2">BASE DEFENSES</p>
          {gameState.homeBase.isBarricaded ? (
            <div className="border border-stone-700 bg-stone-900 px-3 py-2">
              <p className="text-xs text-stone-400 font-mono">▦ Barricade ready — next expedition gets +30 defense</p>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="border border-stone-800 bg-stone-900 px-3 py-2">
                <p className="text-[10px] text-stone-600 font-mono">Build a barricade before the next run for +30 defense</p>
                <p className="text-[9px] text-stone-700 font-mono mt-0.5">Costs: 3 Wood · 2 Scrap Metal</p>
              </div>
              <button
                onClick={async () => {
                    setBarricadeError(null);
                    try { await buildHomeBarricade(); } catch (e) { setBarricadeError('Not enough materials.'); }
                  }}
                disabled={!canBarricade}
                className={`w-full py-2 font-mono text-xs tracking-widest uppercase border transition-colors ${
                  canBarricade
                    ? 'border-stone-700 text-stone-400 hover:bg-stone-900'
                    : 'border-stone-900 text-stone-700 cursor-not-allowed'
                }`}
              >
                BUILD BARRICADE
              </button>
              {barricadeError && (
                <p className="text-[9px] text-red-800 font-mono">{barricadeError}</p>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-5 py-4 space-y-2">
          <button
            onClick={() => setView('prepare')}
            disabled={!canLaunch}
            className={`w-full py-3.5 font-mono font-bold text-sm tracking-widest uppercase border transition-colors ${
              canLaunch
                ? 'bg-stone-800 hover:bg-stone-700 border-stone-700 text-stone-200 active:scale-[0.98]'
                : 'bg-stone-900 border-stone-900 text-stone-700 cursor-not-allowed'
            }`}
          >
            {canLaunch ? 'PREPARE EXPEDITION →' : 'CARDS RECOVERING...'}
          </button>

          {!canLaunch && (
            <p className="text-[9px] text-stone-700 font-mono text-center">
              Need 2 survivors + 2 gear ready.
              {availableSurvivors.length < 2 ? ` ${2 - availableSurvivors.length} survivor(s) still recovering.` : ''}
            </p>
          )}

          {exhaustedCards.length > 0 && (
            <button
              onClick={advanceDay}
              className="w-full py-2.5 font-mono text-xs tracking-widest uppercase border border-stone-900 text-stone-600 hover:text-stone-500 hover:border-stone-800 transition-colors"
            >
              ADVANCE DAY ({exhaustedCards.length} recovering)
            </button>
          )}
        </div>

        {/* Run log */}
        {completedRuns.length > 0 && (
          <div className="px-5 pb-4 border-t border-stone-900 mt-2">
            <p className="text-[9px] text-stone-700 font-mono tracking-widest uppercase mb-2 mt-4">
              EXPEDITION LOG
            </p>
            <div className="border border-stone-800">
              {completedRuns.slice(-5).reverse().map((run, i) => {
                const stages = run.stages.filter(s => s.result === 'completed').length;
                return (
                  <div
                    key={run.runId}
                    className={`flex items-center gap-3 px-3 py-2 bg-stone-900 ${i > 0 ? 'border-t border-stone-800' : ''}`}
                  >
                    <span className={`text-[10px] font-mono w-3 ${run.status === 'completed' ? 'text-stone-400' : 'text-stone-700'}`}>
                      {run.status === 'completed' ? '✓' : run.isRetreat ? '→' : '✕'}
                    </span>
                    <span className="text-[10px] text-stone-500 font-mono">
                      Run #{completedRuns.length - i}
                    </span>
                    <span className="text-[9px] text-stone-700 font-mono ml-auto">
                      {stages}/{run.totalStages} stages
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Reset */}
        <div className="px-5 pb-8 mt-auto">
          <button
            onClick={resetGame}
            className="w-full py-2 text-[9px] text-stone-800 hover:text-stone-700 font-mono tracking-widest uppercase transition-colors"
          >
            RESET GAME
          </button>
        </div>
      </div>
    </div>
  );
}
