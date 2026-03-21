'use client';

import { useState, useEffect, useCallback } from 'react';
import { GameState, Run, CardInstance, RunPhase, Encounter, CombatResult } from '../lib/types';
import { repository } from '../lib/storage';
import { resolveCombat, drawCards, isTacticalRetreat, validateDeck } from '../lib/combat-engine';
import { getRandomEncounter } from '../lib/encounters';
import { detectSynergies } from '../lib/synergies';

const TOTAL_STAGES = 3;
const HAND_SIZE = 2;

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

  const refreshGameState = useCallback(async () => {
    try {
      const state = await repository.getGameState();
      setGameState(state);
      setCurrentRun(state.currentRun || null);
    } catch (e) {
      setError(e as Error);
    }
  }, []);

  // ===== CARD GETTERS =====

  const getAvailableCards = useCallback((): CardInstance[] => {
    if (!gameState) return [];
    return gameState.deck.filter(card => !card.exhausted);
  }, [gameState]);

  const getSurvivors = useCallback((): CardInstance[] => {
    if (!gameState) return [];
    return gameState.deck.filter(card => card.type === 'survivor');
  }, [gameState]);

  const getItems = useCallback((): CardInstance[] => {
    if (!gameState) return [];
    return gameState.deck.filter(card => card.type === 'item');
  }, [gameState]);

  const getActions = useCallback((): CardInstance[] => {
    if (!gameState) return [];
    return gameState.deck.filter(card => card.type === 'action');
  }, [gameState]);

  // ===== RUN MANAGEMENT =====

  /**
   * Start a new expedition run with selected deck
   */
  const startRun = useCallback(async (selectedCards: CardInstance[]) => {
    try {
      if (!gameState) throw new Error('Game state not loaded');

      const validation = validateDeck(selectedCards);
      if (!validation.valid) throw new Error(validation.error);

      const survivors = selectedCards.filter(c => c.type === 'survivor').map(s => ({
        ...s,
        currentHealth: s.maxHealth ?? 100,
      }));

      const run: Run = {
        runId: `run_${Date.now()}`,
        status: 'in_progress',
        phase: 'stage_start',
        createdAt: new Date().toISOString(),
        deck: selectedCards,
        currentHand: [],
        playedCardsThisRun: [],
        currentEncounter: getRandomEncounter(1),
        currentStage: 1,
        totalStages: TOTAL_STAGES,
        stages: [],
        itemsFound: [],
        survivorStats: {},
        activeSurvivors: survivors,
      };

      const state = { ...gameState };
      state.currentRun = run;
      state.updatedAt = new Date().toISOString();
      await repository.setGameState(state);
      setGameState(state);
      setCurrentRun(run);
      return run;
    } catch (e) {
      setError(e as Error);
      throw e;
    }
  }, [gameState]);

  /**
   * Transition to hand draw phase — draw 2 cards from remaining deck
   */
  const enterCombat = useCallback(async () => {
    try {
      if (!currentRun || !gameState) throw new Error('No active run');

      const hand = drawCards(currentRun.deck, currentRun.playedCardsThisRun, HAND_SIZE);
      const updatedRun: Run = {
        ...currentRun,
        phase: 'card_selection',
        currentHand: hand,
      };

      const state = { ...gameState, currentRun: updatedRun, updatedAt: new Date().toISOString() };
      await repository.setGameState(state);
      setGameState(state);
      setCurrentRun(updatedRun);
      return updatedRun;
    } catch (e) {
      setError(e as Error);
      throw e;
    }
  }, [currentRun, gameState]);

  /**
   * Play selected cards and resolve combat
   */
  const playCards = useCallback(async (selectedCards: CardInstance[]) => {
    try {
      if (!currentRun || !gameState) throw new Error('No active run');
      if (!currentRun.currentEncounter) throw new Error('No encounter');

      // Check for tactical retreat
      if (isTacticalRetreat(selectedCards)) {
        const updatedRun: Run = {
          ...currentRun,
          phase: 'stage_complete',
          playedCardsThisRun: [...currentRun.playedCardsThisRun, ...selectedCards.map(c => c.id)],
          lastCombatResult: undefined,
          stages: [
            ...currentRun.stages,
            {
              stageNum: currentRun.currentStage,
              encounter: currentRun.currentEncounter,
              cardsPlayed: selectedCards,
              result: 'skipped',
            },
          ],
        };

        const state = { ...gameState, currentRun: updatedRun, updatedAt: new Date().toISOString() };
        await repository.setGameState(state);
        setGameState(state);
        setCurrentRun(updatedRun);
        return updatedRun;
      }

      // Resolve combat — go to combat_resolution phase first
      const result = resolveCombat(
        selectedCards,
        currentRun.currentEncounter,
        currentRun.activeSurvivors
      );

      const updatedRun: Run = {
        ...currentRun,
        phase: 'combat_resolution',
        playedCardsThisRun: [...currentRun.playedCardsThisRun, ...selectedCards.map(c => c.id)],
        lastCombatResult: result,
        activeSurvivors: result.survivorsAfter,
        currentHand: selectedCards, // Keep selected cards for display
      };

      const state = { ...gameState, currentRun: updatedRun, updatedAt: new Date().toISOString() };
      await repository.setGameState(state);
      setGameState(state);
      setCurrentRun(updatedRun);
      return updatedRun;
    } catch (e) {
      setError(e as Error);
      throw e;
    }
  }, [currentRun, gameState]);

  /**
   * After viewing combat resolution, transition to appropriate next phase
   */
  const continueAfterCombat = useCallback(async () => {
    try {
      if (!currentRun || !gameState) throw new Error('No active run');
      if (!currentRun.lastCombatResult || !currentRun.currentEncounter) throw new Error('No combat result');

      const result = currentRun.lastCombatResult;
      const isVictory = result.result === 'player-victory';
      const isLoss = result.result === 'player-loss';
      const isLastStage = currentRun.currentStage >= TOTAL_STAGES;

      let nextPhase: RunPhase = 'stage_complete';
      if (isLoss) {
        nextPhase = 'run_failed';
      } else if (isVictory && isLastStage) {
        nextPhase = 'run_complete';
      }

      const updatedRun: Run = {
        ...currentRun,
        phase: nextPhase,
        stages: [
          ...currentRun.stages,
          {
            stageNum: currentRun.currentStage,
            encounter: currentRun.currentEncounter,
            cardsPlayed: currentRun.currentHand,
            result: isVictory ? 'completed' : isLoss ? 'failed' : 'completed',
            itemsFound: isVictory ? [] : undefined,
          },
        ],
      };

      const state = { ...gameState, currentRun: updatedRun, updatedAt: new Date().toISOString() };
      await repository.setGameState(state);
      setGameState(state);
      setCurrentRun(updatedRun);
      return updatedRun;
    } catch (e) {
      setError(e as Error);
      throw e;
    }
  }, [currentRun, gameState]);

  /**
   * Advance to the next stage after completing current one
   */
  const advanceToNextStage = useCallback(async () => {
    try {
      if (!currentRun || !gameState) throw new Error('No active run');

      const nextStage = (currentRun.currentStage + 1) as 1 | 2 | 3;
      const nextEncounter = getRandomEncounter(nextStage);

      const updatedRun: Run = {
        ...currentRun,
        phase: 'stage_start',
        currentStage: nextStage,
        currentEncounter: nextEncounter,
        currentHand: [],
        lastCombatResult: undefined,
      };

      const state = { ...gameState, currentRun: updatedRun, updatedAt: new Date().toISOString() };
      await repository.setGameState(state);
      setGameState(state);
      setCurrentRun(updatedRun);
      return updatedRun;
    } catch (e) {
      setError(e as Error);
      throw e;
    }
  }, [currentRun, gameState]);

  /**
   * Complete the run (success or failure) and return to home base
   */
  const completeRun = useCallback(async () => {
    try {
      if (!currentRun || !gameState) throw new Error('No active run');

      const isSuccess = currentRun.phase === 'run_complete';
      const completedRun: Run = {
        ...currentRun,
        status: isSuccess ? 'completed' : 'failed',
        completedAt: new Date().toISOString(),
      };

      // Mark played cards as exhausted in the main deck
      const updatedDeck = gameState.deck.map(card => {
        const wasPlayed = currentRun.deck.some(d => d.id === card.id);
        if (wasPlayed) {
          return {
            ...card,
            exhausted: true,
            recoveryTime: card.type === 'survivor' ? 1 : card.itemType === 'consumable' ? 0 : 1,
          };
        }
        return card;
      });

      const state: GameState = {
        ...gameState,
        deck: updatedDeck,
        homeBase: {
          ...gameState.homeBase,
          survivors: updatedDeck.filter(c => c.type === 'survivor'),
          items: updatedDeck.filter(c => c.type === 'item'),
          completedRuns: [...gameState.homeBase.completedRuns, completedRun],
        },
        currentRun: undefined,
        updatedAt: new Date().toISOString(),
      };

      await repository.setGameState(state);
      setGameState(state);
      setCurrentRun(null);
      return completedRun;
    } catch (e) {
      setError(e as Error);
      throw e;
    }
  }, [currentRun, gameState]);

  /**
   * Advance recovery timers by 1 day
   */
  const advanceDay = useCallback(async () => {
    try {
      await repository.advanceRecovery(1);
      await refreshGameState();
    } catch (e) {
      setError(e as Error);
      throw e;
    }
  }, [refreshGameState]);

  /**
   * Reset game state to defaults (new game)
   */
  const resetGame = useCallback(async () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('survivor-deckbuilder-state');
      }
      await refreshGameState();
    } catch (e) {
      setError(e as Error);
      throw e;
    }
  }, [refreshGameState]);

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

    // Run lifecycle
    startRun,
    enterCombat,
    playCards,
    continueAfterCombat,
    advanceToNextStage,
    completeRun,

    // Recovery management
    advanceDay,

    // Utilities
    refreshGameState,
    resetGame,
    validateDeck,
  };
}
