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
    resetGame,
  } = useGame();

  const [view, setView] = useState<View>('home');

  // Auto-detect if there's an active run
  const activeView = currentRun ? 'run' : view;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900 text-white">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">🧟</div>
          <p className="text-slate-400">Loading survivor deck...</p>
        </div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900 text-white">
        <div className="text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <p className="text-slate-400">Error loading game state</p>
          <button
            onClick={resetGame}
            className="mt-4 px-4 py-2 bg-slate-700 rounded-lg hover:bg-slate-600 text-sm"
          >
            Reset Game
          </button>
        </div>
      </div>
    );
  }

  // === ACTIVE RUN VIEW ===
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
      />
    );
  }

  // === PREPARE EXPEDITION VIEW ===
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

  // === HOME BASE VIEW ===
  const survivors = getSurvivors();
  const items = getItems();
  const actions = getActions();
  const availableCards = getAvailableCards();
  const exhaustedCards = gameState.deck.filter(c => c.exhausted);
  const completedRuns = gameState.homeBase.completedRuns;
  const canLaunch = availableCards.filter(c => c.type === 'survivor').length >= 2
    && availableCards.filter(c => c.type !== 'survivor').length >= 2;

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Hero header */}
      <div className="bg-gradient-to-b from-slate-800 to-slate-900 px-6 pt-8 pb-6">
        <h1 className="text-3xl font-bold mb-1">🧟 Survivor Deck-Builder</h1>
        <p className="text-slate-400 text-sm">
          Build your deck. Survive the expedition. Return home alive.
        </p>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="bg-slate-700/50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-green-400">{availableCards.length}</p>
            <p className="text-[10px] text-slate-500 uppercase">Ready</p>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-red-400">{exhaustedCards.length}</p>
            <p className="text-[10px] text-slate-500 uppercase">Recovering</p>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-amber-400">{completedRuns.length}</p>
            <p className="text-[10px] text-slate-500 uppercase">Runs</p>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">
        {/* Launch button */}
        <button
          onClick={() => setView('prepare')}
          disabled={!canLaunch}
          className={`w-full py-4 font-bold text-lg rounded-xl transition-all active:scale-[0.98] ${
            canLaunch
              ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/20'
              : 'bg-slate-700 text-slate-500 cursor-not-allowed'
          }`}
        >
          {canLaunch ? '🚀 PREPARE EXPEDITION' : '⏳ Not Enough Ready Cards'}
        </button>

        {/* Recovery action */}
        {exhaustedCards.length > 0 && (
          <button
            onClick={advanceDay}
            className="w-full py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-semibold rounded-xl transition-colors"
          >
            ⏰ Advance 1 Day (Recover Cards)
          </button>
        )}

        {/* Survivors */}
        <div>
          <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
            <span>👥</span> Survivors
          </h2>
          <div className="grid grid-cols-1 gap-3">
            {survivors.map(survivor => {
              const hp = survivor.currentHealth ?? 100;
              const maxHp = survivor.maxHealth ?? 100;
              const roleIcons: Record<string, string> = {
                healer: '💚', fighter: '⚔️', scout: '🔍', mechanic: '🔧', scientist: '🔬',
              };

              return (
                <div
                  key={survivor.id}
                  className={`rounded-xl border p-4 ${
                    survivor.exhausted
                      ? 'bg-slate-800/30 border-red-800/50 opacity-60'
                      : 'bg-slate-800/50 border-slate-700'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-3xl">{roleIcons[survivor.role ?? ''] ?? '👤'}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold">{survivor.name}</h3>
                        {survivor.exhausted ? (
                          <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">
                            {survivor.recoveryTime}d recovery
                          </span>
                        ) : (
                          <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                            Ready
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 capitalize">{survivor.role}</p>

                      {/* HP bar */}
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              hp / maxHp > 0.6 ? 'bg-green-500' : hp / maxHp > 0.3 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${(hp / maxHp) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono text-slate-500">{hp}/{maxHp}</span>
                      </div>

                      {/* Stats */}
                      {survivor.attributes && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {survivor.attributes.combat > 0 && <span className="text-[10px] text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded">ATK {survivor.attributes.combat}</span>}
                          {survivor.attributes.defense > 0 && <span className="text-[10px] text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded">DEF {survivor.attributes.defense}</span>}
                          {survivor.attributes.healing > 0 && <span className="text-[10px] text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded">HEAL {survivor.attributes.healing}</span>}
                          {survivor.attributes.speed > 0 && <span className="text-[10px] text-yellow-400 bg-yellow-400/10 px-1.5 py-0.5 rounded">SPD {survivor.attributes.speed}</span>}
                          {survivor.attributes.perception > 0 && <span className="text-[10px] text-purple-400 bg-purple-400/10 px-1.5 py-0.5 rounded">PER {survivor.attributes.perception}</span>}
                        </div>
                      )}

                      {/* Special */}
                      {survivor.special && (
                        <p className="text-[10px] text-amber-400 mt-1.5">
                          ✨ {survivor.special.name}: {survivor.special.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Equipment & Items */}
        <div>
          <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
            <span>🎒</span> Equipment & Items
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {items.map(item => (
              <div
                key={item.id}
                className={`rounded-xl border p-3 ${
                  item.exhausted
                    ? 'bg-slate-800/30 border-red-800/50 opacity-60'
                    : 'bg-slate-800/50 border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">
                    {item.itemType === 'equipment' ? '🛡️' : '💊'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm truncate">{item.name}</h4>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 capitalize mb-1">{item.itemType}</p>
                <div className="flex flex-wrap gap-1">
                  {item.bonusAttributes?.combat && <span className="text-[10px] text-red-400 bg-red-400/10 px-1.5 rounded">ATK +{item.bonusAttributes.combat}</span>}
                  {item.bonusAttributes?.defense && <span className="text-[10px] text-blue-400 bg-blue-400/10 px-1.5 rounded">DEF +{item.bonusAttributes.defense}</span>}
                  {item.bonusAttributes?.healing && <span className="text-[10px] text-green-400 bg-green-400/10 px-1.5 rounded">HEAL +{item.bonusAttributes.healing}</span>}
                  {item.bonusAttributes?.perception && <span className="text-[10px] text-purple-400 bg-purple-400/10 px-1.5 rounded">PER +{item.bonusAttributes.perception}</span>}
                </div>
                <div className="mt-1.5">
                  {item.exhausted ? (
                    <span className="text-[10px] text-red-400">🔴 {item.recoveryTime}d recovery</span>
                  ) : (
                    <span className="text-[10px] text-green-400">🟢 Ready</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        {actions.length > 0 && (
          <div>
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
              <span>⚡</span> Actions
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {actions.map(action => (
                <div
                  key={action.id}
                  className={`rounded-xl border p-3 ${
                    action.exhausted
                      ? 'bg-slate-800/30 border-red-800/50 opacity-60'
                      : 'bg-slate-800/50 border-purple-500/30'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">⚡</span>
                    <h4 className="font-semibold text-sm">{action.name}</h4>
                  </div>
                  <p className="text-[10px] text-slate-400">{action.description}</p>
                  <div className="mt-1.5">
                    {action.exhausted ? (
                      <span className="text-[10px] text-red-400">🔴 {action.recoveryTime}d recovery</span>
                    ) : (
                      <span className="text-[10px] text-green-400">🟢 Ready</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Run history */}
        {completedRuns.length > 0 && (
          <div>
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
              <span>📜</span> Expedition Log
            </h2>
            <div className="space-y-2">
              {completedRuns.slice(-5).reverse().map((run, i) => (
                <div key={run.runId} className="bg-slate-800/50 rounded-lg border border-slate-700 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span>{run.status === 'completed' ? '✅' : '❌'}</span>
                      <span className="text-sm font-semibold">
                        Run #{completedRuns.length - i}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400">
                      {run.stages.filter(s => s.result === 'completed').length}/{run.totalStages} stages
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reset button */}
        <div className="pt-4 pb-8">
          <button
            onClick={resetGame}
            className="w-full py-2 text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            Reset Game (Dev)
          </button>
        </div>
      </div>
    </div>
  );
}
