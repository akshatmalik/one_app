'use client';

import { TasteProfile } from './types';
import { getFirebaseDb, isFirebaseConfigured } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc, deleteField } from 'firebase/firestore';

const STORAGE_KEY = 'game-analytics-taste-overrides';
// Stored as a field on the user entity: users/{userId}.tasteProfileOverrides
const USERS_COLLECTION = 'users';

export interface ProfileRepository {
  setUserId(userId: string): void;
  load(): Promise<Partial<TasteProfile> | null>;
  save(overrides: Partial<TasteProfile>): Promise<void>;
  clear(): Promise<void>;
}

// Firebase — reads/writes tasteProfileOverrides field on users/{userId} document
class FirebaseProfileRepository implements ProfileRepository {
  private userId: string = '';

  private get db() { return getFirebaseDb(); }
  private get userRef() { return doc(this.db, USERS_COLLECTION, this.userId); }

  setUserId(userId: string): void { this.userId = userId; }

  async load(): Promise<Partial<TasteProfile> | null> {
    if (!this.userId) return null;
    try {
      const snap = await getDoc(this.userRef);
      if (!snap.exists()) return null;
      const data = snap.data() as Record<string, unknown>;
      return (data.tasteProfileOverrides as Partial<TasteProfile>) || null;
    } catch {
      return null;
    }
  }

  async save(overrides: Partial<TasteProfile>): Promise<void> {
    if (!this.userId) return;
    // merge: true so we don't clobber other fields on the user document
    await setDoc(this.userRef, {
      tasteProfileOverrides: overrides,
      userId: this.userId,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  }

  async clear(): Promise<void> {
    if (!this.userId) return;
    try {
      await updateDoc(this.userRef, { tasteProfileOverrides: deleteField() });
    } catch {
      // Document may not exist yet — no-op is fine
    }
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
