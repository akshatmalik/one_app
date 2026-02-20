'use client';

import { TasteProfile } from './types';
import { getFirebaseDb, isFirebaseConfigured } from '@/lib/firebase';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';

const STORAGE_KEY = 'game-analytics-taste-overrides';
const COLLECTION_NAME = 'tasteProfileOverrides';

export interface ProfileRepository {
  setUserId(userId: string): void;
  load(): Promise<Partial<TasteProfile> | null>;
  save(overrides: Partial<TasteProfile>): Promise<void>;
  clear(): Promise<void>;
}

// Firebase — stores one document per user: tasteProfileOverrides/{userId}
class FirebaseProfileRepository implements ProfileRepository {
  private userId: string = '';

  private get db() { return getFirebaseDb(); }

  setUserId(userId: string): void { this.userId = userId; }

  async load(): Promise<Partial<TasteProfile> | null> {
    if (!this.userId) return null;
    try {
      const snap = await getDoc(doc(this.db, COLLECTION_NAME, this.userId));
      if (!snap.exists()) return null;
      const data = snap.data();
      // Strip Firestore metadata fields before returning
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { userId: _uid, savedAt: _at, ...overrides } = data as Record<string, unknown>;
      return overrides as Partial<TasteProfile>;
    } catch {
      return null;
    }
  }

  async save(overrides: Partial<TasteProfile>): Promise<void> {
    if (!this.userId) return;
    await setDoc(doc(this.db, COLLECTION_NAME, this.userId), {
      ...overrides,
      userId: this.userId,
      savedAt: new Date().toISOString(),
    });
  }

  async clear(): Promise<void> {
    if (!this.userId) return;
    await deleteDoc(doc(this.db, COLLECTION_NAME, this.userId));
  }
}

// localStorage fallback
class LocalStorageProfileRepository implements ProfileRepository {
  private userId: string = 'local-user';

  setUserId(userId: string): void { this.userId = userId || 'local-user'; }

  private get key() { return `${STORAGE_KEY}-${this.userId}`; }

  async load(): Promise<Partial<TasteProfile> | null> {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(this.key);
    if (!raw) return null;
    try { return JSON.parse(raw) as Partial<TasteProfile>; } catch { return null; }
  }

  async save(overrides: Partial<TasteProfile>): Promise<void> {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.key, JSON.stringify(overrides));
    }
  }

  async clear(): Promise<void> {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.key);
    }
  }
}

// Hybrid — uses Firebase when authenticated, localStorage otherwise
class HybridProfileRepository implements ProfileRepository {
  private firebaseRepo = new FirebaseProfileRepository();
  private localRepo = new LocalStorageProfileRepository();
  private useFirebase = false;

  setUserId(userId: string): void {
    const isRealUser = !!userId && userId !== 'local-user';
    this.useFirebase = isRealUser && isFirebaseConfigured();
    this.firebaseRepo.setUserId(userId);
    this.localRepo.setUserId(userId || 'local-user');
  }

  private get repo(): ProfileRepository {
    return this.useFirebase ? this.firebaseRepo : this.localRepo;
  }

  load() { return this.repo.load(); }
  save(overrides: Partial<TasteProfile>) { return this.repo.save(overrides); }
  clear() { return this.repo.clear(); }
}

export const profileRepository: ProfileRepository = new HybridProfileRepository();
