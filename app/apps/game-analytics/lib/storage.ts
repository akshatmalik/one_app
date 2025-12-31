'use client';

import { v4 as uuidv4 } from 'uuid';
import { Game, GameRepository } from './types';
import { getFirebaseDb, isFirebaseConfigured } from '@/lib/firebase';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
} from 'firebase/firestore';

const STORAGE_KEY = 'game-analytics-games';
const COLLECTION_NAME = 'games';

// Firebase Repository - filters by userId
export class FirebaseGameRepository implements GameRepository {
  private userId: string = '';

  private get db() {
    return getFirebaseDb();
  }

  private get gamesCollection() {
    return collection(this.db, COLLECTION_NAME);
  }

  setUserId(userId: string): void {
    this.userId = userId;
  }

  async getAll(): Promise<Game[]> {
    if (!this.userId) return [];
    const q = query(
      this.gamesCollection,
      where('userId', '==', this.userId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as Game);
  }

  async getById(id: string): Promise<Game | null> {
    const docRef = doc(this.db, COLLECTION_NAME, id);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) return null;
    const game = snapshot.data() as Game;
    return game.userId === this.userId ? game : null;
  }

  async create(gameData: Omit<Game, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<Game> {
    if (!this.userId) throw new Error('Not authenticated');
    const now = new Date().toISOString();
    const game: Game = {
      ...gameData,
      id: uuidv4(),
      userId: this.userId,
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(doc(this.db, COLLECTION_NAME, game.id), game);
    return game;
  }

  async update(id: string, updates: Partial<Game>): Promise<Game> {
    const docRef = doc(this.db, COLLECTION_NAME, id);
    const updateData = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await updateDoc(docRef, updateData);

    const updated = await getDoc(docRef);
    return updated.data() as Game;
  }

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(this.db, COLLECTION_NAME, id));
  }
}

// LocalStorage Repository - for local mode (no auth needed)
export class LocalStorageGameRepository implements GameRepository {
  private userId: string = 'local-user';

  setUserId(userId: string): void {
    this.userId = userId || 'local-user';
  }

  private getStorageKey(): string {
    return `${STORAGE_KEY}-${this.userId}`;
  }

  async getAll(): Promise<Game[]> {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(this.getStorageKey());
    return data ? JSON.parse(data) : [];
  }

  async getById(id: string): Promise<Game | null> {
    const games = await this.getAll();
    return games.find(g => g.id === id) || null;
  }

  async create(gameData: Omit<Game, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<Game> {
    const game: Game = {
      ...gameData,
      id: uuidv4(),
      userId: this.userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const games = await this.getAll();
    games.push(game);
    this.save(games);
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

    this.save(games);
    return games[index];
  }

  async delete(id: string): Promise<void> {
    const games = await this.getAll();
    const filtered = games.filter(g => g.id !== id);
    this.save(filtered);
  }

  private save(games: Game[]): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.getStorageKey(), JSON.stringify(games));
    }
  }
}

// Hybrid Repository - uses Firebase when authenticated, localStorage otherwise
class HybridGameRepository implements GameRepository {
  private firebaseRepo = new FirebaseGameRepository();
  private localRepo = new LocalStorageGameRepository();
  private useFirebase = false;

  setUserId(userId: string): void {
    // Only use Firebase for real user IDs, not 'local-user'
    const isRealUser = !!userId && userId !== 'local-user';
    this.useFirebase = isRealUser && isFirebaseConfigured();
    this.firebaseRepo.setUserId(userId);
    this.localRepo.setUserId(userId || 'local-user');
  }

  private get repo(): GameRepository {
    return this.useFirebase ? this.firebaseRepo : this.localRepo;
  }

  getAll(): Promise<Game[]> {
    return this.repo.getAll();
  }

  getById(id: string): Promise<Game | null> {
    return this.repo.getById(id);
  }

  create(gameData: Omit<Game, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<Game> {
    return this.repo.create(gameData);
  }

  update(id: string, updates: Partial<Game>): Promise<Game> {
    return this.repo.update(id, updates);
  }

  delete(id: string): Promise<void> {
    return this.repo.delete(id);
  }
}

// Export singleton
export const gameRepository: GameRepository = new HybridGameRepository();
