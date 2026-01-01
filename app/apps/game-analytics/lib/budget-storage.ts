'use client';

import { v4 as uuidv4 } from 'uuid';
import { BudgetSettings } from './types';
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
} from 'firebase/firestore';

const STORAGE_KEY = 'game-analytics-budget';
const COLLECTION_NAME = 'budgetSettings';

export interface BudgetRepository {
  setUserId(userId: string): void;
  getByYear(year: number): Promise<BudgetSettings | null>;
  getAll(): Promise<BudgetSettings[]>;
  set(year: number, yearlyBudget: number): Promise<BudgetSettings>;
  delete(year: number): Promise<void>;
}

// Firebase Repository
class FirebaseBudgetRepository implements BudgetRepository {
  private userId: string = '';

  private get db() {
    return getFirebaseDb();
  }

  private get budgetCollection() {
    return collection(this.db, COLLECTION_NAME);
  }

  setUserId(userId: string): void {
    this.userId = userId;
  }

  async getAll(): Promise<BudgetSettings[]> {
    if (!this.userId) return [];
    const q = query(
      this.budgetCollection,
      where('userId', '==', this.userId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as BudgetSettings);
  }

  async getByYear(year: number): Promise<BudgetSettings | null> {
    if (!this.userId) return null;
    const all = await this.getAll();
    return all.find(b => b.year === year) || null;
  }

  async set(year: number, yearlyBudget: number): Promise<BudgetSettings> {
    if (!this.userId) throw new Error('Not authenticated');

    // Validate yearlyBudget is a valid number
    if (typeof yearlyBudget !== 'number' || isNaN(yearlyBudget) || yearlyBudget < 0) {
      throw new Error('Invalid budget amount');
    }

    const existing = await this.getByYear(year);
    const now = new Date().toISOString();

    if (existing) {
      const docRef = doc(this.db, COLLECTION_NAME, existing.id);
      const updateData = {
        yearlyBudget: yearlyBudget,
        updatedAt: now,
      };
      await updateDoc(docRef, updateData);
      return { ...existing, yearlyBudget, updatedAt: now };
    }

    const budget: BudgetSettings = {
      id: uuidv4(),
      userId: this.userId,
      year: year,
      yearlyBudget: yearlyBudget,
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(doc(this.db, COLLECTION_NAME, budget.id), budget);
    return budget;
  }

  async delete(year: number): Promise<void> {
    const existing = await this.getByYear(year);
    if (existing) {
      await deleteDoc(doc(this.db, COLLECTION_NAME, existing.id));
    }
  }
}

// LocalStorage Repository
class LocalStorageBudgetRepository implements BudgetRepository {
  private userId: string = 'local-user';

  setUserId(userId: string): void {
    this.userId = userId || 'local-user';
  }

  private getStorageKey(): string {
    return `${STORAGE_KEY}-${this.userId}`;
  }

  async getAll(): Promise<BudgetSettings[]> {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(this.getStorageKey());
    return data ? JSON.parse(data) : [];
  }

  async getByYear(year: number): Promise<BudgetSettings | null> {
    const all = await this.getAll();
    return all.find(b => b.year === year) || null;
  }

  async set(year: number, yearlyBudget: number): Promise<BudgetSettings> {
    const all = await this.getAll();
    const now = new Date().toISOString();
    const existingIndex = all.findIndex(b => b.year === year);

    if (existingIndex >= 0) {
      all[existingIndex] = {
        ...all[existingIndex],
        yearlyBudget,
        updatedAt: now,
      };
      this.save(all);
      return all[existingIndex];
    }

    const budget: BudgetSettings = {
      id: uuidv4(),
      userId: this.userId,
      year,
      yearlyBudget,
      createdAt: now,
      updatedAt: now,
    };

    all.push(budget);
    this.save(all);
    return budget;
  }

  async delete(year: number): Promise<void> {
    const all = await this.getAll();
    const filtered = all.filter(b => b.year !== year);
    this.save(filtered);
  }

  private save(budgets: BudgetSettings[]): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.getStorageKey(), JSON.stringify(budgets));
    }
  }
}

// Hybrid Repository
class HybridBudgetRepository implements BudgetRepository {
  private firebaseRepo = new FirebaseBudgetRepository();
  private localRepo = new LocalStorageBudgetRepository();
  private useFirebase = false;

  setUserId(userId: string): void {
    const isRealUser = !!userId && userId !== 'local-user';
    this.useFirebase = isRealUser && isFirebaseConfigured();
    this.firebaseRepo.setUserId(userId);
    this.localRepo.setUserId(userId || 'local-user');
  }

  private get repo(): BudgetRepository {
    return this.useFirebase ? this.firebaseRepo : this.localRepo;
  }

  getAll(): Promise<BudgetSettings[]> {
    return this.repo.getAll();
  }

  getByYear(year: number): Promise<BudgetSettings | null> {
    return this.repo.getByYear(year);
  }

  set(year: number, yearlyBudget: number): Promise<BudgetSettings> {
    return this.repo.set(year, yearlyBudget);
  }

  delete(year: number): Promise<void> {
    return this.repo.delete(year);
  }
}

export const budgetRepository: BudgetRepository = new HybridBudgetRepository();
