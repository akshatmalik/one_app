'use client';

import { useState, useEffect } from 'react';
import { GameState, Run, CardInstance } from '../lib/types';
import { repository } from '../lib/storage';

export function useGame() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [currentRun, setCurrentRun] = useState<Run | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Load game state on mount
  useEffect(() => {
    const loadGame = async () => {
      try {
        setLoading(true);
        const state = await repository.getGameState();
        setGameState(state);
        setCurrentRun(state.currentRun || null);
      } catch (e) {
        setError(e as Error);
      } finally {
        setLoading(false);
      }
    };

    loadGame();
  }, []);

  const refreshGameState = async () => {
    try {
      const state = await repository.getGameState();
      setGameState(state);
      setCurrentRun(state.currentRun || null);
    } catch (e) {
      setError(e as Error);
    }
  };

  const startRun = async (selectedCards: CardInstance[]) => {
    try {
      if (!gameState) throw new Error('Game state not loaded');

      const run = await repository.createRun(selectedCards);
      setCurrentRun(run);
      await refreshGameState();
      return run;
    } catch (e) {
      setError(e as Error);
      throw e;
    }
  };

  const advanceStage = async (stageData: {
    stageNum: number;
    decision?: string;
    cardsPlayed?: CardInstance[];
    result: 'completed' | 'failed' | 'skipped';
    itemsFound?: CardInstance[];
  }) => {
    try {
      if (!currentRun) throw new Error('No active run');

      const updatedRun = await repository.updateRun(currentRun.runId, {
        currentStage: stageData.stageNum + 1,
        stages: [
          ...currentRun.stages,
          {
            stageNum: stageData.stageNum,
            encounter: null as any, // TODO: get from context
            decision: stageData.decision,
            cardsPlayed: stageData.cardsPlayed,
            result: stageData.result,
            itemsFound: stageData.itemsFound,
          },
        ],
      });

      setCurrentRun(updatedRun);
      return updatedRun;
    } catch (e) {
      setError(e as Error);
      throw e;
    }
  };

  const completeRun = async () => {
    try {
      if (!currentRun) throw new Error('No active run');

      const completed = await repository.completeRun(currentRun.runId);
      setCurrentRun(null);
      await refreshGameState();
      return completed;
    } catch (e) {
      setError(e as Error);
      throw e;
    }
  };

  const updateCardRecovery = async (cardId: string, days: number) => {
    try {
      await repository.setRecoveryTime(cardId, days);
      await refreshGameState();
    } catch (e) {
      setError(e as Error);
      throw e;
    }
  };

  const advanceDay = async () => {
    try {
      await repository.advanceRecovery(1);
      await refreshGameState();
    } catch (e) {
      setError(e as Error);
      throw e;
    }
  };

  const getAvailableCards = (): CardInstance[] => {
    if (!gameState) return [];
    return gameState.deck.filter((card) => !card.exhausted);
  };

  const getSurvivors = (): CardInstance[] => {
    if (!gameState) return [];
    return gameState.deck.filter((card) => card.type === 'survivor');
  };

  const getItems = (): CardInstance[] => {
    if (!gameState) return [];
    return gameState.deck.filter((card) => card.type === 'item');
  };

  const getActions = (): CardInstance[] => {
    if (!gameState) return [];
    return gameState.deck.filter((card) => card.type === 'action');
  };

  return {
    gameState,
    currentRun,
    loading,
    error,

    // State getters
    getAvailableCards,
    getSurvivors,
    getItems,
    getActions,

    // Run management
    startRun,
    advanceStage,
    completeRun,

    // Card/recovery management
    updateCardRecovery,
    advanceDay,

    // Utilities
    refreshGameState,
  };
}
