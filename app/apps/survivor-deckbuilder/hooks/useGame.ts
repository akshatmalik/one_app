'use client';

import { useState, useEffect, useCallback } from 'react';
import { GameState, Run, CardInstance, RunPhase, StageLoot, SurvivorAssignment, ProductionChain } from '../lib/types';
import { repository } from '../lib/storage';
import { resolveCombat, isTacticalRetreat, validateDeck } from '../lib/combat-engine';
import { getRandomEncounter } from '../lib/encounters';
import { rollStageLoot } from '../lib/loot';
import { STARTER_CARDS } from '../lib/cards';

const TOTAL_STAGES = 3;

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

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
          state.homeBase.rawMaterials = { scrapMetal: 0, wood: 0, cloth: 0, medicalSupplies: 0, food: 5 };
        }
        if (state.homeBase && state.homeBase.rawMaterials.food === undefined) {
          state.homeBase.rawMaterials.food = 5;
        }
        if (state.homeBase && state.homeBase.homeBarricadeLevel === undefined) {
          state.homeBase.homeBarricadeLevel = 0;
        }
        if (state.homeBase && state.homeBase.day === undefined) {
          state.homeBase.day = 1;
        }
        if (state.homeBase && state.homeBase.food === undefined) {
          state.homeBase.food = state.homeBase.rawMaterials.food ?? 5;
        }
        if (state.homeBase && state.homeBase.baseHP === undefined) {
          state.homeBase.baseHP = 100;
        }
        if (state.homeBase && state.homeBase.morale === undefined) {
          state.homeBase.morale = 70;
        }
        if (state.homeBase && !state.homeBase.productionChains) {
          state.homeBase.productionChains = [];
        }
        // Migrate survivor conditions/assignments
        state.deck = state.deck.map(c => ({
          ...c,
          condition: c.condition ?? 'healthy',
          hungerDays: c.hungerDays ?? 0,
          assignment: c.assignment ?? null,
        }));
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

      const homeBarricadeLevel = gameState.homeBase.homeBarricadeLevel ?? 0;

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
        // Apply barricade built at home (persists for this full run)
        isBarricaded: homeBarricadeLevel > 0,
      };

      const state = { ...gameState };
      // Consume the home barricade — it was used for this run
      if (homeBarricadeLevel > 0) {
        state.homeBase = { ...state.homeBase, homeBarricadeLevel: 0 };
      }
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

      selectedCards.forEach(card => {
        if (card.type === 'survivor') return; // survivors are never consumed
        if (card.itemType === 'equipment' && card.maxAmmo !== undefined) {
          // Weapon: use one shot
          const ammo = (newWeaponAmmo[card.id] ?? card.maxAmmo) - 1;
          newWeaponAmmo[card.id] = Math.max(0, ammo);
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
          homeBarricadeLevel: gameState.homeBase.homeBarricadeLevel ?? 0,
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

  // Cost: 2 wood + 1 scrap metal → barricades the home base (+30 defense for next run)
  const BARRICADE_COST = { wood: 2, scrapMetal: 1 };

  const canBuildHomeBarricade = useCallback((): boolean => {
    if (!gameState) return false;
    const mats = gameState.homeBase.rawMaterials;
    return (
      (gameState.homeBase.homeBarricadeLevel ?? 0) === 0 &&
      mats.wood >= BARRICADE_COST.wood &&
      mats.scrapMetal >= BARRICADE_COST.scrapMetal
    );
  }, [gameState]);

  const buildHomeBarricade = useCallback(async () => {
    try {
      if (!gameState) throw new Error('Game state not loaded');
      const mats = gameState.homeBase.rawMaterials;
      if (mats.wood < BARRICADE_COST.wood || mats.scrapMetal < BARRICADE_COST.scrapMetal) {
        throw new Error('Not enough materials');
      }

      const state: GameState = {
        ...gameState,
        homeBase: {
          ...gameState.homeBase,
          homeBarricadeLevel: 1,
          rawMaterials: {
            ...mats,
            wood: mats.wood - BARRICADE_COST.wood,
            scrapMetal: mats.scrapMetal - BARRICADE_COST.scrapMetal,
          },
        },
        updatedAt: new Date().toISOString(),
      };
      await repository.setGameState(state);
      setGameState(state);
    } catch (e) {
      setError(e as Error);
      throw e;
    }
  }, [gameState]);

  // ===== SURVIVOR ASSIGNMENTS =====

  const assignSurvivor = useCallback(async (survivorId: string, assignment: SurvivorAssignment) => {
    try {
      if (!gameState) throw new Error('Game state not loaded');

      const updatedDeck = gameState.deck.map(c =>
        c.id === survivorId ? { ...c, assignment } : c
      );

      const state: GameState = {
        ...gameState,
        deck: updatedDeck,
        homeBase: {
          ...gameState.homeBase,
          survivors: updatedDeck.filter(c => c.type === 'survivor'),
        },
        updatedAt: new Date().toISOString(),
      };
      await repository.setGameState(state);
      setGameState(state);
    } catch (e) {
      setError(e as Error);
      throw e;
    }
  }, [gameState]);

  // ===== PRODUCTION CHAINS =====

  const startGarden = useCallback(async (survivorId: string, seedCardId: string) => {
    try {
      if (!gameState) throw new Error('Game state not loaded');

      const seedCard = gameState.deck.find(c => c.id === seedCardId);
      if (!seedCard) throw new Error('Seed card not found');

      const isHerb = seedCard.id.includes('herb');
      const outputCardIds = isHerb
        ? ['card_food_001', 'card_food_001', 'card_antibiotics_001']
        : ['card_food_001', 'card_food_001', 'card_ration_001'];

      const chain: ProductionChain = {
        id: `garden_${Date.now()}`,
        type: 'garden',
        survivorId,
        seedCardId,
        startDay: gameState.homeBase.day,
        daysRequired: 4,
        outputCardIds,
        completed: false,
      };

      // Assign survivor + remove seed from deck
      const updatedDeck = gameState.deck
        .filter(c => c.id !== seedCardId)
        .map(c => c.id === survivorId ? { ...c, assignment: 'garden' as SurvivorAssignment, assignedToProduction: chain.id } : c);

      const state: GameState = {
        ...gameState,
        deck: updatedDeck,
        homeBase: {
          ...gameState.homeBase,
          survivors: updatedDeck.filter(c => c.type === 'survivor'),
          productionChains: [...gameState.homeBase.productionChains, chain],
        },
        updatedAt: new Date().toISOString(),
      };
      await repository.setGameState(state);
      setGameState(state);
    } catch (e) {
      setError(e as Error);
      throw e;
    }
  }, [gameState]);

  // ===== DAILY CYCLE =====

  const endDay = useCallback(async () => {
    try {
      if (!gameState) throw new Error('Game state not loaded');

      const hb = gameState.homeBase;
      const survivors = gameState.deck.filter(c => c.type === 'survivor');
      const survivorCount = survivors.filter(s => !s.assignment || s.assignment !== 'guard' || true).length;

      // 1. Consume food (1 per survivor)
      let foodLeft = hb.food - survivorCount;
      const shortfall = Math.max(0, -foodLeft);
      foodLeft = Math.max(0, foodLeft);

      // 2. Apply hunger cascade to survivors
      let updatedDeck = gameState.deck.map(card => {
        if (card.type !== 'survivor') return card;

        const wasFed = shortfall === 0; // simplified: everyone equally fed/starved for now
        if (wasFed) {
          // Reset hunger if fed
          return { ...card, condition: 'healthy' as const, hungerDays: 0 };
        }

        const hungerDays = (card.hungerDays ?? 0) + 1;
        let newCondition: 'healthy' | 'hungry' | 'starving' = 'hungry';
        let hpPenalty = 0;

        if (hungerDays >= 2) {
          newCondition = 'starving';
          hpPenalty = 10; // lose 10 HP/day while starving
        }

        const newHP = Math.max(1, (card.currentHealth ?? 100) - hpPenalty);
        return { ...card, condition: newCondition, hungerDays, currentHealth: newHP };
      });

      // 3. Process guard assignment — simplified raid defense
      const guards = updatedDeck.filter(c => c.type === 'survivor' && c.assignment === 'guard');
      const raidChance = Math.min(0.8, 0.20 + (hb.day - 1) * 0.05);
      const raidHappens = Math.random() < raidChance;
      let newBaseHP = hb.baseHP;
      let raidResult: 'none' | 'defended' | 'damaged' = 'none';

      if (raidHappens) {
        if (guards.length === 0) {
          newBaseHP = Math.max(0, hb.baseHP - 30);
          raidResult = 'damaged';
        } else {
          // Guards defend: each guard has 70% chance of stopping it
          const defended = guards.some(() => Math.random() < 0.7);
          if (defended) {
            raidResult = 'defended';
          } else {
            newBaseHP = Math.max(0, hb.baseHP - 15);
            raidResult = 'damaged';
          }
        }
      }

      // 4. Check production chains completion
      const currentDay = hb.day + 1;
      let newProductionChains = [...hb.productionChains];
      const lootCards: CardInstance[] = [];

      newProductionChains = newProductionChains.map(chain => {
        if (chain.completed) return chain;
        const elapsed = currentDay - chain.startDay;
        if (elapsed >= chain.daysRequired) {
          // Complete — generate output cards
          chain.outputCardIds.forEach(cardId => {
            const template = STARTER_CARDS.find(c => c.id === cardId);
            if (template) {
              lootCards.push({
                ...template,
                id: `prod_${cardId}_${Date.now()}_${Math.floor(Math.random() * 9999)}`,
                currentHealth: template.maxHealth ?? 100,
                status: 'healthy',
                exhausted: false,
                recoveryTime: 0,
                ammo: template.maxAmmo,
              });
            }
          });

          // Free the survivor
          updatedDeck = updatedDeck.map(c =>
            c.id === chain.survivorId ? { ...c, assignment: null as SurvivorAssignment, assignedToProduction: undefined } : c
          );

          return { ...chain, completed: true };
        }
        return chain;
      });

      // 5. Apply scavenge output for scouts assigned to scavenge
      const scouts = updatedDeck.filter(c => c.type === 'survivor' && c.assignment === 'scavenge');
      const scavengeFood = scouts.length * randInt(1, 2);
      const scavengeMats = {
        scrapMetal: scouts.length * randInt(0, 1),
        wood: scouts.length * randInt(0, 1),
        cloth: 0,
        medicalSupplies: 0,
        food: scavengeFood,
      };

      // 6. Infirmary speed-up — healer reduces all recovery times by 1 extra
      const hasInfirmaryHealer = updatedDeck.some(c => c.type === 'survivor' && c.assignment === 'infirmary');

      // 7. Morale update
      let newMorale = hb.morale;
      if (shortfall > 0) newMorale = Math.max(0, newMorale - 10);
      if (raidResult === 'damaged') newMorale = Math.max(0, newMorale - 5);
      if (raidResult === 'defended') newMorale = Math.min(100, newMorale + 5);
      if (shortfall === 0) newMorale = Math.min(100, newMorale + 2);

      // 8. Update raw materials
      const newMats = {
        ...hb.rawMaterials,
        scrapMetal: hb.rawMaterials.scrapMetal + scavengeMats.scrapMetal,
        wood: hb.rawMaterials.wood + scavengeMats.wood,
        food: foodLeft,
      };

      // 9. Advance card recovery + infirmary bonus
      const recoveryAdvance = hasInfirmaryHealer ? 2 : 1;
      updatedDeck = updatedDeck.map(c => {
        if (!c.exhausted) return c;
        const newRecovery = Math.max(0, c.recoveryTime - recoveryAdvance);
        return { ...c, recoveryTime: newRecovery, exhausted: newRecovery > 0 };
      });

      // 10. Add production loot to deck
      const finalDeck = [...updatedDeck, ...lootCards];

      const state: GameState = {
        ...gameState,
        deck: finalDeck,
        homeBase: {
          ...hb,
          survivors: finalDeck.filter(c => c.type === 'survivor'),
          items: finalDeck.filter(c => c.type === 'item'),
          day: currentDay,
          food: foodLeft,
          baseHP: newBaseHP,
          morale: newMorale,
          rawMaterials: newMats,
          productionChains: newProductionChains,
        },
        updatedAt: new Date().toISOString(),
      };

      // Store raid result in a temp field so UI can show the night report
      (state as any)._lastNightReport = {
        day: hb.day,
        foodConsumed: survivorCount,
        shortfall,
        raidHappened: raidHappens,
        raidResult,
        productionsCompleted: lootCards.length,
        scavengeGain: scavengeFood,
      };

      await repository.setGameState(state);
      setGameState(state);
      return (state as any)._lastNightReport;
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

    // Home building
    buildHomeBarricade,
    canBuildHomeBarricade,

    // Daily cycle
    endDay,

    // Assignments
    assignSurvivor,

    // Production
    startGarden,

    // Utilities
    refreshGameState,
    resetGame,
    validateDeck,
  };
}
