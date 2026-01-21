import { v4 as uuidv4 } from 'uuid';
import { GameState, GameRepository } from './types';
import {
  GAME_CONFIG,
  STORAGE_KEY,
  STARTING_LOCATION,
  OPENING_NARRATION,
  STORY_ARC_1,
} from './constants';

class LocalStorageGameRepository implements GameRepository {
  // Get current game for user (newest)
  async getCurrentGame(userId: string): Promise<GameState | null> {
    if (typeof window === 'undefined') return null;

    const key = `${STORAGE_KEY}-current-${userId}`;
    const data = localStorage.getItem(key);
    if (!data) return null;

    return JSON.parse(data);
  }

  async getGame(id: string): Promise<GameState | null> {
    if (typeof window === 'undefined') return null;

    const data = localStorage.getItem(`${STORAGE_KEY}-${id}`);
    if (!data) return null;

    return JSON.parse(data);
  }

  async createGame(userId: string): Promise<GameState> {
    const gameId = uuidv4();
    const now = new Date().toISOString();

    const initialGame: GameState = {
      id: gameId,
      userId,

      // Player status
      health: GAME_CONFIG.STARTING_HEALTH,
      hunger: GAME_CONFIG.STARTING_HUNGER,
      energy: GAME_CONFIG.STARTING_ENERGY,

      // Location
      currentLocation: STARTING_LOCATION.name,
      visitedLocations: [STARTING_LOCATION.id],
      worldState: {
        locations: {
          [STARTING_LOCATION.id]: STARTING_LOCATION,
        },
        areaType: GAME_CONFIG.STARTING_AREA,
        lootedRooms: {},
        searchedContainers: {},
        metNPCs: {},
      },

      // Inventory
      inventory: [],

      // Story
      storyLog: [
        {
          id: uuidv4(),
          timestamp: now,
          type: 'narration',
          content: OPENING_NARRATION,
        },
        {
          id: uuidv4(),
          timestamp: now,
          type: 'narration',
          content:
            "You're in the living room. The front door is behind you. You can see a kitchen through an open doorway.",
        },
      ],
      currentEncounter: null,

      // Player behavior
      playerBehavior: {
        movementCount: 0,
        isBeingStealthy: false,
        stealthScore: 0,
        hasAnsweredQuestions: false,
        wasHonest: false,
        wasAggressive: false,
        ignoredKnock: false,
        hasWeaponVisible: false,
        madeNoise: false,
        turnsInLocation: 0,
        locationsVisited: [STARTING_LOCATION.id],
        threatenedNPC: false,
        attackedNPC: false,
        killedNPC: false,
        recentActions: [],
      },

      // Story Arc System
      currentArc: {
        arcNumber: 1,
        arcName: STORY_ARC_1.arcName,
        description: STORY_ARC_1.description,
        turnsInArc: 0,
        objectivesCompleted: [],
      },
      turnCount: 0,
      arcProgress: {
        hasMetStranger: false,
        strangerFirstKnockTriggered: false,
        strangerInterrogationComplete: false,
        strangerJudgmentMade: false,
      },

      // Meta
      day: 1,
      timeOfDay: 'morning',
      status: 'active',

      createdAt: now,
      updatedAt: now,
    };

    if (typeof window !== 'undefined') {
      localStorage.setItem(
        `${STORAGE_KEY}-${gameId}`,
        JSON.stringify(initialGame)
      );
      // Also save as current game
      localStorage.setItem(
        `${STORAGE_KEY}-current-${userId}`,
        JSON.stringify(initialGame)
      );
    }

    return initialGame;
  }

  async updateGame(
    id: string,
    updates: Partial<GameState>
  ): Promise<GameState> {
    const current = await this.getGame(id);
    if (!current) {
      throw new Error('Game not found');
    }

    const updated: GameState = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    if (typeof window !== 'undefined') {
      localStorage.setItem(`${STORAGE_KEY}-${id}`, JSON.stringify(updated));
      // Also update current game
      localStorage.setItem(
        `${STORAGE_KEY}-current-${updated.userId}`,
        JSON.stringify(updated)
      );
    }

    return updated;
  }

  async deleteGame(id: string): Promise<void> {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`${STORAGE_KEY}-${id}`);
    }
  }

  async deleteCurrentGame(userId: string): Promise<void> {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`${STORAGE_KEY}-current-${userId}`);
    }
  }
}

export const gameRepository = new LocalStorageGameRepository();
