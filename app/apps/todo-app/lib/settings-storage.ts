import { v4 as uuidv4 } from 'uuid';
import { AppSettings, AppSettingsRepository } from './types';
import { getFirebaseDb, isFirebaseConfigured } from '@/lib/firebase';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  limit,
} from 'firebase/firestore';

const STORAGE_KEY = 'todo-app-settings';
const COLLECTION_NAME = 'todoAppSettings';

// Firebase Repository
export class FirebaseSettingsRepository implements AppSettingsRepository {
  private userId: string = '';

  private get db() {
    return getFirebaseDb();
  }

  private get settingsCollection() {
    return collection(this.db, COLLECTION_NAME);
  }

  setUserId(userId: string): void {
    this.userId = userId;
  }

  async get(): Promise<AppSettings | null> {
    if (!this.userId) return null;
    const q = query(
      this.settingsCollection,
      where('userId', '==', this.userId),
      limit(1)
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    return snapshot.docs[0].data() as AppSettings;
  }

  async set(startDate: string): Promise<AppSettings> {
    if (!this.userId) throw new Error('Not authenticated');

    // Check if settings already exist
    const existing = await this.get();
    if (existing) {
      return this.update({ startDate });
    }

    const now = new Date().toISOString();
    const settings: AppSettings = {
      id: uuidv4(),
      userId: this.userId,
      startDate,
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(doc(this.db, COLLECTION_NAME, settings.id), settings);
    return settings;
  }

  async update(updates: Partial<Omit<AppSettings, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>): Promise<AppSettings> {
    const existing = await this.get();
    if (!existing) {
      throw new Error('Settings not found');
    }

    const docRef = doc(this.db, COLLECTION_NAME, existing.id);

    const cleanUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        cleanUpdates[key] = value;
      }
    }
    cleanUpdates.updatedAt = new Date().toISOString();

    await updateDoc(docRef, cleanUpdates);

    const updated = await getDoc(docRef);
    return updated.data() as AppSettings;
  }
}

// LocalStorage Repository
export class LocalStorageSettingsRepository implements AppSettingsRepository {
  private userId: string = 'local-user';

  setUserId(userId: string): void {
    this.userId = userId || 'local-user';
  }

  private getStorageKey(): string {
    return `${STORAGE_KEY}-${this.userId}`;
  }

  async get(): Promise<AppSettings | null> {
    if (typeof window === 'undefined') return null;
    const data = localStorage.getItem(this.getStorageKey());
    return data ? JSON.parse(data) : null;
  }

  async set(startDate: string): Promise<AppSettings> {
    const existing = await this.get();
    if (existing) {
      return this.update({ startDate });
    }

    const now = new Date().toISOString();
    const settings: AppSettings = {
      id: uuidv4(),
      userId: this.userId,
      startDate,
      createdAt: now,
      updatedAt: now,
    };

    this.save(settings);
    return settings;
  }

  async update(updates: Partial<Omit<AppSettings, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>): Promise<AppSettings> {
    const existing = await this.get();
    if (!existing) {
      throw new Error('Settings not found');
    }

    const updated: AppSettings = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.save(updated);
    return updated;
  }

  private save(settings: AppSettings): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.getStorageKey(), JSON.stringify(settings));
    }
  }
}

// Hybrid Repository
class HybridSettingsRepository implements AppSettingsRepository {
  private firebaseRepo = new FirebaseSettingsRepository();
  private localRepo = new LocalStorageSettingsRepository();
  private useFirebase = false;

  setUserId(userId: string): void {
    const isRealUser = !!userId && userId !== 'local-user';
    this.useFirebase = isRealUser && isFirebaseConfigured();
    this.firebaseRepo.setUserId(userId);
    this.localRepo.setUserId(userId || 'local-user');
  }

  private get repo(): AppSettingsRepository {
    return this.useFirebase ? this.firebaseRepo : this.localRepo;
  }

  get(): Promise<AppSettings | null> {
    return this.repo.get();
  }

  set(startDate: string): Promise<AppSettings> {
    return this.repo.set(startDate);
  }

  update(updates: Partial<Omit<AppSettings, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>): Promise<AppSettings> {
    return this.repo.update(updates);
  }
}

// Export singleton
export const settingsRepository: AppSettingsRepository = new HybridSettingsRepository();
