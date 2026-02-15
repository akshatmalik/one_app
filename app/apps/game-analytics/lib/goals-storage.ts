'use client';

import { v4 as uuidv4 } from 'uuid';
import { GamingGoal } from './types';
import { getFirebaseDb, isFirebaseConfigured } from '@/lib/firebase';
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

const STORAGE_KEY = 'game-analytics-goals';
const COLLECTION_NAME = 'gamingGoals';

export interface GoalRepository {
  setUserId(userId: string): void;
  getAll(): Promise<GamingGoal[]>;
  getActive(): Promise<GamingGoal[]>;
  create(goal: Omit<GamingGoal, 'id' | 'createdAt' | 'updatedAt'>): Promise<GamingGoal>;
  update(id: string, updates: Partial<GamingGoal>): Promise<GamingGoal>;
  delete(id: string): Promise<void>;
}

// Firebase Repository
class FirebaseGoalRepository implements GoalRepository {
  private userId: string = '';

  private get db() {
    return getFirebaseDb();
  }

  private get goalCollection() {
    return collection(this.db, COLLECTION_NAME);
  }

  setUserId(userId: string): void {
    this.userId = userId;
  }

  async getAll(): Promise<GamingGoal[]> {
    if (!this.userId) return [];
    const q = query(
      this.goalCollection,
      where('userId', '==', this.userId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as GamingGoal);
  }

  async getActive(): Promise<GamingGoal[]> {
    const all = await this.getAll();
    return all.filter(g => g.status === 'active');
  }

  async create(goalData: Omit<GamingGoal, 'id' | 'createdAt' | 'updatedAt'>): Promise<GamingGoal> {
    if (!this.userId) throw new Error('Not authenticated');

    const now = new Date().toISOString();
    const goal: GamingGoal = {
      ...goalData,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(doc(this.db, COLLECTION_NAME, goal.id), goal);
    return goal;
  }

  async update(id: string, updates: Partial<GamingGoal>): Promise<GamingGoal> {
    if (!this.userId) throw new Error('Not authenticated');

    const all = await this.getAll();
    const existing = all.find(g => g.id === id);
    if (!existing) throw new Error('Goal not found');

    const now = new Date().toISOString();
    const updateData = { ...updates, updatedAt: now };
    const docRef = doc(this.db, COLLECTION_NAME, id);
    await updateDoc(docRef, updateData);
    return { ...existing, ...updateData };
  }

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(this.db, COLLECTION_NAME, id));
  }
}

// LocalStorage Repository
class LocalStorageGoalRepository implements GoalRepository {
  private userId: string = 'local-user';

  setUserId(userId: string): void {
    this.userId = userId || 'local-user';
  }

  private getStorageKey(): string {
    return `${STORAGE_KEY}-${this.userId}`;
  }

  async getAll(): Promise<GamingGoal[]> {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(this.getStorageKey());
    return data ? JSON.parse(data) : [];
  }

  async getActive(): Promise<GamingGoal[]> {
    const all = await this.getAll();
    return all.filter(g => g.status === 'active');
  }

  async create(goalData: Omit<GamingGoal, 'id' | 'createdAt' | 'updatedAt'>): Promise<GamingGoal> {
    const all = await this.getAll();
    const now = new Date().toISOString();

    const goal: GamingGoal = {
      ...goalData,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
    };

    all.push(goal);
    this.save(all);
    return goal;
  }

  async update(id: string, updates: Partial<GamingGoal>): Promise<GamingGoal> {
    const all = await this.getAll();
    const index = all.findIndex(g => g.id === id);
    if (index < 0) throw new Error('Goal not found');

    const now = new Date().toISOString();
    all[index] = { ...all[index], ...updates, updatedAt: now };
    this.save(all);
    return all[index];
  }

  async delete(id: string): Promise<void> {
    const all = await this.getAll();
    const filtered = all.filter(g => g.id !== id);
    this.save(filtered);
  }

  private save(goals: GamingGoal[]): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.getStorageKey(), JSON.stringify(goals));
    }
  }
}

// Hybrid Repository
class HybridGoalRepository implements GoalRepository {
  private firebaseRepo = new FirebaseGoalRepository();
  private localRepo = new LocalStorageGoalRepository();
  private useFirebase = false;

  setUserId(userId: string): void {
    const isRealUser = !!userId && userId !== 'local-user';
    this.useFirebase = isRealUser && isFirebaseConfigured();
    this.firebaseRepo.setUserId(userId);
    this.localRepo.setUserId(userId || 'local-user');
  }

  private get repo(): GoalRepository {
    return this.useFirebase ? this.firebaseRepo : this.localRepo;
  }

  getAll(): Promise<GamingGoal[]> {
    return this.repo.getAll();
  }

  getActive(): Promise<GamingGoal[]> {
    return this.repo.getActive();
  }

  create(goal: Omit<GamingGoal, 'id' | 'createdAt' | 'updatedAt'>): Promise<GamingGoal> {
    return this.repo.create(goal);
  }

  update(id: string, updates: Partial<GamingGoal>): Promise<GamingGoal> {
    return this.repo.update(id, updates);
  }

  delete(id: string): Promise<void> {
    return this.repo.delete(id);
  }
}

export const goalRepository: GoalRepository = new HybridGoalRepository();
