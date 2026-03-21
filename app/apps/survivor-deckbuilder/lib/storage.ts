import { GameState, Run, CardInstance, DeckBuilderRepository } from './types';
import { STARTER_CARDS } from './cards';
import { EMPTY_MATERIALS } from './loot';

const STORAGE_KEY = 'survivor-deckbuilder-state';

export class LocalStorageRepository implements DeckBuilderRepository {
  async getGameState(): Promise<GameState> {
    if (typeof window === 'undefined') {
      return this.getDefaultState();
    }

    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.error('Failed to parse game state:', e);
    }

    return this.getDefaultState();
  }

  async setGameState(state: GameState): Promise<void> {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  async getAllCards(): Promise<CardInstance[]> {
    const state = await this.getGameState();
    return state.deck;
  }

  async getCardById(id: string): Promise<CardInstance | null> {
    const state = await this.getGameState();
    return state.deck.find((card) => card.id === id) || null;
  }

  async createRun(deck: CardInstance[]): Promise<Run> {
    const runId = `run_${Date.now()}`;
    // Initialize ammo for weapons in the deck
    const weaponAmmo: Record<string, number> = {};
    deck.forEach(c => {
      if (c.maxAmmo !== undefined) weaponAmmo[c.id] = c.maxAmmo;
    });
    const run: Run = {
      runId,
      status: 'in_progress',
      phase: 'preparation',
      createdAt: new Date().toISOString(),
      deck,
      currentHand: [],
      consumedCardIds: [],
      weaponAmmo,
      stagedLoot: {},
      currentStage: 1,
      totalStages: 3,
      stages: [],
      itemsFound: [],
      survivorStats: {},
      activeSurvivors: deck.filter((card) => card.type === 'survivor'),
    };

    const state = await this.getGameState();
    state.currentRun = run;
    await this.setGameState(state);

    return run;
  }

  async updateRun(runId: string, updates: Partial<Run>): Promise<Run> {
    const state = await this.getGameState();
    if (state.currentRun && state.currentRun.runId === runId) {
      state.currentRun = { ...state.currentRun, ...updates };
      await this.setGameState(state);
      return state.currentRun;
    }
    throw new Error(`Run ${runId} not found`);
  }

  async completeRun(runId: string): Promise<Run> {
    const state = await this.getGameState();
    if (state.currentRun && state.currentRun.runId === runId) {
      state.currentRun.status = 'completed';
      state.currentRun.completedAt = new Date().toISOString();

      // Mark cards in the expedition deck as exhausted (they need recovery)
      // Consumables that were actually consumed get removed entirely
      const consumedIds = new Set(state.currentRun.consumedCardIds);
      state.currentRun.deck.forEach((card) => {
        // Consumables/actions that were used are gone — remove from deck
        if (consumedIds.has(card.id)) {
          const idx = state.deck.findIndex(c => c.id === card.id);
          if (idx !== -1) state.deck.splice(idx, 1);
          return;
        }
        // Everything else just needs recovery time
        const stateCard = state.deck.find((c) => c.id === card.id);
        if (stateCard) {
          stateCard.exhausted = true;
          stateCard.recoveryTime = card.type === 'survivor' ? 1 : 1;
          // Restore weapon ammo for next run
          if (stateCard.maxAmmo !== undefined) {
            stateCard.ammo = stateCard.maxAmmo;
          }
        }
      });

      // Add loot items to the deck
      const allLoot = Object.values(state.currentRun.stagedLoot);
      allLoot.forEach(loot => {
        loot.items.forEach(item => {
          state.deck.push({ ...item, exhausted: false, recoveryTime: 0 });
        });
      });

      // Accumulate raw materials
      const existingMaterials = state.homeBase.rawMaterials ?? { scrapMetal: 0, wood: 0, cloth: 0, medicalSupplies: 0 };
      const newMaterials = { ...existingMaterials };
      allLoot.forEach(loot => {
        newMaterials.scrapMetal += loot.materials.scrapMetal;
        newMaterials.wood += loot.materials.wood;
        newMaterials.cloth += loot.materials.cloth;
        newMaterials.medicalSupplies += loot.materials.medicalSupplies;
      });

      // Add to completed runs
      state.homeBase.completedRuns.push(state.currentRun);
      state.homeBase.rawMaterials = newMaterials;
      state.homeBase.survivors = state.deck.filter(c => c.type === 'survivor');
      state.homeBase.items = state.deck.filter(c => c.type === 'item');
      state.currentRun = undefined;

      await this.setGameState(state);
      return state.homeBase.completedRuns[state.homeBase.completedRuns.length - 1];
    }
    throw new Error(`Run ${runId} not found`);
  }

  async setRecoveryTime(cardId: string, days: number): Promise<void> {
    const state = await this.getGameState();
    const card = state.deck.find((c) => c.id === cardId);
    if (card) {
      card.recoveryTime = days;
      await this.setGameState(state);
    }
  }

  async advanceRecovery(days: number): Promise<void> {
    const state = await this.getGameState();
    state.deck.forEach((card) => {
      if (card.exhausted && card.recoveryTime > 0) {
        card.recoveryTime -= days;
        if (card.recoveryTime <= 0) {
          card.exhausted = false;
          card.recoveryTime = 0;
        }
      }
    });
    await this.setGameState(state);
  }

  private getDefaultState(): GameState {
    const deck: CardInstance[] = STARTER_CARDS.map((card) => ({
      ...card,
      currentHealth: card.maxHealth || 100,
      status: 'healthy' as const,
      exhausted: false,
      recoveryTime: 0,
      ammo: card.maxAmmo,
    }));

    return {
      userId: 'local-user',
      deck,
      homeBase: {
        survivors: deck.filter((c) => c.type === 'survivor'),
        items: deck.filter((c) => c.type === 'item'),
        inventory: [],
        completedRuns: [],
        rawMaterials: { scrapMetal: 0, wood: 0, cloth: 0, medicalSupplies: 0, food: 10 },
        homeBarricadeLevel: 0,
        day: 1,
        food: 10,
        baseHP: 100,
        morale: 70,
        productionChains: [],
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
}

export const repository = new LocalStorageRepository();
