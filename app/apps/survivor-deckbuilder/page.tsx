'use client';

import { useState } from 'react';
import { useGame } from './hooks/useGame';
import { CardInstance } from './lib/types';
import { RunScreen } from './components/RunScreen';
import { PrepareRunScreen } from './components/PrepareRunScreen';
import { PlayingCard } from './components/PlayingCard';

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

  const activeView = currentRun ? 'run' : view;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950 text-white">
        <div className="text-center">
          <div className="text-5xl mb-4 animate-pulse">🧟</div>
          <p className="text-white/30 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950 text-white">
        <div className="text-center">
          <p className="text-white/30 text-sm mb-4">Failed to load game</p>
          <button
            onClick={resetGame}
            className="px-4 py-2 bg-white/10 rounded-xl hover:bg-white/20 text-sm transition-colors"
          >
            Reset
          </button>
        </div>
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
  const survivors = getSurvivors();
  const items = getItems();
  const actions = getActions();
  const availableCards = getAvailableCards();
  const exhaustedCards = gameState.deck.filter(c => c.exhausted);
  const completedRuns = gameState.homeBase.completedRuns;
  const canLaunch = availableCards.filter(c => c.type === 'survivor').length >= 2
    && availableCards.filter(c => c.type !== 'survivor').length >= 2;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Header */}
      <div className="px-5 pt-8 pb-6">
        <p className="text-[10px] text-white/20 uppercase tracking-[0.3em] font-semibold mb-1">Home Base</p>
        <h1 className="text-3xl font-bold text-white mb-1">Survivor</h1>
        <p className="text-white/30 text-sm">Build your deck. Survive the run.</p>
      </div>

      {/* Quick stats */}
      <div className="px-5 pb-4">
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-black/30 rounded-xl border border-white/5 p-3 text-center">
            <p className="text-xl font-bold text-emerald-400">{availableCards.length}</p>
            <p className="text-[9px] text-white/20 uppercase mt-0.5">Ready</p>
          </div>
          <div className="bg-black/30 rounded-xl border border-white/5 p-3 text-center">
            <p className="text-xl font-bold text-red-400">{exhaustedCards.length}</p>
            <p className="text-[9px] text-white/20 uppercase mt-0.5">Recovering</p>
          </div>
          <div className="bg-black/30 rounded-xl border border-white/5 p-3 text-center">
            <p className="text-xl font-bold text-amber-400">{completedRuns.length}</p>
            <p className="text-[9px] text-white/20 uppercase mt-0.5">Runs</p>
          </div>
        </div>
      </div>

      {/* Launch / Recovery */}
      <div className="px-5 pb-6 space-y-2">
        <button
          onClick={() => setView('prepare')}
          disabled={!canLaunch}
          className={`w-full py-4 font-bold text-lg rounded-2xl transition-all active:scale-[0.97] ${
            canLaunch
              ? 'bg-green-700 hover:bg-green-600 text-white shadow-lg shadow-green-900/30'
              : 'bg-white/5 text-white/20 cursor-not-allowed'
          }`}
        >
          {canLaunch ? 'Prepare Expedition' : 'Cards Recovering...'}
        </button>

        {exhaustedCards.length > 0 && (
          <button
            onClick={advanceDay}
            className="w-full py-3 bg-black/30 border border-white/5 text-white/40 font-semibold rounded-2xl hover:bg-black/40 transition-colors text-sm"
          >
            Advance Day ({exhaustedCards.length} recovering)
          </button>
        )}
      </div>

      {/* Cards — horizontal scrollable hands */}
      <div className="space-y-5 pb-8">
        {/* Survivors */}
        <div>
          <p className="text-[10px] text-blue-400/50 uppercase tracking-wider font-semibold mb-2 px-5">
            Survivors
          </p>
          <div
            className="flex gap-3 overflow-x-auto pb-2 px-5 scrollbar-hide"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {survivors.map(card => (
              <PlayingCard key={card.id} card={card} size="md" disabled={card.exhausted} />
            ))}
          </div>
        </div>

        {/* Equipment & Consumables */}
        <div>
          <p className="text-[10px] text-amber-400/50 uppercase tracking-wider font-semibold mb-2 px-5">
            Equipment & Consumables
          </p>
          <div
            className="flex gap-3 overflow-x-auto pb-2 px-5 scrollbar-hide"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {items.map(card => (
              <PlayingCard key={card.id} card={card} size="sm" disabled={card.exhausted} />
            ))}
          </div>
        </div>

        {/* Actions */}
        {actions.length > 0 && (
          <div>
            <p className="text-[10px] text-purple-400/50 uppercase tracking-wider font-semibold mb-2 px-5">
              Actions
            </p>
            <div
              className="flex gap-3 overflow-x-auto pb-2 px-5 scrollbar-hide"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              {actions.map(card => (
                <PlayingCard key={card.id} card={card} size="sm" disabled={card.exhausted} />
              ))}
            </div>
          </div>
        )}

        {/* Run history */}
        {completedRuns.length > 0 && (
          <div className="px-5">
            <p className="text-[10px] text-white/20 uppercase tracking-wider font-semibold mb-2">
              Expedition Log
            </p>
            <div className="space-y-1.5">
              {completedRuns.slice(-5).reverse().map((run, i) => (
                <div key={run.runId} className="flex items-center gap-3 bg-black/20 rounded-xl border border-white/5 px-4 py-2.5">
                  <span className="text-sm">{run.status === 'completed' ? '✅' : '❌'}</span>
                  <span className="text-xs text-white/50 font-semibold">
                    Run #{completedRuns.length - i}
                  </span>
                  <span className="text-[10px] text-white/20 ml-auto font-mono">
                    {run.stages.filter(s => s.result === 'completed').length}/{run.totalStages}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reset */}
        <div className="px-5">
          <button
            onClick={resetGame}
            className="w-full py-2 text-[10px] text-white/10 hover:text-white/20 transition-colors"
          >
            Reset Game
          </button>
        </div>
      </div>
    </div>
  );
}
