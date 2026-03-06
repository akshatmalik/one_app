'use client';

import { v4 as uuidv4 } from 'uuid';
import { PurchaseQueueEntry, PurchaseQueueRepository } from './types';
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

const STORAGE_KEY = 'game-analytics-purchase-queue';
const COLLECTION_NAME = 'purchaseQueue';

function cleanUndefined<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(cleanUndefined) as T;
  if (typeof obj === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v !== undefined) out[k] = cleanUndefined(v);
    }
    return out as T;
  }
  return obj;
}

// ── Firebase ──────────────────────────────────────────────────────

class FirebasePurchaseQueueRepository implements PurchaseQueueRepository {
  private userId = '';

  private get db() { return getFirebaseDb(); }
  private get col() { return collection(this.db, COLLECTION_NAME); }

  setUserId(userId: string) { this.userId = userId; }

  async getAll(): Promise<PurchaseQueueEntry[]> {
    if (!this.userId) return [];
    const q = query(this.col, where('userId', '==', this.userId));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as PurchaseQueueEntry);
  }

  async create(data: Omit<PurchaseQueueEntry, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<PurchaseQueueEntry> {
    if (!this.userId) throw new Error('Not authenticated');
    const now = new Date().toISOString();
    const entry: PurchaseQueueEntry = {
      ...cleanUndefined(data),
      id: uuidv4(),
      userId: this.userId,
      createdAt: now,
      updatedAt: now,
    };
    await setDoc(doc(this.db, COLLECTION_NAME, entry.id), entry);
    return entry;
  }

  async update(id: string, updates: Partial<PurchaseQueueEntry>): Promise<PurchaseQueueEntry> {
    const ref = doc(this.db, COLLECTION_NAME, id);
    const cleaned = cleanUndefined(updates) as Record<string, unknown>;
    cleaned.updatedAt = new Date().toISOString();
    await updateDoc(ref, cleaned);
    const snap = await getDoc(ref);
    return snap.data() as PurchaseQueueEntry;
  }

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(this.db, COLLECTION_NAME, id));
  }
}

// ── LocalStorage ──────────────────────────────────────────────────

class LocalStoragePurchaseQueueRepository implements PurchaseQueueRepository {
  private userId = 'local-user';

  setUserId(userId: string) { this.userId = userId || 'local-user'; }

  private key() { return `${STORAGE_KEY}-${this.userId}`; }

  async getAll(): Promise<PurchaseQueueEntry[]> {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(this.key());
    return raw ? JSON.parse(raw) : [];
  }

  async create(data: Omit<PurchaseQueueEntry, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<PurchaseQueueEntry> {
    const now = new Date().toISOString();
    const entry: PurchaseQueueEntry = {
      ...data,
      id: uuidv4(),
      userId: this.userId,
      createdAt: now,
      updatedAt: now,
    };
    const all = await this.getAll();
    all.push(entry);
    this.save(all);
    return entry;
  }

  async update(id: string, updates: Partial<PurchaseQueueEntry>): Promise<PurchaseQueueEntry> {
    const all = await this.getAll();
    const idx = all.findIndex(e => e.id === id);
    if (idx === -1) throw new Error('Entry not found');
    all[idx] = { ...all[idx], ...updates, id, updatedAt: new Date().toISOString() };
    this.save(all);
    return all[idx];
  }

  async delete(id: string): Promise<void> {
    const all = await this.getAll();
    this.save(all.filter(e => e.id !== id));
  }

  private save(entries: PurchaseQueueEntry[]) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.key(), JSON.stringify(entries));
    }
  }
}

// ── Hybrid ────────────────────────────────────────────────────────

class HybridPurchaseQueueRepository implements PurchaseQueueRepository {
  private firebaseRepo = new FirebasePurchaseQueueRepository();
  private localRepo = new LocalStoragePurchaseQueueRepository();
  private useFirebase = false;

  setUserId(userId: string) {
    const real = !!userId && userId !== 'local-user';
    this.useFirebase = real && isFirebaseConfigured();
    this.firebaseRepo.setUserId(userId);
    this.localRepo.setUserId(userId || 'local-user');
  }

  private get repo(): PurchaseQueueRepository {
    return this.useFirebase ? this.firebaseRepo : this.localRepo;
  }

  getAll() { return this.repo.getAll(); }
  create(d: Omit<PurchaseQueueEntry, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) { return this.repo.create(d); }
  update(id: string, u: Partial<PurchaseQueueEntry>) { return this.repo.update(id, u); }
  delete(id: string) { return this.repo.delete(id); }
}

export const purchaseQueueRepository: PurchaseQueueRepository = new HybridPurchaseQueueRepository();
