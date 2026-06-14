'use client';

import { v4 as uuidv4 } from 'uuid';
import { GameRecommendation, RecommendationRepository } from './types';
import { getFirebaseDb } from '@/lib/firebase';
import { HybridRepository } from './hybrid-repository';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
} from 'firebase/firestore';

const STORAGE_KEY = 'game-analytics-recommendations';
const COLLECTION_NAME = 'gameRecommendations';

// Helper to recursively clean undefined values (Firestore doesn't accept undefined)
function cleanUndefinedValues<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(item => cleanUndefinedValues(item)) as T;
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

// Firebase Repository
class FirebaseRecommendationRepository implements RecommendationRepository {
  private userId: string = '';

  private get db() { return getFirebaseDb(); }
  private get col() { return collection(this.db, COLLECTION_NAME); }

  setUserId(userId: string): void { this.userId = userId; }

  async getAll(): Promise<GameRecommendation[]> {
    if (!this.userId) return [];
    // Filter by userId only — do NOT add orderBy('createdAt') here. Combining an
    // equality filter with an orderBy on a different field needs a composite
    // Firestore index for `gameRecommendations`, which isn't deployed; without
    // it the read throws and the caller silently ends up with an empty list
    // (so backfilled PS Plus drops + triage decisions appeared lost on reload).
    // Sort newest-first client-side instead — no index required.
    const q = query(this.col, where('userId', '==', this.userId));
    const snapshot = await getDocs(q);
    return snapshot.docs
      .map(d => d.data() as GameRecommendation)
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }

  async create(data: Omit<GameRecommendation, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<GameRecommendation> {
    if (!this.userId) throw new Error('Not authenticated');
    const now = new Date().toISOString();
    const cleanData = cleanUndefinedValues(data);
    const rec: GameRecommendation = {
      ...cleanData,
      id: uuidv4(),
      userId: this.userId,
      createdAt: now,
      updatedAt: now,
    } as GameRecommendation;
    await setDoc(doc(this.db, COLLECTION_NAME, rec.id), rec);
    return rec;
  }

  async update(id: string, updates: Partial<GameRecommendation>): Promise<GameRecommendation> {
    const docRef = doc(this.db, COLLECTION_NAME, id);
    const cleanUpdates = cleanUndefinedValues(updates) as Record<string, unknown>;
    cleanUpdates.updatedAt = new Date().toISOString();
    await updateDoc(docRef, cleanUpdates);
    // Return updated data by merging
    return { id, ...cleanUpdates } as GameRecommendation;
  }

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(this.db, COLLECTION_NAME, id));
  }
}

// LocalStorage Repository
class LocalStorageRecommendationRepository implements RecommendationRepository {
  private userId: string = 'local-user';

  setUserId(userId: string): void { this.userId = userId || 'local-user'; }

  private getStorageKey(): string { return `${STORAGE_KEY}-${this.userId}`; }

  async getAll(): Promise<GameRecommendation[]> {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(this.getStorageKey());
    return data ? JSON.parse(data) : [];
  }

  async create(data: Omit<GameRecommendation, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<GameRecommendation> {
    const now = new Date().toISOString();
    const rec: GameRecommendation = {
      ...data,
      id: uuidv4(),
      userId: this.userId,
      createdAt: now,
      updatedAt: now,
    };
    const all = await this.getAll();
    all.push(rec);
    this.save(all);
    return rec;
  }

  async update(id: string, updates: Partial<GameRecommendation>): Promise<GameRecommendation> {
    const all = await this.getAll();
    const index = all.findIndex(r => r.id === id);
    if (index === -1) throw new Error('Recommendation not found');
    all[index] = { ...all[index], ...updates, updatedAt: new Date().toISOString() };
    this.save(all);
    return all[index];
  }

  async delete(id: string): Promise<void> {
    const all = await this.getAll();
    this.save(all.filter(r => r.id !== id));
  }

  private save(recs: GameRecommendation[]): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.getStorageKey(), JSON.stringify(recs));
    }
  }
}

// Hybrid Repository — Firebase when authenticated, localStorage otherwise
class HybridRecommendationRepository extends HybridRepository<RecommendationRepository> implements RecommendationRepository {
  constructor() {
    super(new FirebaseRecommendationRepository(), new LocalStorageRecommendationRepository());
  }

  getAll() { return this.repo.getAll(); }
  create(data: Omit<GameRecommendation, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) { return this.repo.create(data); }
  update(id: string, updates: Partial<GameRecommendation>) { return this.repo.update(id, updates); }
  delete(id: string) { return this.repo.delete(id); }
}

export const recommendationRepository: RecommendationRepository = new HybridRecommendationRepository();
