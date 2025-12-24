'use client';

import { v4 as uuidv4 } from 'uuid';
import { Game, GameRepository } from './types';

const STORAGE_KEY = 'game-analytics-games';

export class LocalStorageGameRepository implements GameRepository {
  async getAll(): Promise<Game[]> {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  }

  async getById(id: string): Promise<Game | null> {
    const games = await this.getAll();
    return games.find(g => g.id === id) || null;
  }

  async create(gameData: Omit<Game, 'id' | 'createdAt' | 'updatedAt'>): Promise<Game> {
    const game: Game = {
      ...gameData,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const games = await this.getAll();
    games.push(game);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(games));
    return game;
  }

  async update(id: string, updates: Partial<Game>): Promise<Game> {
    const games = await this.getAll();
    const index = games.findIndex(g => g.id === id);
    if (index === -1) throw new Error('Game not found');

    games[index] = {
      ...games[index],
      ...updates,
      id,
      createdAt: games[index].createdAt,
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(games));
    return games[index];
  }

  async delete(id: string): Promise<void> {
    const games = await this.getAll();
    const filtered = games.filter(g => g.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  }
}

export const gameRepository = new LocalStorageGameRepository();
