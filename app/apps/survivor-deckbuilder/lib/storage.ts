import { GameState, Run, CardInstance, DeckBuilderRepository } from './types';
import { STARTER_CARDS } from './cards';

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
    const run: Run = {
      runId,
      status: 'in_progress',
      createdAt: new Date().toISOString(),
      deck,
      currentHand: [],
      currentStage: 1,
      totalStages: 5,
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

      // Mark played cards as exhausted
      state.currentRun.deck.forEach((card) => {
        const stateCard = state.deck.find((c) => c.id === card.id);
        if (stateCard) {
          stateCard.exhausted = true;
          stateCard.recoveryTime =
            card.type === 'survivor'
              ? 1
              : card.itemType === 'consumable'
                ? 0
                : 1;
        }
      });

      // Add to completed runs
      state.completedRuns.push(state.currentRun);
      state.currentRun = undefined;

      await this.setGameState(state);
      return state.completedRuns[state.completedRuns.length - 1];
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
    }));

    return {
      userId: 'local-user',
      deck,
      homeBase: {
        survivors: deck.filter((c) => c.type === 'survivor'),
        items: deck.filter((c) => c.type === 'item'),
        inventory: [],
        completedRuns: [],
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
}

export const repository = new LocalStorageRepository();
