'use client';

import { useState, useEffect, useCallback } from 'react';
import { GameState, Run, CardInstance, RunPhase, Encounter, CombatResult, StageLoot } from '../lib/types';
import { repository } from '../lib/storage';
import { resolveCombat, isTacticalRetreat, validateDeck } from '../lib/combat-engine';
import { getRandomEncounter } from '../lib/encounters';
import { detectSynergies } from '../lib/synergies';
import { rollStageLoot } from '../lib/loot';

const TOTAL_STAGES = 3;

export function useGame() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [currentRun, setCurrentRun] = useState<Run | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const loadGame = async () => {
      try {
        setLoading(true);
        const state = await repository.getGameState();
        // Migrate old saves that used playedCardsThisRun
        if (state.currentRun && !state.currentRun.consumedCardIds) {
          (state.currentRun as any).consumedCardIds = (state.currentRun as any).playedCardsThisRun ?? [];
          (state.currentRun as any).weaponAmmo = (state.currentRun as any).weaponAmmo ?? {};
          (state.currentRun as any).stagedLoot = (state.currentRun as any).stagedLoot ?? {};
        }
        if (state.homeBase && !state.homeBase.rawMaterials) {
          state.homeBase.rawMaterials = { scrapMetal: 0, wood: 0, cloth: 0, medicalSupplies: 0 };
        }
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

  const startRun = useCallback(async (selectedCards: CardInstance[]) => {
    try {
      if (!gameState) throw new Error('Game state not loaded');

      const validation = validateDeck(selectedCards);
      if (!validation.valid) throw new Error(validation.error);

      const survivors = selectedCards.filter(c => c.type === 'survivor').map(s => ({
        ...s,
        currentHealth: s.maxHealth ?? 100,
      }));

      // Initialize weapon ammo from each weapon's maxAmmo
      const weaponAmmo: Record<string, number> = {};
      selectedCards.forEach(c => {
        if (c.maxAmmo !== undefined) weaponAmmo[c.id] = c.maxAmmo;
      });

      const run: Run = {
        runId: `run_${Date.now()}`,
        status: 'in_progress',
        phase: 'stage_start',
        createdAt: new Date().toISOString(),
        deck: selectedCards,
        currentHand: [],
        consumedCardIds: [],
        weaponAmmo,
        stagedLoot: {},
        currentEncounter: getRandomEncounter(1),
        currentStage: 1,
        totalStages: TOTAL_STAGES,
        stages: [],
        itemsFound: [],
        survivorStats: {},
        activeSurvivors: survivors,
        isBarricaded: gameState.homeBase.isBarricaded ?? false,
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
   * Build the available hand for the current stage.
   *
   * Availability rules:
   *  - Survivors: available if currentHealth > 0 (they fight every stage they're alive)
   *  - Equipment: available every stage, UNLESS weapon ammo has run out
   *  - Consumables / Actions: one-time use — hidden once in consumedCardIds
   */
  const enterCombat = useCallback(async () => {
    try {
      if (!currentRun || !gameState) throw new Error('No active run');

      const available = currentRun.deck.filter(card => {
        if (card.type === 'survivor') {
          // Use activeSurvivors for up-to-date HP
          const live = currentRun.activeSurvivors.find(s => s.id === card.id);
          return (live?.currentHealth ?? card.currentHealth ?? 0) > 0;
        }
        if (card.itemType === 'equipment') {
          // Weapons: available while they still have ammo
          if (card.maxAmmo !== undefined) {
            const ammoLeft = currentRun.weaponAmmo[card.id] ?? 0;
            return ammoLeft > 0;
          }
          // Other gear (Vest, Med Kit, Goggles): always available
          return true;
        }
        // Consumables and actions: once consumed, gone
        return !currentRun.consumedCardIds.includes(card.id);
      });

      // Merge live HP from activeSurvivors into the hand
      const handWithLiveHP = available.map(card => {
        if (card.type === 'survivor') {
          const live = currentRun.activeSurvivors.find(s => s.id === card.id);
          return live ?? card;
        }
        // Attach current ammo to weapon cards so the UI can display it
        if (card.maxAmmo !== undefined) {
          return { ...card, ammo: currentRun.weaponAmmo[card.id] ?? 0 };
        }
        return card;
      });

      const updatedRun: Run = {
        ...currentRun,
        phase: 'card_selection',
        currentHand: handWithLiveHP,
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
   * Play selected cards and resolve combat.
   * After playing:
   *  - Consumables/actions → added to consumedCardIds (gone)
   *  - Weapons → ammo decremented; if 0 → added to consumedCardIds
   *  - Survivors → never consumed, just carry HP state
   */
  const playCards = useCallback(async (selectedCards: CardInstance[]) => {
    try {
      if (!currentRun || !gameState) throw new Error('No active run');
      if (!currentRun.currentEncounter) throw new Error('No encounter');

      // Track what gets consumed this play
      const newConsumedIds = [...currentRun.consumedCardIds];
      const newWeaponAmmo = { ...currentRun.weaponAmmo };

      // Pre-compute total enemy HP once for ammo calculations
      const totalEnemyHP = (currentRun.currentEncounter?.enemies ?? []).reduce((sum, e) => sum + e.health, 0);

      selectedCards.forEach(card => {
        if (card.type === 'survivor') return; // survivors are never consumed
        if (card.itemType === 'equipment' && card.maxAmmo !== undefined) {
          // Weapon: use ammo based on total enemy HP
          const weaponDamage = Math.max(1, card.bonusAttributes?.combat ?? 1);
          const shotsNeeded = Math.max(1, Math.ceil(totalEnemyHP / weaponDamage));
          const currentAmmo = newWeaponAmmo[card.id] ?? card.maxAmmo ?? 0;
          newWeaponAmmo[card.id] = Math.max(0, currentAmmo - shotsNeeded);
          if (newWeaponAmmo[card.id] === 0) {
            newConsumedIds.push(card.id); // out of ammo — treat as consumed
          }
        } else if (card.itemType === 'consumable' || card.type === 'action' || card.itemType === 'action') {
          if (!newConsumedIds.includes(card.id)) {
            newConsumedIds.push(card.id);
          }
        }
      });

      // Check for tactical retreat
      if (isTacticalRetreat(selectedCards)) {
        const updatedRun: Run = {
          ...currentRun,
          phase: 'stage_complete',
          consumedCardIds: newConsumedIds,
          weaponAmmo: newWeaponAmmo,
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

      // Apply barricade bonus to survivors in stage 3
      const activeSurvivorsForCombat = currentRun.isBarricaded
        ? currentRun.activeSurvivors.map(s => ({
            ...s,
            attributes: {
              combat: s.attributes?.combat ?? 0,
              defense: (s.attributes?.defense ?? 0) + 30,
              healing: s.attributes?.healing ?? 0,
              speed: s.attributes?.speed ?? 0,
              perception: s.attributes?.perception ?? 0,
            },
          }))
        : currentRun.activeSurvivors;

      const result = resolveCombat(
        selectedCards,
        currentRun.currentEncounter,
        activeSurvivorsForCombat
      );

      const updatedRun: Run = {
        ...currentRun,
        phase: 'combat_resolution',
        consumedCardIds: newConsumedIds,
        weaponAmmo: newWeaponAmmo,
        lastCombatResult: result,
        activeSurvivors: result.survivorsAfter,
        currentHand: selectedCards,
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
   * After viewing combat resolution, move to next phase.
   * On victory: roll stage loot and store it.
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

      // Roll loot on victory
      const newStagedLoot = { ...currentRun.stagedLoot };
      if (isVictory && !newStagedLoot[currentRun.currentStage]) {
        newStagedLoot[currentRun.currentStage] = rollStageLoot(currentRun.currentStage as 1 | 2 | 3);
      }

      const updatedRun: Run = {
        ...currentRun,
        phase: nextPhase,
        stagedLoot: newStagedLoot,
        stages: [
          ...currentRun.stages,
          {
            stageNum: currentRun.currentStage,
            encounter: currentRun.currentEncounter,
            cardsPlayed: currentRun.currentHand,
            result: isVictory ? 'completed' : isLoss ? 'failed' : 'completed',
            itemsFound: isVictory ? newStagedLoot[currentRun.currentStage]?.items : undefined,
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
   * Complete the run and return to home base.
   * Loot gets applied to the deck / raw materials in completeRun (storage).
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

      // Apply loot to deck and raw materials
      const consumedIds = new Set(currentRun.consumedCardIds);

      const updatedDeck = (gameState.deck as CardInstance[]).filter((card: CardInstance) => {
        if (consumedIds.has(card.id)) return false;
        return true;
      }).map((card: CardInstance) => {
        const wasInRun = (currentRun.deck as CardInstance[]).some((d: CardInstance) => d.id === card.id);
        if (wasInRun) {
          return {
            ...card,
            exhausted: true,
            recoveryTime: 1,
            ammo: card.maxAmmo ?? card.ammo,
          };
        }
        return card;
      });

      // Add loot cards (new additions to collection)
      const allLoot = Object.values(currentRun.stagedLoot) as StageLoot[];
      const lootCards = allLoot.flatMap((l: StageLoot) => l.items.map((item: CardInstance) => ({
        ...item,
        exhausted: false,
        recoveryTime: 0,
      })));

      const finalDeck = [...updatedDeck, ...lootCards];

      // Accumulate raw materials
      const existingMats = gameState.homeBase.rawMaterials ?? { scrapMetal: 0, wood: 0, cloth: 0, medicalSupplies: 0 };
      const newMats = { ...existingMats };
      allLoot.forEach((loot: StageLoot) => {
        newMats.scrapMetal += loot.materials.scrapMetal;
        newMats.wood += loot.materials.wood;
        newMats.cloth += loot.materials.cloth;
        newMats.medicalSupplies += loot.materials.medicalSupplies;
      });

      const state: GameState = {
        ...gameState,
        deck: finalDeck,
        homeBase: {
          ...gameState.homeBase,
          survivors: finalDeck.filter(c => c.type === 'survivor'),
          items: finalDeck.filter(c => c.type === 'item'),
          rawMaterials: newMats,
          isBarricaded: false,
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

  const retreatFromExpedition = useCallback(async () => {
    try {
      if (!currentRun || !gameState) throw new Error('No active run');

      const updatedRun: Run = {
        ...currentRun,
        phase: 'run_failed',
        isRetreat: true,
        stages: [
          ...currentRun.stages,
          {
            stageNum: currentRun.currentStage,
            encounter: currentRun.currentEncounter!,
            result: 'skipped',
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

  const buildBarricade = useCallback(async () => {
    try {
      if (!currentRun || !gameState) throw new Error('No active run');

      const updatedRun: Run = { ...currentRun, isBarricaded: true };

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

  const buildHomeBarricade = useCallback(async () => {
    try {
      if (!gameState) throw new Error('No game state');
      const mats = gameState.homeBase.rawMaterials;
      if (mats.wood < 3 || mats.scrapMetal < 2) throw new Error('Not enough materials');
      const updatedMats = {
        ...mats,
        wood: mats.wood - 3,
        scrapMetal: mats.scrapMetal - 2,
      };
      const state: GameState = {
        ...gameState,
        homeBase: { ...gameState.homeBase, rawMaterials: updatedMats, isBarricaded: true },
        updatedAt: new Date().toISOString(),
      };
      await repository.setGameState(state);
      setGameState(state);
    } catch (e) {
      setError(e as Error);
      throw e;
    }
  }, [gameState]);

  const advanceDay = useCallback(async () => {
    try {
      await repository.advanceRecovery(1);
      await refreshGameState();
    } catch (e) {
      setError(e as Error);
      throw e;
    }
  }, [refreshGameState]);

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

    // Tactical
    retreatFromExpedition,
    buildBarricade,
    buildHomeBarricade,

    // Utilities
    refreshGameState,
    resetGame,
    validateDeck,
  };
}
