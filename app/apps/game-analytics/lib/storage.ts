'use client';

import { v4 as uuidv4 } from 'uuid';
import { Game, GameRepository } from './types';
import { getFirebaseDb } from '@/lib/firebase';
import { HybridRepository } from './hybrid-repository';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  deleteField,
  writeBatch,
  query,
  where,
  orderBy,
} from 'firebase/firestore';

const STORAGE_KEY = 'game-analytics-games';
const COLLECTION_NAME = 'games';

// Helper to recursively clean undefined values from objects/arrays (Firestore doesn't accept undefined)
function cleanUndefinedValues<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => cleanUndefinedValues(item)) as T;
  }
  if (typeof obj === 'object') {
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = cleanUndefinedValues(value);
      }
    }
    return cleaned as T;
  }
  return obj;
}

// Prepare a Firestore update payload. An explicit `undefined` on a field means
// "clear this field" → translate to Firestore's deleteField() sentinel (plain
// stripping would leave the old value in the document, which is exactly the bug
// that made "remove from queue" a no-op for logged-in users). Defined values
// still get their nested undefineds cleaned, since Firestore rejects those.
function prepareFirestoreUpdate(updates: Record<string, unknown>): Record<string, unknown> {
  const prepared: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(updates)) {
    prepared[key] = value === undefined ? deleteField() : cleanUndefinedValues(value);
  }
  return prepared;
}

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

    // Clean undefined values recursively - Firestore doesn't accept them
    const cleanData = cleanUndefinedValues(gameData);

    const game: Game = {
      ...cleanData,
      id: uuidv4(),
      userId: this.userId,
      createdAt: now,
      updatedAt: now,
    } as Game;

    await setDoc(doc(this.db, COLLECTION_NAME, game.id), game);
    return game;
  }

  async update(id: string, updates: Partial<Game>): Promise<Game> {
    const docRef = doc(this.db, COLLECTION_NAME, id);

    // undefined fields → deleteField(); defined fields get nested undefineds cleaned
    const preparedUpdates = prepareFirestoreUpdate(updates as Record<string, unknown>);
    preparedUpdates.updatedAt = new Date().toISOString();

    await updateDoc(docRef, preparedUpdates);

    const updated = await getDoc(docRef);
    return updated.data() as Game;
  }

  async updateMany(updates: Array<{ id: string; changes: Partial<Game> }>): Promise<void> {
    if (updates.length === 0) return;
    const batch = writeBatch(this.db);
    const now = new Date().toISOString();
    for (const { id, changes } of updates) {
      const ref = doc(this.db, COLLECTION_NAME, id);
      const prepared = prepareFirestoreUpdate(changes as Record<string, unknown>);
      prepared.updatedAt = now;
      batch.update(ref, prepared);
    }
    await batch.commit();
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

  async updateMany(updates: Array<{ id: string; changes: Partial<Game> }>): Promise<void> {
    if (updates.length === 0) return;
    // Single read-modify-write over the whole array. Doing these as parallel
    // update() calls each re-reads the same stale snapshot and the last save()
    // wins — which silently dropped queue position shifts.
    const games = await this.getAll();
    const now = new Date().toISOString();
    const changeMap = new Map(updates.map(u => [u.id, u.changes]));
    const next = games.map(g => {
      const changes = changeMap.get(g.id);
      if (!changes) return g;
      // Spreading a key whose value is `undefined` sets it to undefined; JSON
      // serialization then drops it, so "clear field" semantics hold locally too.
      return { ...g, ...changes, id: g.id, createdAt: g.createdAt, updatedAt: now };
    });
    this.save(next);
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
class HybridGameRepository extends HybridRepository<GameRepository> implements GameRepository {
  constructor() {
    super(new FirebaseGameRepository(), new LocalStorageGameRepository());
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

  updateMany(updates: Array<{ id: string; changes: Partial<Game> }>): Promise<void> {
    return this.repo.updateMany(updates);
  }

  delete(id: string): Promise<void> {
    return this.repo.delete(id);
  }
}

// Export singleton
export const gameRepository: GameRepository = new HybridGameRepository();
